import React from "react";
import { cn } from "../../lib/utils";

export default function Select({
  label,
  id,
  options = [],
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
      <select
        id={id}
        className={cn(
          "w-full px-4 py-3 rounded-2xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-agri-green/20 focus:border-agri-green appearance-none",
          "bg-white/60 dark:bg-black/30 border-agri-green/10 dark:border-agri-green-light/10 text-current",
          "bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%232E7D32%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[right_16px_center] bg-no-repeat",
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
            : "hover:border-agri-green/20",
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white dark:bg-zinc-900 text-current">
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-[11px] font-medium text-red-500">{error}</span>
      )}
      {!error && helperText && (
        <span className="text-[10px] text-agri-brown-light">{helperText}</span>
      )}
    </div>
  );
}
