import { useState, useEffect } from "react";
import Cookies from "js-cookie";

const useDashboard = () => {
  const [role, setRole] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showLoginForm, setShowLoginForm] = useState(true);
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  useEffect(() => {
    const savedUser = Cookies.get("user");
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setRole(parsedUser.role);
        setLoginData({ username: parsedUser.username, password: "" });
        setShowLoginForm(false);
      } catch (err) {
        console.error("Failed to parse user cookie", err);
      }
    }
  }, []);

  const predefinedRoles = [
    {
      id: "admin",
      name: "Administrator",
      color:
        "bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200",
    },
    {
      id: "hr",
      name: "Human Resources",
      color:
        "bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200",
    },
    {
      id: "engineering",
      name: "Engineering",
      color:
        "bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200",
    },
  ];

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (loginData.username && loginData.password) {
      // Example: Save username + role in cookies
      Cookies.set(
        "user",
        JSON.stringify({ username: loginData.username, role: "admin" }),
        {
          expires: 1, // cookie expiry (days)
          //   secure: true, // only send on HTTPS
          sameSite: "Strict",
        }
      );

      setShowLoginForm(false);
      setRole("admin"); // or actual role from backend
      setNotification("Login successful!");
      setTimeout(() => setNotification(null), 3000);
    } else {
      setNotification("Please enter both username and password");
      setTimeout(() => setNotification(null), 3000);
    }
  };

  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true);
      try {
        const serverBase = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";
        const response = await fetch(
          `${serverBase}/api/v1/documents`
        );
        const data = await response.json();
        if (data.success) {
          setDocuments(data.documents);
        } else {
          setNotification("Failed to fetch documents.");
        }
      } catch (error) {
        console.error("Fetch error:", error);
        setNotification("Failed to connect to server.");
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const handleLogin = (role) => {
    setRole(role);
    setSearch("");
  };

  const handleLogout = () => {
    Cookies.remove("user");
    setRole(null);
    setDocuments([]);
    setShowLoginForm(true);
    setLoginData({ username: "", password: "" });
  };

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setNotification(`Uploading "${file.name}"...`);

    try {
        const serverBase = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
          `${serverBase}/api/v1/process-document`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!data.success) {
        setNotification("❌ Failed to process document.");
        return;
      }

      // Map backend response to your document object
      const processedDoc = {
        _id: data.document_id,
        originalname: data.data.metadata.original_filename,
        metadata: {
          file_size:
            (data.data.metadata.file_size / 1024 / 1024).toFixed(2) + " MB",
        },
        upload_time: data.data.metadata.processed_time,
        content_analysis: {
          priority: data.data.content_analysis.priority,
          doc_type: data.data.metadata.doc_type,
          departments: data.data.content_analysis.departments,
          summary: data.data.content_analysis.short_summary,
          title: data.data.content_analysis.title,
          status: data.message, // "Document processed and saved successfully"
        },
      };

      setDocuments((prev) => [...prev, processedDoc]);

      setNotification(`✅ Document "${file.name}" processed successfully!`);
    } catch (error) {
      console.error("Upload error:", error);
      setNotification("⚠️ Error uploading document.");
    } finally {
      setLoading(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const deleteDocument = async (id, e) => {
    e.stopPropagation();

    const doc = documents.find((d) => d._id === id);
    if (!doc) return;

    // Optimistically remove from UI
    const updatedDocs = documents.filter((d) => d._id !== id);
    setDocuments(updatedDocs);

    // Show loading notification
    setNotification({
      type: "info",
      message: `Deleting "${doc.originalname}"...`,
    });

    try {
      const serverBase = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";
      const response = await fetch(
        `${serverBase}/api/v1/documents/${id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      // Success
      setNotification({
        type: "success",
        message: `✅ Document "${doc.originalname}" deleted successfully!`,
      });
    } catch (err) {
      console.error("Delete error:", err);

      // Rollback (put doc back in list)
      setDocuments((prev) => [...prev, doc]);

      setNotification({
        type: "error",
        message: `❌ Failed to delete "${doc.originalname}". Please try again.`,
      });
    }
  };

  const filteredDocs = documents.filter((doc) => {
    if (!doc) return false;

    const nameMatch =
      doc.originalname &&
      doc.originalname.toLowerCase().includes(search.toLowerCase());

    const typeMatch =
      doc.content_analysis?.doc_type &&
      doc.content_analysis.doc_type
        .toLowerCase()
        .includes(search.toLowerCase());

    const tagMatch =
      doc.content_analysis?.departments &&
      doc.content_analysis.departments.some(
        (tag) => tag && tag.toLowerCase().includes(search.toLowerCase())
      );

    return nameMatch || typeMatch || tagMatch;
  });

  const getPriorityColor = (priority) => {
    if (!priority)
      return "bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border border-gray-200";

    switch (priority.toLowerCase()) {
      case "high":
        return "bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200";
      case "medium":
        return "bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border border-yellow-200";
      case "low":
        return "bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200";
      default:
        return "bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border border-gray-200";
    }
  };

  const getFileIcon = (fileName) => {
    if (!fileName) {
      return (
        <svg
          className="w-8 h-8 text-gray-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    const extension = fileName.split(".").pop().toLowerCase();
    switch (extension) {
      case "pdf":
        return (
          <svg
            className="w-8 h-8 text-red-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "docx":
      case "doc":
        return (
          <svg
            className="w-8 h-8 text-blue-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-8 h-8 text-gray-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  return {
    notification,
    loginData,
    setLoginData,
    handleLoginSubmit,
    role,
    predefinedRoles,
    handleLogin,
    handleLogout,
    search,
    setSearch,
    handleUpload,
    loading,
    filteredDocs,
    deleteDocument,
    getPriorityColor,
    getFileIcon,
    showLoginForm,
  };
};

export default useDashboard;
