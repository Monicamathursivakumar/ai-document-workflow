import React from "react";
import InputField from "./ui/input"; // ensure filename matches
import Button from "./ui/button";
import { UploadCloud } from "lucide-react"; // icon for upload
import { Search } from "lucide-react"; // optional search icon

const SearchAndUpload = ({ search, setSearch, handleUpload }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        
        {/* Search Input */}
        <div className="relative flex-grow">
          <InputField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by name, type or tags..."
            className="pl-10" // leave padding for icon
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Upload Button */}
        <div className="w-full md:w-auto">
          <label className="w-full md:w-auto cursor-pointer">
            <Button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600">
              <UploadCloud size={18} /> Upload Document
              <input type="file" onChange={handleUpload} className="hidden" />
            </Button>
          </label>
        </div>
      </div>
    </div>
  );
};

export default SearchAndUpload;
