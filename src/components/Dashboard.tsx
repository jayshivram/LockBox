import { useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Key, RefreshCw, TrendingUp, Clock, Star } from 'lucide-react';
import { useVaultStore } from '../store/vaultStore';
import { checkStrength } from '../utils/strength';

export function Dashboard() {
  const { entries, setView, setCategory, setSelectedEntry } = useVaultStore();
  const [refreshing, setRefreshing] = useState(false);

  // Stats
  const totalPasswords = entries.filter(e => e.type === 'login' || e.type === 'wifi' || e.password).length;
  const weakPasswords = entries.filter(e => e.password && checkStrength(e.password).score <= 1);
  const allPasswords = entries.filter(e => e.password).map(e => e.password!);
  const reusedPasswords = entries.filter(e => {
    if (!e.password) return false;
    return allPasswords.filter(p => p === e.password).length > 1;
  });
  const compromised = entries.filter(e => e.isCompromised);
  const favorites = entries.filter(e => e.isFavorite);
  const totalEntries = entries.length;

  const securityScore = Math.max(0, Math.min(100, Math.round(
    100 - (weakPasswords.length * 10) - (reusedPasswords.length * 8) - (compromised.length * 20)
  )));

  const scoreColor = securityScore >= 80 ? '#22C55E' : securityScore >= 60 ? '#F59E0B' : '#EF4444';
  const scoreLabel = securityScore >= 80 ? 'Excellent' : securityScore >= 60 ? 'Fair' : 'At Risk';

  const recentEntries = [...entries]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const categoryBreakdown = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1;
    return acc;
  }, {});

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const CATEGORY_COLORS: Record<string, string> = {
    Personal: '#60A5FA', Work: '#34D399', Finance: '#F0B429',
    Crypto: '#A78BFA', Social: '#FB7185', Servers: '#38BDF8', 'API Keys': '#4ADE80', Network: '#22D3EE',
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--c-text)' }}>Vault Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--c-text-m)' }}>
            {totalEntries} items stored · encrypted with AES-256-GCM
          </p>
        </div>
        <button onClick={handleRefresh} className="btn-ghost text-xs">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Security Score */}
      <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 shimmer" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-m)' }}>Security Score</p>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-5xl font-bold font-mono" style={{ color: scoreColor }}>
                {securityScore}
              </span>
              <span className="text-lg" style={{ color: 'var(--c-text-m)' }}>/100</span>
              <span className="text-sm font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${scoreColor}20`, color: scoreColor }}>
                {scoreLabel}
              </span>
            </div>
            <div className="mt-3 w-full max-w-xs h-2 rounded-full overflow-hidden" style={{ background: 'var(--c-strength-empty)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${securityScore}%`, background: scoreColor }} />
            </div>
          </div>
          <ShieldCheck size={64} color={scoreColor} strokeWidth={1} style={{ opacity: 0.6 }} />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <Key size={18} color="#F0B429" />
            <span className="text-2xl font-bold font-mono" style={{ color: 'var(--c-text)' }}>{totalPasswords}</span>
          </div>
          <p className="text-xs font-medium" style={{ color: 'var(--c-text-s)' }}>Total Passwords</p>
        </div>

        <div className="stat-card cursor-pointer" onClick={() => setView('vault')}>
          <div className="flex items-center justify-between mb-3">
            <AlertTriangle size={18} color="#F59E0B" />
            <span className="text-2xl font-bold font-mono" style={{ color: weakPasswords.length > 0 ? '#F59E0B' : '#22C55E' }}>
              {weakPasswords.length}
            </span>
          </div>
          <p className="text-xs font-medium" style={{ color: 'var(--c-text-s)' }}>Weak Passwords</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <RefreshCw size={18} color="#A78BFA" />
            <span className="text-2xl font-bold font-mono" style={{ color: reusedPasswords.length > 0 ? '#A78BFA' : '#22C55E' }}>
              {reusedPasswords.length}
            </span>
          </div>
          <p className="text-xs font-medium" style={{ color: 'var(--c-text-s)' }}>Reused Passwords</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <ShieldAlert size={18} color="#EF4444" />
            <span className="text-2xl font-bold font-mono" style={{ color: compromised.length > 0 ? '#EF4444' : '#22C55E' }}>
              {compromised.length}
            </span>
          </div>
          <p className="text-xs font-medium" style={{ color: 'var(--c-text-s)' }}>Compromised</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={15} color="#F0B429" />
            <h3 className="font-semibold text-sm" style={{ color: 'var(--c-text)' }}>Recent Activity</h3>
          </div>
          {recentEntries.length === 0 ? (
            <div className="text-center py-8">
              <Key size={32} color="#1F2937" className="mx-auto mb-2" />
              <p className="text-sm" style={{ color: 'var(--c-text-f)' }}>No entries yet</p>
              <button onClick={() => setView('vault')} className="btn-primary text-xs mt-3 px-3 py-1.5">
                Add your first password
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentEntries.map(entry => (
                <div
                  key={entry.id}
                  onClick={() => { setView('vault'); setSelectedEntry(entry.id); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all"
                  style={{ background: 'var(--c-input-bg)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--c-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--c-input-bg)')}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{ background: `${CATEGORY_COLORS[entry.category] || '#6B7280'}20`, color: CATEGORY_COLORS[entry.category] || '#6B7280' }}>
                    {entry.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--c-text)' }}>{entry.name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--c-text-f)' }}>
                      {entry.username || entry.url || entry.category}
                    </p>
                  </div>
                  {entry.isFavorite && <Star size={12} color="#F0B429" fill="#F0B429" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} color="#F0B429" />
            <h3 className="font-semibold text-sm" style={{ color: 'var(--c-text)' }}>By Category</h3>
          </div>
          {Object.keys(categoryBreakdown).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: 'var(--c-text-f)' }}>No categories used yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(categoryBreakdown).map(([cat, count]) => {
                const pct = Math.round((count / totalEntries) * 100);
                const color = CATEGORY_COLORS[cat] || '#6B7280';
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--c-text-s)' }}>{cat}</span>
                      <span className="font-mono" style={{ color }}>{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--c-strength-empty)' }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {favorites.length > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--c-border)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Star size={13} color="#F0B429" fill="#F0B429" />
                <span className="text-xs font-semibold" style={{ color: 'var(--c-text-m)' }}>Favorites ({favorites.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {favorites.slice(0, 5).map(e => (
                  <span key={e.id} className="tag-pill text-xs">{e.name}</span>
                ))}
                {favorites.length > 5 && (
                  <span className="text-xs" style={{ color: 'var(--c-text-f)' }}>+{favorites.length - 5} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Warnings */}
      {(weakPasswords.length > 0 || reusedPasswords.length > 0 || compromised.length > 0) && (
        <div className="glass-card rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-sm" style={{ color: 'var(--c-text)' }}>⚠️ Security Recommendations</h3>
          {compromised.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <ShieldAlert size={16} color="#EF4444" />
              <span style={{ color: '#EF4444' }}>
                <strong>{compromised.length}</strong> password(s) found in data breaches. Change them immediately.
              </span>
            </div>
          )}
          {reusedPasswords.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm"
              style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}>
              <RefreshCw size={16} color="#A78BFA" />
              <span style={{ color: '#8B5CF6' }}>
                <strong>{reusedPasswords.length}</strong> reused password(s) detected. Use unique passwords per site.
              </span>
            </div>
          )}
          {weakPasswords.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <AlertTriangle size={16} color="#F59E0B" />
              <span style={{ color: '#F59E0B' }}>
                <strong>{weakPasswords.length}</strong> weak password(s). Consider upgrading with the password generator.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
