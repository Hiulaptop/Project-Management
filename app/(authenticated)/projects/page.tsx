"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { projects as projectsApi } from "@/lib/api";
import type { Project } from "@/lib/types";
import { PageLoader, EmptyState } from "@/components/ui/spinner";
import Badge from "@/components/ui/badge";
import { Button } from "@/components/ui/form";

export default function ProjectsPage() {
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsApi.list().then((d) => setProjectList(d.projects)).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dự án</h1>
          <p className="text-sm text-muted-foreground mt-1">{projectList.length} dự án</p>
        </div>
        <Link href="/projects/new">
          <Button>+ Tạo dự án</Button>
        </Link>
      </div>

      {projectList.length === 0 ? (
        <EmptyState
          icon="📁"
          title="Chưa có dự án nào"
          description="Tạo dự án đầu tiên để bắt đầu quản lý công việc"
          action={
            <Link href="/projects/new">
              <Button>+ Tạo dự án mới</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectList.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors truncate flex-1">
                  {project.title}
                </h3>
              </div>
              {project.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{project.description}</p>
              )}
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span>📅 {new Date(project.start_date).toLocaleDateString("vi-VN")}</span>
                {project.end_date && (
                  <span>→ {new Date(project.end_date).toLocaleDateString("vi-VN")}</span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">👥 {project._count?.members || 0} thành viên</span>
                <span className="flex items-center gap-1">✅ {project._count?.deadlines || 0} nhiệm vụ</span>
              </div>
              {project.owner && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {project.owner.fullname.charAt(0)}
                  </div>
                  <span className="text-xs text-muted-foreground">{project.owner.fullname}</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
