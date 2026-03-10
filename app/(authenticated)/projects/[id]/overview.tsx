"use client";

import type { Project } from "@/lib/types";
import Badge from "@/components/ui/badge";

export default function ProjectOverview({ project }: { project: Project }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Info card */}
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Thông tin dự án</h3>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-muted-foreground">Mô tả</dt>
              <dd className="mt-1 text-sm text-card-foreground">{project.description || "Chưa có mô tả"}</dd>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-muted-foreground">Ngày bắt đầu</dt>
                <dd className="mt-1 text-sm text-card-foreground font-medium">
                  {new Date(project.start_date).toLocaleDateString("vi-VN")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Ngày kết thúc</dt>
                <dd className="mt-1 text-sm text-card-foreground font-medium">
                  {project.end_date ? new Date(project.end_date).toLocaleDateString("vi-VN") : "Chưa xác định"}
                </dd>
              </div>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Người tạo</dt>
              <dd className="mt-1 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {project.owner?.fullname.charAt(0)}
                </div>
                <span className="text-sm text-card-foreground">{project.owner?.fullname}</span>
                <span className="text-xs text-muted-foreground">@{project.owner?.username}</span>
              </dd>
            </div>
          </dl>
        </div>

        {/* Recent deadlines */}
        {project.deadlines && project.deadlines.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Nhiệm vụ gần đây
            </h3>
            <div className="space-y-3">
              {project.deadlines.slice(0, 5).map((dl) => (
                <div key={dl.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{dl.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Hạn: {new Date(dl.deadline_date).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <Badge variant="status" value={dl.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar stats */}
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Thống kê</h3>
          <div className="space-y-3">
            <StatRow label="Thành viên" value={project.members?.length || 0} />
            <StatRow label="Tổng nhiệm vụ" value={project.deadlines?.length || 0} />
            <StatRow
              label="Hoàn thành"
              value={project.deadlines?.filter((d) => d.status === "DONE").length || 0}
            />
            <StatRow
              label="Đang thực hiện"
              value={project.deadlines?.filter((d) => d.status === "IN_PROGRESS").length || 0}
            />
          </div>
        </div>

        {/* Members preview */}
        {project.members && project.members.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Thành viên</h3>
            <div className="space-y-2">
              {project.members.slice(0, 6).map((m) => (
                <div key={m.user_id} className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                    {m.user?.fullname?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-card-foreground truncate">{m.user?.fullname}</p>
                  </div>
                  <Badge variant="role" value={m.role_in_project} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-card-foreground">{value}</span>
    </div>
  );
}
