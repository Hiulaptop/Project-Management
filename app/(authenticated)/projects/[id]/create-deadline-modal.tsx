"use client";

import { useState, useEffect, type FormEvent } from "react";
import { deadlines as dlApi, members as membersApi } from "@/lib/api";
import type { ProjectMember } from "@/lib/types";
import Modal from "@/components/ui/modal";
import { Input, Textarea, Button } from "@/components/ui/form";

interface Props {
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateDeadlineModal({ projectId, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    deadline_date: "",
  });
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [membersList, setMembersList] = useState<ProjectMember[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    membersApi.list(projectId).then((d) => setMembersList(d.members)).catch(() => {});
  }, [projectId]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleAssignee(userId: string) {
    setSelectedAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await dlApi.create(projectId, {
        title: form.title,
        description: form.description || undefined,
        deadline_date: form.deadline_date,
        assignee_ids: selectedAssignees.length > 0 ? selectedAssignees : undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Tạo nhiệm vụ mới" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">{error}</div>
        )}

        <Input
          label="Tiêu đề *"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="Tên nhiệm vụ"
          required
          autoFocus
        />

        <Textarea
          label="Mô tả"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Mô tả chi tiết (tuỳ chọn)"
          rows={2}
        />

        <Input
          label="Ngày hết hạn *"
          type="date"
          value={form.deadline_date}
          onChange={(e) => update("deadline_date", e.target.value)}
          required
        />

        {/* Assignees */}
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">Gán cho</label>
          <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-input p-2">
            {membersList.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">Đang tải...</p>
            ) : (
              membersList.map((m) => (
                <label
                  key={m.user_id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-secondary cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedAssignees.includes(m.user_id)}
                    onChange={() => toggleAssignee(m.user_id)}
                    className="rounded border-input"
                  />
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {m.user?.fullname?.charAt(0) || "?"}
                  </div>
                  <span className="text-sm text-card-foreground">{m.user?.fullname}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{m.role_in_project}</span>
                </label>
              ))
            )}
          </div>
          {selectedAssignees.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">{selectedAssignees.length} người được chọn</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" loading={loading}>
            Tạo nhiệm vụ
          </Button>
        </div>
      </form>
    </Modal>
  );
}
