
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Ticket, User, Version, PriorityOption, GanttConfig, TicketStatus } from './types';
import { INITIAL_USERS, INITIAL_VERSIONS, INITIAL_PRIORITIES } from './constants';
import GanttChart from './components/GanttChart';
import TicketTable from './components/TicketTable';
import TicketForm from './components/TicketForm';
import MasterDataView from './components/MasterDataView';
import { ticketsToCsv, csvToTickets, downloadFile } from './utils/csvUtils';
import { 
  Plus, 
  LayoutGrid, 
  GanttChartIcon, 
  Search, 
  Filter, 
  Download,
  Upload,
  Save,
  Trash2,
  Settings2,
  Loader2,
  History,
  Code2
} from 'lucide-react';

// ソースコードの最終更新日時（生成日時）: 最新の出力時間を反映
const APP_SOURCE_UPDATED_AT = "2026/01/21 17:50:00";

const App: React.FC = () => {
  const [view, setView] = useState<'gantt' | 'table' | 'master'>('gantt');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [versions, setVersions] = useState<Version[]>(INITIAL_VERSIONS);
  const [priorities, setPriorities] = useState<PriorityOption[]>(INITIAL_PRIORITIES);
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ステータスタイミング管理
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [lastExported, setLastExported] = useState<string | null>(null);
  const [lastImported, setLastImported] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [config, setConfig] = useState<GanttConfig>({
    zoom: 'day',
    showResources: true,
    filterByAssignee: null,
    filterByStatus: null,
    filterByPriority: null,
    filterByVersion: null,
    sortBy: 'dueDate',
    sortOrder: 'asc'
  });

  // ローカルストレージからデータを読み込む
  useEffect(() => {
    const savedTickets = localStorage.getItem('smart_gantt_tickets');
    const savedUsers = localStorage.getItem('smart_gantt_users');
    const savedVersions = localStorage.getItem('smart_gantt_versions');
    const savedPriorities = localStorage.getItem('smart_gantt_priorities');
    
    const savedExported = localStorage.getItem('smart_gantt_last_exported');
    const savedImported = localStorage.getItem('smart_gantt_last_imported');

    if (savedTickets) setTickets(JSON.parse(savedTickets));
    if (savedUsers) setUsers(JSON.parse(savedUsers));
    if (savedVersions) setVersions(JSON.parse(savedVersions));
    if (savedPriorities) setPriorities(JSON.parse(savedPriorities));
    
    if (savedExported) setLastExported(savedExported);
    if (savedImported) setLastImported(savedImported);

    setIsLoading(false);
  }, []);

  // データが変更されるたびにローカルストレージに自動保存
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('smart_gantt_tickets', JSON.stringify(tickets));
      localStorage.setItem('smart_gantt_users', JSON.stringify(users));
      localStorage.setItem('smart_gantt_versions', JSON.stringify(versions));
      localStorage.setItem('smart_gantt_priorities', JSON.stringify(priorities));
      
      // 日付と時間（秒まで）をフォーマット
      const now = new Date().toLocaleString('ja-JP', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
      setLastSaved(now);
    }
  }, [tickets, users, versions, priorities, isLoading]);

  const handleExportCsv = () => {
    const csvContent = ticketsToCsv(tickets);
    downloadFile(csvContent, `tickets_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
    
    const now = new Date().toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastExported(now);
    localStorage.setItem('smart_gantt_last_exported', now);
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const importedTickets = csvToTickets(text);
        if (importedTickets.length > 0) {
          if (confirm(`${importedTickets.length}件のチケットをインポートしますか？現在のデータは上書きされます。`)) {
            setTickets(importedTickets);
            const now = new Date().toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setLastImported(now);
            localStorage.setItem('smart_gantt_last_imported', now);
          }
        } else {
          alert("有効なチケットデータが見つかりませんでした。");
        }
      } catch (err) {
        alert("CSVの解析に失敗しました。フォーマットを確認してください。");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const syncParentDates = useCallback((allTickets: Ticket[]): Ticket[] => {
    let result = [...allTickets];
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 10) {
      changed = false;
      const nextResult = result.map(ticket => {
        const children = result.filter(t => t.parentId === ticket.id);
        if (children.length === 0) return ticket;
        const minStart = children.reduce((min, c) => c.startDate < min ? c.startDate : min, children[0].startDate);
        const maxEnd = children.reduce((max, c) => c.dueDate > max ? c.dueDate : max, children[0].dueDate);
        if (ticket.startDate !== minStart || ticket.dueDate !== maxEnd) {
          changed = true;
          return { ...ticket, startDate: minStart, dueDate: maxEnd };
        }
        return ticket;
      });
      result = nextResult;
      iterations++;
    }
    return result;
  }, []);

  const updateTicket = useCallback((id: string, updates: Partial<Ticket>) => {
    setTickets(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, ...updates } : t);
      return syncParentDates(updated);
    });
  }, [syncParentDates]);

  const toggleSort = useCallback((key: keyof Ticket) => {
    setConfig(prev => ({ 
      ...prev, 
      sortBy: key, 
      sortOrder: prev.sortBy === key && prev.sortOrder === 'asc' ? 'desc' : 'asc' 
    }));
  }, []);

  const saveTicket = (formData: Partial<Ticket>) => {
    setTickets(prev => {
      let updated;
      if (selectedTicket) {
        updated = prev.map(t => t.id === selectedTicket.id ? { ...t, ...formData } : t);
      } else {
        const newTicket: Ticket = {
          id: Math.floor(Math.random() * 9000 + 1000).toString(),
          priorityId: priorities[0]?.id || '',
          assigneeId: '',
          versionId: '',
          subject: '',
          description: '',
          status: 'New',
          startDate: new Date().toISOString().split('T')[0],
          dueDate: new Date().toISOString().split('T')[0],
          progress: 0,
          estimatedHours: 0,
          parentId: null,
          ...formData
        };
        updated = [...prev, newTicket];
      }
      return syncParentDates(updated);
    });
    setShowForm(false);
    setSelectedTicket(null);
  };

  const deleteTicket = (id: string) => {
    if (confirm("このチケットを削除してもよろしいですか？")) {
      setTickets(prev => syncParentDates(prev.filter(t => t.id !== id)));
      setShowForm(false);
      setSelectedTicket(null);
    }
  };

  const clearAllData = () => {
    if (confirm("すべてのデータを削除して初期状態に戻しますか？この操作は取り消せません。")) {
      setTickets([]);
      setUsers(INITIAL_USERS);
      setVersions(INITIAL_VERSIONS);
      setPriorities(INITIAL_PRIORITIES);
      localStorage.clear();
      setLastExported(null);
      setLastImported(null);
      alert("データを初期化しました。");
    }
  };

  const filteredTickets = useMemo(() => {
    let result = [...tickets];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.subject.toLowerCase().includes(query) || 
        t.id.toLowerCase().includes(query)
      );
    }
    if (config.filterByAssignee) result = result.filter(t => t.assigneeId === config.filterByAssignee);
    if (config.filterByStatus) result = result.filter(t => t.status === config.filterByStatus);
    if (config.filterByPriority) result = result.filter(t => t.priorityId === config.filterByPriority);
    if (config.filterByVersion) result = result.filter(t => t.versionId === config.filterByVersion);
    
    return result.sort((a, b) => {
      let valA: any = a[config.sortBy] || '';
      let valB: any = b[config.sortBy] || '';

      if (config.sortBy === 'assigneeId') {
        valA = users.find(u => u.id === a.assigneeId)?.name || 'zzz';
        valB = users.find(u => u.id === b.assigneeId)?.name || 'zzz';
      } else if (config.sortBy === 'versionId') {
        valA = versions.find(v => v.id === a.versionId)?.name || 'zzz';
        valB = versions.find(v => v.id === b.versionId)?.name || 'zzz';
      }

      const order = config.sortOrder === 'asc' ? 1 : -1;
      if (valA < valB) return -1 * order;
      if (valA > valB) return 1 * order;
      return 0;
    });
  }, [tickets, config, searchQuery, users, versions]);

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <Loader2 className="animate-spin mb-4 text-blue-600" size={40} />
        <p className="font-bold">データを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden text-gray-800">
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-200">
              <GanttChartIcon size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight leading-none">SmartGantt</h1>
              <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase mt-1">Local Edition</p>
            </div>
          </div>

          {/* 自動保存表示 - ファイル名の右側 */}
          <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
            <Save size={10} />
            <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">Auto-Saved:</span>
            <span className="text-[10px] font-mono font-medium">{lastSaved || '--/--/-- --:--:--'}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* ソースコード更新日時 - インポート/エクスポートの左側 */}
          <div className="flex items-center gap-1.5 text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">
            <Code2 size={10} />
            <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">Source:</span>
            <span className="text-[10px] font-mono font-medium">{APP_SOURCE_UPDATED_AT}</span>
          </div>

          <div className="flex items-center gap-3">
            <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                onChange={handleImportCsv} 
                className="hidden" 
            />
            <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-200">
              <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                >
                  <Upload size={14} /> 
                  <span className="hidden sm:inline">インポート</span>
                </button>
              <button 
                  onClick={handleExportCsv}
                  className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-blue-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                >
                  <Download size={14} /> 
                  <span className="hidden sm:inline">エクスポート</span>
                </button>
            </div>
            <button 
              onClick={clearAllData}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
              title="データを初期化"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200 p-3 shrink-0 z-20 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button onClick={() => setView('gantt')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${view === 'gantt' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              <GanttChartIcon size={16} /> ガント
            </button>
            <button onClick={() => setView('table')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${view === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              <LayoutGrid size={16} /> 一覧
            </button>
            <button onClick={() => setView('master')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${view === 'master' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              <Settings2 size={16} /> マスタ設定
            </button>
          </div>

          {view !== 'master' && (
            <>
              <div className="flex-1 flex items-center gap-2">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    placeholder="チケットを検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm w-full outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-medium ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600'}`}
                >
                  <Filter size={16} /> フィルター
                </button>
              </div>
              <button 
                onClick={() => { setSelectedTicket(null); setShowForm(true); }}
                className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg shadow-gray-200"
              >
                <Plus size={18} /> 新規作成
              </button>
            </>
          )}
        </div>

        {showFilters && view !== 'master' && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4 animate-in slide-in-from-top-2">
            <select value={config.filterByStatus || ''} onChange={(e) => setConfig({...config, filterByStatus: (e.target.value as TicketStatus) || null})} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
              <option value="">すべてのステータス</option>
              <option value="New">新規</option>
              <option value="In Progress">進行中</option>
              <option value="Resolved">解決</option>
              <option value="Closed">終了</option>
            </select>
            <select value={config.filterByPriority || ''} onChange={(e) => setConfig({...config, filterByPriority: e.target.value || null})} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
              <option value="">すべての優先度</option>
              {priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={config.filterByAssignee || ''} onChange={(e) => setConfig({...config, filterByAssignee: e.target.value || null})} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
              <option value="">すべての担当者</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select value={config.filterByVersion || ''} onChange={(e) => setConfig({...config, filterByVersion: e.target.value || null})} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
              <option value="">すべてのバージョン</option>
              {versions.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <main className="flex-1 overflow-hidden p-4 bg-gray-50/50">
        {view === 'gantt' && (
          <GanttChart 
            tickets={filteredTickets} users={users} priorities={priorities} versions={versions} config={config} 
            onUpdateTicket={updateTicket} 
            onToggleSort={toggleSort}
            onSelectTicket={(t) => { setSelectedTicket(t); setShowForm(true); }}
          />
        )}
        {view === 'table' && (
          <TicketTable 
            tickets={filteredTickets} users={users} versions={versions} priorities={priorities} config={config}
            onToggleSort={toggleSort}
            onSelectTicket={(t) => { setSelectedTicket(t); setShowForm(true); }}
          />
        )}
        {view === 'master' && (
          <MasterDataView 
            users={users} versions={versions} priorities={priorities}
            onUpdateUsers={setUsers} onUpdateVersions={setVersions} onUpdatePriorities={setPriorities}
          />
        )}
      </main>

      <footer className="h-8 bg-white border-t border-gray-200 px-6 flex items-center justify-between shrink-0 text-[10px] text-gray-400 font-medium">
        <div className="flex gap-4">
          <span>チケット数: {tickets.length}件</span>
          <span>リソース数: {users.length}名</span>
          {lastImported && <span className="flex items-center gap-1"><Upload size={10} /> 最終読込: {lastImported}</span>}
          {lastExported && <span className="flex items-center gap-1"><Download size={10} /> 最終書出: {lastExported}</span>}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Code2 size={10} />
            Source: {APP_SOURCE_UPDATED_AT}
          </div>
          <div className="flex items-center gap-1">
            <History size={10} />
            最終自動同期: {lastSaved || '未同期'}
          </div>
        </div>
      </footer>

      {showForm && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[2px]" onClick={() => setShowForm(false)} />
          <TicketForm 
            ticket={selectedTicket} tickets={tickets} users={users} versions={versions} priorities={priorities}
            onClose={() => setShowForm(false)} onSave={saveTicket} onDelete={deleteTicket}
          />
        </>
      )}
    </div>
  );
};

export default App;
