"use client";

import { useState } from "react";
import type { Deadline, ProjectRole, DeadlineStatus } from "@/lib/types";
import { deadlines as dlApi, deadlineCopy } from "@/lib/api";
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

const priorityFilters = [
  { value: "", label: "Tất cả ưu tiên" },
  { value: "HIGH", label: "Cao" },
  { value: "MEDIUM", label: "Trung bình" },
  { value: "LOW", label: "Thấp" },
];

export default function ProjectDeadlines({ projectId, deadlines, myRole, onRefresh }: Props) {
  const [filter, setFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDl, setSelectedDl] = useState<Deadline | null>(null);

  const canManage = myRole === "OWNER" || myRole === "MANAGER";

  const filtered = deadlines.filter((d) => {
    if (filter && d.status !== filter) return false;
    if (priorityFilter && d.priority !== priorityFilter) return false;
    return true;
  });

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

  async function handleCopyDeadline(e: React.MouseEvent, deadlineId: string) {
    e.stopPropagation();
    try {
      await deadlineCopy.copy(projectId, deadlineId);
      onRefresh();
    } catch {
      // handle
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select
            options={statusFilters}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-40"
          />
          <Select
            options={priorityFilters}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-44"
          />
        </div>
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
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-card-foreground truncate">{dl.title}</p>
                          {dl.priority && <Badge variant="priority" value={dl.priority} />}
                        </div>
                        {dl.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{dl.description}</p>
                        )}
                        {/* Completion bar */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="h-1.5 flex-1 max-w-[120px] rounded-full bg-secondary">
                            <div
                              className={`h-full rounded-full transition-all ${
                                dl.completion === 100
                                  ? "bg-green-500"
                                  : dl.completion >= 50
                                  ? "bg-blue-500"
                                  : "bg-amber-500"
                              }`}
                              style={{ width: `${dl.completion}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{dl.completion}%</span>
                        </div>
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

                      {/* Date + Copy */}
                      <span
                        className={`text-xs whitespace-nowrap ${
                          new Date(dl.deadline_date) < new Date() && dl.status !== "DONE"
                            ? "text-destructive font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {new Date(dl.deadline_date).toLocaleDateString("vi-VN")}
                      </span>

                      {canManage && (
                        <button
                          onClick={(e) => handleCopyDeadline(e, dl.id)}
                          title="Nhân bản nhiệm vụ"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                        >
                          📋
                        </button>
                      )}
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
