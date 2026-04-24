import { Op } from "sequelize";
import Document from "../models/Document.js";
import { askQuestionWithRag } from "../services/llm/localRagService.js";

/**
 * POST /api/v1/rag/ask
 * Body: { question: string, documentIds?: number[], topK?: number }
 */
export const askQuestion = async (req, res) => {
  try {
    const question = String(req.body?.question || "").trim();
    const documentIds = Array.isArray(req.body?.documentIds) ? req.body.documentIds : null;
    const topK = Number(req.body?.topK) > 0 ? Number(req.body.topK) : 8;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: "Question is required.",
      });
    }

    const where = {
      status: "COMPLETED",
      raw_text: { [Op.not]: null },
    };

    if (documentIds && documentIds.length) {
      where.id = { [Op.in]: documentIds };
    }

    const docs = await Document.findAll({
      where,
      attributes: ["id", "file_name", "raw_text"],
      limit: 100,
      order: [["updatedAt", "DESC"]],
    });

    if (!docs.length) {
      return res.status(404).json({
        success: false,
        error: "No completed documents with extracted text were found.",
      });
    }

    const result = await askQuestionWithRag(question, docs, topK);

    return res.json({
      success: true,
      answer: result.answer,
      sources: result.sources,
      retrieved_chunks: result.topChunks,
    });
  } catch (error) {
    console.error("Local RAG askQuestion failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to answer question",
    });
  }
};
