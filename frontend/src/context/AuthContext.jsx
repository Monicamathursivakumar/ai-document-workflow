// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';


const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // Stores logged-in user role (admin/employee). Null = logged out.
  const [role, setRole] = useState(null);

  //storing logged in user's name
  const [name, setName] = useState(null);

  // NEW — stores logged-in user department => Prakahr Mishra
  const [departmentId, setDepartmentId] = useState(null);


  // Prevents ProtectedRoute + Navbar from rendering too early.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
     // on page refresh: restore user role from localStorage.
    const savedRole = localStorage.getItem("role");
    if (savedRole) {
      // If Session exists → restore user login state.
      setRole(savedRole);
    }

     // Restoring name
      const savedName = localStorage.getItem("name");
      if (savedName) {
        setName(savedName);
      }
      
    // restoring department ID
    const savedDept = localStorage.getItem("department_id");

    if (savedDept) {
      setDepartmentId(savedDept);
    }
    // Initialization complete — components can render safely.
    setLoading(false); 
  }, []);

  // We use localStorage to persist authentication across page refreshes.
  // - "token" is used for backend API authentication.
  // - "role" is used for frontend routing (ProtectedRoute) + Navbar UI.
  // This keeps the user logged in even after closing/reloading the browser.
  //Update - added department Id parameter
  const login = (userRole,userName,deptId) => {
    // Saving values in state + in browser (persistent login)
    setRole(userRole);
    setName(userName);
    setDepartmentId(deptId);
    // stores the values of the user so even if the user refreshes the page, the values persits 
    localStorage.setItem("role", userRole);
    localStorage.setItem("name", userName);
    localStorage.setItem("department_id", deptId); 

  };
  // Clear session from localStorage on logout
  const logout = () => {
    const currentUserId = localStorage.getItem("userId");

    //clearing the state of the values
    setRole(null);
    setName(null);
    setDepartmentId(null);

    //Removing the items/values of the user from the local storage
    localStorage.removeItem("role");
    localStorage.removeItem("department_id");
    localStorage.removeItem("name"); 
    localStorage.removeItem("token");
    localStorage.removeItem("userId");

    if (currentUserId) {
      localStorage.removeItem(`kmrl_integrations_${currentUserId}`);
    }

    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("kmrl_integrations_")) {
        localStorage.removeItem(key);
      }
    });
  };

  const value = {
    role,
    name,
    // newly added because we are working/updating our UI on the basis of department Id,
    //  especially for adding a person's form
    departmentId,
    login,
    logout,
    loading
  };

  return (
    // Provide role, login, logout, loading to entire app.
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};