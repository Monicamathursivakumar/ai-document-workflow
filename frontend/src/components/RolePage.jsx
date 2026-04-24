import React from "react";
import Logo from "./ui/Logo";

const RolePage = ({ predefinedRoles, handleLogin }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="w-full max-w-2xl p-10 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center mb-8">
          <Logo sizeClassName="w-28 h-28" wrapperClassName="mb-4" />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">IntelliDocX</h1>
          <p className="text-gray-600">Select your role to continue</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {predefinedRoles.map((r) => (
            <button
              key={r.id}
              onClick={() => handleLogin(r.id)}
              className={`p-6 rounded-xl transition-all duration-300 ${r.color} hover:shadow-md hover:-translate-y-1 flex flex-col items-center`}
            >
              <div className="w-12 h-12 rounded-lg bg-white shadow-inner mb-3 flex items-center justify-center">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <span className="font-medium">Login as {r.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RolePage;
