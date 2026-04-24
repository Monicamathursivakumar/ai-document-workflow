import React from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { AlertCircle, ChartColumnIncreasing, CircleDollarSign, Layers3 } from "lucide-react";
import { useTranslation } from "../context/TranslationContext";

const TEAL = "#2FA4A9";
const DARK_TEAL = "#1F7F86";
const GRID = "#E5E7EB";

const COLORS = ["#2FA4A9", "#1F7F86", "#0F766E", "#14B8A6", "#5EEAD4", "#99F6E4"];

const sampleAnalytics = {
  totalDocuments: 8,
  completionRate: 75,
  processingRate: 25,
  monthlySeries: [
    { month: "Jan", documents: 1 },
    { month: "Feb", documents: 1 },
    { month: "Mar", documents: 1 },
    { month: "Apr", documents: 1 },
    { month: "May", documents: 1 },
    { month: "Jun", documents: 1 },
    { month: "Jul", documents: 1 },
    { month: "Aug", documents: 1 },
    { month: "Sep", documents: 0 },
    { month: "Oct", documents: 0 },
    { month: "Nov", documents: 0 },
    { month: "Dec", documents: 0 },
  ],
  statusDistribution: [
    { name: "COMPLETED", value: 4 },
    { name: "PROCESSING_LLM", value: 1 },
    { name: "PROCESSING_OCR", value: 1 },
    { name: "UPLOADED", value: 1 },
    { name: "FAILED", value: 1 },
    { name: "UNREADABLE", value: 0 },
  ],
  priorityDistribution: [
    { name: "HIGH", value: 5 },
    { name: "NORMAL", value: 3 },
    { name: "LOW", value: 0 },
  ],
  departmentDistribution: [
    { name: "Engineering", value: 2 },
    { name: "Safety", value: 2 },
    { name: "Finance", value: 1 },
    { name: "HR", value: 1 },
    { name: "Legal", value: 1 },
    { name: "Operations", value: 1 },
  ],
};

const formatNumber = (value) => new Intl.NumberFormat("en-IN").format(Number(value || 0));

const AnalyticsPage = () => {
  const { t } = useTranslation();

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

  const statusLabelMap = {
    COMPLETED: t("completed"),
    PROCESSING_LLM: t("analyticsStatusProcessingLlm"),
    PROCESSING_OCR: t("analyticsStatusProcessingOcr"),
    UPLOADED: t("analyticsStatusUploaded"),
    FAILED: t("failed"),
    UNREADABLE: t("analyticsStatusUnreadable"),
  };

  const priorityLabelMap = {
    HIGH: t("analyticsPriorityHigh"),
    NORMAL: t("analyticsPriorityNormal"),
    LOW: t("analyticsPriorityLow"),
  };

  const monthlySeries = sampleAnalytics.monthlySeries.map((item, index) => ({
    ...item,
    month: t(monthKeys[index]),
  }));

  const statusDistribution = sampleAnalytics.statusDistribution.map((item) => ({
    ...item,
    name: statusLabelMap[item.name] || item.name,
  }));

  const priorityDistribution = sampleAnalytics.priorityDistribution.map((item) => ({
    ...item,
    name: priorityLabelMap[item.name] || item.name,
  }));

  const topDepartments = [...sampleAnalytics.departmentDistribution].sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-linear-to-r from-[#1F7F86] to-[#2FA4A9] p-6 text-white shadow-lg">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs uppercase tracking-[0.2em]">
              <ChartColumnIncreasing className="h-4 w-4" /> {t("analytics")}
            </div>
            <h1 className="mt-3 text-3xl font-bold">{t("analyticsTitle")}</h1>
            <p className="mt-2 max-w-2xl text-white/90">
              {t("analyticsSubtitle")}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:min-w-[320px]">
            <div className="rounded-xl bg-white/15 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-white/75">{t("totalDocuments")}</p>
              <p className="mt-1 text-2xl font-semibold">{formatNumber(sampleAnalytics.totalDocuments)}</p>
            </div>
            <div className="rounded-xl bg-white/15 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-white/75">{t("analyticsCompletedRate")}</p>
              <p className="mt-1 text-2xl font-semibold">{sampleAnalytics.completionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: t("totalDocuments"), value: sampleAnalytics.totalDocuments, icon: Layers3 },
          { label: t("completed"), value: sampleAnalytics.completionRate, suffix: "%", icon: CircleDollarSign },
          { label: t("processing"), value: sampleAnalytics.processingRate, suffix: "%", icon: ChartColumnIncreasing },
          { label: t("departments"), value: sampleAnalytics.departmentDistribution.length, icon: AlertCircle },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[#2FA4A9]/10 p-3 text-[#1F7F86]">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{item.label}</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatNumber(item.value)}{item.suffix || ""}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: t("analyticsPeakMonth"), value: t("monthDec"), note: t("analyticsPeakMonthNote") },
          { label: t("analyticsLowestMonth"), value: t("monthJan"), note: t("analyticsLowestMonthNote") },
          { label: t("analyticsMostActiveDepartment"), value: "Engineering", note: t("analyticsMostActiveDepartmentNote") },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-[#2FA4A9]/20 bg-[#2FA4A9]/5 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-[#1F7F86]">{item.label}</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{item.value}</p>
            <p className="text-sm text-gray-600">{item.note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t("analyticsUploadsOverTime")}</h2>
            <p className="text-sm text-gray-500">{t("analyticsMonthlyDocumentVolume")}</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="month" tick={{ fill: "#6B7280" }} axisLine={{ stroke: GRID }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "#6B7280" }} axisLine={{ stroke: GRID }} tickLine={false} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="documents"
                  name={t("analyticsDocumentsLegend")}
                  stroke={DARK_TEAL}
                  strokeWidth={5}
                  dot={{ r: 5, fill: TEAL, strokeWidth: 2 }}
                  activeDot={{ r: 8 }}
                  connectNulls
                />
                <LabelList dataKey="documents" position="top" fill="#374151" fontSize={12} />
                <Area type="monotone" dataKey="documents" fill="#2FA4A922" stroke="none" legendType="none" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t("analyticsStatusDistribution")}</h2>
            <p className="text-sm text-gray-500">{t("analyticsLifecycleBreakdown")}</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`status-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t("analyticsDepartmentLoad")}</h2>
            <p className="text-sm text-gray-500">{t("analyticsTopDepartmentsByCount")}</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topDepartments} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis type="number" tick={{ fill: "#6B7280" }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fill: "#6B7280" }} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} fill={TEAL} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t("analyticsPriorityMix")}</h2>
            <p className="text-sm text-gray-500">{t("analyticsHighVsNormalWorkload")}</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityDistribution}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={110}
                  innerRadius={40}
                  paddingAngle={2}
                >
                  {priorityDistribution.map((entry, index) => (
                    <Cell key={`priority-${entry.name}`} fill={COLORS[(index + 1) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AnalyticsPage;
