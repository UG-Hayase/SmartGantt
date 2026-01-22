
import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  PlayCircle, 
  XCircle, 
} from 'lucide-react';
import { TicketStatus, User, Version, PriorityOption } from './types';

export const STATUS_CONFIG: Record<TicketStatus, { color: string; icon: React.ReactNode }> = {
  'New': { color: 'bg-blue-100 text-blue-700', icon: <Clock size={14} /> },
  'In Progress': { color: 'bg-yellow-100 text-yellow-700', icon: <PlayCircle size={14} /> },
  'Resolved': { color: 'bg-green-100 text-green-700', icon: <CheckCircle2 size={14} /> },
  'Closed': { color: 'bg-gray-100 text-gray-700', icon: <XCircle size={14} /> },
};

export const DAY_WIDTH = 40;
export const ROW_HEIGHT = 48;

export const INITIAL_USERS: User[] = [
  { id: 'u1', name: '田中 太郎', avatar: 'https://picsum.photos/seed/u1/40/40' },
  { id: 'u2', name: '佐藤 花子', avatar: 'https://picsum.photos/seed/u2/40/40' },
  { id: 'u3', name: '鈴木 一郎', avatar: 'https://picsum.photos/seed/u3/40/40' },
];

export const INITIAL_VERSIONS: Version[] = [
  { id: 'v1', name: 'v1.0.0 Release', isDefault: true },
  { id: 'v2', name: 'v1.1.0 Feature' },
];

export const INITIAL_PRIORITIES: PriorityOption[] = [
  { id: 'p1', name: '低', color: 'text-gray-500' },
  { id: 'p2', name: '通常', color: 'text-blue-500', isDefault: true },
  { id: 'p3', name: '高', color: 'text-orange-500' },
  { id: 'p4', name: '急ぎ', color: 'text-red-500' },
];
