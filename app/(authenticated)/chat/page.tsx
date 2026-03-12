"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { chat as chatApi, me as meApi } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";
import { PageLoader } from "@/components/ui/spinner";
import { Button } from "@/components/ui/form";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [myId, setMyId] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const [chatData, userData] = await Promise.all([
        chatApi.list({ limit: 50 }),
        meApi.get(),
      ]);
      setMessages(chatData.messages);
      setNextCursor(chatData.nextCursor);
      setMyId(userData.user.id);
    } catch {
      // handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await chatApi.list({ limit: 50 });
        setMessages(data.messages);
        setNextCursor(data.nextCursor);
      } catch {
        // ignore
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadOlder() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await chatApi.list({ cursor: nextCursor, limit: 50 });
      setMessages((prev) => [...data.messages, ...prev]);
      setNextCursor(data.nextCursor);
    } catch {
      // handle
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleSend() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await chatApi.send({ message: text.trim() });
      setText("");
      // Refresh messages
      const data = await chatApi.list({ limit: 50 });
      setMessages(data.messages);
      setNextCursor(data.nextCursor);
      inputRef.current?.focus();
    } catch {
      // handle
    } finally {
      setSending(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
      <h1 className="text-2xl font-bold text-foreground mb-4">💬 Trò chuyện nhóm</h1>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-xl border border-border bg-card p-4 space-y-3"
      >
        {nextCursor && (
          <div className="flex justify-center pb-2">
            <Button variant="ghost" size="sm" onClick={loadOlder} loading={loadingMore}>
              Tải tin nhắn cũ hơn
            </Button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <span className="text-4xl mb-2">💬</span>
            <p className="text-sm">Bắt đầu cuộc trò chuyện!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === myId;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] ${isMe ? "order-2" : ""}`}>
                  {!isMe && (
                    <p className="text-xs font-medium text-muted-foreground mb-0.5 ml-1">
                      {msg.user?.fullname || "Ẩn danh"}
                    </p>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2 text-sm ${
                      isMe
                        ? "bg-primary text-white rounded-tr-md"
                        : "bg-secondary text-card-foreground rounded-tl-md"
                    }`}
                  >
                    {msg.message}
                  </div>
                  <p className={`text-[10px] text-muted-foreground mt-0.5 ${isMe ? "text-right mr-1" : "ml-1"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input area */}
      <div className="mt-3 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Nhập tin nhắn..."
          className="flex-1 h-10 rounded-lg border border-input bg-card px-3 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
          maxLength={2000}
        />
        <Button onClick={handleSend} loading={sending} disabled={!text.trim()}>
          Gửi
        </Button>
      </div>
    </div>
  );
}
