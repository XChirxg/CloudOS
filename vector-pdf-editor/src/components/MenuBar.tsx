import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Save,
  FolderOpen,
  Download,
  Printer,
  Undo2,
  Redo2,
  Copy,
  Scissors,
  ClipboardPaste,
  Grid,
  Magnet,
  Maximize2,
  Sun,
  Moon,
  Database,
  ChevronDown,
  Layers,
  Sparkles,
  HelpCircle,
  FileCode,
  LayoutGrid
} from 'lucide-react';
import { useDocument } from '../context/DocumentContext';

export const MenuBar: React.FC = () => {
  const {
    project,
    setProjectName,
    theme,
    toggleTheme,
    undo,
    redo,
    canUndo,
    canRedo,
    copy,
    paste,
    cut,
    duplicateSelected,
    deleteSelected,
    selectAll,
    selectedIds,
    alignSelected,
    distributeSelected,
    groupSelected,
    ungroupSelected,
    bringForward,
    bringToFront,
    sendBackward,
    sendToBack,
    setUnit,
    setGridConfig,
    setSnapConfig,
    setZoom,
    setPan,
    newDocument,
    saveProjectFile,
    loadProjectFile,
    exportCurrentPdf,
    exportCurrentSvg,
    setActiveModal,
    importedRecords,
    activeRecordIndex,
    nextRecord,
    prevRecord,
    clearImportedData,
  } = useDocument();

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadProjectFile(file);
    }
    e.target.value = '';
    setOpenMenu(null);
  };

  const hasSelection = selectedIds.length > 0;
  const isSingleTextSelected =
    selectedIds.length === 1 &&
    project.objects.find(o => o.id === selectedIds[0])?.type === 'text';

  return (
    <header className="h-10 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between px-3 select-none text-xs z-40 relative shadow-sm">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.design.json"
        className="hidden"
        onChange={handleOpenFile}
      />

      {/* Left: App Logo & Menus */}
      <div className="flex items-center gap-1" ref={menuContainerRef}>
        {/* Brand */}
        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-zinc-100 mr-2 text-sm">
          <div className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center text-[11px] font-mono shadow-sm">
            PDF
          </div>
          <span className="tracking-tight">VectorStudio</span>
        </div>

        {/* Menu Items */}
        {/* File */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')}
            className={`px-2.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors ${
              openMenu === 'file' ? 'bg-slate-100 dark:bg-zinc-800 font-semibold' : ''
            }`}
          >
            File
          </button>
          {openMenu === 'file' && (
            <div className="absolute top-8 left-0 w-52 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md shadow-xl py-1 z-50 flex flex-col">
              <button
                onClick={() => {
                  newDocument('A4', 'portrait');
                  setOpenMenu(null);
                }}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 flex justify-between"
              >
                <span>New Document</span>
                <span className="text-slate-400">Ctrl+N</span>
              </button>
              <button
                onClick={() => {
                  setActiveModal('page-settings');
                  setOpenMenu(null);
                }}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700"
              >
                Page Setup...
              </button>
              <div className="h-px bg-slate-100 dark:bg-zinc-700 my-1" />
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 flex justify-between"
              >
                <span>Open Project...</span>
                <span className="text-slate-400">Ctrl+O</span>
              </button>
              <button
                onClick={() => {
                  saveProjectFile();
                  setOpenMenu(null);
                }}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 flex justify-between"
              >
                <span>Save Project</span>
                <span className="text-slate-400">Ctrl+S</span>
              </button>
              <div className="h-px bg-slate-100 dark:bg-zinc-700 my-1" />
              <button
                onClick={() => {
                  exportCurrentPdf();
                  setOpenMenu(null);
                }}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 flex justify-between font-medium text-blue-600 dark:text-blue-400"
              >
                <span>Export PDF</span>
                <span className="text-slate-400">Ctrl+E</span>
              </button>
              <button
                onClick={() => {
                  exportCurrentSvg();
                  setOpenMenu(null);
                }}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700"
              >
                Export SVG
              </button>
            </div>
          )}
        </div>

        {/* Edit */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'edit' ? null : 'edit')}
            className={`px-2.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors ${
              openMenu === 'edit' ? 'bg-slate-100 dark:bg-zinc-800 font-semibold' : ''
            }`}
          >
            Edit
          </button>
          {openMenu === 'edit' && (
            <div className="absolute top-8 left-0 w-48 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md shadow-xl py-1 z-50 flex flex-col">
              <button
                onClick={() => {
                  undo();
                  setOpenMenu(null);
                }}
                disabled={!canUndo}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 disabled:opacity-40 flex justify-between"
              >
                <span>Undo</span>
                <span className="text-slate-400">Ctrl+Z</span>
              </button>
              <button
                onClick={() => {
                  redo();
                  setOpenMenu(null);
                }}
                disabled={!canRedo}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 disabled:opacity-40 flex justify-between"
              >
                <span>Redo</span>
                <span className="text-slate-400">Ctrl+Y</span>
              </button>
              <div className="h-px bg-slate-100 dark:bg-zinc-700 my-1" />
              <button
                onClick={() => {
                  cut();
                  setOpenMenu(null);
                }}
                disabled={!hasSelection}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 disabled:opacity-40 flex justify-between"
              >
                <span>Cut</span>
                <span className="text-slate-400">Ctrl+X</span>
              </button>
              <button
                onClick={() => {
                  copy();
                  setOpenMenu(null);
                }}
                disabled={!hasSelection}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 disabled:opacity-40 flex justify-between"
              >
                <span>Copy</span>
                <span className="text-slate-400">Ctrl+C</span>
              </button>
              <button
                onClick={() => {
                  paste();
                  setOpenMenu(null);
                }}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 flex justify-between"
              >
                <span>Paste</span>
                <span className="text-slate-400">Ctrl+V</span>
              </button>
              <button
                onClick={() => {
                  duplicateSelected();
                  setOpenMenu(null);
                }}
                disabled={!hasSelection}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 disabled:opacity-40 flex justify-between"
              >
                <span>Duplicate</span>
                <span className="text-slate-400">Ctrl+D</span>
              </button>
              <button
                onClick={() => {
                  deleteSelected();
                  setOpenMenu(null);
                }}
                disabled={!hasSelection}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 disabled:opacity-40 flex justify-between text-red-600 dark:text-red-400"
              >
                <span>Delete</span>
                <span className="text-slate-400">Del</span>
              </button>
              <div className="h-px bg-slate-100 dark:bg-zinc-700 my-1" />
              <button
                onClick={() => {
                  selectAll();
                  setOpenMenu(null);
                }}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 flex justify-between"
              >
                <span>Select All</span>
                <span className="text-slate-400">Ctrl+A</span>
              </button>
            </div>
          )}
        </div>

        {/* View */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')}
            className={`px-2.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors ${
              openMenu === 'view' ? 'bg-slate-100 dark:bg-zinc-800 font-semibold' : ''
            }`}
          >
            View
          </button>
          {openMenu === 'view' && (
            <div className="absolute top-8 left-0 w-48 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md shadow-xl py-1 z-50 flex flex-col">
              <button
                onClick={() => {
                  setZoom(1.0);
                  setPan({ x: 60, y: 40 });
                  setOpenMenu(null);
                }}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 flex justify-between"
              >
                <span>Actual Size (100%)</span>
                <span className="text-slate-400">Ctrl+0</span>
              </button>
              <button
                onClick={() => {
                  setZoom(0.85);
                  setPan({ x: 60, y: 40 });
                  setOpenMenu(null);
                }}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700"
              >
                Fit Page in Window
              </button>
              <div className="h-px bg-slate-100 dark:bg-zinc-700 my-1" />
              <button
                onClick={() => {
                  setGridConfig({ show: !project.grid.show });
                  setOpenMenu(null);
                }}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 flex justify-between"
              >
                <span>Show Grid</span>
                <span>{project.grid.show ? '✓' : ''}</span>
              </button>
              <button
                onClick={() => {
                  setSnapConfig({ enabled: !project.snap.enabled });
                  setOpenMenu(null);
                }}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 flex justify-between"
              >
                <span>Magnetic Snapping</span>
                <span>{project.snap.enabled ? '✓' : ''}</span>
              </button>
              <div className="h-px bg-slate-100 dark:bg-zinc-700 my-1" />
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400">Unit</div>
              {(['mm', 'cm', 'inch'] as const).map(u => (
                <button
                  key={u}
                  onClick={() => {
                    setUnit(u);
                    setOpenMenu(null);
                  }}
                  className="px-3 py-1 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 flex justify-between pl-6"
                >
                  <span>{u}</span>
                  <span>{project.unit === u ? '✓' : ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Object */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'object' ? null : 'object')}
            className={`px-2.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors ${
              openMenu === 'object' ? 'bg-slate-100 dark:bg-zinc-800 font-semibold' : ''
            }`}
          >
            Object
          </button>
          {openMenu === 'object' && (
            <div className="absolute top-8 left-0 w-52 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md shadow-xl py-1 z-50 flex flex-col">
              <button
                onClick={() => {
                  setActiveModal('make-placeholder');
                  setOpenMenu(null);
                }}
                disabled={!isSingleTextSelected}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 disabled:opacity-40 font-medium text-amber-600 dark:text-amber-400"
              >
                Make JSON Placeholder...
              </button>
              <button
                onClick={() => {
                  setActiveModal('repeat-grid');
                  setOpenMenu(null);
                }}
                disabled={!hasSelection}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 disabled:opacity-40"
              >
                Repeat / Grid Duplication...
              </button>
              <div className="h-px bg-slate-100 dark:bg-zinc-700 my-1" />
              <button
                onClick={() => {
                  groupSelected();
                  setOpenMenu(null);
                }}
                disabled={selectedIds.length < 2}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 disabled:opacity-40 flex justify-between"
              >
                <span>Group</span>
                <span className="text-slate-400">Ctrl+G</span>
              </button>
              <button
                onClick={() => {
                  ungroupSelected();
                  setOpenMenu(null);
                }}
                disabled={!hasSelection}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 disabled:opacity-40 flex justify-between"
              >
                <span>Ungroup</span>
                <span className="text-slate-400">Ctrl+Shift+G</span>
              </button>
            </div>
          )}
        </div>

        {/* Arrange */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'arrange' ? null : 'arrange')}
            className={`px-2.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors ${
              openMenu === 'arrange' ? 'bg-slate-100 dark:bg-zinc-800 font-semibold' : ''
            }`}
          >
            Arrange
          </button>
          {openMenu === 'arrange' && (
            <div className="absolute top-8 left-0 w-48 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md shadow-xl py-1 z-50 flex flex-col">
              <button
                onClick={() => {
                  bringToFront();
                  setOpenMenu(null);
                }}
                disabled={!hasSelection}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 disabled:opacity-40"
              >
                Bring to Front
              </button>
              <button
                onClick={() => {
                  bringForward();
                  setOpenMenu(null);
                }}
                disabled={!hasSelection}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 disabled:opacity-40"
              >
                Bring Forward
              </button>
              <button
                onClick={() => {
                  sendBackward();
                  setOpenMenu(null);
                }}
                disabled={!hasSelection}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 disabled:opacity-40"
              >
                Send Backward
              </button>
              <button
                onClick={() => {
                  sendToBack();
                  setOpenMenu(null);
                }}
                disabled={!hasSelection}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 disabled:opacity-40"
              >
                Send to Back
              </button>
              <div className="h-px bg-slate-100 dark:bg-zinc-700 my-1" />
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400">Align</div>
              {(['left', 'center', 'right', 'top', 'middle', 'bottom'] as const).map(dir => (
                <button
                  key={dir}
                  onClick={() => {
                    alignSelected(dir);
                    setOpenMenu(null);
                  }}
                  disabled={selectedIds.length < 2}
                  className="px-3 py-1 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 disabled:opacity-40 capitalize pl-6"
                >
                  Align {dir}
                </button>
              ))}
              <div className="h-px bg-slate-100 dark:bg-zinc-700 my-1" />
              <button
                onClick={() => {
                  distributeSelected('horizontal');
                  setOpenMenu(null);
                }}
                disabled={selectedIds.length < 3}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 disabled:opacity-40"
              >
                Distribute Horizontally
              </button>
              <button
                onClick={() => {
                  distributeSelected('vertical');
                  setOpenMenu(null);
                }}
                disabled={selectedIds.length < 3}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 disabled:opacity-40"
              >
                Distribute Vertically
              </button>
            </div>
          )}
        </div>

        {/* Template */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'template' ? null : 'template')}
            className={`px-2.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors ${
              openMenu === 'template' ? 'bg-slate-100 dark:bg-zinc-800 font-semibold' : ''
            }`}
          >
            Template
          </button>
          {openMenu === 'template' && (
            <div className="absolute top-8 left-0 w-60 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md shadow-xl py-1 z-50 flex flex-col">
              <button
                onClick={() => {
                  setActiveModal('json-template');
                  setOpenMenu(null);
                }}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 flex items-center gap-2"
              >
                <FileCode className="w-3.5 h-3.5 text-blue-500" />
                <span>Export JSON Schema & Template</span>
              </button>
              <button
                onClick={() => {
                  setActiveModal('json-template');
                  setOpenMenu(null);
                }}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 flex items-center gap-2"
              >
                <Database className="w-3.5 h-3.5 text-amber-500" />
                <span>Import JSON Data...</span>
              </button>
              <button
                onClick={() => {
                  setActiveModal('json-template');
                  setOpenMenu(null);
                }}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Batch Generate Multiple PDFs...</span>
              </button>
            </div>
          )}
        </div>

        {/* Export */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'export' ? null : 'export')}
            className={`px-2.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors ${
              openMenu === 'export' ? 'bg-slate-100 dark:bg-zinc-800 font-semibold' : ''
            }`}
          >
            Export
          </button>
          {openMenu === 'export' && (
            <div className="absolute top-8 left-0 w-52 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md shadow-xl py-1 z-50 flex flex-col">
              <button
                onClick={() => {
                  exportCurrentPdf();
                  setOpenMenu(null);
                }}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 flex items-center gap-2 font-medium text-blue-600 dark:text-blue-400"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Vector PDF</span>
              </button>
              <button
                onClick={() => {
                  exportCurrentSvg();
                  setOpenMenu(null);
                }}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 flex items-center gap-2"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Export SVG Document</span>
              </button>
              <button
                onClick={() => {
                  setActiveModal('json-template');
                  setOpenMenu(null);
                }}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 flex items-center gap-2"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Export JSON Schema</span>
              </button>
            </div>
          )}
        </div>

        {/* Help */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'help' ? null : 'help')}
            className={`px-2.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors ${
              openMenu === 'help' ? 'bg-slate-100 dark:bg-zinc-800 font-semibold' : ''
            }`}
          >
            Help
          </button>
          {openMenu === 'help' && (
            <div className="absolute top-8 left-0 w-48 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md shadow-xl py-1 z-50 flex flex-col">
              <button
                onClick={() => {
                  setActiveModal('shortcuts');
                  setOpenMenu(null);
                }}
                className="px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-zinc-700 flex items-center gap-2"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Keyboard Shortcuts</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Center: Document Title Input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={project.name}
          onChange={e => setProjectName(e.target.value)}
          className="bg-transparent hover:bg-slate-100 dark:hover:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-800 px-2 py-0.5 rounded border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-blue-500 font-medium text-center text-slate-800 dark:text-zinc-200 outline-none transition-colors w-56 truncate"
          title="Click to rename document"
        />
        <span className="text-[11px] text-slate-400 font-mono">
          [{project.page.preset} {project.page.width}×{project.page.height}mm]
        </span>
      </div>

      {/* Right: Quick actions, Data previewer & Theme toggle */}
      <div className="flex items-center gap-2">
        {/* If JSON Data is imported, show record pager! */}
        {importedRecords && importedRecords.length > 0 && (
          <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/50 px-2 py-0.5 rounded text-[11px] text-amber-900 dark:text-amber-200">
            <span className="font-semibold">Record {activeRecordIndex + 1} of {importedRecords.length}</span>
            <button
              onClick={prevRecord}
              className="px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 dark:hover:bg-amber-700"
              title="Previous Record"
            >
              ◀
            </button>
            <button
              onClick={nextRecord}
              className="px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 dark:hover:bg-amber-700"
              title="Next Record"
            >
              ▶
            </button>
            <button
              onClick={clearImportedData}
              className="text-amber-600 dark:text-amber-400 hover:text-red-500 ml-1"
              title="Clear Imported Data"
            >
              ✕
            </button>
          </div>
        )}

        {/* Undo / Redo quick icons */}
        <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-zinc-800 pr-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1 rounded text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1 rounded text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Theme`}
          className="p-1.5 rounded-md text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
        >
          {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
        </button>

        {/* Quick Export PDF Button */}
        <button
          onClick={exportCurrentPdf}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1 rounded shadow-sm transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export PDF</span>
        </button>
      </div>
    </header>
  );
};
