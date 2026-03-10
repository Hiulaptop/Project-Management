import { POST } from "@/app/api/auth/signup/route";
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import * as auth from "@/lib/auth";
import bcrypt from "bcryptjs";

// Mock dependencies
jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  createSession: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
}));

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ✅ Missing fields
  it("should return 400 if required fields are missing", async () => {
    const req = createRequest({ email: "test@example.com" });
    const res: NextResponse = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("All fields are required");
  });

  // ✅ Short password
  it("should return 400 if password is less than 8 characters", async () => {
    const req = createRequest({
      email: "test@example.com",
      username: "testuser",
      password: "short",
      fullname: "Test User",
      phone_number: "1234567890",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Password must be at least 8 characters");
  });

  // ✅ Duplicate email
  it("should return 409 if email already exists", async () => {
    (db.user.findFirst as jest.Mock).mockResolvedValue({
      email: "test@example.com",
      username: "other",
      phone_number: "0000000000",
    });

    const req = createRequest({
      email: "test@example.com",
      username: "testuser",
      password: "password123",
      fullname: "Test User",
      phone_number: "1234567890",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toContain("email");
  });

  // ✅ Duplicate username and phone
  it("should return 409 with multiple conflicts", async () => {
    (db.user.findFirst as jest.Mock).mockResolvedValue({
      email: "other@example.com",
      username: "testuser",
      phone_number: "1234567890",
    });

    const req = createRequest({
      email: "test@example.com",
      username: "testuser",
      password: "password123",
      fullname: "Test User",
      phone_number: "1234567890",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toContain("username");
    expect(data.error).toContain("phone number");
  });

  // ✅ Successful signup
  it("should return 201 on successful signup", async () => {
    (db.user.findFirst as jest.Mock).mockResolvedValue(null);
    (db.user.create as jest.Mock).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      username: "testuser",
      fullname: "Test User",
      phone_number: "1234567890",
    });

    const req = createRequest({
      email: "test@example.com",
      username: "testuser",
      password: "password123",
      fullname: "Test User",
      phone_number: "1234567890",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.message).toBe("User created successfully");
    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
    expect(auth.createSession).toHaveBeenCalledWith("user-123", "test@example.com");
  });
});