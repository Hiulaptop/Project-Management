"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { gantt as ganttApi } from "@/lib/api";
import { PageLoader, EmptyState } from "@/components/ui/spinner";
import Badge from "@/components/ui/badge";

interface GanttItem {
  id: string;
  title: string;
  start: string;
  end: string;
  status: string;
  priority: string | null;
  completion: number;
  assignees: Array<{ id: string; fullname: string; username: string }>;
}

export default function GanttPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [projectTitle, setProjectTitle] = useState("");
  const [items, setItems] = useState<GanttItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ganttApi
      .getData(id)
      .then((data) => {
        setProjectTitle(data.project.title);
        setItems(data.items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader />;

  // Calculate timeline range
  const allDates = items.flatMap((item) => [new Date(item.start), new Date(item.end)]);
  const minDate = allDates.length > 0 ? new Date(Math.min(...allDates.map((d) => d.getTime()))) : new Date();
  const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : new Date();
  const totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));

  function getBarStyle(start: string, end: string) {
    const s = new Date(start);
    const e = new Date(end);
    const startOffset = Math.max(0, (s.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.max(1, (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    const leftPercent = (startOffset / totalDays) * 100;
    const widthPercent = Math.max(2, (duration / totalDays) * 100);
    return { left: `${leftPercent}%`, width: `${widthPercent}%` };
  }

  function getBarColor(status: string) {
    switch (status) {
      case "DONE": return "bg-green-400";
      case "IN_PROGRESS": return "bg-blue-400";
      case "REVIEW": return "bg-amber-400";
      default: return "bg-slate-300";
    }
  }

  // Generate month labels
  const months: { label: string; leftPercent: number }[] = [];
  const cursor = new Date(minDate);
  cursor.setDate(1);
  while (cursor <= maxDate) {
    const offset = Math.max(0, (cursor.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    months.push({
      label: cursor.toLocaleDateString("vi-VN", { month: "short", year: "numeric" }),
      leftPercent: (offset / totalDays) * 100,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return (
    <div className="max-w-7xl mx-auto animate-fadeIn">
      <div className="mb-4">
        <Link href={`/projects/${id}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← {projectTitle || "Quay lại"}
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-6">📊 Biểu đồ Gantt</h1>

      {items.length === 0 ? (
        <EmptyState icon="📊" title="Chưa có nhiệm vụ" description="Tạo nhiệm vụ để hiển thị biểu đồ Gantt" />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Month headers */}
          <div className="relative h-8 border-b border-border bg-secondary/50">
            {months.map((m, i) => (
              <div key={i} className="absolute top-0 text-[10px] text-muted-foreground px-1 py-1.5" style={{ left: `calc(200px + ${m.leftPercent}%)` }}>
                {m.label}
              </div>
            ))}
          </div>

          {/* Rows */}
          {items.map((item) => {
            const style = getBarStyle(item.start, item.end);
            const isOverdue = new Date(item.end) < new Date() && item.status !== "DONE";

            return (
              <div key={item.id} className="flex items-center border-b border-border last:border-b-0 hover:bg-secondary/20 transition-colors">
                {/* Task name column */}
                <div className="w-[200px] shrink-0 px-4 py-3 border-r border-border">
                  <p className="text-sm font-medium text-card-foreground truncate">{item.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="status" value={item.status} className="text-[10px]" />
                    {item.priority && <Badge variant="priority" value={item.priority} className="text-[10px]" />}
                  </div>
                </div>

                {/* Bar area */}
                <div className="relative flex-1 h-14 overflow-hidden">
                  {/* Today line */}
                  {(() => {
                    const todayOffset = (new Date().getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
                    const todayPercent = (todayOffset / totalDays) * 100;
                    if (todayPercent >= 0 && todayPercent <= 100) {
                      return <div className="absolute top-0 bottom-0 w-px bg-red-400 z-10" style={{ left: `${todayPercent}%` }} />;
                    }
                    return null;
                  })()}

                  {/* Bar */}
                  <div
                    className={`absolute top-3 h-8 rounded-md ${getBarColor(item.status)} ${isOverdue ? "ring-2 ring-red-400" : ""} flex items-center px-2 overflow-hidden`}
                    style={style}
                    title={`${item.title}: ${new Date(item.start).toLocaleDateString("vi-VN")} → ${new Date(item.end).toLocaleDateString("vi-VN")} (${item.completion}%)`}
                  >
                    {/* Completion fill */}
                    <div
                      className="absolute inset-0 bg-black/10 rounded-md"
                      style={{ width: `${item.completion}%` }}
                    />
                    <span className="relative text-[10px] text-white font-medium truncate">
                      {item.completion}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
