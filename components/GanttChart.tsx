
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Ticket, GanttConfig, User, PriorityOption, Version, Holiday } from '../types';
import { DAY_WIDTH } from '../constants';
import { getDaysInInterval, addDays, diffDays, formatDate, isSameDay, getJapaneseDay } from '../utils/dateUtils';
import { 
  ChevronRight, 
  ChevronDown, 
  GripVertical, 
  AlertCircle, 
  ArrowUpDown,
  Calendar,
  Hash,
  User as UserIcon,
  UserCircle
} from 'lucide-react';

interface GanttChartProps {
  tickets: Ticket[];
  users: User[];
  priorities: PriorityOption[];
  versions: Version[];
  holidays: Holiday[];
  config: GanttConfig;
  onUpdateTicket: (id: string, updates: Partial<Ticket>) => void;
  onToggleSort: (key: keyof Ticket) => void;
  onSelectTicket: (ticket: Ticket) => void;
}

type VisibleItem = 
  | { type: 'ticket'; ticket: Ticket; depth: number; hasChildren: boolean }
  | { type: 'user-header'; user: User | null; id: string };

const GanttChart: React.FC<GanttChartProps> = ({ 
  tickets, users, priorities, versions, holidays, config, onUpdateTicket, onToggleSort, onSelectTicket 
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // --- Sorting & Hierarchy Logic ---
  const visibleItems = useMemo(() => {
    const sortItems = (items: Ticket[]) => {
      return [...items].sort((a, b) => {
        let valA: any = a[config.sortBy] || '';
        let valB: any = b[config.sortBy] || '';

        // 特殊なソートキーの処理
        if (config.sortBy === 'id') {
          valA = parseInt(a.id) || 0;
          valB = parseInt(b.id) || 0;
        } else if (config.sortBy === 'assigneeId') {
          // 担当者ソート時はチケットタイトルで並べる（ヘッダーは別管理）
          valA = a.subject;
          valB = b.subject;
        }
        
        const order = config.sortOrder === 'asc' ? 1 : -1;
        if (valA < valB) return -1 * order;
        if (valA > valB) return 1 * order;
        return 0;
      });
    };

    const result: VisibleItem[] = [];

    if (config.sortBy === 'assigneeId') {
      // 担当者ごとにグループ化
      const allDisplayUsers: (User | null)[] = [...users, null];
      allDisplayUsers.forEach(user => {
        const userId = user?.id || '';
        const headerId = `header-${userId || 'unassigned'}`;
        result.push({ type: 'user-header', user, id: headerId });
        
        const userTickets = tickets.filter(t => t.assigneeId === userId);
        // このユーザーのチケットの中で、親が同じユーザーでないものをルートとする
        const roots = sortItems(userTickets.filter(t => !t.parentId || !userTickets.some(pt => pt.id === t.parentId)));

        const traverse = (items: Ticket[], depth: number) => {
          items.forEach((item) => {
            const children = sortItems(userTickets.filter(t => t.parentId === item.id));
            result.push({ type: 'ticket', ticket: item, depth, hasChildren: children.length > 0 });
            if (expandedIds.has(item.id)) {
              traverse(children, depth + 1);
            }
          });
        };
        traverse(roots, 0);
      });
    } else {
      // 通常の階層表示
      const roots = sortItems(tickets.filter(t => !t.parentId || !tickets.some(pt => pt.id === t.parentId)));
      const traverse = (items: Ticket[], depth: number) => {
        items.forEach((item) => {
          const children = sortItems(tickets.filter(t => t.parentId === item.id));
          result.push({ type: 'ticket', ticket: item, depth, hasChildren: children.length > 0 });
          if (expandedIds.has(item.id)) {
            traverse(children, depth + 1);
          }
        });
      };
      traverse(roots, 0);
    }
    
    return result;
  }, [tickets, expandedIds, config.sortBy, config.sortOrder, users]);

  // --- Timeline Range ---
  const timelineDates = useMemo(() => {
    let minDate = new Date();
    minDate.setDate(1); // 今月の1日
    let maxDate = addDays(new Date(), 365);

    if (tickets.length > 0) {
      const startDates = tickets.map(t => new Date(t.startDate)).filter(d => !isNaN(d.getTime()));
      const endDates = tickets.map(t => new Date(t.dueDate)).filter(d => !isNaN(d.getTime()));
      
      if (startDates.length > 0) {
        const earliest = new Date(Math.min(...startDates.map(d => d.getTime())));
        minDate = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
      }
      if (endDates.length > 0) {
        const latest = new Date(Math.max(...endDates.map(d => d.getTime())));
        maxDate = addDays(latest, 90);
      }
    }
    return getDaysInInterval(minDate, maxDate);
  }, [tickets]);

  const startDate = timelineDates[0];
  const today = new Date();
  const todayOffset = useMemo(() => {
    if (!startDate) return 0;
    return diffDays(startDate, today) * DAY_WIDTH;
  }, [startDate, today]);

  // Initial Scroll to Today (Leftmost)
  useEffect(() => {
    if (timelineScrollRef.current && timelineDates.length > 0) {
      // ユーザーの要望通り「本日」を一番左にする
      timelineScrollRef.current.scrollLeft = Math.max(0, todayOffset);
    }
  }, [timelineDates.length]);

  // --- Bar Interaction ---
  const [draggingBar, setDraggingBar] = useState<{
    id: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    originalStart: string;
    originalEnd: string;
  } | null>(null);

  const handleBarMouseDown = (e: React.MouseEvent, ticket: Ticket, type: 'move' | 'resize-start' | 'resize-end') => {
    const hasChildren = tickets.some(t => t.parentId === ticket.id);
    if (hasChildren && type !== 'move') return; 
    e.stopPropagation();
    setDraggingBar({ 
      id: ticket.id, type, startX: e.clientX, originalStart: ticket.startDate, originalEnd: ticket.dueDate
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingBar) return;
      const deltaX = e.clientX - draggingBar.startX;
      const daysDelta = Math.round(deltaX / DAY_WIDTH);
      if (daysDelta === 0) return;
      
      const moveStart = addDays(new Date(draggingBar.originalStart), daysDelta);
      const moveEnd = addDays(new Date(draggingBar.originalEnd), daysDelta);

      if (draggingBar.type === 'move') {
        onUpdateTicket(draggingBar.id, { startDate: formatDate(moveStart), dueDate: formatDate(moveEnd) });
      } else if (draggingBar.type === 'resize-end') {
        const newEnd = addDays(new Date(draggingBar.originalEnd), daysDelta);
        if (diffDays(new Date(draggingBar.originalStart), newEnd) + 1 >= 1) {
          onUpdateTicket(draggingBar.id, { dueDate: formatDate(newEnd), estimatedHours: diffDays(new Date(draggingBar.originalStart), newEnd) + 1 });
        }
      } else if (draggingBar.type === 'resize-start') {
        const newStart = addDays(new Date(draggingBar.originalStart), daysDelta);
        if (diffDays(newStart, new Date(draggingBar.originalEnd)) + 1 >= 1) {
          onUpdateTicket(draggingBar.id, { startDate: formatDate(newStart), estimatedHours: diffDays(newStart, new Date(draggingBar.originalEnd)) + 1 });
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
  }, [draggingBar]);

  // --- Drag & Drop ---
  const handleDragStart = (e: React.DragEvent, id: string, type: 'ticket' | 'user') => {
    e.dataTransfer.setData('sourceId', id);
    e.dataTransfer.setData('sourceType', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(targetId);
  };

  const handleDrop = (e: React.DragEvent, targetId: string, targetType: 'ticket' | 'user-header') => {
    e.preventDefault();
    setDragOverId(null);
    const sourceId = e.dataTransfer.getData('sourceId');
    const sourceType = e.dataTransfer.getData('sourceType');

    if (!sourceId) return;

    if (targetType === 'user-header') {
      const targetUserId = targetId.replace('header-', '');
      const finalUserId = targetUserId === 'unassigned' ? '' : targetUserId;
      if (sourceType === 'ticket') {
        onUpdateTicket(sourceId, { assigneeId: finalUserId });
      }
    } else if (targetType === 'ticket' && sourceId !== targetId) {
      if (sourceType === 'ticket') {
        // 循環参照チェック
        const isDescendant = (parentId: string, childId: string): boolean => {
          const child = tickets.find(t => t.id === childId);
          if (!child || !child.parentId) return false;
          if (child.parentId === parentId) return true;
          return isDescendant(parentId, child.parentId);
        };
        if (!isDescendant(sourceId, targetId)) {
          onUpdateTicket(sourceId, { parentId: targetId });
          setExpandedIds(prev => new Set(prev).add(targetId));
        }
      } else if (sourceType === 'user') {
        onUpdateTicket(targetId, { assigneeId: sourceId });
      }
    }
  };

  const sidebarWidth = 420;
  const totalWidth = timelineDates.length * DAY_WIDTH;

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header Row */}
      <div className="flex border-b border-gray-200 bg-gray-50 shrink-0 sticky top-0 z-30">
        <div className="shrink-0 border-r border-gray-200 p-3 font-bold text-gray-500 text-[10px] uppercase flex items-center justify-between" style={{ width: sidebarWidth }}>
          <div className="flex items-center gap-2">
            <GripVertical size={14} className="text-gray-300" />
            <span>タスクリスト {config.sortBy === 'assigneeId' ? '(担当者別)' : ''}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => onToggleSort('id')} className={`p-1.5 rounded transition-all ${config.sortBy === 'id' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-200'}`} title="IDでソート"><Hash size={12} /></button>
            <button onClick={() => onToggleSort('assigneeId')} className={`p-1.5 rounded transition-all ${config.sortBy === 'assigneeId' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-200'}`} title="担当者でソート"><UserIcon size={12} /></button>
            <button onClick={() => onToggleSort('dueDate')} className={`p-1.5 rounded transition-all ${config.sortBy === 'dueDate' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-200'}`} title="期日でソート"><Calendar size={12} /></button>
            <div className="text-blue-500 ml-1 font-bold">
              {config.sortOrder === 'asc' ? <ArrowUpDown size={12} className="rotate-180" /> : <ArrowUpDown size={12} />}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden" ref={headerScrollRef}>
          <div className="flex" style={{ width: totalWidth }}>
            {timelineDates.map((date, idx) => {
              const isToday = isSameDay(date, today);
              const holiday = holidays.find(h => h.date === formatDate(date));
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              const isRed = !!holiday || date.getDay() === 0;
              const isBlue = date.getDay() === 6;
              return (
                <div key={idx} className={`shrink-0 text-center border-l border-gray-200 text-[9px] py-1.5 relative ${isToday ? 'bg-blue-50/50' : (isWeekend || holiday) ? 'bg-gray-100/40' : ''}`} style={{ width: DAY_WIDTH }}>
                  {date.getDate() === 1 && (
                    <span className="absolute top-0 left-1 font-bold text-[10px] text-gray-700 bg-white/95 px-1 rounded z-10 shadow-sm border border-gray-100 whitespace-nowrap">
                      {date.getFullYear()}年{date.getMonth()+1}月
                    </span>
                  )}
                  <div className="flex flex-col leading-tight mt-1">
                    <span className={`${isToday ? 'text-blue-600 font-bold' : isRed ? 'text-red-500' : isBlue ? 'text-blue-500' : 'text-gray-700'}`}>{date.getDate()}</span>
                    <span className={`text-[8px] font-bold ${isToday ? 'text-blue-600' : isRed ? 'text-red-600' : isBlue ? 'text-blue-500' : 'text-gray-400'}`}>{holiday ? '祝' : getJapaneseDay(date)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-auto relative" ref={timelineScrollRef} onScroll={(e) => headerScrollRef.current && (headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft)}>
        <div className="flex min-h-full" style={{ width: sidebarWidth + totalWidth }}>
          {/* Grid bg */}
          <div className="absolute top-0 bottom-0 pointer-events-none flex" style={{ left: sidebarWidth }}>
            {timelineDates.map((date, idx) => {
              const day = date.getDay();
              const isHoliday = holidays.some(h => h.date === formatDate(date));
              const bgClass = (isHoliday || day === 0) ? 'bg-red-50/20' : day === 6 ? 'bg-blue-50/20' : '';
              return <div key={idx} className={`h-full border-l border-gray-100 ${bgClass}`} style={{ width: DAY_WIDTH }} />;
            })}
          </div>

          {todayOffset >= 0 && todayOffset < totalWidth && (
            <div className="absolute top-0 bottom-0 w-[2px] bg-red-400/60 z-20 pointer-events-none" style={{ left: sidebarWidth + todayOffset }} />
          )}

          {/* Sidebar List */}
          <div className="sticky left-0 z-30 bg-white border-r border-gray-200 shadow-sm" style={{ width: sidebarWidth }}>
            {visibleItems.map((item) => {
              if (item.type === 'user-header') {
                const isTarget = dragOverId === item.id;
                return (
                  <div 
                    key={item.id}
                    onDragOver={(e) => handleDragOver(e, item.id)}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={(e) => handleDrop(e, item.id, 'user-header')}
                    className={`flex items-center px-4 h-[40px] bg-gray-100/80 border-b border-gray-200 transition-all ${isTarget ? 'bg-blue-100 ring-2 ring-inset ring-blue-400 z-10' : ''}`}
                  >
                    <div className="flex items-center gap-2 text-gray-600">
                      {item.user ? <img src={item.user.avatar} className="w-5 h-5 rounded-full border border-gray-300" alt="" /> : <UserCircle size={18} className="text-gray-400" />}
                      <span className="text-xs font-bold">{item.user ? item.user.name : '未割当'}</span>
                      <span className="text-[10px] bg-white/80 px-1.5 py-0.5 rounded-full text-gray-400 font-mono shadow-sm">
                        {tickets.filter(t => t.assigneeId === (item.user?.id || '')).length}
                      </span>
                    </div>
                  </div>
                );
              }

              const { ticket, depth, hasChildren } = item;
              const priority = priorities.find(p => p.id === ticket.priorityId);
              const assignee = users.find(u => u.id === ticket.assigneeId);
              const isTarget = dragOverId === ticket.id;

              return (
                <div 
                  key={ticket.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, ticket.id, 'ticket')}
                  onDragOver={(e) => handleDragOver(e, ticket.id)}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={(e) => handleDrop(e, ticket.id, 'ticket')}
                  className={`flex items-center px-3 border-b border-gray-100 h-[48px] hover:bg-blue-50/50 cursor-pointer group transition-all relative ${isTarget ? 'bg-blue-100 ring-2 ring-inset ring-blue-400 z-10' : ''}`} 
                  onClick={() => onSelectTicket(ticket)}
                >
                  <div style={{ width: depth * 16 }} className="shrink-0" />
                  {hasChildren ? (
                    <button className="p-1 hover:bg-gray-200 rounded mr-1 text-gray-400" onClick={(e) => { e.stopPropagation(); const next = new Set(expandedIds); next.has(ticket.id) ? next.delete(ticket.id) : next.add(ticket.id); setExpandedIds(next); }}>
                      {expandedIds.has(ticket.id) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                    </button>
                  ) : <div className="w-6" />}
                  <div className={`mr-2 shrink-0 ${priority?.color || 'text-gray-400'}`}><AlertCircle size={14}/></div>
                  <span className="text-[10px] text-gray-400 font-mono mr-2 shrink-0">#{ticket.id}</span>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className={`truncate text-sm ${hasChildren ? 'font-bold text-gray-800' : 'text-gray-700'}`}>{ticket.subject}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-1 opacity-70">
                        <UserIcon size={10} className="text-gray-400" />
                        <span className={`text-[9px] font-bold truncate ${assignee ? 'text-blue-600' : 'text-gray-400'}`}>
                          {assignee ? assignee.name : '未割当'}
                        </span>
                      </div>
                      <span className="text-[9px] text-gray-300">|</span>
                      <span className="text-[9px] text-gray-400 font-mono">{ticket.dueDate.replace(/-/g, '/')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Clear Parent Target */}
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const sid = e.dataTransfer.getData('sourceId');
                const stype = e.dataTransfer.getData('sourceType');
                if (stype === 'ticket') onUpdateTicket(sid, { parentId: null });
              }}
              className="h-16 flex items-center justify-center text-[10px] text-gray-300 italic border-t border-dashed border-gray-100"
            >
              ここにドロップして親子関係を解除
            </div>
          </div>

          {/* Timeline Bars */}
          <div className="relative" style={{ width: totalWidth }}>
            {visibleItems.map((item) => {
              if (item.type === 'user-header') return <div key={item.id} className="h-[40px] border-b border-gray-200 bg-gray-100/20" />;

              const { ticket, hasChildren } = item;
              const startOffset = diffDays(startDate, new Date(ticket.startDate)) * DAY_WIDTH;
              const displayDays = Math.max(1, ticket.estimatedHours || 1);
              const width = displayDays * DAY_WIDTH;

              return (
                <div key={ticket.id} className="relative border-b border-gray-100 h-[48px]">
                  <div 
                    className={`absolute top-3 h-6 rounded-full flex items-center px-2 cursor-move group transition-all ${hasChildren ? 'bg-gray-800' : 'bg-blue-600'} text-[9px] text-white font-bold shadow-sm hover:shadow-md z-10 hover:scale-[1.01]`}
                    style={{ left: startOffset, width }}
                    onMouseDown={(e) => handleBarMouseDown(e, ticket, 'move')}
                  >
                    {!hasChildren && <div className="absolute left-0 top-0 w-2 h-full cursor-ew-resize hover:bg-white/30 rounded-l-full z-20" onMouseDown={(e) => handleBarMouseDown(e, ticket, 'resize-start')} />}
                    <div className="absolute left-0 top-0 bottom-0 bg-white/20 rounded-l-full pointer-events-none" style={{ width: `${ticket.progress}%` }} />
                    <span className="truncate relative z-10 select-none drop-shadow-sm font-medium">{ticket.progress}% {ticket.subject}</span>
                    {!hasChildren && <div className="absolute right-0 top-0 w-2 h-full cursor-ew-resize hover:bg-white/30 rounded-r-full z-20" onMouseDown={(e) => handleBarMouseDown(e, ticket, 'resize-end')} />}
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
