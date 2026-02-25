import { GET, POST } from "@/app/api/projects/route";
import { NextRequest } from "next/server";
import db from "@/lib/db";
import * as auth from "@/lib/auth";

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {
    project: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getAuthUser: jest.fn(),
}));

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/projects", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const mockSession = { userId: "user-123", email: "test@example.com" };

// ─── GET /api/projects ──────────────────────────────────────────────

describe("GET /api/projects", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should return 401 if not authenticated", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 200 with user's projects", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project.findMany as jest.Mock).mockResolvedValue([
      {
        id: "1",
        title: "Project 1",
        owner: { id: "user-123", fullname: "Test", username: "test", email: "test@example.com" },
        members: [{ user_id: "user-123", role_in_project: "OWNER" }],
        _count: { deadlines: 0, members: 1 },
      },
    ]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.projects).toHaveLength(1);
    expect(data.projects[0].title).toBe("Project 1");
  });

  it("should return 200 with empty array if no projects", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.projects).toEqual([]);
  });

  it("should return 500 on internal server error", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project.findMany as jest.Mock).mockRejectedValue(new Error("DB error"));

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ─── POST /api/projects ─────────────────────────────────────────────

describe("POST /api/projects", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should return 401 if not authenticated", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(null);

    const req = createRequest({ title: "New Project", start_date: "2026-03-01" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 if title is missing", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);

    const req = createRequest({ start_date: "2026-03-01" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Title and start date are required");
  });

  it("should return 400 if start_date is missing", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);

    const req = createRequest({ title: "New Project" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Title and start date are required");
  });

  it("should return 400 if end_date is before start_date", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);

    const req = createRequest({
      title: "New Project",
      start_date: "2026-06-01",
      end_date: "2026-03-01",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("End date must be after start date");
  });

  it("should return 400 if end_date equals start_date", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);

    const req = createRequest({
      title: "New Project",
      start_date: "2026-06-01",
      end_date: "2026-06-01",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("End date must be after start date");
  });

  it("should return 201 on successful project creation", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project.create as jest.Mock).mockResolvedValue({
      id: BigInt(1),
      title: "New Project",
      description: null,
      start_date: new Date("2026-03-01"),
      end_date: null,
      owner_id: "user-123",
      owner: { id: "user-123", fullname: "Test", username: "test", email: "test@example.com" },
      members: [{ project_id: BigInt(1), user_id: "user-123", role_in_project: "OWNER" }],
    });

    const req = createRequest({ title: "New Project", start_date: "2026-03-01" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.message).toBe("Project created successfully");
    expect(data.project.title).toBe("New Project");
  });

  it("should return 201 with description and end_date", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project.create as jest.Mock).mockResolvedValue({
      id: BigInt(1),
      title: "Full Project",
      description: "A full project",
      start_date: new Date("2026-03-01"),
      end_date: new Date("2026-12-31"),
      owner_id: "user-123",
      owner: { id: "user-123", fullname: "Test", username: "test", email: "test@example.com" },
      members: [{ project_id: BigInt(1), user_id: "user-123", role_in_project: "OWNER" }],
    });

    const req = createRequest({
      title: "Full Project",
      description: "A full project",
      start_date: "2026-03-01",
      end_date: "2026-12-31",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.project.description).toBe("A full project");
  });

  it("should auto-add creator as OWNER member", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project.create as jest.Mock).mockResolvedValue({
      id: BigInt(1),
      title: "New Project",
      description: null,
      start_date: new Date("2026-03-01"),
      end_date: null,
      owner_id: "user-123",
      owner: { id: "user-123", fullname: "Test", username: "test", email: "test@example.com" },
      members: [{ project_id: BigInt(1), user_id: "user-123", role_in_project: "OWNER" }],
    });

    const req = createRequest({ title: "New Project", start_date: "2026-03-01" });
    await POST(req);

    expect(db.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          owner_id: "user-123",
          members: {
            create: {
              user_id: "user-123",
              role_in_project: "OWNER",
            },
          },
        }),
      })
    );
  });

  it("should return 500 on internal server error", async () => {
    (auth.getAuthUser as jest.Mock).mockResolvedValue(mockSession);
    (db.project.create as jest.Mock).mockRejectedValue(new Error("DB error"));

    const req = createRequest({ title: "New Project", start_date: "2026-03-01" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
