import React, { useState } from 'react';
import {
  Award,
  FileText,
  Receipt,
  Grid,
  BookOpen,
  Layers,
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';
import { TEMPLATES_LIBRARY, TemplateDefinition } from '../../utils/templates';

export const TemplatePickerModal: React.FC = () => {
  const { activeModal, setActiveModal, loadProjectDocument } = useDocument();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  if (activeModal !== 'template-picker') return null;

  const categories = ['All', 'Certificate', 'Resume', 'Invoice', 'Flashcard', 'PokerCard'];

  const filtered = selectedCategory === 'All'
    ? TEMPLATES_LIBRARY
    : TEMPLATES_LIBRARY.filter(t => t.category === selectedCategory);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Award':
        return <Award className="w-5 h-5 text-amber-500" />;
      case 'FileText':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'Receipt':
        return <Receipt className="w-5 h-5 text-emerald-500" />;
      case 'Grid':
        return <Grid className="w-5 h-5 text-indigo-500" />;
      case 'BookOpen':
        return <BookOpen className="w-5 h-5 text-purple-500" />;
      case 'Layers':
        return <Layers className="w-5 h-5 text-rose-500" />;
      default:
        return <Sparkles className="w-5 h-5 text-blue-500" />;
    }
  };

  const handleSelectTemplate = (template: TemplateDefinition) => {
    const doc = template.createDocument();
    loadProjectDocument(doc);
    setActiveModal(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-3xl w-full flex flex-col overflow-hidden text-xs max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-zinc-100 text-sm">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Ready-Made Vector Templates Library</span>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 px-5 py-2 gap-2 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700'
              }`}
            >
              {cat === 'All' ? 'All Templates' : cat}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">
          {filtered.map(tpl => (
            <div
              key={tpl.id}
              onClick={() => handleSelectTemplate(tpl)}
              className="border border-slate-200 dark:border-zinc-700/80 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-zinc-800/40 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 p-4 rounded-xl cursor-pointer transition-all duration-150 flex flex-col justify-between group shadow-xs hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-xs">
                    {getIcon(tpl.thumbnailIcon)}
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-semibold">
                    {tpl.preset} {tpl.orientation}
                  </span>
                </div>
                <h4 className="font-bold text-slate-800 dark:text-zinc-100 text-sm mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {tpl.name}
                </h4>
                <p className="text-slate-500 dark:text-zinc-400 text-xs leading-relaxed">
                  {tpl.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-zinc-700/60 flex items-center justify-between text-blue-600 dark:text-blue-400 font-medium">
                <span className="text-[11px]">Load & Customize</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
