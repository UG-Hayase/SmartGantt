
import React, { useState } from 'react';
import { User, Version, PriorityOption } from '../types';
import { Plus, Trash2, UserPlus, Tag, AlertTriangle } from 'lucide-react';

interface MasterDataViewProps {
  users: User[];
  versions: Version[];
  priorities: PriorityOption[];
  onUpdateUsers: (users: User[]) => void;
  onUpdateVersions: (versions: Version[]) => void;
  onUpdatePriorities: (priorities: PriorityOption[]) => void;
}

const MasterDataView: React.FC<MasterDataViewProps> = ({ 
  users, versions, priorities, 
  onUpdateUsers, onUpdateVersions, onUpdatePriorities 
}) => {
  const [newUserName, setNewUserName] = useState('');
  const [newVersionName, setNewVersionName] = useState('');
  const [newPriorityName, setNewPriorityName] = useState('');

  const addTarget = (type: 'user' | 'version' | 'priority') => {
    if (type === 'user' && newUserName) {
      onUpdateUsers([...users, { id: `u${Date.now()}`, name: newUserName, avatar: `https://picsum.photos/seed/${Date.now()}/40/40` }]);
      setNewUserName('');
    } else if (type === 'version' && newVersionName) {
      onUpdateVersions([...versions, { id: `v${Date.now()}`, name: newVersionName }]);
      setNewVersionName('');
    } else if (type === 'priority' && newPriorityName) {
      onUpdatePriorities([...priorities, { id: `p${Date.now()}`, name: newPriorityName, color: 'text-blue-500' }]);
      setNewPriorityName('');
    }
  };

  const removeTarget = (type: 'user' | 'version' | 'priority', id: string) => {
    if (type === 'user') onUpdateUsers(users.filter(u => u.id !== id));
    else if (type === 'version') onUpdateVersions(versions.filter(v => v.id !== id));
    else if (type === 'priority') onUpdatePriorities(priorities.filter(p => p.id !== id));
  };

  const Section = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
        <div className="p-2 bg-gray-50 rounded-lg text-gray-500"><Icon size={18} /></div>
        <h3 className="font-bold text-gray-800">{title}</h3>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {children}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-300">
      {/* Users Management */}
      <Section title="担当者管理" icon={UserPlus}>
        <div className="flex gap-2 mb-4">
          <input 
            value={newUserName} 
            onChange={e => setNewUserName(e.target.value)}
            placeholder="氏名を入力..." 
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
          />
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
      </Section>

      {/* Versions Management */}
      <Section title="バージョン管理" icon={Tag}>
        <div className="flex gap-2 mb-4">
          <input 
            value={newVersionName} 
            onChange={e => setNewVersionName(e.target.value)}
            placeholder="バージョン名..." 
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
          />
          <button onClick={() => addTarget('version')} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"><Plus size={18}/></button>
        </div>
        {versions.map(v => (
          <div key={v.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 group transition-all">
            <span className="text-sm font-medium text-gray-700">{v.name}</span>
            <button onClick={() => removeTarget('version', v.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
          </div>
        ))}
      </Section>

      {/* Priorities Management */}
      <Section title="優先度管理" icon={AlertTriangle}>
        <div className="flex gap-2 mb-4">
          <input 
            value={newPriorityName} 
            onChange={e => setNewPriorityName(e.target.value)}
            placeholder="優先度名..." 
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
          />
          <button onClick={() => addTarget('priority')} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"><Plus size={18}/></button>
        </div>
        {priorities.map(p => (
          <div key={p.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 group transition-all">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full bg-current ${p.color}`} />
              <span className="text-sm font-medium text-gray-700">{p.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <select 
                value={p.color} 
                onChange={(e) => {
                  const updated = priorities.map(item => item.id === p.id ? {...item, color: e.target.value} : item);
                  onUpdatePriorities(updated);
                }}
                className="text-[10px] bg-transparent border-none focus:ring-0 cursor-pointer text-gray-400"
              >
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
    </div>
  );
};

export default MasterDataView;
