"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "researcher";
}

export default function ProtectedRoute({
  children,
  requiredRole = "researcher",
}: ProtectedRouteProps) {
  const { profile, isLoading, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!session) {
      router.push("/auth");
      return;
    }

    if (!profile) {
      // Session exists but no profile — could be a timing issue
      return;
    }

    if (profile.role === "pending") {
      router.push("/pending");
      return;
    }

    if (requiredRole === "admin" && profile.role !== "admin") {
      router.push("/");
      return;
    }
  }, [isLoading, session, profile, requiredRole, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mapsa-bg">
        <p className="font-cinzel text-sm text-mapsa-gold tracking-wider uppercase">
          Loading…
        </p>
      </div>
    );
  }

  if (!session || !profile) return null;
  if (profile.role === "pending") return null;
  if (requiredRole === "admin" && profile.role !== "admin") return null;

  return <>{children}</>;
}
