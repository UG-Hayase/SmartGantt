
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Ticket, GanttConfig, User, PriorityOption, Version, Holiday, Status } from '../types';
import { DAY_WIDTH } from '../constants';
import { getDaysInInterval, addDays, diffDays, formatDate, parseDate, isSameDay, getJapaneseDay, addWorkDays, countWorkDays, isWorkDay } from '../utils/dateUtils';
import { 
  ChevronRight, 
  ChevronDown, 
  GripVertical, 
  UserCircle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  MoveUp,
  Link2Off
} from 'lucide-react';

interface GanttChartProps {
  tickets: Ticket[];
  users: User[];
  statuses: Status[];
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
  tickets, users, statuses, priorities, versions, holidays, config, onUpdateTicket, onToggleSort, onSelectTicket 
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const gridBodyRef = useRef<HTMLDivElement>(null);

  // サイドバー幅
  const sidebarWidth = 580; 

  // ガントバーのドラッグ用
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);

  // サイドバー（リスト）のドラッグ＆ドロップ用
  const [draggingListTicketId, setDraggingListTicketId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  // --- Sorting & Hierarchy Logic ---
  const visibleItems = useMemo(() => {
    const sortItems = (items: Ticket[]) => {
      return [...items].sort((a, b) => {
        let valA: any = (a as any)[config.sortBy] || '';
        let valB: any = (b as any)[config.sortBy] || '';
        
        if (config.sortBy === 'id') {
          valA = parseInt(a.id) || 0;
          valB = parseInt(b.id) || 0;
        } else if (config.sortBy === 'dueDate' || config.sortBy === 'startDate') {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        }

        const order = config.sortOrder === 'asc' ? 1 : -1;
        if (valA < valB) return -1 * order;
        if (valA > valB) return 1 * order;
        return 0;
      });
    };

    const result: VisibleItem[] = [];

    if (config.sortBy === 'assigneeId') {
      const allDisplayUsers: (User | null)[] = [...users, null];
      allDisplayUsers.forEach(user => {
        const userId = user?.id || '';
        result.push({ type: 'user-header', user, id: `header-${userId || 'unassigned'}` });
        
        const userTickets = tickets.filter(t => t.assigneeId === userId);
        const userRoots = sortItems(userTickets.filter(t => 
          !t.parentId || !userTickets.some(pt => pt.id === t.parentId)
        ));

        const traverse = (items: Ticket[], depth: number) => {
          items.forEach((item) => {
            const children = sortItems(userTickets.filter(t => t.parentId === item.id));
            result.push({ type: 'ticket', ticket: item, depth, hasChildren: children.length > 0 });
            if (expandedIds.has(item.id)) {
              traverse(children, depth + 1);
            }
          });
        };
        traverse(userRoots, 0);
      });
    } else {
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

  // --- Helpers for Relationship Validation ---
  const isAncestor = (ancestorId: string, ticketId: string): boolean => {
    let current = tickets.find(t => t.id === ticketId);
    while (current && current.parentId) {
      if (current.parentId === ancestorId) return true;
      current = tickets.find(t => t.id === current!.parentId);
    }
    return false;
  };

  // --- Timeline Range ---
  const timelineDates = useMemo(() => {
    let minDate = new Date();
    minDate.setDate(1); 
    let maxDate = addDays(new Date(), 365);
    if (tickets.length > 0) {
      const startDates = tickets.map(t => parseDate(t.startDate)).filter(d => !isNaN(d.getTime()));
      const endDates = tickets.map(t => parseDate(t.dueDate)).filter(d => !isNaN(d.getTime()));
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

  const monthSpans = useMemo(() => {
    const spans: { label: string; width: number }[] = [];
    if (timelineDates.length === 0) return spans;
    let currentMonth = -1;
    let currentYear = -1;
    let currentWidth = 0;
    timelineDates.forEach((date) => {
      const month = date.getMonth();
      const year = date.getFullYear();
      if (month !== currentMonth || year !== currentYear) {
        if (currentMonth !== -1) spans.push({ label: `${currentYear}年 ${currentMonth + 1}月`, width: currentWidth });
        currentMonth = month;
        currentYear = year;
        currentWidth = 0;
      }
      currentWidth += DAY_WIDTH;
    });
    spans.push({ label: `${currentYear}年 ${currentMonth + 1}月`, width: currentWidth });
    return spans;
  }, [timelineDates]);

  const timelineMin = timelineDates[0];
  const today = new Date();
  const todayOffset = useMemo(() => {
    if (!timelineMin) return 0;
    return diffDays(timelineMin, today) * DAY_WIDTH;
  }, [timelineMin, today]);
  const timelineMax = timelineDates[timelineDates.length - 1];

  useEffect(() => {
    if (timelineScrollRef.current && timelineDates.length > 0) {
      const timer = setTimeout(() => {
        if (timelineScrollRef.current) timelineScrollRef.current.scrollLeft = todayOffset - 200;
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [timelineDates.length, todayOffset]);

  // --- Gantt Bar Interaction ---
  const [draggingBar, setDraggingBar] = useState<{
    id: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    startY: number;
    originalStart: string;
    originalEnd: string;
    originalAssigneeId: string;
    estimatedHours: number;
  } | null>(null);

  const handleBarMouseDown = (e: React.MouseEvent, ticket: Ticket, type: 'move' | 'resize-start' | 'resize-end') => {
    const hasChildren = tickets.some(t => t.parentId === ticket.id);
    if (hasChildren && type !== 'move') return; 
    e.stopPropagation();
    setDraggingBar({ 
      id: ticket.id, 
      type, 
      startX: e.clientX, 
      startY: e.clientY,
      originalStart: ticket.startDate, 
      originalEnd: ticket.dueDate, 
      originalAssigneeId: ticket.assigneeId,
      estimatedHours: ticket.estimatedHours 
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingBar) return;
      
      const deltaX = e.clientX - draggingBar.startX;
      const daysDelta = Math.round(deltaX / DAY_WIDTH);
      
      if (config.sortBy === 'assigneeId' && draggingBar.type === 'move' && gridBodyRef.current) {
        const gridRect = gridBodyRef.current.getBoundingClientRect();
        const scrollY = timelineScrollRef.current?.scrollTop || 0;
        const relativeY = e.clientY - gridRect.top + scrollY;
        
        let accumulatedY = 0;
        let foundUserId: string | null = null;
        let lastHeaderUserId: string | null = null;

        for (const item of visibleItems) {
          const height = item.type === 'user-header' ? 40 : 48;
          if (item.type === 'user-header') {
            lastHeaderUserId = item.user?.id || '';
          }
          if (relativeY >= accumulatedY && relativeY < accumulatedY + height) {
            foundUserId = lastHeaderUserId;
            break;
          }
          accumulatedY += height;
        }
        setHoveredUserId(foundUserId);
      }

      if (daysDelta === 0 && config.sortBy !== 'assigneeId') return;

      if (draggingBar.type === 'move') {
        let newStart = addDays(parseDate(draggingBar.originalStart), daysDelta);
        if (newStart < timelineMin) newStart = new Date(timelineMin);
        while (!isWorkDay(newStart, holidays) && newStart < timelineMax) newStart = addDays(newStart, 1);
        const newDue = addWorkDays(newStart, draggingBar.estimatedHours, holidays);
        if (newDue > timelineMax) return; 
        onUpdateTicket(draggingBar.id, { startDate: formatDate(newStart), dueDate: formatDate(newDue) });
      } else if (draggingBar.type === 'resize-end') {
        let newEnd = addDays(parseDate(draggingBar.originalEnd), daysDelta);
        if (newEnd > timelineMax) newEnd = new Date(timelineMax);
        const newWorkDays = countWorkDays(parseDate(draggingBar.originalStart), newEnd, holidays);
        if (newWorkDays >= 1) {
          const actualDue = addWorkDays(parseDate(draggingBar.originalStart), newWorkDays, holidays);
          onUpdateTicket(draggingBar.id, { dueDate: formatDate(actualDue), estimatedHours: newWorkDays });
        }
      } else if (draggingBar.type === 'resize-start') {
        let newStart = addDays(parseDate(draggingBar.originalStart), daysDelta);
        if (newStart < timelineMin) newStart = new Date(timelineMin);
        while (!isWorkDay(newStart, holidays) && newStart < parseDate(draggingBar.originalEnd)) newStart = addDays(newStart, 1);
        const newWorkDays = countWorkDays(newStart, parseDate(draggingBar.originalEnd), holidays);
        if (newWorkDays >= 1) onUpdateTicket(draggingBar.id, { startDate: formatDate(newStart), estimatedHours: newWorkDays });
      }
    };

    const handleMouseUp = () => {
      if (draggingBar && draggingBar.type === 'move' && config.sortBy === 'assigneeId' && hoveredUserId !== null) {
        if (hoveredUserId !== draggingBar.originalAssigneeId) {
          onUpdateTicket(draggingBar.id, { assigneeId: hoveredUserId });
        }
      }
      setDraggingBar(null);
      setHoveredUserId(null);
    };

    if (draggingBar) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingBar, holidays, onUpdateTicket, timelineMin, timelineMax, config.sortBy, visibleItems, hoveredUserId]);

  // --- Sidebar List Drag & Drop Handlers ---
  const handleListDragStart = (e: React.DragEvent, ticketId: string) => {
    setDraggingListTicketId(ticketId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ticketId);
  };

  const handleListDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggingListTicketId === targetId) return;
    
    // 循環参照のチェック（チケットへのドロップ時）
    if (targetId !== 'root' && !targetId.startsWith('header-')) {
      if (isAncestor(draggingListTicketId!, targetId)) {
        e.dataTransfer.dropEffect = 'none';
        setDropTargetId(null);
        return;
      }
    }

    setDropTargetId(targetId);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleListDrop = (e: React.DragEvent, targetId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const draggedId = draggingListTicketId;
    setDraggingListTicketId(null);
    setDropTargetId(null);

    if (!draggedId) return;

    if (targetId === 'root') {
      // 親子関係を解消（ルートタスクにする）
      onUpdateTicket(draggedId, { parentId: null });
    } else if (targetId.startsWith('header-')) {
      // 担当者変更 ＋ 親子関係を解消（担当グループのトップレベルへ）
      const newAssigneeId = targetId.replace('header-', '');
      onUpdateTicket(draggedId, { assigneeId: newAssigneeId || '', parentId: null });
    } else {
      // 親子関係の構築
      if (draggedId === targetId) return;
      if (isAncestor(draggedId, targetId)) {
        alert('循環参照になるため親子関係を設定できません。');
        return;
      }
      onUpdateTicket(draggedId, { parentId: targetId });
      setExpandedIds(prev => new Set(prev).add(targetId));
    }
  };

  const SortBtn = ({ label, sortKey }: { label: string, sortKey: keyof Ticket }) => {
    const isActive = config.sortBy === sortKey;
    return (
      <button 
        onClick={() => onToggleSort(sortKey)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${isActive ? 'bg-blue-600 text-white border-blue-700 shadow-lg shadow-blue-100' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
      >
        {label}
        {isActive ? (config.sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-20" />}
      </button>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden select-none">
      <div className="flex-1 flex overflow-auto scrollbar-thin scrollbar-thumb-gray-200" ref={timelineScrollRef}>
        {/* Sidebar */}
        <div className="sticky left-0 z-30 bg-white border-r border-gray-200 shadow-md shrink-0 flex flex-col" style={{ width: sidebarWidth }}>
          <div className="sticky top-0 z-40 flex flex-col h-[96px] border-b border-gray-200 bg-gray-50 shrink-0 shadow-sm">
            <div className="flex items-center h-1/2 px-4 border-b border-gray-100 font-black text-[10px] text-gray-400 uppercase tracking-widest gap-2 bg-gray-50">
              <GripVertical size={14} className="text-gray-300" /> Task Hierarchy & List
            </div>
            <div className="flex items-center h-1/2 px-4 gap-3 bg-white">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mr-1">Sort Mode:</span>
              <SortBtn label="ID順" sortKey="id" />
              <SortBtn label="期日順" sortKey="dueDate" />
              <SortBtn label="担当者順" sortKey="assigneeId" />
            </div>
          </div>
          <div className="flex-1 relative bg-white overflow-y-auto overflow-x-hidden min-h-full">
            {visibleItems.map(item => {
              if (item.type === 'user-header') {
                const isHoveredByBar = config.sortBy === 'assigneeId' && hoveredUserId !== null && (item.user?.id || '') === hoveredUserId;
                const isHoveredByList = dropTargetId === item.id;
                
                return (
                  <div 
                    key={item.id} 
                    onDragOver={(e) => handleListDragOver(e, item.id)}
                    onDrop={(e) => handleListDrop(e, item.id)}
                    onDragLeave={() => setDropTargetId(null)}
                    className={`h-[40px] flex items-center px-4 border-y gap-2 sticky top-[0px] z-10 transition-all duration-200 ${isHoveredByBar || isHoveredByList ? 'bg-blue-600 text-white border-blue-700 shadow-lg' : 'bg-gray-50 border-gray-100 text-gray-600'}`}
                  >
                    {item.user ? <img src={item.user.avatar} alt="" className="w-5 h-5 rounded-full border border-gray-300" /> : <UserCircle size={14} className={isHoveredByBar || isHoveredByList ? 'text-blue-200' : 'text-gray-400'} />}
                    <span className={`text-[11px] font-black uppercase tracking-wide truncate ${isHoveredByBar || isHoveredByList ? 'text-white' : 'text-gray-600'}`}>{item.user?.name || '未割当'}</span>
                    <div className={`flex-1 h-[1px] ml-2 ${isHoveredByBar || isHoveredByList ? 'bg-blue-400' : 'bg-gray-200'}`} />
                  </div>
                );
              }
              const { ticket, depth, hasChildren } = item;
              const assignee = users.find(u => u.id === ticket.assigneeId);
              const status = statuses.find(s => s.id === ticket.statusId);
              const isBeingDraggedByBar = draggingBar?.id === ticket.id;
              const isBeingDraggedByList = draggingListTicketId === ticket.id;
              const isDropTarget = dropTargetId === ticket.id;
              
              return (
                <div 
                  key={ticket.id}
                  onClick={() => onSelectTicket(ticket)}
                  draggable
                  onDragStart={(e) => handleListDragStart(e, ticket.id)}
                  onDragOver={(e) => handleListDragOver(e, ticket.id)}
                  onDrop={(e) => handleListDrop(e, ticket.id)}
                  onDragLeave={() => setDropTargetId(null)}
                  className={`flex items-center h-[48px] border-b border-gray-50 px-3 cursor-pointer hover:bg-blue-50/50 transition-all group 
                    ${isBeingDraggedByBar || isBeingDraggedByList ? 'bg-blue-50 opacity-40 grayscale-[0.5]' : ''} 
                    ${isDropTarget ? 'bg-blue-500 text-white ring-2 ring-blue-400 scale-[1.01] z-20 shadow-md rounded-md' : ''}`}
                  style={{ paddingLeft: depth * 16 + 12 }}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <GripVertical size={14} className={`mr-1 opacity-0 group-hover:opacity-100 transition-opacity ${isDropTarget ? 'text-blue-200' : 'text-gray-300'}`} />
                    {hasChildren ? (
                      <button onClick={(e) => { e.stopPropagation(); const next = new Set(expandedIds); if (next.has(ticket.id)) next.delete(ticket.id); else next.add(ticket.id); setExpandedIds(next); }} className={`p-1 rounded mr-1 shrink-0 ${isDropTarget ? 'hover:bg-blue-600 text-white' : 'hover:bg-gray-200'}`}>
                        {expandedIds.has(ticket.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    ) : <div className="w-6 shrink-0" />}
                    <span className={`text-[10px] font-mono mr-2 shrink-0 ${isDropTarget ? 'text-blue-200' : 'text-gray-400'}`}>#{ticket.id}</span>
                    <span className={`text-xs truncate ${hasChildren ? 'font-bold' : ''} ${isDropTarget ? 'text-white' : 'text-gray-600'}`}>{ticket.subject}</span>
                  </div>
                  
                  {!isDropTarget && (
                    <div className="flex items-center gap-3 ml-2 shrink-0 border-l border-gray-100 pl-3">
                      <div className="w-[85px] flex justify-center">
                        {status && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter truncate max-w-full ${status.color}`}>
                            {status.name}
                          </span>
                        )}
                      </div>
                      <div className="w-[45px] flex items-center justify-end">
                        <span className={`text-[10px] font-mono font-bold ${ticket.progress === 100 ? 'text-emerald-600' : 'text-blue-500'}`}>{ticket.progress}%</span>
                      </div>
                      <div className="w-[100px] flex items-center gap-2">
                        {assignee ? (
                          <>
                            <img src={assignee.avatar} className="w-5 h-5 rounded-full border border-gray-100 shrink-0" />
                            <span className="text-[10px] font-medium text-gray-500 truncate">{assignee.name.split(' ')[0]}</span>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 opacity-30"><UserCircle size={16} /><span className="text-[10px] font-medium text-gray-400 italic">未割当</span></div>
                        )}
                      </div>
                    </div>
                  )}
                  {isDropTarget && (
                    <div className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-blue-100">
                      <ChevronRight size={14} /> 親タスクに設定
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* 親子関係解消専用エリア */}
            <div 
              className={`min-h-[120px] m-4 border-2 border-dashed rounded-xl flex items-center justify-center transition-all duration-300 ${draggingListTicketId ? 'opacity-100 scale-100 border-blue-400 bg-blue-50' : 'opacity-0 scale-95 pointer-events-none'}`}
              onDragOver={(e) => handleListDragOver(e, 'root')}
              onDrop={(e) => handleListDrop(e, 'root')}
            >
              <div className={`flex flex-col items-center gap-2 ${dropTargetId === 'root' ? 'text-blue-700' : 'text-blue-400'}`}>
                <Link2Off size={24} className={dropTargetId === 'root' ? 'animate-bounce' : 'animate-pulse'} />
                <div className="flex flex-col items-center">
                  <span className="text-xs font-black uppercase tracking-widest">{dropTargetId === 'root' ? '離して親子関係を解除' : 'ここにドロップして親子関係を解除'}</span>
                  <span className="text-[9px] font-medium mt-1">このタスクを最上位（ルート）に移動します</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative min-w-max flex flex-col min-h-full">
          <div className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200 shadow-sm shrink-0">
            <div className="flex h-[24px] border-b border-gray-100 bg-gray-100">
              {monthSpans.map((span, i) => (
                <div key={i} className="shrink-0 border-r border-gray-200 flex items-center px-3 text-[10px] font-black text-gray-500 bg-gray-50/50 truncate" style={{ width: span.width }}>{span.label}</div>
              ))}
            </div>
            <div className="flex h-[72px] bg-gray-50">
              {timelineDates.map(date => {
                const isToday = isSameDay(date, today);
                const holiday = holidays.find(h => h.date === formatDate(date));
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const isSat = date.getDay() === 6;
                const isSunOrHol = date.getDay() === 0 || !!holiday;
                return (
                  <div key={date.toISOString()} className={`w-[40px] shrink-0 text-center flex flex-col items-center justify-center border-r border-gray-100 ${isWeekend || holiday ? 'bg-gray-100/30' : ''} ${isToday ? 'bg-blue-50/70' : ''}`}>
                    <span className={`text-[8px] font-bold ${isSunOrHol ? 'text-red-400' : isSat ? 'text-blue-400' : 'text-gray-400'}`}>{getJapaneseDay(date)}</span>
                    <span className={`text-[11px] font-mono font-black ${isSunOrHol ? 'text-red-500' : isSat ? 'text-blue-600' : isToday ? 'text-blue-600 underline' : 'text-gray-600'}`}>{date.getDate()}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* ガントグリッド領域 */}
          <div className="relative flex-1" ref={gridBodyRef}>
            <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none flex">
              {timelineDates.map(date => {
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const isHoliday = holidays.some(h => h.date === formatDate(date));
                return <div key={date.toISOString()} className={`w-[40px] shrink-0 border-r border-gray-50 h-full ${isWeekend || isHoliday ? 'bg-gray-50/40' : ''}`} />;
              })}
            </div>
            {visibleItems.map(item => {
              if (item.type === 'user-header') {
                const isHovered = config.sortBy === 'assigneeId' && hoveredUserId !== null && (item.user?.id || '') === hoveredUserId;
                const isListHovered = dropTargetId === item.id;
                return <div key={item.id} className={`h-[40px] border-b transition-colors ${isHovered || isListHovered ? 'bg-blue-100 border-blue-200' : 'border-gray-100 bg-gray-50/20'}`} />;
              }
              const { ticket, hasChildren } = item;
              const start = parseDate(ticket.startDate);
              const due = parseDate(ticket.dueDate);
              const startOffset = diffDays(timelineMin, start) * DAY_WIDTH;
              const calendarSpan = diffDays(start, due) + 1;
              const barWidth = Math.max(1, calendarSpan) * DAY_WIDTH;
              const isDropTarget = dropTargetId === ticket.id;

              return (
                <div key={ticket.id} className={`relative h-[48px] border-b border-gray-50 ${isDropTarget ? 'bg-blue-50' : ''}`}>
                  <div 
                    className={`absolute h-7 top-1/2 -translate-y-1/2 rounded-full shadow-sm border border-blue-400/30 group/bar flex items-center justify-center min-w-[20px] cursor-move select-none z-10 transition-shadow hover:shadow-md ${hasChildren ? 'bg-gray-800' : 'bg-blue-500'} ${draggingBar?.id === ticket.id ? 'opacity-90 ring-2 ring-white scale-[1.02]' : ''}`} 
                    style={{ left: startOffset, width: barWidth }} 
                    onMouseDown={(e) => handleBarMouseDown(e, ticket, 'move')}
                    onDoubleClick={() => onSelectTicket(ticket)}
                  >
                    {!hasChildren && (
                      <>
                        <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 rounded-l-full" onMouseDown={(e) => handleBarMouseDown(e, ticket, 'resize-start')} />
                        <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 rounded-r-full" onMouseDown={(e) => handleBarMouseDown(e, ticket, 'resize-end')} />
                      </>
                    )}
                    <div className="absolute left-0 top-0 bottom-0 bg-white/20 rounded-full pointer-events-none" style={{ width: `${ticket.progress}%` }} />
                    <span className="text-[9px] text-white font-bold truncate px-2 relative z-10 pointer-events-none tracking-tight">{ticket.progress}% {ticket.subject}</span>
                  </div>
                </div>
              );
            })}
            {/* TODAY 赤線: z-indexを25にして、サイドバー(z-30)より低く、バー(z-10)より高く設定。 */}
            <div className="absolute top-[-96px] bottom-0 w-[2px] bg-red-500 z-[25] pointer-events-none opacity-90" style={{ left: todayOffset }}>
               <div className="sticky top-[100px] -ml-[22px] bg-red-600 text-white text-[9px] px-2 py-0.5 rounded shadow-lg font-black tracking-tighter ring-1 ring-white/30 whitespace-nowrap">TODAY</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
