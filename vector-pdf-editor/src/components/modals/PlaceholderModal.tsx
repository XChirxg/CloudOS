import React, { useState, useEffect } from 'react';
import { Sparkles, X, Trash2 } from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';
import { TextObject } from '../../types/document';

export const PlaceholderModal: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    selectedIds,
    project,
    convertSelectedToPlaceholder,
    removePlaceholder,
  } = useDocument();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectedTextObj = project.objects.find(
    o => selectedIds.includes(o.id) && o.type === 'text'
  ) as TextObject | undefined;

  useEffect(() => {
    if (selectedTextObj) {
      if (selectedTextObj.placeholder?.isPlaceholder) {
        setName(selectedTextObj.placeholder.name);
        setDescription(selectedTextObj.placeholder.description || '');
      } else {
        // Auto suggest name based on current text
        const suggested = selectedTextObj.text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .slice(0, 30);
        setName(suggested || 'field_name');
        setDescription(`Value for ${selectedTextObj.text}`);
      }
    }
  }, [selectedTextObj]);

  if (activeModal !== 'make-placeholder' || !selectedTextObj) return null;

  const handleSave = () => {
    setError(null);
    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!cleanName) {
      setError('Please provide a unique placeholder variable name.');
      return;
    }

    convertSelectedToPlaceholder(cleanName, description.trim());
    setActiveModal(null);
  };

  const handleRemove = () => {
    removePlaceholder(selectedTextObj.id);
    setActiveModal(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-zinc-100 text-sm">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>
              {selectedTextObj.placeholder?.isPlaceholder ? 'Edit JSON Placeholder' : 'Convert to JSON Placeholder'}
            </span>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">
              Placeholder Variable Name:
            </label>
            <div className="flex items-center bg-slate-50 dark:bg-zinc-800 rounded-lg border border-slate-200 dark:border-zinc-700 px-3 py-1.5 focus-within:border-blue-500">
              <span className="text-slate-400 font-mono font-bold mr-1">{`{{`}</span>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="person_name"
                className="w-full bg-transparent outline-none font-mono text-slate-800 dark:text-zinc-200 font-semibold"
              />
              <span className="text-slate-400 font-mono font-bold ml-1">{`}}`}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Unique identifier used in JSON keys (e.g. <code>full_name</code>, <code>invoice_number</code>).
            </p>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">
              Description (for Schema / LLM):
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Full legal name of the recipient or applicant"
              className="w-full bg-slate-50 dark:bg-zinc-800 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 outline-none focus:border-blue-500 text-slate-800 dark:text-zinc-200 resize-none text-xs"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Included in the JSON Schema metadata so programs, scripts, or LLMs understand what data to supply.
            </p>
          </div>

          {error && <div className="text-red-500 font-medium text-xs">{error}</div>}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-zinc-800/50 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            {selectedTextObj.placeholder?.isPlaceholder && (
              <button
                onClick={handleRemove}
                className="text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1 font-medium hover:underline cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove Placeholder
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveModal(null)}
              className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors cursor-pointer"
            >
              {selectedTextObj.placeholder?.isPlaceholder ? 'Save Changes' : 'Create Placeholder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
