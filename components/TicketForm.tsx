
import React, { useState, useEffect } from 'react';
import { Ticket, User, Version, PriorityOption, Holiday, Status } from '../types';
import { X, Save, Trash2, AlertCircle, Link } from 'lucide-react';
import { formatDate, addWorkDays } from '../utils/dateUtils';

interface TicketFormProps {
  ticket: Ticket | null;
  tickets: Ticket[];
  users: User[];
  statuses: Status[];
  versions: Version[];
  priorities: PriorityOption[];
  holidays: Holiday[];
  onClose: () => void;
  onSave: (updates: Partial<Ticket>) => void;
  onDelete: (id: string) => void;
}

const TicketForm: React.FC<TicketFormProps> = ({ ticket, tickets, users, statuses, versions, priorities, holidays, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState<any>({});
  const [estHoursStr, setEstHoursStr] = useState<string>('');
  const [errors, setErrors] = useState<{ subject?: string; estimatedHours?: string }>({});

  useEffect(() => {
    if (ticket) {
      setFormData(ticket);
      setEstHoursStr(String(ticket.estimatedHours || ''));
      setErrors({});
    } else {
      const defaultPriority = priorities.find(p => p.isDefault) || priorities[0];
      const defaultStatus = statuses.find(s => s.isDefault) || statuses[0];
      const defaultVersion = versions.find(v => v.isDefault);
      const today = new Date();
      const initial = {
        subject: '',
        description: '',
        statusId: defaultStatus?.id || '',
        priorityId: defaultPriority?.id || '',
        progress: 0,
        parentId: null,
        assigneeId: '',
        versionId: defaultVersion?.id || '',
        startDate: formatDate(today),
        dueDate: formatDate(addWorkDays(today, 1, holidays)),
        estimatedHours: 1
      };
      setFormData(initial);
      setEstHoursStr('1');
      setErrors({});
    }
  }, [ticket, priorities, statuses, versions, holidays]);

  const hasChildren = ticket ? tickets.some(t => t.parentId === ticket.id) : false;

  // 循環参照チェック: potentialParentId が currentTicketId の子孫である場合は true
  const isDescendant = (potentialParentId: string, currentTicketId: string): boolean => {
    let current = tickets.find(t => t.id === potentialParentId);
    while (current && current.parentId) {
      if (current.parentId === currentTicketId) return true;
      current = tickets.find(t => t.id === current!.parentId);
    }
    return false;
  };

  // 親として選択可能なチケットを抽出（自分自身と自分自身の子孫は除外）
  const potentialParents = tickets.filter(t => {
    if (!ticket) return true; // 新規作成時は全てOK
    if (t.id === ticket.id) return false; // 自分自身はNG
    if (isDescendant(t.id, ticket.id)) return false; // 自分の子孫はNG
    return true;
  });

  const handleEstHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEstHoursStr(val);
    setErrors(prev => ({ ...prev, estimatedHours: undefined }));

    const num = parseFloat(val);
    if (!isNaN(num) && num > 0 && formData.startDate) {
      const newDueDate = addWorkDays(new Date(formData.startDate), num, holidays);
      setFormData((prev: any) => ({ ...prev, estimatedHours: num, dueDate: formatDate(newDueDate) }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let newValue: any = value;

    if (name === 'subject') {
      setErrors(prev => ({ ...prev, subject: undefined }));
    }

    if (name === 'progress') newValue = value === "" ? 0 : Number(value);
    else if (value === "" && (name === "parentId" || name === "assigneeId" || name === "versionId")) newValue = null;

    setFormData((prev: any) => {
      const next = { ...prev, [name]: newValue };
      if (name === 'startDate' && estHoursStr) {
        const num = parseFloat(estHoursStr);
        if (!isNaN(num) && num > 0) {
          const newDueDate = addWorkDays(new Date(newValue), num, holidays);
          next.dueDate = formatDate(newDueDate);
        }
      }
      return next;
    });
  };

  const handleSave = () => {
    const newErrors: { subject?: string; estimatedHours?: string } = {};
    if (!formData.subject || formData.subject.trim() === '') {
      newErrors.subject = "題名が入力されていません";
    }
    const hours = parseFloat(estHoursStr);
    if (isNaN(hours) || hours <= 0) {
      newErrors.estimatedHours = "工数が正しくありません";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSave({ ...formData, estimatedHours: hours });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl pointer-events-auto flex flex-col max-h-[90vh] overflow-hidden border border-gray-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold">{ticket ? 'チケット詳細' : '新規チケット'}</h2>
            {ticket && <span className="text-[10px] font-mono text-gray-400 mt-0.5">#{ticket.id}</span>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 題名入力 */}
          <div className="relative">
            <label className={`block text-xs font-bold ${errors.subject ? 'text-red-600' : 'text-gray-500'} uppercase mb-1`}>
              題名 <span className="text-red-500">*</span>
            </label>
            <input 
              name="subject" 
              autoFocus={!ticket}
              value={formData.subject || ''} 
              onChange={handleChange} 
              placeholder="タスクのタイトルを入力"
              className={`w-full border rounded-lg px-4 py-2.5 outline-none transition-all font-medium ${errors.subject ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-300 focus:ring-2 focus:ring-blue-500'}`} 
            />
            {errors.subject && <p className="absolute -bottom-5 left-0 text-[10px] text-red-600 font-bold flex items-center gap-1"><AlertCircle size={10}/> {errors.subject}</p>}
          </div>

          {/* ステータス & 親チケット (位置を入れ替え) */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ステータス</label>
              <select 
                name="statusId" 
                value={formData.statusId || ''} 
                onChange={handleChange} 
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statuses.map(s => <option key={s.id} value={s.id}>{s.name}{s.isDefault ? ' (デフォルト)' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">親チケット</label>
              <div className="relative">
                <select 
                  name="parentId" 
                  value={formData.parentId || ''} 
                  onChange={handleChange} 
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value="">(なし / ルートタスク)</option>
                  {potentialParents.sort((a,b) => a.id.localeCompare(b.id)).map(p => (
                    <option key={p.id} value={p.id}>#{p.id} {p.subject}</option>
                  ))}
                </select>
                <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 優先度 & 進捗率 */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">優先度</label>
              <select name="priorityId" value={formData.priorityId || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-blue-500">
                {priorities.map(p => <option key={p.id} value={p.id}>{p.name}{p.isDefault ? ' (デフォルト)' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">進捗率 (%)</label>
              <div className="flex items-center gap-4 py-2">
                <input name="progress" type="range" min="0" max="100" step="5" value={formData.progress || 0} onChange={handleChange} className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                <span className="text-sm font-mono font-bold w-12 text-right text-blue-600">{formData.progress}%</span>
              </div>
            </div>
          </div>

          {/* 日付関連 */}
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">開始日</label>
              <input name="startDate" type="date" disabled={hasChildren} value={formData.startDate || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 disabled:bg-gray-100 font-medium outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="relative">
              <label className={`block text-xs font-bold ${errors.estimatedHours ? 'text-red-600' : 'text-gray-500'} uppercase mb-1`}>
                工数 (稼働日数) <span className="text-red-500">*</span>
              </label>
              {/* step="1" にすることで上下矢印での増減を1単位にし、手入力での小数入力を可能にしています */}
              <input name="estimatedHours" type="number" step="1" min="0" disabled={hasChildren} value={estHoursStr} onChange={handleEstHoursChange}
                className={`w-full border rounded-lg px-3 py-2.5 outline-none transition-all font-medium ${errors.estimatedHours ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-300 focus:ring-2 focus:ring-blue-100'}`} 
              />
              {errors.estimatedHours && <p className="absolute -bottom-5 left-0 text-[10px] text-red-600 font-bold flex items-center gap-1"><AlertCircle size={10}/> {errors.estimatedHours}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">期日 (稼働日換算)</label>
              <input name="dueDate" type="date" readOnly value={formData.dueDate || ''} className="w-full border border-gray-200 bg-gray-50 text-gray-500 rounded-lg px-3 py-2.5 cursor-not-allowed font-medium outline-none" />
            </div>
          </div>

          {/* 担当者 & バージョン */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">担当者</label>
              <select name="assigneeId" value={formData.assigneeId || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">未割当</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">バージョン</label>
              <select name="versionId" value={formData.versionId || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">なし</option>
                {versions.map(v => <option key={v.id} value={v.id}>{v.name}{v.isDefault ? ' (デフォルト)' : ''}</option>)}
              </select>
            </div>
          </div>

          {/* 説明 */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">説明</label>
            <textarea name="description" value={formData.description || ''} onChange={handleChange} rows={3} className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium" placeholder="タスクの補足事項があれば入力してください" />
          </div>
        </div>

        {/* フッターアクション */}
        <div className="p-6 border-t bg-gray-50 flex gap-3">
          {ticket && <button onClick={() => onDelete(ticket.id)} className="text-red-600 hover:bg-red-100 p-2 rounded-lg transition-all" title="削除"><Trash2 size={20}/></button>}
          <div className="flex-1" />
          <button onClick={onClose} className="px-6 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-bold transition-all">キャンセル</button>
          <button onClick={handleSave} className="px-8 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"><Save size={18} /> 保存</button>
        </div>
      </div>
    </div>
  );
};

export default TicketForm;
