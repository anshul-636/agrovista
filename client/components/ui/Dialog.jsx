"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export default function Dialog({
  isOpen,
  onClose,
  title,
  children,
  className,
  maxWidth = "max-w-lg"
}) {
  // Prevent background scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className={cn(
              "relative w-full glass-card rounded-3xl p-6 shadow-2xl z-10",
              maxWidth,
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-agri-green/5">
              {title && (
                <h3 className="text-xl font-bold text-agri-green-dark dark:text-agri-green-light">
                  {title}
                </h3>
              )}
              <button
                onClick={onClose}
                className="p-1 rounded-full text-agri-brown hover:bg-agri-green/5 dark:hover:bg-agri-green-light/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="mt-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
