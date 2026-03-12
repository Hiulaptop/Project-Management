"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { projects as projectsApi, projectCopy } from "@/lib/api";
import type { Project, ProjectRole } from "@/lib/types";
import { PageLoader } from "@/components/ui/spinner";
import { Button } from "@/components/ui/form";
import Badge from "@/components/ui/badge";
import ProjectOverview from "@/app/(authenticated)/projects/[id]/overview";
import ProjectDeadlines from "@/app/(authenticated)/projects/[id]/deadlines";
import ProjectMembers from "@/app/(authenticated)/projects/[id]/members";
import EditProjectModal from "@/app/(authenticated)/projects/[id]/edit-modal";
import ActivityTimeline from "@/app/(authenticated)/projects/[id]/activity-timeline";

type Tab = "overview" | "deadlines" | "members" | "activity";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showEdit, setShowEdit] = useState(false);
  const [myRole, setMyRole] = useState<ProjectRole>("MEMBER");
  const [copying, setCopying] = useState(false);

  const loadProject = useCallback(async () => {
    try {
      const data = await projectsApi.get(id);
      setProject(data.project);
    } catch {
      router.push("/projects");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // Determine user role in this project
  useEffect(() => {
    if (!project) return;
    import("@/lib/api").then(({ me }) =>
      me.get().then((d) => {
        const membership = project.members?.find((m) => m.user_id === d.user.id);
        if (membership) setMyRole(membership.role_in_project);
      })
    );
  }, [project]);

  if (loading) return <PageLoader />;
  if (!project) return null;

  const canEdit = myRole === "OWNER" || myRole === "MANAGER";

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Tổng quan" },
    { key: "deadlines", label: "Nhiệm vụ", count: project.deadlines?.length || 0 },
    { key: "members", label: "Thành viên", count: project.members?.length || 0 },
    { key: "activity", label: "Nhật ký" },
  ];

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link href="/projects" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Danh sách dự án
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{project.title}</h1>
            <Badge variant="role" value={myRole} />
          </div>
          {project.description && (
            <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={async () => {
              const title = prompt("Tên dự án mới:", `${project.title} (Bản sao)`);
              if (!title) return;
              setCopying(true);
              try {
                const data = await projectCopy.copy(id, { title });
                router.push(`/projects/${data.project.id}`);
              } catch {
                setCopying(false);
              }
            }} loading={copying}>
              📋 Sao chép
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowEdit(true)}>
              ✏️ Chỉnh sửa
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 text-xs text-muted-foreground">({tab.count})</span>
            )}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && <ProjectOverview project={project} />}
      {activeTab === "deadlines" && (
        <ProjectDeadlines projectId={id} deadlines={project.deadlines || []} myRole={myRole} onRefresh={loadProject} />
      )}
      {activeTab === "members" && (
        <ProjectMembers projectId={id} members={project.members || []} myRole={myRole} onRefresh={loadProject} />
      )}
      {activeTab === "activity" && <ActivityTimeline projectId={id} />}

      {/* Edit modal */}
      {showEdit && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            loadProject();
          }}
        />
      )}
    </div>
  );
}
