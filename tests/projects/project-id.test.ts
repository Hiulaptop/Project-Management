import { GET, PATCH, DELETE } from "@/app/api/projects/[id]/route";
import { NextRequest } from "next/server";
import db from "@/lib/db";
import * as auth from "@/lib/auth";

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    project_members: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getAuthUser: jest.fn(),
}));

const mockSession = { userId: "user-123", email: "test@example.com" };
const mockParams = Promise.resolve({ id: "1" });

function createRequest(
  method: string,
  body?: Record<string, unknown>
): NextRequest {
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) options.body = JSON.stringify(body);
  return new NextRequest("http://localhost:3000/api/projects/1", options);
}

// ─── GET /api/projects/:id ──────────────────────────────────────────

describe("GET /api/projects/:id", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should return 401 if not authenticated", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(null);

    const req = createRequest("GET");
    const res = await GET(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if user is not a member", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue(null);

    const req = createRequest("GET");
    const res = await GET(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Project not found");
  });

  it("should return 200 with project details", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue({
      project_id: BigInt(1),
      user_id: "user-123",
      role_in_project: "OWNER",
    });
    (db.project.findUnique as jest.Mock).mockResolvedValue({
      id: BigInt(1),
      title: "Project 1",
      description: "Description",
      owner: { id: "user-123", fullname: "Test", username: "test", email: "test@example.com" },
      members: [],
      deadlines: [],
    });

    const req = createRequest("GET");
    const res = await GET(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.project.title).toBe("Project 1");
  });

  it("should return 500 on internal server error", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockRejectedValue(new Error("DB error"));

    const req = createRequest("GET");
    const res = await GET(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ─── PATCH /api/projects/:id ────────────────────────────────────────

describe("PATCH /api/projects/:id", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should return 401 if not authenticated", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(null);

    const req = createRequest("PATCH", { title: "Updated" });
    const res = await PATCH(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 if user is not a member", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue(null);

    const req = createRequest("PATCH", { title: "Updated" });
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

    const req = createRequest("PATCH", { title: "Updated" });
    const res = await PATCH(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return 200 if OWNER updates project", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue({
      project_id: BigInt(1),
      user_id: "user-123",
      role_in_project: "OWNER",
    });
    (db.project.update as jest.Mock).mockResolvedValue({
      id: BigInt(1),
      title: "Updated Title",
      description: null,
      start_date: new Date("2026-03-01"),
      end_date: null,
    });

    const req = createRequest("PATCH", { title: "Updated Title" });
    const res = await PATCH(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("Project updated successfully");
    expect(data.project.title).toBe("Updated Title");
  });

  it("should return 200 if MANAGER updates project", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue({
      project_id: BigInt(1),
      user_id: "user-123",
      role_in_project: "MANAGER",
    });
    (db.project.update as jest.Mock).mockResolvedValue({
      id: BigInt(1),
      title: "Manager Update",
    });

    const req = createRequest("PATCH", { title: "Manager Update" });
    const res = await PATCH(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.project.title).toBe("Manager Update");
  });

  it("should only update provided fields", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue({
      project_id: BigInt(1),
      user_id: "user-123",
      role_in_project: "OWNER",
    });
    (db.project.update as jest.Mock).mockResolvedValue({
      id: BigInt(1),
      title: "Only Title",
    });

    const req = createRequest("PATCH", { title: "Only Title" });
    await PATCH(req, { params: mockParams });

    expect(db.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { title: "Only Title" },
      })
    );
  });

  it("should return 500 on internal server error", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockRejectedValue(new Error("DB error"));

    const req = createRequest("PATCH", { title: "Updated" });
    const res = await PATCH(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ─── DELETE /api/projects/:id ───────────────────────────────────────

describe("DELETE /api/projects/:id", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should return 401 if not authenticated", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(null);

    const req = createRequest("DELETE");
    const res = await DELETE(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 if user is not a member", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue(null);

    const req = createRequest("DELETE");
    const res = await DELETE(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return 403 if user is MANAGER", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue({
      project_id: BigInt(1),
      user_id: "user-123",
      role_in_project: "MANAGER",
    });

    const req = createRequest("DELETE");
    const res = await DELETE(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return 403 if user is MEMBER", async () => {
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

  it("should return 200 if OWNER deletes project", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project_members.findUnique as jest.Mock).mockResolvedValue({
      project_id: BigInt(1),
      user_id: "user-123",
      role_in_project: "OWNER",
    });
    (db.project.delete as jest.Mock).mockResolvedValue({});

    const req = createRequest("DELETE");
    const res = await DELETE(req, { params: mockParams });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("Project deleted successfully");
    expect(db.project.delete).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
    });
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
