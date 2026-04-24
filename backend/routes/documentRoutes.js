import express from "express";
import upload from "../middleware/upload.js";
import * as documentController from "../controllers/documentController.js";
import * as ragController from "../controllers/ragController.js";

const router = express.Router();

// Async error wrapper to handle promise rejections
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error("Route error:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message || "Internal server error" 
    });
  });
};

// Main document processing route
router.post(
  "/process-document",
  upload.single("file"),
  asyncHandler(documentController.processDocument)
);

// Get all documents with filtering and pagination
router.get("/documents", asyncHandler(documentController.getDocuments));

// Get single document
router.get("/documents/:id", asyncHandler(documentController.getDocumentById));

// Download Gemini-generated PDF report for a document
router.get("/documents/:id/report-pdf", asyncHandler(documentController.downloadDocumentReportPdf));

// Delete single document
router.delete("/documents/:id", asyncHandler(documentController.deleteDocumentById));

// Search documents
router.get("/search", asyncHandler(documentController.searchDocuments));

// Get analytics
router.get("/analytics", asyncHandler(documentController.getAnalytics));

// Reprocess document (re-run LLM analysis)
router.post("/documents/:id/reprocess", asyncHandler(documentController.reprocessDocument));

// Local RAG question answering over completed documents
router.post("/rag/ask", asyncHandler(ragController.askQuestion));

export default router;
