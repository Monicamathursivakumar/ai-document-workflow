// src/components/DashboardHeader.jsx
import React from "react";
import { LogOut } from "lucide-react";
import Button from "./ui/button";

const DashboardHeader = ({ predefinedRoles, role, handleLogout }) => {
  const roleName = predefinedRoles.find((r) => r.id === role)?.name || "User";

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
      {/* Welcome Text */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-1">IntelliDocX</h1>
        <p className="text-gray-600 text-lg">
          Welcome,{" "}
          <span className="font-semibold text-blue-600">{roleName}</span>
        </p>
      </div>

      {/* Logout Button */}
      <Button
        onClick={handleLogout}
        className="bg-white text-gray-700 border border-gray-200 shadow-sm hover:shadow-md flex items-center px-5 py-2.5"
      >
        <LogOut className="w-5 h-5 mr-2" />
        Logout
      </Button>
    </div>
  );
};

export default DashboardHeader;
