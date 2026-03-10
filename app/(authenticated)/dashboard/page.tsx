"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { projects as projectsApi, me as meApi } from "@/lib/api";
import type { Project, UserProfile } from "@/lib/types";
import { PageLoader, EmptyState } from "@/components/ui/spinner";
import Badge from "@/components/ui/badge";

export default function DashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [userData, projData] = await Promise.all([meApi.get(), projectsApi.list()]);
        setUser(userData.user);
        setProjectList(projData.projects);
      } catch {
        // handle
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <PageLoader />;

  // Calculate stats
  const totalProjects = projectList.length;
  const allDeadlines = projectList.reduce((acc, p) => acc + (p._count?.deadlines || 0), 0);
  const totalMembers = new Set(projectList.flatMap((p) => p.members?.map((m) => m.user_id) || [])).size;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Xin chào, {user?.fullname || "User"} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Đây là tổng quan về các hoạt động của bạn.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="📁" label="Dự án" value={totalProjects} color="bg-blue-50 text-blue-600" />
        <StatCard icon="✅" label="Nhiệm vụ" value={allDeadlines} color="bg-green-50 text-green-600" />
        <StatCard icon="👥" label="Cộng sự" value={totalMembers} color="bg-purple-50 text-purple-600" />
        <StatCard icon="🔔" label="Thông báo chưa đọc" value={0} color="bg-amber-50 text-amber-600" />
      </div>

      {/* Recent projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Dự án gần đây</h2>
          <Link href="/projects" className="text-sm text-primary hover:underline">
            Xem tất cả →
          </Link>
        </div>

        {projectList.length === 0 ? (
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
            {projectList.slice(0, 6).map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all"
              >
                <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors truncate">
                  {project.title}
                </h3>
                {project.description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                )}
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    👥 {project._count?.members || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    ✅ {project._count?.deadlines || 0}
                  </span>
                  {project.owner && (
                    <Badge variant="role" value={project.members?.find(m => m.user_id === project.owner_id)?.role_in_project || "OWNER"} />
                  )}
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
