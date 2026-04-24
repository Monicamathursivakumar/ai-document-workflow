import React, { useEffect, useState } from "react";
import { FileText, Filter } from "lucide-react";

const RoleBasedDocumentFeed = ({ userRole, onSelectDocument }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState("All");

  useEffect(() => {
    fetchDocuments();
  }, [userRole, priorityFilter]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        role: userRole,
        ...(priorityFilter !== "All" && { priority: priorityFilter }),
      });

      const response = await fetch(`/api/v1/routing/my-documents?${params}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "CRITICAL":
        return "border-l-4 border-red-600 bg-red-50";
      case "TIME_BOUND":
        return "border-l-4 border-orange-600 bg-orange-50";
      case "INFORMATIONAL":
        return "border-l-4 border-blue-600 bg-blue-50";
      default:
        return "border-l-4 border-gray-400";
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "CRITICAL":
        return "🔴";
      case "TIME_BOUND":
        return "🟠";
      case "INFORMATIONAL":
        return "🔵";
      default:
        return "⚪";
    }
  };

  if (loading) {
    return <div className="p-4 text-gray-500">Loading documents...</div>;
  }

  if (documents.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <FileText className="mx-auto mb-4 text-gray-400" size={48} />
        <p>No documents routed to your role yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Filter Bar */}
      <div className="flex items-center gap-2 mb-4">
        <Filter size={20} className="text-gray-600" />
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="All">All Priorities</option>
          <option value="CRITICAL">Critical Only</option>
          <option value="TIME_BOUND">Time-Bound</option>
          <option value="INFORMATIONAL">Informational</option>
        </select>
      </div>

      {/* Document Grid */}
      <div className="space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className={`${getPriorityColor(
              doc.urgency_level
            )} p-4 rounded-lg cursor-pointer hover:shadow-lg transition-shadow`}
            onClick={() => onSelectDocument(doc)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">
                    {getPriorityIcon(doc.urgency_level)}
                  </span>
                  <h3 className="font-semibold text-gray-900 break-words">
                    {doc.title}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Type: <span className="font-medium">{doc.document_type}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Uploaded:{" "}
                  {new Date(doc.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                {doc.role_summaries && doc.role_summaries[userRole] && (
                  <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                    {doc.role_summaries[userRole].short}
                  </p>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDocument(doc);
                }}
                className="ml-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
              >
                View Summary
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoleBasedDocumentFeed;
