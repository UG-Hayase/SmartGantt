
import React from 'react';
import { Ticket, User, Version, PriorityOption, GanttConfig, Status } from '../types';
import { ArrowUp, ArrowDown, ArrowUpDown, AlertCircle, Clock } from 'lucide-react';
import { getJapaneseDay } from '../utils/dateUtils';

interface TicketTableProps {
  tickets: Ticket[];
  users: User[];
  statuses: Status[];
  versions: Version[];
  priorities: PriorityOption[];
  config: GanttConfig;
  onToggleSort: (key: keyof Ticket) => void;
  onSelectTicket: (ticket: Ticket) => void;
}

const TicketTable: React.FC<TicketTableProps> = ({ tickets, users, statuses, versions, priorities, config, onToggleSort, onSelectTicket }) => {
  const SortHeader = ({ label, sortKey }: { label: string, sortKey: keyof Ticket }) => {
    const isActive = config.sortBy === sortKey;
    return (
      <th 
        className={`px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors group whitespace-nowrap ${isActive ? 'bg-blue-50/50' : ''}`}
        onClick={() => onToggleSort(sortKey)}
      >
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-bold uppercase tracking-wider ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>{label}</span>
          <div className={`${isActive ? 'text-blue-500' : 'text-gray-300 opacity-0 group-hover:opacity-100'}`}>
            {isActive ? (config.sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} />}
          </div>
        </div>
      </th>
    );
  };

  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <SortHeader label="ID" sortKey="id" />
            <SortHeader label="ステータス" sortKey="statusId" />
            <SortHeader label="優先度" sortKey="priorityId" />
            <SortHeader label="題名" sortKey="subject" />
            <SortHeader label="バージョン" sortKey="versionId" />
            <SortHeader label="担当者" sortKey="assigneeId" />
            <SortHeader label="開始日" sortKey="startDate" />
            <SortHeader label="期日" sortKey="dueDate" />
            <SortHeader label="工数" sortKey="estimatedHours" />
            <SortHeader label="進捗" sortKey="progress" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tickets.map(ticket => {
            const assignee = users.find(u => u.id === ticket.assigneeId);
            const status = statuses.find(s => s.id === ticket.statusId);
            const priority = priorities.find(p => p.id === ticket.priorityId);
            const version = versions.find(v => v.id === ticket.versionId);
            
            const startDateStr = ticket.startDate.replace(/-/g, '/');
            const dueDateStr = ticket.dueDate.replace(/-/g, '/');
            const startDay = getJapaneseDay(new Date(ticket.startDate));
            const dueDay = getJapaneseDay(new Date(ticket.dueDate));

            return (
              <tr key={ticket.id} className="hover:bg-blue-50/30 cursor-pointer transition-colors" onClick={() => onSelectTicket(ticket)}>
                <td className="px-4 py-4 text-gray-500 font-mono text-xs">#{ticket.id}</td>
                <td className="px-4 py-4">
                  {status && (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${status.color}`}>
                      {status.name}
                    </span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center gap-1.5 font-bold text-xs ${priority?.color || 'text-gray-400'}`}>
                    <AlertCircle size={14}/> {priority?.name || '未設定'}
                  </span>
                </td>
                <td className="px-4 py-4 font-bold text-gray-900">{ticket.subject}</td>
                <td className="px-4 py-4 text-gray-500 italic text-xs">{version?.name || '-'}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    {assignee ? (
                      <>
                        <img src={assignee.avatar} alt="" className="w-6 h-6 rounded-full border border-gray-100" />
                        <span className="font-medium text-gray-700">{assignee.name}</span>
                      </>
                    ) : (
                      <span className="text-gray-400 text-xs">未割当</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-gray-600 font-mono text-xs whitespace-nowrap">
                  {startDateStr} <span className="text-gray-400">({startDay})</span>
                </td>
                <td className="px-4 py-4 text-gray-600 font-mono text-xs whitespace-nowrap">
                  {dueDateStr} <span className="text-gray-400">({dueDay})</span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1 text-gray-700 font-mono text-xs">
                    <Clock size={12} className="text-gray-400" />
                    <span>{ticket.estimatedHours}日</span>
                  </div>
                </td>
                <td className="px-4 py-4 min-w-[100px]">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-500 font-bold">{ticket.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-blue-600 h-full transition-all duration-500 ease-out" style={{ width: `${ticket.progress}%` }}></div>
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
          {tickets.length === 0 && (
            <tr>
              <td colSpan={10} className="px-4 py-20 text-center text-gray-400 italic">
                チケットが見つかりません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TicketTable;
