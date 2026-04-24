// src/pages/AllDocumentsPage.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Loader2,
  Cpu,
  FileCheck,
  AlertTriangle,
  Upload,
  Brain,
  ShieldCheck,
  Database,
} from "lucide-react";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import { useTranslation } from "../context/TranslationContext";
import { useNavigate } from "react-router-dom";

const AllDocumentsPage = () => {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { t, currentLanguage } = useTranslation();

  const STATUS_PROGRESS = {
    UPLOADED: 10,
    PREPROCESSING: 25,
    PROCESSING_OCR: 50,
    PROCESSING_LLM: 80,
    COMPLETED: 100,
    FAILED: 100,
    UNREADABLE: 100,
  };

  const STATUS_LABEL = {
    UPLOADED: t("uploadedWaiting"),
    PREPROCESSING: t("preparingDocument"),
    PROCESSING_OCR: t("extractingText"),
    PROCESSING_LLM: t("analyzingContent"),
    COMPLETED: t("processed"),
    FAILED: t("processingFailed"),
    UNREADABLE: t("fileUnreadable"),
  };

  const STATUS_ICON = (status) => {
    switch (status) {
      case "PROCESSING_OCR":
        return <Cpu className="w-5 h-5" />;
      case "PROCESSING_LLM":
        return <Loader2 className="w-5 h-5 animate-spin" />;
      case "COMPLETED":
        return <FileCheck className="w-5 h-5" />;
      case "FAILED":
      case "UNREADABLE":
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <UploadCloud className="w-5 h-5" />;
    }
  };

  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedSource, setSelectedSource] = useState("all");

  const [documentsData, setDocumentsData] = useState({
    sources: [
      {
        name: "Manual Upload",
        type: "manual",
        documents: [],
      },
    ],
    recentActivity: [],
  });

  const [processingMap, setProcessingMap] = useState({});
  const [stats, setStats] = useState({
    total: 1200,
    pending: 20,
    critical: 0,
    completed: 1185,
    processing: 0,
  });

  // Baseline offset for total documents (1200 by default)
  const BASELINE_TOTAL = 1200;

  // Helper function to get summary in current language
  const getSummaryByLanguage = (doc, lang) => {
    const shortKey = `short_summary_${lang}`;
    const detailKey = `detailed_summary_${lang}`;
    return {
      title: doc[shortKey] || doc.short_summary_en || "AI Summary",
      keyPoints: doc[detailKey] || doc.detailed_summary_en || [],
    };
  };

  const getPersistedIntegrationDocs = () => {
    try {
      const userId = localStorage.getItem("userId") || "guest";
      const raw = localStorage.getItem(`kmrl_integrations_${userId}`);
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      const docsByType = parsed?.docsByType || {};

      return Object.entries(docsByType).flatMap(([type, docs]) => {
        if (!Array.isArray(docs)) return [];
        return docs.map((doc, index) => ({
          id: `integration-${type}-${doc.id || index}`,
          title: doc.title || `Imported ${type} document`,
          date: new Date().toLocaleDateString(),
          department: "Integration",
          uploadedDate: new Date().toLocaleDateString(),
          aiSummary: {
            title: doc.title || `Imported ${type} document`,
            keyPoints: [doc.summary || "Imported from integration source"],
          },
          status: "COMPLETED",
          priority: "NORMAL",
          raw: {
            id: `integration-${type}-${doc.id || index}`,
            file_name: doc.title || `Imported ${type} document`,
            short_summary_en: doc.summary || "Imported from integration source",
            detailed_summary_en: [doc.summary || "Imported from integration source"],
            assigned_departments: ["Integration"],
            status: "COMPLETED",
            priority: "NORMAL",
            createdAt: new Date().toISOString(),
            storage_url: null,
          },
        }));
      });
    } catch (error) {
      console.error("Failed to read persisted integration docs:", error);
      return [];
    }
  };

  useEffect(() => {
    const fetchAllDocuments = async () => {
      try {
        const token = localStorage.getItem("token");
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/api/v1/documents?limit=9999`,
          { headers: authHeaders }
        );
        const data = await res.json();

        if (!data?.documents) return;

        const mappedDocs = data.documents
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .map((doc) => ({
            id: doc.id,
            title: doc.file_name,
            date: new Date(doc.createdAt).toLocaleDateString(),
            department: doc.assigned_departments?.[0] || "General",
            uploadedDate: new Date(doc.createdAt).toLocaleDateString(),
            aiSummary: getSummaryByLanguage(doc, currentLanguage),
            status: doc.status,
            priority: doc.priority,
            raw: doc,
          }));

        const integrationDocs = getPersistedIntegrationDocs();
        const combinedDocs = [...integrationDocs, ...mappedDocs].sort(
          (a, b) => new Date(b.raw?.createdAt || b.uploadedDate) - new Date(a.raw?.createdAt || a.uploadedDate)
        );

        // Calculate stats (with baseline offset for total)
        const actualTotal = combinedDocs.length;
        const total = BASELINE_TOTAL + actualTotal;
        const actualCompleted = combinedDocs.filter(d => d.status === "COMPLETED").length;
        const actualProcessing = combinedDocs.filter(d => 
          ["UPLOADED", "PREPROCESSING", "PROCESSING_OCR", "PROCESSING_LLM", "SUMMARIZING"].includes(d.status)
        ).length;
        const actualPending = combinedDocs.filter(d => 
          ["FAILED", "UNREADABLE"].includes(d.status)
        ).length;
        const critical = combinedDocs.filter(d => 
          ["CRITICAL", "HIGH"].includes(d.priority)
        ).length;

        // Apply baseline offsets to stats (baseline values + actual counts)
        const completed = 1185 + actualCompleted;
        const pending = 20 + actualPending;
        const processing = actualProcessing;

        setStats({ total, pending, critical, completed, processing });

        setDocumentsData((prev) => ({
          ...prev,
          sources: [
            {
              ...prev.sources[0],
              documents: mappedDocs,
            },
            {
              name: "Integration Imports",
              type: "integration",
              documents: integrationDocs,
            },
          ],
          recentActivity: combinedDocs
            .slice(0, 5)
            .map((doc) => ({ 
              title: doc.title, 
              date: doc.uploadedDate,
              id: doc.id,
            })),
        }));
      } catch (err) {
        console.error("Error fetching all documents:", err);
      }
    };

    fetchAllDocuments();

    const lastId = localStorage.getItem("lastUploadedDocumentId");
    if (lastId) fetchLastUploaded(lastId);
  }, [currentLanguage]);

  const fetchLastUploaded = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/v1/documents/${id}`,
        { headers: authHeaders }
      );
      const data = await res.json();
      const doc = data.document;
      if (!doc) return;

      const mappedDoc = {
        id: doc.id,
        title: doc.file_name,
        date: new Date(doc.createdAt).toLocaleDateString(),
        department: doc.assigned_departments?.[0] || "General",
        uploadedDate: new Date(doc.createdAt).toLocaleDateString(),
        aiSummary: {
          ...getSummaryByLanguage(doc, currentLanguage),
          visiblePoints: 3,
        },
        raw: doc,
      };

      setDocumentsData((prev) => ({
        ...prev,
        sources: [{ ...prev.sources[0], documents: [mappedDoc] }],
      }));
    } catch (err) {
      console.error("Error fetching last uploaded document:", err);
    }
  };

  const addFinalDocument = (doc) => {
    localStorage.setItem("lastUploadedDocumentId", doc.id);

    const newDocument = {
      id: doc.id,
      title: doc.file_name,
      date: new Date(doc.createdAt).toLocaleDateString(),
      department: doc.assigned_departments?.[0] || "General",
      description: doc[`short_summary_${currentLanguage}`] || doc.short_summary_en || "AI processed document",
      uploadedDate: new Date(doc.createdAt).toLocaleDateString(),
      aiSummary: {
        ...getSummaryByLanguage(doc, currentLanguage),
        visiblePoints: 3,
      },
      raw: doc,
    };

    setDocumentsData((prev) => {
      const updatedSources = prev.sources.map((src) =>
        src.type === "manual"
          ? {
              ...src,
              documents: [newDocument, ...src.documents],
            }
          : src
      );

      return {
        ...prev,
        sources: updatedSources,
        recentActivity: [
          { title: newDocument.title, date: newDocument.uploadedDate },
          ...prev.recentActivity,
        ].slice(0, 5),
      };
    });

    // Increment stats when document is completed
    setStats((prev) => {
      const newStats = { ...prev };
      newStats.total += 1; // Increment total count
      newStats.completed += 1; // New document is completed
      
      // Decrement processing if it was being tracked
      if (newStats.processing > 0) {
        newStats.processing -= 1;
      }
      
      // Update critical count if applicable
      if (["CRITICAL", "HIGH"].includes(doc.priority)) {
        newStats.critical += 1;
      }
      
      return newStats;
    });
  };

  const startPolling = (documentId, filename) => {
    setProcessingMap((m) => ({
      ...m,
      [documentId]: {
        status: "UPLOADED",
        progress: STATUS_PROGRESS["UPLOADED"],
        file_name: filename,
        uploadedAt: new Date().toLocaleTimeString(),
      },
    }));

    // Increment processing and total stats when document upload starts
    setStats((prev) => ({
      ...prev,
      total: prev.total + 1,
      processing: prev.processing + 1,
    }));

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/api/v1/documents/${documentId}`
        );
        const payload = await res.json();
        const doc = payload.document;
        if (!doc) return;

        const status = doc.status;
        const progress = STATUS_PROGRESS[status] ?? 0;

        setProcessingMap((m) => ({
          ...m,
          [documentId]: {
            ...(m[documentId] || {}),
            status,
            progress,
            file_name: doc.file_name || filename,
            uploadedAt:
              m[documentId]?.uploadedAt || new Date().toLocaleTimeString(),
            raw: doc,
          },
        }));

        if (["COMPLETED", "FAILED", "UNREADABLE"].includes(status)) {
          clearInterval(interval);

          if (status === "COMPLETED") {
            addFinalDocument(doc);

            setTimeout(() => {
              setProcessingMap((m) => {
                const clone = { ...m };
                delete clone[documentId];
                return clone;
              });
            }, 1200);
          } else {
            // Handle failure case - increment pending, decrement processing
            setStats((prev) => ({
              ...prev,
              processing: Math.max(0, prev.processing - 1),
              pending: prev.pending + 1,
            }));

            setTimeout(() => {
              setProcessingMap((m) => {
                const clone = { ...m };
                delete clone[documentId];
                return clone;
              });
            }, 7000);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2500);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0] || event.dataTransfer?.files?.[0];
    if (!file) return;

    const allowed = [".pdf", ".doc", ".docx", ".txt", ".xlsx", ".xls"];
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setUploadMessage("❌ Unsupported file type.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadMessage("❌ File must be less than 50MB.");
      return;
    }

    setIsUploading(true);
    setUploadMessage("⏳ Uploading & starting processing...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      
      // Get employeeId from localStorage instead of hardcoding
      const employeeId = localStorage.getItem("userId");
      const token = localStorage.getItem("token");
      
      if (!employeeId || !token) {
        setUploadMessage("❌ User not authenticated. Please log in again.");
        setIsUploading(false);
        return;
      }
      
      formData.append("employeeId", employeeId);

      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/v1/process-document`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await res.json();
      const documentId = data.document_id || data.document?.id;

      if (!documentId) {
        const doc = data.document || data;
        if (doc?.id) addFinalDocument(doc);
      } else {
        startPolling(documentId, file.name);
      }

      setUploadMessage("⏳ Processing started. Showing live status...");
    } catch (err) {
      console.error(err);
      setUploadMessage("❌ Upload or backend error. See console.");
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadMessage(""), 4000);
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e);
  };

  const allDocuments = documentsData.sources.flatMap((s) => s.documents);

  const filteredDocuments =
    selectedSource === "all"
      ? allDocuments
      : documentsData.sources.find((s) => s.type === selectedSource)
          ?.documents || [];

  // Processing stages info
  const getProcessingStages = (status) => {
    const stages = [
      { name: "File Upload", key: "UPLOADED", icon: Upload, desc: "Uploading document to server" },
      { name: "OCR Processing", key: "PROCESSING_OCR", icon: Cpu, desc: "Extracting text from document" },
      { name: "AI Analysis", key: "PROCESSING_LLM", icon: Brain, desc: "Analyzing content with AI" },
      { name: "Safety Check", key: "SAFETY_CHECK", icon: ShieldCheck, desc: "Checking for safety and compliance issues" },
      { name: "Knowledge Indexing", key: "COMPLETED", icon: Database, desc: "Indexing document in knowledge graph" },
    ];

    const currentIndex = stages.findIndex(s => s.key === status);
    return stages.map((stage, idx) => ({
      ...stage,
      status: idx < currentIndex ? "completed" : idx === currentIndex ? "processing" : "pending",
    }));
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 text-center">
            {t("documentUploadProcessing")}
          </h1>
          <div className="flex gap-6 mt-4 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                1
              </div>
              <span className="text-sm font-medium">{t("ocrTextExtraction")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                2
              </div>
              <span className="text-sm font-medium">{t("autoClassification")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                3
              </div>
              <span className="text-sm font-medium">{t("aiSummarization")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                4
              </div>
              <span className="text-sm font-medium">{t("smartRouting")}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex gap-6 p-6 overflow-hidden">
          {/* Center Content */}
          <div className="flex-1 space-y-6 overflow-y-auto pr-4">
                  {/* Upload Area */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.xlsx,.xls"
                    onChange={handleFileUpload}
                  />

                  {Object.keys(processingMap).length === 0 && (
                    <div
                      className={`p-12 border-2 border-dashed rounded-xl text-center cursor-pointer transition ${
                        isDragging
                          ? "bg-blue-50 border-blue-400"
                          : "bg-white border-gray-300 hover:border-blue-400"
                      }`}
                      onClick={handleUploadClick}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <UploadCloud className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <p className="text-lg font-medium text-gray-700">
                        {isUploading ? t("uploadingDocument") : t("dropFilesOrClick")}
                      </p>
                      <p className="text-gray-500 text-sm mt-2">PDF, DOCX, XLSX {t("supported")}</p>
                    </div>
                  )}

                  {uploadMessage && (
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-sm">
                      {uploadMessage}
                    </div>
                  )}

                  {/* Processing Cards */}
                  {Object.entries(processingMap).map(([docId, p]) => {
                    const stages = getProcessingStages(p.status);
                    return (
                      <Card
                        key={docId}
                        className="p-6 bg-white border border-gray-200"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <FileText className="w-6 h-6 text-blue-600" />
                            <div>
                              <h3 className="font-semibold text-gray-900">{p.file_name}</h3>
                              <p className="text-sm text-gray-500">ID: doc_{docId.substring(0, 10)}</p>
                            </div>
                          </div>
                          <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                            {p.uploadedAt}
                          </div>
                        </div>

                        {/* Overall Progress */}
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">{t("overallProgress")}</span>
                            <span className="text-sm font-bold text-gray-900">{p.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-2 bg-blue-600 rounded-full transition-all duration-500"
                              style={{ width: `${p.progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Processing Stages */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">{t("processingStages")}</h4>
                          {stages.map((stage, idx) => {
                            const Icon = stage.icon;
                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                      stage.status === "completed"
                                        ? "bg-green-100 text-green-600"
                                        : stage.status === "processing"
                                        ? "bg-blue-100 text-blue-600"
                                        : "bg-gray-200 text-gray-400"
                                    }`}
                                  >
                                    {stage.status === "completed" ? (
                                      <CheckCircle2 className="w-5 h-5" />
                                    ) : (
                                      <Icon className={`w-5 h-5 ${stage.status === "processing" ? "animate-pulse" : ""}`} />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{stage.name}</p>
                                    <p className="text-xs text-gray-500">{stage.desc}</p>
                                  </div>
                                </div>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    stage.status === "completed"
                                      ? "bg-green-100 text-green-700"
                                      : stage.status === "processing"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  {stage.status === "completed" ? "completed" : stage.status === "processing" ? "processing" : "pending"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    );
                  })}
            </div>

            {/* RIGHT SIDEBAR */}
            <div className="w-80 space-y-6 shrink-0">
              {/* Quick Stats */}
              <Card className="p-6 bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("quickStats")}</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">{t("totalDocuments")}</span>
                    <span className="font-bold text-gray-900">{stats.total}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">{t("pendingReview")}</span>
                    <span className="font-bold text-red-600">{stats.pending}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600">{t("criticalAlerts")}</span>
                    <span className="font-bold text-red-600">{stats.critical}</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-3xl font-bold text-blue-600">{stats.completed}</div>
                      <div className="text-xs text-gray-500 mt-2 text-center whitespace-normal">{t("completed")}</div>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-3xl font-bold text-orange-600">{stats.processing}</div>
                      <div className="text-xs text-gray-500 mt-2 text-center whitespace-normal">{t("processing")}</div>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-3xl font-bold text-gray-600">{stats.pending}</div>
                      <div className="text-xs text-gray-500 mt-2 text-center whitespace-normal">{t("pending")}</div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Recently Uploaded */}
              <Card className="p-6 bg-white">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{t("recentlyUploaded")}</h3>
                </div>
                <div className="space-y-3">
                  {documentsData.recentActivity.map((doc, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition border border-gray-200"
                      onClick={() => navigate(`/documents/${doc.id}`)}
                    >
                      <p className="font-medium text-gray-900 text-sm wrap-break-word mb-2">{doc.title}</p>
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">ID: {String(doc.id).substring(0, 12)}...</div>
                        <div className="text-xs text-gray-500">{doc.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AllDocumentsPage;
