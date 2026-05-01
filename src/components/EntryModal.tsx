import { useState } from 'react';
import { X, Plus, Zap, Eye, EyeOff, Wifi, CreditCard, Fingerprint } from 'lucide-react';
import { useVaultStore } from '../store/vaultStore';
import { checkStrength } from '../utils/strength';
import { generatePassword } from '../utils/generator';
import type { VaultEntry, Category, EntryType } from '../types';

const CATEGORIES: Category[] = ['Personal', 'Work', 'Finance', 'Crypto', 'Social', 'Servers', 'API Keys', 'Network'];

interface EntryModalProps {
  mode: 'add' | 'edit';
  entry?: VaultEntry;
  onClose: () => void;
}

export function EntryModal({ mode, entry, onClose }: EntryModalProps) {
  const { addEntry, updateEntry } = useVaultStore();
  const [type, setType] = useState<EntryType>(entry?.type || 'login');
  const [name, setName] = useState(entry?.name || '');
  const [username, setUsername] = useState(entry?.username || '');
  const [password, setPassword] = useState(entry?.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [url, setUrl] = useState(entry?.url || '');
  const [notes, setNotes] = useState(entry?.notes || '');
  const [category, setCategory] = useState<Category>(entry?.category || 'Personal');
  const [tags, setTags] = useState(entry?.tags?.join(', ') || '');
  const [apiKey, setApiKey] = useState(entry?.apiKey || '');
  const [apiKeyName, setApiKeyName] = useState(entry?.apiKeyName || '');
  const [totpSecret, setTotpSecret] = useState(entry?.totpSecret || '');
  // WiFi-specific fields
  const [wifiSsid, setWifiSsid] = useState(entry?.wifiSsid || entry?.name || '');
  const [adminPassword, setAdminPassword] = useState(entry?.adminPassword || '');
  // Bank-specific fields
  const [bankName, setBankName] = useState(entry?.bankName || '');
  const [accountType, setAccountType] = useState(entry?.accountType || 'Checking');
  const [accountNumber, setAccountNumber] = useState(entry?.accountNumber || '');
  const [routingNumber, setRoutingNumber] = useState(entry?.routingNumber || '');
  const [iban, setIban] = useState(entry?.iban || '');
  const [swiftBic, setSwiftBic] = useState(entry?.swiftBic || '');
  const [cardNumber, setCardNumber] = useState(entry?.cardNumber || '');
  const [cardExpiry, setCardExpiry] = useState(entry?.cardExpiry || '');
  const [cardCvv, setCardCvv] = useState(entry?.cardCvv || '');
  const [cardholderName, setCardholderName] = useState(entry?.cardholderName || '');
  const [cardPin, setCardPin] = useState(entry?.cardPin || '');
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [showRoutingNumber, setShowRoutingNumber] = useState(false);
  const [showIban, setShowIban] = useState(false);
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [showCardCvv, setShowCardCvv] = useState(false);
  const [showCardPin, setShowCardPin] = useState(false);
  // Identity-specific fields
  const [idType, setIdType] = useState(entry?.idType || 'Passport');
  const [idNumber, setIdNumber] = useState(entry?.idNumber || '');
  const [fullName, setFullName] = useState(entry?.fullName || '');
  const [dateOfBirth, setDateOfBirth] = useState(entry?.dateOfBirth || '');
  const [nationality, setNationality] = useState(entry?.nationality || '');
  const [issuingCountry, setIssuingCountry] = useState(entry?.issuingCountry || '');
  const [issuingAuthority, setIssuingAuthority] = useState(entry?.issuingAuthority || '');
  const [issueDate, setIssueDate] = useState(entry?.issueDate || '');
  const [expiryDate, setExpiryDate] = useState(entry?.expiryDate || '');
  const [address, setAddress] = useState(entry?.address || '');
  const [showIdNumber, setShowIdNumber] = useState(false);
  const [saving, setSaving] = useState(false);

  const strength = password ? checkStrength(password) : null;
  const adminStrength = adminPassword ? checkStrength(adminPassword) : null;

  const handleGenerate = (setter: (val: string) => void) => {
    const pwd = generatePassword({
      length: 20, uppercase: true, lowercase: true, numbers: true, symbols: true, excludeAmbiguous: true
    });
    setter(pwd);
  };

  // Auto-set category when switching type
  const handleTypeChange = (newType: EntryType) => {
    setType(newType);
    if (newType === 'wifi') setCategory('Network');
    else if (newType === 'bank') setCategory('Finance');
    else if (newType === 'identity') setCategory('Personal');
    else if (['Network', 'Finance'].includes(category)) setCategory('Personal');
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
    const entryData = {
      type,
      name: type === 'wifi' ? (wifiSsid.trim() || name.trim()) : name.trim(),
      username,
      password,
      url,
      notes,
      category,
      tags: tagList,
      apiKey,
      apiKeyName,
      totpSecret,
      wifiSsid: type === 'wifi' ? wifiSsid.trim() : undefined,
      adminPassword: type === 'wifi' ? adminPassword : undefined,
      // Bank fields
      bankName: type === 'bank' ? bankName : undefined,
      accountType: type === 'bank' ? accountType : undefined,
      accountNumber: type === 'bank' ? accountNumber : undefined,
      routingNumber: type === 'bank' ? routingNumber : undefined,
      iban: type === 'bank' ? iban : undefined,
      swiftBic: type === 'bank' ? swiftBic : undefined,
      cardNumber: type === 'bank' ? cardNumber : undefined,
      cardExpiry: type === 'bank' ? cardExpiry : undefined,
      cardCvv: type === 'bank' ? cardCvv : undefined,
      cardholderName: type === 'bank' ? cardholderName : undefined,
      cardPin: type === 'bank' ? cardPin : undefined,
      // Identity fields
      idType: type === 'identity' ? idType : undefined,
      idNumber: type === 'identity' ? idNumber : undefined,
      fullName: type === 'identity' ? fullName : undefined,
      dateOfBirth: type === 'identity' ? dateOfBirth : undefined,
      nationality: type === 'identity' ? nationality : undefined,
      issuingCountry: type === 'identity' ? issuingCountry : undefined,
      issuingAuthority: type === 'identity' ? issuingAuthority : undefined,
      issueDate: type === 'identity' ? issueDate : undefined,
      expiryDate: type === 'identity' ? expiryDate : undefined,
      address: type === 'identity' ? address : undefined,
      isFavorite: entry?.isFavorite || false,
      isCompromised: entry?.isCompromised || false,
    };
    if (mode === 'add') await addEntry(entryData);
    else if (entry) await updateEntry(entry.id, entryData);
    setSaving(false);
    onClose();
  };

  const TYPE_LABELS: Record<EntryType, string> = {
    login: 'Login',
    note: 'Note',
    totp: '2FA',
    apikey: 'API Key',
    wifi: 'WiFi',
    bank: 'Bank',
    identity: 'Identity',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full md:max-w-lg glass-card rounded-t-2xl md:rounded-2xl animate-slide-up overflow-hidden"
        style={{ maxHeight: '95dvh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b"
          style={{ borderColor: 'var(--c-border)' }}>
          <h2 className="font-bold text-lg" style={{ color: 'var(--c-text)' }}>
            {mode === 'add' ? 'Add New Entry' : 'Edit Entry'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg transition-all"
            style={{ color: 'var(--c-text-m)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--c-text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--c-text-m)')}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Type selector */}
          <div>
            <label className="label-text">Entry Type</label>
            <div className="grid grid-cols-4 gap-2 mt-1.5">
              {(['login', 'note', 'totp', 'apikey', 'wifi', 'bank', 'identity'] as EntryType[]).map(t => (
                <button key={t} onClick={() => handleTypeChange(t)}
                  className="py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: type === t ? 'var(--c-accent-bgm)' : 'var(--c-hover)',
                    color: type === t ? 'var(--c-accent)' : 'var(--c-text-m)',
                    border: `1px solid ${type === t ? 'var(--c-accent-bd)' : 'var(--c-border-s)'}`,                  }}>
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Name — for WiFi this is a label/nickname */}
          <div>
            <label className="label-text">{type === 'wifi' ? 'Entry Label / Name *' : 'Name *'}</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="input-field mt-1.5"
              placeholder={type === 'wifi' ? 'e.g. Home Router, Office WiFi...' : 'e.g. GitHub, Gmail, AWS...'} />
          </div>

          {/* Category */}
          <div>
            <label className="label-text">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value as Category)}
              className="input-field mt-1.5">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* ── WiFi / Router Fields ── */}
          {type === 'wifi' && (
            <>
              <div>
                <label className="label-text">Network Name (SSID)</label>
                <input value={wifiSsid} onChange={e => setWifiSsid(e.target.value)}
                  className="input-field mt-1.5 font-mono" placeholder="e.g. MyHomeNetwork_5G" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label-text">WiFi Password</label>
                  <button onClick={() => handleGenerate(setPassword)}
                    className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-all"
                    style={{ color: 'var(--c-accent)', background: 'var(--c-accent-bgm)' }}>
                    <Zap size={10} /> Generate
                  </button>
                </div>
                <div className="relative">
                  <input value={password} onChange={e => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    className="input-field font-mono pr-12" placeholder="WiFi password" />
                  <button type="button" onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                    style={{ color: 'var(--c-text-m)' }}>
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {strength && password && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex gap-1 flex-1">
                      {[0,1,2,3,4].map(i => (
                        <div key={i} className="flex-1 h-1 rounded-full transition-all"
          style={{ background: i <= strength.score ? strength.color : 'var(--c-strength-empty)' }} />
                      ))}
                    </div>
                    <span className="text-xs" style={{ color: strength.color }}>{strength.label}</span>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3 px-3 py-2 rounded-lg text-xs"
                style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)', color: '#67E8F9' }}>
                <Wifi size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                <span>Router admin credentials below. These are optional but recommended for network management.</span>
              </div>

              <div>
                <label className="label-text">Router Admin URL</label>
                <input value={url} onChange={e => setUrl(e.target.value)}
                  className="input-field mt-1.5 font-mono text-sm" placeholder="e.g. 192.168.1.1 or http://192.168.0.1" />
              </div>

              <div>
                <label className="label-text">Admin Username</label>
                <input value={username} onChange={e => setUsername(e.target.value)}
                  className="input-field mt-1.5 font-mono" placeholder="e.g. admin" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label-text">Admin Password</label>
                  <button onClick={() => handleGenerate(setAdminPassword)}
                    className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-all"
                    style={{ color: 'var(--c-accent)', background: 'var(--c-accent-bgm)' }}>
                    <Zap size={10} /> Generate
                  </button>
                </div>
                <div className="relative">
                  <input value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
                    type={showAdminPassword ? 'text' : 'password'}
                    className="input-field font-mono pr-12" placeholder="Router admin password" />
                  <button type="button" onClick={() => setShowAdminPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                    style={{ color: 'var(--c-text-m)' }}>
                    {showAdminPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {adminStrength && adminPassword && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex gap-1 flex-1">
                      {[0,1,2,3,4].map(i => (
                        <div key={i} className="flex-1 h-1 rounded-full transition-all"
                          style={{ background: i <= adminStrength.score ? adminStrength.color : 'var(--c-strength-empty)' }} />
                      ))}
                    </div>
                    <span className="text-xs" style={{ color: adminStrength.color }}>{adminStrength.label}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Bank / Financial Fields ── */}
          {type === 'bank' && (
            <>
              <div className="flex items-start gap-3 px-3 py-2 rounded-lg text-xs"
                style={{ background: 'rgba(240,180,41,0.06)', border: '1px solid rgba(240,180,41,0.18)', color: '#FCD34D' }}>
                <CreditCard size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                <span>All financial data is encrypted with AES-256-GCM and never leaves this device.</span>
              </div>

              <div>
                <label className="label-text">Bank / Institution Name</label>
                <input value={bankName} onChange={e => setBankName(e.target.value)}
                  className="input-field mt-1.5" placeholder="e.g. Chase, Barclays, Wells Fargo" />
              </div>

              <div>
                <label className="label-text">Account Type</label>
                <select value={accountType} onChange={e => setAccountType(e.target.value)} className="input-field mt-1.5">
                  {['Checking', 'Savings', 'Credit Card', 'Investment', 'Loan', 'Mortgage', 'Other'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Account Number */}
              <div>
                <label className="label-text">Account Number</label>
                <div className="relative mt-1.5">
                  <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)}
                    type={showAccountNumber ? 'text' : 'password'}
                    className="input-field font-mono pr-12" placeholder="e.g. 000123456789" />
                  <button type="button" onClick={() => setShowAccountNumber(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                    style={{ color: 'var(--c-text-m)' }}>
                    {showAccountNumber ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Routing / Sort Code */}
              <div>
                <label className="label-text">Routing / Sort Code</label>
                <div className="relative mt-1.5">
                  <input value={routingNumber} onChange={e => setRoutingNumber(e.target.value)}
                    type={showRoutingNumber ? 'text' : 'password'}
                    className="input-field font-mono pr-12" placeholder="e.g. 021000021" />
                  <button type="button" onClick={() => setShowRoutingNumber(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                    style={{ color: 'var(--c-text-m)' }}>
                    {showRoutingNumber ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* IBAN */}
              <div>
                <label className="label-text">IBAN</label>
                <div className="relative mt-1.5">
                  <input value={iban} onChange={e => setIban(e.target.value.toUpperCase())}
                    type={showIban ? 'text' : 'password'}
                    className="input-field font-mono pr-12" placeholder="e.g. GB29NWBK60161331926819" />
                  <button type="button" onClick={() => setShowIban(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                    style={{ color: 'var(--c-text-m)' }}>
                    {showIban ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="label-text">SWIFT / BIC</label>
                <input value={swiftBic} onChange={e => setSwiftBic(e.target.value.toUpperCase())}
                  className="input-field mt-1.5 font-mono" placeholder="e.g. CHASUS33" />
              </div>

              {/* Card section */}
              <div className="pt-2 border-t" style={{ borderColor: 'var(--c-border-s)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--c-text-f)' }}>Card Details (optional)</p>

                <div className="space-y-4">
                  <div>
                    <label className="label-text">Cardholder Name</label>
                    <input value={cardholderName} onChange={e => setCardholderName(e.target.value)}
                      className="input-field mt-1.5" placeholder="e.g. JOHN A SMITH" />
                  </div>

                  <div>
                    <label className="label-text">Card Number</label>
                    <div className="relative mt-1.5">
                      <input value={cardNumber} onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 19))}
                        type={showCardNumber ? 'text' : 'password'}
                        className="input-field font-mono pr-12" placeholder="16-digit card number" />
                      <button type="button" onClick={() => setShowCardNumber(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                        style={{ color: 'var(--c-text-m)' }}>
                        {showCardNumber ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="label-text">Expiry (MM/YY)</label>
                      <input value={cardExpiry} onChange={e => setCardExpiry(e.target.value)}
                        className="input-field mt-1.5 font-mono" placeholder="MM/YY" maxLength={5} />
                    </div>
                    <div>
                      <label className="label-text">CVV</label>
                      <div className="relative mt-1.5">
                        <input value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          type={showCardCvv ? 'text' : 'password'}
                          className="input-field font-mono pr-8" placeholder="•••" />
                        <button type="button" onClick={() => setShowCardCvv(s => !s)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                          style={{ color: 'var(--c-text-m)' }}>
                          {showCardCvv ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="label-text">Card PIN</label>
                    <div className="relative mt-1.5">
                      <input value={cardPin} onChange={e => setCardPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        type={showCardPin ? 'text' : 'password'}
                        className="input-field font-mono pr-12" placeholder="4–8 digit PIN" />
                      <button type="button" onClick={() => setShowCardPin(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                        style={{ color: 'var(--c-text-m)' }}>
                        {showCardPin ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Online Banking section */}
              <div className="pt-2 border-t" style={{ borderColor: 'var(--c-border-s)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--c-text-f)' }}>Online Banking (optional)</p>
                <div className="space-y-4">
                  <div>
                    <label className="label-text">Banking URL</label>
                    <input value={url} onChange={e => setUrl(e.target.value)}
                      className="input-field mt-1.5 font-mono text-sm" placeholder="https://bank.example.com" />
                  </div>
                  <div>
                    <label className="label-text">Username / Email</label>
                    <input value={username} onChange={e => setUsername(e.target.value)}
                      className="input-field mt-1.5 font-mono" placeholder="Online banking username" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="label-text">Password</label>
                      <button onClick={() => handleGenerate(setPassword)}
                        className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-all"
                        style={{ color: 'var(--c-accent)', background: 'var(--c-accent-bgm)' }}>
                        <Zap size={10} /> Generate
                      </button>
                    </div>
                    <div className="relative mt-1.5">
                      <input value={password} onChange={e => setPassword(e.target.value)}
                        type={showPassword ? 'text' : 'password'}
                        className="input-field font-mono pr-12" placeholder="Online banking password" />
                      <button type="button" onClick={() => setShowPassword(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                        style={{ color: 'var(--c-text-m)' }}>
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {strength && password && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex gap-1 flex-1">
                          {[0,1,2,3,4].map(i => (
                            <div key={i} className="flex-1 h-1 rounded-full transition-all"
                              style={{ background: i <= strength.score ? strength.color : 'var(--c-strength-empty)' }} />
                          ))}
                        </div>
                        <span className="text-xs" style={{ color: strength.color }}>{strength.label}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Identity / Document Fields ── */}
          {type === 'identity' && (
            <>
              <div className="flex items-start gap-3 px-3 py-2 rounded-lg text-xs"
                style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.18)', color: '#93C5FD' }}>
                <Fingerprint size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                <span>Identity documents are fully encrypted. Sensitive numbers are hidden by default.</span>
              </div>

              <div>
                <label className="label-text">Document Type</label>
                <select value={idType} onChange={e => setIdType(e.target.value)} className="input-field mt-1.5">
                  {['Passport', "Driver's License", 'National ID', 'SSN / Tax ID', 'Residence Permit', 'Birth Certificate', 'Other'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-text">Full Name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)}
                  className="input-field mt-1.5" placeholder="As it appears on the document" />
              </div>

              <div>
                <label className="label-text">Document Number</label>
                <div className="relative mt-1.5">
                  <input value={idNumber} onChange={e => setIdNumber(e.target.value)}
                    type={showIdNumber ? 'text' : 'password'}
                    className="input-field font-mono pr-12" placeholder="e.g. A12345678 or 123-45-6789" />
                  <button type="button" onClick={() => setShowIdNumber(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                    style={{ color: 'var(--c-text-m)' }}>
                    {showIdNumber ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-text">Date of Birth</label>
                  <input value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)}
                    className="input-field mt-1.5" placeholder="YYYY-MM-DD" />
                </div>
                <div>
                  <label className="label-text">Nationality</label>
                  <input value={nationality} onChange={e => setNationality(e.target.value)}
                    className="input-field mt-1.5" placeholder="e.g. British, American" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-text">Issuing Country</label>
                  <input value={issuingCountry} onChange={e => setIssuingCountry(e.target.value)}
                    className="input-field mt-1.5" placeholder="e.g. United Kingdom" />
                </div>
                <div>
                  <label className="label-text">Issuing Authority</label>
                  <input value={issuingAuthority} onChange={e => setIssuingAuthority(e.target.value)}
                    className="input-field mt-1.5" placeholder="e.g. DVLA, HM Passport Office" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-text">Issue Date</label>
                  <input value={issueDate} onChange={e => setIssueDate(e.target.value)}
                    className="input-field mt-1.5" placeholder="YYYY-MM-DD" />
                </div>
                <div>
                  <label className="label-text">Expiry Date</label>
                  <input value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                    className="input-field mt-1.5" placeholder="YYYY-MM-DD" />
                </div>
              </div>

              <div>
                <label className="label-text">Address</label>
                <textarea value={address} onChange={e => setAddress(e.target.value)}
                  className="input-field mt-1.5 text-sm resize-none" rows={3}
                  placeholder="Registered address on document" />
              </div>
            </>
          )}

          {/* ── Login Fields ── */}
          {(type === 'login' || type === 'apikey') && (
            <>
              {type === 'login' && (
                <div>
                  <label className="label-text">Username / Email</label>
                  <input value={username} onChange={e => setUsername(e.target.value)}
                    className="input-field mt-1.5 font-mono" placeholder="user@example.com" />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <label className="label-text">
                    {type === 'apikey' ? 'API Key Name' : 'Password'}
                  </label>
                  {type === 'login' && (
                    <button onClick={() => handleGenerate(setPassword)}
                      className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-all"
                      style={{ color: 'var(--c-accent)', background: 'var(--c-accent-bgm)' }}>
                      <Zap size={10} /> Generate
                    </button>
                  )}
                </div>
                {type === 'apikey' ? (
                  <>
                    <input value={apiKeyName} onChange={e => setApiKeyName(e.target.value)}
                      className="input-field mt-1.5 mb-2" placeholder="e.g. OpenAI API Key" />
                    <input value={apiKey} onChange={e => setApiKey(e.target.value)}
                      className="input-field font-mono text-xs" placeholder="sk-..." />
                  </>
                ) : (
                  <>
                    <div className="relative mt-1.5">
                      <input value={password} onChange={e => setPassword(e.target.value)}
                        type={showPassword ? 'text' : 'password'}
                        className="input-field font-mono pr-12" placeholder="Password" />
                      <button type="button" onClick={() => setShowPassword(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                        style={{ color: 'var(--c-text-m)' }}>
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {strength && password && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex gap-1 flex-1">
                          {[0,1,2,3,4].map(i => (
                            <div key={i} className="flex-1 h-1 rounded-full transition-all"
                              style={{ background: i <= strength.score ? strength.color : 'var(--c-strength-empty)' }} />
                          ))}
                        </div>
                        <span className="text-xs" style={{ color: strength.color }}>{strength.label}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {type === 'login' && (
                <div>
                  <label className="label-text">Website URL</label>
                  <input value={url} onChange={e => setUrl(e.target.value)}
                    className="input-field mt-1.5 font-mono text-sm" placeholder="https://example.com" />
                </div>
              )}
            </>
          )}

          {/* ── TOTP Secret ── */}
          {type === 'totp' && (
            <div>
              <label className="label-text">TOTP Secret Key</label>
              <input value={totpSecret} onChange={e => setTotpSecret(e.target.value.trim().toUpperCase())}
                className="input-field mt-1.5 font-mono text-sm" placeholder="Base32 secret (e.g. JBSWY3DPEHPK3PXP)" />
              <p className="text-xs mt-1" style={{ color: 'var(--c-text-f)' }}>
                Scan the QR code or enter the secret key from your account's 2FA settings.
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="label-text">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              className="input-field mt-1.5 font-mono text-sm resize-none" rows={3}
              placeholder="Additional notes, recovery codes, etc." />
          </div>

          {/* Tags */}
          <div>
            <label className="label-text">Tags</label>
            <input value={tags} onChange={e => setTags(e.target.value)}
              className="input-field mt-1.5 text-sm" placeholder="finance, important, work (comma separated)" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t"
          style={{ borderColor: 'var(--c-border)' }}>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || saving} className="btn-primary">
            <Plus size={15} />
            {saving ? 'Saving...' : mode === 'add' ? 'Add Entry' : 'Save Changes'}
          </button>
        </div>
      </div>

      <style>{``}</style>
    </div>
  );
}
