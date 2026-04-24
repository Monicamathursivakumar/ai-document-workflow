// src/components/ui/card.jsx
export default function Card({ children, className = "", ...props }) {
  return (
    <div
      {...props}
      className={`
        bg-white 
        rounded-2xl 
        border border-gray-200 
        shadow-sm 
        hover:shadow-md 
        transition-all 
        duration-200
        p-5 md:p-6
        ${className}
      `}
    >
      {children}
    </div>
  );
}
