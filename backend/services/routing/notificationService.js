/**
 * Notification System
 * Manages alert priority, distribution, and user notifications
 */

const NOTIFICATION_PRIORITIES = {
  RED: {
    color: "#DC2626", // Red
    label: "Critical",
    soundEnabled: true,
    includes: ["CRITICAL", "COMPLIANCE"],
    examples: ["Safety incidents", "Regulatory directives", "Compliance deadlines"],
  },
  ORANGE: {
    color: "#F97316", // Orange
    label: "Urgent",
    soundEnabled: true,
    includes: ["TIME_BOUND", "URGENT"],
    examples: ["Payment deadlines", "Tender submissions", "Design approvals"],
  },
  BLUE: {
    color: "#3B82F6", // Blue
    label: "Informational",
    soundEnabled: false,
    includes: ["NORMAL", "FYI"],
    examples: ["Policy updates", "Routine reports", "Meeting minutes"],
  },
};

/**
 * Create notification for document routing
 * @param {object} document - Document object
 * @param {object} routingDecision - Result from routingEngine.routeDocument()
 * @param {string} userRole - Which role is receiving this notification
 * @returns {object} Notification object
 */
export function createNotification(document, routingDecision, userRole) {
  const priority = getNotificationPriority(routingDecision);
  const notifConfig = NOTIFICATION_PRIORITIES[priority];

  return {
    id: `notif_${document.id}_${userRole}_${Date.now()}`,
    document_id: document.id,
    recipient_role: userRole,
    document_title: document.file_name,
    document_type: routingDecision.document_type,
    priority: priority,
    priority_label: notifConfig.label,
    priority_color: notifConfig.color,
    is_primary: routingDecision.primary_roles.includes(userRole),
    urgency: routingDecision.urgency,
    compliance_critical: routingDecision.is_compliance_critical,
    summary_preview: "", // Will be populated after summary generation
    action_required: true,
    created_at: new Date().toISOString(),
    read: false,
    sound_enabled: notifConfig.soundEnabled,
  };
}

/**
 * Determine priority level (RED/ORANGE/BLUE)
 * @param {object} routingDecision - Routing decision object
 * @returns {string} Priority: RED, ORANGE, or BLUE
 */
export function getNotificationPriority(routingDecision) {
  if (routingDecision.is_compliance_critical && routingDecision.urgency === "CRITICAL") {
    return "RED"; // Highest priority: Safety/Compliance + Critical
  }
  if (routingDecision.is_compliance_critical) {
    return "RED"; // Compliance always Red
  }
  if (routingDecision.urgency === "CRITICAL") {
    return "RED"; // Critical incidents are Red
  }
  if (routingDecision.urgency === "TIME_BOUND") {
    return "ORANGE"; // Time-bound is Orange
  }
  return "BLUE"; // Everything else is Blue/Informational
}

/**
 * Filter notifications for a specific user role
 * @param {array} notifications - All notifications
 * @param {string} userRole - User's role
 * @param {object} filters - Optional filters { unread_only, priority }
 * @returns {array} Filtered notifications
 */
export function filterNotificationsFor(notifications, userRole, filters = {}) {
  let filtered = notifications.filter((n) => n.recipient_role === userRole);

  if (filters.unread_only) {
    filtered = filtered.filter((n) => !n.read);
  }

  if (filters.priority) {
    filtered = filtered.filter((n) => n.priority === filters.priority);
  }

  return filtered.sort((a, b) => {
    // Sort by priority: RED > ORANGE > BLUE
    const priorityOrder = { RED: 0, ORANGE: 1, BLUE: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Get notification count by priority
 * @param {array} notifications - All notifications
 * @param {string} userRole - User's role
 * @returns {object} Counts: { critical, urgent, informational, total }
 */
export function getNotificationCounts(notifications, userRole) {
  const userNotifs = notifications.filter((n) => n.recipient_role === userRole && !n.read);

  return {
    critical: userNotifs.filter((n) => n.priority === "RED").length,
    urgent: userNotifs.filter((n) => n.priority === "ORANGE").length,
    informational: userNotifs.filter((n) => n.priority === "BLUE").length,
    total: userNotifs.length,
  };
}

/**
 * Mark notification as read
 * @param {object} notification - Notification object
 * @returns {object} Updated notification
 */
export function markAsRead(notification) {
  return {
    ...notification,
    read: true,
    read_at: new Date().toISOString(),
  };
}

/**
 * Get dashboard alert metrics
 * Rolled up view for quick status dashboard
 * @param {array} documents - All documents
 * @param {object} notifications - All notifications
 * @param {string} userRole - User's role
 * @returns {object} Metrics for top bar
 */
export function getDashboardMetrics(documents, notifications, userRole) {
  const userDocs = documents.filter(
    (d) => d.routed_to_roles && d.routed_to_roles.includes(userRole)
  );

  const criticalNotifs = notifications.filter(
    (n) => n.recipient_role === userRole && n.priority === "RED" && !n.read
  );

  const complianceDocs = userDocs.filter((d) => {
    const notif = notifications.find((n) => n.document_id === d.id);
    return notif?.compliance_critical;
  });

  const pendingActions = userDocs.filter(
    (d) => d.status === "COMPLETED" && !d.reviewed_by || !d.reviewed_by.includes(userRole)
  );

  return {
    critical_alerts: criticalNotifs.length,
    compliance_due: complianceDocs.length,
    new_documents: notifications.filter((n) => n.recipient_role === userRole && !n.read).length,
    pending_actions: pendingActions.length,
  };
}

export { NOTIFICATION_PRIORITIES };
