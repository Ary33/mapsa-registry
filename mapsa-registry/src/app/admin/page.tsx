"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";
import Toolbar from "@/components/Toolbar";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";

interface RecordRow {
  id: string;
  title: string;
  site: string;
  area: string;
  structure: string;
  object_type: string;
  status: string[];
  created_at: string;
}

interface PendingUser {
  id: string;
  email: string;
  full_name: string;
  affiliation: string | null;
  created_at: string;
}

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminDashboard />
    </ProtectedRoute>
  );
}

function AdminDashboard() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [recordsRes, usersRes] = await Promise.all([
      supabase
        .from("records")
        .select("id, title, site, area, structure, object_type, status, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, email, full_name, affiliation, created_at")
        .eq("role", "pending")
        .order("created_at", { ascending: false }),
    ]);

    if (recordsRes.data) setRecords(recordsRes.data);
    if (usersRes.data) setPendingUsers(usersRes.data);
    setLoading(false);
  }

  async function approveUser(userId: string) {
    const { error } = await supabase
      .from("profiles")
      .update({ role: "researcher" })
      .eq("id", userId);

    if (error) {
      setMessage(`Error approving user: ${error.message}`);
    } else {
      setMessage("User approved as researcher.");
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
    }
  }

  async function deleteRecord(recordId: string) {
    if (!confirm(`Delete record ${recordId}? This cannot be undone.`)) return;

    const { error } = await supabase
      .from("records")
      .delete()
      .eq("id", recordId);

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
      setMessage(`Record ${recordId} deleted.`);
    }
  }

  return (
    <>
      <Toolbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-cinzel text-2xl text-mapsa-gold tracking-widest uppercase">
              Admin Dashboard
            </h1>
            <p className="font-garamond text-sm text-mapsa-muted mt-1">
              Manage records, images, elements, and researcher access.
            </p>
          </div>
          <Link href="/admin/records/new" className="mapsa-btn-gold text-xs">
            + New Record
          </Link>
        </div>

        {message && (
          <div className="mb-6 p-3 rounded border border-mapsa-gold/30 bg-mapsa-gold/10 text-sm text-mapsa-gold font-garamond">
            {message}
            <button
              onClick={() => setMessage("")}
              className="ml-3 text-xs opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Pending Users */}
        {pendingUsers.length > 0 && (
          <section className="mb-10">
            <h2 className="mapsa-section-title">
              Pending Approvals ({pendingUsers.length})
            </h2>
            <div className="space-y-2">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded border border-mapsa-border bg-mapsa-panel-alt"
                >
                  <div>
                    <p className="font-garamond text-sm text-mapsa-text">
                      {user.full_name || "No name provided"}
                    </p>
                    <p className="font-mono text-xs text-mapsa-muted">
                      {user.email}
                    </p>
                    {user.affiliation && (
                      <p className="font-garamond text-xs text-mapsa-muted italic">
                        {user.affiliation}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => approveUser(user.id)}
                    className="mapsa-btn-gold text-xs"
                  >
                    Approve
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Records */}
        <section>
          <h2 className="mapsa-section-title">
            Inscription Records ({records.length})
          </h2>

          {loading ? (
            <p className="font-garamond text-sm text-mapsa-muted italic">
              Loading…
            </p>
          ) : records.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-mapsa-border rounded-md">
              <p className="font-garamond text-base text-mapsa-muted mb-4">
                No records yet. Create your first inscription record.
              </p>
              <Link
                href="/admin/records/new"
                className="mapsa-btn-gold text-xs"
              >
                + New Record
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded border border-mapsa-border bg-mapsa-panel-alt"
                >
                  <div>
                    <p className="font-mono text-sm text-mapsa-gold-light">
                      {record.id}
                    </p>
                    <p className="font-garamond text-sm text-mapsa-text">
                      {record.title}
                    </p>
                    <p className="font-garamond text-xs text-mapsa-muted">
                      {record.structure} · {record.area}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/records/${record.id}`}
                      className="mapsa-btn-gold text-xs"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => deleteRecord(record.id)}
                      className="mapsa-btn text-xs text-red-400 border-red-400/30 hover:border-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
