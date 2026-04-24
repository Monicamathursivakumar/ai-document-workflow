import React, { useEffect, useState } from "react";
import { X, Download, CheckCircle } from "lucide-react";

const DocumentSummaryViewer = ({ document, isOpen, onClose, userRole }) => {
  const [activeTab, setActiveTab] = useState("summary");
  const [summaryData, setStummaryData] = useState(null);
  const [traceabilityData, setTraceabilityData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isReviewed, setIsReviewed] = useState(false);
  const token = localStorage.getItem("token");
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    if (isOpen && document) {
      fetchSummaryData();
      markDocumentViewed();
    }
  }, [isOpen, document]);

  const fetchSummaryData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/v1/routing/documents/${document.id}/summary?role=${userRole}`,
        { headers: authHeaders }
      );
      if (response.ok) {
        const data = await response.json();
        setStummaryData(data);
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTraceabilityData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/v1/routing/documents/${document.id}/traceability`,
        { headers: authHeaders }
      );
      if (response.ok) {
        const data = await response.json();
        setTraceabilityData(data);
        setActiveTab("traceability");
      }
    } catch (error) {
      console.error("Error fetching traceability:", error);
    } finally {
      setLoading(false);
    }
  };

  const markDocumentViewed = async () => {
    try {
      await fetch(`/api/v1/routing/documents/${document.id}/mark-viewed`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ role: userRole }),
      });
    } catch (error) {
      console.error("Error marking document viewed:", error);
    }
  };

  const markDocumentReviewed = async () => {
    try {
      const response = await fetch(
        `/api/v1/routing/documents/${document.id}/mark-reviewed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ role: userRole }),
        }
      );
      if (response.ok) {
        setIsReviewed(true);
      }
    } catch (error) {
      console.error("Error marking document reviewed:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-11/12 h-5/6 max-w-4xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {document?.title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 p-4 border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              activeTab === "summary"
                ? "bg-teal-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => {
              fetchTraceabilityData();
            }}
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              activeTab === "traceability"
                ? "bg-teal-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Traceability
          </button>
          <button
            onClick={() => setActiveTab("original")}
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              activeTab === "original"
                ? "bg-teal-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Original
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "summary" && (
            <div className="space-y-6">
              {summaryData && (
                <>
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">
                      Role-Specific Summary
                    </h3>
                    <p className="text-blue-800 mb-4">
                      {summaryData.role_summary?.short ||
                        "Summary not available"}
                    </p>
                    {summaryData.role_summary?.detailed && (
                      <div className="mt-4 space-y-2">
                        <h4 className="font-semibold text-gray-900">
                          Details:
                        </h4>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                          {summaryData.role_summary.detailed.map(
                            (item, idx) => (
                              <li key={idx}>{item}</li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Urgency Level
                      </p>
                      <p
                        className={`font-bold text-lg ${
                          document.urgency_level === "CRITICAL"
                            ? "text-red-600"
                            : document.urgency_level === "TIME_BOUND"
                            ? "text-orange-600"
                            : "text-blue-600"
                        }`}
                      >
                        {document.urgency_level}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Compliance Critical
                      </p>
                      <p className="font-bold text-lg">
                        {document.compliance_critical ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "traceability" && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <h3 className="font-semibold text-yellow-900 mb-4">
                  Document Processing Audit Trail
                </h3>
                {traceabilityData ? (
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Source Info</p>
                      <p className="text-gray-600">
                        URL: {traceabilityData.source_url}
                      </p>
                      <p className="text-gray-600">
                        Size: {traceabilityData.file_size} bytes
                      </p>
                      <p className="text-gray-600">
                        Upload Date:{" "}
                        {new Date(
                          traceabilityData.upload_date
                        ).toLocaleDateString()}
                      </p>
                    </div>

                    <div>
                      <p className="font-medium text-gray-700">AI Analysis</p>
                      <p className="text-gray-600">
                        Model: {traceabilityData.ai_model}
                      </p>
                      <p className="text-gray-600">
                        Tokens Used: {traceabilityData.tokens_used} (Input:{" "}
                        {traceabilityData.input_tokens}, Output:{" "}
                        {traceabilityData.output_tokens})
                      </p>
                    </div>

                    <div>
                      <p className="font-medium text-gray-700">
                        OCR Confidence
                      </p>
                      <p className="text-gray-600">
                        {traceabilityData.ocr_confidence}%
                      </p>
                    </div>

                    <div>
                      <p className="font-medium text-gray-700">
                        Language Detected
                      </p>
                      <p className="text-gray-600">
                        {traceabilityData.language_detected}
                      </p>
                    </div>

                    <div>
                      <p className="font-medium text-gray-700">OCR Text Sample</p>
                      <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                        {traceabilityData.ocr_text_sample
                          ?.substring(0, 1000)
                          .concat("...")}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <p className="text-yellow-800">
                    Loading traceability data...
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === "original" && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 mb-4">
                  Access the original document stored in cloud storage:
                </p>
                <a
                  href={document.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  <Download size={18} />
                  Download Original PDF
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {isReviewed && (
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <CheckCircle size={18} />
                Marked as Reviewed
              </div>
            )}
          </div>
          <button
            onClick={markDocumentReviewed}
            disabled={isReviewed}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isReviewed
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {isReviewed ? "Reviewed" : "Mark as Reviewed"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentSummaryViewer;
