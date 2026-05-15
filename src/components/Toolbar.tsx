"use client";

import Link from "next/link";
import { useTheme } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";

interface ToolbarProps {
  recordId?: string;
  status?: string[];
  recordVersion?: string;
}

export default function Toolbar({
  recordId,
  status,
  recordVersion,
}: ToolbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { profile, isLoading, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 h-[52px] bg-mapsa-panel border-b border-mapsa-border flex-wrap gap-1">
      {/* Left */}
      <div className="flex items-center gap-2.5 shrink-0">
        <Link
          href="/"
          className="font-cinzel text-[13px] text-mapsa-gold tracking-[2px] uppercase hover:text-mapsa-accent transition-colors"
        >
          MAHC · MAPSA
        </Link>
        <span className="text-mapsa-border">|</span>
        {recordId ? (
          <span className="font-cinzel text-[11px] text-mapsa-muted tracking-wider">
            <Link href="/" className="hover:text-mapsa-gold transition-colors">
              Registry
            </Link>
            <span className="text-mapsa-border"> / </span>
            <span className="font-mono text-xs text-mapsa-gold-light">
              {recordId}
            </span>
          </span>
        ) : (
          <span className="font-cinzel text-[11px] text-mapsa-muted tracking-wider">
            Monte Albán Inscription Registry
          </span>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0">
        {status?.slice(0, 2).map((st) => (
          <span
            key={st}
            className={`mapsa-badge ${st === "NEEDS EXPERT REVIEW" ? "mapsa-badge-red" : ""}`}
          >
            {st}
          </span>
        ))}
        {recordVersion && (
          <span className="font-mono text-2xs text-mapsa-muted">
            v{recordVersion}
          </span>
        )}

        {/* Auth section */}
        {!isLoading && (
          <>
            {profile ? (
              <div className="flex items-center gap-2">
                {profile.role === "admin" && (
                  <span className="mapsa-badge text-[9px]">Admin</span>
                )}
                <span className="font-garamond text-xs text-mapsa-muted hidden sm:inline">
                  {profile.full_name || profile.email}
                </span>
                <button
                  onClick={signOut}
                  className="mapsa-btn text-2xs"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link href="/auth" className="mapsa-btn-gold text-2xs">
                Sign In
              </Link>
            )}
          </>
        )}

        <button
          onClick={toggleTheme}
          className="mapsa-btn text-base leading-none"
          title="Toggle theme"
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </div>
    </header>
  );
}
