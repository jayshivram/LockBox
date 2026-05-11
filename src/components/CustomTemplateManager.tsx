import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Save, Pencil,
  LayoutTemplate, Eye, EyeOff, Link, AlignLeft, Hash
} from 'lucide-react';
import { useVaultStore } from '../store/vaultStore';
import type { CustomEntryTemplate, CustomFieldDefinition, Category } from '../types';
import { generateId } from '../utils/generator';

const CATEGORIES: Category[] = ['Personal', 'Work', 'Finance', 'Crypto', 'Social', 'Servers', 'API Keys', 'Network'];

const FIELD_TYPE_ICONS = {
  text:     Hash,
  password: EyeOff,
  url:      Link,
  textarea: AlignLeft,
  totp:     Eye,
};

const FIELD_TYPE_LABELS: Record<CustomFieldDefinition['type'], string> = {
  text:     'Text',
  password: 'Password (hidden)',
  url:      'URL',
  textarea: 'Multi-line text',
  totp:     'TOTP / 2FA code',
};

interface TemplateEditorProps {
  template?: CustomEntryTemplate;
  onSave: (tpl: Omit<CustomEntryTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const [name, setName]     = useState(template?.name ?? '');
  const [icon, setIcon]     = useState(template?.icon ?? '🗂️');
  const [category, setCat]  = useState<Category>(template?.defaultCategory ?? 'Personal');
  const [fields, setFields] = useState<CustomFieldDefinition[]>(template?.fields ?? []);
  const [emojiPicker, setEmojiPicker] = useState(false);

  const EMOJI_SUGGESTIONS = ['🗂️','🏥','🎫','🚗','🏠','💊','📱','🎮','🌐','🔑','📄','🎓','🏦','✈️','🛡️'];

  const addField = () => {
    setFields(f => [...f, { id: generateId(), label: '', type: 'text', placeholder: '', required: false }]);
  };

  const updateField = (id: string, updates: Partial<CustomFieldDefinition>) => {
    setFields(f => f.map(field => field.id === id ? { ...field, ...updates } : field));
  };

  const removeField = (id: string) => {
    setFields(f => f.filter(field => field.id !== id));
  };

  const moveField = (id: string, direction: 'up' | 'down') => {
    const idx = fields.findIndex(f => f.id === id);
    if (direction === 'up' && idx <= 0) return;
    if (direction === 'down' && idx >= fields.length - 1) return;
    const newFields = [...fields];
    const swap = direction === 'up' ? idx - 1 : idx + 1;
    [newFields[idx], newFields[swap]] = [newFields[swap], newFields[idx]];
    setFields(newFields);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), icon, defaultCategory: category, fields });
  };

  return (
    <div className="space-y-4">
      {/* Template name + icon */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setEmojiPicker(p => !p)}
            className="w-12 h-12 rounded-xl text-2xl flex items-center justify-center border transition-all"
            style={{ border: '1px solid var(--c-border-m)', background: 'var(--c-hover)' }}
            title="Choose icon"
          >
            {icon}
          </button>
          {emojiPicker && (
            <div className="absolute top-14 left-0 z-10 p-3 rounded-xl shadow-xl grid grid-cols-5 gap-1.5"
              style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)', backdropFilter: 'blur(20px)' }}>
              {EMOJI_SUGGESTIONS.map(e => (
                <button key={e} onClick={() => { setIcon(e); setEmojiPicker(false); }}
                  className="w-8 h-8 rounded text-xl flex items-center justify-center hover:scale-110 transition-transform"
                  style={{ background: icon === e ? 'var(--c-accent-bgm)' : undefined }}>
                  {e}
                </button>
              ))}
              {/* Manual input */}
              <input
                className="col-span-5 input-field text-sm text-center"
                placeholder="or type emoji"
                maxLength={2}
                onChange={e => { if (e.target.value) setIcon(e.target.value); }}
              />
            </div>
          )}
        </div>
        <div className="flex-1">
          <label className="label-text">Template Name *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="input-field mt-1" placeholder="e.g. Medical Insurance, Loyalty Card" />
        </div>
      </div>

      {/* Default category */}
      <div>
        <label className="label-text">Default Category</label>
        <select value={category} onChange={e => setCat(e.target.value as Category)} className="input-field mt-1">
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Fields */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label-text">Fields</label>
          <button onClick={addField} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
            style={{ color: 'var(--c-accent)', background: 'var(--c-accent-bgm)', border: '1px solid var(--c-accent-bd)' }}>
            <Plus size={11} /> Add Field
          </button>
        </div>

        {fields.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: 'var(--c-text-f)' }}>
            No custom fields yet. Click "Add Field" to add some.
          </p>
        )}

        <div className="space-y-2">
          {fields.map((field, idx) => {
            const FieldIcon = FIELD_TYPE_ICONS[field.type];
            return (
              <div key={field.id} className="rounded-xl p-3 space-y-2"
                style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-border-m)' }}>
                <div className="flex items-center gap-2">
                  <GripVertical size={14} color="var(--c-text-f)" />
                  <input
                    value={field.label}
                    onChange={e => updateField(field.id, { label: e.target.value })}
                    className="input-field flex-1 py-1.5 text-sm"
                    placeholder="Field label (e.g. Policy Number)"
                  />
                  <button onClick={() => moveField(field.id, 'up')} disabled={idx === 0}
                    className="p-1 rounded transition-colors" style={{ color: idx === 0 ? 'var(--c-text-f)' : 'var(--c-text-m)' }}>
                    <ChevronUp size={14} />
                  </button>
                  <button onClick={() => moveField(field.id, 'down')} disabled={idx === fields.length - 1}
                    className="p-1 rounded transition-colors" style={{ color: idx === fields.length - 1 ? 'var(--c-text-f)' : 'var(--c-text-m)' }}>
                    <ChevronDown size={14} />
                  </button>
                  <button onClick={() => removeField(field.id)}
                    className="p-1 rounded transition-colors" style={{ color: '#EF4444' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <FieldIcon size={13} color="var(--c-text-f)" />
                  <select value={field.type} onChange={e => updateField(field.id, { type: e.target.value as CustomFieldDefinition['type'] })}
                    className="input-field flex-1 py-1.5 text-xs">
                    {(Object.keys(FIELD_TYPE_LABELS) as CustomFieldDefinition['type'][]).map(t => (
                      <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--c-text-m)' }}>
                    <input type="checkbox" checked={field.required ?? false}
                      onChange={e => updateField(field.id, { required: e.target.checked })}
                      className="rounded" />
                    Required
                  </label>
                </div>
                <input
                  value={field.placeholder ?? ''}
                  onChange={e => updateField(field.id, { placeholder: e.target.value })}
                  className="input-field py-1.5 text-xs"
                  placeholder="Placeholder text (optional)"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
        <button onClick={handleSave} disabled={!name.trim()} className="btn-primary flex-1">
          <Save size={14} /> {template ? 'Save Changes' : 'Create Template'}
        </button>
      </div>
    </div>
  );
}

interface CustomTemplateManagerProps {
  onClose: () => void;
}

export function CustomTemplateManager({ onClose }: CustomTemplateManagerProps) {
  const { customTemplates, addCustomTemplate, updateCustomTemplate, deleteCustomTemplate } = useVaultStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  const handleCreate = async (tpl: Omit<CustomEntryTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    await addCustomTemplate(tpl);
    setCreatingNew(false);
  };

  const handleUpdate = async (id: string, tpl: Omit<CustomEntryTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    await updateCustomTemplate(id, tpl);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template? Existing entries using this template will not be affected.')) return;
    await deleteCustomTemplate(id);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full md:max-w-xl glass-card rounded-t-2xl md:rounded-2xl animate-slide-up overflow-hidden"
        style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b"
          style={{ borderColor: 'var(--c-border)' }}>
          <div className="flex items-center gap-2.5">
            <LayoutTemplate size={18} color="var(--c-accent)" />
            <h2 className="font-bold text-lg" style={{ color: 'var(--c-text)' }}>Custom Entry Types</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg" style={{ color: 'var(--c-text-m)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
          {/* Creating new template */}
          {creatingNew && (
            <div className="rounded-2xl p-5" style={{ background: 'var(--c-hover)', border: '1px solid var(--c-accent-bd)' }}>
              <p className="text-sm font-semibold mb-4" style={{ color: 'var(--c-accent)' }}>New Template</p>
              <TemplateEditor
                onSave={handleCreate}
                onCancel={() => setCreatingNew(false)}
              />
            </div>
          )}

          {/* Existing templates */}
          {customTemplates.length === 0 && !creatingNew ? (
            <div className="text-center py-10 space-y-3">
              <div className="text-4xl">🗂️</div>
              <p className="font-medium" style={{ color: 'var(--c-text)' }}>No custom templates yet</p>
              <p className="text-sm" style={{ color: 'var(--c-text-m)' }}>
                Create templates for types not covered by the built-in types: Medical Insurance, Loyalty Cards, Licenses, and more.
              </p>
            </div>
          ) : (
            customTemplates.map(tpl => (
              <div key={tpl.id} className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid var(--c-border-m)' }}>
                {editingId === tpl.id ? (
                  <div className="p-5">
                    <p className="text-sm font-semibold mb-4" style={{ color: 'var(--c-text)' }}>Edit Template</p>
                    <TemplateEditor
                      template={tpl}
                      onSave={t => handleUpdate(tpl.id, t)}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <div className="p-4 flex items-center gap-3">
                    <span className="text-2xl">{tpl.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" style={{ color: 'var(--c-text)' }}>{tpl.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-f)' }}>
                        {tpl.fields.length} field{tpl.fields.length !== 1 ? 's' : ''} · {tpl.defaultCategory}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setEditingId(tpl.id)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'var(--c-text-m)' }}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(tpl.id)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: '#EF4444' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Add new button */}
          {!creatingNew && (
            <button onClick={() => setCreatingNew(true)}
              className="w-full py-3 rounded-xl border-2 border-dashed text-sm font-medium transition-all flex items-center justify-center gap-2"
              style={{ borderColor: 'var(--c-border-m)', color: 'var(--c-text-m)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-accent)';
                (e.currentTarget as HTMLElement).style.color = 'var(--c-accent)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-border-m)';
                (e.currentTarget as HTMLElement).style.color = 'var(--c-text-m)';
              }}>
              <Plus size={15} /> New Template
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
