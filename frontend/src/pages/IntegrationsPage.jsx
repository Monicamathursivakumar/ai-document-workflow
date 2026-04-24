import React, { useState, useContext, useEffect, useMemo, useRef } from "react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import {
  Mail,
  MessageSquare,
  Database,
  Share2,
  PlugZap,
  Cloud,
} from "lucide-react";
import { TranslationContext } from "@/context/TranslationContext";
import { getServerBaseUrl } from "../lib/departments";

// --------------------------
// INTEGRATION LIST
// --------------------------
const getIntegrations = (t) => [
  {
    id: 1,
    type: "email",
    name: t("email"),
    description: t("automaticallyCollect"),
    icon: <Mail className="w-6 h-6 text-blue-600" />,
    status: "notConnected",
  },
  {
    id: 2,
    type: "whatsapp",
    name: t("whatsappBusinessAPI"),
    description: t("ingestDocuments"),
    icon: <MessageSquare className="w-6 h-6 text-green-600" />,
    status: "notConnected",
  },
  {
    id: 3,
    type: "maximo",
    name: t("ibmMaximo"),
    description: t("syncWorkOrders"),
    icon: <Database className="w-6 h-6 text-purple-600" />,
    status: "notConnected",
  },
  {
    id: 4,
    type: "sharepoint",
    name: t("microsoftSharePoint"),
    description: t("fetchAndIndex"),
    icon: <Share2 className="w-6 h-6 text-indigo-600" />,
    status: "connected",
  },
  {
    id: 5,
    type: "cloud",
    name: t("cloudStorage"),
    description: t("connectGoogleDrive"),
    icon: <Cloud className="w-6 h-6 text-sky-600" />,
    status: "notConnected",
  },
];

