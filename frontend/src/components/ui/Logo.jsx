// src/components/Logo.jsx
export default function Logo({ className = "", wrapperClassName = "", sizeClassName = "w-16 h-16" }) {
  return (
    <div
      className={`inline-flex items-center justify-center ${sizeClassName} rounded-2xl bg-white shadow-[0_18px_40px_rgba(0,0,0,0.18)] border border-slate-200 ${wrapperClassName}`}
      aria-label="IntelliDocX logo"
    >
      <img
        src="/image.png"
        alt="IntelliDocX logo"
        className={`h-[96%] w-[96%] object-contain ${className}`}
      />
    </div>
  );
}
