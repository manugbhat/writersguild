"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
}

export function TopBar({ title, subtitle, right, className }: TopBarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-100 px-4 py-3",
        className
      )}
    >
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-stone-900">{title}</h1>
          {subtitle && <p className="text-xs text-stone-500">{subtitle}</p>}
        </div>
        {right && <div>{right}</div>}
      </div>
    </header>
  );
}
