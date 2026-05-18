"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Mode = "login" | "signup" | "forgot";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [orcid, setOrcid] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (err) {
      setError(err.message);
    } else {
      // Redirect happens via auth state change in AuthContext
      window.location.href = "/";
    }
    setLoading(false);
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (!fullName.trim()) {
      setError("Full name is required.");
      setLoading(false);
      return;
    }

    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          affiliation: affiliation.trim() || null,
          orcid: orcid.trim() || null,
        },
      },
    });

    if (err) {
      setError(err.message);
    } else {
      setMessage(
        "Check your email for a confirmation link. Once confirmed, you can log in."
      );
    }
    setLoading(false);
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });

    if (err) {
      setError(err.message);
    } else {
      setMessage("If an account exists with that email, a reset link has been sent.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col bg-mapsa-bg">
      {/* Minimal header */}
      <header className="flex items-center px-4 h-[52px] bg-mapsa-panel border-b border-mapsa-border">
        <Link
          href="/"
          className="font-cinzel text-[0.81rem] text-mapsa-gold tracking-[2px] uppercase hover:text-mapsa-accent transition-colors"
        >
          MAHC · MAPSA
        </Link>
        <span className="text-mapsa-border mx-2.5">|</span>
        <span className="font-cinzel text-[0.69rem] text-mapsa-muted tracking-wider">
          Monte Albán Inscription Registry
        </span>
      </header>

      {/* Auth form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="font-cinzel text-2xl text-mapsa-gold tracking-widest uppercase mb-2">
              {mode === "login"
                ? "Sign In"
                : mode === "signup"
                  ? "Request Access"
                  : "Reset Password"}
            </h1>
            <p className="font-garamond text-sm text-mapsa-muted italic">
              {mode === "login"
                ? "Access the inscription registry"
                : mode === "signup"
                  ? "Institutional or academic email required"
                  : "Enter your email to receive a reset link"}
            </p>
          </div>

          {/* Card */}
          <div className="rounded-md border border-mapsa-border p-6 bg-mapsa-panel">
            {error && (
              <div className="mb-4 p-3 rounded border border-mapsa-red/30 bg-mapsa-red/10 text-sm text-red-400 font-garamond">
                {error}
              </div>
            )}

            {message && (
              <div className="mb-4 p-3 rounded border border-mapsa-gold/30 bg-mapsa-gold/10 text-sm text-mapsa-gold font-garamond">
                {message}
              </div>
            )}

            {/* ─── Login Form ─── */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="mapsa-label block mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mapsa-input"
                    placeholder="you@university.edu"
                  />
                </div>
                <div>
                  <label className="mapsa-label block mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                  {loading ? "Signing in…" : "Sign In"}
                </button>
                <div className="flex justify-between text-xs font-garamond text-mapsa-muted pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setError("");
                      setMessage("");
                    }}
                    className="hover:text-mapsa-gold transition-colors"
                  >
                    Forgot password?
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setError("");
                      setMessage("");
                    }}
                    className="hover:text-mapsa-gold transition-colors"
                  >
                    Request access →
                  </button>
                </div>
              </form>
            )}

            {/* ─── Signup Form ─── */}
            {mode === "signup" && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="mapsa-label block mb-1.5">
                    Full Name <span className="text-mapsa-red">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="mapsa-input"
                    placeholder="Dr. Jane Smith"
                  />
                </div>
                <div>
                  <label className="mapsa-label block mb-1.5">
                    Institutional Email <span className="text-mapsa-red">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mapsa-input"
                    placeholder="you@university.edu"
                  />
                  <p className="text-[0.625rem] text-mapsa-muted mt-1 font-garamond italic">
                    Recognized academic domains are auto-approved. Others require
                    admin review.
                  </p>
                </div>
                <div>
                  <label className="mapsa-label block mb-1.5">
                    Password <span className="text-mapsa-red">*</span>
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
                    Institutional Affiliation
                  </label>
                  <input
                    type="text"
                    value={affiliation}
                    onChange={(e) => setAffiliation(e.target.value)}
                    className="mapsa-input"
                    placeholder="e.g. UNAM, Instituto de Investigaciones Antropológicas"
                  />
                </div>
                <div>
                  <label className="mapsa-label block mb-1.5">
                    ORCID <span className="text-mapsa-muted">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={orcid}
                    onChange={(e) => setOrcid(e.target.value)}
                    className="mapsa-input"
                    placeholder="0000-0000-0000-0000"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="mapsa-btn-gold w-full py-2.5 text-xs disabled:opacity-50"
                >
                  {loading ? "Submitting…" : "Request Access"}
                </button>
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError("");
                      setMessage("");
                    }}
                    className="text-xs font-garamond text-mapsa-muted hover:text-mapsa-gold transition-colors"
                  >
                    ← Already have an account? Sign in
                  </button>
                </div>
              </form>
            )}

            {/* ─── Forgot Password Form ─── */}
            {mode === "forgot" && (
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="mapsa-label block mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mapsa-input"
                    placeholder="you@university.edu"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="mapsa-btn-gold w-full py-2.5 text-xs disabled:opacity-50"
                >
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError("");
                      setMessage("");
                    }}
                    className="text-xs font-garamond text-mapsa-muted hover:text-mapsa-gold transition-colors"
                  >
                    ← Back to sign in
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Footer note */}
          <p className="mapsa-disclaimer mt-6 text-center border-l-0">
            MAPSA is an independent scholarly resource operated by Monte Albán
            Heritage Center. Registration is limited to researchers affiliated
            with academic or cultural heritage institutions.
          </p>
        </div>
      </div>
    </div>
  );
}
