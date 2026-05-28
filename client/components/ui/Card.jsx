import React from "react";
import { cn } from "../../lib/utils";

export function Card({ className, children, hoverEffect = false, ...props }) {
  return (
    <div
      className={cn(
        "glass-card rounded-3xl overflow-hidden transition-all duration-300",
        hoverEffect && "hover:shadow-lg hover:shadow-agri-green/5 hover:-translate-y-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn("p-6 pb-4 border-b border-agri-green/5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3
      className={cn("text-lg font-bold text-agri-green-dark dark:text-agri-green-light leading-none tracking-tight", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn("text-xs text-agri-brown-light dark:text-gray-400 mt-1.5", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn("p-6", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div className={cn("p-6 pt-4 border-t border-agri-green/5 flex items-center justify-between", className)} {...props}>
      {children}
    </div>
  );
}
