
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Ticket, GanttConfig, User, PriorityOption, Version } from '../types';
import { DAY_WIDTH, ROW_HEIGHT, STATUS_CONFIG } from '../constants';
import { getDaysInInterval, addDays, diffDays, formatDate, isSameDay } from '../utils/dateUtils';
import { 
  ChevronRight, 
  ChevronDown, 
  GripVertical, 
  AlertCircle, 
  User as UserIcon,
  ArrowUpDown,
  Calendar,
  Tag,
  Hash,
  Indent,
  Outdent,
  Users
} from 'lucide-react';

interface GanttChartProps {
  tickets: Ticket[];
  users: User[];
  priorities: PriorityOption[];
  versions: Version[];
  config: GanttConfig;
  onUpdateTicket: (id: string, updates: Partial<Ticket>) => void;
  onToggleSort: (key: keyof Ticket) => void;
  onSelectTicket: (ticket: Ticket) => void;
}

type VisibleItem = 
  | { type: 'header'; assigneeId: string; title: string; avatar?: string }
  | { type: 'ticket'; ticket: Ticket; depth: number; hasChildren: boolean };

const GanttChart: React.FC<GanttChartProps> = ({ 
  tickets, users, priorities, versions, config, onUpdateTicket, onToggleSort, onSelectTicket 
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['1001']));
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null); // 'ticket-ID' or 'header-assigneeID'
  const headerScrollRef = useRef<HTMLDivElement>(null);

  const timelineDates = useMemo(() => {
    // 基準日を2026年に設定
    const start = new Date('2026-01-01');
    const end = addDays(start, 180); // 180日分表示
    return getDaysInInterval(start, end);
  }, []);

  const startDate = timelineDates[0];

  const [draggingBar, setDraggingBar] = useState<{
    id: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    originalStart: string;
    originalEnd: string;
  } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, ticket: Ticket, type: 'move' | 'resize-start' | 'resize-end') => {
    const hasChildren = tickets.some(t => t.parentId === ticket.id);
    if (hasChildren && type !== 'move') return; 
    e.stopPropagation();
    setDraggingBar({ id: ticket.id, type, startX: e.clientX, originalStart: ticket.startDate, originalEnd: ticket.dueDate });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingBar) return;
      const deltaX = e.clientX - draggingBar.startX;
      const daysDelta = Math.round(deltaX / DAY_WIDTH);
      if (daysDelta === 0) return;
      
      if (draggingBar.type === 'move') {
        let newStart = addDays(new Date(draggingBar.originalStart), daysDelta);
        let newEnd = addDays(new Date(draggingBar.originalEnd), daysDelta);
        onUpdateTicket(draggingBar.id, { startDate: formatDate(newStart), dueDate: formatDate(newEnd) });
      } else if (draggingBar.type === 'resize-start') {
        let newStart = addDays(new Date(draggingBar.originalStart), daysDelta);
        if (new Date(formatDate(newStart)) <= new Date(draggingBar.originalEnd)) {
          onUpdateTicket(draggingBar.id, { startDate: formatDate(newStart) });
        }
      } else if (draggingBar.type === 'resize-end') {
        let newEnd = addDays(new Date(draggingBar.originalEnd), daysDelta);
        if (new Date(formatDate(newEnd)) >= new Date(draggingBar.originalStart)) {
          onUpdateTicket(draggingBar.id, { dueDate: formatDate(newEnd) });
        }
      }
    };
    const handleMouseUp = () => setDraggingBar(null);
    if (draggingBar) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingBar, onUpdateTicket]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTicketId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (targetId === `ticket-${draggedTicketId}`) return;
    setDropTargetId(targetId);
  };

  const handleDrop = (e: React.DragEvent, targetAssigneeId: string | null, targetTicketId: string | null) => {
    e.preventDefault();
    if (!draggedTicketId) return;

    const updates: Partial<Ticket> = {};
    const draggedTicket = tickets.find(t => t.id === draggedTicketId);

    if (config.sortBy === 'assigneeId') {
      const newAid = targetAssigneeId === 'unassigned' ? '' : (targetAssigneeId || '');
      if (draggedTicket && draggedTicket.assigneeId !== newAid) {
        updates.assigneeId = newAid;
      }
    }

    if (targetTicketId && targetTicketId !== draggedTicketId) {
      updates.parentId = targetTicketId;
    }

    if (Object.keys(updates).length > 0) {
      onUpdateTicket(draggedTicketId, updates);
    }

    setDraggedTicketId(null);
    setDropTargetId(null);
  };

  const handleOutdent = (e: React.MouseEvent, ticket: Ticket) => {
    e.stopPropagation();
    if (!ticket.parentId) return;
    const parent = tickets.find(t => t.id === ticket.parentId);
    onUpdateTicket(ticket.id, { parentId: parent?.parentId || null });
  };

  const visibleItems = useMemo(() => {
    const result: VisibleItem[] = [];
    const isAssigneeSort = config.sortBy === 'assigneeId';

    if (isAssigneeSort) {
      const sortedUsers = [...users].sort((a, b) => {
        const order = config.sortOrder === 'asc' ? 1 : -1;
        return a.name.localeCompare(b.name) * order;
      });

      const getRootsForAssignee = (aid: string | null) => {
        return tickets.filter(t => {
          if (t.assigneeId !== (aid || '')) return false;
          const parent = t.parentId ? tickets.find(p => p.id === t.parentId) : null;
          return !parent || parent.assigneeId !== t.assigneeId;
        });
      };

      const traverse = (items: Ticket[], depth: number, assigneeId: string) => {
        items.forEach((item) => {
          const children = tickets.filter(t => t.parentId === item.id && t.assigneeId === assigneeId);
          result.push({ type: 'ticket', ticket: item, depth, hasChildren: children.length > 0 });
          if (expandedIds.has(item.id)) traverse(children, depth + 1, assigneeId);
        });
      };

      sortedUsers.forEach(user => {
        result.push({ 
          type: 'header', 
          assigneeId: user.id, 
          title: user.name, 
          avatar: user.avatar 
        });
        const roots = getRootsForAssignee(user.id);
        traverse(roots, 0, user.id);
      });

      const unassignedRoots = getRootsForAssignee(null);
      if (unassignedRoots.length > 0) {
        result.push({ 
          type: 'header', 
          assigneeId: 'unassigned', 
          title: '未割当'
        });
        traverse(unassignedRoots, 0, '');
      }
    } else {
      const roots = tickets.filter(t => !t.parentId || !tickets.some(pt => pt.id === t.parentId));
      const traverse = (items: Ticket[], depth: number) => {
        items.forEach((item) => {
          const children = tickets.filter(t => t.parentId === item.id);
          result.push({ type: 'ticket', ticket: item, depth, hasChildren: children.length > 0 });
          if (expandedIds.has(item.id)) traverse(children, depth + 1);
        });
      };
      traverse(roots, 0);
    }
    return result;
  }, [tickets, expandedIds, config.sortBy, config.sortOrder, users]);

  const sidebarWidth = 420;
  const totalWidth = timelineDates.length * DAY_WIDTH;

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex border-b border-gray-200 bg-gray-50 shrink-0 sticky top-0 z-30">
        <div className="shrink-0 border-r border-gray-200 p-3 font-bold text-gray-500 text-[10px] uppercase flex items-center justify-between" style={{ width: sidebarWidth }}>
          <div className="flex items-center gap-2">
            <GripVertical size={14} className="text-gray-300" />
            <span>チケット / 担当者</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onToggleSort('id')} className={`p-1 rounded ${config.sortBy === 'id' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-200'}`} title="IDでソート">
              <Hash size={12} />
            </button>
            <button onClick={() => onToggleSort('assigneeId')} className={`p-1 rounded ${config.sortBy === 'assigneeId' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-200'}`} title="担当者でソート">
              <UserIcon size={12} />
            </button>
            <button onClick={() => onToggleSort('dueDate')} className={`p-1 rounded ${config.sortBy === 'dueDate' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-200'}`} title="期日でソート">
              <Calendar size={12} />
            </button>
            <button onClick={() => onToggleSort('versionId')} className={`p-1 rounded ${config.sortBy === 'versionId' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-200'}`} title="バージョンでソート">
              <Tag size={12} />
            </button>
            <div className="text-blue-500 ml-1">
              {config.sortOrder === 'asc' ? <ArrowUpDown size={12} className="rotate-180" /> : <ArrowUpDown size={12} />}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden" ref={headerScrollRef}>
          <div className="flex" style={{ width: totalWidth }}>
            {timelineDates.map((date, idx) => {
              const isMonthStart = date.getDate() === 1 || idx === 0;
              const isYearStart = date.getMonth() === 0 && date.getDate() === 1;
              return (
                <div key={idx} className="shrink-0 text-center border-l border-gray-200 text-[10px] py-2 relative" style={{ width: DAY_WIDTH }}>
                  {isMonthStart && (
                    <span className="absolute top-0 left-1 font-bold text-gray-700 bg-white/80 px-1 rounded whitespace-nowrap z-10 shadow-sm border border-gray-100">
                      {(isYearStart || idx === 0) ? `${date.getFullYear()}年 ` : ''}
                      {date.getMonth()+1}月
                    </span>
                  )}
                  {date.getDate()}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto relative" onScroll={(e) => headerScrollRef.current && (headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft)}>
        <div className="flex min-h-full" style={{ width: sidebarWidth + totalWidth }}>
          <div className="sticky left-0 z-20 bg-white border-r border-gray-200 shadow-sm" style={{ width: sidebarWidth }}>
            {visibleItems.map((item, idx) => {
              if (item.type === 'header') {
                const isHeaderDropTarget = dropTargetId === `header-${item.assigneeId}`;
                return (
                  <div 
                    key={`header-${item.assigneeId}-${idx}`} 
                    onDragOver={(e) => handleDragOver(e, `header-${item.assigneeId}`)}
                    onDrop={(e) => handleDrop(e, item.assigneeId, null)}
                    onDragLeave={() => setDropTargetId(null)}
                    className={`flex items-center px-4 h-[48px] border-b border-gray-200 sticky z-10 transition-colors
                      ${isHeaderDropTarget ? 'bg-blue-100 ring-2 ring-inset ring-blue-400' : 'bg-gray-50'}
                    `}
                  >
                    <Users size={14} className="text-gray-400 mr-2" />
                    <div className="flex items-center gap-2">
                      {item.avatar && <img src={item.avatar} className="w-5 h-5 rounded-full border border-gray-200" alt="" />}
                      <span className="text-xs font-bold text-gray-600">{item.title}</span>
                      <span className="text-[9px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Group</span>
                    </div>
                  </div>
                );
              }

              const { ticket, depth, hasChildren } = item;
              const priority = priorities.find(p => p.id === ticket.priorityId);
              const assignee = users.find(u => u.id === ticket.assigneeId);
              const isTicketDropTarget = dropTargetId === `ticket-${ticket.id}`;

              return (
                <div 
                  key={ticket.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, ticket.id)}
                  onDragOver={(e) => handleDragOver(e, `ticket-${ticket.id}`)}
                  onDrop={(e) => handleDrop(e, ticket.assigneeId, ticket.id)}
                  onDragLeave={() => setDropTargetId(null)}
                  className={`flex items-center px-3 border-b border-gray-100 h-[48px] hover:bg-blue-50/50 cursor-pointer group transition-colors
                    ${isTicketDropTarget ? 'bg-blue-100 ring-2 ring-inset ring-blue-400' : ''}
                  `} 
                  onClick={() => onSelectTicket(ticket)}
                >
                  <div style={{ width: depth * 16 }} className="flex items-center justify-end pr-1 shrink-0">
                     {depth > 0 && <div className="w-[1px] h-full bg-gray-200" />}
                  </div>
                  {hasChildren ? (
                    <button className="p-1 hover:bg-gray-100 rounded mr-1" onClick={(e) => { e.stopPropagation(); const next = new Set(expandedIds); next.has(ticket.id) ? next.delete(ticket.id) : next.add(ticket.id); setExpandedIds(next); }}>
                      {expandedIds.has(ticket.id) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                    </button>
                  ) : <div className="w-6" />}
                  
                  <div className="hidden group-hover:flex items-center gap-1 mr-2 bg-white/80 backdrop-blur shadow-sm p-0.5 rounded border border-gray-200">
                    <button onClick={(e) => handleOutdent(e, ticket)} disabled={!ticket.parentId} className="p-0.5 hover:bg-gray-100 text-gray-400 disabled:opacity-30" title="親子関係を解除"><Outdent size={12}/></button>
                  </div>

                  <div className={`mr-2 shrink-0 ${priority?.color || 'text-gray-400'}`} title={priority?.name}>
                    <AlertCircle size={14}/>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono mr-2 shrink-0">#{ticket.id}</span>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className={`truncate text-sm ${hasChildren ? 'font-bold text-gray-800' : 'text-gray-700'}`}>
                      {ticket.subject}
                    </span>
                    <div className="flex items-center gap-1.5 text-[9px] text-gray-400">
                      {assignee ? (
                        <><img src={assignee.avatar} className="w-3 h-3 rounded-full" alt="" /><span className="truncate">{assignee.name}</span></>
                      ) : (
                        <span className="flex items-center gap-0.5"><UserIcon size={8} />未割当</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="relative gantt-grid" style={{ width: totalWidth }}>
            {visibleItems.map((item, idx) => {
              if (item.type === 'header') {
                return (
                  <div key={`timeline-header-${idx}`} className="h-[48px] border-b border-gray-100 bg-gray-50/30" />
                );
              }

              const { ticket, hasChildren } = item;
              const startOffset = diffDays(startDate, new Date(ticket.startDate)) * DAY_WIDTH;
              const duration = diffDays(new Date(ticket.startDate), new Date(ticket.dueDate)) + 1;
              const width = Math.max(duration * DAY_WIDTH, 20);
              const priority = priorities.find(p => p.id === ticket.priorityId);

              return (
                <div key={ticket.id} className="relative border-b border-gray-100 h-[48px]">
                  <div 
                    className={`absolute top-3 h-6 rounded-full flex items-center px-2 cursor-move group transition-all
                      ${hasChildren ? 'bg-gray-800' : 'bg-blue-600'} 
                      text-[9px] text-white font-bold shadow-sm hover:shadow-md
                      ${draggingBar?.id === ticket.id ? 'ring-2 ring-blue-300 opacity-80 scale-[1.02] z-10' : ''}
                    `}
                    style={{ left: startOffset, width }}
                    onMouseDown={(e) => handleMouseDown(e, ticket, 'move')}
                  >
                    {!hasChildren && (
                      <div 
                        className="absolute left-0 top-0 w-2 h-full cursor-ew-resize hover:bg-white/30 rounded-l-full z-20"
                        onMouseDown={(e) => handleMouseDown(e, ticket, 'resize-start')}
                      />
                    )}
                    
                    <div className="absolute left-0 top-0 bottom-0 bg-white/20 rounded-l-full pointer-events-none" style={{ width: `${ticket.progress}%` }} />
                    <span className="truncate relative z-10 drop-shadow-sm select-none">
                      {ticket.progress}% {ticket.subject}
                    </span>
                    <div className={`absolute -right-2 -top-1 p-0.5 bg-white rounded-full shadow-xs ${priority?.color || 'text-gray-400'}`} title={priority?.name}>
                      <AlertCircle size={10}/>
                    </div>

                    {!hasChildren && (
                      <div 
                        className="absolute right-0 top-0 w-2 h-full cursor-ew-resize hover:bg-white/30 rounded-r-full z-20"
                        onMouseDown={(e) => handleMouseDown(e, ticket, 'resize-end')}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
