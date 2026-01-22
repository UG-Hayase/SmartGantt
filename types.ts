
export type TicketStatus = 'New' | 'In Progress' | 'Resolved' | 'Closed';

export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface Version {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface PriorityOption {
  id: string;
  name: string;
  color: string; // Tailwind color class or Hex
  isDefault?: boolean;
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
}

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priorityId: string; // Changed from priority: Priority
  assigneeId: string;
  versionId: string;
  parentId: string | null;
  startDate: string; // ISO format
  dueDate: string;   // ISO format
  progress: number;  // 0-100
  estimatedHours: number;
}

export interface GanttConfig {
  zoom: 'day' | 'week' | 'month';
  showResources: boolean;
  filterByAssignee: string | null;
  filterByStatus: TicketStatus | null;
  filterByPriority: string | null;
  filterByVersion: string | null;
  sortBy: keyof Ticket;
  sortOrder: 'asc' | 'desc';
}
