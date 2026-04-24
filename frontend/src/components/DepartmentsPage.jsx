import React, { useEffect, useState } from "react";
import { Building2, Plus } from "lucide-react";
import Button from "./ui/button";
import InputField from "./ui/input"; // make sure filename matches your input component
import Card from "./ui/card";
import { useAuth } from "../context/AuthContext";
import { KMRL_DEPARTMENT_NAMES, getServerBaseUrl } from "../lib/departments";


const DepartmentsPage = () => {
  const [departments, setDepartments] = useState(KMRL_DEPARTMENT_NAMES);

  const { role } = useAuth();


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
    <div>
      {/* Page Header */}
      <div className="flex items-center gap-2 mb-6">
        <Building2 className="text-blue-600" />
        <h1 className="text-2xl font-bold">Departments</h1>
      </div>
      <p className="text-gray-600 mb-6">
        Manage departments to organize and classify documents.
      </p>

      {/* Add Department Form */}
      <Card className="flex gap-3 mb-8 p-4 flex-wrap">
        <InputField
          value={newDept}
          onChange={(e) => setNewDept(e.target.value)}
          placeholder="Enter new department name"
        />
        <Button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700" onClick={handleAddDepartment}>
          <Plus size={18} /> Add
        </Button>
      </Card>

      {/* Departments List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept, idx) => (
          <Card key={idx} className="p-5 text-center hover:shadow-md">
            <h2 className="text-gray-800 font-semibold">{dept}</h2>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DepartmentsPage;
