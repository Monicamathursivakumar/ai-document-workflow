import React, { useEffect, useState } from "react";
import { Building2, Plus } from "lucide-react";
import { KMRL_DEPARTMENT_NAMES, getServerBaseUrl } from "../lib/departments";

const colorClasses = [
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-pink-100 text-pink-700",
  "bg-yellow-100 text-yellow-700",
  "bg-purple-100 text-purple-700",
  "bg-indigo-100 text-indigo-700",
  "bg-red-100 text-red-700",
  "bg-teal-100 text-teal-700",
];

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState(KMRL_DEPARTMENT_NAMES);
  const [newDept, setNewDept] = useState("");

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch(`${getServerBaseUrl()}/api/v1/departments`);
        const data = await response.json();
        if (data?.success && Array.isArray(data?.departments) && data.departments.length) {
          setDepartments(data.departments.map((dept) => dept.name));
        }
      } catch (error) {
        console.error("Failed to fetch departments:", error);
      }
    };

    fetchDepartments();
  }, []);

  const handleAddDepartment = (e) => {
    e.preventDefault();
    if (!newDept.trim()) return;

    setDepartments([...departments, newDept.trim()]);
    setNewDept("");
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Building2 className="text-blue-600" /> Departments
      </h1>

      <p className="text-gray-600 mb-6">
        Manage departments to organize and classify documents.
      </p>

      {/* Add Department Form */}
      <form
        onSubmit={handleAddDepartment}
        className="flex flex-col gap-3 sm:flex-row mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-200"
      >
        <input
          type="text"
          placeholder="Enter new department name"
          value={newDept}
          onChange={(e) => setNewDept(e.target.value)}
          className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          className="flex items-center justify-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition"
        >
          <Plus size={18} /> Add
        </button>
      </form>

      {/* Department List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept, idx) => {
          const color = colorClasses[idx % colorClasses.length];
          return (
            <div
              key={idx}
              className={`rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition ${color}`}
            >
              <h2 className="text-lg font-semibold">{dept}</h2>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DepartmentsPage;
