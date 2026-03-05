"use client";

import { useState } from "react";
import type { ProjectMember, ProjectRole, SearchUser } from "@/lib/types";
import { members as membersApi, users as usersApi } from "@/lib/api";
import { Button, Input, Select } from "@/components/ui/form";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/spinner";

interface Props {
  projectId: string;
  members: ProjectMember[];
  myRole: ProjectRole;
  onRefresh: () => void;
}

export default function ProjectMembers({ projectId, members, myRole, onRefresh }: Props) {
  const canManage = myRole === "OWNER" || myRole === "MANAGER";
  const isOwner = myRole === "OWNER";
  const [showAdd, setShowAdd] = useState(false);
  const [changingRole, setChangingRole] = useState<string | null>(null);

  async function handleRoleChange(userId: string, role: string) {
    try {
      await membersApi.updateRole(projectId, userId, { role_in_project: role });
      setChangingRole(null);
      onRefresh();
    } catch {
      // handle
    }
  }

  async function handleRemove(userId: string, name: string) {
    if (!confirm(`Bạn có chắc muốn xoá ${name} khỏi dự án?`)) return;
    try {
      await membersApi.remove(projectId, userId);
      onRefresh();
    } catch {
      // handle
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm text-muted-foreground">{members.length} thành viên</h3>
        {canManage && (
          <Button size="sm" onClick={() => setShowAdd(true)}>
            + Thêm thành viên
          </Button>
        )}
      </div>

      {members.length === 0 ? (
        <EmptyState icon="👥" title="Chưa có thành viên nào" />
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {m.user?.fullname?.charAt(0) || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-card-foreground">{m.user?.fullname}</p>
                <p className="text-xs text-muted-foreground">@{m.user?.username} · {m.user?.email}</p>
              </div>

              <div className="flex items-center gap-2">
                {isOwner && m.role_in_project !== "OWNER" ? (
                  changingRole === m.user_id ? (
                    <div className="flex items-center gap-1">
                      <Select
                        options={[
                          { value: "MANAGER", label: "Manager" },
                          { value: "MEMBER", label: "Member" },
                        ]}
                        value={m.role_in_project}
                        onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                        className="w-28 text-xs"
                      />
                      <button onClick={() => setChangingRole(null)} className="text-xs text-muted-foreground hover:underline">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setChangingRole(m.user_id)}>
                      <Badge variant="role" value={m.role_in_project} className="cursor-pointer hover:opacity-80" />
                    </button>
                  )
                ) : (
                  <Badge variant="role" value={m.role_in_project} />
                )}

                {isOwner && m.role_in_project !== "OWNER" && (
                  <button
                    onClick={() => handleRemove(m.user_id, m.user?.fullname || "")}
                    className="text-xs text-destructive hover:underline ml-2"
                  >
                    Xoá
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddMemberModal
          projectId={projectId}
          existingMemberIds={members.map((m) => m.user_id)}
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

// ─── Add Member Modal ───
function AddMemberModal({
  projectId,
  existingMemberIds,
  onClose,
  onAdded,
}: {
  projectId: string;
  existingMemberIds: string[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleSearch() {
    if (search.length < 2) return;
    setSearching(true);
    try {
      const data = await usersApi.search(search);
      setResults(data.users.filter((u) => !existingMemberIds.includes(u.id)));
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(userId: string, role = "MEMBER") {
    setError("");
    setAdding(userId);
    try {
      await membersApi.add(projectId, { user_id: userId, role_in_project: role });
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setAdding(null);
    }
  }

  return (
    <Modal open onClose={onClose} title="Thêm thành viên">
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">{error}</div>
        )}

        <div className="flex gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Tìm kiếm theo tên, email, username..."
            className="flex-1"
          />
          <Button onClick={handleSearch} loading={searching} size="md">
            Tìm
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">Chỉ có thể thêm đồng nghiệp đã kết nối.</p>

        <div className="max-h-64 overflow-y-auto space-y-2">
          {results.length === 0 && !searching && search.length >= 2 && (
            <p className="text-sm text-muted-foreground text-center py-4">Không tìm thấy kết quả</p>
          )}
          {results.map((user) => (
            <div key={user.id} className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {user.fullname.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-card-foreground">{user.fullname}</p>
                <p className="text-xs text-muted-foreground">@{user.username} · {user.email}</p>
              </div>
              {user.colleague_status === "ACCEPTED" ? (
                <Button size="sm" onClick={() => handleAdd(user.id)} loading={adding === user.id}>
                  Thêm
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {user.colleague_status === "PENDING" ? "Đang chờ" : "Chưa kết nối"}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
