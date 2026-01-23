
import React, { useState, useRef } from 'react';
import { User, Version, PriorityOption, Holiday, Status } from '../types';
import { 
  Plus, 
  Trash2, 
  UserPlus, 
  Tag, 
  AlertTriangle, 
  Calendar, 
  Upload, 
  Download, 
  FileText, 
  Star, 
  ChevronUp, 
  ChevronDown,
  Activity
} from 'lucide-react';
import { holidaysToCsv, csvToHolidays, usersToCsv, csvToUsers, downloadFile, statusesToCsv, csvToStatuses } from '../utils/csvUtils';

interface SectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  action?: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, icon: Icon, children, action }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col h-full">
    <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-gray-50 rounded-lg text-gray-500"><Icon size={18} /></div>
        <h3 className="font-bold text-gray-800">{title}</h3>
      </div>
      {action}
    </div>
    <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1">
      {children}
    </div>
  </div>
);

interface MasterDataViewProps {
  users: User[];
  statuses: Status[];
  versions: Version[];
  priorities: PriorityOption[];
  holidays: Holiday[];
  onUpdateUsers: (users: User[]) => void;
  onUpdateStatuses: (statuses: Status[]) => void;
  onUpdateVersions: (versions: Version[]) => void;
  onUpdatePriorities: (priorities: PriorityOption[]) => void;
  onUpdateHolidays: (holidays: Holiday[]) => void;
}

