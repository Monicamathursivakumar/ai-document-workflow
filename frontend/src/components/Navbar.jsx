// src/components/Navbar.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/TranslationContext";
import Button from "./ui/button";
import Logo from "./ui/Logo";


// - Shows Home + Login on Landing Page ("/")
// - Shows Dashboard + Logout + Role on authenticated pages
// - Uses 'loading' to prevent random flashes on refresh
import { Menu, X, Languages, Bell, Moon, Sun } from "lucide-react";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, logout,loading } = useAuth();
  const { t, currentLanguage, changeLanguage, languageNames, availableLanguages } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [urgentNotifications, setUrgentNotifications] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    document.body.classList.toggle("theme-dark", isDarkMode);
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const fetchUrgentNotifications = async () => {
    if (!role) return;

    setNotificationLoading(true);
    try {
      const base = import.meta.env.VITE_SERVER_URL;
      const token = localStorage.getItem("token");
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      const [docsRes, metricsRes] = await Promise.allSettled([
        fetch(`${base}/api/v1/routing/my-documents?role=${role}&priority=CRITICAL&compliance_only=true`, { headers: authHeaders }),
        fetch(`${base}/api/v1/routing/dashboard-metrics?role=${role}`, { headers: authHeaders }),
      ]);

      const notifications = [];

      if (metricsRes.status === "fulfilled" && metricsRes.value.ok) {
        const metricsPayload = await metricsRes.value.json();
        const metrics = metricsPayload?.metrics || {};

        if ((metrics.critical_alerts || 0) > 0) {
          notifications.push({
            id: "critical-alerts",
            title: `${metrics.critical_alerts} critical alert(s)`,
            detail: "Immediate review required",
          });
        }

        if ((metrics.compliance_due || 0) > 0) {
          notifications.push({
            id: "compliance-due",
            title: `${metrics.compliance_due} compliance item(s)`,
            detail: "Compliance documents pending",
          });
        }
      }

      if (docsRes.status === "fulfilled" && docsRes.value.ok) {
        const docsPayload = await docsRes.value.json();
        const criticalDocs = (docsPayload?.documents || []).slice(0, 5);

        criticalDocs.forEach((doc) => {
          notifications.push({
            id: `doc-${doc.id}`,
            title: doc.file_name,
            detail: doc.urgency_level || "CRITICAL",
            documentId: doc.id,
          });
        });
      }

      setUrgentNotifications(notifications);
    } catch (error) {
      console.error("Failed to load urgent notifications:", error);
      setUrgentNotifications([]);
    } finally {
      setNotificationLoading(false);
    }
  };

  useEffect(() => {
    if (!isNotificationOpen) return;
    fetchUrgentNotifications();
  }, [isNotificationOpen, role]);

  // Hide Navbar completely on Login page
  if (location.pathname.startsWith("/login")) return null;

  // WAIT for AuthContext to restore role
  if (loading) return null;   

  // Force Home + Login UI on Landing Page (Public UI)
  if (location.pathname === "/") {
    return (
      <nav className="flex justify-between items-center px-6 py-4 bg-linear-to-r from-[#1F7F86] to-[#2FA4A9] text-white sticky top-0 z-50 shadow-lg">
        <div className="flex items-center">
          <Logo sizeClassName="w-14 h-14" wrapperClassName="mr-3 rounded-full" />
          <h2 className="m-0 text-xl font-bold font-inter">IntelliDocX</h2>
        </div>

        <div className="flex gap-6 items-center">
          <Link
            to="/"
            className={`no-underline font-medium transition-colors py-2 px-4 rounded-lg ${
              location.pathname === "/"
                ? "bg-white text-[#1F7F86] font-semibold"
                : "text-white hover:bg-[#1F7F86]"
            }`}
          >
            {t("home")}
          </Link>

          <Link
            to="/login"
            className="no-underline font-medium transition-colors py-2 px-4 rounded-lg text-white hover:bg-[#1F7F86]"
          >
            {t("login")}
          </Link>
        </div>
      </nav>
    );
  }
  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    navigate("/");
  };

  return (
    <nav className="px-4 sm:px-6 py-4 bg-linear-to-r from-[#1F7F86] to-[#2FA4A9] text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-6xl mx-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Left Side Logo (CLICKABLE → GO TO HOME) */}
        <div className="flex items-center justify-between gap-4">
          <div
            className="flex items-center cursor-pointer"
            onClick={() => {
              navigate("/");
              setIsOpen(false);
            }}
          >
            <Logo sizeClassName="w-14 h-14" wrapperClassName="mr-3 rounded-full" />
            <h2 className="m-0 text-xl font-bold font-inter">IntelliDocX</h2>
          </div>

          <button
            className="md:hidden inline-flex items-center justify-center rounded-lg p-2 bg-white/10 hover:bg-white/20 transition"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Right Side Navigation */}
        <div
          className={`${
            isOpen ? "flex" : "hidden"
          } w-full md:w-auto flex-col items-stretch gap-3 rounded-xl bg-white/10 p-3 md:flex md:flex-row md:items-center md:gap-4 md:bg-transparent md:p-0`}
        >
          {!role ? (
            <>
              {/* Home */}
              <Link
                to="/"
                className={`no-underline font-medium transition-colors py-2 px-4 rounded-lg ${
                  isActive("/")
                    ? "bg-white text-[#1F7F86] font-semibold"
                    : "text-white hover:bg-[#1F7F86]"
                } text-left md:text-center`}
                onClick={() => setIsOpen(false)}
              >
                {t("home")}
              </Link>

              {/* Login */}
              <Link
                to="/login"
                className={`no-underline font-medium transition-colors py-2 px-4 rounded-lg ${
                  isActive("/login")
                    ? "bg-white text-[#1F7F86] font-semibold"
                    : "text-white hover:bg-[#1F7F86]"
                } text-left md:text-center`}
                onClick={() => setIsOpen(false)}
              >
                {t("login")}
              </Link>
            </>
          ) : (
            <>
              {/* Dashboard */}
              <Link
                to="/dashboard"
                className={`no-underline font-medium transition-colors py-2 px-4 rounded-lg ${
                  isActive("/dashboard")
                    ? "bg-white text-[#1F7F86] font-semibold"
                    : "text-white hover:bg-[#1F7F86]"
                } text-left md:text-center`}
                onClick={() => setIsOpen(false)}
              >
                {t("dashboard")}
              </Link>

              <div className="flex items-center gap-2 flex-wrap">

              {/* Language Selector */}
              <div className="relative">
                <button
                  onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                  className="flex items-center gap-2 font-medium transition-colors py-2 px-4 rounded-lg text-white hover:bg-[#1F7F86]"
                  aria-label="Select Language"
                >
                  <Languages className="w-4 h-4" />
                  <span className="hidden sm:inline">{languageNames[currentLanguage]}</span>
                </button>
                
                {isLangDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsLangDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                      {availableLanguages.map((lang) => (
                        <button
                          key={lang}
                          onClick={() => {
                            changeLanguage(lang);
                            setIsLangDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors ${
                            currentLanguage === lang
                              ? "bg-teal-50 text-[#1F7F86] font-semibold"
                              : "text-gray-700"
                          }`}
                        >
                          {languageNames[lang]}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Logout */}
              <Button
                onClick={handleLogout}
                className="w-auto py-2! px-4! bg-white/20 text-white hover:bg-white/30 border border-white/20 cursor-pointer"
              >
                {t("logout")}
              </Button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsLangDropdownOpen(false);
                    setIsNotificationOpen((prev) => !prev);
                  }}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/20 text-white hover:bg-white/30 border border-white/20"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                </button>

                {urgentNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 text-center font-semibold">
                    {Math.min(urgentNotifications.length, 9)}
                  </span>
                )}

                {isNotificationOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsNotificationOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl bg-white border border-gray-200 shadow-xl z-20">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">Urgent Notifications</p>
                      <span className="text-xs text-red-600 font-semibold">{urgentNotifications.length}</span>
                    </div>

                    {notificationLoading ? (
                      <p className="px-4 py-4 text-sm text-gray-600">Loading...</p>
                    ) : urgentNotifications.length === 0 ? (
                      <p className="px-4 py-4 text-sm text-gray-600">No urgent notifications.</p>
                    ) : (
                      <div className="py-2">
                        {urgentNotifications.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              if (item.documentId) {
                                navigate(`/documents/${item.documentId}`);
                              }
                              setIsNotificationOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-b-0"
                          >
                            <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                            <p className="text-xs text-gray-600 mt-1">{item.detail}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsDarkMode((prev) => !prev)}
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/20 text-white hover:bg-white/30 border border-white/20"
                aria-label="Toggle dark or light theme"
                title={isDarkMode ? "Switch to Light theme" : "Switch to Dark theme"}
              >
                {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
              
            {/*Had to update this part as the changes were made to the role field of users table*}
            {/* Role Badge */}
            <span className="text-sm bg-white/20 px-3 py-1 rounded-full capitalize">
              {role === "ADMIN"
                ? t("superAdmin")
                : role === "DEPARTMENT_HEAD"
                ? t("admin")
                : t("employee")}
            </span>
              </div>
          </>
        )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
