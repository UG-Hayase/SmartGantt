
import React, { useState, useEffect } from 'react';
import { Ticket, User, Version, PriorityOption } from '../types';
import { X, Save, Trash2, AlertCircle } from 'lucide-react';
import { addDays, formatDate } from '../utils/dateUtils';

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
  const [formData, setFormData] = useState<any>({});
  const [estHoursStr, setEstHoursStr] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ticket) {
      setFormData(ticket);
      setEstHoursStr(String(ticket.estimatedHours || ''));
    } else {
      const defaultPriority = priorities.find(p => p.isDefault) || priorities[0];
      const defaultVersion = versions.find(v => v.isDefault);
      const initial = {
        subject: '',
        description: '',
        status: 'New',
        priorityId: defaultPriority?.id || '',
        progress: 0,
        parentId: null,
        assigneeId: '',
        versionId: defaultVersion?.id || '',
        startDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        estimatedHours: 1
      };
      setFormData(initial);
      setEstHoursStr('1');
    }
  }, [ticket, priorities, versions]);

  const hasChildren = ticket ? tickets.some(t => t.parentId === ticket.id) : false;

  const handleEstHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEstHoursStr(val);
    setError(null);
    const num = parseFloat(val);
    if (!isNaN(num) && formData.startDate) {
      const days = Math.ceil(num || 1);
      const newDueDate = addDays(new Date(formData.startDate), Math.max(0, days - 1));
      setFormData((prev: any) => ({ ...prev, estimatedHours: num, dueDate: formatDate(newDueDate) }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let newValue: any = value;
    if (name === 'progress') newValue = value === "" ? 0 : Number(value);
    else if (value === "" && (name === "parentId" || name === "assigneeId" || name === "versionId")) newValue = null;

    setFormData((prev: any) => {
      const next = { ...prev, [name]: newValue };
      if (name === 'startDate' && estHoursStr) {
        const num = parseFloat(estHoursStr);
        if (!isNaN(num)) {
          const days = Math.ceil(num || 1);
          const newDueDate = addDays(new Date(newValue), Math.max(0, days - 1));
          next.dueDate = formatDate(newDueDate);
        }
      }
      return next;
    });
  };

  const handleSave = () => {
    const hours = parseFloat(estHoursStr);
    if (isNaN(hours) || hours <= 0 || estHoursStr.trim() === '' || estHoursStr === '0') {
      setError("工数が入力されていません");
      return;
    }
    onSave({ ...formData, estimatedHours: hours });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl pointer-events-auto flex flex-col max-h-[90vh] overflow-hidden border border-gray-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold">{ticket ? 'チケット詳細' : '新規チケット'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">題名</label>
            <input name="subject" value={formData.subject || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ステータス</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
                <option value="New">新規</option>
                <option value="In Progress">進行中</option>
                <option value="Resolved">解決</option>
                <option value="Closed">終了</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">優先度</label>
              <select name="priorityId" value={formData.priorityId || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
                {priorities.map(p => <option key={p.id} value={p.id}>{p.name}{p.isDefault ? ' (デフォルト)' : ''}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">開始日</label>
              <input name="startDate" type="date" disabled={hasChildren} value={formData.startDate || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100" />
            </div>
            <div className="relative">
              <label className={`block text-xs font-bold ${error ? 'text-red-500' : 'text-gray-500'} uppercase mb-1`}>工数 (日)</label>
              <input name="estimatedHours" type="number" step="1" min="0" disabled={hasChildren} value={estHoursStr} onChange={handleEstHoursChange}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    const currentVal = parseFloat(estHoursStr);
                    if (isNaN(currentVal) || currentVal <= 0) {
                      e.preventDefault();
                      setEstHoursStr('1');
                      setError(null);
                      if (formData.startDate) {
                        setFormData((prev: any) => ({ ...prev, estimatedHours: 1, dueDate: formatDate(addDays(new Date(formData.startDate), 0)) }));
                      }
                    }
                  }
                }}
                className={`w-full border rounded-lg px-3 py-2 outline-none transition-all ${error ? 'border-red-500 focus:ring-red-100' : 'border-gray-300 focus:ring-blue-100'}`} 
              />
              {error && <p className="absolute -bottom-5 left-0 text-[10px] text-red-500 font-bold flex items-center gap-1"><AlertCircle size={10}/> {error}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">期日 (自動)</label>
              <input name="dueDate" type="date" readOnly value={formData.dueDate || ''} className="w-full border border-gray-200 bg-gray-50 text-gray-500 rounded-lg px-3 py-2 cursor-not-allowed" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">担当者</label>
              <select name="assigneeId" value={formData.assigneeId || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
                <option value="">未割当</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">バージョン</label>
              <select name="versionId" value={formData.versionId || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
                <option value="">なし</option>
                {versions.map(v => <option key={v.id} value={v.id}>{v.name}{v.isDefault ? ' (デフォルト)' : ''}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">進捗率 (%)</label>
            <div className="flex items-center gap-4">
              <input name="progress" type="range" min="0" max="100" step="5" value={formData.progress || 0} onChange={handleChange} className="flex-1" />
              <span className="text-sm font-mono font-bold w-12 text-right">{formData.progress}%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">説明</label>
            <textarea name="description" value={formData.description || ''} onChange={handleChange} rows={3} className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="タスクの詳細を入力..." />
          </div>
        </div>
        <div className="p-6 border-t bg-gray-50 flex gap-3">
          {ticket && <button onClick={() => onDelete(ticket.id)} className="text-red-600 hover:bg-red-100 p-2 rounded-lg"><Trash2 size={20}/></button>}
          <div className="flex-1" />
          <button onClick={onClose} className="px-6 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-bold">キャンセル</button>
          <button onClick={handleSave} className="px-8 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 flex items-center gap-2"><Save size={18} /> 保存</button>
        </div>
      </div>
    </div>
  );
};

export default TicketForm;
