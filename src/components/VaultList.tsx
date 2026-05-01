import { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, Star, Eye, EyeOff, Copy, Check, Trash2,
  Edit3, Globe, User, Key, Tag, Shield, Clock, ExternalLink,
  AlertTriangle, CheckCircle2, Loader2, Filter, Wifi, Lock, AlertCircle,
  ArrowUpDown, SortAsc, SortDesc, CreditCard, Fingerprint, Building2, FileText,
  ArrowLeft
} from 'lucide-react';
import { useVaultStore } from '../store/vaultStore';
import type { VaultStore } from '../store/vaultStore';
import { checkStrength } from '../utils/strength';
import { copyToClipboard, checkPasswordBreach } from '../utils/crypto';
import type { VaultEntry, Category } from '../types';
import { EntryModal } from './EntryModal';

type SortOption = VaultStore['sortBy'];

function formatAge(isoDate: string): string {
  const days = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
  if (days === 0) return 'Updated today';
  if (days === 1) return 'Updated yesterday';
  if (days < 30) return `Updated ${days}d ago`;
  if (days < 365) return `Updated ${Math.floor(days / 30)}mo ago`;
  return `Updated ${Math.floor(days / 365)}y ago`;
}

const CATEGORY_COLORS: Record<string, string> = {
  Personal: '#60A5FA', Work: '#34D399', Finance: '#F0B429',
  Crypto: '#A78BFA', Social: '#FB7185', Servers: '#38BDF8', 'API Keys': '#4ADE80', Network: '#22D3EE',
};

