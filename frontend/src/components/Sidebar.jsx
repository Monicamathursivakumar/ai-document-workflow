import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/TranslationContext";
import { Home, FileText, Search, Layers, UserPlus, MessageSquareText, BarChart3, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";

const Sidebar = ({
  isOpen = false,
  onClose = () => {},
  isCollapsed = false,
  onToggleCollapse = () => {},
}) => {
  //storing role to later use
  const { role } = useAuth();
  const { t } = useTranslation();
  const linkClasses = ({ isActive }) =>
    `flex items-center ${isCollapsed ? "justify-center" : "gap-3"} px-4 py-2 rounded-lg transition-colors ${
      isActive
        ? "bg-[#2FA4A9] text-white"
        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
    }`;

  return (
    <aside
      className={`fixed top-[72px] bottom-0 left-0 z-40 ${
        isCollapsed ? "w-24" : "w-72"
      } bg-white border-r border-gray-200 p-4 shadow-xl transition-all duration-300 ease-in-out transform ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } lg:fixed lg:top-[72px] lg:translate-x-0 lg:shadow-none`}
    >
      <div className="flex items-center justify-between mb-6 lg:mb-10">
        {!isCollapsed && <h2 className="text-lg font-semibold text-gray-900">{t("navigation")}</h2>}
        <div className="flex items-center gap-2 ml-auto">
          <button
            className="hidden lg:inline-flex p-2 rounded-lg hover:bg-gray-100"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <nav className="flex flex-col gap-2">
        <NavLink to="/dashboard" end className={linkClasses} onClick={onClose} title={t("dashboard")}>
          <Home size={18} /> {!isCollapsed && t("dashboard")}
        </NavLink>
        <NavLink to="/search" className={linkClasses} onClick={onClose} title={t("search")}>
          <Search size={18} /> {!isCollapsed && t("search")}
        </NavLink>
        <NavLink to="/analytics" className={linkClasses} onClick={onClose} title={t("analytics")}>
          <BarChart3 size={18} /> {!isCollapsed && t("analytics")}
        </NavLink>
        <NavLink to="/integrations" className={linkClasses} onClick={onClose} title={t("integrations")}>
          <Layers size={18} /> {!isCollapsed && t("integrations")}
        </NavLink>
        <NavLink to="/chatbot" className={linkClasses} onClick={onClose} title={t("chatbot")}>
          <MessageSquareText size={18} /> {!isCollapsed && t("chatbot")}
        </NavLink>
        {/* changed from document to document, Prakhar*/}
        <NavLink to="/documents" end className={linkClasses} onClick={onClose} title={t("uploadDocs")}>
          <FileText size={18} /> {!isCollapsed && t("uploadDocs")}
        </NavLink>
        {/* Updated the code on the basis of the role changes in users table , Prakhar*/}
        {(role === "ADMIN" || role === "DEPARTMENT_HEAD") && (
          <NavLink to="/add-employee" className={linkClasses} title={t("addEmployee")}>
            <UserPlus size={18} /> {!isCollapsed && t("addEmployee")}
          </NavLink>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
