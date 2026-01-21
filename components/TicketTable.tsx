
import React from 'react';
import { Ticket, User, Version, PriorityOption, GanttConfig } from '../types';
import { STATUS_CONFIG } from '../constants';
import { ArrowUp, ArrowDown, ArrowUpDown, AlertCircle } from 'lucide-react';

interface TicketTableProps {
  tickets: Ticket[];
  users: User[];
  versions: Version[];
  priorities: PriorityOption[];
  config: GanttConfig;
  onToggleSort: (key: keyof Ticket) => void;
  onSelectTicket: (ticket: Ticket) => void;
}

const TicketTable: React.FC<TicketTableProps> = ({ tickets, users, versions, priorities, config, onToggleSort, onSelectTicket }) => {
  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
            <th className="px-4 py-3">ID</th>
            <th className="px-4 py-3">ステータス</th>
            <th className="px-4 py-3">優先度</th>
            <th className="px-4 py-3">題名</th>
            <th className="px-4 py-3">バージョン</th>
            <th className="px-4 py-3">担当者</th>
            <th className="px-4 py-3">期日</th>
            <th className="px-4 py-3">進捗</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tickets.map(ticket => {
            const assignee = users.find(u => u.id === ticket.assigneeId);
            const statusCfg = STATUS_CONFIG[ticket.status];
            const priority = priorities.find(p => p.id === ticket.priorityId);
            const version = versions.find(v => v.id === ticket.versionId);

            return (
              <tr key={ticket.id} className="hover:bg-blue-50 cursor-pointer transition-colors" onClick={() => onSelectTicket(ticket)}>
                <td className="px-4 py-3 text-gray-500 font-mono">#{ticket.id}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${statusCfg?.color}`}>
                    {statusCfg?.icon} {ticket.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 font-bold ${priority?.color || 'text-gray-400'}`}>
                    <AlertCircle size={14}/> {priority?.name || '未設定'}
                  </span>
                </td>
                <td className="px-4 py-3 font-bold text-gray-900">{ticket.subject}</td>
                <td className="px-4 py-3 text-gray-600 italic">{version?.name || '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {assignee && <img src={assignee.avatar} alt="" className="w-6 h-6 rounded-full" />}
                    <span className="font-medium">{assignee?.name || '未割当'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 font-mono">
                  {/* 年を明確に表示するためにハイフンをスラッシュに置換 */}
                  {ticket.dueDate.replace(/-/g, '/')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-gray-400 font-bold">{ticket.progress}%</span>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${ticket.progress}%` }}></div>
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TicketTable;
