"use client";

import { motion } from "framer-motion";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { Sparkles, Zap, LogOut, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { LoginPage } from "@/components/auth/LoginPage";

export default function Home() {
  const { isAuthenticated, username, logout } = useAuth();

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="border-b border-border/50 glass sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center">
                  <Zap className="w-5 h-5 text-black" />
                </div>
                <motion.div
                  className="absolute -inset-1 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] opacity-30 blur-sm -z-10"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text tracking-tight">
                  TikTok Creative Factory
                </h1>
                <p className="text-[11px] text-muted-foreground tracking-wide">
                  AI-Powered Content Generation
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-muted-foreground">AI Ready</span>
              </div>

              {/* User Info & Logout */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-foreground/80">{username}</span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="text-xs">Logout</span>
              </button>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold mb-3 tracking-tight">
            Create Viral{" "}
            <span className="gradient-text">TikTok Content</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl text-[15px] leading-relaxed">
            Upload your product images and let AI generate scroll-stopping content
            optimized for TikTok's algorithm. Choose from trending creative styles
            and watch your brand come alive.
          </p>
        </motion.div>

        <DashboardTabs />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-16">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-[13px] text-muted-foreground">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[var(--primary)]" />
              <span className="font-medium">Powered by Google ADK + Gemini</span>
            </div>
            <p className="opacity-75">© 2026 TikTok Creative Factory</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
