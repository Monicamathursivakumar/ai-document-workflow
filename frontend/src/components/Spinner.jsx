import React from "react";

const Spinner = () => {
  return (
    <div className="flex justify-center items-center h-64 bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading your documents...</p>
      </div>
    </div>
  );
};

export default Spinner;
