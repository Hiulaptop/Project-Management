import { GET, POST } from "@/app/api/projects/[id]/members/route";
import { NextRequest } from "next/server";
import db from "@/lib/db";
import * as auth from "@/lib/auth";

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {
    project_members: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    userColleague: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getAuthUser: jest.fn(),
}));

const mockSession = { userId: "user-123", email: "test@example.com" };
const mockParams = Promise.resolve({ id: "1" });

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/projects/1/members", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// ─── GET /api/projects/:id/members ──────────────────────────────────

describe("GET /api/projects/:id/members", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should return 401 if not authenticated", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/projects/1/members");
    const res = await GET(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if user is not a member of the project", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/projects/1/members");
    const res = await GET(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Project not found");
  });

  it("should return 200 with members list", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue({
      project_id: BigInt(1),
      user_id: "user-123",
      role_in_project: "OWNER",
    });
    (db.project_members.findMany as jest.Mock).mockResolvedValue([
      {
        project_id: BigInt(1),
        user_id: "user-123",
        role_in_project: "OWNER",
        user: { id: "user-123", fullname: "Test", username: "test", email: "test@example.com" },
      },
    ]);

    const req = new NextRequest("http://localhost:3000/api/projects/1/members");
    const res = await GET(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.members).toHaveLength(1);
    expect(data.members[0].role_in_project).toBe("OWNER");
  });

  it("should return 500 on internal server error", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockRejectedValue(new Error("DB error"));

    const req = new NextRequest("http://localhost:3000/api/projects/1/members");
    const res = await GET(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ─── POST /api/projects/:id/members ─────────────────────────────────

describe("POST /api/projects/:id/members", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should return 401 if not authenticated", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(null);

    const req = createRequest({ user_id: "user-456" });
    const res = await POST(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 if user is a MEMBER (not OWNER/MANAGER)", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue({
      project_id: BigInt(1),
      user_id: "user-123",
      role_in_project: "MEMBER",
    });

    const req = createRequest({ user_id: "user-456" });
    const res = await POST(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return 403 if user is not a member at all", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue(null);

    const req = createRequest({ user_id: "user-456" });
    const res = await POST(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return 400 if user_id is missing", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue({
      project_id: BigInt(1),
      user_id: "user-123",
      role_in_project: "OWNER",
    });

    const req = createRequest({});
    const res = await POST(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("User ID is required");
  });

  it("should return 400 if user is not an accepted colleague", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue({
      project_id: BigInt(1),
      user_id: "user-123",
      role_in_project: "OWNER",
    });
    (db.userColleague.findFirst as jest.Mock).mockResolvedValue(null);

    const req = createRequest({ user_id: "user-456" });
    const res = await POST(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("You can only add accepted colleagues");
  });

  it("should return 409 if user is already a member", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    // First call: check caller's membership, Second call: check if target is already member
    (db.project_members.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        project_id: BigInt(1),
        user_id: "user-123",
        role_in_project: "OWNER",
      })
      .mockResolvedValueOnce({
        project_id: BigInt(1),
        user_id: "user-456",
        role_in_project: "MEMBER",
      });
    (db.userColleague.findFirst as jest.Mock).mockResolvedValue({
      sender_id: "user-123",
      receiver_id: "user-456",
      status: "ACCEPTED",
    });

    const req = createRequest({ user_id: "user-456" });
    const res = await POST(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe("User is already a member");
  });

  it("should return 201 on successful member addition as OWNER", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        project_id: BigInt(1),
        user_id: "user-123",
        role_in_project: "OWNER",
      })
      .mockResolvedValueOnce(null); // not already a member
    (db.userColleague.findFirst as jest.Mock).mockResolvedValue({
      sender_id: "user-123",
      receiver_id: "user-456",
      status: "ACCEPTED",
    });
    (db.project_members.create as jest.Mock).mockResolvedValue({
      project_id: BigInt(1),
      user_id: "user-456",
      role_in_project: "MEMBER",
      user: { id: "user-456", fullname: "New User", username: "newuser", email: "new@example.com" },
    });

    const req = createRequest({ user_id: "user-456" });
    const res = await POST(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.message).toBe("Member added successfully");
  });

  it("should return 201 on successful member addition as MANAGER", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        project_id: BigInt(1),
        user_id: "user-123",
        role_in_project: "MANAGER",
      })
      .mockResolvedValueOnce(null);
    (db.userColleague.findFirst as jest.Mock).mockResolvedValue({
      sender_id: "user-123",
      receiver_id: "user-456",
      status: "ACCEPTED",
    });
    (db.project_members.create as jest.Mock).mockResolvedValue({
      project_id: BigInt(1),
      user_id: "user-456",
      role_in_project: "MEMBER",
      user: { id: "user-456", fullname: "New User", username: "newuser", email: "new@example.com" },
    });

    const req = createRequest({ user_id: "user-456" });
    const res = await POST(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.message).toBe("Member added successfully");
  });

  it("should default role to MEMBER if not specified", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        project_id: BigInt(1),
        user_id: "user-123",
        role_in_project: "OWNER",
      })
      .mockResolvedValueOnce(null);
    (db.userColleague.findFirst as jest.Mock).mockResolvedValue({
      sender_id: "user-123",
      receiver_id: "user-456",
      status: "ACCEPTED",
    });
    (db.project_members.create as jest.Mock).mockResolvedValue({
      project_id: BigInt(1),
      user_id: "user-456",
      role_in_project: "MEMBER",
      user: { id: "user-456", fullname: "New User", username: "newuser", email: "new@example.com" },
    });

    const req = createRequest({ user_id: "user-456" });
    await POST(req, { params: mockParams });

    expect(db.project_members.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role_in_project: "MEMBER",
        }),
      })
    );
  });

  it("should return 500 on internal server error", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockRejectedValue(new Error("DB error"));

    const req = createRequest({ user_id: "user-456" });
    const res = await POST(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
