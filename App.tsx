
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Ticket, User, Version, PriorityOption, GanttConfig, TicketStatus } from './types';
import { INITIAL_USERS, INITIAL_VERSIONS, INITIAL_PRIORITIES } from './constants';
import GanttChart from './components/GanttChart';
import TicketTable from './components/TicketTable';
import TicketForm from './components/TicketForm';
import MasterDataView from './components/MasterDataView';
import { spreadsheetService, SpreadsheetInfo } from './services/spreadsheetService';
import { 
  Plus, 
  LayoutGrid, 
  GanttChartIcon, 
  Search, 
  Filter, 
  ChevronDown,
  Sparkles,
  RefreshCw,
  Save,
  CloudDownload,
  CheckCircle,
  AlertCircle,
  X,
  ArrowUpDown,
  Settings2,
  Loader2,
  Link,
  ExternalLink,
  Database,
  ShieldAlert,
  Info
} from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<'gantt' | 'table' | 'master'>('gantt');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [versions, setVersions] = useState<Version[]>(INITIAL_VERSIONS);
  const [priorities, setPriorities] = useState<PriorityOption[]>(INITIAL_PRIORITIES);
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // スプレッドシート接続設定
  const [targetSpreadsheet, setTargetSpreadsheet] = useState<SpreadsheetInfo | null>(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [inputSpreadsheetId, setInputSpreadsheetId] = useState('');
  const [connectionError, setConnectionError] = useState<string | null>(null);

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

  // データの読み込み
  const fetchData = useCallback(async (ssId?: string) => {
    setIsLoading(true);
    setConnectionError(null);
    try {
      // 1. 接続テストと情報取得
      const info = await spreadsheetService.getInfo(ssId);
      setTargetSpreadsheet(info);
      if (ssId) {
        localStorage.setItem('smart_gantt_target_id', ssId);
      } else {
        localStorage.removeItem('smart_gantt_target_id');
      }

      // 2. データロード
      const data = await spreadsheetService.loadData(ssId);
      if (data.tickets) setTickets(data.tickets);
      if (data.users && data.users.length > 0) setUsers(data.users);
      if (data.versions && data.versions.length > 0) setVersions(data.versions);
      if (data.priorities && data.priorities.length > 0) setPriorities(data.priorities);
      
      setShowConnectionModal(false);
    } catch (e: any) {
      console.error("Connection failed", e);
      const msg = e.message || "不明な接続エラーが発生しました";
      setConnectionError(msg);
      setShowConnectionModal(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedId = localStorage.getItem('smart_gantt_target_id');
    fetchData(savedId || undefined);
  }, []);

  const handleConnect = () => {
    let id = inputSpreadsheetId.trim();
    if (!id) {
      fetchData(undefined);
      return;
    }
    // URLからIDを抽出する正規表現
    const match = id.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      id = match[1];
    }
    fetchData(id);
  };

  const handleSaveToSheet = async () => {
    setIsProcessing(true);
    try {
      await spreadsheetService.saveAll(
        { tickets, users, versions, priorities },
        targetSpreadsheet?.id !== 'mock-id' ? targetSpreadsheet?.id : undefined
      );
      alert("スプレッドシートに保存しました");
    } catch (e: any) {
      console.error("Save error", e);
      alert("保存に失敗しました: " + (e.message || ""));
    } finally {
      setIsProcessing(false);
    }
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
    setTickets(prev => syncParentDates(prev.filter(t => t.id !== id)));
    setShowForm(false);
    setSelectedTicket(null);
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

  if (isLoading && !showConnectionModal) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <Loader2 className="animate-spin mb-4 text-blue-600" size={40} />
        <p className="font-bold">スプレッドシートを読み込み中...</p>
        <p className="text-xs text-gray-400 mt-2">{targetSpreadsheet?.name || '接続確認中'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden text-gray-800">
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-200">
              <GanttChartIcon size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight leading-none">SmartGantt</h1>
              <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase mt-1">Spreadsheet Edition</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg max-w-sm">
            <Database size={14} className="text-gray-400" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-1">Target Sheet</span>
              <span className="text-xs font-bold truncate text-gray-700">{targetSpreadsheet?.name || 'Not Connected'}</span>
            </div>
            <button 
              onClick={() => { setInputSpreadsheetId(targetSpreadsheet?.id || ''); setShowConnectionModal(true); }}
              className="ml-2 p-1 hover:bg-white rounded border border-transparent hover:border-gray-200 text-blue-600 transition-all"
              title="接続先を変更"
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <button 
              onClick={handleSaveToSheet} 
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-md shadow-emerald-100 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} 
              保存
            </button>
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
              <Settings2 size={16} /> マスタ
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

      {/* 接続先設定モーダル */}
      {showConnectionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isLoading && setShowConnectionModal(false)} />
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Database size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">スプレッドシート接続</h2>
                  <p className="text-sm text-gray-500">データを保存するファイルを選択してください</p>
                </div>
              </div>

              {connectionError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl flex gap-3 animate-in slide-in-from-top-2">
                  <ShieldAlert className="text-red-500 shrink-0" size={18} />
                  <div className="text-xs text-red-700 font-medium leading-relaxed">
                    {connectionError}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Spreadsheet ID or URL</label>
                  <input 
                    value={inputSpreadsheetId}
                    onChange={(e) => setInputSpreadsheetId(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    disabled={isLoading}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-gray-50"
                  />
                  
                  <div className="mt-4 p-3 bg-blue-50/50 rounded-lg flex gap-3">
                    <Info className="text-blue-400 shrink-0" size={14} />
                    <p className="text-[10px] text-blue-600 leading-relaxed">
                      外部ファイルを指定する場合、そのファイルをスクリプト実行ユーザー（あなた）に共有し、編集権限を付与しておく必要があります。空欄にすると「現在開いているファイル」を使用します。
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button 
                    onClick={handleConnect}
                    disabled={isLoading}
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : null}
                    {isLoading ? '接続中...' : '接続して読み込む'}
                  </button>
                  <button 
                    onClick={() => setShowConnectionModal(false)}
                    disabled={isLoading}
                    className="w-full py-3 text-gray-500 font-medium rounded-xl hover:bg-gray-50 transition-all disabled:opacity-30"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
