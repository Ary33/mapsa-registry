"use client";

import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";

export default function PendingPage() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-mapsa-bg">
      <header className="flex items-center px-4 h-[52px] bg-mapsa-panel border-b border-mapsa-border">
        <Link
          href="/"
          className="font-cinzel text-[13px] text-mapsa-gold tracking-[2px] uppercase hover:text-mapsa-accent transition-colors"
        >
          MAHC · MAPSA
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg text-center">
          <div className="rounded-md border border-mapsa-border p-8 bg-mapsa-panel">
            <h1 className="font-cinzel text-xl text-mapsa-gold tracking-widest uppercase mb-4">
              Access Pending
            </h1>
            <p className="font-garamond text-sm text-mapsa-text leading-relaxed mb-3">
              Your registration is under review. The MAPSA administrator will
              verify your institutional affiliation and approve your account.
            </p>
            {profile?.email && (
              <p className="font-mono text-xs text-mapsa-muted mb-6">
                Registered as: {profile.email}
              </p>
            )}
            <p className="font-garamond text-xs text-mapsa-muted italic mb-6">
              Researchers with recognized academic email domains are approved
              automatically. If your institution is not yet in our directory,
              approval typically takes 1–2 business days.
            </p>
            <button
              onClick={signOut}
              className="mapsa-btn text-xs"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
