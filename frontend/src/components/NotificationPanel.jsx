import React, { useEffect, useState } from "react";
import { Bell, X, ChevronRight } from "lucide-react";

const NotificationPanel = ({ userRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [filterPriority, setFilterPriority] = useState("All");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [userRole, filterPriority]);

  const fetchNotifications = async () => {
    try {
      const params = new URLSearchParams({
        role: userRole,
        ...(filterPriority !== "All" && { priority: filterPriority }),
      });

      const response = await fetch(`/api/v1/routing/notifications?${params}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        updateUnreadCount(data.notifications);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const updateUnreadCount = (notificationsList) => {
    const unread = notificationsList.filter((n) => !n.is_read).length;
    setUnreadCount(unread);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "RED":
        return "bg-red-100 border-l-4 border-red-600";
      case "ORANGE":
        return "bg-orange-100 border-l-4 border-orange-600";
      case "BLUE":
        return "bg-blue-100 border-l-4 border-blue-600";
      default:
        return "bg-gray-100";
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "RED":
        return "🔴";
      case "ORANGE":
        return "🟠";
      case "BLUE":
        return "🔵";
      default:
        return "⚪";
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const filteredNotifications =
    filterPriority === "All"
      ? notifications
      : notifications.filter((n) => n.priority_color === filterPriority);

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Notifications ({filteredNotifications.length})
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 p-4 border-b border-gray-200 bg-gray-50">
            {["All", "RED", "ORANGE", "BLUE"].map((priority) => (
              <button
                key={priority}
                onClick={() => setFilterPriority(priority)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filterPriority === priority
                    ? "bg-teal-600 text-white"
                    : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
                }`}
              >
                {priority === "All" ? "All" : getPriorityIcon(priority)}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No notifications</p>
              </div>
            ) : (
              <div className="space-y-2 p-2">
                {filteredNotifications
                  .sort((a, b) => {
                    const priorityOrder = { RED: 1, ORANGE: 2, BLUE: 3 };
                    return (
                      priorityOrder[a.priority_color] -
                      priorityOrder[b.priority_color]
                    );
                  })
                  .map((notification, idx) => (
                    <div
                      key={idx}
                      className={`${getPriorityColor(
                        notification.priority_color
                      )} p-3 rounded-lg cursor-pointer hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl mt-0.5">
                          {getPriorityIcon(notification.priority_color)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-700 truncate">
                            {notification.document_type}
                          </p>
                          <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                            {notification.summary_preview}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>
                        <ChevronRight
                          size={18}
                          className="text-gray-400 mt-0.5 flex-shrink-0"
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
