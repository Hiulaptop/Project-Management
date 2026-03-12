// TypeScript types shared across the frontend

export interface User {
  id: string;
  fullname: string;
  username: string;
  email: string;
}

export interface UserProfile extends User {
  phone_number: string;
  role: "SUPERUSER" | "ADMIN" | "USER";
  createdAt: string;
  updatedAt: string;
  _count?: {
    ownedProjects: number;
    projectMembers: number;
    deadlineAssigns: number;
    colleaguesSent: number;
    colleaguesReceived: number;
  };
}

export type ProjectRole = "OWNER" | "MANAGER" | "MEMBER";
export type DeadlineStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
export type DeadlinePriority = "HIGH" | "MEDIUM" | "LOW";
export type ColleagueStatus = "PENDING" | "ACCEPTED" | "BLOCKED";

export interface ProjectMember {
  user_id: string;
  role_in_project: ProjectRole;
  join_at?: string;
  user?: User;
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  owner_id: string;
  createdAt: string;
  updatedAt: string;
  owner?: User;
  members?: ProjectMember[];
  deadlines?: Deadline[];
  _count?: {
    deadlines: number;
    members: number;
  };
}

export interface DeadlineAssignee {
  deadline_id: string;
  user_id: string;
  assigned_at: string;
  user?: User;
}

export interface Deadline {
  id: string;
  project_id: string;
  setter_id: string;
  title: string;
  description: string | null;
  deadline_date: string;
  status: DeadlineStatus;
  priority: DeadlinePriority;
  completion: number;
  feedback: string | null;
  target: string | null;
  result_links: string | null;
  output: string | null;
  createdAt: string;
  updatedAt: string;
  setter?: User;
  assignees?: DeadlineAssignee[];
  project?: { id: string; title: string };
}

export interface Colleague {
  user: User;
  since: string;
}

export interface ColleagueRequest {
  sender_id: string;
  receiver_id: string;
  status: ColleagueStatus;
  createdAt: string;
  sender?: User;
  receiver?: User;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  project_id: string | null;
  deadline_id: string | null;
  from_user_id: string | null;
  is_read: boolean;
  createdAt: string;
}

export interface SearchUser extends User {
  colleague_status: ColleagueStatus | null;
}

export interface ActivityLog {
  id: string;
  project_id: string;
  user_id: string;
  action: string;
  details: string;
  createdAt: string;
  user?: User;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  createdAt: string;
  user?: User;
}

export interface ApiError {
  error: string;
}