const MasterDataView: React.FC<MasterDataViewProps> = ({ 
  users, statuses, versions, priorities, holidays,
  onUpdateUsers, onUpdateStatuses, onUpdateVersions, onUpdatePriorities, onUpdateHolidays
}) => {
  const [newUserName, setNewUserName] = useState('');
  const [newStatusName, setNewStatusName] = useState('');
  const [newVersionName, setNewVersionName] = useState('');
  const [newPriorityName, setNewPriorityName] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  
  const [showHolidayBulkAdd, setShowHolidayBulkAdd] = useState(false);
  const [holidayBulkText, setHolidayBulkText] = useState('');
  
  const [showUserBulkAdd, setShowUserBulkAdd] = useState(false);
  const [userBulkText, setUserBulkText] = useState('');

  const holidayFileInputRef = useRef<HTMLInputElement>(null);
  const userFileInputRef = useRef<HTMLInputElement>(null);
  const statusFileInputRef = useRef<HTMLInputElement>(null);

  const addTarget = (type: 'user' | 'status' | 'version' | 'priority' | 'holiday') => {
    if (type === 'user' && newUserName) {
      onUpdateUsers([...users, { id: `u${Date.now()}`, name: newUserName, avatar: `https://picsum.photos/seed/${Date.now()}/40/40` }]);
      setNewUserName('');
    } else if (type === 'status' && newStatusName) {
      onUpdateStatuses([...statuses, { id: `s${Date.now()}`, name: newStatusName, color: 'bg-blue-100 text-blue-700' }]);
      setNewStatusName('');
    } else if (type === 'version' && newVersionName) {
      onUpdateVersions([...versions, { id: `v${Date.now()}`, name: newVersionName }]);
      setNewVersionName('');
    } else if (type === 'priority' && newPriorityName) {
      onUpdatePriorities([...priorities, { id: `p${Date.now()}`, name: newPriorityName, color: 'text-blue-500' }]);
      setNewPriorityName('');
    } else if (type === 'holiday' && newHolidayName && newHolidayDate) {
      onUpdateHolidays([...holidays, { id: `h${Date.now()}`, name: newHolidayName, date: newHolidayDate }]);
      setNewHolidayName('');
      setNewHolidayDate('');
    }
  };

  const setDefault = (type: 'status' | 'version' | 'priority', id: string) => {
    if (type === 'status') {
      onUpdateStatuses(statuses.map(s => ({ ...s, isDefault: s.id === id })));
    } else if (type === 'version') {
      onUpdateVersions(versions.map(v => ({ ...v, isDefault: v.id === id })));
    } else {
      onUpdatePriorities(priorities.map(p => ({ ...p, isDefault: p.id === id })));
    }
  };

  const moveItem = (type: 'status' | 'version' | 'priority', index: number, direction: 'up' | 'down') => {
    const list = type === 'status' ? [...statuses] : type === 'version' ? [...versions] : [...priorities];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    [list[index], list[targetIndex]] = [list[targetIndex], list[index]];
    if (type === 'status') onUpdateStatuses(list as Status[]);
    else if (type === 'version') onUpdateVersions(list as Version[]);
    else onUpdatePriorities(list as PriorityOption[]);
  };

  const removeTarget = (type: 'user' | 'status' | 'version' | 'priority' | 'holiday', id: string) => {
    if (type === 'user') onUpdateUsers(users.filter(u => u.id !== id));
    else if (type === 'status') onUpdateStatuses(statuses.filter(s => s.id !== id));
    else if (type === 'version') onUpdateVersions(versions.filter(v => v.id !== id));
    else if (type === 'priority') onUpdatePriorities(priorities.filter(p => p.id !== id));
    else if (type === 'holiday') onUpdateHolidays(holidays.filter(h => h.id !== id));
  };

  const handleBulkAddUsers = () => {
    const lines = userBulkText.split('\n');
    const newUsers: User[] = [];
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      newUsers.push({ id: `u-bulk-${Date.now()}-${index}`, name: trimmed, avatar: `https://picsum.photos/seed/${Date.now() + index}/40/40` });
    });
    if (newUsers.length > 0) {
      onUpdateUsers([...users, ...newUsers]);
      setUserBulkText('');
      setShowUserBulkAdd(false);
      alert(`${newUsers.length}名の担当者を追加しました。`);
    }
  };

  const handleExportUsers = () => downloadFile(usersToCsv(users), 'users.csv', 'text/csv;charset=utf-8;');

  const handleImportUsersCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = csvToUsers(event.target?.result as string);
        if (imported.length > 0 && confirm(`${imported.length}件の担当者データを読み込みますか？既存のリストに追加されます。`)) {
          onUpdateUsers([...users, ...imported]);
        }
      } catch (err) { alert("担当者CSVの解析に失敗しました。"); }
      if (userFileInputRef.current) userFileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleExportStatuses = () => downloadFile(statusesToCsv(statuses), 'statuses.csv', 'text/csv;charset=utf-8;');

  const handleImportStatusesCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = csvToStatuses(event.target?.result as string);
        if (imported.length > 0 && confirm(`${imported.length}件のステータスデータを読み込みますか？既存のリストに追加されます。`)) {
          onUpdateStatuses([...statuses, ...imported]);
        }
      } catch (err) { alert("ステータスCSVの解析に失敗しました。"); }
      if (statusFileInputRef.current) statusFileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleBulkAddHolidays = () => {
    const lines = holidayBulkText.split('\n');
    const newHolidays: Holiday[] = [];
    const dateRegex = /^(\d{4}[-/]\d{1,2}[-/]\d{1,2})[,\s\t]+(.+)$/;
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const match = trimmed.match(dateRegex);
      if (match) {
        let datePart = match[1].replace(/\//g, '-');
        const parts = datePart.split('-');
        if (parts[1].length === 1) parts[1] = '0' + parts[1];
        if (parts[2].length === 1) parts[2] = '0' + parts[2];
        datePart = parts.join('-');
        newHolidays.push({ id: `h-bulk-${Date.now()}-${index}`, date: datePart, name: match[2].trim() });
      }
    });
    if (newHolidays.length > 0) {
      const holidayMap = new Map<string, Holiday>();
      holidays.forEach(h => holidayMap.set(h.date, h));
      newHolidays.forEach(h => holidayMap.set(h.date, h));
      onUpdateHolidays(Array.from(holidayMap.values()));
      setHolidayBulkText('');
      setShowHolidayBulkAdd(false);
      alert(`${newHolidays.length}件の祝日を追加・更新しました。`);
    }
  };

  const handleExportHolidays = () => downloadFile(holidaysToCsv(holidays), 'holidays.csv', 'text/csv;charset=utf-8;');

  const handleImportHolidaysCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = csvToHolidays(event.target?.result as string);
        const holidayMap = new Map<string, Holiday>();
        holidays.forEach(h => holidayMap.set(h.date, h));
        imported.forEach(h => holidayMap.set(h.date, h));
        onUpdateHolidays(Array.from(holidayMap.values()));
      } catch (err) { alert("祝日CSVの解析に失敗しました。"); }
      if (holidayFileInputRef.current) holidayFileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 animate-in slide-in-from-bottom-4 duration-300 overflow-y-auto pb-20">
      {/* 担当者管理 */}
      <Section title="担当者管理" icon={UserPlus} action={
        <div className="flex items-center gap-1">
          <button onClick={() => setShowUserBulkAdd(!showUserBulkAdd)} className={`p-1.5 rounded transition-all ${showUserBulkAdd ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`} title="一括追加"><FileText size={14} /></button>
          <input type="file" accept=".csv" ref={userFileInputRef} onChange={handleImportUsersCsv} className="hidden" />
          <button onClick={() => userFileInputRef.current?.click()} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all" title="CSVインポート"><Upload size={14} /></button>
          <button onClick={handleExportUsers} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all" title="CSVエクスポート"><Download size={14} /></button>
        </div>
      }>
        {showUserBulkAdd ? (
          <div className="flex flex-col gap-3">
             <div className="bg-blue-50 p-2 rounded text-[10px] text-blue-700 leading-relaxed">1行に1名ずつ入力してください。</div>
            <textarea value={userBulkText} onChange={(e) => setUserBulkText(e.target.value)} placeholder="例:&#10;田中 太郎&#10;佐藤 花子" className="w-full h-40 text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none font-mono resize-none"/>
            <div className="flex gap-2">
              <button onClick={handleBulkAddUsers} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700">登録実行</button>
              <button onClick={() => {setShowUserBulkAdd(false); setUserBulkText('');}} className="p-2 border border-gray-200 text-gray-400 rounded-lg hover:bg-gray-50">キャンセル</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <input value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="氏名を入力..." className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"/>
              <button onClick={() => addTarget('user')} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"><Plus size={18}/></button>
            </div>
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 group transition-all">
                <div className="flex items-center gap-3">
                  <img src={user.avatar} className="w-8 h-8 rounded-full border border-gray-200" alt="" />
                  <span className="text-sm font-medium text-gray-700">{user.name}</span>
                </div>
                <button onClick={() => removeTarget('user', user.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
              </div>
            ))}
          </>
        )}
      </Section>

      {/* ステータス管理 */}
      <Section title="ステータス管理" icon={Activity} action={
        <div className="flex items-center gap-1">
          <input type="file" accept=".csv" ref={statusFileInputRef} onChange={handleImportStatusesCsv} className="hidden" />
          <button onClick={() => statusFileInputRef.current?.click()} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all" title="CSVインポート"><Upload size={14} /></button>
          <button onClick={handleExportStatuses} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all" title="CSVエクスポート"><Download size={14} /></button>
        </div>
      }>
        <div className="flex gap-2 mb-4">
          <input value={newStatusName} onChange={e => setNewStatusName(e.target.value)} placeholder="ステータス名..." className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"/>
          <button onClick={() => addTarget('status')} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"><Plus size={18}/></button>
        </div>
        {statuses.map((s, idx) => (
          <div key={s.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 group transition-all">
            <div className="flex items-center gap-2">
              <div className="flex flex-col mr-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={(e) => { e.stopPropagation(); moveItem('status', idx, 'up'); }} className="text-gray-400 hover:text-blue-500 p-0.5 disabled:opacity-20" disabled={idx === 0}><ChevronUp size={12}/></button>
                <button onClick={(e) => { e.stopPropagation(); moveItem('status', idx, 'down'); }} className="text-gray-400 hover:text-blue-500 p-0.5 disabled:opacity-20" disabled={idx === statuses.length - 1}><ChevronDown size={12}/></button>
              </div>
              <button onClick={() => setDefault('status', s.id)} className={`p-1 rounded transition-colors ${s.isDefault ? 'text-yellow-500' : 'text-gray-200 hover:text-yellow-200'}`} title="デフォルトに設定">
                <Star size={14} fill={s.isDefault ? "currentColor" : "none"} />
              </button>
              <span className={`text-sm font-bold truncate max-w-[80px] px-2 py-0.5 rounded ${s.color}`}>{s.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <select value={s.color} onChange={(e) => onUpdateStatuses(statuses.map(item => item.id === s.id ? {...item, color: e.target.value} : item))} className="text-[10px] bg-transparent border-none focus:ring-0 cursor-pointer text-gray-400">
                <option value="bg-blue-100 text-blue-700">ブルー</option>
                <option value="bg-yellow-100 text-yellow-700">イエロー</option>
                <option value="bg-green-100 text-green-700">グリーン</option>
                <option value="bg-gray-100 text-gray-700">グレー</option>
                <option value="bg-red-100 text-red-700">レッド</option>
              </select>
              <button onClick={() => removeTarget('status', s.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
      </Section>

      {/* バージョン管理 */}
      <Section title="バージョン管理" icon={Tag}>
        <div className="flex gap-2 mb-4">
          <input value={newVersionName} onChange={e => setNewVersionName(e.target.value)} placeholder="バージョン名..." className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"/>
          <button onClick={() => addTarget('version')} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"><Plus size={18}/></button>
        </div>
        {versions.map((v, idx) => (
          <div key={v.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 group transition-all">
            <div className="flex items-center gap-2">
              <div className="flex flex-col mr-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={(e) => { e.stopPropagation(); moveItem('version', idx, 'up'); }} className="text-gray-400 hover:text-blue-500 p-0.5 disabled:opacity-20" disabled={idx === 0}><ChevronUp size={12}/></button>
                <button onClick={(e) => { e.stopPropagation(); moveItem('version', idx, 'down'); }} className="text-gray-400 hover:text-blue-500 p-0.5 disabled:opacity-20" disabled={idx === versions.length - 1}><ChevronDown size={12}/></button>
              </div>
              <button onClick={() => setDefault('version', v.id)} className={`p-1 rounded transition-colors ${v.isDefault ? 'text-yellow-500' : 'text-gray-200 hover:text-yellow-200'}`} title="デフォルトに設定">
                <Star size={14} fill={v.isDefault ? "currentColor" : "none"} />
              </button>
              <span className={`text-sm font-medium ${v.isDefault ? 'text-blue-600' : 'text-gray-700'}`}>{v.name}</span>
            </div>
            <button onClick={() => removeTarget('version', v.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
          </div>
        ))}
      </Section>

      {/* 優先度管理 */}
      <Section title="優先度管理" icon={AlertTriangle}>
        <div className="flex gap-2 mb-4">
          <input value={newPriorityName} onChange={e => setNewPriorityName(e.target.value)} placeholder="優先度名..." className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"/>
          <button onClick={() => addTarget('priority')} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"><Plus size={18}/></button>
        </div>
        {priorities.map((p, idx) => (
          <div key={p.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 group transition-all">
            <div className="flex items-center gap-2">
              <div className="flex flex-col mr-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={(e) => { e.stopPropagation(); moveItem('priority', idx, 'up'); }} className="text-gray-400 hover:text-blue-500 p-0.5 disabled:opacity-20" disabled={idx === 0}><ChevronUp size={12}/></button>
                <button onClick={(e) => { e.stopPropagation(); moveItem('priority', idx, 'down'); }} className="text-gray-400 hover:text-blue-500 p-0.5 disabled:opacity-20" disabled={idx === priorities.length - 1}><ChevronDown size={12}/></button>
              </div>
              <button onClick={() => setDefault('priority', p.id)} className={`p-1 rounded transition-colors ${p.isDefault ? 'text-yellow-500' : 'text-gray-200 hover:text-yellow-200'}`} title="デフォルトに設定">
                <Star size={14} fill={p.isDefault ? "currentColor" : "none"} />
              </button>
              <div className={`w-3 h-3 rounded-full bg-current ${p.color}`} />
              <span className={`text-sm font-medium ${p.isDefault ? 'text-blue-600' : 'text-gray-700'}`}>{p.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <select value={p.color} onChange={(e) => onUpdatePriorities(priorities.map(item => item.id === p.id ? {...item, color: e.target.value} : item))} className="text-[10px] bg-transparent border-none focus:ring-0 cursor-pointer text-gray-400">
                <option value="text-gray-500">グレー</option>
                <option value="text-blue-500">ブルー</option>
                <option value="text-orange-500">オレンジ</option>
                <option value="text-red-500">レッド</option>
                <option value="text-purple-500">パープル</option>
              </select>
              <button onClick={() => removeTarget('priority', p.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
      </Section>

      {/* 祝日・休日管理 */}
      <Section title="祝日・休日管理" icon={Calendar} action={
        <div className="flex items-center gap-1">
          <button onClick={() => setShowHolidayBulkAdd(!showHolidayBulkAdd)} className={`p-1.5 rounded transition-all ${showHolidayBulkAdd ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`} title="一括追加"><FileText size={14} /></button>
          <input type="file" accept=".csv" ref={holidayFileInputRef} onChange={handleImportHolidaysCsv} className="hidden" />
          <button onClick={() => holidayFileInputRef.current?.click()} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all" title="CSVインポート"><Upload size={14} /></button>
          <button onClick={handleExportHolidays} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all" title="CSVエクスポート"><Download size={14} /></button>
        </div>
      }>
        {showHolidayBulkAdd ? (
          <div className="flex flex-col gap-3">
             <div className="bg-blue-50 p-2 rounded text-[10px] text-blue-700 leading-relaxed">1行に「YYYY-MM-DD 祝日名」の形式で入力してください。</div>
            <textarea value={holidayBulkText} onChange={(e) => setHolidayBulkText(e.target.value)} placeholder="例:&#10;2025-01-01 元日&#10;2025-05-05 こどもの日" className="w-full h-40 text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none font-mono resize-none"/>
            <div className="flex gap-2">
              <button onClick={handleBulkAddHolidays} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700">登録実行</button>
              <button onClick={() => {setShowHolidayBulkAdd(false); setHolidayBulkText('');}} className="p-2 border border-gray-200 text-gray-400 rounded-lg hover:bg-gray-50">キャンセル</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 mb-4">
              <input type="date" value={newHolidayDate} onChange={e => setNewHolidayDate(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"/>
              <div className="flex gap-2">
                <input value={newHolidayName} onChange={e => setNewHolidayName(e.target.value)} placeholder="祝日名..." className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"/>
                <button onClick={() => addTarget('holiday')} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"><Plus size={18}/></button>
              </div>
            </div>
            <div className="space-y-2">
              {holidays.sort((a,b) => a.date.localeCompare(b.date)).map(h => (
                <div key={h.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 group transition-all">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-mono">{h.date}</span>
                    <span className="text-sm font-medium text-red-600">{h.name}</span>
                  </div>
                  <button onClick={() => removeTarget('holiday', h.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>
    </div>
  );
};

export default MasterDataView;
