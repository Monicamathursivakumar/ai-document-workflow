import React, { useEffect, useState } from "react";
import { AlertTriangle, BookCheck, FileStack, Clock } from "lucide-react";

const DashboardMetricsBar = ({ userRole }) => {
  const [metrics, setMetrics] = useState({
    critical_alerts: 0,
    compliance_due: 0,
    new_documents: 0,
    pending_actions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Auto-refresh every 30 seconds
    return () => clearInterval(interval);
  }, [userRole]);

  const fetchMetrics = async () => {
    try {
      const response = await fetch(
        `/api/v1/routing/dashboard-metrics?role=${userRole}`
      );
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const metricCards = [
    {
      label: "Critical Alerts",
      icon: AlertTriangle,
      value: metrics.critical_alerts,
      color: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-700",
      badgeColor: "bg-red-600",
      badge: metrics.critical_alerts > 0,
    },
    {
      label: "Compliance Due",
      icon: BookCheck,
      value: metrics.compliance_due,
      color: "bg-orange-50",
      borderColor: "border-orange-200",
      textColor: "text-orange-700",
      badgeColor: "bg-orange-600",
      badge: metrics.compliance_due > 0,
    },
    {
      label: "New Documents",
      icon: FileStack,
      value: metrics.new_documents,
      color: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-700",
      badgeColor: "bg-blue-600",
      badge: metrics.new_documents > 0,
    },
    {
      label: "Pending Actions",
      icon: Clock,
      value: metrics.pending_actions,
      color: "bg-purple-50",
      borderColor: "border-purple-200",
      textColor: "text-purple-700",
      badgeColor: "bg-purple-600",
      badge: metrics.pending_actions > 0,
    },
  ];

  if (loading) {
    return <div className="p-4 text-gray-500">Loading metrics...</div>;
  }

  return (
    <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
      {metricCards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`${card.color} ${card.borderColor} border-2 rounded-lg p-4 text-center relative`}
          >
            {card.badge && (
              <div className={`absolute top-2 right-2 ${card.badgeColor} text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold`}>
                {card.value}
              </div>
            )}
            <Icon className={`${card.textColor} mx-auto mb-2`} size={32} />
            <p className="text-sm font-semibold text-gray-700">{card.label}</p>
            <p className={`${card.textColor} text-2xl font-bold`}>
              {card.value}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardMetricsBar;
