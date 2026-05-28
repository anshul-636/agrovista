import React from "react";
import { cn } from "../../lib/utils";

export default function Badge({
  children,
  className,
  variant = "green",
  size = "md",
  ...props
}) {
  const baseStyles = "inline-flex items-center font-semibold tracking-wide uppercase transition-all rounded-full";

  const variants = {
    green: "bg-agri-green/10 text-agri-green border border-agri-green/20 dark:bg-agri-green-light/10 dark:text-agri-green-light dark:border-agri-green-light/20",
    yellow: "bg-agri-wheat/10 text-agri-wheat-dark border border-agri-wheat/20 dark:bg-agri-wheat/20 dark:text-agri-wheat dark:border-agri-wheat/30",
    brown: "bg-agri-brown/10 text-agri-brown border border-agri-brown/20",
    red: "bg-red-500/10 text-red-600 border border-red-500/20 dark:bg-red-500/20 dark:text-red-400",
    gray: "bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
    outline: "border border-current bg-transparent text-current",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3.5 py-1.5 text-xs",
  };

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
}
