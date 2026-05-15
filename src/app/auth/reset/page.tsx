"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const { error: err } = await supabase.auth.updateUser({
      password,
    });

    if (err) {
      setError(err.message);
    } else {
      setMessage("Password updated successfully. You can now sign in.");
    }
    setLoading(false);
  }

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
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-cinzel text-2xl text-mapsa-gold tracking-widest uppercase mb-2">
              Set New Password
            </h1>
          </div>

          <div className="rounded-md border border-mapsa-border p-6 bg-mapsa-panel">
            {error && (
              <div className="mb-4 p-3 rounded border border-mapsa-red/30 bg-mapsa-red/10 text-sm text-red-400 font-garamond">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-4 p-3 rounded border border-mapsa-gold/30 bg-mapsa-gold/10 text-sm text-mapsa-gold font-garamond">
                {message}
                <div className="mt-2">
                  <Link
                    href="/auth"
                    className="text-xs hover:text-mapsa-accent transition-colors underline"
                  >
                    Go to Sign In →
                  </Link>
                </div>
              </div>
            )}

            {!message && (
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="mapsa-label block mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mapsa-input"
                    minLength={8}
                    placeholder="Minimum 8 characters"
                  />
                </div>
                <div>
                  <label className="mapsa-label block mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="mapsa-input"
                    minLength={8}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="mapsa-btn-gold w-full py-2.5 text-xs disabled:opacity-50"
                >
                  {loading ? "Updating…" : "Update Password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
