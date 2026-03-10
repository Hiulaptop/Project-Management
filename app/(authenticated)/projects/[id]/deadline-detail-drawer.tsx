"use client";

import { useState } from "react";
import type { Deadline, ProjectRole, DeadlineStatus } from "@/lib/types";
import { deadlines as dlApi } from "@/lib/api";
import { Button, Input, Textarea, Select } from "@/components/ui/form";
import Badge from "@/components/ui/badge";

interface Props {
  projectId: string;
  deadline: Deadline;
  myRole: ProjectRole;
  onClose: () => void;
  onRefresh: () => void;
}

export default function DeadlineDetailDrawer({ projectId, deadline, myRole, onClose, onRefresh }: Props) {
  const canManage = myRole === "OWNER" || myRole === "MANAGER";
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: deadline.title,
    description: deadline.description || "",
    deadline_date: deadline.deadline_date.split("T")[0],
  });
  const [feedbackText, setFeedbackText] = useState(deadline.feedback || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setError("");
    setLoading(true);
    try {
      await dlApi.update(projectId, deadline.id, {
        title: editForm.title,
        description: editForm.description,
        deadline_date: editForm.deadline_date,
      });
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(status: DeadlineStatus) {
    try {
      await dlApi.updateStatus(projectId, deadline.id, { status });
      onRefresh();
    } catch {
      // ignore
    }
  }

  async function handleFeedback() {
    try {
      await dlApi.updateFeedback(projectId, deadline.id, { feedback: feedbackText });
      onRefresh();
    } catch {
      // ignore
    }
  }

  async function handleDelete() {
    if (!confirm("Bạn có chắc muốn xoá nhiệm vụ này?")) return;
    setDeleting(true);
    try {
      await dlApi.delete(projectId, deadline.id);
      onRefresh();
    } catch {
      setDeleting(false);
    }
  }

  async function handleRemoveAssignee(userId: string) {
    try {
      await dlApi.removeAssignee(projectId, deadline.id, userId);
      onRefresh();
    } catch {
      // ignore
    }
  }

  const isOverdue = new Date(deadline.deadline_date) < new Date() && deadline.status !== "DONE";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="animate-slideIn relative w-full max-w-lg bg-card border-l border-border shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-lg font-semibold text-card-foreground">Chi tiết nhiệm vụ</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">{error}</div>
          )}

          {isEditing ? (
            /* Edit mode */
            <div className="space-y-4">
              <Input label="Tiêu đề" value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
              <Textarea label="Mô tả" value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
              <Input label="Ngày hết hạn" type="date" value={editForm.deadline_date} onChange={(e) => setEditForm((f) => ({ ...f, deadline_date: e.target.value }))} />
              <div className="flex gap-2">
                <Button size="sm" loading={loading} onClick={handleSave}>Lưu</Button>
                <Button size="sm" variant="secondary" onClick={() => setIsEditing(false)}>Huỷ</Button>
              </div>
            </div>
          ) : (
            /* View mode */
            <>
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xl font-semibold text-card-foreground">{deadline.title}</h3>
                  {canManage && (
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>✏️</Button>
                  )}
                </div>
                {deadline.description && (
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{deadline.description}</p>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Trạng thái:</span>
                <Select
                  options={[
                    { value: "TODO", label: "Todo" },
                    { value: "IN_PROGRESS", label: "Đang làm" },
                    { value: "REVIEW", label: "Review" },
                    { value: "DONE", label: "Hoàn thành" },
                  ]}
                  value={deadline.status}
                  onChange={(e) => handleStatusChange(e.target.value as DeadlineStatus)}
                  className="w-36"
                />
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Ngày hết hạn</p>
                  <p className={`font-medium ${isOverdue ? "text-destructive" : "text-card-foreground"}`}>
                    {new Date(deadline.deadline_date).toLocaleDateString("vi-VN")}
                    {isOverdue && " (Quá hạn)"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Người giao</p>
                  <p className="font-medium text-card-foreground">{deadline.setter?.fullname || "N/A"}</p>
                </div>
              </div>
            </>
          )}

          {/* Assignees */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Người thực hiện ({deadline.assignees?.length || 0})</h4>
            {deadline.assignees && deadline.assignees.length > 0 ? (
              <div className="space-y-2">
                {deadline.assignees.map((a) => (
                  <div key={a.user_id} className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {a.user?.fullname?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-card-foreground">{a.user?.fullname}</p>
                      <p className="text-xs text-muted-foreground">@{a.user?.username}</p>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => handleRemoveAssignee(a.user_id)}
                        className="text-xs text-destructive hover:underline"
                      >
                        Xoá
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có ai được gán</p>
            )}
          </div>

          {/* Feedback */}
          {canManage && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Feedback</h4>
              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Nhập nhận xét..."
                rows={3}
              />
              <Button size="sm" variant="secondary" className="mt-2" onClick={handleFeedback}>
                Lưu feedback
              </Button>
            </div>
          )}

          {!canManage && deadline.feedback && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Feedback</h4>
              <div className="rounded-lg bg-secondary/50 p-3 text-sm text-card-foreground whitespace-pre-wrap">
                {deadline.feedback}
              </div>
            </div>
          )}

          {/* Delete */}
          {canManage && (
            <div className="pt-4 border-t border-border">
              <Button variant="destructive" size="sm" onClick={handleDelete} loading={deleting}>
                🗑️ Xoá nhiệm vụ
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
