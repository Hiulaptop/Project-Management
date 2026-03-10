"use client";

import { useState, useEffect, type FormEvent } from "react";
import { me as meApi } from "@/lib/api";
import type { UserProfile } from "@/lib/types";
import { PageLoader } from "@/components/ui/spinner";
import { Input, Button } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";

export default function ProfilePage() {
  const { addToast } = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    fullname: "",
    email: "",
    username: "",
    phone_number: "",
  });
  const [profileError, setProfileError] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // Password form
  const [pwForm, setPwForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    meApi.get().then((d) => {
      setUser(d.user);
      setProfileForm({
        fullname: d.user.fullname,
        email: d.user.email,
        username: d.user.username,
        phone_number: d.user.phone_number,
      });
    }).finally(() => setLoading(false));
  }, []);

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileLoading(true);
    try {
      const data = await meApi.update(profileForm);
      setUser((prev) => (prev ? { ...prev, ...data.user } : prev));
      setEditMode(false);
      addToast("Cập nhật thông tin thành công", "success");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setPwError("");

    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwError("Mật khẩu xác nhận không khớp");
      return;
    }
    if (pwForm.new_password.length < 8) {
      setPwError("Mật khẩu mới phải có ít nhất 8 ký tự");
      return;
    }

    setPwLoading(true);
    try {
      await meApi.changePassword({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
      addToast("Đổi mật khẩu thành công", "success");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setPwLoading(false);
    }
  }

  if (loading) return <PageLoader />;
  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      <h1 className="text-2xl font-bold text-foreground">Hồ sơ cá nhân</h1>

      {/* Profile card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
            {user.fullname.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">{user.fullname}</h2>
            <p className="text-sm text-muted-foreground">@{user.username} · {user.role}</p>
            <p className="text-xs text-muted-foreground">Tham gia: {new Date(user.createdAt).toLocaleDateString("vi-VN")}</p>
          </div>
        </div>

        {editMode ? (
          <form onSubmit={handleProfileSave} className="space-y-4">
            {profileError && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">{profileError}</div>
            )}
            <Input
              label="Họ và tên"
              value={profileForm.fullname}
              onChange={(e) => setProfileForm((f) => ({ ...f, fullname: e.target.value }))}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
              <Input
                label="Username"
                value={profileForm.username}
                onChange={(e) => setProfileForm((f) => ({ ...f, username: e.target.value }))}
                required
              />
            </div>
            <Input
              label="Số điện thoại"
              value={profileForm.phone_number}
              onChange={(e) => setProfileForm((f) => ({ ...f, phone_number: e.target.value }))}
              required
            />
            <div className="flex gap-2 pt-2">
              <Button type="submit" loading={profileLoading}>Lưu</Button>
              <Button type="button" variant="secondary" onClick={() => setEditMode(false)}>Huỷ</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Username" value={`@${user.username}`} />
            <InfoRow label="Số điện thoại" value={user.phone_number} />
            <div className="pt-2">
              <Button variant="secondary" size="sm" onClick={() => setEditMode(true)}>
                ✏️ Chỉnh sửa thông tin
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {user._count && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MiniStat label="Dự án sở hữu" value={user._count.ownedProjects} />
          <MiniStat label="Dự án tham gia" value={user._count.projectMembers} />
          <MiniStat label="Nhiệm vụ được gán" value={user._count.deadlineAssigns} />
          <MiniStat label="Đồng nghiệp" value={user._count.colleaguesSent + user._count.colleaguesReceived} />
        </div>
      )}

      {/* Change password */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">Đổi mật khẩu</h3>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {pwError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">{pwError}</div>
          )}
          <Input
            label="Mật khẩu hiện tại"
            type="password"
            value={pwForm.current_password}
            onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Mật khẩu mới"
              type="password"
              value={pwForm.new_password}
              onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))}
              placeholder="Tối thiểu 8 ký tự"
              required
            />
            <Input
              label="Xác nhận mật khẩu mới"
              type="password"
              value={pwForm.confirm_password}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm_password: e.target.value }))}
              required
            />
          </div>
          <Button type="submit" loading={pwLoading} variant="secondary">
            Đổi mật khẩu
          </Button>
        </form>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-card-foreground">{value}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 text-center">
      <p className="text-2xl font-bold text-card-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
