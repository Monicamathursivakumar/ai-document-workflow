/**
 * Routing Routes
 * Handles document routing, role-based retrieval, and notifications
 */

import express from "express";
import * as routingController from "../controllers/routingController.js";

const router = express.Router();

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error("Route error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  });
};

// ============================================
// ROLE-BASED DOCUMENT RETRIEVAL
// ============================================

/**
 * GET /api/v1/routing/my-documents
 * Get all documents routed to current user's role (dashboard feed)
 * Query params: role, priority (CRITICAL|TIME_BOUND|INFORMATIONAL), compliance_only
 */
router.get("/my-documents", asyncHandler(routingController.getMyDocuments));

/**
 * GET /api/v1/routing/dashboard-metrics
 * Get dashboard top bar metrics for current user role
 * Shows: Critical Alerts, Compliance Due, New Docs, Pending Actions
 * Query params: role
 */
router.get("/dashboard-metrics", asyncHandler(routingController.getDashboardMetricsForRole));

// ============================================
// DOCUMENT DETAIL & SUMMARIES
// ============================================

/**
 * GET /api/v1/routing/documents/:id/summary
 * Get role-specific summary for a document
 * The summary is tailored for the user's role
 * Query params: role
 */
router.get("/documents/:id/summary", asyncHandler(routingController.getDocumentRoleSummary));

/**
 * GET /api/v1/routing/documents/:id/traceability
 * Get document source traceability (for judges)
 * Shows OCR text, confidence, model used, tokens, URL, etc.
 */
router.get("/documents/:id/traceability", asyncHandler(routingController.getDocumentTraceability));

// ============================================
// USER ACTIONS
// ============================================

/**
 * POST /api/v1/routing/documents/:id/mark-reviewed
 * Mark document as reviewed by current user's role
 * Query params: role
 */
router.post("/documents/:id/mark-reviewed", asyncHandler(routingController.markDocumentReviewed));

/**
 * POST /api/v1/routing/documents/:id/mark-viewed
 * Track when a user views a document (for "new" badge)
 * Query params: role
 */
router.post("/documents/:id/mark-viewed", asyncHandler(routingController.markDocumentViewed));

export default router;
