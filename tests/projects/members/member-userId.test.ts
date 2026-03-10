import { PATCH, DELETE } from "@/app/api/projects/[id]/members/[userId]/route";
import { NextRequest } from "next/server";
import db from "@/lib/db";
import * as auth from "@/lib/auth";

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {
    project_members: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getAuthUser: jest.fn(),
}));

const mockSession = { userId: "user-123", email: "test@example.com" };
const mockParams = Promise.resolve({ id: "1", userId: "user-456" });

function createRequest(
  method: string,
  body?: Record<string, unknown>
): NextRequest {
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) options.body = JSON.stringify(body);
  return new NextRequest("http://localhost:3000/api/projects/1/members/user-456", options);
}

// ─── PATCH /api/projects/:id/members/:userId ────────────────────────

describe("PATCH /api/projects/:id/members/:userId", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should return 401 if not authenticated", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(null);

    const req = createRequest("PATCH", { role_in_project: "MANAGER" });
    const res = await PATCH(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 if user is not OWNER", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue({
      project_id: BigInt(1),
      user_id: "user-123",
      role_in_project: "MANAGER",
    });

    const req = createRequest("PATCH", { role_in_project: "MANAGER" });
    const res = await PATCH(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return 403 if user is a MEMBER", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue({
      project_id: BigInt(1),
      user_id: "user-123",
      role_in_project: "MEMBER",
    });

    const req = createRequest("PATCH", { role_in_project: "MANAGER" });
    const res = await PATCH(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return 403 if user is not a member at all", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue(null);

    const req = createRequest("PATCH", { role_in_project: "MANAGER" });
    const res = await PATCH(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return 400 if trying to change own role", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue({
      project_id: BigInt(1),
      user_id: "user-123",
      role_in_project: "OWNER",
    });

    const selfParams = Promise.resolve({ id: "1", userId: "user-123" });
    const req = createRequest("PATCH", { role_in_project: "MEMBER" });
    const res = await PATCH(req, { params: selfParams });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Cannot change your own role");
  });

  it("should return 400 if role is invalid (OWNER)", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue({
      project_id: BigInt(1),
      user_id: "user-123",
      role_in_project: "OWNER",
    });

    const req = createRequest("PATCH", { role_in_project: "OWNER" });
    const res = await PATCH(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid role. Must be MANAGER or MEMBER");
  });

  it("should return 400 if role is missing", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue({
      project_id: BigInt(1),
      user_id: "user-123",
      role_in_project: "OWNER",
    });

    const req = createRequest("PATCH", {});
    const res = await PATCH(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid role. Must be MANAGER or MEMBER");
  });

  it("should return 400 if role is an invalid string", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue({
      project_id: BigInt(1),
      user_id: "user-123",
      role_in_project: "OWNER",
    });

    const req = createRequest("PATCH", { role_in_project: "ADMIN" });
    const res = await PATCH(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid role. Must be MANAGER or MEMBER");
  });

  it("should return 200 on successful role update to MANAGER", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue({
      project_id: BigInt(1),
      user_id: "user-123",
      role_in_project: "OWNER",
    });
    (db.project_members.update as jest.Mock).mockResolvedValue({
      project_id: BigInt(1),
      user_id: "user-456",
      role_in_project: "MANAGER",
      user: { id: "user-456", fullname: "Other User", username: "other" },
    });

    const req = createRequest("PATCH", { role_in_project: "MANAGER" });
    const res = await PATCH(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("Role updated successfully");
    expect(data.member.role_in_project).toBe("MANAGER");
  });

  it("should return 200 on successful role update to MEMBER", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue({
      project_id: BigInt(1),
      user_id: "user-123",
      role_in_project: "OWNER",
    });
    (db.project_members.update as jest.Mock).mockResolvedValue({
      project_id: BigInt(1),
      user_id: "user-456",
      role_in_project: "MEMBER",
      user: { id: "user-456", fullname: "Other User", username: "other" },
    });

    const req = createRequest("PATCH", { role_in_project: "MEMBER" });
    const res = await PATCH(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.member.role_in_project).toBe("MEMBER");
  });

  it("should return 500 on internal server error", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockRejectedValue(new Error("DB error"));

    const req = createRequest("PATCH", { role_in_project: "MANAGER" });
    const res = await PATCH(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ─── DELETE /api/projects/:id/members/:userId ───────────────────────

describe("DELETE /api/projects/:id/members/:userId", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should return 401 if not authenticated", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(null);

    const req = createRequest("DELETE");
    const res = await DELETE(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 if caller is not a member at all", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue(null);

    const req = createRequest("DELETE");
    const res = await DELETE(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return 403 if MEMBER tries to remove another member", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue({
      project_id: BigInt(1),
      user_id: "user-123",
      role_in_project: "MEMBER",
    });

    const req = createRequest("DELETE");
    const res = await DELETE(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return 404 if target member not found", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        project_id: BigInt(1),
        user_id: "user-123",
        role_in_project: "OWNER",
      })
      .mockResolvedValueOnce(null); // target not found

    const req = createRequest("DELETE");
    const res = await DELETE(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Member not found");
  });

  it("should return 400 if trying to remove the OWNER", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        project_id: BigInt(1),
        user_id: "user-123",
        role_in_project: "OWNER",
      })
      .mockResolvedValueOnce({
        project_id: BigInt(1),
        user_id: "user-456",
        role_in_project: "OWNER",
      });

    const req = createRequest("DELETE");
    const res = await DELETE(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Cannot remove the project owner");
  });

  it("should return 200 when OWNER removes a member", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
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
    (db.project_members.delete as jest.Mock).mockResolvedValue({});

    const req = createRequest("DELETE");
    const res = await DELETE(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("Member removed successfully");
  });

  it("should return 200 when MANAGER removes a member", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        project_id: BigInt(1),
        user_id: "user-123",
        role_in_project: "MANAGER",
      })
      .mockResolvedValueOnce({
        project_id: BigInt(1),
        user_id: "user-456",
        role_in_project: "MEMBER",
      });
    (db.project_members.delete as jest.Mock).mockResolvedValue({});

    const req = createRequest("DELETE");
    const res = await DELETE(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("Member removed successfully");
  });

  it("should allow a MEMBER to remove themselves", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    const selfParams = Promise.resolve({ id: "1", userId: "user-123" });
    (db.project_members.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        project_id: BigInt(1),
        user_id: "user-123",
        role_in_project: "MEMBER",
      })
      .mockResolvedValueOnce({
        project_id: BigInt(1),
        user_id: "user-123",
        role_in_project: "MEMBER",
      });
    (db.project_members.delete as jest.Mock).mockResolvedValue({});

    const req = new NextRequest("http://localhost:3000/api/projects/1/members/user-123", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: selfParams });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("Member removed successfully");
  });

  it("should return 500 on internal server error", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockRejectedValue(new Error("DB error"));

    const req = createRequest("DELETE");
    const res = await DELETE(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
