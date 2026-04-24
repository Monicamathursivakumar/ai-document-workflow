import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock3,
  FileClock,
  FileText,
  Flame,
  ScanText,
  Sparkles,
  Upload,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/TranslationContext";
import { DEFAULT_DEPARTMENTS } from "../lib/departments";

const METRIC_META = [
  { key: "documentsToday", labelKey: "dashboardDocumentsToday", icon: FileText },
  { key: "processingNow", labelKey: "dashboardProcessingNow", icon: ScanText },
  { key: "highPriority", labelKey: "dashboardHighPriority", icon: Flame },
  { key: "pendingReview", labelKey: "pendingReview", icon: Clock3 },
  { key: "processedToday", labelKey: "dashboardProcessedToday", icon: CheckCircle2 },
  { key: "activeDepartments", labelKey: "dashboardActiveDepartments", icon: Building2 },
];

const PIPELINE_STAGES = [
  "UPLOADED",
  "PREPROCESSING",
  "PROCESSING_OCR",
  "PROCESSING_LLM",
  "COMPLETED",
];

const MOCK_DEPARTMENTS = DEFAULT_DEPARTMENTS;

const MOCK_ANALYTICS = {
  total_documents: 8,
  status_distribution: [
    { status: "COMPLETED", count: 8 },
    { status: "PROCESSING_LLM", count: 0 },
    { status: "PROCESSING_OCR", count: 0 },
    { status: "UPLOADED", count: 0 },
  ],
  priority_distribution: [
    { priority: "HIGH", count: 6 },
    { priority: "NORMAL", count: 2 },
    { priority: "LOW", count: 0 },
  ],
  department_distribution: [
    { department: "Engineering", count: 27 },
    { department: "Safety", count: 22 },
    { department: "Finance", count: 21 },
    { department: "HR", count: 16 },
    { department: "Legal", count: 14 },
  ],
};

const EMPTY_ROLE_METRICS = {
  critical_alerts: 0,
  compliance_due: 0,
  new_documents: 0,
  pending_actions: 0,
};

const MONICA_MOCK_ALERTS = [
  {
    id: 1,
    type: "COMPLIANCE",
    title: "Annual Compliance Review Due",
    description: "Metro Operations annual compliance review is overdue",
    severity: "HIGH",
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
  },
  {
    id: 2,
    type: "URGENT_ACTION",
    title: "Security Policy Update Required",
    description: "All departments must acknowledge the updated security policy",
    severity: "CRITICAL",
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
  },
  {
    id: 3,
    type: "DEADLINE",
    title: "Q2 Safety Inspection Report",
    description: "Safety inspection report submission required for all stations",
    severity: "HIGH",
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
  },
];

const MONICA_MOCK_DEADLINES = [
  {
    id: 1,
    title: "Station Maintenance Schedule",
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    source: "maintenance-plan.pdf",
  },
  {
    id: 2,
    title: "Employee Training Compliance",
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    source: "training-requirements.docx",
  },
];

const formatDate = (input) => {
  if (!input) return "-";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toTitleCase = (value = "") =>
  value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const isToday = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
};

const extractDateCandidates = (text = "") => {
  const dateRegex =
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/gi;
  return text.match(dateRegex) || [];
};

