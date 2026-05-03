import { useState } from 'react';
import { FileText, Plus, Eye, EyeOff, Trash2, Edit3, Save, X, Lock, ArrowLeft } from 'lucide-react';
import { useVaultStore } from '../store/vaultStore';

type MobileView = 'list' | 'detail' | 'add';

export function SecureNotes() {
  const { entries, addEntry, updateEntry, deleteEntry } = useVaultStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showContent, setShowContent] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [mobileView, setMobileView] = useState<MobileView>('list');

  const notes = entries.filter(e => e.type === 'note');

  const handleSelectNote = (id: string) => {
    setSelectedId(id);
    setMobileView('detail');
  };

  const handleShowAdd = () => {
    setShowAdd(true);
    setMobileView('add');
  };

  const handleCancelAdd = () => {
    setShowAdd(false);
    setNewTitle('');
    setNewContent('');
    setMobileView('list');
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    await addEntry({
      type: 'note', name: newTitle.trim(), notes: newContent,
      category: 'Personal', tags: [], isFavorite: false, isCompromised: false,
    });
    setNewTitle(''); setNewContent(''); setShowAdd(false);
    setMobileView('list');
  };

  const startEdit = (id: string, content: string) => {
    setEditingId(id);
    setEditContent(content);
    setShowContent(prev => ({ ...prev, [id]: true }));
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateEntry(editingId, { notes: editContent });
    setEditingId(null);
  };

  const selected = notes.find(n => n.id === selectedId);

  return (
    <div className="h-full flex animate-fade-in">
      {/* List panel — full-width on mobile when active, 280px sidebar on desktop */}
      <div
        className={`${mobileView !== 'list' ? 'hidden md:flex' : 'flex'} flex-col border-r w-full md:w-[280px] md:flex-shrink-0`}
        style={{ borderColor: 'var(--c-border-m)' }}
      >
        <div className="p-4 border-b" style={{ borderColor: 'var(--c-border-m)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold" style={{ color: 'var(--c-text)' }}>Secure Notes</h2>
            <button onClick={handleShowAdd} className="btn-primary text-xs px-3 py-1.5">
              <Plus size={12} />
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--c-text-f)' }}>
            {notes.length} encrypted note{notes.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2">
          {notes.length === 0 ? (
            <div className="text-center py-12 px-4">
              <FileText size={28} color="var(--c-border)" className="mx-auto mb-2" />
              <p className="text-sm" style={{ color: 'var(--c-text-f)' }}>No secure notes yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notes.map(note => (
                <div key={note.id} onClick={() => handleSelectNote(note.id)}
                  className={`px-3 cursor-pointer transition-all border rounded-lg`}
                  style={{
                    minHeight: '64px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '12px',
                    background: selectedId === note.id ? 'var(--c-active-bg)' : 'transparent',
                    borderColor: selectedId === note.id ? 'var(--c-accent-bd)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (selectedId !== note.id) e.currentTarget.style.background = 'var(--c-hover)'; }}
                  onMouseLeave={e => { if (selectedId !== note.id) e.currentTarget.style.background = 'transparent'; }}>
                  <div className="flex items-center gap-2">
                    <Lock size={12} color="#F0B429" />
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--c-text)' }}>{note.name}</p>
                  </div>
                  <p className="text-xs mt-1 truncate" style={{ color: 'var(--c-text-f)' }}>
                    {note.notes ? '••••••••••' : 'Empty note'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--c-text-g)' }}>
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail / Add panel — full-width on mobile when active, flex-1 on desktop */}
      <div
        className={`${mobileView === 'list' ? 'hidden md:flex' : 'flex'} flex-1 overflow-hidden flex-col`}
        style={{ background: 'var(--c-active-bg)' }}
      >
        {/* Mobile sticky header with back arrow */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b sticky top-0 z-10"
          style={{ borderColor: 'var(--c-border-m)', background: 'var(--c-surface)' }}>
          <button
            onClick={() => { setMobileView('list'); setShowAdd(false); setEditingId(null); }}
            className="p-1 rounded-lg transition-all"
            style={{ color: 'var(--c-text-m)' }}
            aria-label="Back to notes list"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="font-semibold flex-1 truncate" style={{ color: 'var(--c-text)' }}>
            {mobileView === 'add' ? 'New Secure Note' : (selected?.name ?? 'Note')}
          </h2>
          {mobileView === 'detail' && selected && editingId !== selected.id && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowContent(prev => ({ ...prev, [selected.id]: !prev[selected.id] }))}
                className="p-2 rounded-lg transition-all"
                style={{ color: 'var(--c-text-m)' }}>
                {showContent[selected.id] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button onClick={() => startEdit(selected.id, selected.notes || '')} className="p-2 rounded-lg transition-all"
                style={{ color: 'var(--c-text-m)' }}>
                <Edit3 size={16} />
              </button>
              <button
                onClick={() => { if (confirm(`Delete "${selected.name}"?`)) { deleteEntry(selected.id); setSelectedId(null); setMobileView('list'); }}}
                className="p-2 rounded-lg transition-all"
                style={{ color: '#EF4444' }}>
                <Trash2 size={16} />
              </button>
            </div>
          )}
          {mobileView === 'detail' && selected && editingId === selected.id && (
            <div className="flex items-center gap-1">
              <button onClick={() => setEditingId(null)} className="btn-ghost text-sm py-1.5 px-2.5">
                <X size={14} />
              </button>
              <button onClick={saveEdit} className="btn-primary text-sm py-1.5 px-2.5">
                <Save size={14} />
              </button>
            </div>
          )}
        </div>

        {/* ── Add new note form ── */}
        {showAdd && (
          <div className="p-6 border-b animate-slide-up md:border-b" style={{ borderColor: 'var(--c-border-m)' }}>
            <div className="max-w-2xl space-y-4">
              {/* Desktop-only header (mobile uses sticky header above) */}
              <div className="hidden md:flex items-center justify-between">
                <h3 className="font-semibold" style={{ color: 'var(--c-text)' }}>New Secure Note</h3>
                <button onClick={handleCancelAdd} style={{ color: 'var(--c-text-m)' }}><X size={16} /></button>
              </div>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                className="input-field" placeholder="Note title..." autoFocus />
              <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
                className="input-field font-mono text-sm resize-none" rows={6}
                placeholder="Your secret content — recovery codes, private keys, credentials, etc." />
              <div className="flex gap-3">
                <button onClick={handleCancelAdd} className="btn-ghost text-sm">Cancel</button>
                <button onClick={handleAdd} disabled={!newTitle.trim()} className="btn-primary text-sm">
                  <Save size={13} /> Save Note
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Selected note detail ── */}
        {selected && !showAdd ? (
          <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
            <div className="max-w-2xl space-y-5">
              {/* Note header — desktop only (mobile uses sticky header) */}
              <div className="hidden md:flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--c-accent-bgm)', border: '1px solid var(--c-accent-bd)' }}>
                    <Lock size={18} color="#F0B429" />
                  </div>
                  <div>
                    <h2 className="font-bold text-xl" style={{ color: 'var(--c-text)' }}>{selected.name}</h2>
                    <p className="text-xs" style={{ color: 'var(--c-text-f)' }}>
                      Updated {new Date(selected.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowContent(prev => ({ ...prev, [selected.id]: !prev[selected.id] }))}
                    className="btn-ghost text-sm">
                    {showContent[selected.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showContent[selected.id] ? 'Hide' : 'Show'}
                  </button>
                  {editingId === selected.id ? (
                    <>
                      <button onClick={() => setEditingId(null)} className="btn-ghost text-sm">
                        <X size={14} /> Cancel
                      </button>
                      <button onClick={saveEdit} className="btn-primary text-sm">
                        <Save size={14} /> Save
                      </button>
                    </>
                  ) : (
                    <button onClick={() => startEdit(selected.id, selected.notes || '')} className="btn-ghost text-sm">
                      <Edit3 size={14} /> Edit
                    </button>
                  )}
                  <button
                    onClick={() => { if (confirm(`Delete "${selected.name}"?`)) { deleteEntry(selected.id); setSelectedId(null); }}}
                    className="btn-danger text-sm">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Mobile note timestamp */}
              <p className="md:hidden text-xs" style={{ color: 'var(--c-text-f)' }}>
                Updated {new Date(selected.updatedAt).toLocaleString()}
              </p>

              {/* Mobile show/hide toggle */}
              <div className="md:hidden">
                <button
                  onClick={() => setShowContent(prev => ({ ...prev, [selected.id]: !prev[selected.id] }))}
                  className="btn-ghost text-sm w-full justify-center">
                  {showContent[selected.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                  {showContent[selected.id] ? 'Hide content' : 'Reveal content'}
                </button>
              </div>

              {/* Note content */}
              <div className="glass-card rounded-xl overflow-hidden">
                {editingId === selected.id ? (
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="w-full p-5 font-mono text-sm resize-none outline-none"
                    style={{ background: 'transparent', color: 'var(--c-text)', minHeight: '300px' }}
                    placeholder="Note content..."
                    autoFocus
                  />
                ) : (
                  <div className="p-5">
                    {showContent[selected.id] ? (
                      <pre className="font-mono text-sm whitespace-pre-wrap break-all"
                        style={{ color: 'var(--c-text)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {selected.notes || <span style={{ color: 'var(--c-text-f)' }}>Empty note</span>}
                      </pre>
                    ) : (
                      <div className="flex flex-col items-center py-8 gap-3">
                        <Lock size={28} color="#374151" />
                        <p className="text-sm" style={{ color: 'var(--c-text-f)' }}>
                          Tap <strong style={{ color: 'var(--c-text-s)' }}>Reveal</strong> to show content
                        </p>
                        <p className="text-xs" style={{ color: 'var(--c-text-g)' }}>
                          Content is encrypted with AES-256-GCM
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tags */}
              {selected.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selected.tags.map(t => <span key={t} className="tag-pill">#{t}</span>)}
                </div>
              )}
            </div>
          </div>
        ) : !showAdd && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--c-stat-bg)', border: '1px solid var(--c-border)' }}>
              <FileText size={36} color="var(--c-text-m)" />
            </div>
            <div className="text-center">
              <p className="font-semibold" style={{ color: 'var(--c-text-s)' }}>Select a note or create one</p>
              <p className="text-sm mt-1" style={{ color: 'var(--c-text-m)' }}>
                Store recovery codes, seed phrases, private keys
              </p>
            </div>
            <button onClick={handleShowAdd} className="btn-primary text-sm">
              <Plus size={14} /> New Secure Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
