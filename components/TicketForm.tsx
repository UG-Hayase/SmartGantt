
import React, { useState, useEffect } from 'react';
import { Ticket, User, Version, PriorityOption } from '../types';
import { X, Save, Trash2, Link as LinkIcon, Info } from 'lucide-react';

interface TicketFormProps {
  ticket: Ticket | null;
  tickets: Ticket[];
  users: User[];
  versions: Version[];
  priorities: PriorityOption[];
  onClose: () => void;
  onSave: (updates: Partial<Ticket>) => void;
  onDelete: (id: string) => void;
}

const TicketForm: React.FC<TicketFormProps> = ({ ticket, tickets, users, versions, priorities, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState<Partial<Ticket>>({});

  useEffect(() => {
    if (ticket) {
      setFormData(ticket);
    } else {
      setFormData({
        subject: '',
        description: '',
        status: 'New',
        priorityId: priorities[0]?.id || '',
        progress: 0,
        parentId: null,
        assigneeId: '',
        versionId: '',
        startDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        estimatedHours: 0
      });
    }
  }, [ticket, priorities]);

  const hasChildren = ticket ? tickets.some(t => t.parentId === ticket.id) : false;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: (name === 'progress' || name === 'estimatedHours') ? Number(value) : (value === "" && (name === "parentId" || name === "assigneeId" || name === "versionId") ? null : value)
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl pointer-events-auto flex flex-col max-h-[90vh] overflow-hidden border border-gray-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold">{ticket ? 'チケット編集' : '新規チケット'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">題名</label>
            <input name="subject" value={formData.subject || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ステータス</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                <option value="New">新規</option>
                <option value="In Progress">進行中</option>
                <option value="Resolved">解決</option>
                <option value="Closed">終了</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">優先度 (マスタ参照)</label>
              <select name="priorityId" value={formData.priorityId || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                {priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">担当者</label>
              <select name="assigneeId" value={formData.assigneeId || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                <option value="">未割当</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">バージョン</label>
              <select name="versionId" value={formData.versionId || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                <option value="">なし</option>
                {versions.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">開始日</label>
              <input name="startDate" type="date" disabled={hasChildren} value={formData.startDate || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">期日</label>
              <input name="dueDate" type="date" disabled={hasChildren} value={formData.dueDate || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-50" />
            </div>
          </div>
        </div>

        <div className="p-6 border-t flex gap-3">
          {ticket && <button onClick={() => onDelete(ticket.id)} className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-all"><Trash2 size={18}/></button>}
          <div className="flex-1" />
          <button onClick={onClose} className="px-6 py-2 text-gray-600">キャンセル</button>
          <button onClick={() => onSave(formData)} className="px-8 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700">保存</button>
        </div>
      </div>
    </div>
  );
};

export default TicketForm;
