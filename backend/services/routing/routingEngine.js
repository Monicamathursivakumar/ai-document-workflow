/**
 * Document Routing Engine
 * Routes documents to appropriate roles based on classification and department
 * Implements department-wise routing matrix
 */

const ROUTING_MATRIX = {
  "Safety Circular": {
    primary: ["CE_ST"], // Chief Engineer (Safety & Technology)
    secondary: ["MD", "DIRECTOR_SYSTEMS"],
    urgency: "CRITICAL",
    compliance: true,
  },
  "Design Change Note": {
    primary: ["DIRECTOR_PROJECTS"],
    secondary: ["CE_CIVIL", "CE_ELECTRICAL"],
    urgency: "TIME_BOUND",
    compliance: false,
  },
  "Regulatory Directive": {
    primary: ["MD"],
    secondary: ["DIRECTOR_PROJECTS", "DIRECTOR_SYSTEMS", "DIRECTOR_FINANCE", "SAFETY_HEAD"],
    urgency: "CRITICAL",
    compliance: true,
  },
  "Vendor Invoice": {
    primary: ["DIRECTOR_FINANCE"],
    secondary: ["GM_ADMIN"],
    urgency: "TIME_BOUND",
    compliance: true,
  },
  "Purchase Order": {
    primary: ["DIRECTOR_FINANCE"],
    secondary: ["GM_ADMIN"],
    urgency: "TIME_BOUND",
    compliance: true,
  },
  "Maintenance Job Card": {
    primary: ["OM_MANAGER"],
    secondary: ["DIRECTOR_SYSTEMS"],
    urgency: "NORMAL",
    compliance: false,
  },
  "Incident Report": {
    primary: ["SAFETY_HEAD"],
    secondary: ["MD"],
    urgency: "CRITICAL",
    compliance: true,
  },
  "HR Policy": {
    primary: ["GM_ADMIN"],
    secondary: ["STAFF"],
    urgency: "NORMAL",
    compliance: false,
  },
  "Tender Document": {
    primary: ["DIRECTOR_PROJECTS"],
    secondary: ["DIRECTOR_FINANCE"],
    urgency: "TIME_BOUND",
    compliance: true,
  },
  "Board Minutes": {
    primary: ["MD"],
    secondary: ["DIRECTOR_PROJECTS", "DIRECTOR_SYSTEMS", "DIRECTOR_FINANCE", "SAFETY_HEAD", "GM_ADMIN"],
    urgency: "NORMAL",
    compliance: false,
  },
};

const ROLE_HIERARCHY = {
  MD: 1,
  DIRECTOR_PROJECTS: 2,
  DIRECTOR_SYSTEMS: 2,
  DIRECTOR_FINANCE: 2,
  SAFETY_HEAD: 2,
  CE_CIVIL: 3,
  CE_ELECTRICAL: 3,
  CE_ST: 3,
  OM_MANAGER: 3,
  GM_ADMIN: 3,
  STAFF: 4,
};

/**
 * Route document to appropriate departments and roles
 * @param {string} documentType - Detected document type
 * @param {string} classifiedDept - Primary classified department
 * @param {object} options - Additional routing options
 * @returns {object} Routing decision with primary/secondary roles
 */
export function routeDocument(documentType, classifiedDept, options = {}) {
  const routing = ROUTING_MATRIX[documentType] || getDefaultRouting(documentType, classifiedDept);

  return {
    primary_roles: routing.primary,
    secondary_roles: routing.secondary,
    urgency: routing.urgency,
    is_compliance_critical: routing.compliance,
    document_type: documentType,
    classified_department: classifiedDept,
    routed_at: new Date().toISOString(),
  };
}

/**
 * Get default routing for unrecognized document types
 */
function getDefaultRouting(docType, dept) {
  const deptMap = {
    projects: { primary: ["DIRECTOR_PROJECTS"], secondary: ["DIRECTOR_FINANCE"] },
    systems: { primary: ["DIRECTOR_SYSTEMS"], secondary: ["OM_MANAGER"] },
    finance: { primary: ["DIRECTOR_FINANCE"], secondary: ["GM_ADMIN"] },
    safety: { primary: ["SAFETY_HEAD"], secondary: ["MD"] },
    admin: { primary: ["GM_ADMIN"], secondary: ["MD"] },
  };

  const dept_key = dept?.toLowerCase() || "admin";
  const route = deptMap[dept_key] || deptMap.admin;

  return {
    primary: route.primary,
    secondary: route.secondary,
    urgency: "NORMAL",
    compliance: false,
  };
}

/**
 * Determine notification priority based on routing
 * @param {object} routingDecision - Result from routeDocument()
 * @returns {string} Notification priority: RED, ORANGE, BLUE
 */
export function getNotificationPriority(routingDecision) {
  if (routingDecision.is_compliance_critical) {
    return "RED"; // Critical/Compliance
  }
  if (routingDecision.urgency === "TIME_BOUND" || routingDecision.urgency === "CRITICAL") {
    return "ORANGE"; // Time-bound/Urgent
  }
  return "BLUE"; // Informational
}

/**
 * Check if a user should see a document based on role-based routing
 * @param {string} userRole - User's role
 * @param {object} routingDecision - Routing decision object
 * @returns {boolean} Whether user can access the document
 */
export function userCanAccessDocument(userRole, routingDecision) {
  const allRoles = [
    ...routingDecision.primary_roles,
    ...routingDecision.secondary_roles,
  ];
  return allRoles.includes(userRole);
}

/**
 * Get all documents visible to a user role
 * Used for role-based dashboard filtering
 * @param {string} userRole - User's role
 * @returns {object} Query filter for database
 */
export function getRoleDocumentFilter(userRole) {
  return {
    routed_to_roles: { [require("sequelize").Op.contains]: [userRole] },
    status: "COMPLETED",
  };
}

/**
 * Flatten routing into a single array of all assigned roles
 * @param {object} routingDecision - Routing decision object
 * @returns {array} All roles assigned to receive this document
 */
export function getAllRoutedRoles(routingDecision) {
  return [
    ...new Set([...routingDecision.primary_roles, ...routingDecision.secondary_roles]),
  ];
}

export { ROUTING_MATRIX, ROLE_HIERARCHY };