function EntryIcon({ entry }: { entry: VaultEntry }) {
  const color = CATEGORY_COLORS[entry.category] || '#6B7280';
  if (entry.type === 'wifi') {
    return (
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}>
        <Wifi size={18} />
      </div>
    );
  }
  if (entry.type === 'bank') {
    return (
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: '#F0B42915', color: '#F0B429', border: '1px solid #F0B42925' }}>
        <CreditCard size={18} />
      </div>
    );
  }
  if (entry.type === 'identity') {
    return (
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: '#60A5FA15', color: '#60A5FA', border: '1px solid #60A5FA25' }}>
        <Fingerprint size={18} />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base font-bold"
      style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}>
      {entry.name[0]?.toUpperCase() || '?'}
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const { settings } = useVaultStore();
  const handleCopy = () => {
    copyToClipboard(text, settings.clipboardClearSeconds * 1000);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1.5 rounded transition-all"
      style={{ color: copied ? '#22C55E' : 'var(--c-text-m)' }}
      title={copied ? 'Copied!' : `Copy ${label}`}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

type BreachState = 'idle' | 'checking' | 'safe' | 'found' | 'error';

function EntryDetail({ entry }: { entry: VaultEntry }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [breachState, setBreachState] = useState<BreachState>('idle');
  const [breachCount, setBreachCount] = useState(0);
  // Bank show/hide state
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [showRoutingNumber, setShowRoutingNumber] = useState(false);
  const [showIban, setShowIban] = useState(false);
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [showCardCvv, setShowCardCvv] = useState(false);
  const [showCardPin, setShowCardPin] = useState(false);
  // Identity show/hide state
  const [showIdNumber, setShowIdNumber] = useState(false);
  const { updateEntry, deleteEntry } = useVaultStore();

  const strength = entry.password ? checkStrength(entry.password) : null;

  const handleToggleFavorite = () => updateEntry(entry.id, { isFavorite: !entry.isFavorite });
  const handleDelete = async () => {
    if (confirm(`Delete "${entry.name}"? This cannot be undone.`)) {
      deleteEntry(entry.id);
    }
  };
  const handleBreachCheck = async () => {
    if (!entry.password) return;
    setBreachState('checking');
    const count = await checkPasswordBreach(entry.password);
    if (count === -1) {
      setBreachState('error');
    } else if (count > 0) {
      setBreachCount(count);
      setBreachState('found');
      updateEntry(entry.id, { isCompromised: true });
    } else {
      setBreachState('safe');
      updateEntry(entry.id, { isCompromised: false });
    }
  };

  return (
    <div className="h-full overflow-y-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4 p-6 border-b" style={{ borderColor: 'var(--c-border-m)' }}>
        <EntryIcon entry={entry} />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold truncate" style={{ color: 'var(--c-text)' }}>{entry.name}</h2>
          <p className="text-sm truncate" style={{ color: 'var(--c-text-m)' }}>
            {entry.type === 'wifi'
              ? (entry.wifiSsid || entry.username || entry.category)
              : entry.type === 'bank'
              ? (entry.bankName || entry.accountType || entry.category)
              : entry.type === 'identity'
              ? (entry.idType || entry.fullName || entry.category)
              : (entry.username || entry.url || entry.category)}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: `${CATEGORY_COLORS[entry.category] || '#6B7280'}15`,
                       color: CATEGORY_COLORS[entry.category] || '#6B7280',
                       border: `1px solid ${CATEGORY_COLORS[entry.category] || '#6B7280'}30` }}>
              {entry.category}
            </span>
            {entry.tags.map(t => <span key={t} className="tag-pill">#{t}</span>)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleToggleFavorite} className="p-2 rounded-lg transition-all"
            style={{ color: entry.isFavorite ? 'var(--c-accent)' : 'var(--c-text-f)' }}>
            <Star size={16} fill={entry.isFavorite ? 'var(--c-accent)' : 'none'} />
          </button>
          <button onClick={() => setEditOpen(true)} className="p-2 rounded-lg transition-all"
            style={{ color: 'var(--c-text-m)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--c-text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--c-text-m)')}>
            <Edit3 size={16} />
          </button>
          <button onClick={handleDelete} className="p-2 rounded-lg transition-all"
            style={{ color: 'var(--c-text-m)' }} onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--c-text-m)')}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">

        {/* ── WiFi fields ── */}
        {entry.type === 'wifi' && (
          <>
            {entry.wifiSsid && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wifi size={13} color="#22D3EE" />
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-f)' }}>Network Name (SSID)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm" style={{ color: 'var(--c-text)' }}>{entry.wifiSsid}</span>
                  <CopyButton text={entry.wifiSsid} label="SSID" />
                </div>
              </div>
            )}

            {entry.password && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wifi size={13} color="#22D3EE" />
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-f)' }}>WiFi Password</span>
                  {strength && (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
                      style={{ background: `${strength.color}15`, color: strength.color }}>
                      {strength.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-sm flex-1 break-all" style={{ color: 'var(--c-text)' }}>
                    {showPassword ? entry.password : '•'.repeat(Math.min(entry.password.length, 20))}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setShowPassword(s => !s)} className="p-1.5 rounded transition-all"
                      style={{ color: 'var(--c-text-m)' }}>
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <CopyButton text={entry.password} label="WiFi password" />
                  </div>
                </div>
              </div>
            )}

            {entry.url && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe size={13} color="var(--c-text-m)" />
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-f)' }}>Router Admin URL</span>
                </div>
                <div className="flex items-center justify-between">
                  <a href={entry.url.startsWith('http') ? entry.url : `http://${entry.url}`}
                    target="_blank" rel="noopener noreferrer"
                    className="font-mono text-sm truncate flex-1 flex items-center gap-2 hover:underline"
                    style={{ color: '#60A5FA' }}>
                    {entry.url} <ExternalLink size={11} />
                  </a>
                  <CopyButton text={entry.url} label="admin URL" />
                </div>
              </div>
            )}

            {entry.username && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User size={13} color="var(--c-text-m)" />
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-f)' }}>Admin Username</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm" style={{ color: 'var(--c-text)' }}>{entry.username}</span>
                  <CopyButton text={entry.username} label="admin username" />
                </div>
              </div>
            )}

            {entry.adminPassword && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock size={13} color="var(--c-text-m)" />
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-f)' }}>Admin Password</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-sm flex-1 break-all" style={{ color: 'var(--c-text)' }}>
                    {showAdminPassword ? entry.adminPassword : '•'.repeat(Math.min(entry.adminPassword.length, 20))}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setShowAdminPassword(s => !s)} className="p-1.5 rounded transition-all"
                      style={{ color: 'var(--c-text-m)' }}>
                      {showAdminPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <CopyButton text={entry.adminPassword} label="admin password" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Bank / Financial fields ── */}
        {entry.type === 'bank' && (
          <>
            {(entry.bankName || entry.accountType) && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 size={13} color="#F0B429" />
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-f)' }}>Institution</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    {entry.bankName && <p className="text-sm font-medium" style={{ color: 'var(--c-text)' }}>{entry.bankName}</p>}
                    {entry.accountType && <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-m)' }}>{entry.accountType}</p>}
                  </div>
                  {entry.bankName && <CopyButton text={entry.bankName} label="bank name" />}
                </div>
              </div>
            )}

            {entry.accountNumber && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Key size={13} color="var(--c-text-m)" />
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-f)' }}>Account Number</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-sm flex-1 break-all" style={{ color: 'var(--c-text)' }}>
                    {showAccountNumber ? entry.accountNumber : '•'.repeat(Math.min(entry.accountNumber.length, 16))}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setShowAccountNumber(s => !s)} className="p-1.5 rounded transition-all" style={{ color: 'var(--c-text-m)' }}>
                      {showAccountNumber ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <CopyButton text={entry.accountNumber} label="account number" />
                  </div>
                </div>
              </div>
            )}

            {entry.routingNumber && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Key size={13} color="var(--c-text-m)" />
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-f)' }}>Routing / Sort Code</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-sm flex-1 break-all" style={{ color: 'var(--c-text)' }}>
                    {showRoutingNumber ? entry.routingNumber : '•'.repeat(Math.min(entry.routingNumber.length, 12))}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setShowRoutingNumber(s => !s)} className="p-1.5 rounded transition-all" style={{ color: 'var(--c-text-m)' }}>
                      {showRoutingNumber ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <CopyButton text={entry.routingNumber} label="routing number" />
                  </div>
                </div>
              </div>
            )}

            {entry.iban && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Key size={13} color="var(--c-text-m)" />
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-f)' }}>IBAN</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-sm flex-1 break-all" style={{ color: 'var(--c-text)' }}>
                    {showIban ? entry.iban : '•'.repeat(Math.min(entry.iban.length, 20))}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setShowIban(s => !s)} className="p-1.5 rounded transition-all" style={{ color: 'var(--c-text-m)' }}>
                      {showIban ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <CopyButton text={entry.iban} label="IBAN" />
                  </div>
                </div>
              </div>
            )}

            {entry.swiftBic && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe size={13} color="var(--c-text-m)" />
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-f)' }}>SWIFT / BIC</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm" style={{ color: 'var(--c-text)' }}>{entry.swiftBic}</span>
                  <CopyButton text={entry.swiftBic} label="SWIFT/BIC" />
                </div>
              </div>
            )}

            {(entry.cardNumber || entry.cardholderName || entry.cardExpiry) && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard size={13} color="#F0B429" />
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-f)' }}>Card Details</span>
                </div>
                <div className="space-y-3">
                  {entry.cardholderName && (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs" style={{ color: 'var(--c-text-f)' }}>Cardholder</p>
                        <p className="font-mono text-sm mt-0.5" style={{ color: 'var(--c-text)' }}>{entry.cardholderName}</p>
                      </div>
                      <CopyButton text={entry.cardholderName} label="cardholder name" />
                    </div>
                  )}
                  {entry.cardNumber && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-xs" style={{ color: 'var(--c-text-f)' }}>Card Number</p>
                        <p className="font-mono text-sm mt-0.5 break-all" style={{ color: 'var(--c-text)' }}>
                          {showCardNumber ? entry.cardNumber : '•••• •••• •••• ' + entry.cardNumber.slice(-4)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setShowCardNumber(s => !s)} className="p-1.5 rounded transition-all" style={{ color: 'var(--c-text-m)' }}>
                          {showCardNumber ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <CopyButton text={entry.cardNumber} label="card number" />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    {entry.cardExpiry && (
                      <div className="flex items-center justify-between flex-1">
                        <div>
                          <p className="text-xs" style={{ color: 'var(--c-text-f)' }}>Expiry</p>
                          <p className="font-mono text-sm mt-0.5" style={{ color: 'var(--c-text)' }}>{entry.cardExpiry}</p>
                        </div>
                        <CopyButton text={entry.cardExpiry} label="expiry" />
                      </div>
                    )}
                    {entry.cardCvv && (
                      <div className="flex items-center justify-between flex-1">
                        <div>
                          <p className="text-xs" style={{ color: 'var(--c-text-f)' }}>CVV</p>
                          <p className="font-mono text-sm mt-0.5" style={{ color: 'var(--c-text)' }}>
                            {showCardCvv ? entry.cardCvv : '•••'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setShowCardCvv(s => !s)} className="p-1.5 rounded transition-all" style={{ color: 'var(--c-text-m)' }}>
                            {showCardCvv ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          <CopyButton text={entry.cardCvv} label="CVV" />
                        </div>
                      </div>
                    )}
                  </div>
                  {entry.cardPin && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-xs" style={{ color: 'var(--c-text-f)' }}>PIN</p>
                        <p className="font-mono text-sm mt-0.5" style={{ color: 'var(--c-text)' }}>
                          {showCardPin ? entry.cardPin : '•'.repeat(entry.cardPin.length)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setShowCardPin(s => !s)} className="p-1.5 rounded transition-all" style={{ color: 'var(--c-text-m)' }}>
                          {showCardPin ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <CopyButton text={entry.cardPin} label="card PIN" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Online banking fields */}
            {entry.url && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe size={13} color="var(--c-text-m)" />
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-f)' }}>Online Banking</span>
                </div>
                <div className="flex items-center justify-between">
                  <a href={entry.url} target="_blank" rel="noopener noreferrer"
                    className="font-mono text-sm truncate flex-1 flex items-center gap-2 hover:underline"
                    style={{ color: '#60A5FA' }}>
                    {entry.url} <ExternalLink size={11} />
                  </a>
                  <CopyButton text={entry.url} label="URL" />
                </div>
              </div>
            )}
            {entry.username && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User size={13} color="var(--c-text-m)" />
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-f)' }}>Online Banking Username</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm" style={{ color: 'var(--c-text)' }}>{entry.username}</span>
                  <CopyButton text={entry.username} label="username" />
                </div>
              </div>
            )}
            {entry.password && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock size={13} color="var(--c-text-m)" />
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-f)' }}>Online Banking Password</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-sm flex-1 break-all" style={{ color: 'var(--c-text)' }}>
                    {showPassword ? entry.password : '•'.repeat(Math.min(entry.password.length, 20))}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setShowPassword(s => !s)} className="p-1.5 rounded transition-all" style={{ color: 'var(--c-text-m)' }}>
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <CopyButton text={entry.password} label="password" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Identity / Document fields ── */}
        {entry.type === 'identity' && (
          <>
            {(entry.idType || entry.fullName) && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={13} color="#60A5FA" />
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-f)' }}>Document</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    {entry.idType && <p className="text-sm font-medium" style={{ color: 'var(--c-text)' }}>{entry.idType}</p>}
                    {entry.fullName && <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-m)' }}>{entry.fullName}</p>}
                  </div>
                  {entry.fullName && <CopyButton text={entry.fullName} label="full name" />}
                </div>
              </div>
            )}

            {entry.idNumber && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Key size={13} color="var(--c-text-m)" />
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-f)' }}>Document Number</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-sm flex-1 break-all" style={{ color: 'var(--c-text)' }}>
                    {showIdNumber ? entry.idNumber : '•'.repeat(Math.min(entry.idNumber.length, 12))}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setShowIdNumber(s => !s)} className="p-1.5 rounded transition-all" style={{ color: 'var(--c-text-m)' }}>
                      {showIdNumber ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <CopyButton text={entry.idNumber} label="document number" />
                  </div>
                </div>
              </div>
            )}

            {(entry.dateOfBirth || entry.nationality) && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User size={13} color="var(--c-text-m)" />
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-f)' }}>Personal Details</span>
                </div>
                <div className="space-y-2">
                  {entry.dateOfBirth && (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs" style={{ color: 'var(--c-text-f)' }}>Date of Birth</p>
                        <p className="text-sm mt-0.5" style={{ color: 'var(--c-text)' }}>{entry.dateOfBirth}</p>
                      </div>
                      <CopyButton text={entry.dateOfBirth} label="date of birth" />
                    </div>
                  )}
                  {entry.nationality && (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs" style={{ color: 'var(--c-text-f)' }}>Nationality</p>
                        <p className="text-sm mt-0.5" style={{ color: 'var(--c-text)' }}>{entry.nationality}</p>
                      </div>
                      <CopyButton text={entry.nationality} label="nationality" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {(entry.issuingCountry || entry.issuingAuthority || entry.issueDate || entry.expiryDate) && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={13} color="var(--c-text-m)" />
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-f)' }}>Issuing Details</span>
                </div>
                <div className="space-y-2">
                  {entry.issuingCountry && (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs" style={{ color: 'var(--c-text-f)' }}>Issuing Country</p>
                        <p className="text-sm mt-0.5" style={{ color: 'var(--c-text)' }}>{entry.issuingCountry}</p>
                      </div>
                      <CopyButton text={entry.issuingCountry} label="issuing country" />
                    </div>
                  )}
                  {entry.issuingAuthority && (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs" style={{ color: 'var(--c-text-f)' }}>Issuing Authority</p>
                        <p className="text-sm mt-0.5" style={{ color: 'var(--c-text)' }}>{entry.issuingAuthority}</p>
                      </div>
                      <CopyButton text={entry.issuingAuthority} label="issuing authority" />
                    </div>
                  )}
                  {entry.issueDate && (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs" style={{ color: 'var(--c-text-f)' }}>Issue Date</p>
                        <p className="text-sm mt-0.5" style={{ color: 'var(--c-text)' }}>{entry.issueDate}</p>
                      </div>
                      <CopyButton text={entry.issueDate} label="issue date" />
                    </div>
                  )}
                  {entry.expiryDate && (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs" style={{ color: 'var(--c-text-f)' }}>Expiry Date</p>
                        <p className="text-sm mt-0.5" style={{ color: 'var(--c-text)' }}>{entry.expiryDate}</p>
                      </div>
                      <CopyButton text={entry.expiryDate} label="expiry date" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {entry.address && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Tag size={13} color="var(--c-text-m)" />
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-f)' }}>Address</span>
                  <CopyButton text={entry.address} label="address" />
                </div>
                <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--c-text-s)' }}>{entry.address}</p>
              </div>
            )}
          </>
        )}

        {/* ── Standard fields (non-WiFi, non-Bank, non-Identity) ── */}
        {entry.type !== 'wifi' && entry.type !== 'bank' && entry.type !== 'identity' && (
          <>
            {/* Username */}
            {entry.username && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User size={13} color="var(--c-text-m)" />
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-f)' }}>Username</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm" style={{ color: 'var(--c-text)' }}>{entry.username}</span>
                  <CopyButton text={entry.username} label="username" />
                </div>
              </div>
            )}

            {/* Password */}
            {entry.password && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Key size={13} color="var(--c-text-m)" />
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-f)' }}>Password</span>
                  {strength && (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
                      style={{ background: `${strength.color}15`, color: strength.color }}>
                      {strength.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-sm flex-1 break-all" style={{ color: 'var(--c-text)' }}>
                    {showPassword ? entry.password : '•'.repeat(Math.min(entry.password.length, 20))}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setShowPassword(s => !s)} className="p-1.5 rounded transition-all"
                      style={{ color: 'var(--c-text-m)' }}>
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <CopyButton text={entry.password} label="password" />
                  </div>
                </div>

                {/* Strength bar */}
                {strength && (
                  <div className="mt-3 flex gap-1">
                    {[0,1,2,3,4].map(i => (
                      <div key={i} className="flex-1 h-1 rounded-full"
                        style={{ background: i <= strength.score ? strength.color : 'var(--c-strength-empty)' }} />
                    ))}
                  </div>
                )}

                {/* Breach check */}
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={handleBreachCheck} disabled={breachState === 'checking'}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: 'var(--c-hover)', color: 'var(--c-text-s)', border: '1px solid var(--c-border-s)' }}>
                    {breachState === 'checking' ? <Loader2 size={11} className="animate-spin" /> : <Shield size={11} />}
                    Check breach
                  </button>
                  {breachState === 'found' && (
                    <span className="text-xs flex items-center gap-1" style={{ color: '#EF4444' }}>
                      <AlertTriangle size={11} /> Found {breachCount.toLocaleString()} times!
                    </span>
                  )}
                  {breachState === 'safe' && (
                    <span className="text-xs flex items-center gap-1" style={{ color: '#22C55E' }}>
                      <CheckCircle2 size={11} /> Not found in breaches
                    </span>
                  )}
                  {breachState === 'error' && (
                    <span className="text-xs flex items-center gap-1" style={{ color: '#F59E0B' }}>
                      <AlertCircle size={11} /> Network error — try again
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* URL */}
            {entry.url && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe size={13} color="var(--c-text-m)" />
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-f)' }}>Website</span>
                </div>
                <div className="flex items-center justify-between">
                  <a href={entry.url} target="_blank" rel="noopener noreferrer"
                    className="font-mono text-sm truncate flex-1 flex items-center gap-2 hover:underline"
                    style={{ color: '#60A5FA' }}>
                    {entry.url} <ExternalLink size={11} />
                  </a>
                  <CopyButton text={entry.url} label="URL" />
                </div>
              </div>
            )}

            {/* API Key */}
            {entry.apiKey && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Key size={13} color="#4ADE80" />
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: '#4B5563' }}>
                    {entry.apiKeyName || 'API Key'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs break-all flex-1" style={{ color: '#4ADE80' }}>
                    {entry.apiKey.slice(0, 8)}{'•'.repeat(16)}
                  </span>
                  <CopyButton text={entry.apiKey} label="API key" />
                </div>
              </div>
            )}
          </>
        )}

        {/* Notes — shown for all types */}
        {entry.notes && (
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Tag size={13} color="#6B7280" />
              <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: '#4B5563' }}>Notes</span>
              <CopyButton text={entry.notes} label="notes" />
            </div>
            <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--c-text-s)' }}>{entry.notes}</p>
          </div>
        )}

        {/* Password history */}
        {entry.passwordHistory && entry.passwordHistory.length > 0 && (
          <div className="glass-card rounded-xl p-4">
            <button onClick={() => setShowHistory(s => !s)}
              className="flex items-center gap-2 w-full text-left">
              <Clock size={13} color="var(--c-text-m)" />
              <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-f)' }}>
                Password History ({entry.passwordHistory.length})
              </span>
            </button>
            {showHistory && (
              <div className="mt-3 space-y-2 animate-fade-in">
                {entry.passwordHistory.map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg"
                    style={{ background: 'var(--c-input-bg)' }}>
                    <span className="font-mono" style={{ color: 'var(--c-text-m)' }}>
                      {'•'.repeat(Math.min(h.password.length, 12))}
                    </span>
                    <span style={{ color: 'var(--c-text-f)' }}>
                      {new Date(h.changedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="text-xs space-y-1" style={{ color: 'var(--c-text-g)' }}>
          <p>Created: {new Date(entry.createdAt).toLocaleString()}</p>
          <p>Updated: {new Date(entry.updatedAt).toLocaleString()}</p>
        </div>
      </div>

      {editOpen && (
        <EntryModal mode="edit" entry={entry} onClose={() => setEditOpen(false)} />
      )}
    </div>
  );
}

export function VaultList() {
  const {
    entries, searchQuery, setSearch, selectedCategory, setCategory,
    selectedEntryId, setSelectedEntry, activeFilterType, setActiveFilterType,
    sortBy, setSortBy, openAddEntryModal, clearAddEntryModal, settings,
  } = useVaultStore();
  const [addOpen, setAddOpen] = useState(false);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Wire Ctrl+N / external trigger to open the add modal
  useEffect(() => {
    if (openAddEntryModal) {
      setAddOpen(true);
      clearAddEntryModal();
    }
  }, [openAddEntryModal, clearAddEntryModal]);

  const filterType = activeFilterType;
  const setFilterType = setActiveFilterType;

  const filtered = entries.filter(e => {
    const matchCategory = selectedCategory === 'All' || e.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || e.name.toLowerCase().includes(q) ||
      (e.username || '').toLowerCase().includes(q) ||
      (e.url || '').toLowerCase().includes(q) ||
      (e.wifiSsid || '').toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q));
    const matchType = filterType === 'all' || e.type === filterType ||
      (filterType === 'favorite' && e.isFavorite) ||
      (filterType === 'compromised' && e.isCompromised);
    return matchCategory && matchSearch && matchType;
  });

  // Sort filtered entries
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':  return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'newest':    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case 'oldest':    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      case 'strength': {
        const sa = a.password ? checkStrength(a.password).score : -1;
        const sb = b.password ? checkStrength(b.password).score : -1;
        return sb - sa;
      }
      default: return 0;
    }
  });

  const selectedEntry = entries.find(e => e.id === selectedEntryId);

  const FILTER_LABELS: Record<string, string> = {
    all: 'All', login: 'Logins', note: 'Notes', apikey: 'API Keys',
    totp: '2FA', wifi: '📶 WiFi', bank: '🏦 Bank', identity: '🪪 Identity',
    favorite: '⭐ Favorites', compromised: '⚠️ Breached'
  };

  const SORT_OPTIONS: { value: SortOption; label: string; icon: React.ReactNode }[] = [
    { value: 'name-asc',  label: 'A → Z',     icon: <SortAsc size={12} /> },
    { value: 'name-desc', label: 'Z → A',     icon: <SortDesc size={12} /> },
    { value: 'newest',    label: 'Newest',    icon: <Clock size={12} /> },
    { value: 'oldest',    label: 'Oldest',    icon: <Clock size={12} /> },
    { value: 'strength',  label: 'Strength',  icon: <Shield size={12} /> },
  ];

  return (
    <div className="h-full flex animate-fade-in">
      {/* Left: List — hidden on mobile when detail is visible */}
      <div
        className={`vault-list-panel flex-col border-r ${mobileShowDetail ? 'hidden md:flex' : 'flex'} w-full md:w-80 md:flex-shrink-0`}
        style={{ borderColor: 'var(--c-border-m)' }}
      >
        {/* Search + Add */}
        <div className="p-4 space-y-3 border-b" style={{ borderColor: 'var(--c-border-m)' }}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-f)' }} />
              <input
                value={searchQuery}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search vault… (Ctrl+F)"
                className="input-field pl-9 py-2.5 text-sm"
              />
            </div>
            <button onClick={() => setAddOpen(true)} className="btn-primary px-3 py-2.5 flex-shrink-0" title="New entry (Ctrl+N)">
              <Plus size={16} />
            </button>
          </div>

          {/* Filter pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {['all', 'login', 'note', 'totp', 'apikey', 'wifi', 'bank', 'identity', 'favorite', 'compromised'].map(f => (
              <button key={f} onClick={() => setFilterType(f)}
                className="px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-all"
                style={{
                  background: filterType === f ? 'var(--c-accent-bgm)' : 'var(--c-hover)',
                  color: filterType === f ? 'var(--c-accent)' : 'var(--c-text-m)',
                  border: `1px solid ${filterType === f ? 'var(--c-accent-bd)' : 'var(--c-border-s)'}`,
                }}>
                {FILTER_LABELS[f] ?? f}
              </button>
            ))}
          </div>

          {/* Sort + category row */}
          <div className="flex items-center gap-2">
            <ArrowUpDown size={11} color="var(--c-text-f)" />
            <div className="flex gap-1 flex-wrap">
              {SORT_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setSortBy(opt.value)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all"
                  style={{
                    background: sortBy === opt.value ? 'var(--c-accent-bg)' : 'transparent',
                    color: sortBy === opt.value ? 'var(--c-accent)' : 'var(--c-text-f)',
                    border: `1px solid ${sortBy === opt.value ? 'var(--c-accent-bd)' : 'transparent'}`,                  }}>
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
            {selectedCategory !== 'All' && (
              <button onClick={() => setCategory('All')} className="ml-auto text-xs flex-shrink-0"
                style={{ color: 'var(--c-accent)' }}>Clear</button>
            )}
          </div>
          {selectedCategory !== 'All' && (
            <div className="flex items-center gap-2 -mt-1">
              <Filter size={12} color="var(--c-text-m)" />
              <span className="text-xs" style={{ color: 'var(--c-text-m)' }}>Showing: {selectedCategory}</span>
            </div>
          )}
        </div>

        {/* Entry list */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {sorted.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Key size={32} color="var(--c-border)" className="mx-auto mb-3" />
              <p className="text-sm font-medium" style={{ color: 'var(--c-text-f)' }}>
                {searchQuery ? 'No results found' : 'No entries here yet'}
              </p>
              {!searchQuery && (
                <button onClick={() => setAddOpen(true)} className="btn-primary text-xs mt-3 px-3 py-1.5">
                  <Plus size={12} /> Add entry
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {sorted.map(entry => {
                const quickCopyText = entry.type === 'wifi' ? (entry.wifiSsid || '') : (entry.username || '');
                return (
                  <div
                    key={entry.id}
                    onClick={() => { setSelectedEntry(entry.id); setMobileShowDetail(true); }}
                    className={`entry-row group ${selectedEntryId === entry.id ? 'active' : ''}`}
                  >
                    <EntryIcon entry={entry} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--c-text)' }}>{entry.name}</p>
                        {entry.isFavorite && <Star size={10} color="#F0B429" fill="#F0B429" />}
                        {entry.isCompromised && <AlertTriangle size={10} color="#EF4444" />}
                      </div>
                      <p className="text-xs truncate" style={{ color: 'var(--c-text-f)' }}>
                        {entry.type === 'wifi'
                          ? (entry.wifiSsid || entry.username || 'WiFi')
                          : (entry.username || entry.url || entry.type)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--c-text-g)' }}>{formatAge(entry.updatedAt)}</p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-center gap-1">
                      {/* Quick copy for username / SSID — visible on hover */}
                      {quickCopyText && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            copyToClipboard(quickCopyText, settings.clipboardClearSeconds * 1000);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                          style={{ color: 'var(--c-text-m)' }}
                          title={`Copy ${entry.type === 'wifi' ? 'SSID' : 'username'}`}>
                          <Copy size={11} />
                        </button>
                      )}
                      {entry.password && (
                        <div className="w-1.5 h-1.5 rounded-full"
                          style={{ background: checkStrength(entry.password).color }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t text-xs" style={{ borderColor: 'var(--c-border-m)', color: 'var(--c-text-g)' }}>
          {sorted.length} of {entries.length} entries
        </div>
      </div>

      {/* Right: Detail panel — shown on desktop always, on mobile only when mobileShowDetail */}
      <div
        className={`flex-1 overflow-hidden flex-col ${mobileShowDetail ? 'flex' : 'hidden md:flex'}`}
        style={{ background: 'var(--c-active-bg)' }}
      >
        {/* Mobile back button */}
        <button
          onClick={() => setMobileShowDetail(false)}
          className="md:hidden flex items-center gap-2 px-4 py-3 text-sm font-medium border-b"
          style={{ color: 'var(--c-accent)', borderColor: 'var(--c-border-m)' }}
        >
          <ArrowLeft size={16} /> Back to vault
        </button>
        {selectedEntry ? (
          <EntryDetail entry={selectedEntry} />
        ) : entries.length === 0 ? (
          /* First-run onboarding card */
          <div className="h-full flex items-center justify-center p-8">
            <div className="w-full max-w-md glass-card rounded-2xl p-8 animate-fade-in">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                  style={{ background: 'var(--c-accent-bg)', border: '1px solid var(--c-accent-bd)' }}>
                  <Shield size={26} color="var(--c-accent)" />
                </div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--c-text)' }}>Your vault is empty</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--c-text-m)' }}>Get started in 3 easy steps</p>
              </div>
              <div className="space-y-4 mb-6">
                {[
                  { step: '1', icon: <Plus size={16} />, title: 'Add your first entry', desc: 'Click the + button or press Ctrl+N to add a login, note, or API key.' },
                  { step: '2', icon: <Key size={16} />, title: 'Generate strong passwords', desc: 'Use the Password Generator to create unique, high-entropy passwords for every account.' },
                  { step: '3', icon: <Shield size={16} />, title: 'Stay protected', desc: 'LockBox auto-locks after inactivity and checks passwords against known breach databases.' },
                ].map(item => (
                  <div key={item.step} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: 'var(--c-accent-bgm)', color: 'var(--c-accent)', border: '1px solid var(--c-accent-bd)' }}>
                      {item.step}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>{item.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-m)' }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setAddOpen(true)} className="btn-primary w-full">
                <Plus size={16} /> Add Your First Entry
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4"
            style={{ color: 'var(--c-text-g)' }}>
            {entries.length === 0 ? (
              // First run onboarding card
              <div className="max-w-sm rounded-2xl p-8 glass-card animate-slide-up">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'rgba(240,180,41,0.1)', border: '1px solid rgba(240,180,41,0.2)' }}>
                  <Shield size={32} color="#F0B429" />
                </div>
                  <h3 className="text-xl font-bold text-center mb-2" style={{ color: 'var(--c-text)' }}>Your vault is empty</h3>
                <p className="text-sm text-center mb-6" style={{ color: 'var(--c-text-s)' }}>
                  Let's secure your first credential.
                </p>
                <div className="space-y-3 mb-8">
                  {[
                    'Click "Add new entry" below',
                    'Generate a strong random password',
                    'Save your login safely'
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm" style={{ color: 'var(--c-text-s)' }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: 'var(--c-hover)', color: 'var(--c-text-s)' }}>{i + 1}</div>
                      {step}
                    </div>
                  ))}
                </div>
                <button onClick={() => setAddOpen(true)} className="btn-primary w-full py-3">
                  <Plus size={16} /> Add First Entry
                </button>
              </div>
            ) : (
              // Normal empty state
              <>
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--c-hover)', border: '1px solid var(--c-border-m)' }}>
                  <Key size={36} color="var(--c-border)" />
                </div>
                <div className="text-center">
                  <p className="font-semibold" style={{ color: 'var(--c-text-g)' }}>Select an entry</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--c-text-g)' }}>
                    Choose an item from the list or add a new one
                  </p>
                </div>
                <button onClick={() => setAddOpen(true)} className="btn-primary text-sm">
                  <Plus size={15} /> Add new entry
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {addOpen && <EntryModal mode="add" onClose={() => setAddOpen(false)} />}
    </div>
  );
}
