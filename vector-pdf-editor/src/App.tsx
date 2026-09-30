import React, { useState, useEffect } from 'react';
import { DocumentProvider, useDocument } from './context/DocumentContext';
import { MenuBar } from './components/MenuBar';
import { Toolbar } from './components/Toolbar';
import { Canvas } from './components/Canvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import { LayersPanel } from './components/LayersPanel';
import { StatusBar } from './components/StatusBar';
import { InsertSvgModal } from './components/modals/InsertSvgModal';
import { PlaceholderModal } from './components/modals/PlaceholderModal';
import { JsonTemplateModal } from './components/modals/JsonTemplateModal';
import { PageSettingsModal } from './components/modals/PageSettingsModal';
import { ShortcutsModal } from './components/modals/ShortcutsModal';
import { CustomFontModal } from './components/modals/CustomFontModal';
import { TemplatePickerModal } from './components/modals/TemplatePickerModal';
import { VirtualTrackpad } from './components/VirtualTrackpad';

const EditorLayout: React.FC = () => {
  const {
    undo,
    redo,
    copy,
    paste,
    cut,
    duplicateSelected,
    deleteSelected,
    selectAll,
    saveProjectFile,
    exportCurrentPdf,
    setActiveTool,
    selectedIds,
    project,
    updateMultipleObjects,
    recordHistorySnapshot,
  } = useDocument();

  const [cursorMm, setCursorMm] = useState<{ x: number; y: number } | null>(null);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in text inputs or textareas
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      if (cmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      if (cmdOrCtrl && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copy();
        return;
      }

      if (cmdOrCtrl && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        paste();
        return;
      }

      if (cmdOrCtrl && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        cut();
        return;
      }

      if (cmdOrCtrl && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelected();
        return;
      }

      if (cmdOrCtrl && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAll();
        return;
      }

      if (cmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveProjectFile();
        return;
      }

      if (cmdOrCtrl && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        exportCurrentPdf();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
        return;
      }

      // Tool shortcuts
      if (!cmdOrCtrl && !e.altKey) {
        if (e.key.toLowerCase() === 'v') setActiveTool('select');
        else if (e.key.toLowerCase() === 't') setActiveTool('text');
        else if (e.key.toLowerCase() === 'r') setActiveTool('rect');
        else if (e.key.toLowerCase() === 'o') setActiveTool('ellipse');
        else if (e.key.toLowerCase() === 'l') setActiveTool('line');
        else if (e.key.toLowerCase() === 'p') setActiveTool('pen');
        else if (e.key.toLowerCase() === 'h') setActiveTool('pan');
      }

      // Arrow keys nudging
      if (selectedIds.length > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const delta = e.shiftKey ? 5 : 1; // mm
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -delta;
        if (e.key === 'ArrowDown') dy = delta;
        if (e.key === 'ArrowLeft') dx = -delta;
        if (e.key === 'ArrowRight') dx = delta;

        recordHistorySnapshot();
        const targets = project.objects.filter(o => selectedIds.includes(o.id));
        const updates = targets.map(o => ({
          id: o.id,
          changes: {
            x: Number((o.x + dx).toFixed(2)),
            y: Number((o.y + dy).toFixed(2)),
          },
        }));
        updateMultipleObjects(updates, false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    undo,
    redo,
    copy,
    paste,
    cut,
    duplicateSelected,
    deleteSelected,
    selectAll,
    saveProjectFile,
    exportCurrentPdf,
    setActiveTool,
    selectedIds,
    project.objects,
    updateMultipleObjects,
    recordHistorySnapshot,
  ]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-workspace-light dark:bg-workspace-dark font-sans select-none">
      {/* 1. Main Menu Bar */}
      <MenuBar />

      {/* 2. Middle Editor Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Toolbar */}
        <Toolbar />

        {/* Center: Canvas & Layers */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          <Canvas cursorMm={cursorMm} setCursorMm={setCursorMm} />
          <LayersPanel />
        </div>

        {/* Right: Properties Panel */}
        <PropertiesPanel />
      </div>

      {/* 3. Bottom Status Bar */}
      <StatusBar cursorMm={cursorMm} />

      {/* Modals */}
      <InsertSvgModal />
      <PlaceholderModal />
      <JsonTemplateModal />
      <PageSettingsModal />
      <ShortcutsModal />
      <CustomFontModal />
      <TemplatePickerModal />

      {/* Floating Precision Virtual Trackpad */}
      <VirtualTrackpad />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <DocumentProvider>
      <EditorLayout />
    </DocumentProvider>
  );
};

export default App;
