import type { DeadlineStatus } from "@/lib/types";

const statusConfig: Record<DeadlineStatus, { label: string; color: string }> = {
  TODO: { label: "Todo", color: "bg-slate-100 text-slate-700" },
  IN_PROGRESS: { label: "Đang làm", color: "bg-blue-100 text-blue-700" },
  REVIEW: { label: "Review", color: "bg-amber-100 text-amber-700" },
  DONE: { label: "Hoàn thành", color: "bg-green-100 text-green-700" },
};

const roleConfig: Record<string, { label: string; color: string }> = {
  OWNER: { label: "Owner", color: "bg-purple-100 text-purple-700" },
  MANAGER: { label: "Manager", color: "bg-blue-100 text-blue-700" },
  MEMBER: { label: "Member", color: "bg-slate-100 text-slate-700" },
};

interface BadgeProps {
  variant?: "status" | "role" | "custom";
  value: string;
  className?: string;
}

export default function Badge({ variant = "custom", value, className = "" }: BadgeProps) {
  let config = { label: value, color: "bg-slate-100 text-slate-700" };

  if (variant === "status" && value in statusConfig) {
    config = statusConfig[value as DeadlineStatus];
  } else if (variant === "role" && value in roleConfig) {
    config = roleConfig[value];
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color} ${className}`}>
      {config.label}
    </span>
  );
}
