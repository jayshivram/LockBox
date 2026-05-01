import { useState, useRef } from 'react';
import {
  Settings2, Download, Upload, Trash2, Shield, Clock, Clipboard,
  AlertTriangle, CheckCircle2, Lock, Info, KeyRound, Eye, EyeOff,
  HelpCircle, RefreshCw, FileKey, Sun, Fingerprint, ShieldAlert
} from 'lucide-react';
import { useVaultStore } from '../store/vaultStore';
import { deleteVault, encryptExport, decryptImport } from '../utils/crypto';
import { checkStrength } from '../utils/strength';
import { isNative, checkBiometric, isBiometricAvailable } from '../utils/capacitor';

export function Settings() {
  const {
    settings, updateSettings, exportVault, importVault, lock, entries,
    changeMasterPassword, updateHint, vaultMeta, unlockedViaRecovery, error: storeError, clearError, isLoading,
  } = useVaultStore();

  const [exportMsg, setExportMsg]   = useState('');
  const [importMsg, setImportMsg]   = useState('');
  const [pwError, setPwError]       = useState('');
  const [pwSuccess, setPwSuccess]   = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Change password form
  const [oldPw, setOldPw]       = useState('');
  const [newPw, setNewPw]       = useState('');
  const [cfmPw, setCfmPw]       = useState('');
  const [showOld, setShowOld]   = useState(false);
  const [showNew, setShowNew]   = useState(false);
  const newStrength = checkStrength(newPw);

  // Hint form
  const [hintVal, setHintVal]     = useState(vaultMeta?.hint || '');
  const [hintSaved, setHintSaved] = useState(false);

  // Export passphrase
  const [exportMode, setExportMode] = useState<'plain' | 'encrypted'>('plain');
  const [exportPass, setExportPass] = useState('');

  // Import passphrase (for encrypted exports)
  const [importPass, setImportPass] = useState('');

  // Mobile security
  const [biometricMsg, setBiometricMsg] = useState('');
  const [biometricError, setBiometricError] = useState('');

  const handleExport = async () => {
    const data = exportVault(false);
    let content: string;
    let filename: string;
    if (exportMode === 'encrypted' && exportPass) {
      content = await encryptExport(data, exportPass);
      filename = `lockbox-encrypted-${new Date().toISOString().slice(0, 10)}.json`;
    } else {
      content = data;
      filename = `lockbox-export-${new Date().toISOString().slice(0, 10)}.json`;
    }

    if (isNative()) {
      // On Android, write to a temp file then trigger the OS share sheet
      try {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');
        await Filesystem.writeFile({ path: filename, data: content, directory: Directory.Cache, encoding: 'utf8' as never });
        const uri = await Filesystem.getUri({ directory: Directory.Cache, path: filename });
        await Share.share({ title: 'LockBox Backup', url: uri.uri, dialogTitle: 'Save or share vault backup' });
      } catch {
        setExportMsg('Export failed. Please try again.');
        setTimeout(() => setExportMsg(''), 4000);
        return;
      }
    } else {
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    }
    setExportMsg(`Exported ${entries.length} entries${exportMode === 'encrypted' ? ' (encrypted)' : ' — keep safe!'}`);
    setTimeout(() => setExportMsg(''), 4000);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      let text = await file.text();
      // Detect encrypted export and decrypt before importing
      try {
        const probe = JSON.parse(text);
        if (probe?.format === 'lockbox-encrypted-export-v1') {
          if (!importPass) {
            setImportMsg('Import failed — enter the passphrase for this encrypted export first');
            setTimeout(() => setImportMsg(''), 5000);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
          }
          text = await decryptImport(text, importPass);
        }
      } catch {
        // Not JSON or already plain — importVault will validate
      }
      await importVault(text);
      setImportMsg('Import successful!');
      setImportPass('');
    } catch (err) {
      setImportMsg(`Import failed — ${err instanceof Error ? err.message : 'invalid file'}`);
    }
    setTimeout(() => setImportMsg(''), 5000);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteVault = () => {
    if (confirm('⚠️ This will permanently delete your entire vault. This CANNOT be undone.\n\nType "DELETE" to confirm.')) {
      const input = prompt('Type DELETE to confirm:');
      if (input === 'DELETE') { deleteVault(); lock(); window.location.reload(); }
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setPwError(''); setPwSuccess('');
    if (newPw !== cfmPw) { setPwError('New passwords do not match'); return; }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters'); return; }
    if (newStrength.score < 1) { setPwError('New password is too weak'); return; }
    await changeMasterPassword(oldPw, newPw);
    // Read fresh store state — not stale closure values
    if (!useVaultStore.getState().error) {
      setPwSuccess('Master password changed successfully!');
      setOldPw(''); setNewPw(''); setCfmPw('');
      setTimeout(() => setPwSuccess(''), 4000);
    }
  };

  const handleSaveHint = async () => {
    await updateHint(hintVal);
    setHintSaved(true);
    setTimeout(() => setHintSaved(false), 2000);
  };

  const SettingRow = ({ icon: Icon, label, description, children }: {
    icon: typeof Shield; label: string; description?: string; children: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between gap-4 py-4 border-b"
      style={{ borderColor: 'var(--c-border-m)' }}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5"><Icon size={16} color="var(--c-text-m)" /></div>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--c-text)' }}>{label}</p>
          {description && <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-f)' }}>{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-6 animate-fade-in">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--c-text)' }}>Settings</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--c-text-m)' }}>Configure LockBox to your preferences</p>
        </div>

        {/* Recovery key unlocked warning */}
        {unlockedViaRecovery && (
          <div className="flex items-start gap-3 p-4 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <AlertTriangle size={16} color="#EF4444" style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#EF4444' }}>You unlocked via Recovery Key</p>
              <p className="text-xs mt-0.5" style={{ color: '#F87171' }}>
                Please set a new master password below to restore normal access to your vault.
              </p>
            </div>
          </div>
        )}

        {/* Appearance */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Sun size={16} color="#F0B429" />
            <h2 className="font-semibold" style={{ color: 'var(--c-text)' }}>Appearance</h2>
          </div>
          <SettingRow icon={Sun} label="Theme" description="Choose between dark and light mode">
            <div className="flex gap-2">
              {(['dark', 'light'] as const).map(t => (
                <button key={t} onClick={() => updateSettings({ theme: t })}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: settings.theme === t ? 'var(--c-accent-bgm)' : 'var(--c-hover)',
                    color: settings.theme === t ? 'var(--c-accent)' : 'var(--c-text-s)',
                    border: `1px solid ${settings.theme === t ? 'var(--c-accent-bd)' : 'var(--c-border-m)'}`,
                  }}>
                  {t === 'dark' ? '🌙 Dark' : '☀️ Light'}
                </button>
              ))}
            </div>
          </SettingRow>
        </div>

        {/* Security Settings */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Shield size={16} color="#F0B429" />
            <h2 className="font-semibold" style={{ color: 'var(--c-text)' }}>Security</h2>
          </div>

          <SettingRow icon={Clock} label="Auto-Lock" description="Lock vault after period of inactivity">
            <select value={settings.autoLockMinutes}
              onChange={e => updateSettings({ autoLockMinutes: +e.target.value })}
              className="input-field w-40 py-2 text-sm">
              <option value={0}>Never</option>
              <option value={1}>1 minute</option>
              <option value={5}>5 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
            </select>
          </SettingRow>

          <SettingRow icon={Clipboard} label="Clipboard Clear" description="Auto-clear clipboard after copying">
            <select value={settings.clipboardClearSeconds}
              onChange={e => updateSettings({ clipboardClearSeconds: +e.target.value })}
              className="input-field w-40 py-2 text-sm">
              <option value={10}>10 seconds</option>
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={0}>Never</option>
            </select>
          </SettingRow>

          <SettingRow icon={Lock} label="Lock Now" description="Immediately lock the vault">
            <button onClick={lock} className="btn-ghost text-sm">
              <Lock size={14} /> Lock Vault
            </button>
          </SettingRow>
        </div>

        {/* Change Master Password */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <RefreshCw size={16} color="#F0B429" />
            <h2 className="font-semibold" style={{ color: 'var(--c-text)' }}>Master Password</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {!unlockedViaRecovery && (
              <div>
                <label className="label-text">Current Password</label>
                <div className="relative mt-1.5">
                  <input type={showOld ? 'text' : 'password'} value={oldPw}
                    onChange={e => setOldPw(e.target.value)}
                    className="input-field pr-10 font-mono" placeholder="Current master password" />
                  <button type="button" onClick={() => setShowOld(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-m)' }}>
                    {showOld ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="label-text">New Password</label>
              <div className="relative mt-1.5">
                <input type={showNew ? 'text' : 'password'} value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  className="input-field pr-10 font-mono" placeholder="New master password (≥8 chars)" />
                <button type="button" onClick={() => setShowNew(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-m)' }}>
                  {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {newPw && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex gap-1 flex-1">
                    {[0,1,2,3,4].map(i => (
                      <div key={i} className="h-1 flex-1 rounded-full"
                        style={{ background: i <= newStrength.score ? newStrength.color : 'var(--c-strength-empty)' }} />
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: newStrength.color }}>{newStrength.label}</span>
                </div>
              )}
            </div>

            <div>
              <label className="label-text">Confirm New Password</label>
              <input type="password" value={cfmPw} onChange={e => setCfmPw(e.target.value)}
                className="input-field mt-1.5 font-mono" placeholder="Repeat new password" />
            </div>

            {(pwError || storeError) && (
              <div className="text-sm px-3 py-2 rounded-lg flex items-center gap-2"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                <AlertTriangle size={13} /> {pwError || storeError}
              </div>
            )}
            {pwSuccess && (
              <div className="text-sm px-3 py-2 rounded-lg flex items-center gap-2"
                style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.25)' }}>
                <CheckCircle2 size={13} /> {pwSuccess}
              </div>
            )}

            <button type="submit"
              disabled={isLoading || (!unlockedViaRecovery && !oldPw) || !newPw || !cfmPw}
              className="btn-primary text-sm">
              <RefreshCw size={14} /> Change Master Password
            </button>
          </form>
        </div>

        {/* Password Hint */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle size={16} color="#F0B429" />
            <h2 className="font-semibold" style={{ color: 'var(--c-text)' }}>Password Hint</h2>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--c-text-f)' }}>
            Shown on the lock screen to jog your memory. Never put your actual password here.
          </p>
          <div className="flex gap-2">
            <input value={hintVal} onChange={e => setHintVal(e.target.value)}
              maxLength={120} className="input-field flex-1 text-sm"
              placeholder="E.g. the city where I was born + year" />
            <button onClick={handleSaveHint}
              className="btn-ghost text-sm whitespace-nowrap flex-shrink-0"
              style={hintSaved ? { color: '#22C55E' } : {}}>
              {hintSaved ? <><CheckCircle2 size={14} /> Saved</> : 'Save'}
            </button>
          </div>
        </div>

        {/* Recovery Key */}
        {vaultMeta && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound size={16} color="#F0B429" />
              <h2 className="font-semibold" style={{ color: 'var(--c-text)' }}>Recovery Key</h2>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl mb-4"
              style={{ background: 'var(--c-accent-bg)', border: '1px solid var(--c-accent-bd)' }}>
              <Info size={14} color="#F0B429" style={{ marginTop: 2, flexShrink: 0 }} />
              <p className="text-xs" style={{ color: 'var(--c-text-s)' }}>
                Your vault was created with a Recovery Key. If you need to regenerate a new one, change your master password — a new Recovery Key will be issued automatically. This is by design so that old recovery keys are invalidated when a new password is set.
              </p>
            </div>
          </div>
        )}

        {/* Encryption Info */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} color="#22C55E" />
            <h2 className="font-semibold" style={{ color: 'var(--c-text)' }}>Encryption Details</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Encryption Algorithm',  value: 'AES-256-GCM' },
              { label: 'Key Derivation',         value: 'PBKDF2-SHA256 (310,000 iterations)' },
              { label: 'Key Architecture',       value: vaultMeta ? 'DEK wrapping (v2) — dual key' : 'Legacy v1 (upgrading…)' },
              { label: 'Recovery Key',           value: vaultMeta ? 'Enabled — 144-bit entropy' : 'Not available (v1 vault)' },
              { label: 'Storage',                value: 'Local device only (localStorage)' },
              { label: 'Vault Items',            value: `${entries.length} encrypted entries` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b"
                style={{ borderColor: 'var(--c-border-m)' }}>
                <span className="text-sm" style={{ color: 'var(--c-text-m)' }}>{label}</span>
                <span className="text-sm font-mono" style={{ color: 'var(--c-text-s)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Import / Export */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Download size={16} color="#F0B429" />
            <h2 className="font-semibold" style={{ color: 'var(--c-text)' }}>Import / Export</h2>
          </div>

          <div className="space-y-4">
            {/* Export options */}
            <div className="p-4 rounded-xl" style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-border-m)' }}>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--c-text)' }}>Export Vault</p>
              <div className="flex gap-3 mb-3">
                {(['plain', 'encrypted'] as const).map(m => (
                  <button key={m} onClick={() => setExportMode(m)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: exportMode === m ? 'var(--c-accent-bgm)' : 'var(--c-hover)',
                      color: exportMode === m ? 'var(--c-accent)' : 'var(--c-text-m)',
                      border: `1px solid ${exportMode === m ? 'var(--c-accent-bd)' : 'var(--c-border-s)'}`,                    }}>
                    {m === 'plain' ? '📄 Plain JSON' : '🔒 Encrypted JSON'}
                  </button>
                ))}
              </div>
              {exportMode === 'encrypted' && (
                <input value={exportPass} onChange={e => setExportPass(e.target.value)}
                  type="password" className="input-field text-sm mb-3"
                  placeholder="Passphrase to encrypt the exported file" />
              )}
              <button onClick={handleExport}
                disabled={exportMode === 'encrypted' && !exportPass}
                className="btn-ghost text-sm">
                <Download size={14} /> Export
              </button>
            </div>

            {/* Import */}
            <div className="p-4 rounded-xl" style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-border-m)' }}>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--c-text)' }}>Import Entries</p>
              <p className="text-xs mb-3" style={{ color: 'var(--c-text-f)' }}>
                LockBox JSON or encrypted export · Max 5 MB
              </p>
              <input value={importPass} onChange={e => setImportPass(e.target.value)}
                type="password" className="input-field text-sm mb-3"
                placeholder="Passphrase (only needed for encrypted exports)" />
              <button onClick={() => fileInputRef.current?.click()} className="btn-ghost text-sm">
                <Upload size={14} /> Choose File &amp; Import
              </button>
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            </div>

            {exportMsg && (
              <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg animate-fade-in"
                style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.25)' }}>
                <CheckCircle2 size={14} /> {exportMsg}
              </div>
            )}
            {importMsg && (
              <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg animate-fade-in"
                style={{
                  background: importMsg.includes('failed') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                  color: importMsg.includes('failed') ? '#EF4444' : '#22C55E',
                  border: `1px solid ${importMsg.includes('failed') ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`,
                }}>
                {importMsg.includes('failed') ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                {importMsg}
              </div>
            )}

            <div className="flex items-start gap-2 text-xs px-3 py-3 rounded-lg"
              style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', color: '#D97706' }}>
              <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <p>Plain JSON exports are unencrypted. Use the encrypted option or keep the file offline and secure. Password history is excluded from exports by default.</p>
            </div>
          </div>
        </div>

        {/* Mobile Security — native only */}
        {isNative() && (
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert size={16} color="var(--c-accent)" />
              <h2 className="font-semibold" style={{ color: 'var(--c-text)' }}>Mobile Security</h2>
            </div>

            {/* Biometric unlock */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Fingerprint size={18} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--c-text-m)' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--c-text)' }}>Biometric Unlock</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-m)' }}>
                    Use fingerprint or face recognition to access the vault
                  </p>
                  {biometricMsg && (
                    <p className="text-xs mt-1" style={{ color: '#22C55E' }}>{biometricMsg}</p>
                  )}
                  {biometricError && (
                    <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{biometricError}</p>
                  )}
                </div>
              </div>
              <button
                onClick={async () => {
                  setBiometricMsg(''); setBiometricError('');
                  if (settings.biometricEnabled) {
                    updateSettings({ biometricEnabled: false });
                    setBiometricMsg('Biometric disabled.');
                    setTimeout(() => setBiometricMsg(''), 3000);
                  } else {
                    const available = await isBiometricAvailable();
                    if (!available) {
                      setBiometricError('No biometric hardware found or no credentials enrolled.');
                      setTimeout(() => setBiometricError(''), 5000);
                      return;
                    }
                    const ok = await checkBiometric();
                    if (ok) {
                      updateSettings({ biometricEnabled: true });
                      setBiometricMsg('Biometric enabled!');
                      setTimeout(() => setBiometricMsg(''), 3000);
                    } else {
                      setBiometricError('Verification failed. Biometric not enabled.');
                      setTimeout(() => setBiometricError(''), 5000);
                    }
                  }
                }}
                className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all focus:outline-none"
                style={{
                  background: settings.biometricEnabled ? 'var(--c-accent)' : 'var(--c-border)',
                }}
                role="switch"
                aria-checked={settings.biometricEnabled}
              >
                <span
                  className="inline-block h-5 w-5 transform rounded-full shadow transition-transform"
                  style={{
                    background: 'white',
                    transform: settings.biometricEnabled ? 'translateX(20px)' : 'translateX(0)',
                  }}
                />
              </button>
            </div>

            {/* Auto-wipe after N failed attempts */}
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" style={{ color: settings.wipeAfterAttempts > 0 ? '#EF4444' : 'var(--c-text-m)' }} />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--c-text)' }}>Auto-Wipe After Failed Attempts</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-m)' }}>
                  Permanently delete all vault data after this many wrong password attempts
                </p>
                {settings.wipeAfterAttempts > 0 && (
                  <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertTriangle size={12} color="#EF4444" className="mt-0.5 flex-shrink-0" />
                    <p className="text-xs" style={{ color: '#EF4444' }}>
                      Warning: After {settings.wipeAfterAttempts} failed attempts, all vault data will be permanently erased and unrecoverable — even with the recovery key. Export a backup first.
                    </p>
                  </div>
                )}
                <select
                  value={settings.wipeAfterAttempts}
                  onChange={e => updateSettings({ wipeAfterAttempts: Number(e.target.value) })}
                  className="input-field mt-2 text-sm py-2"
                  style={{ maxWidth: 200 }}
                >
                  <option value={0}>Disabled</option>
                  <option value={5}>After 5 attempts</option>
                  <option value={10}>After 10 attempts</option>
                  <option value={15}>After 15 attempts</option>
                  <option value={20}>After 20 attempts</option>
                </select>
              </div>
            </div>

            {/* Privacy screen info row */}
            <div className="flex items-start gap-3">
              <Shield size={18} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--c-text-m)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--c-text)' }}>Privacy Screen</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-m)' }}>
                  Always enabled — blocks screenshots and hides vault content in the app switcher
                </p>
              </div>
              <span className="ml-auto flex-shrink-0 text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}>
                Active
              </span>
            </div>

            {/* Background lock info row */}
            <div className="flex items-start gap-3">
              <Lock size={18} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--c-text-m)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--c-text)' }}>Background Auto-Lock</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-m)' }}>
                  Vault locks immediately when you switch away from the app
                </p>
              </div>
              <span className="ml-auto flex-shrink-0 text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}>
                Active
              </span>
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <div className="rounded-2xl p-6"
          style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} color="#EF4444" />
            <h2 className="font-semibold" style={{ color: '#EF4444' }}>Danger Zone</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
          <p className="text-sm font-medium" style={{ color: 'var(--c-text)' }}>Delete Entire Vault</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-m)' }}>Permanently delete all data. Cannot be undone.</p>
            </div>
            <button onClick={handleDeleteVault} className="btn-danger text-sm flex-shrink-0">
              <Trash2 size={14} /> Delete Vault
            </button>
          </div>
        </div>

        <p className="text-center text-xs" style={{ color: 'var(--c-text-g)' }}>
          LockBox v2.0.0 · AES-256-GCM DEK wrapping · Open Source
        </p>
      </div>

      <style>{``}</style>
    </div>
  );
}
