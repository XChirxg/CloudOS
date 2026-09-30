import React, { useState, useRef } from 'react';
import {
  Award,
  FileText,
  Receipt,
  Grid,
  BookOpen,
  Layers,
  X,
  Sparkles,
  ArrowRight,
  Download,
  Upload,
  Plus,
  Trash2,
  Bookmark,
  Code2
} from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';
import { TEMPLATES_LIBRARY, TemplateDefinition } from '../../utils/templates';
import { UserTemplate } from '../../types/document';

export const TemplatePickerModal: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    loadProjectDocument,
    project,
    savedTemplates,
    saveCurrentAsTemplate,
    deleteUserTemplate,
    exportTemplateJsonFile,
    importTemplateJsonFile,
  } = useDocument();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveCategory, setSaveCategory] = useState('Custom');
  const [saveDesc, setSaveDesc] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (activeModal !== 'template-picker') return null;

  const categories = ['All', 'My Templates', 'Flashcard', 'PokerCard', 'Certificate', 'Resume', 'Invoice'];

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

  const handleSelectUserTemplate = (tpl: UserTemplate) => {
    loadProjectDocument(tpl.project);
    setActiveModal(null);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) return;
    saveCurrentAsTemplate(saveName, saveCategory, saveDesc);
    setShowSaveForm(false);
    setSaveName('');
    setSaveDesc('');
    setSelectedCategory('My Templates');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imported = await importTemplateJsonFile(file);
        setSelectedCategory('My Templates');
      } catch (err: any) {
        alert('Failed to import template: ' + err.message);
      }
    }
    e.target.value = '';
  };

  // Filter templates
  const filteredBuiltIn = selectedCategory === 'All'
    ? TEMPLATES_LIBRARY
    : selectedCategory === 'My Templates'
    ? []
    : TEMPLATES_LIBRARY.filter(t => t.category === selectedCategory);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden text-xs max-h-[88vh]">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.template.json"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-800/40">
          <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-zinc-100 text-sm">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Vector Template Library & Custom Manager</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSaveForm(!showSaveForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save Current Design</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-md font-medium transition-colors"
              title="Import .template.json file from your computer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
            </button>

            <button
              onClick={() => setActiveModal('llm-template')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-md font-medium transition-colors"
              title="Open AI / LLM Template Generator & Code Loader"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>AI / LLM</span>
            </button>

            <button
              onClick={() => setActiveModal(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 p-1 ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Save Current Design Inline Form */}
        {showSaveForm && (
          <form
            onSubmit={handleSaveSubmit}
            className="p-4 bg-blue-50/70 dark:bg-blue-950/20 border-b border-blue-200 dark:border-blue-900/50 flex flex-col sm:flex-row gap-3 items-end"
          >
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Template Name:
              </label>
              <input
                type="text"
                required
                placeholder="e.g. My 27-Card Vocabulary Deck"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                className="w-full bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 px-3 py-1.5 rounded-md text-xs outline-none focus:border-blue-500"
              />
            </div>
            <div className="w-36">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Category:
              </label>
              <select
                value={saveCategory}
                onChange={e => setSaveCategory(e.target.value)}
                className="w-full bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 px-2 py-1.5 rounded-md text-xs outline-none focus:border-blue-500"
              >
                <option value="Flashcard">Flashcard</option>
                <option value="PokerCard">PokerCard</option>
                <option value="Certificate">Certificate</option>
                <option value="Resume">Resume</option>
                <option value="Invoice">Invoice</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Description:
              </label>
              <input
                type="text"
                placeholder="Brief summary of template layout"
                value={saveDesc}
                onChange={e => setSaveDesc(e.target.value)}
                className="w-full bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 px-3 py-1.5 rounded-md text-xs outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-xs transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowSaveForm(false)}
                className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 rounded-md"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Category Filter Pills */}
        <div className="flex border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 px-5 py-2 gap-2 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700'
              }`}
            >
              {cat === 'My Templates' && <Bookmark className="w-3 h-3 text-amber-400" />}
              <span>{cat === 'All' ? 'All Templates' : cat}</span>
              {cat === 'My Templates' && savedTemplates.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-bold">
                  {savedTemplates.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">
          {/* 1. Custom Saved Templates */}
          {(selectedCategory === 'All' || selectedCategory === 'My Templates') &&
            savedTemplates.map(tpl => (
              <div
                key={tpl.id}
                className="border border-amber-300/80 dark:border-amber-700/60 bg-amber-50/20 dark:bg-amber-950/10 hover:border-amber-500 p-4 rounded-xl transition-all duration-150 flex flex-col justify-between group shadow-xs hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 shadow-xs">
                      <Bookmark className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 font-semibold">
                        Custom • {tpl.project.page.preset}
                      </span>
                    </div>
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-zinc-100 text-sm mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {tpl.name}
                  </h4>
                  <p className="text-slate-500 dark:text-zinc-400 text-xs leading-relaxed">
                    {tpl.description || 'Saved custom template'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-2 font-mono">
                    {tpl.project.objects.length} elements • Saved {new Date(tpl.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => exportTemplateJsonFile(tpl)}
                      className="px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded flex items-center gap-1"
                      title="Download template as JSON file"
                    >
                      <Download className="w-3 h-3" />
                      <span>Export</span>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete template "${tpl.name}"?`)) {
                          deleteUserTemplate(tpl.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      title="Delete saved template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleSelectUserTemplate(tpl)}
                    className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    <span>Load Design</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ))}

          {/* Empty state for My Templates */}
          {selectedCategory === 'My Templates' && savedTemplates.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 dark:text-zinc-500">
              <Bookmark className="w-10 h-10 mx-auto mb-3 opacity-40 text-amber-500" />
              <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                No custom templates saved yet
              </p>
              <p className="text-xs max-w-md mx-auto mb-4">
                You can save your current design as a reusable template, import a .template.json file, or create one with AI.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowSaveForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-xs"
                >
                  Save Current Design
                </button>
                <button
                  onClick={() => setActiveModal('llm-template')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium shadow-xs"
                >
                  Create with AI
                </button>
              </div>
            </div>
          )}

          {/* 2. Built-in Templates */}
          {filteredBuiltIn.map(tpl => (
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
