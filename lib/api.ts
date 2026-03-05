// API helper functions for frontend

const BASE = "";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data as T;
}

// ─── Auth ───
export const auth = {
  signup: (body: {
    fullname: string;
    email: string;
    username: string;
    phone_number: string;
    password: string;
  }) => request<{ message: string }>("/api/auth/signup", { method: "POST", body: JSON.stringify(body) }),

  signin: (body: { identifier: string; password: string }) =>
    request<{ message: string }>("/api/auth/signin", { method: "POST", body: JSON.stringify(body) }),

  signout: () => request<{ message: string }>("/api/auth/signout", { method: "POST" }),
};

// ─── Profile ───
import type { UserProfile } from "./types";

export const me = {
  get: () => request<{ user: UserProfile }>("/api/me"),

  update: (body: Partial<{ fullname: string; email: string; username: string; phone_number: string }>) =>
    request<{ message: string; user: UserProfile }>("/api/me", { method: "PATCH", body: JSON.stringify(body) }),

  changePassword: (body: { current_password: string; new_password: string }) =>
    request<{ message: string }>("/api/me/password", { method: "PATCH", body: JSON.stringify(body) }),
};

// ─── Projects ───
import type { Project, ProjectMember } from "./types";

export const projects = {
  list: () => request<{ projects: Project[] }>("/api/projects"),

  get: (id: string) => request<{ project: Project }>(`/api/projects/${id}`),

  create: (body: { title: string; description?: string; start_date: string; end_date?: string }) =>
    request<{ message: string; project: Project }>("/api/projects", { method: "POST", body: JSON.stringify(body) }),

  update: (id: string, body: Partial<{ title: string; description: string; start_date: string; end_date: string | null }>) =>
    request<{ message: string; project: Project }>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/projects/${id}`, { method: "DELETE" }),
};

// ─── Members ───
export const members = {
  list: (projectId: string) =>
    request<{ members: ProjectMember[] }>(`/api/projects/${projectId}/members`),

  add: (projectId: string, body: { user_id: string; role_in_project?: string }) =>
    request<{ message: string; member: ProjectMember }>(`/api/projects/${projectId}/members`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateRole: (projectId: string, userId: string, body: { role_in_project: string }) =>
    request<{ message: string; member: ProjectMember }>(`/api/projects/${projectId}/members/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  remove: (projectId: string, userId: string) =>
    request<{ message: string }>(`/api/projects/${projectId}/members/${userId}`, { method: "DELETE" }),
};

// ─── Deadlines ───
import type { Deadline } from "./types";

export const deadlines = {
  list: (projectId: string, params?: { status?: string; sort_by?: string; order?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.sort_by) qs.set("sort_by", params.sort_by);
    if (params?.order) qs.set("order", params.order);
    const query = qs.toString();
    return request<{ deadlines: Deadline[] }>(`/api/projects/${projectId}/deadlines${query ? `?${query}` : ""}`);
  },

  get: (projectId: string, deadlineId: string) =>
    request<{ deadline: Deadline }>(`/api/projects/${projectId}/deadlines/${deadlineId}`),

  create: (projectId: string, body: { title: string; description?: string; deadline_date: string; assignee_ids?: string[] }) =>
    request<{ message: string; deadline: Deadline }>(`/api/projects/${projectId}/deadlines`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (projectId: string, deadlineId: string, body: Partial<{ title: string; description: string; deadline_date: string }>) =>
    request<{ message: string; deadline: Deadline }>(`/api/projects/${projectId}/deadlines/${deadlineId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: (projectId: string, deadlineId: string) =>
    request<{ message: string }>(`/api/projects/${projectId}/deadlines/${deadlineId}`, { method: "DELETE" }),

  updateStatus: (projectId: string, deadlineId: string, body: { status: string }) =>
    request<{ message: string }>(`/api/projects/${projectId}/deadlines/${deadlineId}/status`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  updateFeedback: (projectId: string, deadlineId: string, body: { feedback: string }) =>
    request<{ message: string }>(`/api/projects/${projectId}/deadlines/${deadlineId}/feedback`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  addAssignees: (projectId: string, deadlineId: string, body: { user_ids: string[] }) =>
    request<{ message: string }>(`/api/projects/${projectId}/deadlines/${deadlineId}/assignees`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  removeAssignee: (projectId: string, deadlineId: string, userId: string) =>
    request<{ message: string }>(`/api/projects/${projectId}/deadlines/${deadlineId}/assignees/${userId}`, {
      method: "DELETE",
    }),
};

// ─── Colleagues ───
import type { Colleague, ColleagueRequest } from "./types";

export const colleagues = {
  list: () => request<{ colleagues: Colleague[] }>("/api/colleagues"),

  requests: () => request<{ requests: ColleagueRequest[] }>("/api/colleagues/requests"),

  sendInvite: (body: { receiver_id: string }) =>
    request<{ message: string }>("/api/colleagues", { method: "POST", body: JSON.stringify(body) }),

  accept: (userId: string) =>
    request<{ message: string }>(`/api/colleagues/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "ACCEPTED" }),
    }),

  block: (userId: string) =>
    request<{ message: string }>(`/api/colleagues/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "BLOCKED" }),
    }),

  remove: (userId: string) =>
    request<{ message: string }>(`/api/colleagues/${userId}`, { method: "DELETE" }),
};

// ─── Notifications ───
import type { Notification } from "./types";

export const notifications = {
  list: (params?: { unread_only?: boolean; limit?: number; cursor?: string }) => {
    const qs = new URLSearchParams();
    if (params?.unread_only) qs.set("unread_only", "true");
    if (params?.limit) qs.set("limit", params.limit.toString());
    if (params?.cursor) qs.set("cursor", params.cursor);
    const query = qs.toString();
    return request<{ notifications: Notification[]; unreadCount: number; nextCursor: string | null }>(
      `/api/notifications${query ? `?${query}` : ""}`
    );
  },

  markAllRead: () =>
    request<{ message: string; count: number }>("/api/notifications", { method: "PATCH" }),

  markRead: (id: string, is_read = true) =>
    request<{ notification: Notification }>(`/api/notifications/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_read }),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/notifications/${id}`, { method: "DELETE" }),
};

// ─── Users search ───
import type { SearchUser } from "./types";

export const users = {
  search: (search: string, limit = 20) =>
    request<{ users: SearchUser[] }>(`/api/users?search=${encodeURIComponent(search)}&limit=${limit}`),
};
