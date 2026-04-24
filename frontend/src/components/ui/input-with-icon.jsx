// src/components/ui/input-with-icon.jsx
import React from "react";
import { cn } from "@/lib/utils";

export default function InputWithIcon({
  icon: Icon,
  className,
  rightIcon,
  rightIconOnClick,
  ...props
}) {
  return (
    <div className="relative">
      {/* Left Icon */}
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icon className="h-5 w-5 text-gray-400" />
      </div>

      {/* Input */}
      <input
        {...props}
        className={cn(
          "block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition",
          className
        )}
      />

      {/* Optional Right Icon (Eye/EyeOff) */}
      {rightIcon && (
        <button
          type="button"
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          onClick={rightIconOnClick}
        >
          {rightIcon}
        </button>
      )}
    </div>
  );
}
