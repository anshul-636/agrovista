import React from "react";
import { cn } from "../../lib/utils";

export default function Input({
  label,
  id,
  type = "text",
  error,
  className,
  helperText,
  ...props
}) {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-semibold text-agri-green-dark dark:text-agri-green-light"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        className={cn(
          "w-full px-4 py-3 rounded-2xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-agri-green/20 focus:border-agri-green",
          "bg-white/60 dark:bg-black/30 border-agri-green/10 dark:border-agri-green-light/10 text-current",
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
            : "hover:border-agri-green/20",
          className
        )}
        {...props}
      />
      {error && (
        <span className="text-[11px] font-medium text-red-500">{error}</span>
      )}
      {!error && helperText && (
        <span className="text-[10px] text-agri-brown-light">{helperText}</span>
      )}
    </div>
  );
}
