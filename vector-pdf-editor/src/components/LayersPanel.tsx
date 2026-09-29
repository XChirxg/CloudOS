import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  Trash2,
  Copy,
  Layers as LayersIcon,
  Type,
  Square,
  Circle,
  Minus,
  PenTool,
  Image as ImageIcon,
  Code,
  Folder
} from 'lucide-react';
import { useDocument } from '../context/DocumentContext';
import { VectorObject } from '../types/document';

export const LayersPanel: React.FC = () => {
  const {
    project,
    selectedIds,
    setSelectedIds,
    toggleLock,
    toggleVisibility,
    renameObject,
    bringForward,
    sendBackward,
    deleteSelected,
    duplicateSelected,
  } = useDocument();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Sort objects in descending zIndex order (topmost layer on top)
  const sortedObjects = [...project.objects].sort((a, b) => b.zIndex - a.zIndex);

  const getObjectIcon = (obj: VectorObject) => {
    switch (obj.type) {
      case 'text':
        return <Type className="w-3.5 h-3.5 text-blue-500" />;
      case 'rect':
        return <Square className="w-3.5 h-3.5 text-emerald-500" />;
      case 'ellipse':
        return <Circle className="w-3.5 h-3.5 text-amber-500" />;
      case 'line':
        return <Minus className="w-3.5 h-3.5 text-indigo-500" />;
      case 'path':
        return <PenTool className="w-3.5 h-3.5 text-purple-500" />;
      case 'image':
        return <ImageIcon className="w-3.5 h-3.5 text-pink-500" />;
      case 'svg':
        return <Code className="w-3.5 h-3.5 text-teal-500" />;
      case 'group':
        return <Folder className="w-3.5 h-3.5 text-orange-500" />;
      default:
        return <LayersIcon className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const handleStartRename = (obj: VectorObject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(obj.id);
    setEditingName(obj.name);
  };

  const handleFinishRename = (id: string) => {
    if (editingName.trim()) {
      renameObject(id, editingName.trim());
    }
    setEditingId(null);
  };

  return (
    <div
      className={`border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 select-none flex flex-col transition-all duration-200 z-30 ${
        isCollapsed ? 'h-8' : 'h-48'
      }`}
    >
      {/* Header */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="h-8 px-3 flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 cursor-pointer bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800"
      >
        <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-zinc-300 text-xs">
          <LayersIcon className="w-3.5 h-3.5 text-blue-500" />
          <span>Layers ({project.objects.length})</span>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* Layer List */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/60 text-xs">
          {sortedObjects.length === 0 ? (
            <div className="p-4 text-center text-slate-400 dark:text-zinc-500 italic text-[11px]">
              No layers yet. Add shapes or text to begin.
            </div>
          ) : (
            sortedObjects.map(obj => {
              const isSelected = selectedIds.includes(obj.id);
              return (
                <div
                  key={obj.id}
                  onClick={() => setSelectedIds([obj.id])}
                  className={`px-3 py-1.5 flex items-center justify-between transition-colors cursor-pointer group ${
                    isSelected
                      ? 'bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200 font-medium'
                      : 'hover:bg-slate-50 text-slate-700 dark:text-zinc-300 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  {/* Left: Visibility & Lock icons */}
                  <div className="flex items-center gap-1.5 mr-2">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        toggleVisibility(obj.id);
                      }}
                      title={obj.visible ? 'Hide Layer' : 'Show Layer'}
                      className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 ${
                        obj.visible ? 'text-slate-400 hover:text-slate-700' : 'text-slate-300 dark:text-zinc-600'
                      }`}
                    >
                      {obj.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        toggleLock(obj.id);
                      }}
                      title={obj.locked ? 'Unlock Layer' : 'Lock Layer'}
                      className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 ${
                        obj.locked ? 'text-amber-500' : 'text-slate-300 dark:text-zinc-600 hover:text-slate-700'
                      }`}
                    >
                      {obj.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Icon & Name */}
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {getObjectIcon(obj)}
                    {editingId === obj.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onBlur={() => handleFinishRename(obj.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleFinishRename(obj.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="bg-white dark:bg-zinc-800 border border-blue-500 rounded px-1 text-xs outline-none w-full"
                      />
                    ) : (
                      <span
                        onDoubleClick={e => handleStartRename(obj, e)}
                        className="truncate text-[11px]"
                        title="Double click to rename"
                      >
                        {obj.name}
                      </span>
                    )}

                    {/* Placeholder Pill */}
                    {obj.type === 'text' && obj.placeholder?.isPlaceholder && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-mono">
                        P
                      </span>
                    )}
                  </div>

                  {/* Quick Reorder & Delete */}
                  {isSelected && (
                    <div className="flex items-center gap-0.5 ml-2">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          bringForward();
                        }}
                        title="Move Up in Stack"
                        className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          sendBackward();
                        }}
                        title="Move Down in Stack"
                        className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
