import React from 'react';
import { Keyboard, X } from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';

export const ShortcutsModal: React.FC = () => {
  const { activeModal, setActiveModal } = useDocument();

  if (activeModal !== 'shortcuts') return null;

  const shortcuts = [
    { key: 'V', desc: 'Select & Move Tool' },
    { key: 'T', desc: 'Text Tool' },
    { key: 'R', desc: 'Rectangle Tool' },
    { key: 'O', desc: 'Ellipse / Circle Tool' },
    { key: 'L', desc: 'Line Tool' },
    { key: 'P', desc: 'Pen / Freehand Path Tool' },
    { key: 'H / Space + Drag', desc: 'Pan Canvas' },
    { key: 'Ctrl + Z', desc: 'Undo' },
    { key: 'Ctrl + Shift + Z / Ctrl + Y', desc: 'Redo' },
    { key: 'Ctrl + C', desc: 'Copy' },
    { key: 'Ctrl + V', desc: 'Paste' },
    { key: 'Ctrl + X', desc: 'Cut' },
    { key: 'Ctrl + D', desc: 'Duplicate Object' },
    { key: 'Delete / Backspace', desc: 'Delete Selected' },
    { key: 'Ctrl + A', desc: 'Select All Objects' },
    { key: 'Ctrl + G', desc: 'Group Selected' },
    { key: 'Ctrl + Shift + G', desc: 'Ungroup' },
    { key: 'Ctrl + S', desc: 'Save Project (.design.json)' },
    { key: 'Ctrl + E', desc: 'Export PDF' },
    { key: 'Arrow Keys', desc: 'Nudge 1 mm' },
    { key: 'Shift + Arrow Keys', desc: 'Nudge 5 mm' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-zinc-100 text-sm">
            <Keyboard className="w-4 h-4 text-blue-500" />
            <span>Keyboard Shortcuts</span>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto max-h-[70vh] divide-y divide-slate-100 dark:divide-zinc-800/80">
          {shortcuts.map((sc, i) => (
            <div key={i} className="py-1.5 flex items-center justify-between">
              <span className="text-slate-700 dark:text-zinc-300">{sc.desc}</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 font-mono text-[11px] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 font-semibold">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-zinc-800/50 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
          <button
            onClick={() => setActiveModal(null)}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
