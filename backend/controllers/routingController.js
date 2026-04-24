/**
 * Routing Controller
 * Handles role-based document retrieval, routing logic, and dashboard metrics
 */

import Document from "../models/Document.js";
import { Op } from "sequelize";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { routeDocument, getNotificationPriority, getAllRoutedRoles } from "../services/routing/routingEngine.js";
import {
  createNotification,
  getNotificationCounts,
  getDashboardMetrics,
  filterNotificationsFor,
} from "../services/routing/notificationService.js";

const getRequestUserContext = async (req) => {
  try {
    const token = req.headers?.authorization?.split(" ")?.[1];
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let departmentId = Number.parseInt(decoded?.department_id, 10);

    if (!Number.isInteger(departmentId) && Number.isInteger(decoded?.id)) {
      const user = await User.findByPk(decoded.id, { attributes: ["department_id", "role"] });
      if (user) {
        departmentId = Number.parseInt(user.department_id, 10);
      }
    }

    return {
      id: decoded?.id,
      role: decoded?.role,
      department_id: departmentId,
    };
  } catch {
    return null;
  }
};

const isStaffScoped = (userContext) =>
  userContext?.role === "STAFF" && Number.isInteger(userContext?.department_id);

const getStaffDepartmentFilter = (userContext) => {
  if (!isStaffScoped(userContext)) return null;
  return { [Op.contains]: [String(userContext.department_id)] };
};

/**
 * GET /api/v1/routing/my-documents
 * Get documents routed to the current user's role (dashboard feed)
 */
export const getMyDocuments = async (req, res) => {
  try {
    const userContext = await getRequestUserContext(req);
    const userRole = userContext?.role || req.query.role || "STAFF";
    const { priority, compliance_only } = req.query;

    let where = {
      status: "COMPLETED",
      routed_to_roles: { [Op.contains]: [userRole] },
    };

    // Filter by priority if specified
    if (priority) {
      where.urgency_level = priority;
    }

    // Filter compliance-critical only
    if (compliance_only === "true") {
      where.compliance_critical = true;
    }

    const staffDepartmentFilter = getStaffDepartmentFilter(userContext);
    if (staffDepartmentFilter) {
      where.assigned_departments = staffDepartmentFilter;
    }

    const documents = await Document.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: 20,
      attributes: {
        exclude: ["raw_text"],
      },
    });

    // Enrich documents with role-specific summaries
    const enrichedDocs = documents.map((doc) => {
      const docJSON = doc.toJSON();
      const roleSummary = doc.role_summaries?.[userRole] || {
        short_summary: docJSON.short_summary_en,
        detailed_summary: docJSON.detailed_summary_en,
      };

      return {
        ...docJSON,
        role_summary: roleSummary,
        is_primary_recipient: doc.routing_decision?.primary_roles?.includes(userRole),
        priority_notification: getNotificationPriority(doc.routing_decision),
      };
    });

    res.json({
      success: true,
      role: userRole,
      documents: enrichedDocs,
      count: enrichedDocs.length,
    });
  } catch (error) {
    console.error("Get my documents failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch role-specific documents",
    });
  }
};

/**
 * GET /api/v1/routing/documents/:id/summary
 * Get role-specific summary for a document
 */
export const getDocumentRoleSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const userContext = await getRequestUserContext(req);
    const userRole = userContext?.role || req.query.role || "STAFF";

    const document = await Document.findByPk(id);

    if (!document) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }

    if (isStaffScoped(userContext)) {
      const assignedDepartments = Array.isArray(document.assigned_departments)
        ? document.assigned_departments.map((deptId) => String(deptId))
        : [];

      if (!assignedDepartments.includes(String(userContext.department_id))) {
        return res.status(403).json({ success: false, error: "You don't have access to this document" });
      }
    }

    // Check if user role has access
    if (!document.routed_to_roles?.includes(userRole)) {
      return res
        .status(403)
        .json({ success: false, error: "You don't have access to this document" });
    }

    const roleSummary = document.role_summaries?.[userRole] || {
      short_summary: document.short_summary_en,
      detailed_summary: document.detailed_summary_en,
      language: "en",
    };

    res.json({
      success: true,
      document_id: id,
      document_title: document.file_name,
      document_type: document.document_type,
      user_role: userRole,
      is_primary: document.routing_decision?.primary_roles?.includes(userRole),
      urgency: document.urgency_level,
      compliance_critical: document.compliance_critical,
      role_summary: roleSummary,
      action_items: document.action_items,
      source_document: {
        storage_url: document.storage_url,
        file_type: document.file_type,
        file_size: document.file_size,
        uploaded_by: document.uploaded_by,
        uploaded_at: document.createdAt,
      },
      traceability: {
        // For judges: shows where info came from
        raw_text_excerpt: document.raw_text?.substring(0, 500) || "N/A",
        ocr_confidence: document.ocr_confidence,
        language_detected: document.language_detected,
      },
    });
  } catch (error) {
    console.error("Get document role summary failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch role-specific summary",
    });
  }
};

/**
 * GET /api/v1/routing/dashboard-metrics
 * Get dashboard top bar metrics for current user role
 */
