import React, { useState, useRef, useEffect } from 'react';
import {
  FileCode,
  Download,
  Copy,
  Upload,
  Check,
  AlertCircle,
  X,
  Sparkles,
  Archive,
  Layers,
  Database
} from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';
import {
  extractPlaceholders,
  generateDataJsonTemplate,
  generateSchemaMetadata,
} from '../../utils/jsonSchema';

export const JsonTemplateModal: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    project,
    importJsonDataString,
    importedRecords,
    exportBatchPdfsAction,
  } = useDocument();

  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'batch'>('export');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Import state
  const [jsonInput, setJsonInput] = useState('');
  const [importStatus, setImportStatus] = useState<{
    success?: boolean;
    count?: number;
    error?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Batch export state
  const [batchFormat, setBatchFormat] = useState<'merged' | 'zip'>('merged');
  const [batchBaseName, setBatchBaseName] = useState(
    project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')
  );
  const [isExporting, setIsExporting] = useState(false);

  // Placeholder summary
  const placeholders = extractPlaceholders(project.objects);
  const dataTemplate = generateDataJsonTemplate(project.objects);
  const schemaMetadata = generateSchemaMetadata(project.name, project.objects);

  const dataTemplateStr = JSON.stringify(dataTemplate, null, 2);
  const schemaMetadataStr = JSON.stringify(schemaMetadata, null, 2);

  useEffect(() => {
    if (activeModal === 'json-template' && importedRecords && importedRecords.length > 0) {
      setActiveTab('batch');
    }
  }, [activeModal, importedRecords]);

  if (activeModal !== 'json-template') return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleProcessImport = () => {
    setImportStatus(null);
    if (!jsonInput.trim()) {
      setImportStatus({ error: 'Please enter JSON data to import.' });
      return;
    }

    try {
      const { count } = importJsonDataString(jsonInput.trim());
      setImportStatus({ success: true, count });
      if (count > 1) {
        setActiveTab('batch');
      }
    } catch (err: any) {
      setImportStatus({ error: err?.message || 'Invalid JSON syntax.' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      setJsonInput(text);
      try {
        const { count } = importJsonDataString(text);
        setImportStatus({ success: true, count });
        if (count > 1) {
          setActiveTab('batch');
        }
      } catch (err: any) {
        setImportStatus({ error: err?.message || 'Invalid JSON file.' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRunBatch = async () => {
    setIsExporting(true);
    try {
      await exportBatchPdfsAction(batchFormat, batchBaseName);
      setActiveModal(null);
    } catch (err: any) {
      alert('Error during batch PDF generation: ' + (err?.message || err));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden text-xs max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-zinc-100 text-sm">
            <Database className="w-4 h-4 text-blue-500" />
            <span>JSON Templates & Data Hub</span>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 px-4 pt-2 gap-4">
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-2 font-medium transition-colors border-b-2 ${
              activeTab === 'export'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            1. Export Schema & Template ({placeholders.length} fields)
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`pb-2 font-medium transition-colors border-b-2 ${
              activeTab === 'import'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            2. Import Data JSON
          </button>

          <button
            onClick={() => setActiveTab('batch')}
            className={`pb-2 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'batch'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>3. Batch PDF Generator {importedRecords ? `(${importedRecords.length})` : ''}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: EXPORT SCHEMA & TEMPLATE */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <p className="text-slate-600 dark:text-zinc-400 text-xs">
                Export these JSON files to feed into an LLM, API, or spreadsheet. The design styles remain in the template while the content is filled dynamically.
              </p>

              {placeholders.length === 0 ? (
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs">
                  <p className="font-semibold mb-1">No placeholders defined yet!</p>
                  <p>
                    Select any text element on canvas, click <strong>"Make Placeholder"</strong>, and assign it a variable name and description.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Data Template */}
                  <div className="border border-slate-200 dark:border-zinc-700 rounded-lg p-3 bg-slate-50 dark:bg-zinc-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-zinc-200">
                          Data JSON Template
                        </span>
                        <span className="text-slate-400 text-[11px] ml-2">
                          (Fill with values for 1 or more records)
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopy(dataTemplateStr, 'data')}
                          className="px-2 py-1 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 rounded hover:bg-slate-50 flex items-center gap-1"
                        >
                          {copiedKey === 'data' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'data' ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          onClick={() => handleDownload(dataTemplateStr, `${project.name.toLowerCase()}-data-template.json`)}
                          className="px-2 py-1 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 rounded hover:bg-slate-50 flex items-center gap-1 text-blue-600 dark:text-blue-400"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download .json</span>
                        </button>
                      </div>
                    </div>
                    <pre className="p-2.5 bg-white dark:bg-zinc-900 rounded border border-slate-200 dark:border-zinc-800 font-mono text-[11px] text-slate-700 dark:text-zinc-300 overflow-x-auto max-h-40">
                      {dataTemplateStr}
                    </pre>
                  </div>

                  {/* Schema Metadata with Descriptions */}
                  <div className="border border-slate-200 dark:border-zinc-700 rounded-lg p-3 bg-slate-50 dark:bg-zinc-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-zinc-200">
                          Schema & Metadata JSON
                        </span>
                        <span className="text-slate-400 text-[11px] ml-2">
                          (Contains field descriptions for AI / LLM)
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopy(schemaMetadataStr, 'schema')}
                          className="px-2 py-1 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 rounded hover:bg-slate-50 flex items-center gap-1"
                        >
                          {copiedKey === 'schema' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'schema' ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          onClick={() => handleDownload(schemaMetadataStr, `${project.name.toLowerCase()}-schema.json`)}
                          className="px-2 py-1 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 rounded hover:bg-slate-50 flex items-center gap-1 text-blue-600 dark:text-blue-400"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download .json</span>
                        </button>
                      </div>
                    </div>
                    <pre className="p-2.5 bg-white dark:bg-zinc-900 rounded border border-slate-200 dark:border-zinc-800 font-mono text-[11px] text-slate-700 dark:text-zinc-300 overflow-x-auto max-h-40">
                      {schemaMetadataStr}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: IMPORT DATA JSON */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileUpload}
              />

              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-zinc-400">
                  Paste a JSON object or array of objects matching your placeholders:
                </span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded hover:bg-slate-50 flex items-center gap-1 text-slate-700 dark:text-zinc-200"
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload .json File</span>
                </button>
              </div>

              <textarea
                rows={8}
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
                placeholder={`[\n  {\n    "recipient_name": "Alice Johnson",\n    "course_title": "Full-Stack Vector Systems"\n  },\n  {\n    "recipient_name": "Bob Smith",\n    "course_title": "Advanced Typographic Layout"\n  }\n]`}
                className="w-full bg-slate-50 dark:bg-zinc-800/80 p-3 rounded-lg border border-slate-200 dark:border-zinc-700 font-mono text-[11px] text-slate-800 dark:text-zinc-200 outline-none focus:border-blue-500"
              />

              {importStatus?.error && (
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{importStatus.error}</span>
                </div>
              )}

              {importStatus?.success && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium">
                    <Check className="w-4 h-4 text-emerald-500" />
                    Successfully imported {importStatus.count} record{importStatus.count === 1 ? '' : 's'}!
                  </span>
                  {importStatus.count! > 1 && (
                    <button
                      onClick={() => setActiveTab('batch')}
                      className="text-emerald-800 dark:text-emerald-200 font-bold underline"
                    >
                      Go to Batch Export →
                    </button>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleProcessImport}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors cursor-pointer"
                >
                  Apply & Populate Placeholders
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: BATCH PDF GENERATION */}
          {activeTab === 'batch' && (
            <div className="space-y-4">
              {!importedRecords || importedRecords.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-center text-slate-500 space-y-2">
                  <p>No multi-record data loaded yet.</p>
                  <button
                    onClick={() => setActiveTab('import')}
                    className="text-blue-600 font-medium underline"
                  >
                    Import an array of records in tab 2
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">
                        Ready to generate {importedRecords.length} customized PDF documents!
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                        Each document will have identical vector styling and layouts with its respective data record.
                      </p>
                    </div>
                    <span className="text-xl font-bold font-mono px-3 py-1 bg-white dark:bg-zinc-900 rounded shadow-xs text-emerald-600">
                      {importedRecords.length}
                    </span>
                  </div>

                  <div className="space-y-3 bg-slate-50 dark:bg-zinc-800/60 p-4 rounded-lg border border-slate-200 dark:border-zinc-700">
                    <div>
                      <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">
                        Export Format:
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label
                          className={`p-3 rounded-lg border cursor-pointer flex flex-col gap-1 transition-colors ${
                            batchFormat === 'merged'
                              ? 'bg-blue-50 border-blue-500 text-blue-900 dark:bg-blue-950/40 dark:border-blue-400 dark:text-blue-200'
                              : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 font-semibold">
                            <input
                              type="radio"
                              name="format"
                              checked={batchFormat === 'merged'}
                              onChange={() => setBatchFormat('merged')}
                            />
                            <span>Merged Multi-Page PDF</span>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-zinc-400 pl-5">
                            One single PDF file containing all {importedRecords.length} pages.
                          </span>
                        </label>

                        <label
                          className={`p-3 rounded-lg border cursor-pointer flex flex-col gap-1 transition-colors ${
                            batchFormat === 'zip'
                              ? 'bg-blue-50 border-blue-500 text-blue-900 dark:bg-blue-950/40 dark:border-blue-400 dark:text-blue-200'
                              : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 font-semibold">
                            <input
                              type="radio"
                              name="format"
                              checked={batchFormat === 'zip'}
                              onChange={() => setBatchFormat('zip')}
                            />
                            <span>Individual PDFs (ZIP Archive)</span>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-zinc-400 pl-5">
                            Zip archive containing record-001.pdf, record-002.pdf, etc.
                          </span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">
                        Base File Name:
                      </label>
                      <input
                        type="text"
                        value={batchBaseName}
                        onChange={e => setBatchBaseName(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-800 px-3 py-1.5 rounded border border-slate-200 dark:border-zinc-700 font-mono text-slate-800 dark:text-zinc-200 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleRunBatch}
                      disabled={isExporting}
                      className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      {isExporting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Generating Vector PDFs...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Generate & Download {importedRecords.length} PDFs</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
