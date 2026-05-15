"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    // Supabase redirects here after email confirmation with hash params
    // The supabase client auto-processes the hash and establishes the session
    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.push("/");
      } else if (event === "PASSWORD_RECOVERY") {
        router.push("/auth/reset");
      }
    });

    // Fallback: if already signed in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/");
      }
    });

    // Timeout fallback
    const timeout = setTimeout(() => {
      setError("Something went wrong. Please try signing in manually.");
    }, 10000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-mapsa-bg">
      <div className="text-center">
        {error ? (
          <div>
            <p className="font-garamond text-sm text-red-400 mb-4">{error}</p>
            <a
              href="/auth"
              className="mapsa-btn-gold px-4 py-2 text-xs"
            >
              Go to Sign In
            </a>
          </div>
        ) : (
          <div>
            <p className="font-cinzel text-sm text-mapsa-gold tracking-wider uppercase mb-2">
              Confirming your account…
            </p>
            <p className="font-garamond text-xs text-mapsa-muted italic">
              You will be redirected momentarily.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
