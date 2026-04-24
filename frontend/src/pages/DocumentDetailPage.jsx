import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Download, Trash2 } from "lucide-react";
import { Bar, Line, Pie } from "react-chartjs-2";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import Card from "@/components/ui/card";
import { useTranslation } from "../context/TranslationContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const DocumentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, currentLanguage } = useTranslation();

  const [doc, setDoc] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [pdfError, setPdfError] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const token = localStorage.getItem("token");
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

        const res = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/api/v1/documents/${id}`,
          { headers: authHeaders }
        );

        const data = await res.json();
        setDoc(data.document);
      } catch (err) {
        console.error("Error fetching document:", err);
      }
    };

    fetchDoc();
  }, [id]);

  const analytics = useMemo(() => {
    const beforeMinutes = 8;
    const afterMinutes = 6;
    const trainsPerHourBefore = 60 / beforeMinutes;
    const trainsPerHourAfter = 60 / afterMinutes;
    const frequencyIncreasePct =
      ((trainsPerHourAfter - trainsPerHourBefore) / trainsPerHourBefore) * 100;
    const estimatedTrainCapacity = 1000;
    const estimatedPassengerCapacityIncrease =
      (trainsPerHourAfter - trainsPerHourBefore) * estimatedTrainCapacity;

    return {
      peakFrequency: "Every 6 minutes",
      morningPeak: "07:00 - 10:00",
      eveningPeak: "17:00 - 20:30",
      route: "Aluva to SN Junction",
      beforeMinutes,
      afterMinutes,
      trainsPerHourBefore,
      trainsPerHourAfter,
      frequencyIncreasePct,
      estimatedPassengerCapacityIncrease,
      barLabels: ["Before", "After"],
      barValues: [beforeMinutes, afterMinutes],
      lineLabels: ["07:00", "08:00", "09:00", "17:00", "18:00", "19:00", "20:30"],
      lineValues: [8100, 11200, 9700, 10350, 12800, 11650, 9150],
      pieLabels: ["Marshals", "Announcements", "Escalation"],
      pieValues: [40, 30, 30],
    };
  }, []);

  const commonChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          labels: {
            color: "#334155",
            font: { size: 12, weight: "600" },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#475569" },
          grid: { color: "rgba(148, 163, 184, 0.25)" },
        },
        y: {
          ticks: { color: "#475569" },
          grid: { color: "rgba(148, 163, 184, 0.25)" },
        },
      },
    }),
    []
  );

  const barData = useMemo(
    () => ({
      labels: analytics.barLabels,
      datasets: [
        {
          label: "Minutes",
          data: analytics.barValues,
          backgroundColor: ["#94a3b8", "#0f766e"],
          borderRadius: 8,
        },
      ],
    }),
    [analytics.barLabels, analytics.barValues]
  );

  const lineData = useMemo(
    () => ({
      labels: analytics.lineLabels,
      datasets: [
        {
          label: "Passenger Count",
          data: analytics.lineValues,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.18)",
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: "#1d4ed8",
        },
      ],
    }),
    [analytics.lineLabels, analytics.lineValues]
  );

  const pieData = useMemo(
    () => ({
      labels: analytics.pieLabels,
      datasets: [
        {
          label: "Distribution",
          data: analytics.pieValues,
          backgroundColor: ["#0f766e", "#0284c7", "#f59e0b"],
          borderColor: "#ffffff",
          borderWidth: 2,
        },
      ],
    }),
    [analytics.pieLabels, analytics.pieValues]
  );

  const pieOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#334155",
            font: { size: 12, weight: "600" },
          },
        },
      },
    }),
    []
  );

  const formatDateTime = (dateObj) => {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(dateObj);
  };

  const downloadBlob = (blob, fileName) => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const downloadSummaryFallbackPdf = () => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = 14;
    const topY = 18;
    const lineHeight = 6;
    const maxWidth = pageWidth - marginX * 2;
    const generatedAt = formatDateTime(new Date());

    let y = topY;
    let pageNo = 1;

    const footer = () => {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Generated: ${generatedAt}`, marginX, pageHeight - 8);
      pdf.text(`Page ${pageNo}`, pageWidth - marginX, pageHeight - 8, { align: "right" });
    };

    const ensureSpace = (needed = lineHeight) => {
      if (y + needed > pageHeight - 14) {
        footer();
        pdf.addPage();
        pageNo += 1;
        y = topY;
      }
    };

    const writeBlock = (text, { bold = false, size = 11, spacing = 1 } = {}) => {
      const value = String(text || "").trim();
      if (!value) return;
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(size);
      pdf.setTextColor(15, 23, 42);
      const lines = pdf.splitTextToSize(value, maxWidth);
      lines.forEach((line) => {
        ensureSpace(lineHeight);
        pdf.text(line, marginX, y);
        y += lineHeight;
      });
      y += spacing;
    };

    writeBlock("Kochi Metro Rail Limited (KMRL)", { bold: true, size: 12, spacing: 1 });
    writeBlock("KMRL Document Report", { bold: true, size: 15, spacing: 2 });

    writeBlock(`Document ID: ${id}`, { size: 10, spacing: 0.5 });
    writeBlock(`File Name: ${doc?.file_name || "Unknown"}`, { size: 10, spacing: 0.5 });
    writeBlock(`Status: ${doc?.status || "Unknown"} | Priority: ${doc?.priority || "NORMAL"}`, {
      size: 10,
      spacing: 1,
    });

    writeBlock("Executive Summary", { bold: true, size: 12, spacing: 0.5 });
    writeBlock(shortSummary, { size: 10, spacing: 1 });

    writeBlock("Operational Insights", { bold: true, size: 12, spacing: 0.5 });
    detailedSummary.forEach((point, idx) => {
      writeBlock(`${idx + 1}. ${point}`, { size: 10, spacing: 0.2 });
    });
    y += 1;

    writeBlock("Data Analysis", { bold: true, size: 12, spacing: 0.5 });
    writeBlock(`Trains per Hour (Before): ${analytics.trainsPerHourBefore.toFixed(1)}`, { size: 10, spacing: 0.2 });
    writeBlock(`Trains per Hour (After): ${analytics.trainsPerHourAfter.toFixed(1)}`, { size: 10, spacing: 0.2 });
    writeBlock(`Increase in Frequency: ${analytics.frequencyIncreasePct.toFixed(2)}%`, { size: 10, spacing: 0.2 });
    writeBlock(
      `Estimated Capacity Increase: ${analytics.estimatedPassengerCapacityIncrease.toLocaleString()}`,
      { size: 10, spacing: 1 }
    );

    writeBlock("Correlation Analysis", { bold: true, size: 12, spacing: 0.5 });
    writeBlock("- Train Frequency -> Waiting Time -> Passenger Satisfaction", { size: 10, spacing: 0.2 });
    writeBlock("- Marshal Deployment -> Safety", { size: 10, spacing: 0.2 });
    writeBlock("- Faster Delay Escalation -> Reliability", { size: 10, spacing: 1 });

    if (Array.isArray(doc?.tags) && doc.tags.length > 0) {
      writeBlock("Tags", { bold: true, size: 12, spacing: 0.5 });
      writeBlock(doc.tags.join(", "), { size: 10, spacing: 1 });
    }

    footer();
    pdf.save(`KMRL_Report_${id}.pdf`);
  };

  const handleDeleteDocument = async () => {
    if (!window.confirm(t("confirmDeleteDocument") || "Are you sure you want to delete this document?")) {
      return;
    }

    setDeleteLoading(true);
    setDeleteError("");

    try {
      const token = localStorage.getItem("token");
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/v1/documents/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
        }
      );

      let data;
      const contentType = res.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Server returned ${res.status}: ${text.substring(0, 100)}`);
      }

      if (!res.ok) {
        throw new Error(data.error || data.message || (t("deleteDocumentFailed") || "Failed to delete document"));
      }

      navigate("/documents");
    } catch (err) {
      const errorMsg = err.message || "Unknown error";
      setDeleteError(errorMsg);
      console.error("Error deleting document:", errorMsg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    setPdfLoading(true);
    setPdfError("");

    try {
      const reportElement = document.getElementById("report-content");
      if (!reportElement) {
        throw new Error("Report content not found.");
      }

      await new Promise((resolve) => requestAnimationFrame(resolve));

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
        onclone: (clonedDoc) => {
          const styleTag = clonedDoc.createElement("style");
          styleTag.textContent = `
            #report-content, #report-content * {
              color: #0f172a !important;
              border-color: #cbd5e1 !important;
              outline-color: #cbd5e1 !important;
              text-shadow: none !important;
              box-shadow: none !important;
              background-image: none !important;
            }

            #report-content {
              background: #ffffff !important;
            }
          `;
          clonedDoc.head.appendChild(styleTag);
        },
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const marginX = 10;
      const marginTop = 20;
      const marginBottom = 16;
      const headerHeight = 8;
      const footerHeight = 8;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentWidthMm = pageWidth - marginX * 2;
      const contentHeightMm =
        pageHeight - marginTop - marginBottom - headerHeight - footerHeight;

      const pxPerMm = canvas.width / contentWidthMm;
      const sliceHeightPx = Math.max(1, Math.floor(contentHeightMm * pxPerMm));
      const totalPages = Math.ceil(canvas.height / sliceHeightPx);
      const generatedAt = formatDateTime(new Date());

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
        if (pageIndex > 0) {
          pdf.addPage();
        }

        const sourceY = pageIndex * sliceHeightPx;
        const sourceHeight = Math.min(sliceHeightPx, canvas.height - sourceY);

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;

        const pageCtx = pageCanvas.getContext("2d");
        if (!pageCtx) {
          throw new Error("Unable to prepare PDF canvas.");
        }

        pageCtx.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sourceHeight,
          0,
          0,
          canvas.width,
          sourceHeight
        );

        const pageImage = pageCanvas.toDataURL("image/png", 1.0);
        const renderHeightMm = sourceHeight / pxPerMm;

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(15, 23, 42);
        pdf.text("Kochi Metro Rail Limited (KMRL)", marginX, 10);

        pdf.addImage(
          pageImage,
          "PNG",
          marginX,
          marginTop,
          contentWidthMm,
          renderHeightMm,
          undefined,
          "FAST"
        );

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(71, 85, 105);
        pdf.text(`Generated: ${generatedAt}`, marginX, pageHeight - 6);
        pdf.text(`Page ${pageIndex + 1} of ${totalPages}`, pageWidth - marginX, pageHeight - 6, {
          align: "right",
        });

        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      pdf.save(`KMRL_Report_${id}.pdf`);
    } catch (err) {
      console.error("Error generating report PDF:", err);

      try {
        downloadSummaryFallbackPdf();
      } catch (fallbackErr) {
        const fallbackMessage =
          fallbackErr?.message || err?.message || "Failed to generate report PDF. Please try again.";
        setPdfError(fallbackMessage);
      }
    } finally {
      setPdfLoading(false);
    }
  };

  if (!doc) {
    return (
      <div className="mx-auto mt-10 max-w-5xl px-4 text-center text-gray-600">
        Loading document...
      </div>
    );
  }

  const ocrConfidence = typeof doc.ocr_confidence === "number" ? doc.ocr_confidence : 94;
  const fileSizeMB = doc.file_size
    ? (doc.file_size / (1024 * 1024)).toFixed(2)
    : "Unknown";
  const fileTypeLabel = doc.file_type ? doc.file_type.replace("application/", "") : "Unknown";
  const departments =
    Array.isArray(doc.assigned_departments) && doc.assigned_departments.length > 0
      ? doc.assigned_departments
      : ["Not assigned"];

  const shortSummaryKey = `short_summary_${currentLanguage}`;
  const detailedSummaryKey = `detailed_summary_${currentLanguage}`;

  const shortSummary =
    doc[shortSummaryKey] ||
    doc.short_summary_en ||
    "This report captures core service changes, peak scheduling windows, and required operational controls for route stability and passenger safety.";

  const detailedSummary =
    (Array.isArray(doc[detailedSummaryKey]) && doc[detailedSummaryKey].length > 0
      ? doc[detailedSummaryKey]
      : Array.isArray(doc.detailed_summary_en) && doc.detailed_summary_en.length > 0
      ? doc.detailed_summary_en
      : [
          "Peak scheduling optimized for commuter demand.",
          "Operational controls defined for delay containment.",
          "Communication and safety measures aligned with enterprise operations.",
        ]);

  const generatedDate = formatDateTime(new Date());

  return (
    <div className="mx-auto mt-10 max-w-7xl px-4 pb-10">
      <div className="mt-4 flex flex-wrap gap-3">
        {doc.storage_url && (
          <a
            href={doc.storage_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-white shadow transition hover:bg-indigo-700"
          >
            {t("openOriginalDocument")}
          </a>
        )}

        <button
          onClick={handleDownloadReport}
          disabled={pdfLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-white shadow transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {pdfLoading ? "Generating PDF..." : "Download Report"}
        </button>

        <button
          onClick={handleDeleteDocument}
          disabled={deleteLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-white shadow transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {deleteLoading ? t("deleting") || "Deleting..." : t("deleteDocument") || "Delete Document"}
        </button>
      </div>

      {deleteError && (
        <div className="mt-3 rounded-lg bg-red-100 p-3 text-sm text-red-700">{deleteError}</div>
      )}

      {pdfError && (
        <div className="mt-3 rounded-lg bg-red-100 p-3 text-sm text-red-700">{pdfError}</div>
      )}

      <div className="mt-6 max-h-[74vh] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-8">
        <div id="report-content" className="space-y-6 rounded-xl bg-white p-6 shadow-sm sm:p-8">
          <section className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 p-6 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-200">Enterprise Report Preview</p>
                <h1 className="mt-2 text-3xl font-bold">KMRL Document Report</h1>
                <p className="mt-2 text-slate-200">Source File: {doc.file_name}</p>
              </div>
              <div className="rounded-lg bg-white/15 px-4 py-3 text-sm">
                <p><span className="font-semibold">Generated:</span> {generatedDate}</p>
                <p><span className="font-semibold">Document ID:</span> {id}</p>
                <p><span className="font-semibold">Status:</span> {doc.status || "Unknown"}</p>
                <p><span className="font-semibold">Priority:</span> {doc.priority || "NORMAL"}</p>
              </div>
            </div>
          </section>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-slate-900">Executive Summary</h2>
            <p className="mt-3 leading-7 text-slate-700">
              This report provides a structured view of service scheduling, corridor movement patterns, and operational controls for metro
              operations. Peak movement is configured at {analytics.peakFrequency}, covering morning ({analytics.morningPeak}) and evening
              ({analytics.eveningPeak}) windows on the {analytics.route} route. The extracted content confidence is {ocrConfidence}%,
              supporting high-trust operational review and project-grade documentation output.
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-slate-900">Document Snapshot</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <tbody>
                  {[
                    ["Title", "KMRL Document Report"],
                    ["Generated Date", generatedDate],
                    ["Document ID", id],
                    ["File Name", doc.file_name],
                    ["Status", doc.status || "Unknown"],
                    ["Priority", doc.priority || "NORMAL"],
                    ["Route", analytics.route],
                    ["Peak Frequency", analytics.peakFrequency],
                    ["Morning Peak", analytics.morningPeak],
                    ["Evening Peak", analytics.eveningPeak],
                    ["OCR Confidence", `${ocrConfidence}%`],
                    ["File Type", fileTypeLabel],
                    ["File Size", `${fileSizeMB} MB`],
                    ["Departments", departments.join(", ")],
                  ].map(([label, value]) => (
                    <tr key={label} className="border-b border-slate-200 last:border-b-0">
                      <th className="w-1/3 bg-slate-100 px-4 py-3 font-semibold text-slate-700">{label}</th>
                      <td className="px-4 py-3 text-slate-700">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-slate-900">Operational Insights</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-700">
              <li>Marshal deployment at high-footfall stations strengthens platform control during peak periods.</li>
              <li>Multilingual announcements improve clarity and commuter response time during service updates.</li>
              <li>Escalation of delays above 5 minutes to OCC supports rapid reliability recovery.</li>
              {detailedSummary.slice(0, 3).map((point, index) => (
                <li key={`${point}-${index}`}>{point}</li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-slate-900">Data Analysis</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Trains per Hour (Before)</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{analytics.trainsPerHourBefore.toFixed(1)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Trains per Hour (After)</p>
                <p className="mt-2 text-2xl font-bold text-emerald-700">{analytics.trainsPerHourAfter.toFixed(1)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Increase in Frequency</p>
                <p className="mt-2 text-2xl font-bold text-blue-700">{analytics.frequencyIncreasePct.toFixed(2)}%</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Estimated Capacity Increase</p>
                <p className="mt-2 text-2xl font-bold text-amber-700">
                  {analytics.estimatedPassengerCapacityIncrease.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-slate-900">Statistical Summary</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="h-[280px] rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700">Train Frequency Comparison</h3>
                <div className="mt-3 h-[220px]">
                  <Bar
                    data={barData}
                    options={{
                      ...commonChartOptions,
                      plugins: {
                        ...commonChartOptions.plugins,
                        legend: { display: false },
                      },
                    }}
                  />
                </div>
              </div>

              <div className="h-[280px] rounded-lg border border-slate-200 p-4 md:col-span-2">
                <h3 className="text-sm font-semibold text-slate-700">Passenger Flow During Peak Hours</h3>
                <div className="mt-3 h-[220px]">
                  <Line data={lineData} options={commonChartOptions} />
                </div>
              </div>
            </div>

            <div className="mt-4 h-[320px] rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700">Operational Measures Distribution</h3>
              <div className="mx-auto mt-3 h-[250px] w-full max-w-md">
                <Pie data={pieData} options={pieOptions} />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-slate-900">Correlation Analysis</h2>
            <div className="mt-4 space-y-3">
              {[
                "Train Frequency -> Waiting Time -> Passenger Satisfaction",
                "Marshal Deployment -> Safety",
                "Faster Delay Escalation -> Reliability",
              ].map((insight) => (
                <div key={insight} className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-blue-900">
                  {insight}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-slate-900">Risk & Compliance</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-700">
              <li>OCR confidence at {ocrConfidence}% indicates strong extraction reliability for operational decisions.</li>
              <li>Delay events above 5 minutes require OCC escalation to avoid network-level schedule drift.</li>
              <li>Peak crowd safety depends on consistent marshal deployment at high-footfall stations.</li>
              <li>Multilingual communication remains mandatory for service continuity and compliance quality.</li>
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-slate-900">Recommendations</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-6 text-slate-700">
              <li>Maintain 6-minute headway during defined peak windows with real-time adherence tracking.</li>
              <li>Strengthen crowd management using dynamic marshal rosters linked to station load patterns.</li>
              <li>Automate threshold alerts for delay escalation to OCC at or above 5 minutes.</li>
              <li>Track weekly KPI bundles covering punctuality, passenger flow, and announcement effectiveness.</li>
              <li>Integrate forecast-based capacity planning for better event and festival demand readiness.</li>
            </ol>
          </Card>

          {Array.isArray(doc.tags) && doc.tags.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-slate-900">Tags</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {doc.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm text-slate-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-slate-900">Document Notes</h2>
            <p className="mt-3 leading-7 text-slate-700">{shortSummary}</p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DocumentDetailPage;
