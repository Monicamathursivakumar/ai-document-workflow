import React, { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const { role } = useAuth();
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        setMessage("");
      }
    }
  };

  const validateFile = (file) => {
    const validTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'image/jpeg',
      'image/png',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!validTypes.includes(file.type)) {
      setMessage("❌ Invalid file type. Please upload PDF, Word, Excel, text, or image files.");
      return false;
    }
    
    return true;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && validateFile(droppedFile)) {
      setFile(droppedFile);
      setMessage("");
    }
  };

  const simulateProgress = () => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      setUploadProgress(progress);
    }, 200);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("❌ Please select a file first!");
      return;
    }

    setIsUploading(true);
    setMessage("⏳ Processing your document...");
    setUploadProgress(0);
    simulateProgress();

    const formData = new FormData();
    formData.append("file", file);
    
    // Get employeeId from localStorage (stored during login)
    const employeeId = localStorage.getItem("userId");
    console.log("Employee ID from localStorage:", employeeId);
    
    if (!employeeId) {
      setMessage("❌ User ID not found. Please log in again.");
      setIsUploading(false);
      return;
    }
    
    formData.append("employeeId", employeeId);

    try {
      const token = localStorage.getItem("token");
      const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";
      const uploadUrl = `${serverUrl}/api/v1/process-document`;
      
      console.log("Upload URL:", uploadUrl);
      console.log("Token:", token ? "Present" : "Missing");
      console.log("FormData keys:", Array.from(formData.keys()));
      
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      console.log("Response status:", response.status);
      
      const responseText = await response.text();
      console.log("Response text:", responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse JSON:", e);
        throw new Error(`Invalid response from server: ${responseText}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Upload failed with status ${response.status}`);
      }

      if (data.success) {
        const successMessage = data.message || "Document uploaded and processing started!";
        setMessage(`✅ ${successMessage}`);

        const payload = data.document || data.data || {};
        const metadata = payload.metadata || data.data?.metadata || {};
        const contentAnalysis = payload.summary || data.data?.content_analysis || {};

        console.log("Upload response payload:", payload);
        console.log("Upload metadata:", metadata);
        console.log("Upload analysis:", contentAnalysis);

        setTimeout(() => {
          setFile(null);
          setUploadProgress(100);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          // Navigate to documents page after successful upload
          navigate("/documents");
        }, 1000);
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setMessage(`❌ ${error.message || "Upload failed. Please try again."}`);
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('text')) return '📃';
    return '📁';
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex justify-center items-center p-5 font-inter transition-all duration-500">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md transform transition-all duration-500 hover:shadow-2xl">
        <div className="text-center mb-6 transition-opacity duration-700">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-r from-blue-600 to-purple-600 rounded-full mb-4 transform transition-transform duration-500 hover:scale-110">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2 transition-all duration-500">Document Processing</h2>
          <p className="text-gray-600 text-sm transition-all duration-500">Upload engineering drawings, reports, invoices, or any internal document</p>
        </div>

        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all duration-500 mb-6 flex flex-col items-center gap-3
            ${isDragging ? 'border-blue-500 bg-blue-50 scale-105' : ''}
            ${file ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-400'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="transition-all duration-500 transform hover:scale-110">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-500"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          <p className="text-gray-700 text-base m-0 transition-all duration-500">
            {file ? (
              <span className="flex items-center gap-2">
                <span className="text-lg">{getFileIcon(file.type)}</span>
                {file.name}
              </span>
            ) : (
              "Drag & drop your file here or click to browse"
            )}
          </p>
          {file && (
            <p className="text-gray-500 text-sm m-0 transition-opacity duration-500">
              {formatFileSize(file.size)}
            </p>
          )}
        </div>

        {/* Progress Bar */}
        {isUploading && (
          <div className="mb-6 transition-opacity duration-500">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Processing...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden transition-all duration-300">
              <div 
                className="bg-linear-to-r from-blue-500 to-purple-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Buttons Container */}
        <div className="flex gap-3 transition-all duration-500">
          {/* Remove Button */}
          {file && (
            <button
              onClick={handleRemoveFile}
              disabled={isUploading}
              className="flex-1 bg-transparent text-red-600 border border-red-600 rounded-lg py-3 px-4 text-sm cursor-pointer transition-all duration-300 hover:bg-red-50 hover:shadow-md transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              Remove
            </button>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className={`flex-1 py-3 px-6 rounded-lg text-white font-semibold flex justify-center items-center gap-2 transition-all duration-300 transform hover:-translate-y-0.5
              ${!file || isUploading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:shadow-lg'}`}
          >
            {isUploading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Processing...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Process Document
              </>
            )}
          </button>
        </div>

        {/* Server Response */}
        {message && (
          <div className={`mt-6 p-4 rounded-xl border text-sm transition-all duration-500 transform origin-center ${message.startsWith("✅") ? 'animate-pulse' : ''}
            ${message.startsWith("✅") 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : message.startsWith("❌") 
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'}`}
          >
            <div className="flex items-start">
              <span className="text-lg mr-2">{message.startsWith("✅") ? "✅" : message.startsWith("❌") ? "❌" : "⏳"}</span>
              <span>{message.substring(2)}</span>
            </div>
          </div>
        )}

        {/* Supported Formats */}
        <div className="mt-6 p-4 bg-gray-50 rounded-xl transition-opacity duration-500">
          <p className="text-xs text-gray-600 font-medium mb-2">Supported formats:</p>
          <div className="flex flex-wrap gap-2">
            {['PDF', 'DOC', 'DOCX', 'TXT', 'JPG', 'PNG', 'XLS', 'XLSX'].map((format, idx) => (
              <span key={idx} className="bg-white px-2 py-1 rounded-md text-xs text-gray-600 border transition-all duration-300 hover:bg-blue-50 hover:text-blue-600">
                {format}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;