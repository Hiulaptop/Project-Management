"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { me as meApi, dashboard as dashApi } from "@/lib/api";
import type { UserProfile } from "@/lib/types";
import { PageLoader, EmptyState } from "@/components/ui/spinner";

interface DashboardStats {
  totalProjects: number;
  totalDeadlines: number;
  statusCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  overdueCount: number;
  averageCompletion: number;
  myAssignments: number;
  projects: Array<{
    id: string;
    title: string;
    totalDeadlines: number;
    completedDeadlines: number;
    memberCount: number;
    averageCompletion: number;
  }>;
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [userData, statsData] = await Promise.all([meApi.get(), dashApi.stats()]);
        setUser(userData.user);
        setStats(statsData);
      } catch {
        // handle
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <PageLoader />;

  const s = stats;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Xin chào, {user?.fullname || "User"} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Đây là tổng quan về các hoạt động của bạn.</p>
      </div>

      {/* Stats row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="📁" label="Dự án" value={s?.totalProjects ?? 0} color="bg-blue-50 text-blue-600" />
        <StatCard icon="✅" label="Nhiệm vụ" value={s?.totalDeadlines ?? 0} color="bg-green-50 text-green-600" />
        <StatCard icon="🔥" label="Quá hạn" value={s?.overdueCount ?? 0} color="bg-red-50 text-red-600" />
        <StatCard icon="📌" label="Được giao cho tôi" value={s?.myAssignments ?? 0} color="bg-purple-50 text-purple-600" />
      </div>

      {/* Progress + Status/Priority breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Average Completion */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Tiến độ trung bình</h3>
          <div className="flex items-center justify-center">
            <div className="relative h-28 w-28">
              <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-secondary" />
                <circle
                  cx="50" cy="50" r="40"
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="text-primary"
                  strokeDasharray={`${(s?.averageCompletion ?? 0) * 2.51} 251`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{s?.averageCompletion ?? 0}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Theo trạng thái</h3>
          <div className="space-y-2">
            {[
              { key: "TODO", label: "Todo", color: "bg-slate-400" },
              { key: "IN_PROGRESS", label: "Đang làm", color: "bg-blue-400" },
              { key: "REVIEW", label: "Review", color: "bg-amber-400" },
              { key: "DONE", label: "Hoàn thành", color: "bg-green-400" },
            ].map((item) => {
              const count = s?.statusCounts?.[item.key] ?? 0;
              const total = s?.totalDeadlines ?? 1;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={item.key} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  <span className="text-sm text-card-foreground flex-1">{item.label}</span>
                  <span className="text-sm font-medium text-card-foreground">{count}</span>
                  <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority breakdown */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Theo độ ưu tiên</h3>
          <div className="space-y-2">
            {[
              { key: "HIGH", label: "Cao", color: "bg-red-400" },
              { key: "MEDIUM", label: "Trung bình", color: "bg-amber-400" },
              { key: "LOW", label: "Thấp", color: "bg-green-400" },
            ].map((item) => {
              const count = s?.priorityCounts?.[item.key] ?? 0;
              const total = s?.totalDeadlines ?? 1;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={item.key} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  <span className="text-sm text-card-foreground flex-1">{item.label}</span>
                  <span className="text-sm font-medium text-card-foreground">{count}</span>
                  <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Project list with progress bars */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Dự án</h2>
          <Link href="/projects" className="text-sm text-primary hover:underline">
            Xem tất cả →
          </Link>
        </div>

        {(!s?.projects || s.projects.length === 0) ? (
          <EmptyState
            icon="📁"
            title="Chưa có dự án nào"
            description="Tạo dự án đầu tiên để bắt đầu"
            action={
              <Link
                href="/projects/new"
                className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
              >
                + Tạo dự án
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {s.projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all"
              >
                <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors truncate">
                  {project.title}
                </h3>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>{project.completedDeadlines}/{project.totalDeadlines} nhiệm vụ hoàn thành</span>
                    <span>{project.averageCompletion}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full transition-all ${
                        project.averageCompletion === 100
                          ? "bg-green-500"
                          : project.averageCompletion >= 50
                          ? "bg-blue-500"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${project.averageCompletion}%` }}
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">👥 {project.memberCount}</span>
                  <span className="flex items-center gap-1">✅ {project.totalDeadlines}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg ${color}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-card-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
