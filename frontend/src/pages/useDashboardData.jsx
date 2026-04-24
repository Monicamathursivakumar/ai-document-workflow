import { useState, useEffect } from "react";

const useDashboardData = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // simulate API fetch
    setTimeout(() => {
      setDocuments([
        { id: 1, title: "Annual Report 2024", department: "Finance" },
        { id: 2, title: "Project Plan", department: "IT" },
      ]);
      setLoading(false);
    }, 800);
  }, []);

  return { documents, loading };
};

export default useDashboardData;
