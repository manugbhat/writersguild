"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  photoURL?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-14 h-14 text-xl",
};

const colors = [
  "bg-amber-400",
  "bg-rose-400",
  "bg-violet-400",
  "bg-teal-400",
  "bg-sky-400",
  "bg-orange-400",
];

function getColor(name: string) {
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

export function Avatar({ name, photoURL, size = "md", className }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={name}
        className={cn("rounded-full object-cover flex-shrink-0", sizeMap[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold text-white flex-shrink-0",
        sizeMap[size],
        getColor(name),
        className
      )}
    >
      {initials}
    </div>
  );
}