export const getDashboardMetricsForRole = async (req, res) => {
  try {
    const userContext = await getRequestUserContext(req);
    const requestedRole = userContext?.role || req.query.role || "STAFF";
    const userRole = Array.isArray(requestedRole)
      ? String(requestedRole[0] || "STAFF").trim() || "STAFF"
      : String(requestedRole || "STAFF").trim() || "STAFF";
    const roleArrayFilter = [userRole];
    const roleWhere = {
      status: "COMPLETED",
      routed_to_roles: { [Op.contains]: roleArrayFilter },
    };

    const staffDepartmentFilter = getStaffDepartmentFilter(userContext);
    if (staffDepartmentFilter) {
      roleWhere.assigned_departments = staffDepartmentFilter;
    }

    // Count critical/urgent documents for this role
    const criticalDocs = await Document.count({
      where: {
        ...roleWhere,
        urgency_level: "CRITICAL",
        compliance_critical: true,
      },
    });

    const complianceDocs = await Document.count({
      where: {
        ...roleWhere,
        compliance_critical: true,
      },
    });

    const newDocs = await Document.count({
      where: {
        ...roleWhere,
        createdAt: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
        viewed_by: {
          [Op.notContains]: roleArrayFilter, // User hasn't viewed yet
        },
      },
    });

    const pendingActions = await Document.count({
      where: {
        ...roleWhere,
        reviewed_by: {
          [Op.notContains]: roleArrayFilter, // User hasn't reviewed yet
        },
      },
    });

    res.json({
      success: true,
      role: userRole,
      metrics: {
        critical_alerts: criticalDocs,
        compliance_due: complianceDocs,
        new_documents: newDocs,
        pending_actions: pendingActions,
      },
    });
  } catch (error) {
    console.error("Get dashboard metrics failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch dashboard metrics",
    });
  }
};

/**
 * POST /api/v1/routing/documents/:id/mark-reviewed
 * Mark document as reviewed by current user's role
 */
export const markDocumentReviewed = async (req, res) => {
  try {
    const { id } = req.params;
    const userContext = await getRequestUserContext(req);
    const userRole = userContext?.role || req.query.role || "STAFF";

    const document = await Document.findByPk(id);

    if (!document) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }

    if (isStaffScoped(userContext)) {
      const assignedDepartments = Array.isArray(document.assigned_departments)
        ? document.assigned_departments.map((deptId) => String(deptId))
        : [];

      if (!assignedDepartments.includes(String(userContext.department_id))) {
        return res.status(403).json({ success: false, error: "You don't have access to this document" });
      }
    }

    // Add role to reviewed_by if not already there
    const reviewed = new Set(document.reviewed_by || []);
    reviewed.add(userRole);

    await document.update({
      reviewed_by: Array.from(reviewed),
    });

    res.json({
      success: true,
      message: "Document marked as reviewed",
      reviewed_by: document.reviewed_by,
    });
  } catch (error) {
    console.error("Mark reviewed failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to mark document as reviewed",
    });
  }
};

/**
 * POST /api/v1/routing/documents/:id/mark-viewed
 * Track when a user views a document (for "new" badge)
 */
export const markDocumentViewed = async (req, res) => {
  try {
    const { id } = req.params;
    const userContext = await getRequestUserContext(req);
    const userRole = userContext?.role || req.query.role || "STAFF";

    const document = await Document.findByPk(id);

    if (!document) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }

    if (isStaffScoped(userContext)) {
      const assignedDepartments = Array.isArray(document.assigned_departments)
        ? document.assigned_departments.map((deptId) => String(deptId))
        : [];

      if (!assignedDepartments.includes(String(userContext.department_id))) {
        return res.status(403).json({ success: false, error: "You don't have access to this document" });
      }
    }

    const viewed = new Set(document.viewed_by || []);
    viewed.add(userRole);

    await document.update({
      viewed_by: Array.from(viewed),
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Mark viewed failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to track document view",
    });
  }
};

/**
 * GET /api/v1/routing/documents/:id/traceability
 * Get document source traceability for judges (audit trail)
 * Shows where summary came from in the source document
 */
export const getDocumentTraceability = async (req, res) => {
  try {
    const { id } = req.params;
    const userContext = await getRequestUserContext(req);

    const document = await Document.findByPk(id);

    if (!document) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }

    if (isStaffScoped(userContext)) {
      const assignedDepartments = Array.isArray(document.assigned_departments)
        ? document.assigned_departments.map((deptId) => Number.parseInt(deptId, 10))
        : [];

      if (!assignedDepartments.includes(userContext.department_id)) {
        return res.status(403).json({ success: false, error: "You don't have access to this document" });
      }
    }

    res.json({
      success: true,
      document_id: id,
      document_title: document.file_name,
      document_type: document.file_type,
      ocr_confidence: document.ocr_confidence,
      language_detected: document.language_detected,
      original_text_sample: document.raw_text?.substring(0, 1000) || "N/A",
      summary_generation: {
        model_used: document.llm_metadata?.model_used,
        tokens_used: {
          input: document.llm_metadata?.input_tokens,
          output: document.llm_metadata?.output_tokens,
          total: document.llm_metadata?.total_tokens,
        },
      },
      source_document: {
        storage_url: document.storage_url,
        file_size: document.file_size,
        uploaded_by: document.uploaded_by,
        uploaded_at: document.createdAt,
      },
      audit_trail: {
        classified_at: document.updatedAt,
        routed_at: document.routed_at,
        completed_at: document.completed_at,
      },
    });
  } catch (error) {
    console.error("Get traceability failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch traceability information",
    });
  }
};
