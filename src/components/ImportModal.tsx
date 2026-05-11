import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Upload, CheckCircle2, AlertTriangle, Info, ChevronRight,
  FileText, Download
} from 'lucide-react';
import { useVaultStore } from '../store/vaultStore';
import { detectImportFormat, type ImportFormat } from '../utils/importParsers';
import { decryptImport } from '../utils/crypto';

interface ImportModalProps {
  onClose: () => void;
}

const FORMAT_INFO: Record<ImportFormat, { label: string; ext: string; description: string }> = {
  'lockbox':        { label: 'LockBox',      ext: '.json',     description: 'Native LockBox export (plain or encrypted)' },
  'bitwarden-json': { label: 'Bitwarden',    ext: '.json',     description: 'Bitwarden unencrypted JSON export' },
  'lastpass-csv':   { label: 'LastPass',     ext: '.csv',      description: 'LastPass CSV export' },
  '1password-csv':  { label: '1Password',    ext: '.csv',      description: '1Password .1pux or CSV export' },
  'chrome-csv':     { label: 'Chrome / Edge',ext: '.csv',      description: 'Exported from Chrome or Edge password manager' },
  'dashlane-csv':   { label: 'Dashlane',     ext: '.csv',      description: 'Dashlane CSV export' },
  'keepass-csv':    { label: 'KeePass',      ext: '.csv',      description: 'KeePass CSV export' },
  'generic-csv':    { label: 'Generic CSV',  ext: '.csv',      description: 'Any CSV with name/url/username/password columns' },
};

