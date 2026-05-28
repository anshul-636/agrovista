"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export default function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  disabled = false,
  onClick,
  type = "button",
  ...props
}) {
  const baseStyles = "inline-flex items-center justify-center font-semibold rounded-2xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-agri-green text-white hover:bg-agri-green-hover focus:ring-agri-green shadow-md shadow-agri-green/10",
    secondary: "bg-white text-agri-green border border-agri-green/20 hover:bg-agri-cream/40 focus:ring-agri-green",
    accent: "bg-agri-wheat text-agri-green-dark hover:bg-agri-wheat-light focus:ring-agri-wheat shadow-md shadow-agri-wheat/10",
    outline: "border border-current bg-transparent hover:bg-agri-green/5 focus:ring-agri-green",
    ghost: "bg-transparent text-current hover:bg-agri-green/10 focus:ring-agri-green",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-md shadow-red-600/10",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-xl",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base rounded-2xl",
  };

  return (
    <motion.button
      type={type}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}
