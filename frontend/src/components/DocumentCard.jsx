/** 
  This file defines the DocumentCard component, a reusable UI card used to
  display a document’s key information in list or grid views. Each card shows
  the document’s file name, upload date, short summary, and processing status.
 
  The component ensures graceful handling of incomplete or inconsistent API
  data by applying fallback logic for summaries, dates, and status fields.
 
  Interaction behavior is flexible:
   - If a parent provides an onClick handler, the card executes that callback.
   - Otherwise, it navigates the user to the document’s detail page using React Router.
 
  The UI emphasizes clean layout, hover effects, and readability, making the
  component suitable for dashboards, document libraries, and search results.
 
  Overall, this page provides a polished, reliable, and adaptable presentation
  layer for individual document items within the application.
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { useTranslation } from "../context/TranslationContext";

/**
 * DocumentCard Component
 *
 * Displays a single document card UI, showing:
 * - file name
 * - upload date
 * - summary
 * - status
 *
 * Clicking the card:
 * - Either triggers a custom onClick callback (if passed)
 * - Or navigates to the document details page
 *
 * Props:
 *  - doc       : Object containing document metadata
 *  - compact   : Enables smaller layout (not currently used)
 *  - onClick   : Optional custom click handler
 */
const DocumentCard = ({ doc, compact = false, onClick }) => {
  const navigate = useNavigate();
  const { currentLanguage } = useTranslation();

  /**
   * Handle card click:
   * If parent component provided an onClick callback → use that
   * Else → navigate to the document details screen
   *
   * IMPORTANT: Ensures this component is reusable in different contexts.
   */
  const handleClick = () => {
    if (onClick) return onClick(doc);
    navigate(`/documents/${doc.id}`);
  };

  /**
   * Compute upload date from available timestamp fields.
   * Fallback ensures support for inconsistent API responses.
   */
  const uploadDate = new Date(
    doc.createdAt || doc.date
  ).toLocaleDateString();

  /**
   * Determine the best possible summary.
   * Priority order:
   * 1. short_summary_en
   * 2. short_summary
   * 3. AI-generated summary title
   * 4. Fallback: "No summary available"
   *
   * IMPORTANT: Prevents blank UI when certain fields are missing.
   */
  const summary =
    doc[`short_summary_${currentLanguage}`] ||
    doc.short_summary_en ||
    doc.short_summary_ml ||
    doc.short_summary_hi ||
    doc.short_summary_ta ||
    doc.short_summary ||
    doc.aiSummary?.title ||
    "No summary available";

  return (
    <div
      onClick={handleClick}
      className="
        group
        p-6 
        rounded-2xl 
        border border-gray-200 
        bg-white 
        hover:shadow-[0_6px_18px_rgba(0,0,0,0.06)]
        hover:border-indigo-300
        cursor-pointer 
        transition-all 
        duration-200
      "
    >
      {/* Header Section: Icon + File Name + Date */}
      <div className="flex items-center gap-3 mb-3">
        {/* File icon visual container */}
        <div className="p-3 rounded-xl bg-indigo-100">
          <FileText className="w-6 h-6 text-indigo-600" />
        </div>

        {/* Document Title + Upload Date */}
        <div>
          <h3
            className="
              text-xl font-semibold text-gray-900 
              group-hover:text-indigo-600 
              transition-colors
            "
          >
            {/* IMPORTANT: Displaying original file name */}
            {doc.file_name}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Uploaded on {uploadDate}
          </p>
        </div>
      </div>

      {/* Body: Summary (clamped to 2 lines) */}
      <p className="text-gray-700 text-sm leading-relaxed line-clamp-2">
        {summary}
      </p>

      {/* Footer: Document Status + Date */}
      <p className="text-xs font-semibold text-gray-400 mt-4">
        {/* If status missing → show "COMPLETED" by default */}
        {doc.status?.toUpperCase() || "COMPLETED"} • {uploadDate}
      </p>
    </div>
  );
};

export default DocumentCard;
