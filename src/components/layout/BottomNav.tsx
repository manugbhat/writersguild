"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, PenLine, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/feed", icon: Home, label: "Feed" },
  { href: "/groups", icon: Users, label: "Groups" },
  { href: "/write", icon: PenLine, label: "Write" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-100 safe-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          const isWrite = href === "/write";
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-3 px-4 transition-all",
                isWrite
                  ? "relative -top-3 bg-amber-600 rounded-2xl p-3.5 shadow-lg shadow-amber-200 text-white"
                  : isActive
                  ? "text-amber-600"
                  : "text-stone-400 hover:text-stone-600"
              )}
            >
              <Icon size={isWrite ? 22 : 20} strokeWidth={isActive || isWrite ? 2.5 : 2} />
              {!isWrite && (
                <span className={cn("text-xs font-medium", isActive ? "text-amber-600" : "text-stone-400")}>
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
