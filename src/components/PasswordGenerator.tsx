import { useState, useEffect } from 'react';
import { Zap, Copy, Check, RefreshCw, Shield } from 'lucide-react';
import { generatePassword, generatePassphrase } from '../utils/generator';
import { checkStrength } from '../utils/strength';
import { copyToClipboard } from '../utils/crypto';
import { useVaultStore } from '../store/vaultStore';
import type { GeneratorOptions } from '../types';

const DEFAULT_OPTIONS: GeneratorOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: true,
};

export function PasswordGenerator() {
  const { settings } = useVaultStore();
  const [mode, setMode] = useState<'password' | 'passphrase'>('password');
  const [options, setOptions] = useState<GeneratorOptions>(DEFAULT_OPTIONS);
  const [wordCount, setWordCount] = useState(4);
  const [separator, setSeparator] = useState('-');
  const [generated, setGenerated] = useState('');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const strength = generated ? checkStrength(generated) : null;

  const generate = () => {
    const pwd = mode === 'password'
      ? generatePassword(options)
      : generatePassphrase(wordCount, separator);
    setGenerated(pwd);
    setHistory(h => [pwd, ...h.slice(0, 9)]);
    setCopied(false);
  };

  useEffect(() => { generate(); }, []);

  const handleCopy = () => {
    if (!generated) return;
    copyToClipboard(generated, settings.clipboardClearSeconds * 1000);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const opt = (key: keyof GeneratorOptions, val: boolean | number) =>
    setOptions(o => ({ ...o, [key]: val }));

  return (
    <div className="h-full overflow-y-auto p-6 animate-fade-in">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--c-text)' }}>Password Generator</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--c-text-m)' }}>Generate cryptographically secure passwords</p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2">
          {(['password', 'passphrase'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: mode === m ? 'var(--c-accent-bgm)' : 'var(--c-hover)',
                color: mode === m ? 'var(--c-accent)' : 'var(--c-text-m)',
                border: `1px solid ${mode === m ? 'var(--c-accent-bds)' : 'var(--c-border-s)'}`,
              }}>
              {m === 'password' ? '🔐 Password' : '📖 Passphrase'}
            </button>
          ))}
        </div>

        {/* Generated output */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex-1 font-mono text-lg break-all" style={{ color: 'var(--c-accent)', wordBreak: 'break-all' }}>
              {generated || '—'}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={generate} className="p-2.5 rounded-xl transition-all"
              style={{ background: 'var(--c-hover)', color: 'var(--c-text-s)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--c-text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--c-text-s)')}
                title="Regenerate">
                <RefreshCw size={17} />
              </button>
              <button onClick={handleCopy} className="btn-primary px-5 py-2.5 text-sm">
                {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy</>}
              </button>
            </div>
          </div>

          {/* Strength */}
          {strength && generated && (
            <div className="animate-fade-in">
              <div className="flex gap-1 mb-2">
                {[0,1,2,3,4].map(i => (
                  <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-500"
                    style={{ background: i <= strength.score ? strength.color : 'var(--c-strength-empty)' }} />
                ))}
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: strength.color }}>{strength.label}</span>
                <div className="flex items-center gap-2" style={{ color: 'var(--c-text-m)' }}>
                  <Shield size={11} />
                  <span>{strength.entropy} bits entropy · {generated.length} characters</span>
                </div>
              </div>
              {strength.feedback.length > 0 && strength.score < 3 && (
                <div className="mt-2 space-y-1">
                  {strength.feedback.map((f, i) => (
                    <p key={i} className="text-xs" style={{ color: 'var(--c-text-m)' }}>· {f}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Options */}
        {mode === 'password' ? (
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <h3 className="font-semibold text-sm" style={{ color: 'var(--c-text)' }}>Options</h3>

            {/* Length */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm" style={{ color: 'var(--c-text-s)' }}>Length</span>
                <span className="font-mono font-bold text-sm" style={{ color: 'var(--c-accent)' }}>{options.length}</span>
              </div>
              <input type="range" min={8} max={64} value={options.length}
                onChange={e => opt('length', +e.target.value)} className="w-full" />
                <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--c-text-g)' }}>
                <span>8</span><span>64</span>
              </div>
            </div>

            {/* Character toggles */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'uppercase', label: 'Uppercase', example: 'A–Z' },
                { key: 'lowercase', label: 'Lowercase', example: 'a–z' },
                { key: 'numbers', label: 'Numbers', example: '0–9' },
                { key: 'symbols', label: 'Symbols', example: '!@#$%' },
                { key: 'excludeAmbiguous', label: 'No Ambiguous', example: 'No 0, O, l, 1' },
              ].map(({ key, label, example }) => (
                <label key={key}
                  className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: options[key as keyof GeneratorOptions] ? 'var(--c-accent-bg)' : 'var(--c-input-bg)',
                    border: `1px solid ${options[key as keyof GeneratorOptions] ? 'var(--c-accent-bd)' : 'var(--c-border-s)'}`,
                  }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--c-text)' }}>{label}</p>
                    <p className="text-xs" style={{ color: 'var(--c-text-f)' }}>{example}</p>
                  </div>
                  <input type="checkbox"
                    checked={!!options[key as keyof GeneratorOptions]}
                    onChange={e => opt(key as keyof GeneratorOptions, e.target.checked)}
                    className="w-4 h-4" />
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <h3 className="font-semibold text-sm" style={{ color: 'var(--c-text)' }}>Passphrase Options</h3>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm" style={{ color: 'var(--c-text-s)' }}>Word Count</span>
                <span className="font-mono font-bold text-sm" style={{ color: 'var(--c-accent)' }}>{wordCount}</span>
              </div>
              <input type="range" min={3} max={8} value={wordCount}
                onChange={e => setWordCount(+e.target.value)} className="w-full" />
            </div>
            <div>
              <p className="text-sm mb-2" style={{ color: 'var(--c-text-s)' }}>Separator</p>
              <div className="flex gap-2">
                {['-', '_', '.', ' ', '#'].map(s => (
                  <button key={s} onClick={() => setSeparator(s)}
                    className="w-10 h-10 rounded-lg font-mono font-bold text-sm transition-all"
                    style={{
                      background: separator === s ? 'var(--c-accent-bgm)' : 'var(--c-hover)',
                      color: separator === s ? 'var(--c-accent)' : 'var(--c-text-s)',
                      border: `1px solid ${separator === s ? 'var(--c-accent-bd)' : 'var(--c-border-s)'}`,
                    }}>
                    {s === ' ' ? '·' : s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <button onClick={generate}
          className="btn-primary w-full py-3.5 text-base justify-center">
          <Zap size={18} /> Generate New Password
        </button>

        {/* History */}
        {history.length > 1 && (
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--c-text)' }}>Recent (session only)</h3>
            <div className="space-y-2">
              {history.slice(1, 6).map((pwd, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg"
                  style={{ background: 'var(--c-input-bg)' }}>
                  <span className="font-mono text-xs truncate flex-1" style={{ color: 'var(--c-text-m)' }}>{pwd}</span>
                  <button onClick={() => { copyToClipboard(pwd); setCopied(false); }}
                    className="p-1 rounded" style={{ color: 'var(--c-text-f)' }}>
                    <Copy size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
