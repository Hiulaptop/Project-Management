"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, notifications as notifApi } from "@/lib/api";
import type { Notification } from "@/lib/types";

async function fetchNotifications() {
  try {
    return await notifApi.list({ limit: 10 });
  } catch {
    return { notifications: [], unreadCount: 0, nextCursor: null };
  }
}

export default function Header() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchNotifications().then((data) => {
      if (!cancelled) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    });
    const interval = setInterval(() => {
      fetchNotifications().then((data) => {
        if (!cancelled) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
        }
      });
    }, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleMarkAllRead() {
    try {
      await notifApi.markAllRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await auth.signout();
      router.push("/auth/signin");
    } catch {
      setSigningOut(false);
    }
  }

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  function timeAgo(date: string) {
    const diff = now - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Vừa xong";
    if (mins < 60) return `${mins} phút trước`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} giờ trước`;
    const days = Math.floor(hrs / 24);
    return `${days} ngày trước`;
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm px-6">
      <div />

      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2C7.23858 2 5 4.23858 5 7V10L3.29289 11.7071C3.00612 11.9939 2.92137 12.4178 3.07612 12.7893C3.23087 13.1608 3.59554 13.4 4 13.4H16C16.4045 13.4 16.7691 13.1608 16.9239 12.7893C17.0786 12.4178 16.9939 11.9939 16.7071 11.7071L15 10V7C15 4.23858 12.7614 2 10 2Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 14V14.5C8 15.6046 8.89543 16.5 10 16.5C11.1046 16.5 12 15.6046 12 14.5V14" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="animate-scaleIn absolute right-0 top-12 w-80 rounded-xl border border-border bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">Thông báo</h3>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">
                    Đọc tất cả
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Không có thông báo</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer ${
                        !n.is_read ? "bg-primary-light/30" : ""
                      }`}
                      onClick={async () => {
                        if (!n.is_read) {
                          await notifApi.markRead(n.id);
                          setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
                          setUnreadCount((c) => Math.max(0, c - 1));
                        }
                      }}
                    >
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6 15H4C3.44772 15 3 14.5523 3 14V4C3 3.44772 3.44772 3 4 3H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M11 12L14 9L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 9H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
