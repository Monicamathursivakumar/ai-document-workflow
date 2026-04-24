/**
 * Integrations Controller
 * Real Gmail import (IMAP unread -> attachment ingestion) + simulated non-email integrations.
 */

import fs from "fs/promises";
import path from "path";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { Op } from "sequelize";
import Document from "../models/Document.js";
import User from "../models/User.js";
import uploadToSupabase from "../services/supabaseUploader.js";
import metadataExtractor from "../services/metadataExtractor.js";
import documentProcessor from "../services/documentProcessor.js";
import calculateFileHash from "../utils/calculateFileHash.js";
import { ALLOWED_FILE_EXTENSIONS } from "../services/utils.js";
import { UPLOAD_FOLDER } from "../config/constants.js";

const buildImportedDocs = (integrationName) => [
  {
    id: "DOC-001",
    title: `${integrationName} Invoice Register`,
    summary: "Imported invoice metadata and extracted payment terms for routing.",
  },
  {
    id: "DOC-002",
    title: `${integrationName} Work Order Log`,
    summary: "Parsed maintenance entries and summarized pending approval actions.",
  },
  {
    id: "DOC-003",
    title: `${integrationName} Vendor Communication`,
    summary: "Collected communication threads and highlighted key escalations.",
  },
  {
    id: "DOC-004",
    title: `${integrationName} Compliance Checklist`,
    summary: "Extracted compliance checkpoints and flagged missing acknowledgements.",
  },
];

const normalize = (value) => String(value || "").trim().toLowerCase();

const isEmailIntegration = (integrationName, integrationType) => {
  if (normalize(integrationType) === "email") {
    return true;
  }

  const key = normalize(integrationName);
  return key.includes("email") || key.includes("gmail");
};

const maskEmail = (email) => {
  const [local, domain] = String(email || "").split("@");
  if (!local || !domain) return "";
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
};

const getEmailConfig = (integrationConfig = {}) => {
  return {
    imapServer: integrationConfig.imapServer || process.env.GMAIL_IMAP_SERVER,
    imapPort: Number(integrationConfig.imapPort || process.env.GMAIL_IMAP_PORT || 993),
    imapSecurity: integrationConfig.imapSecurity || process.env.GMAIL_IMAP_SECURITY || "SSL",
    smtpServer: integrationConfig.smtpServer || process.env.GMAIL_SMTP_SERVER,
    smtpPort: Number(integrationConfig.smtpPort || process.env.GMAIL_SMTP_PORT || 587),
    smtpSecurity: integrationConfig.smtpSecurity || process.env.GMAIL_SMTP_SECURITY || "TLS",
    email: integrationConfig.email || process.env.GMAIL_EMAIL,
    password: integrationConfig.password || process.env.GMAIL_APP_PASSWORD,
  };
};

const normalizeFilename = (filename) => {
  return String(filename || "attachment")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 180);
};

const extFromMime = (mimeType) => {
  const mime = String(mimeType || "").toLowerCase();
  if (mime.includes("pdf")) return ".pdf";
  if (mime.includes("wordprocessingml.document")) return ".docx";
  if (mime.includes("msword")) return ".doc";
  if (mime.includes("plain")) return ".txt";
  if (mime.includes("png")) return ".png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return ".jpg";
  return "";
};

const isAllowedAttachment = (name, mimeType) => {
  const ext = path.extname(String(name || "")).toLowerCase() || extFromMime(mimeType);
  return ALLOWED_FILE_EXTENSIONS.includes(ext);
};

