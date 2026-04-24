// src/pages/SearchPage.jsx
/**
  SearchPage Overview
 
  This page provides full-text search functionality for documents.
  Users can:
   - Enter queries and search across document metadata, OCR text, summaries, etc.
   - View paginated/top-20 search results
   - See quick document previews through the DocumentCard component
 
  The page also stores the last search state (query + results + total count)
  in sessionStorage so that when a user navigates away and returns, their
  previous results are restored automatically.
 
  Key features:
   - Real-time search input with Enter key support
   - Persistent search state across navigation
   - Loading, error, no-results, and results states
 
  This page acts as the primary document discovery interface in the app.
 */


import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Search,
  ArrowLeft,
  Filter,
  Languages,
  Building2,
  FileText,
  Calendar,
  Clock3,
  BarChart3,
  SlidersHorizontal,
  Sparkles,
  Brain,
  Globe,
  Lightbulb,
} from "lucide-react";
import { useTranslation } from "../context/TranslationContext";
import { useNavigate } from "react-router-dom";

import Card from "@/components/ui/card";

// Key used to persist search state in session storage
const SEARCH_KEY = "searchState";

const SearchPage = () => {
  const { t, currentLanguage } = useTranslation();
  const navigate = useNavigate();
  // Query input
  const [query, setQuery] = useState("");
  const [searchDurationMs, setSearchDurationMs] = useState(0);

  const [filters, setFilters] = useState({
    language: "",
    department: "",
    documentType: "",
    dateRange: "",
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);

  // Search results
  const [results, setResults] = useState([]);
  // Number of results returned
  const [total, setTotal] = useState(0);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ---------------------------------------------------
     Restore previous search 
     This runs every time the user returns to this page.
     Ensures the user sees the same results as before.
     --------------------------------------------------- */
  useEffect(() => {
    const saved = sessionStorage.getItem(SEARCH_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setQuery(parsed.query || "");
      setResults(parsed.results || []);
      setTotal(parsed.total || 0);
      setFilters(
        parsed.filters || {
          language: "",
          department: "",
          documentType: "",
          dateRange: "",
        }
      );
      setSearchDurationMs(parsed.searchDurationMs || 0);
    } else {
      handleSearch();
    }
  }, []);

  const resolvedDateRange = useMemo(() => {
    if (!filters.dateRange) return { dateFrom: "", dateTo: "" };

    const now = new Date();
    const dateTo = now.toISOString().slice(0, 10);

    if (filters.dateRange === "today") {
      return { dateFrom: dateTo, dateTo };
    }

    if (filters.dateRange === "week") {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      return { dateFrom: start.toISOString().slice(0, 10), dateTo };
    }

    if (filters.dateRange === "month") {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      return { dateFrom: start.toISOString().slice(0, 10), dateTo };
    }

    return { dateFrom: "", dateTo: "" };
  }, [filters.dateRange]);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  /* ---------------------------------------------------
     Execute a new search
     - Validates empty query
     - Makes API request
     - Saves search state (so "Back" preserves results), Prakhar
     --------------------------------------------------- */
  const handleSearch = async () => {
    setLoading(true);
    setError("");
    const start = performance.now();

    try {
      const params = {
        q: query?.trim() || "",
        limit: 100,
      };

      if (filters.language) params.language = filters.language;
      if (filters.department) params.department = filters.department;
      if (filters.documentType) params.file_type = filters.documentType;
      if (resolvedDateRange.dateFrom) params.dateFrom = resolvedDateRange.dateFrom;
      if (resolvedDateRange.dateTo) params.dateTo = resolvedDateRange.dateTo;

      const res = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/api/v1/search`,
        { params }
      );

      const docs = res.data.documents || [];
      const duration = Math.max(0, Math.round(performance.now() - start));

      setResults(docs);
      setTotal(res.data.results || 0);
      setSearchDurationMs(duration);

      // Save search state so BACK returns the results
      sessionStorage.setItem(
        SEARCH_KEY,
        JSON.stringify({
          query,
          results: docs,
          total: res.data.results || 0,
          filters,
          searchDurationMs: duration,
        })
      );
    } catch (err) {
      console.error("Search failed:", err);
      setError(t("searchFailed") || "Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      language: "",
      department: "",
      documentType: "",
      dateRange: "",
    });
  };

  const getBadgeColor = (index) => {
    if (index % 4 === 0) return "bg-red-100 text-red-600";
    if (index % 4 === 1) return "bg-blue-100 text-blue-600";
    if (index % 4 === 2) return "bg-purple-100 text-purple-600";
    return "bg-emerald-100 text-emerald-600";
  };

  const getMatchScore = (doc, index) => {
    const confidence = Number(doc?.ocr_confidence || 0);
    if (confidence > 0) return Math.min(99, Math.max(75, Math.round(confidence)));
    return Math.max(70, 97 - index * 2);
  };


  /**
    Return JSX Structure Overview
   
    1. Search Bar
       - Input with search icon + Go button
       - Handles Enter key
   
    2. Loading Indicator
       - Appears while waiting for API response
   
    3. Error Display
       - Friendly error box when search fails
   
    4. Results Section
       - Shows a list of DocumentCard components
       - Includes result count and the query
   
    5. No Results State
       - If query is entered but results array is empty
   
    The layout centers everything and keeps it contained
    within a max-width for readability.
   */
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pb-8">
      <div className="pt-4 sm:pt-6 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="mt-2 text-4xl font-bold text-gray-900">
          {t("intelligentSearch") || "Intelligent Search"}
        </h1>
        <p className="text-gray-500 mt-1">
          {t("aiSearchDescription") || "AI-powered search across all documents with natural language processing"}
        </p>
      </div>

      <Card className="mb-6 p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-blue-100 text-blue-700">
                <Search className="w-5 h-5" />
              </span>
              {t("aiPoweredDocumentSearch") || "AI-Powered Document Search"}
            </h2>
            <p className="text-gray-500 mt-2">
              {t("searchDescription") || "Search across all documents with AI-powered semantic understanding and multilingual support"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            {t("advancedFilters") || "Advanced Filters"}
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder={
              t("searchPlaceholder") ||
              "Search documents, procedures, compliance requirements..."
            }
            className="w-full rounded-xl border border-gray-200 pl-11 pr-24 py-3 outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {t("search") || "Search"}
          </button>
        </div>

        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <label className="block">
              <span className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Languages className="w-4 h-4" />
                {t("language") || "Language"}
              </span>
              <select
                value={filters.language}
                onChange={(e) => handleFilterChange("language", e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 bg-white"
              >
                <option value="">{t("allLanguages") || "All Languages"}</option>
                <option value="english">English</option>
                <option value="malayalam">Malayalam</option>
                <option value="hindi">Hindi</option>
                <option value="tamil">Tamil</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {t("department") || "Department"}
              </span>
              <select
                value={filters.department}
                onChange={(e) => handleFilterChange("department", e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 bg-white"
              >
                <option value="">{t("allDepartments") || "All Departments"}</option>
                <option value="Operations">Operations</option>
                <option value="Safety">Safety</option>
                <option value="Legal">Legal</option>
                <option value="Finance">Finance</option>
                <option value="HR">HR</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {t("documentType") || "Document Type"}
              </span>
              <select
                value={filters.documentType}
                onChange={(e) => handleFilterChange("documentType", e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 bg-white"
              >
                <option value="">{t("allTypes") || "All Types"}</option>
                <option value="pdf">PDF</option>
                <option value="docx">DOCX</option>
                <option value="pptx">PPTX</option>
                <option value="xlsx">XLSX</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t("dateRange") || "Date Range"}
              </span>
              <select
                value={filters.dateRange}
                onChange={(e) => handleFilterChange("dateRange", e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 bg-white"
              >
                <option value="">{t("allDates") || "All Dates"}</option>
                <option value="today">{t("today") || "Today"}</option>
                <option value="week">{t("pastWeek") || "Past Week"}</option>
                <option value="month">{t("pastMonth") || "Past Month"}</option>
              </select>
            </label>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-1 text-blue-600">
            <Brain className="w-4 h-4" /> {t("aiUnderstanding") || "AI Understanding"}
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-600">
            <Globe className="w-4 h-4" /> {t("multilingual") || "Multilingual"}
          </span>
          <span className="inline-flex items-center gap-1 text-purple-600">
            <Sparkles className="w-4 h-4" /> {t("semanticSearch") || "Semantic Search"}
          </span>
          <span className="inline-flex items-center gap-1 text-orange-600">
            <Lightbulb className="w-4 h-4" /> {t("smartSuggestions") || "Smart Suggestions"}
          </span>

          <div className="ml-auto text-gray-500">
            {total} {t("resultsFound") || "results found"}
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {t("clearFilters") || "Clear all filters"}
          </button>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-center font-semibold">
          {error}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-4 font-semibold text-gray-900">
          {(t("searchResults") || "Search Results")} ({total})
        </h2>
        <div className="flex items-center gap-3 text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="w-4 h-4" />
            {(t("searchCompleted") || "Search completed")} {(t("in") || "in")} {searchDurationMs}ms
          </span>
          <button type="button" className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">
            <BarChart3 className="w-4 h-4" /> {t("analytics") || "Analytics"}
          </button>
          <button type="button" className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">
            <SlidersHorizontal className="w-4 h-4" /> {t("sort") || "Sort"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center mt-10 text-gray-600">{t("searching") || "Searching..."}</div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="mt-4 space-y-4">
          {results.map((doc, index) => {
            const score = getMatchScore(doc, index);
            const tagColor = getBadgeColor(index);

            return (
              <Card
                key={doc.id}
                className="p-5 rounded-2xl border border-gray-200 hover:shadow-md transition cursor-pointer"
                onClick={() => navigate(`/documents/${doc.id}`)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{doc.file_name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${tagColor}`}>High</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {(doc.language_detected || "English").toString()}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {doc.file_type?.toUpperCase() || "Document"}
                      </span>
                    </div>

                    <div className="mt-2 text-sm text-gray-500 flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {doc.assigned_departments?.[0] || "General"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="mt-2 text-gray-700 line-clamp-2">
                      {doc[`short_summary_${currentLanguage}`] || doc.short_summary_en || doc.short_summary_ml || doc.short_summary_hi || doc.short_summary_ta || "No summary available."}
                    </p>
                  </div>

                  <div className="text-right shrink-0 min-w-[75px]">
                    <p className="text-sm text-gray-500">{t("relevance") || "Relevance"}</p>
                    <p className="text-4 font-bold text-blue-600">{score}%</p>
                    <p className="text-xs text-gray-400">{t("aiMatch") || "AI Match"}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* No Results */}
      {!loading && results.length === 0 && !error && (
        <div className="text-center mt-10 text-gray-500">
          {t("noResultsFound") || "No results found."}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
