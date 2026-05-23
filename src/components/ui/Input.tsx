"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-stone-700">{label}</label>
      )}
      <input
        className={cn(
          "w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder-stone-400 transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent",
          error && "border-red-400 focus:ring-red-400",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-stone-700">{label}</label>
      )}
      <textarea
        className={cn(
          "w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder-stone-400 transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none",
          error && "border-red-400 focus:ring-red-400",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
