
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
  Hash
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

type VisibleItem = { type: 'ticket'; ticket: Ticket; depth: number; hasChildren: boolean };

const GanttChart: React.FC<GanttChartProps> = ({ 
  tickets, users, priorities, versions, holidays, config, onUpdateTicket, onToggleSort, onSelectTicket 
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  const timelineDates = useMemo(() => {
    let minDate = new Date(2026, 0, 1);
    let maxDate = new Date(2027, 11, 31);

    if (tickets.length > 0) {
      const startDates = tickets.map(t => new Date(t.startDate)).filter(d => !isNaN(d.getTime()));
      const endDates = tickets.map(t => new Date(t.dueDate)).filter(d => !isNaN(d.getTime()));
      
      if (startDates.length > 0) {
        const earliest = new Date(Math.min(...startDates.map(d => d.getTime())));
        minDate = new Date(earliest.getFullYear(), 0, 1);
      }
      if (endDates.length > 0) {
        const latest = new Date(Math.max(...endDates.map(d => d.getTime())));
        maxDate = addDays(latest, 365);
      }
    } else {
      maxDate = new Date(2027, 11, 31);
    }
    
    return getDaysInInterval(minDate, maxDate);
  }, [tickets]);

  const startDate = timelineDates[0];
  const today = new Date();
  const todayOffset = useMemo(() => {
    if (!startDate) return 0;
    const diff = diffDays(startDate, today);
    return diff * DAY_WIDTH;
  }, [startDate, today]);

  const [hasScrolledToToday, setHasScrolledToToday] = useState(false);
  useEffect(() => {
    if (!hasScrolledToToday && timelineScrollRef.current && timelineDates.length > 0) {
      const maxScroll = (timelineDates.length * DAY_WIDTH);
      const scrollPos = Math.max(0, Math.min(todayOffset, maxScroll));
      timelineScrollRef.current.scrollLeft = scrollPos;
      setHasScrolledToToday(true);
    }
  }, [todayOffset, timelineDates.length, hasScrolledToToday]);

  const [draggingBar, setDraggingBar] = useState<{
    id: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    originalStart: string;
    originalEnd: string;
    originalHours: number;
  } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, ticket: Ticket, type: 'move' | 'resize-start' | 'resize-end') => {
    const hasChildren = tickets.some(t => t.parentId === ticket.id);
    if (hasChildren && type !== 'move') return; 
    e.stopPropagation();
    setDraggingBar({ 
      id: ticket.id, 
      type, 
      startX: e.clientX, 
      originalStart: ticket.startDate, 
      originalEnd: ticket.dueDate,
      originalHours: ticket.estimatedHours || 1
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingBar) return;
      const deltaX = e.clientX - draggingBar.startX;
      const daysDelta = Math.round(deltaX / DAY_WIDTH);
      if (daysDelta === 0) return;
      
      if (draggingBar.type === 'move') {
        const newStart = addDays(new Date(draggingBar.originalStart), daysDelta);
        const newEnd = addDays(new Date(draggingBar.originalEnd), daysDelta);
        onUpdateTicket(draggingBar.id, { 
          startDate: formatDate(newStart), 
          dueDate: formatDate(newEnd) 
        });
      } else if (draggingBar.type === 'resize-end') {
        const newEnd = addDays(new Date(draggingBar.originalEnd), daysDelta);
        const newDur = diffDays(new Date(draggingBar.originalStart), newEnd) + 1;
        if (newDur >= 1) {
          onUpdateTicket(draggingBar.id, { 
            dueDate: formatDate(newEnd),
            estimatedHours: newDur 
          });
        }
      } else if (draggingBar.type === 'resize-start') {
        const newStart = addDays(new Date(draggingBar.originalStart), daysDelta);
        const newDur = diffDays(newStart, new Date(draggingBar.originalEnd)) + 1;
        if (newDur >= 1) {
          onUpdateTicket(draggingBar.id, { 
            startDate: formatDate(newStart),
            estimatedHours: newDur 
          });
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

  const visibleItems = useMemo(() => {
    const result: VisibleItem[] = [];
    const roots = tickets.filter(t => !t.parentId || !tickets.some(pt => pt.id === t.parentId));
    const traverse = (items: Ticket[], depth: number) => {
      items.forEach((item) => {
        const children = tickets.filter(t => t.parentId === item.id);
        result.push({ type: 'ticket', ticket: item, depth, hasChildren: children.length > 0 });
        if (expandedIds.has(item.id)) traverse(children, depth + 1);
      });
    };
    traverse(roots, 0);
    return result;
  }, [tickets, expandedIds]);

  const sidebarWidth = 420;
  const totalWidth = timelineDates.length * DAY_WIDTH;

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex border-b border-gray-200 bg-gray-50 shrink-0 sticky top-0 z-30">
        <div className="shrink-0 border-r border-gray-200 p-3 font-bold text-gray-500 text-[10px] uppercase flex items-center justify-between" style={{ width: sidebarWidth }}>
          <div className="flex items-center gap-2">
            <GripVertical size={14} className="text-gray-300" />
            <span>チケット項目</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onToggleSort('id')} className="p-1 rounded text-gray-400 hover:bg-gray-200" title="IDでソート"><Hash size={12} /></button>
            <button onClick={() => onToggleSort('dueDate')} className="p-1 rounded text-gray-400 hover:bg-gray-200" title="期日でソート"><Calendar size={12} /></button>
            <div className="text-blue-500 ml-1">{config.sortOrder === 'asc' ? <ArrowUpDown size={12} className="rotate-180" /> : <ArrowUpDown size={12} />}</div>
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
                  <div className="flex flex-col leading-tight mt-1" title={holiday?.name || ''}>
                    <span className={`${isToday ? 'text-blue-600 font-bold' : isRed ? 'text-red-500' : isBlue ? 'text-blue-500' : 'text-gray-700'}`}>{date.getDate()}</span>
                    <span className={`text-[8px] font-bold ${isToday ? 'text-blue-600' : isRed ? 'text-red-600' : isBlue ? 'text-blue-500' : 'text-gray-400'}`}>{holiday ? '祝' : getJapaneseDay(date)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto relative" ref={timelineScrollRef} onScroll={(e) => headerScrollRef.current && (headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft)}>
        <div className="flex min-h-full" style={{ width: sidebarWidth + totalWidth }}>
          <div className="absolute top-0 bottom-0 pointer-events-none flex" style={{ left: sidebarWidth }}>
            {timelineDates.map((date, idx) => {
              const isHoliday = holidays.some(h => h.date === formatDate(date));
              const day = date.getDay();
              if (isHoliday || day === 0) return <div key={idx} className="h-full bg-red-100/10 border-l border-gray-200/50" style={{ width: DAY_WIDTH }} />;
              if (day === 6) return <div key={idx} className="h-full bg-blue-100/10 border-l border-gray-200/50" style={{ width: DAY_WIDTH }} />;
              return <div key={idx} className="h-full border-l border-gray-200/50" style={{ width: DAY_WIDTH }} />;
            })}
          </div>

          {todayOffset >= 0 && todayOffset < totalWidth && (
            <div className="absolute top-0 bottom-0 w-[2px] bg-red-400/60 z-10 pointer-events-none" style={{ left: sidebarWidth + todayOffset }} />
          )}

          <div className="sticky left-0 z-20 bg-white border-r border-gray-200 shadow-sm" style={{ width: sidebarWidth }}>
            {visibleItems.map((item) => {
              const { ticket, depth, hasChildren } = item;
              const priority = priorities.find(p => p.id === ticket.priorityId);
              return (
                <div key={ticket.id} className="flex items-center px-3 border-b border-gray-100 h-[48px] hover:bg-blue-50/50 cursor-pointer group transition-colors" onClick={() => onSelectTicket(ticket)}>
                  <div style={{ width: depth * 16 }} className="shrink-0" />
                  {hasChildren ? (
                    <button className="p-1 hover:bg-gray-100 rounded mr-1" onClick={(e) => { e.stopPropagation(); const next = new Set(expandedIds); next.has(ticket.id) ? next.delete(ticket.id) : next.add(ticket.id); setExpandedIds(next); }}>
                      {expandedIds.has(ticket.id) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                    </button>
                  ) : <div className="w-6" />}
                  <div className={`mr-2 shrink-0 ${priority?.color || 'text-gray-400'}`}><AlertCircle size={14}/></div>
                  <span className="text-[10px] text-gray-400 font-mono mr-2 shrink-0">#{ticket.id}</span>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className={`truncate text-sm ${hasChildren ? 'font-bold text-gray-800' : 'text-gray-700'}`}>{ticket.subject}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative" style={{ width: totalWidth }}>
            {visibleItems.map((item) => {
              const { ticket, hasChildren } = item;
              const startOffset = diffDays(startDate, new Date(ticket.startDate)) * DAY_WIDTH;
              const displayDays = Math.ceil(ticket.estimatedHours || 1);
              const width = Math.max(displayDays * DAY_WIDTH, 20);

              return (
                <div key={ticket.id} className="relative border-b border-gray-100 h-[48px]">
                  <div 
                    className={`absolute top-3 h-6 rounded-full flex items-center px-2 cursor-move group transition-all ${hasChildren ? 'bg-gray-800' : 'bg-blue-600'} text-[9px] text-white font-bold shadow-sm hover:shadow-md`}
                    style={{ left: startOffset, width }}
                    onMouseDown={(e) => handleMouseDown(e, ticket, 'move')}
                  >
                    {!hasChildren && <div className="absolute left-0 top-0 w-2 h-full cursor-ew-resize hover:bg-white/30 rounded-l-full z-10" onMouseDown={(e) => handleMouseDown(e, ticket, 'resize-start')} />}
                    <div className="absolute left-0 top-0 bottom-0 bg-white/20 rounded-l-full pointer-events-none" style={{ width: `${ticket.progress}%` }} />
                    <span className="truncate relative z-10 select-none drop-shadow-sm font-medium">{ticket.progress}% {ticket.subject}</span>
                    {!hasChildren && <div className="absolute right-0 top-0 w-2 h-full cursor-ew-resize hover:bg-white/30 rounded-r-full z-10" onMouseDown={(e) => handleMouseDown(e, ticket, 'resize-end')} />}
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
