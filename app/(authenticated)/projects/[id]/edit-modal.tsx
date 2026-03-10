"use client";

import { useState } from "react";
import { projects as projectsApi } from "@/lib/api";
import type { Project } from "@/lib/types";
import Modal from "@/components/ui/modal";
import { Input, Textarea, Button } from "@/components/ui/form";

interface Props {
  project: Project;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditProjectModal({ project, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    title: project.title,
    description: project.description || "",
    start_date: project.start_date.split("T")[0],
    end_date: project.end_date ? project.end_date.split("T")[0] : "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await projectsApi.update(project.id, {
        title: form.title,
        description: form.description || undefined,
        start_date: form.start_date,
        end_date: form.end_date || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Chỉnh sửa dự án">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">{error}</div>
        )}
        <Input label="Tên dự án *" value={form.title} onChange={(e) => update("title", e.target.value)} required />
        <Textarea
          label="Mô tả"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={3}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Ngày bắt đầu *" type="date" value={form.start_date} onChange={(e) => update("start_date", e.target.value)} required />
          <Input label="Ngày kết thúc" type="date" value={form.end_date} onChange={(e) => update("end_date", e.target.value)} min={form.start_date} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" loading={loading}>
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </Modal>
  );
}