export function ImportModal({ onClose }: ImportModalProps) {
  const { importVault, importExternal } = useVaultStore();

  const [step, setStep] = useState<'select' | 'preview' | 'done'>('select');
  const [selectedFormat, setSelectedFormat] = useState<ImportFormat | 'auto'>('auto');
  const [importPass, setImportPass] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [detectedFormat, setDetectedFormat] = useState<ImportFormat | null>(null);
  const [previewCount, setPreviewCount] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      let text = await file.text();
      setFileName(file.name);

      // Detect format
      const detected = selectedFormat === 'auto'
        ? detectImportFormat(text, file.name)
        : selectedFormat as ImportFormat;
      setDetectedFormat(detected);

      // Check for encrypted LockBox export
      try {
        const probe = JSON.parse(text);
        if (probe?.format === 'lockbox-encrypted-export-v1') {
          if (!importPass) {
            setError('This is an encrypted export. Enter the passphrase below first, then re-select the file.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
          }
          text = await decryptImport(text, importPass);
        }
      } catch {
        // Not JSON or not encrypted — continue
      }

      setFileContent(text);

      // Quick preview: count entries
      if (detected === 'lockbox') {
        try {
          const parsed = JSON.parse(text);
          const count = Array.isArray(parsed) ? parsed.length : (parsed.entries?.length ?? 0);
          setPreviewCount(count);
        } catch { setPreviewCount(0); }
      } else {
        // Rough line count for CSV
        const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#'));
        setPreviewCount(Math.max(0, lines.length - 1)); // minus header
      }

      setStep('preview');
    } catch (err) {
      setError(`Failed to read file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = async () => {
    if (!fileContent || !detectedFormat) return;
    setIsLoading(true);
    setError('');
    try {
      if (detectedFormat === 'lockbox') {
        await importVault(fileContent);
        const parsed = JSON.parse(fileContent);
        setImportedCount(Array.isArray(parsed) ? parsed.length : (parsed.entries?.length ?? 0));
      } else {
        const result = await importExternal(fileContent, fileName);
        setImportedCount(result.count);
      }
      setStep('done');
    } catch (err) {
      setError(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full md:max-w-lg glass-card rounded-t-2xl md:rounded-2xl animate-slide-up overflow-hidden"
        style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b"
          style={{ borderColor: 'var(--c-border)' }}>
          <div className="flex items-center gap-2.5">
            <Upload size={18} color="var(--c-accent)" />
            <h2 className="font-bold text-lg" style={{ color: 'var(--c-text)' }}>Import Passwords</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-all"
            style={{ color: 'var(--c-text-m)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">

          {/* ── Step: done ── */}
          {step === 'done' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'rgba(34,197,94,0.15)' }}>
                <CheckCircle2 size={32} color="#22C55E" />
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: 'var(--c-text)' }}>Import Complete</p>
                <p className="text-sm mt-1" style={{ color: 'var(--c-text-m)' }}>
                  {importedCount} {importedCount === 1 ? 'entry' : 'entries'} added to your vault
                </p>
              </div>
              <button onClick={onClose} className="btn-primary mx-auto">
                Done
              </button>
            </div>
          )}

          {/* ── Step: preview / confirm ── */}
          {step === 'preview' && (
            <>
              <div className="flex items-start gap-3 p-4 rounded-xl"
                style={{ background: 'var(--c-accent-bg)', border: '1px solid var(--c-accent-bd)' }}>
                <FileText size={16} color="var(--c-accent)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>{fileName}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-m)' }}>
                    Detected format: <strong style={{ color: 'var(--c-accent)' }}>
                      {FORMAT_INFO[detectedFormat!]?.label ?? detectedFormat}
                    </strong>
                    {' · '}~{previewCount} {previewCount === 1 ? 'entry' : 'entries'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 px-3 py-3 rounded-lg text-xs"
                style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', color: '#D97706' }}>
                <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                <p>Imported entries will be added to your existing vault. Duplicates are not automatically detected. Review after import.</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <AlertTriangle size={13} /> {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep('select')} className="btn-ghost flex-1">Back</button>
                <button onClick={handleImport} disabled={isLoading} className="btn-primary flex-1">
                  <Upload size={14} />
                  {isLoading ? 'Importing…' : `Import ${previewCount} entries`}
                </button>
              </div>
            </>
          )}

          {/* ── Step: select ── */}
          {step === 'select' && (
            <>
              {/* Format selector */}
              <div>
                <label className="label-text">Source Format</label>
                <select
                  value={selectedFormat}
                  onChange={e => setSelectedFormat(e.target.value as ImportFormat | 'auto')}
                  className="input-field mt-1.5">
                  <option value="auto">Auto-detect</option>
                  {(Object.keys(FORMAT_INFO) as ImportFormat[]).map(f => (
                    <option key={f} value={f}>{FORMAT_INFO[f].label}</option>
                  ))}
                </select>
                {selectedFormat !== 'auto' && (
                  <p className="text-xs mt-1.5" style={{ color: 'var(--c-text-f)' }}>
                    {FORMAT_INFO[selectedFormat as ImportFormat]?.description}
                  </p>
                )}
              </div>

              {/* How to export instructions */}
              <div className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--c-border-m)' }}>
                <div className="px-4 py-3 flex items-center gap-2"
                  style={{ background: 'var(--c-hover)' }}>
                  <Info size={13} color="var(--c-text-m)" />
                  <p className="text-xs font-medium" style={{ color: 'var(--c-text-m)' }}>How to export from popular managers</p>
                </div>
                <div className="px-4 py-3 space-y-1.5 text-xs" style={{ color: 'var(--c-text-f)' }}>
                  {[
                    ['LastPass', 'Account → Advanced → Export'],
                    ['Bitwarden', 'Tools → Export Vault → Format: JSON (unencrypted)'],
                    ['1Password', 'File → Export → CSV or 1PUX'],
                    ['Chrome / Edge', 'Settings → Passwords → ⋮ → Export passwords'],
                    ['Dashlane', 'Settings → Export data → CSV'],
                    ['KeePass', 'File → Export → CSV'],
                  ].map(([mgr, path]) => (
                    <div key={mgr} className="flex items-start gap-2">
                      <ChevronRight size={11} style={{ marginTop: 2, flexShrink: 0, color: 'var(--c-accent)' }} />
                      <span><strong style={{ color: 'var(--c-text-s)' }}>{mgr}:</strong> {path}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Passphrase for encrypted LockBox exports */}
              <div>
                <label className="label-text">Passphrase (encrypted LockBox exports only)</label>
                <input value={importPass} onChange={e => setImportPass(e.target.value)}
                  type="password" className="input-field mt-1.5 text-sm"
                  placeholder="Leave blank for plain exports" />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <AlertTriangle size={13} /> {error}
                </div>
              )}

              <button onClick={() => fileInputRef.current?.click()}
                className="btn-primary w-full">
                <Download size={14} /> Choose File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                className="hidden"
                onChange={handleFileSelect}
              />

              <div className="flex items-start gap-2 text-xs px-3 py-3 rounded-lg"
                style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', color: '#D97706' }}>
                <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                <p>Your import file is read locally and never uploaded anywhere. It is parsed entirely in your browser.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