const saveBufferToTempFile = async (filename, buffer) => {
  const ext = path.extname(filename) || ".txt";
  const base = path.basename(filename, ext) || "email_attachment";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${normalizeFilename(base)}${ext}`;
  const filePath = path.join(UPLOAD_FOLDER, safeName);
  await fs.writeFile(filePath, buffer);
  return filePath;
};

const resolveUploaderId = async (emailConfig, integrationConfig = {}) => {
  if (integrationConfig?.employeeId) {
    const explicitId = Number(integrationConfig.employeeId);
    if (Number.isFinite(explicitId) && explicitId > 0) return explicitId;
  }

  const preferredUserEmail =
    integrationConfig?.uploadedByEmail || process.env.GMAIL_INGEST_USER_EMAIL || "admin@kmrl.com";

  const preferredUser = await User.findOne({ where: { email: preferredUserEmail } });
  if (preferredUser) return preferredUser.id;

  const sameMailboxUser = await User.findOne({ where: { email: emailConfig.email } });
  if (sameMailboxUser) return sameMailboxUser.id;

  const adminUser = await User.findOne({ where: { role: "ADMIN" }, order: [["id", "ASC"]] });
  if (adminUser) return adminUser.id;

  return null;
};

const cloneExistingDocumentForUser = async ({ existingDoc, employeeId, fileHash, fileMeta }) => {
  const cloned = await Document.create({
    ...existingDoc.toJSON(),
    id: undefined,
    createdAt: undefined,
    updatedAt: undefined,
    uploaded_by: employeeId,
    file_name: fileMeta.originalname,
    file_type: fileMeta.mimetype,
    file_size: fileMeta.size,
    file_hash: fileHash,
    status: "COMPLETED",
    completed_at: Date.now(),
  });

  return cloned;
};

const ingestAttachmentToPipeline = async ({ fileMeta, employeeId, sourceLabel }) => {
  const fileHash = await calculateFileHash(fileMeta.path);

  const userExistingDoc = await Document.findOne({
    where: {
      file_hash: fileHash,
      uploaded_by: employeeId,
      status: { [Op.not]: "FAILED" },
    },
    order: [["createdAt", "DESC"]],
  });

  if (userExistingDoc) {
    await fs.unlink(fileMeta.path).catch(() => {});
    return {
      id: userExistingDoc.id,
      title: fileMeta.originalname,
      summary: `Skipped duplicate for current user (source: ${sourceLabel}).`,
      status: userExistingDoc.status,
      duplicate: true,
    };
  }

  const globalExistingDoc = await Document.findOne({
    where: {
      file_hash: fileHash,
      status: "COMPLETED",
    },
    order: [["createdAt", "DESC"]],
  });

  if (globalExistingDoc) {
    const cloned = await cloneExistingDocumentForUser({
      existingDoc: globalExistingDoc,
      employeeId,
      fileHash,
      fileMeta,
    });
    await fs.unlink(fileMeta.path).catch(() => {});

    return {
      id: cloned.id,
      title: fileMeta.originalname,
      summary: `Imported instantly from existing analysis (source: ${sourceLabel}).`,
      status: "COMPLETED",
      duplicate: true,
    };
  }

  const uploaded = await uploadToSupabase(fileMeta);
  fileMeta.url = uploaded.url;

  const metadata = await metadataExtractor.extract(fileMeta);
  const created = await Document.create({
    storage_url: fileMeta.url,
    uploaded_by: employeeId,
    file_hash: fileHash,
    status: "UPLOADED",
    ...metadata,
  });

  documentProcessor(created.id, fileMeta).catch((error) => {
    console.error(`Background processing failed for integration Doc ID ${created.id}:`, error);
  });

  return {
    id: created.id,
    title: fileMeta.originalname,
    summary: `Imported from ${sourceLabel} and sent to processing pipeline.`,
    status: "UPLOADED",
    duplicate: false,
  };
};

const importUnreadEmailsFromGmail = async (emailConfig, integrationConfig = {}) => {
  const employeeId = await resolveUploaderId(emailConfig, integrationConfig);
  if (!employeeId) {
    throw new Error("No valid uploader user found. Configure GMAIL_INGEST_USER_EMAIL or create admin user.");
  }

  const client = new ImapFlow({
    host: emailConfig.imapServer,
    port: emailConfig.imapPort,
    secure: true,
    auth: {
      user: emailConfig.email,
      pass: emailConfig.password,
    },
    logger: false,
  });

  const importedDocs = [];
  let scannedMessages = 0;
  const importLimit = Math.max(1, Number(process.env.GMAIL_IMPORT_LIMIT || 10));

  await client.connect();
  const lock = await client.getMailboxLock("INBOX");

  try {
    const unseenUids = await client.search({ seen: false });
    const targetUids = unseenUids.slice(-importLimit);
    scannedMessages = targetUids.length;

    for (const uid of targetUids) {
      try {
        const message = await client.fetchOne(uid, { envelope: true, source: true });
        if (!message?.source) {
          continue;
        }

        const parsed = await simpleParser(message.source);
        const sourceLabel = `Gmail:${parsed.subject || "No Subject"}`;
        const attachments = Array.isArray(parsed.attachments) ? parsed.attachments : [];
        const parsedText = String(parsed.text || "").trim();
        const mailHeader = [
          `Subject: ${parsed.subject || "No Subject"}`,
          `From: ${parsed.from?.text || "Unknown Sender"}`,
          `To: ${parsed.to?.text || "Unknown Recipient"}`,
          `Date: ${parsed.date ? new Date(parsed.date).toISOString() : "Unknown Date"}`,
          "",
        ].join("\n");
        const emailContextText = parsedText ? `${mailHeader}${parsedText}` : "";

        const importableFiles = attachments
          .filter((attachment) => isAllowedAttachment(attachment.filename, attachment.contentType))
          .map((attachment) => {
            const fileName = attachment.filename || `attachment${extFromMime(attachment.contentType) || ".txt"}`;
            return {
              originalname: normalizeFilename(fileName),
              mimetype: attachment.contentType || "application/octet-stream",
              buffer: attachment.content,
              size: attachment.size || attachment.content?.length || 0,
              emailContextText,
            };
          });

        // If there are no importable attachments, ingest mail body as a standalone document.
        if (!importableFiles.length && emailContextText) {
          const fallbackName = normalizeFilename(`email_body_${uid}.txt`);
          importableFiles.push({
            originalname: fallbackName,
            mimetype: "text/plain",
            buffer: Buffer.from(emailContextText, "utf8"),
            size: Buffer.byteLength(emailContextText, "utf8"),
            emailContextText: "",
          });
        }

        let importedFromMessage = 0;
        for (const file of importableFiles) {
          const tempPath = await saveBufferToTempFile(file.originalname, file.buffer);
          const fileMeta = {
            path: tempPath,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            emailContextText: file.emailContextText || "",
          };

          try {
            const result = await ingestAttachmentToPipeline({
              fileMeta,
              employeeId,
              sourceLabel,
            });
            importedDocs.push(result);
            importedFromMessage += 1;
          } catch (error) {
            await fs.unlink(tempPath).catch(() => {});
            console.error(`Failed to ingest attachment ${file.originalname}:`, error);
          }
        }

        if (importedFromMessage > 0) {
          await client.messageFlagsAdd(uid, ["\\Seen"]);
        }
      } catch (messageError) {
        console.error(`Failed to import message UID ${uid}:`, messageError);
      }
    }
  } finally {
    lock.release();
    await client.logout().catch(() => {});
  }

  return {
    importedDocs,
    scannedMessages,
  };
};

/**
 * POST /api/v1/integrations/import-and-summarize
 * Simulates connecting an integration and importing 4 summarized documents
 */
export const importAndSummarize = async (req, res) => {
  try {
    const { integrationName, integrationType, integrationConfig } = req.body || {};

    if (!integrationName || typeof integrationName !== "string") {
      return res.status(400).json({
        success: false,
        error: "integrationName is required",
      });
    }

    const normalizedName = integrationName.trim();

    if (isEmailIntegration(normalizedName, integrationType)) {
      const emailConfig = getEmailConfig(integrationConfig);
      const required = [
        emailConfig.imapServer,
        emailConfig.imapPort,
        emailConfig.imapSecurity,
        emailConfig.smtpServer,
        emailConfig.smtpPort,
        emailConfig.smtpSecurity,
        emailConfig.email,
        emailConfig.password,
      ];

      if (required.some((item) => !item)) {
        return res.status(400).json({
          success: false,
          error: "Email integration config is incomplete. Please provide IMAP/SMTP credentials.",
        });
      }

      const { importedDocs, scannedMessages } = await importUnreadEmailsFromGmail(
        emailConfig,
        integrationConfig,
      );

      return res.json({
        success: true,
        integrationName: normalizedName,
        importedCount: importedDocs.length,
        scannedCount: scannedMessages,
        integrationMeta: {
          provider: "Gmail",
          imap: `${emailConfig.imapServer}:${emailConfig.imapPort} (${emailConfig.imapSecurity})`,
          smtp: `${emailConfig.smtpServer}:${emailConfig.smtpPort} (${emailConfig.smtpSecurity})`,
          email: maskEmail(emailConfig.email),
        },
        documents: importedDocs,
      });
    }

    const documents = buildImportedDocs(normalizedName);

    return res.json({
      success: true,
      integrationName: normalizedName,
      importedCount: documents.length,
      documents,
    });
  } catch (error) {
    console.error("Import and summarize failed:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to import and summarize documents",
    });
  }
};
