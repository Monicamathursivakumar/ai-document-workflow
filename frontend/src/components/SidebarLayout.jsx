// src/components/SidebarLayout.jsx

/**
 This file defines the Sidebar component, which serves as the primary
 navigation menu for the application. It provides quick access links such as
 Dashboard, Search, Integrations, Upload Documents, and conditionally
 Add Employee based on the user's role.
 
 The sidebar supports two display modes:
   - Mobile mode: slides in/out with a toggle and includes a close button.
   - Desktop mode: remains fixed and always visible.
 
  The component uses React Router's NavLink to highlight the active route and
  applies responsive TailwindCSS transitions for smooth animations.
 
  Role-based access control is implemented via the AuthContext: only users with
  ADMIN or DEPARTMENT_HEAD roles can see the "Add Employee" navigation item.
 
  Overall, this page provides a responsive, role-aware, and user-friendly
  sidebar navigation system for the application.
 */
import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/TranslationContext";
import { Menu } from "lucide-react";

const DashboardLayout = () => {
  const { role } = useAuth();
  const { t } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();

  // Auto-close sidebar whenever user navigates
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex flex-col lg:flex-row bg-gray-50 min-h-screen relative">
      {role && (
        <>
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          />

          {/* 🔥 FIXED OVERLAY — only appears when meant to and now SAFE */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm lg:hidden z-30"
              onClick={() => setIsSidebarOpen(false)}
              role="presentation"
            />
          )}
        </>
      )}

      <div
        className={`${
          role
            ? `flex-1 ${isSidebarCollapsed ? "lg:ml-24" : "lg:ml-72"}`
            : "w-full"
        } p-4 sm:p-6 min-h-screen transition-all duration-300`}
      >
        {role && (
          <button
            className="inline-flex items-center gap-2 px-4 py-2 mb-4 rounded-lg bg-white border border-gray-200 text-gray-700 shadow-sm lg:hidden"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
            {t("menu")}
          </button>
        )}
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;
