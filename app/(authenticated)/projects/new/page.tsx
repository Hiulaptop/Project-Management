"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { projects as projectsApi } from "@/lib/api";
import { Input, Textarea, Button } from "@/components/ui/form";

export default function NewProjectPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body: { title: string; description?: string; start_date: string; end_date?: string } = {
        title: form.title,
        start_date: form.start_date,
      };
      if (form.description) body.description = form.description;
      if (form.end_date) body.end_date = form.end_date;

      const data = await projectsApi.create(body);
      router.push(`/projects/${data.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      <div className="mb-6">
        <Link href="/projects" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Quay lại danh sách
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Tạo dự án mới</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-card p-6">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">{error}</div>
        )}

        <Input
          label="Tên dự án *"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="Nhập tên dự án"
          required
          autoFocus
        />

        <Textarea
          label="Mô tả"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Mô tả dự án (tuỳ chọn)"
          rows={3}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Ngày bắt đầu *"
            type="date"
            value={form.start_date}
            onChange={(e) => update("start_date", e.target.value)}
            required
          />
          <Input
            label="Ngày kết thúc"
            type="date"
            value={form.end_date}
            onChange={(e) => update("end_date", e.target.value)}
            min={form.start_date}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/projects">
            <Button type="button" variant="secondary">
              Huỷ
            </Button>
          </Link>
          <Button type="submit" loading={loading}>
            Tạo dự án
          </Button>
        </div>
      </form>
    </div>
  );
}
