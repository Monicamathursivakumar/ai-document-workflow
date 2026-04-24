// src/components/ui/input.jsx
import { cn } from "@/lib/utils";

export default function Input({ className, ...props }) {
  return (
    <input
      {...props}
      className={cn(
        "block w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition",
        className
      )}
    />
  );
}