// --------------------------
// FORMS FOR EACH INTEGRATION
// --------------------------
const getIntegrationForms = (t) => ({
  email: [
    { label: "IMAP Server", name: "imapServer", type: "text", placeholder: "imap.gmail.com" },
    { label: "IMAP Port", name: "imapPort", type: "text", placeholder: "993" },
    { label: "IMAP Security", name: "imapSecurity", type: "select", options: ["SSL", "TLS"] },
    { label: "SMTP Server", name: "smtpServer", type: "text", placeholder: "smtp.gmail.com" },
    { label: "SMTP Port", name: "smtpPort", type: "text", placeholder: "587" },
    { label: "SMTP Security", name: "smtpSecurity", type: "select", options: ["TLS", "SSL"] },
    { label: t("email"), name: "email", type: "email", placeholder: "example@company.com" },
    { label: "Password / App Key", name: "password", type: "password", placeholder: "********" },
  ],

  whatsapp: [
    { label: "API Key", name: "apiKey", type: "text", placeholder: "Your WhatsApp API key" },
    { label: "Business Number", name: "number", type: "text", placeholder: "+91XXXXXXXXXX" },
    { label: "Webhook URL", name: "webhook", type: "text", placeholder: "https://yourserver/webhook" },
  ],

  maximo: [
    { label: "Maximo URL", name: "url", type: "text", placeholder: "https://maximo.company.com/api" },
    { label: "Username", name: "username", type: "text", placeholder: "maximo_user" },
    { label: "Password", name: "password", type: "password", placeholder: "********" },
  ],

  sharepoint: [
    { label: "Tenant ID", name: "tenantId", type: "text", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
    { label: "Client ID", name: "clientId", type: "text", placeholder: "SharePoint App Client ID" },
    { label: "Client Secret", name: "clientSecret", type: "password", placeholder: "********" },
    { label: "Site URL", name: "siteUrl", type: "text", placeholder: "https://company.sharepoint.com/sites/project" },
  ],

  cloud: [
    { label: t("selectProvider"), name: "provider", type: "select", options: ["Google Drive", "OneDrive", "AWS S3"] },
    { label: "Access Key", name: "accessKey", type: "text", placeholder: "Enter access key" },
    { label: "Secret Key", name: "secretKey", type: "password", placeholder: "********" },
    { label: "Bucket / Folder", name: "bucket", type: "text", placeholder: "bucket-name or folder path" },
  ],
});

const EMAIL_AUTOFILL_DEFAULTS = {
  imapServer: "imap.gmail.com",
  imapPort: "993",
  imapSecurity: "SSL",
  smtpServer: "smtp.gmail.com",
  smtpPort: "587",
  smtpSecurity: "TLS",
  email: "",
  password: "",
};

// --------------------------
// MODAL COMPONENT
// --------------------------
const IntegrationModal = ({ open, onClose, integration, onSave, t }) => {
  const [formData, setFormData] = useState({});
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const integrationForms = getIntegrationForms(t);
  const fields = integrationForms[integration?.type] || [];

  useEffect(() => {
    if (!open || !integration) return;
    setFormError("");
    setIsSaving(false);

    if (integration.type === "email") {
      setFormData(EMAIL_AUTOFILL_DEFAULTS);
      return;
    }

    setFormData({});
  }, [open, integration]);

  if (!open || !integration) return null;

  const handleChange = (name, value) => {
    setFormError("");
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (integration.type === "email") {
      if (!String(formData.email || "").trim()) {
        setFormError("Please enter Gmail email.");
        return;
      }
      if (!String(formData.password || "").trim()) {
        setFormError("Please enter Gmail App Password.");
        return;
      }
    }

    console.log("Settings Saved For:", integration.name, formData);
    setIsSaving(true);
    try {
      const saved = await onSave(integration, formData);
      if (saved) {
        onClose();
      }
    } catch (error) {
      setFormError(error?.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 px-4">
      <div className="bg-white w-full max-w-lg p-6 sm:p-8 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        
        <h2 className="text-2xl font-bold mb-2">{t("configure")} {integration.name}</h2>
        <p className="text-gray-600 mb-6">{t("enterDetailsBelow")}</p>

        <div className="space-y-4">
          {fields.map((field, idx) => (
            <div key={idx}>
              <label className="block mb-1 font-medium">{field.label}</label>

              {field.type === "select" ? (
                <select
                  className="w-full border px-4 py-2 rounded-lg"
                  value={formData[field.name] || ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                >
                  <option value="">{t("selectProvider")}</option>
                  {field.options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  className="w-full border px-4 py-2 rounded-lg"
                  value={formData[field.name] || ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            {isSaving ? "Saving..." : t("save")}
          </button>
        </div>
      </div>
    </div>
  );
};

// --------------------------
// MAIN PAGE
// --------------------------
const IntegrationsPage = () => {
  const { t } = useContext(TranslationContext);
  const baseIntegrations = useMemo(() => getIntegrations(t), [t]);
  const integrationStorageKey = useMemo(() => {
    const userId = localStorage.getItem("userId") || "guest";
    return `kmrl_integrations_${userId}`;
  }, []);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeIntegration, setActiveIntegration] = useState(null);
  const [integrations, setIntegrations] = useState(baseIntegrations);
  const [importingIntegrationId, setImportingIntegrationId] = useState(null);
  const [importedDocuments, setImportedDocuments] = useState({});
  const [importErrors, setImportErrors] = useState({});
  const [isHydrated, setIsHydrated] = useState(false);
  const autoImportedTypesRef = useRef(new Set());

  const apiBase = getServerBaseUrl();

  useEffect(() => {
    let persisted = {};
    try {
      persisted = JSON.parse(localStorage.getItem(integrationStorageKey) || "{}");
    } catch {
      persisted = {};
    }

    const statusByType = persisted?.statusByType || {};
    const docsByType = persisted?.docsByType || {};

    const hydratedIntegrations = baseIntegrations.map((item) => ({
      ...item,
      status: statusByType[item.type] || item.status,
    }));

    const hydratedDocs = {};
    hydratedIntegrations.forEach((item) => {
      if (Array.isArray(docsByType[item.type]) && docsByType[item.type].length) {
        hydratedDocs[item.id] = docsByType[item.type];
      }
    });

    setIntegrations(hydratedIntegrations);
    setImportedDocuments(hydratedDocs);
    setImportErrors({});
    setIsHydrated(true);
  }, [baseIntegrations, integrationStorageKey]);

  useEffect(() => {
    if (!isHydrated) return;

    const statusByType = {};
    const docsByType = {};

    integrations.forEach((item) => {
      statusByType[item.type] = item.status;
      const docs = importedDocuments[item.id];
      if (Array.isArray(docs) && docs.length) {
        docsByType[item.type] = docs;
      }
    });

    localStorage.setItem(
      integrationStorageKey,
      JSON.stringify({ statusByType, docsByType }),
    );
  }, [integrations, importedDocuments, integrationStorageKey, isHydrated]);

  const importAndSummarize = async (integration, integrationConfig = undefined) => {
    setImportingIntegrationId(integration.id);
    setImportErrors((prev) => ({ ...prev, [integration.id]: "" }));

    try {
      const response = await fetch(`${apiBase}/api/v1/integrations/import-and-summarize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          integrationName: integration.name,
          integrationType: integration.type,
          integrationConfig,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to import documents");
      }

      setImportedDocuments((prev) => ({
        ...prev,
        [integration.id]: payload.documents || [],
      }));

      setIntegrations((prev) =>
        prev.map((item) =>
          item.id === integration.id ? { ...item, status: "connected" } : item
        )
      );

      autoImportedTypesRef.current.add(integration.type);

      return true;
    } catch (error) {
      setImportErrors((prev) => ({
        ...prev,
        [integration.id]: error.message || "Import failed",
      }));
      return false;
    } finally {
      setImportingIntegrationId(null);
    }
  };

  const handleOpen = (integration) => {
    setActiveIntegration(integration);
    setModalOpen(true);
  };

  const handleSave = async (integration, data) => {
    console.log("Saved:", integration.name, data);
    return importAndSummarize(integration, data);
  };

  const handleIntegrationAction = (integration) => {
    if (integration.status === "connected") {
      importAndSummarize(integration);
      return;
    }
    handleOpen(integration);
  };

  useEffect(() => {
    if (!isHydrated || importingIntegrationId) return;

    const emailIntegration = integrations.find((item) => item.type === "email");
    if (!emailIntegration || emailIntegration.status !== "connected") return;

    const hasDocs = Array.isArray(importedDocuments[emailIntegration.id]) && importedDocuments[emailIntegration.id].length > 0;
    if (hasDocs) return;

    if (autoImportedTypesRef.current.has("email")) return;
    autoImportedTypesRef.current.add("email");

    importAndSummarize(emailIntegration);
  }, [isHydrated, importingIntegrationId, integrations, importedDocuments]);

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto">
      
      {/* PAGE HEADER */}
      <Card className="p-6 sm:p-8">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
          <PlugZap className="text-blue-600" /> {t("integrations")}
        </h1>
        <p className="text-gray-600">{t("connectExternalTools")}</p>
      </Card>

      {/* GRID */}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {integrations.map((item) => (
          <Card key={item.id} className="p-6">
            <div className="flex items-center gap-3 mb-4">
              {item.icon}
              <h2 className="text-lg font-semibold">{item.name}</h2>
            </div>

            <p className="text-sm text-gray-600 mb-4">{item.description}</p>

            <div className="flex justify-between items-center">
              <span
                className={`px-3 py-1 text-xs rounded-full ${
                  item.status === "connected"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {item.status === "connected" ? t("connected") : t("notConnected")}
              </span>

              <Button
                onClick={() => handleIntegrationAction(item)}
                className="w-auto px-4 py-2 text-sm"
                loading={importingIntegrationId === item.id}
              >
                {importingIntegrationId === item.id
                  ? "Importing..."
                  : item.status === "connected"
                  ? "Import Docs"
                  : t("connect")}
              </Button>
            </div>

            {importedDocuments[item.id]?.length > 0 && (
              <div className="mt-4 border-t pt-4 space-y-2">
                <p className="text-sm font-semibold text-gray-800">
                  Imported Documents ({importedDocuments[item.id].length}) & Summaries
                </p>
                {importedDocuments[item.id].map((doc) => (
                  <div key={doc.id} className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                    <p className="text-xs text-gray-600">{doc.summary}</p>
                  </div>
                ))}
              </div>
            )}

            {importErrors[item.id] && (
              <p className="mt-3 text-xs text-red-600">{importErrors[item.id]}</p>
            )}
          </Card>
        ))}
      </div>

      {/* MODAL */}
      <IntegrationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        integration={activeIntegration}
        onSave={handleSave}
        t={t}
      />
    </div>
  );
};

export default IntegrationsPage;
