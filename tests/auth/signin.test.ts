import { POST } from "@/app/api/auth/signin/route";
import { NextRequest } from "next/server";
import db from "@/lib/db";
import * as auth from "@/lib/auth";
import bcrypt from "bcryptjs";

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {
    user: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  createSession: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
}));

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/signin", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/auth/signin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ✅ Missing fields
  it("should return 400 if fields are missing", async () => {
    const req = createRequest({ identifier: "test@example.com" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("All fields are required");
  });

  // ✅ User not found
  it("should return 401 if user does not exist", async () => {
    (db.user.findFirst as jest.Mock).mockResolvedValue(null);

    const req = createRequest({
      identifier: "nonexistent@example.com",
      password: "password123",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Invalid credentials");
  });

  // ✅ Wrong password
  it("should return 401 if password is incorrect", async () => {
    (db.user.findFirst as jest.Mock).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      password: "hashed-password",
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const req = createRequest({
      identifier: "test@example.com",
      password: "wrongpassword",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Invalid credentials");
  });

  // ✅ Successful login with email
  it("should return 200 on successful sign-in with email", async () => {
    (db.user.findFirst as jest.Mock).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      password: "hashed-password",
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const req = createRequest({
      identifier: "test@example.com",
      password: "password123",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("Signed in successfully");
    expect(auth.createSession).toHaveBeenCalledWith("user-123", "test@example.com");
  });

  // ✅ Successful login with username
  it("should return 200 on successful sign-in with username", async () => {
    (db.user.findFirst as jest.Mock).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      password: "hashed-password",
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const req = createRequest({
      identifier: "testuser",
      password: "password123",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("Signed in successfully");
  });

  // ✅ Successful login with phone number
  it("should return 200 on successful sign-in with phone number", async () => {
    (db.user.findFirst as jest.Mock).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      password: "hashed-password",
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const req = createRequest({
      identifier: "1234567890",
      password: "password123",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("Signed in successfully");
  });
});