
export interface User {
  id: string;
  username?: string;
  name?: string;
  email: string;
  department: string | { id: string; name: string };
  departmentId?: string;
  role: "superadmin" | "admin" | "user";
  joined?: string;
  avatar?: string;
  bio?: string;
  createdBy?: string | { id: string; name: string; email: string };
  createdById?: string;
  isSuperAdmin?: boolean;
}

export interface Department {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  members?: number;
  projects?: number;
  color?: string;
}

export interface NewUser {
  username: string;
  name: string;
  email: string;
  password: string;
  departmentId: string;
  role: string;
}

export interface KRA {
  id: string;
  responsibilityAreas: string[];
  department: string | { id: string; name: string };
  departmentId?: string;
  assignedTo: string | { id: string; name: string; email: string };
  assignedToId?: string;
  startDate: string;
  endDate?: string;
  status: "active" | "completed" | "cancelled" | "on-hold";
  createdBy: string | { id: string; name: string; email: string };
  createdById?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NewKRA {
  responsibilityAreas: string;
  departmentId: string;
  assignedToId: string;
  startDate: string;
}

export interface DailyTask {
  id: string;
  task: string;
  srId?: string;
  clientDetails?: string;
  remarks: string;
  status: "in-progress" | "closed";
  date: string;
  user: string | { id: string; name: string; email: string };
  userId?: string;
  department: string | { id: string; name: string };
  departmentId?: string;
  createdBy: string | { id: string; name: string; email: string };
  createdById?: string;
  tags: string[];
  attachments?: Array<{
    filename: string;
    url: string;
    uploadedAt: string;
  }>;
  // Escalation fields
  escalatedTo?: string | { id: string; name: string; email: string };
  escalatedToId?: string;
  escalatedBy?: string | { id: string; name: string; email: string };
  escalatedById?: string;
  escalatedAt?: string;
  escalationReason?: string;
  isEscalated?: boolean;
  originalUser?: string | { id: string; name: string; email: string };
  originalUserId?: string;
  createdAt?: string;
  updatedAt?: string;
  closedAt?: string;
  // User role for this task
  userRole?: "owner" | "observer" | "viewer"; // owner: full control, observer: read-only (escalated away)
}

export interface NewDailyTask {
  task: string;
  srId?: string;
  clientDetails?: string;
  remarks: string;
  status: "in-progress" | "closed";
  date: string;
  tags?: string[];
}