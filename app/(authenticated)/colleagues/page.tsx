"use client";

import { useState, useEffect } from "react";
import { colleagues as colApi, users as usersApi } from "@/lib/api";
import type { Colleague, ColleagueRequest, SearchUser } from "@/lib/types";
import { PageLoader, EmptyState } from "@/components/ui/spinner";
import { Button, Input } from "@/components/ui/form";
import Badge from "@/components/ui/badge";

type Tab = "list" | "requests" | "search";

export default function ColleaguesPage() {
  const [tab, setTab] = useState<Tab>("list");
  const [colleagueList, setColleagueList] = useState<Colleague[]>([]);
  const [requests, setRequests] = useState<ColleagueRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Search
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [colData, reqData] = await Promise.all([colApi.list(), colApi.requests()]);
      setColleagueList(colData.colleagues);
      setRequests(reqData.requests);
    } catch {
      // handle
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (search.length < 2) return;
    setSearching(true);
    try {
      const data = await usersApi.search(search);
      setSearchResults(data.users);
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }

  async function handleSendInvite(userId: string) {
    setActionLoading(userId);
    try {
      await colApi.sendInvite({ receiver_id: userId });
      // Update search results to reflect new status
      setSearchResults((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, colleague_status: "PENDING" as const } : u))
      );
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAccept(userId: string) {
    setActionLoading(userId);
    try {
      await colApi.accept(userId);
      loadData();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(userId: string) {
    setActionLoading(userId);
    try {
      await colApi.remove(userId);
      loadData();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm("Bạn có chắc muốn xoá đồng nghiệp này?")) return;
    setActionLoading(userId);
    try {
      await colApi.remove(userId);
      loadData();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <PageLoader />;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "list", label: "Đồng nghiệp", count: colleagueList.length },
    { key: "requests", label: "Lời mời", count: requests.length },
    { key: "search", label: "Tìm kiếm" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Đồng nghiệp</h1>
        <p className="text-sm text-muted-foreground mt-1">Quản lý kết nối đồng nghiệp của bạn</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/10 text-xs text-primary px-1">
                {t.count}
              </span>
            )}
            {tab === t.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </button>
        ))}
      </div>

      {/* Colleague list */}
      {tab === "list" && (
        colleagueList.length === 0 ? (
          <EmptyState
            icon="🤝"
            title="Chưa có đồng nghiệp"
            description="Tìm kiếm và gửi lời mời kết nối"
            action={<Button onClick={() => setTab("search")}>Tìm đồng nghiệp</Button>}
          />
        ) : (
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {colleagueList.map((col) => (
              <div key={col.user.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {col.user.fullname.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground">{col.user.fullname}</p>
                  <p className="text-xs text-muted-foreground">@{col.user.username} · {col.user.email}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  Kết nối: {new Date(col.since).toLocaleDateString("vi-VN")}
                </span>
                <button
                  onClick={() => handleRemove(col.user.id)}
                  className="text-xs text-destructive hover:underline"
                  disabled={actionLoading === col.user.id}
                >
                  Xoá
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Pending requests */}
      {tab === "requests" && (
        requests.length === 0 ? (
          <EmptyState icon="📬" title="Không có lời mời nào" description="Các lời mời kết nối sẽ hiển thị ở đây" />
        ) : (
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {requests.map((req) => (
              <div key={req.sender_id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-sm font-semibold text-amber-600">
                  {req.sender?.fullname?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground">{req.sender?.fullname}</p>
                  <p className="text-xs text-muted-foreground">@{req.sender?.username} · {req.sender?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAccept(req.sender_id)}
                    loading={actionLoading === req.sender_id}
                  >
                    Chấp nhận
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleReject(req.sender_id)}
                    disabled={actionLoading === req.sender_id}
                  >
                    Từ chối
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Search */}
      {tab === "search" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Tìm theo tên, email, username hoặc SĐT..."
              className="flex-1"
              autoFocus
            />
            <Button onClick={handleSearch} loading={searching}>
              Tìm kiếm
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {searchResults.map((user) => (
                <div key={user.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                    {user.fullname.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-card-foreground">{user.fullname}</p>
                    <p className="text-xs text-muted-foreground">@{user.username} · {user.email}</p>
                  </div>
                  {user.colleague_status === "ACCEPTED" ? (
                    <Badge value="Đã kết nối" className="bg-green-100 text-green-700" />
                  ) : user.colleague_status === "PENDING" ? (
                    <Badge value="Đang chờ" className="bg-amber-100 text-amber-700" />
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleSendInvite(user.id)}
                      loading={actionLoading === user.id}
                    >
                      Kết nối
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {search.length >= 2 && searchResults.length === 0 && !searching && (
            <EmptyState icon="🔍" title="Không tìm thấy" description="Thử từ khoá khác" />
          )}
        </div>
      )}
    </div>
  );
}
