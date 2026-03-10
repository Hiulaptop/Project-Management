"use client";

import { useState } from "react";
import type { Deadline, ProjectRole, DeadlineStatus } from "@/lib/types";
import { deadlines as dlApi } from "@/lib/api";
import { Button, Select } from "@/components/ui/form";
import Badge from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/spinner";
import CreateDeadlineModal from "@/app/(authenticated)/projects/[id]/create-deadline-modal";
import DeadlineDetailDrawer from "@/app/(authenticated)/projects/[id]/deadline-detail-drawer";

interface Props {
  projectId: string;
  deadlines: Deadline[];
  myRole: ProjectRole;
  onRefresh: () => void;
}

const statusFilters = [
  { value: "", label: "Tất cả" },
  { value: "TODO", label: "Todo" },
  { value: "IN_PROGRESS", label: "Đang làm" },
  { value: "REVIEW", label: "Review" },
  { value: "DONE", label: "Hoàn thành" },
];

export default function ProjectDeadlines({ projectId, deadlines, myRole, onRefresh }: Props) {
  const [filter, setFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDl, setSelectedDl] = useState<Deadline | null>(null);

  const canManage = myRole === "OWNER" || myRole === "MANAGER";

  const filtered = filter ? deadlines.filter((d) => d.status === filter) : deadlines;

  // Group by status
  const grouped: Record<string, Deadline[]> = {
    TODO: [],
    IN_PROGRESS: [],
    REVIEW: [],
    DONE: [],
  };
  filtered.forEach((d) => {
    if (grouped[d.status]) grouped[d.status].push(d);
  });

  async function handleStatusChange(deadlineId: string, newStatus: DeadlineStatus) {
    try {
      await dlApi.updateStatus(projectId, deadlineId, { status: newStatus });
      onRefresh();
    } catch {
      // handle
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <Select
          options={statusFilters}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-40"
        />
        {canManage && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            + Tạo nhiệm vụ
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="✅"
          title="Không có nhiệm vụ nào"
          description={filter ? "Thử thay đổi bộ lọc" : "Tạo nhiệm vụ đầu tiên cho dự án"}
        />
      ) : (
        <div className="space-y-6">
          {(Object.keys(grouped) as DeadlineStatus[]).map((status) =>
            grouped[status].length > 0 ? (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="status" value={status} />
                  <span className="text-xs text-muted-foreground">({grouped[status].length})</span>
                </div>
                <div className="space-y-2">
                  {grouped[status].map((dl) => (
                    <div
                      key={dl.id}
                      onClick={() => setSelectedDl(dl)}
                      className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 hover:shadow-sm hover:border-primary/20 transition-all cursor-pointer"
                    >
                      {/* Status quick-toggle */}
                      <select
                        value={dl.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleStatusChange(dl.id, e.target.value as DeadlineStatus);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-7 rounded border border-input bg-secondary px-1.5 text-xs text-secondary-foreground focus:outline-none"
                      >
                        <option value="TODO">Todo</option>
                        <option value="IN_PROGRESS">Đang làm</option>
                        <option value="REVIEW">Review</option>
                        <option value="DONE">Done</option>
                      </select>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-card-foreground truncate">{dl.title}</p>
                        {dl.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{dl.description}</p>
                        )}
                      </div>

                      {/* Assignees avatars */}
                      {dl.assignees && dl.assignees.length > 0 && (
                        <div className="flex -space-x-1.5">
                          {dl.assignees.slice(0, 3).map((a) => (
                            <div
                              key={a.user_id}
                              title={a.user?.fullname}
                              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-secondary text-[10px] font-medium text-secondary-foreground"
                            >
                              {a.user?.fullname?.charAt(0) || "?"}
                            </div>
                          ))}
                          {dl.assignees.length > 3 && (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground">
                              +{dl.assignees.length - 3}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Date */}
                      <span
                        className={`text-xs whitespace-nowrap ${
                          new Date(dl.deadline_date) < new Date() && dl.status !== "DONE"
                            ? "text-destructive font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {new Date(dl.deadline_date).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateDeadlineModal
          projectId={projectId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            onRefresh();
          }}
        />
      )}

      {/* Detail drawer */}
      {selectedDl && (
        <DeadlineDetailDrawer
          projectId={projectId}
          deadline={selectedDl}
          myRole={myRole}
          onClose={() => setSelectedDl(null)}
          onRefresh={() => {
            setSelectedDl(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
