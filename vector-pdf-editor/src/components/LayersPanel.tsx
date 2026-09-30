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
  Folder,
  Link2,
  Unlink,
  Crown,
  CheckSquare,
  Square as SquareIcon
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
    groupSelected,
    ungroupSelected,
    linkSelectedAsDuplicates,
    unlinkSelectedDuplicates,
    masterCardId,
    setMasterCardId,
    linkToMaster,
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

  // Toggle selection checkbox
  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Row click
  const handleRowClick = (obj: VectorObject, e: React.MouseEvent) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      handleToggleSelect(obj.id, e);
      return;
    }

    // If part of group, select all group members
    if (obj.groupId && !e.altKey) {
      const groupMembers = project.objects.filter(o => o.groupId === obj.groupId).map(o => o.id);
      setSelectedIds(groupMembers);
    } else {
      setSelectedIds([obj.id]);
    }
  };

  const anySelectedGrouped = selectedIds.some(id => {
    return project.objects.find(o => o.id === id)?.groupId !== undefined;
  });

  const anySelectedLinked = selectedIds.some(id => {
    return project.objects.find(o => o.id === id)?.linkGroupId !== undefined;
  });

  const masterObj = masterCardId ? project.objects.find(o => o.id === masterCardId) : null;

  return (
    <div
      className={`border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 select-none flex flex-col transition-all duration-200 z-30 ${
        isCollapsed ? 'h-8' : 'h-52'
      }`}
    >
      {/* Header & Quick Action Buttons */}
      <div className="h-8 px-3 flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50">
        <div
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-zinc-300 text-xs cursor-pointer hover:text-blue-600"
        >
          <LayersIcon className="w-3.5 h-3.5 text-blue-500" />
          <span>Layers ({project.objects.length})</span>
          {selectedIds.length > 0 && (
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold ml-1">
              ({selectedIds.length} selected)
            </span>
          )}
        </div>

        {/* Group / Link / Master actions toolbar right inside Layers Header */}
        <div className="flex items-center gap-1.5">
          {/* Group button */}
          {selectedIds.length >= 2 && (
            <button
              onClick={groupSelected}
              className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold border border-indigo-300 dark:border-indigo-700 flex items-center gap-1 shadow-2xs"
              title="Group selected layers together into a card"
            >
              <Folder className="w-3 h-3 text-indigo-500" />
              <span>Group ({selectedIds.length})</span>
            </button>
          )}

          {/* Ungroup button */}
          {anySelectedGrouped && (
            <button
              onClick={ungroupSelected}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] font-medium border border-slate-300 dark:border-zinc-700"
              title="Ungroup selected elements"
            >
              Ungroup
            </button>
          )}

          {/* Link as Duplicates button */}
          {selectedIds.length >= 2 && (
            <button
              onClick={linkSelectedAsDuplicates}
              className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-semibold border border-blue-300 dark:border-blue-700 flex items-center gap-1 shadow-2xs"
              title="Link selected layers as duplicates so changes to one update all"
            >
              <Link2 className="w-3 h-3 text-blue-500" />
              <span>Link ({selectedIds.length})</span>
            </button>
          )}

          {/* Unlink button */}
          {anySelectedLinked && (
            <button
              onClick={unlinkSelectedDuplicates}
              className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[10px] font-medium border border-rose-300 dark:border-rose-700 flex items-center gap-1"
              title="Unlink selected duplicate"
            >
              <Unlink className="w-3 h-3 text-rose-500" />
              <span>Unlink</span>
            </button>
          )}

          {/* Master Card Linking Wizard */}
          {!masterCardId && selectedIds.length === 1 && (
            <button
              onClick={() => setMasterCardId(selectedIds[0])}
              className="px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-[10px] font-medium border border-amber-300 dark:border-amber-700 flex items-center gap-1"
              title="Set selected element or card as Master, then select targets to link to it"
            >
              <Crown className="w-3 h-3 text-amber-600" />
              <span>Set Master</span>
            </button>
          )}

          {masterCardId && (
            <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded border border-amber-400">
              <span className="text-[10px] text-amber-900 dark:text-amber-200 font-bold">
                👑 Master: {masterObj?.name || 'Selected'}
              </span>
              <button
                onClick={() => linkToMaster(selectedIds.filter(id => id !== masterCardId), masterCardId)}
                disabled={selectedIds.filter(id => id !== masterCardId).length === 0}
                className="px-2 py-0.2 rounded bg-blue-600 disabled:opacity-40 text-white text-[9px] font-bold ml-1 hover:bg-blue-700 shadow-2xs"
              >
                Link Selected to Master
              </button>
              <button
                onClick={() => setMasterCardId(null)}
                className="text-[10px] text-amber-800 hover:text-red-600 ml-1 font-bold"
                title="Cancel Master Mode"
              >
                ✕
              </button>
            </div>
          )}

          <div
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="cursor-pointer text-slate-400 hover:text-slate-600 pl-1"
          >
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
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
              const isMaster = obj.id === masterCardId;

              return (
                <div
                  key={obj.id}
                  onClick={e => handleRowClick(obj, e)}
                  className={`px-3 py-1.5 flex items-center justify-between transition-colors cursor-pointer group ${
                    isMaster
                      ? 'bg-amber-100/70 dark:bg-amber-950/60 border-l-4 border-amber-500 font-semibold'
                      : isSelected
                      ? 'bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200 font-medium'
                      : 'hover:bg-slate-50 text-slate-700 dark:text-zinc-300 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  {/* Left: Selection Checkbox, Visibility & Lock */}
                  <div className="flex items-center gap-1.5 mr-2">
                    {/* Checkbox for easy multi-selection */}
                    <button
                      onClick={e => handleToggleSelect(obj.id, e)}
                      className="text-slate-400 hover:text-blue-600 p-0.5"
                      title={isSelected ? 'Deselect Layer' : 'Select Layer'}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <SquareIcon className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600" />
                      )}
                    </button>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        toggleVisibility(obj.id);
                      }}
                      title={obj.visible ? 'Hide Layer' : 'Show Layer'}
                      className={`p-0.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 ${
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
                      className={`p-0.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 ${
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

                    {/* Master Tag */}
                    {isMaster && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400 text-amber-950 font-bold shrink-0">
                        👑 MASTER
                      </span>
                    )}

                    {/* Group Tag */}
                    {obj.groupId && (
                      <span
                        className="text-[9px] px-1 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-mono shrink-0"
                        title={`Group: ${obj.groupId}`}
                      >
                        GRP
                      </span>
                    )}

                    {/* Linked Duplicate Tag */}
                    {obj.linkGroupId && (
                      <span
                        className="text-[9px] px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-mono shrink-0 flex items-center gap-0.5"
                        title={`Linked slot: ${obj.linkSlotId || 'slot'}`}
                      >
                        <Link2 className="w-2.5 h-2.5" />
                        <span>{obj.linkSlotId || 'slot'}</span>
                      </span>
                    )}

                    {/* Placeholder Pill */}
                    {obj.type === 'text' && obj.placeholder?.isPlaceholder && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-mono shrink-0">
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
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          deleteSelected();
                        }}
                        title="Delete Layer"
                        className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
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
