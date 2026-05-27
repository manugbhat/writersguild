"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const handler = (e: Event) => {
      e.preventDefault();
      console.log("beforeinstallprompt event fired");
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Debug: check if service worker is registered
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        console.log("Service worker registration:", reg);
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  // Debug: force show for testing on localhost
  const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";

  // Prevent hydration mismatch - render nothing until mounted
  if (!mounted) return null;

  if (!showPrompt && !isLocalhost) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Download className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-stone-900 dark:text-stone-100">
              Install WritersGuild
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
              Add to home screen for the best experience
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={handleInstall} className="flex-1">
            Install
          </Button>
          <Button
            onClick={handleDismiss}
            variant="ghost"
            className="flex-1"
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
