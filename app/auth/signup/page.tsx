"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/api";
import { Input, Button } from "@/components/ui/form";

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullname: "",
    email: "",
    username: "",
    phone_number: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    if (form.password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword: _, ...body } = form;
      await auth.signup(body);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white text-xl font-bold">
            PM
          </div>
          <h1 className="text-2xl font-bold text-foreground">Tạo tài khoản</h1>
          <p className="mt-1 text-sm text-muted-foreground">Bắt đầu quản lý dự án của bạn</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <Input
            label="Họ và tên"
            value={form.fullname}
            onChange={(e) => update("fullname", e.target.value)}
            placeholder="Nguyễn Văn A"
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="email@example.com"
              required
            />
            <Input
              label="Username"
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
              placeholder="username"
              required
            />
          </div>

          <Input
            label="Số điện thoại"
            type="tel"
            value={form.phone_number}
            onChange={(e) => update("phone_number", e.target.value)}
            placeholder="0912345678"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Mật khẩu"
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="Tối thiểu 8 ký tự"
              required
            />
            <Input
              label="Xác nhận"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              placeholder="Nhập lại mật khẩu"
              required
            />
          </div>

          <Button type="submit" loading={loading} className="w-full">
            Đăng ký
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Đã có tài khoản?{" "}
          <Link href="/auth/signin" className="font-medium text-primary hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
