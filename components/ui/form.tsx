"use client";

import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

// ─── Input ───
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className = "", ...props }, ref) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-sm font-medium text-foreground">{label}</label>}
    <input
      ref={ref}
      className={`h-10 rounded-lg border bg-card px-3 text-sm text-card-foreground placeholder:text-muted-foreground
        transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring
        disabled:opacity-50 disabled:cursor-not-allowed
        ${error ? "border-destructive" : "border-input"} ${className}`}
      {...props}
    />
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
));
Input.displayName = "Input";

// ─── Textarea ───
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, error, className = "", ...props }, ref) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-sm font-medium text-foreground">{label}</label>}
    <textarea
      ref={ref}
      className={`min-h-[80px] rounded-lg border bg-card px-3 py-2 text-sm text-card-foreground placeholder:text-muted-foreground
        transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring resize-y
        ${error ? "border-destructive" : "border-input"} ${className}`}
      {...props}
    />
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
));
Textarea.displayName = "Textarea";

// ─── Select ───
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, options, className = "", ...props }, ref) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-sm font-medium text-foreground">{label}</label>}
    <select
      ref={ref}
      className={`h-10 rounded-lg border border-input bg-card px-3 text-sm text-card-foreground
        transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring
        ${className}`}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
));
Select.displayName = "Select";

// ─── Button ───
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-primary text-white hover:bg-primary-hover",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-hover border border-border",
    destructive: "bg-destructive text-white hover:bg-destructive-hover",
    ghost: "text-secondary-foreground hover:bg-secondary",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
