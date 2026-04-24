import React from "react";
// Ensures correct routing & navbar visibility
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider } from "./context/AuthContext";
import { TranslationProvider } from "./context/TranslationContext";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import DocumentDetailPage from "./pages/DocumentDetailPage";
import DashboardLayout from "./components/SidebarLayout";
import IntegrationsPage from "./pages/IntegrationsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SearchPage from "./pages/SearchPage";
import AllDocumentsPage from "./pages/AllDocumentsPage";
import AddEmployeePage from "./pages/AddEmployeePage";
import ChatbotPage from "./pages/ChatbotPage";
// Removed Vite alias because it loaded stale cached files.
// Using relative imports ensures correct Navbar + AuthContext mapping.
import LoginPage from "./components/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProtectedRoute from "./components/ProtectedRoute";

const pageTransition = {
  initial: { opacity: 0, y: 18, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -14, filter: "blur(4px)" },
};

function PageTransition({ children }) {
  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.38, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

// App initializes global providers (AuthProvider + Router).
// All UI and routing happens inside AppContent to keep App clean.
function App() {
  return (
    // TranslationProvider wraps the entire app so that language
    // state is available everywhere. AuthProvider wraps Router
    // so that authentication state (role, name, login, logout) is available everywhere.

    <TranslationProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </TranslationProvider>
  );
}

function AppContent() {
  // useLocation is used to detect the current route
  // so we can hide the Navbar on login & register pages.
  const location = useLocation();
  const hideNavbarRoutes = ["/login", "/register"];

  return (
    <div className="min-h-screen bg-gray-50">

      {/*
        Hide Navbar on login page:
        Some pages (like login) should not show navbar.
        We compare the current route against a list of hidden routes
      */}
      {!hideNavbarRoutes.includes(location.pathname) && <Navbar />}

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public Routes */}
          <Route
            path="/"
            element={
              <PageTransition>
                <LandingPage />
              </PageTransition>
            }
          />
          <Route
            path="/login"
            element={
              <PageTransition>
                <LoginPage />
              </PageTransition>
            }
          />
          <Route
            path="/register"
            element={
              <PageTransition>
                <RegisterPage />
              </PageTransition>
            }
          />

          {/*
            Any route inside this block requires the user to be logged in.
             ProtectedRoute checks AuthContext and redirects to /login if unauthenticated.
             DashboardLayout provides sidebar + layout for all internal pages.
          */}
          {/* Protected Routes */}
          <Route
            element={
              <PageTransition>
                <ProtectedRoute>
                 {/*
                    DashboardLayout:
                    Wraps protected pages with sidebar navigation and consistent UI.
                  */}
                  <DashboardLayout />
                </ProtectedRoute>
              </PageTransition>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/documents" element={<AllDocumentsPage />} />
            <Route path="/documents/:id" element={<DocumentDetailPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/chatbot" element={<ChatbotPage />} />
            <Route path="/add-employee" element={<AddEmployeePage />} />
          </Route>
        </Routes>
      </AnimatePresence>
    </div>
  );
}

export default App;
