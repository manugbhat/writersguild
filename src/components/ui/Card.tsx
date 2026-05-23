"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ className, hover = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-stone-100 shadow-sm",
        hover && "hover:shadow-md hover:border-stone-200 transition-all duration-200 cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