const parseLooseDate = (value) => {
  if (!value) return null;
  const normalized = value.replace(/-/g, "/").trim();
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const parts = normalized.split("/").map((item) => Number(item));
  if (parts.length === 3 && parts.every((item) => !Number.isNaN(item))) {
    const [d, m, y] = parts;
    const year = y < 100 ? 2000 + y : y;
    const fallback = new Date(year, m - 1, d);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  return null;
};

const getDocTextForDeadlineScan = (doc) => {
  const actionItems = Array.isArray(doc.action_items)
    ? doc.action_items
        .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
        .join(" ")
    : "";
  const detailedSummary = Array.isArray(doc.detailed_summary_en)
    ? doc.detailed_summary_en.join(" ")
    : "";

  return [doc.file_name, doc.short_summary_en, detailedSummary, actionItems]
    .filter(Boolean)
    .join(" ");
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { name, role } = useAuth();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [roleMetrics, setRoleMetrics] = useState(null);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t("goodMorning") : hour < 17 ? t("goodAfternoon") : t("goodEvening");

  const stageLabelMap = {
    UPLOADED: t("dashboardStageUploaded"),
    PREPROCESSING: t("dashboardStagePreprocessing"),
    PROCESSING_OCR: t("dashboardStageOcr"),
    PROCESSING_LLM: t("dashboardStageLlm"),
    COMPLETED: t("completed"),
  };

  const statusLabelMap = {
    COMPLETED: t("completed"),
    PROCESSING_LLM: t("analyticsStatusProcessingLlm"),
    PROCESSING_OCR: t("analyticsStatusProcessingOcr"),
    PREPROCESSING: t("dashboardStagePreprocessing"),
    UPLOADED: t("analyticsStatusUploaded"),
    FAILED: t("failed"),
    UNREADABLE: t("analyticsStatusUnreadable"),
    SUMMARIZING: t("analyzingContent"),
  };

  const priorityLabelMap = {
    HIGH: t("analyticsPriorityHigh"),
    NORMAL: t("analyticsPriorityNormal"),
    LOW: t("analyticsPriorityLow"),
  };

  const formatTemplate = (key, values = {}) => {
    let message = t(key);
    Object.entries(values).forEach(([token, value]) => {
      message = message.replace(`{${token}}`, String(value));
    });
    return message;
  };

  const fetchDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const base = import.meta.env.VITE_SERVER_URL;
      const currentRole = role || "STAFF";
      const token = localStorage.getItem("token");
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      const [docsRes, analyticsRes, departmentsRes, roleMetricsRes] =
        await Promise.allSettled([
          fetch(`${base}/api/v1/documents?limit=120`, { headers: authHeaders }),
          fetch(`${base}/api/v1/analytics`, { headers: authHeaders }),
          fetch(`${base}/api/v1/departments`),
          fetch(`${base}/api/v1/routing/dashboard-metrics?role=${currentRole}`, { headers: authHeaders }),
        ]);

      let docsPayload = null;
      if (docsRes.status === "fulfilled" && docsRes.value.ok) {
        docsPayload = await docsRes.value.json();
      }

      const apiDocuments = docsPayload?.documents || [];
      setDocuments(apiDocuments);

      if (analyticsRes.status === "fulfilled" && analyticsRes.value.ok) {
        const analyticsPayload = await analyticsRes.value.json();
        setAnalytics(analyticsPayload?.analytics || MOCK_ANALYTICS);
      } else {
        setAnalytics(MOCK_ANALYTICS);
      }

      if (departmentsRes.status === "fulfilled" && departmentsRes.value.ok) {
        const deptPayload = await departmentsRes.value.json();
        setDepartments(deptPayload?.departments || MOCK_DEPARTMENTS);
      } else {
        setDepartments(MOCK_DEPARTMENTS);
      }

      // Use mock data for Monica Siva, real data for others
      const monicaMockMetrics = {
        critical_alerts: 3,
        compliance_due: 4,
        new_documents: 8,
        pending_actions: 5,
      };

      if (roleMetricsRes.status === "fulfilled" && roleMetricsRes.value.ok) {
        const rolePayload = await roleMetricsRes.value.json();
        setRoleMetrics(rolePayload?.metrics || (name === "monica siva" ? monicaMockMetrics : EMPTY_ROLE_METRICS));
      } else {
        setRoleMetrics(name === "monica siva" ? monicaMockMetrics : EMPTY_ROLE_METRICS);
      }
    } catch (err) {
      console.error("Dashboard fetch failed:", err);
      setDocuments([]);
      setAnalytics(null);
      setDepartments(MOCK_DEPARTMENTS);
      setRoleMetrics({
        ...EMPTY_ROLE_METRICS,
      });
      setError(t("dashboardLiveDataUnavailable"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [role]);

  // Helper to map department ID to name. Accepts both 0-based and 1-based IDs.
  const getDepartmentName = (deptId) => {
    const sourceDepartments = departments.length ? departments : MOCK_DEPARTMENTS;
    const parsedId = Number(deptId);
    if (!Number.isInteger(parsedId) || parsedId < 0) {
      return String(deptId || "").trim() || "Unassigned";
    }

    const deptByExactId = sourceDepartments.find((d) => d.id === parsedId);
    if (deptByExactId) return deptByExactId.name;

    // Some records store department IDs as 0-based indexes.
    const deptByZeroBasedId = sourceDepartments.find((d) => d.id === parsedId + 1);
    if (deptByZeroBasedId) return deptByZeroBasedId.name;

    return "Unassigned";
  };

  const dashboardMetrics = useMemo(() => {
    const processingStates = new Set([
      "UPLOADED",
      "PREPROCESSING",
      "PROCESSING_OCR",
      "PROCESSING_LLM",
      "SUMMARIZING",
    ]);

    const documentsToday = documents.filter((doc) => isToday(doc.createdAt)).length;
    const processingNow = documents.filter((doc) => processingStates.has(doc.status)).length;
    const highPriority = documents.filter(
      (doc) => doc.priority === "HIGH" || doc.urgency_level === "CRITICAL"
    ).length;
    const processedToday = documents.filter(
      (doc) => doc.status === "COMPLETED" && isToday(doc.createdAt)
    ).length;

    const pendingReviewByDocs = documents.filter(
      (doc) => doc.status === "COMPLETED" && (!doc.reviewed_by || doc.reviewed_by.length === 0)
    ).length;

    const deptSet = new Set(
      documents
        .flatMap((doc) => doc.assigned_departments || [])
        .map((name) => String(name).trim())
        .filter(Boolean)
    );

    return {
      documentsToday,
      processingNow,
      highPriority,
      pendingReview: roleMetrics?.pending_actions ?? pendingReviewByDocs,
      processedToday,
      activeDepartments: deptSet.size,
    };
  }, [documents, roleMetrics]);

  const pipeline = useMemo(() => {
    const total = Math.max(documents.length, 1);
    const counts = PIPELINE_STAGES.reduce((acc, stage) => {
      acc[stage] = documents.filter((doc) => doc.status === stage).length;
      return acc;
    }, {});

    return PIPELINE_STAGES.map((stage) => ({
      stage,
      count: counts[stage] || 0,
      percentage: Math.round(((counts[stage] || 0) / total) * 100),
    }));
  }, [documents]);

  const inbox = useMemo(
    () =>
      [...documents]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 8),
    [documents]
  );

  const monthlyUploads = useMemo(() => {
    const monthKeys = [
      "monthJan",
      "monthFeb",
      "monthMar",
      "monthApr",
      "monthMay",
      "monthJun",
      "monthJul",
      "monthAug",
      "monthSep",
      "monthOct",
      "monthNov",
      "monthDec",
    ];
    const labels = monthKeys.map((key) => t(key));
    const monthMap = new Map(labels.map((label) => [label, 0]));

    documents.forEach((doc) => {
      const date = new Date(doc.createdAt);
      if (Number.isNaN(date.getTime())) return;
      const monthLabel = labels[date.getMonth()] || labels[0];
      monthMap.set(monthLabel, (monthMap.get(monthLabel) || 0) + 1);
    });

    return labels.map((label) => ({ label, count: monthMap.get(label) || 0 }));
  }, [documents, t]);

  const departmentDistribution = useMemo(() => {
    const counts = new Map();

    if (analytics?.department_distribution?.length) {
      analytics.department_distribution.forEach((entry) => {
        const rawDepartment = entry.department ?? "Unassigned";
        const key =
          typeof rawDepartment === "number" || /^\d+$/.test(String(rawDepartment).trim())
            ? getDepartmentName(rawDepartment)
            : String(rawDepartment).trim() || "Unassigned";
        counts.set(key, Number(entry.count) || 0);
      });
    } else {
      documents
        .flatMap((doc) => doc.assigned_departments || [])
        .forEach((id) => {
          const deptName = getDepartmentName(id);
          counts.set(deptName, (counts.get(deptName) || 0) + 1);
        });
    }

    const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0) || 1;
    return Array.from(counts.entries())
      .map(([name, count]) => ({
        name,
        count,
        ratio: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [analytics, documents, departments]);

  const deadlineShowcase = useMemo(() => {
    const now = new Date();
    const candidates = [];

    // Add Monica Siva's mock deadlines
    if (name?.toLowerCase() === "monica siva") {
      candidates.push({
        id: 101,
        file_name: "Station Maintenance Schedule",
        dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        daysLeft: 2,
        severity: "critical",
        isEstimated: false,
      });
      candidates.push({
        id: 102,
        file_name: "Employee Training Compliance",
        dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        daysLeft: 5,
        severity: "warning",
        isEstimated: false,
      });
      return candidates.sort((a, b) => a.dueDate - b.dueDate).slice(0, 5);
    }

    documents.forEach((doc) => {
      const content = getDocTextForDeadlineScan(doc);
      const dateStrings = extractDateCandidates(content);
      const parsedDates = dateStrings
        .map(parseLooseDate)
        .filter((date) => date && !Number.isNaN(date.getTime()))
        .sort((a, b) => a - b);

      let dueDate = parsedDates.find((date) => date >= new Date(now.getFullYear(), now.getMonth(), now.getDate()));
      let isEstimated = false;

      if (!dueDate && (doc.urgency_level === "TIME_BOUND" || doc.urgency_level === "CRITICAL")) {
        const createdAt = new Date(doc.createdAt);
        if (!Number.isNaN(createdAt.getTime())) {
          dueDate = new Date(createdAt);
          dueDate.setDate(dueDate.getDate() + (doc.urgency_level === "CRITICAL" ? 2 : 7));
          isEstimated = true;
        }
      }

      if (!dueDate) return;

      const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      const severity = daysLeft < 0 ? "overdue" : daysLeft <= 2 ? "critical" : daysLeft <= 7 ? "warning" : "normal";

      candidates.push({
        id: doc.id,
        file_name: doc.file_name,
        dueDate,
        daysLeft,
        severity,
        isEstimated,
      });
    });

    const sortedCandidates = candidates.sort((a, b) => a.dueDate - b.dueDate).slice(0, 5);

    return sortedCandidates;
  }, [documents, name]);

  const urgentAlerts = useMemo(() => {
    const alerts = [];

    // Add Monica Siva's mock alerts
    if (name?.toLowerCase() === "monica siva") {
      alerts.push("Metro Operations compliance review is overdue");
      alerts.push("Security policy update requires acknowledgment from all departments");
      alerts.push("Q2 Safety inspection report due in 3 days");
      return alerts.slice(0, 4);
    }

    if ((roleMetrics?.critical_alerts || 0) > 0) {
      alerts.push(formatTemplate("dashboardCriticalAlertsMessage", { count: roleMetrics.critical_alerts }));
    }

    if ((roleMetrics?.compliance_due || 0) > 0) {
      alerts.push(formatTemplate("dashboardComplianceDueMessage", { count: roleMetrics.compliance_due }));
    }

    const urgentDeadlines = deadlineShowcase.filter((item) => item.severity === "critical" || item.severity === "overdue");
    urgentDeadlines.forEach((item) => {
      alerts.push(
        formatTemplate("dashboardDeadlineAlertMessage", {
          name: item.file_name,
          timing:
            item.daysLeft < 0
              ? formatTemplate("dashboardDaysOverdue", { days: Math.abs(item.daysLeft) })
              : formatTemplate("dashboardDaysRemaining", { days: item.daysLeft }),
        })
      );
    });

    return alerts.slice(0, 4);
  }, [roleMetrics, deadlineShowcase, name]);

  const isSimulated = useMemo(
    () =>
      documents.some((doc) => typeof doc.id === "number" && doc.id >= 1000 && doc.id <= 1012),
    [documents]
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <Card className="bg-linear-to-r from-blue-700 to-blue-600 text-white border-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {greeting}, {name || t("dashboardTeam")}
            </h1>
            <p className="text-white">{t("dashboardProfessionalOverview")}</p>
            {isSimulated ? (
              <span className="inline-flex items-center mt-2 text-xs font-semibold bg-white/15 text-white px-2 py-1 rounded-full">
                {t("dashboardSimulatedData")}
              </span>
            ) : null}
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="bg-white text-gray-900 hover:bg-gray-100"
              onClick={() => navigate("/documents")}
              startIcon={<Upload className="w-4 h-4" />}
            >
              {t("uploadDocuments")}
            </Button>
            <Button variant="outline" className="border-white text-white hover:bg-blue-700" onClick={fetchDashboard}>
              {t("dashboardRefresh")}
            </Button>
          </div>
        </div>
      </Card>

      {error ? (
        <Card className="border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {METRIC_META.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.key} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">{t(metric.labelKey)}</p>
                <Icon className="w-4 h-4 text-blue-700" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{loading ? "-" : dashboardMetrics[metric.key]}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{t("dashboardProcessingPipeline")}</h2>
              <Sparkles className="w-5 h-5 text-blue-700" />
            </div>
            <div className="space-y-3">
              {pipeline.map((item) => (
                <div key={item.stage}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">{stageLabelMap[item.stage] || toTitleCase(item.stage)}</span>
                    <span className="text-gray-600">{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("dashboardTodayInbox")} ({inbox.length})</h2>
            {loading ? (
              <div className="py-8 text-center text-gray-600">{t("loading")}...</div>
            ) : inbox.length === 0 ? (
              <div className="py-8 text-center text-gray-600">{t("noRecentDocuments")}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600 border-b border-gray-200">
                      <th className="py-2 pr-3">{t("fileName")}</th>
                      <th className="py-2 pr-3">{t("department")}</th>
                      <th className="py-2 pr-3">{t("dashboardPriority")}</th>
                      <th className="py-2 pr-3">{t("status")}</th>
                      <th className="py-2 pr-3">{t("uploadedOn")}</th>
                      <th className="py-2 text-right">{t("dashboardAction")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inbox.map((doc) => (
                      <tr key={doc.id} className="border-b border-gray-100">
                        <td className="py-3 pr-3 text-gray-900 font-medium max-w-52 truncate">{doc.file_name}</td>
                        <td className="py-3 pr-3 text-gray-700">{doc.assigned_departments?.[0] ? getDepartmentName(doc.assigned_departments[0]) : t("dashboardGeneral")}</td>
                        <td className="py-3 pr-3">
                          <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">
                            {priorityLabelMap[doc.priority] || t("analyticsPriorityNormal")}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-gray-700">{statusLabelMap[doc.status] || toTitleCase(doc.status)}</td>
                        <td className="py-3 pr-3 text-gray-700">{formatDate(doc.createdAt)}</td>
                        <td className="py-3 text-right">
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/documents/${doc.id}`)}>
                            {t("viewDetails")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("dashboardUrgentAlerts")} ({urgentAlerts.length})</h2>
            {urgentAlerts.length === 0 ? (
              <p className="text-sm text-gray-600">{t("dashboardNoUrgentAlerts")}</p>
            ) : (
              <div className="space-y-3">
                {urgentAlerts.map((alert, index) => (
                  <div key={`${alert}-${index}`} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50">
                    <AlertCircle className="w-4 h-4 text-blue-700 mt-0.5" />
                    <p className="text-sm text-gray-700">{alert}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("dashboardDeadlineShowcase")}</h2>
            {deadlineShowcase.length === 0 ? (
              <p className="text-sm text-gray-600">{t("dashboardNoDeadlines")}</p>
            ) : (
              <div className="space-y-3">
                {deadlineShowcase.map((item) => (
                  <button
                    key={item.id}
                    className="w-full text-left p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition"
                    onClick={() => navigate(`/documents/${item.id}`)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{item.file_name}</p>
                      <FileClock className="w-4 h-4 text-blue-700" />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{t("dashboardDue")}: {formatDate(item.dueDate)}</p>
                    <p className="text-xs text-gray-700 mt-1">
                      {item.daysLeft < 0
                        ? formatTemplate("dashboardDaysOverdue", { days: Math.abs(item.daysLeft) })
                        : formatTemplate("dashboardDaysRemaining", { days: item.daysLeft })}
                      {item.isEstimated ? ` (${t("dashboardEstimated")})` : ""}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("dashboardDocumentsByDepartment")} (Top {departmentDistribution.length})</h2>
          <div className="space-y-3">
            {departmentDistribution.length === 0 ? (
              <p className="text-sm text-gray-600">{t("dashboardNoDepartmentData")}</p>
            ) : (
              departmentDistribution.map((item) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">{item.name}</span>
                    <span className="text-gray-600">{item.ratio}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${item.ratio}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("dashboardMonthlyUploads")}</h2>
          <div className="h-44">
            {(() => {
              const width = 720;
              const height = 170;
              const padX = 24;
              const padTop = 12;
              const padBottom = 34;
              const usableWidth = width - padX * 2;
              const usableHeight = height - padTop - padBottom;
              const max = Math.max(...monthlyUploads.map((entry) => entry.count), 1);

              const points = monthlyUploads.map((item, index) => {
                const x = padX + (index * usableWidth) / (monthlyUploads.length - 1);
                const y = padTop + usableHeight - (item.count / max) * usableHeight;
                return { ...item, x, y };
              });

              const pathD = points
                .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
                .join(" ");

              return (
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" role="img" aria-label={t("dashboardMonthlyUploadsAria")}>
                  <line
                    x1={padX}
                    y1={height - padBottom}
                    x2={width - padX}
                    y2={height - padBottom}
                    stroke="#D1D5DB"
                    strokeWidth="1"
                  />
                  <path d={pathD} fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                  {points.map((point) => (
                    <g key={point.label}>
                      <circle cx={point.x} cy={point.y} r="3.5" fill="#2563EB" />
                      <text
                        x={point.x}
                        y={Math.max(point.y - 14, 14)}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="700"
                        fill="#1D4ED8"
                        stroke="#FFFFFF"
                        strokeWidth="3"
                        paintOrder="stroke"
                      >
                        {point.count}
                      </text>
                      <text x={point.x} y={height - 10} textAnchor="middle" fontSize="10" fill="#4B5563">
                        {point.label}
                      </text>
                    </g>
                  ))}
                </svg>
              );
            })()}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
