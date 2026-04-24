// src/components/ui/button.jsx
import { cn } from "@/lib/utils";

export default function Button({
  children,
  className,
  fullWidth,
  variant = "default",
  size = "md",
  disabled = false,
  loading = false,
  startIcon,
  endIcon,
  ...props
}) {
  const variants = {
    default: `
      relative
      bg-indigo-600 text-white 
      rounded-xl font-medium 
      shadow-md 
      hover:bg-indigo-700 hover:shadow-lg
      active:bg-indigo-800 active:shadow-md
      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
      transition-all duration-200 ease-in-out
      transform hover:-translate-y-0.5 active:translate-y-0
      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    `,
    nav: `
      py-2 px-4 
      bg-transparent 
      text-white 
      rounded-lg 
      border border-white/30
      hover:bg-blue-700 hover:border-blue-500
      active:bg-blue-800
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      transition-all duration-200 ease-in-out
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
    secondary: `
      bg-gray-200 text-gray-900 
      rounded-xl font-medium 
      shadow-sm
      hover:bg-gray-300 hover:shadow-md
      active:bg-gray-400
      focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
      transition-all duration-200 ease-in-out
      transform hover:-translate-y-0.5 active:translate-y-0
      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    `,
    outline: `
      bg-transparent text-indigo-600
      rounded-xl font-medium 
      border border-indigo-600
      hover:bg-indigo-50
      active:bg-indigo-100
      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
      transition-all duration-200 ease-in-out
      transform hover:-translate-y-0.5 active:translate-y-0
      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    `,
    ghost: `
      bg-transparent text-gray-700
      rounded-xl font-medium 
      hover:bg-gray-100
      active:bg-gray-200
      focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
      transition-all duration-200 ease-in-out
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
    danger: `
      bg-red-600 text-white 
      rounded-xl font-medium 
      shadow-md 
      hover:bg-red-700 hover:shadow-lg
      active:bg-red-800
      focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
      transition-all duration-200 ease-in-out
      transform hover:-translate-y-0.5 active:translate-y-0
      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    `,
  };

  const sizes = {
    sm: "py-2 px-3 text-sm",
    md: "py-3 px-4 text-base",
    lg: "py-4 px-6 text-lg font-semibold",
    xl: "py-5 px-8 text-xl font-semibold",
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2",
        "font-medium whitespace-nowrap",
        "transition-all duration-200 ease-in-out",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        (disabled || loading) && "pointer-events-none",
        className
      )}
    >
      {/* Loading spinner */}
      {loading && (
        <svg 
          className="animate-spin -ml-1 mr-2 h-4 w-4" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          ></circle>
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      
      {/* Start icon */}
      {!loading && startIcon && (
        <span className="flex-shrink-0">{startIcon}</span>
      )}
      
      {/* Button content */}
      <span className={cn(loading && "opacity-0")}>
        {children}
      </span>
      
      {/* End icon */}
      {!loading && endIcon && (
        <span className="flex-shrink-0">{endIcon}</span>
      )}
    </button>
  );
}