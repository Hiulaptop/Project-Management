"use client";

import { useState, useEffect, useCallback } from "react";
import { activities as activitiesApi } from "@/lib/api";
import type { ActivityLog } from "@/lib/types";
import { PageLoader, EmptyState } from "@/components/ui/spinner";
import { Button } from "@/components/ui/form";

interface Props {
  projectId: string;
}

const actionLabels: Record<string, string> = {
  PROJECT_UPDATED: "Cập nhật dự án",
  PROJECT_COPIED: "Sao chép dự án",
  PROJECT_CREATED: "Tạo dự án",
  MEMBER_ADDED: "Thêm thành viên",
  MEMBER_ROLE_CHANGED: "Đổi vai trò",
  MEMBER_REMOVED: "Xoá thành viên",
  DEADLINE_CREATED: "Tạo nhiệm vụ",
  DEADLINE_UPDATED: "Cập nhật nhiệm vụ",
  DEADLINE_DELETED: "Xoá nhiệm vụ",
  DEADLINE_STATUS_CHANGED: "Đổi trạng thái",
  DEADLINE_COPIED: "Sao chép nhiệm vụ",
};

export default function ActivityTimeline({ projectId }: Props) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await activitiesApi.list(projectId);
      setLogs(data.activities);
      setNextCursor(data.nextCursor);
    } catch {
      // handle
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await activitiesApi.list(projectId, { cursor: nextCursor });
      setLogs((prev) => [...prev, ...data.activities]);
      setNextCursor(data.nextCursor);
    } catch {
      // handle
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) return <PageLoader />;

  if (logs.length === 0) {
    return (
      <EmptyState
        icon="📝"
        title="Chưa có hoạt động nào"
        description="Các hoạt động trong dự án sẽ được ghi lại ở đây"
      />
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Nhật ký hoạt động</h3>
      <div className="relative space-y-0">
        {/* Timeline line */}
        <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

        {logs.map((log) => (
          <div key={log.id} className="relative flex gap-4 pb-4">
            {/* Dot */}
            <div className="relative z-10 mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary border-2 border-border">
              <span className="text-xs">
                {log.action.includes("CREATE") ? "✨" :
                 log.action.includes("DELETE") || log.action.includes("REMOVE") ? "🗑️" :
                 log.action.includes("COPY") ? "📋" :
                 log.action.includes("MEMBER") ? "👤" : "✏️"}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-card-foreground">
                  {log.user?.fullname || "Hệ thống"}
                </span>
                <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                  {actionLabels[log.action] || log.action}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{log.details}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(log.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>
          </div>
        ))}
      </div>

      {nextCursor && (
        <div className="flex justify-center">
          <Button variant="secondary" size="sm" onClick={loadMore} loading={loadingMore}>
            Tải thêm
          </Button>
        </div>
      )}
    </div>
  );
}
