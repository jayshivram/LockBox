import {
  LayoutDashboard, Key, Zap, Shield, FileText, Settings,
  Lock, Star, Wallet, Briefcase, User, Server, Globe, Code2,
  ChevronRight, Wifi
} from 'lucide-react';
import { useVaultStore } from '../store/vaultStore';
import type { View, Category } from '../types';

const VIEWS: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'vault', label: 'All Passwords', icon: Key },
  { id: 'generator', label: 'Generator', icon: Zap },
  { id: 'totp', label: 'Authenticator', icon: Shield },
  { id: 'notes', label: 'Secure Notes', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const CATEGORIES: { id: Category; label: string; icon: typeof User; color: string }[] = [
  { id: 'Personal', label: 'Personal', icon: User, color: '#60A5FA' },
  { id: 'Work', label: 'Work', icon: Briefcase, color: '#34D399' },
  { id: 'Finance', label: 'Finance', icon: Wallet, color: '#F0B429' },
  { id: 'Crypto', label: 'Crypto', icon: Zap, color: '#A78BFA' },
  { id: 'Social', label: 'Social', icon: Globe, color: '#FB7185' },
  { id: 'Servers', label: 'Servers', icon: Server, color: '#38BDF8' },
  { id: 'API Keys', label: 'API Keys', icon: Code2, color: '#4ADE80' },
  { id: 'Network', label: 'Network / WiFi', icon: Wifi, color: '#22D3EE' },
];

export function Sidebar() {
  const { currentView, setView, selectedCategory, setCategory, setActiveFilterType, activeFilterType, lock, entries } = useVaultStore();

  const categoryCounts: Record<string, number> = {};
  entries.forEach(e => {
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
  });
  const favoriteCount = entries.filter(e => e.isFavorite).length;

  const handleFavorites = () => {
    setView('vault');
    setCategory('All');
    setActiveFilterType('favorite');
  };

  return (
    <aside className="hidden md:flex flex-col h-full w-60 flex-shrink-0"
      style={{ background: 'var(--c-surface)', borderRight: '1px solid var(--c-border)' }}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'var(--c-border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--c-accent-bgm)', border: '1px solid var(--c-accent-bd)' }}>
          <Lock size={16} color="var(--c-accent)" />
        </div>
        <span className="font-bold text-lg tracking-tight" style={{ color: 'var(--c-accent)' }}>LockBox</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* Main nav */}
        {VIEWS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`sidebar-item w-full text-left ${currentView === id ? 'active' : ''}`}
            style={{ color: currentView === id ? 'var(--c-accent)' : 'var(--c-text-s)' }}
          >
            <Icon size={16} />
            <span className="flex-1">{label}</span>
            {currentView === id && <ChevronRight size={12} style={{ color: 'var(--c-accent)' }} />}
          </button>
        ))}

        {/* Favorites — navigates to vault with favorite filter active */}
        <button
          onClick={handleFavorites}
          className={`sidebar-item w-full text-left ${currentView === 'vault' && activeFilterType === 'favorite' ? 'active' : ''}`}
          style={{ color: currentView === 'vault' && activeFilterType === 'favorite' ? 'var(--c-accent)' : 'var(--c-text-s)' }}
        >
          <Star size={16} />
          <span className="flex-1">Favorites</span>
          {favoriteCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-mono"
              style={{ background: 'var(--c-accent-bgm)', color: 'var(--c-accent)' }}>
              {favoriteCount}
            </span>
          )}
        </button>

        {/* Categories */}
        <div className="pt-4 pb-2">
          <p className="px-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--c-text-g)' }}>
            Categories
          </p>
        </div>

        {CATEGORIES.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => { setView('vault'); setCategory(id); setActiveFilterType('all'); }}
            className={`sidebar-item w-full text-left ${currentView === 'vault' && selectedCategory === id ? 'active' : ''}`}
            style={{ color: currentView === 'vault' && selectedCategory === id ? 'var(--c-accent)' : 'var(--c-text-s)' }}
          >
            <Icon size={15} color={color} />
            <span className="flex-1">{label}</span>
            {(categoryCounts[id] || 0) > 0 && (
              <span className="text-xs font-mono" style={{ color: 'var(--c-text-f)' }}>
                {categoryCounts[id]}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Lock button */}
      <div className="px-3 py-4 border-t" style={{ borderColor: 'var(--c-border)' }}>
        <button
          onClick={lock}
          className="sidebar-item w-full text-left"
          style={{ color: '#EF4444' }}
        >
          <Lock size={15} />
          <span>Lock Vault</span>
        </button>
        <p className="text-xs px-3 mt-2" style={{ color: 'var(--c-text-f)' }}>
          {entries.length} items encrypted
        </p>
      </div>
    </aside>
  );
}
