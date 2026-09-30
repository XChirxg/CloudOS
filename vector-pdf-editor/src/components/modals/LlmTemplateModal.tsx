import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Code2,
  Download,
  Upload,
  Layers,
  FileCode,
  X,
  AlertCircle,
  CheckCircle2,
  FileCheck
} from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';
import { ProjectDocument } from '../../types/document';

export const LlmTemplateModal: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    loadProjectDocument,
    importTemplateJsonString,
  } = useDocument();

  const [activeTab, setActiveTab] = useState<'prompt' | 'import'>('prompt');
  const [templateType, setTemplateType] = useState('flashcard');
  const [customDescription, setCustomDescription] = useState('Create a 6-card game inventory sheet with item icons, damage stats, rarity borders, and price placeholders.');
  const [copied, setCopied] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message: string;
    parsedDoc?: ProjectDocument;
  } | null>(null);

  if (activeModal !== 'llm-template') return null;

  const getSystemPrompt = () => {
    let focusInstructions = '';
    if (templateType === 'flashcard') {
      focusInstructions = `TASK: Generate a printable Flashcard deck template.
- Use 50mm x 95mm card size (or multiple cards on an A3 or A4 sheet).
- Each card must have: outer border rect (rx: 1.5), header category pill rect + text, bold concept/term title text, explanation/bullet points text, and bottom mnemonic/formula box.
- Group each card under a unique 'groupId' (e.g. "card-1", "card-2").
- Link duplicates using 'linkGroupId': "flashcard-deck" and matching 'linkSlotId' ("border", "pill", "category", "title", "summary", "tipbox") on all cards so changing style in one card updates all.
- Mark key text with 'placeholder': { isPlaceholder: true, name: "...", description: "...", defaultValue: "..." }.`;
    } else if (templateType === 'poker') {
      focusInstructions = `TASK: Generate a Poker / Trading Card template (63.5mm x 88.9mm).
- Multi-page supported: front side and back side.
- Card elements: outer rounded border rect (rx: 3.5), gradient background, character/item illustration placeholder box, title banner, attribute badges (ATK, DEF, HP), description text box, rarity star SVG or text.
- Use professional color palettes and typography.`;
    } else if (templateType === 'invoice') {
      focusInstructions = `TASK: Generate a clean professional Invoice / Bill template on A4 portrait (210mm x 297mm).
- Header with company title, logo rect placeholder, invoice number, issue date, and due date.
- Bill To & Ship To customer detail blocks.
- Clean line items table: header bar, 4 item rows (Description, Qty, Rate, Amount), divider lines.
- Totals block: Subtotal, Tax/GST (18%), Grand Total with bold badge.
- Bank payment info box and signature line.
- Mark all dynamic customer fields as placeholders.`;
    } else {
      focusInstructions = `USER REQUEST: ${customDescription}
- Design precise printable layout using millimeter (mm) coordinates.
- Ensure appropriate margins (10mm recommended).
- Provide good hierarchy: headers, subtitles, body, cards, and accent dividers.`;
    }

    return `You are an expert vector design engine for the Vector PDF Template Editor web application.
Your goal is to design a high-precision, printable vector document template adhering to physical millimeter measurements.

${focusInstructions}

### STRICT OUTPUT FORMAT
You must respond with ONLY a single valid JSON object representing a "ProjectDocument".
Do NOT output markdown fences (no \`\`\`json or \`\`\`), no introductory text, no explanations. Raw JSON ONLY.

### DOCUMENT SCHEMA SPECIFICATION
Root object structure:
{
  "id": "tpl-ai-generated",
  "name": "Template Title",
  "version": "1.0.0",
  "createdAt": "2026-09-30T00:00:00.000Z",
  "updatedAt": "2026-09-30T00:00:00.000Z",
  "unit": "mm",
  "page": {
    "preset": "A4" | "A3" | "Letter" | "PokerCard" | "YaadCard5x9.5" | "Custom",
    "width": 210, // in mm (e.g. A4: 210x297, A3: 420x297 landscape, PokerCard: 63.5x88.9)
    "height": 297,
    "orientation": "portrait" | "landscape",
    "margins": { "top": 10, "right": 10, "bottom": 10, "left": 10 }
  },
  "grid": { "show": true, "spacing": 5, "snap": true },
  "snap": { "enabled": true, "snapToGrid": true, "snapToPage": true, "snapToObjects": true, "thresholdMm": 1.5 },
  "syncLinkedDuplicates": true,
  "objects": [ /* array of VectorObject */ ]
}

### SUPPORTED OBJECT TYPES (in objects array)
All coordinates (x, y, width, height) are in millimeters (mm). zIndex starts at 1 and increments.

1. TextObject:
{
  "id": "unique-id",
  "name": "Descriptive Layer Name",
  "type": "text",
  "x": 20, "y": 30, "width": 80, "height": 10,
  "rotation": 0, "opacity": 1, "locked": false, "visible": true, "zIndex": 1,
  "groupId": "group-card-1", // optional: groups elements so clicking selects entire card
  "linkGroupId": "deck-link-1", // optional: links duplicated cards together
  "linkSlotId": "title-slot",   // slot identifier across duplicated cards
  "text": "Card Title",
  "fontFamily": "Inter" | "Roboto" | "Playfair Display" | "Courier Prime" | "Arial",
  "fontSize": 12, // in pt
  "fontWeight": "normal" | "bold" | "500" | "600" | "700",
  "fontStyle": "normal" | "italic",
  "textAlign": "left" | "center" | "right" | "justify",
  "lineHeight": 1.2,
  "letterSpacing": 0,
  "fill": { "type": "solid", "color": "#0f172a", "opacity": 1 },
  "stroke": { "type": "none", "color": "#000", "width": 0, "opacity": 0 },
  "placeholder": { // optional for dynamic templating
    "isPlaceholder": true,
    "name": "unique_variable_name",
    "description": "Explanation of placeholder field",
    "defaultValue": "Sample Value"
  }
}

2. RectObject:
{
  "id": "rect-id", "name": "Card Box", "type": "rect",
  "x": 10, "y": 10, "width": 60, "height": 90, "rotation": 0, "opacity": 1, "locked": false, "visible": true, "zIndex": 1,
  "rx": 2, "ry": 2, // corner radius in mm
  "fill": { "type": "solid", "color": "#ffffff", "opacity": 1 }
    // or linear gradient: { "type": "linear", "angle": 135, "opacity": 1, "stops": [{ "id": "s1", "offset": 0, "color": "#eff6ff", "opacity": 1 }, { "id": "s2", "offset": 1, "color": "#dbeafe", "opacity": 1 }] }
    // or none: { "type": "none" }
  "stroke": { "type": "solid", "color": "#94a3b8", "width": 0.4, "opacity": 1, "dashArray": "2,2" } // dashArray optional
}

3. EllipseObject:
{
  "id": "ellipse-id", "name": "Avatar Circle", "type": "ellipse",
  "x": 20, "y": 20, "width": 25, "height": 25, "rotation": 0, "opacity": 1, "locked": false, "visible": true, "zIndex": 2,
  "fill": { "type": "solid", "color": "#3b82f6", "opacity": 1 },
  "stroke": { "type": "none", "color": "#000", "width": 0, "opacity": 0 }
}

4. LineObject:
{
  "id": "line-id", "name": "Divider", "type": "line",
  "x": 15, "y": 45, "width": 180, "height": 0, "rotation": 0, "opacity": 1, "locked": false, "visible": true, "zIndex": 3,
  "x2": 180, "y2": 0,
  "stroke": { "type": "solid", "color": "#cbd5e1", "width": 0.5, "opacity": 1 }
}

5. SvgObject:
{
  "id": "svg-id", "name": "Star Icon", "type": "svg",
  "x": 20, "y": 20, "width": 10, "height": 10, "rotation": 0, "opacity": 1, "locked": false, "visible": true, "zIndex": 4,
  "svgCode": "<svg viewBox='0 0 24 24'><polygon points='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' fill='#eab308'/></svg>"
}

Ensure all elements fit properly within page boundaries. Output strictly pure JSON.`;
  };

  const handleCopyPrompt = () => {
    const prompt = getSystemPrompt();
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleValidateJson = () => {
    try {
      if (!jsonInput.trim()) {
        setValidationResult({ valid: false, message: 'Please paste JSON template code first.' });
        return;
      }
      // Remove any surrounding markdown backticks if LLM mistakenly added them
      let cleaned = jsonInput.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(cleaned);

      // Support either raw ProjectDocument or UserTemplate { project: ... }
      const doc: ProjectDocument = parsed.project || parsed;

      if (!doc.objects || !Array.isArray(doc.objects)) {
        setValidationResult({ valid: false, message: 'Invalid format: missing "objects" array in document.' });
        return;
      }
      if (!doc.page || typeof doc.page.width !== 'number') {
        setValidationResult({ valid: false, message: 'Invalid format: missing valid "page" configuration.' });
        return;
      }

      setValidationResult({
        valid: true,
        message: `Valid template! ${doc.objects.length} vector objects, ${doc.page.width} × ${doc.page.height} mm (${doc.page.orientation || 'portrait'}).`,
        parsedDoc: doc,
      });
    } catch (err: any) {
      setValidationResult({ valid: false, message: `JSON Syntax Error: ${err.message}` });
    }
  };

  const handleApplyToCanvas = () => {
    if (!validationResult?.parsedDoc) {
      handleValidateJson();
    }
    if (validationResult?.parsedDoc) {
      loadProjectDocument(validationResult.parsedDoc);
      setActiveModal(null);
    }
  };

  const handleSaveToTemplates = () => {
    if (!validationResult?.parsedDoc) {
      handleValidateJson();
    }
    if (validationResult?.parsedDoc) {
      try {
        importTemplateJsonString(JSON.stringify(validationResult.parsedDoc));
        alert('Template successfully saved to "My Templates" cache!');
      } catch (err: any) {
        alert('Error saving template: ' + err.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden text-xs max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-800/40">
          <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-zinc-100 text-sm">
            <Sparkles className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            <span>AI / LLM Vector Template Generator & Code Loader</span>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-zinc-800 bg-slate-100/70 dark:bg-zinc-800/60 px-5 pt-2 gap-4">
          <button
            onClick={() => setActiveTab('prompt')}
            className={`pb-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'prompt'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>1. Copy LLM Design Prompt</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`pb-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>2. Paste & Load JSON Template</span>
          </button>
        </div>

        {/* Tab 1: Prompt Generator */}
        {activeTab === 'prompt' && (
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            <div className="bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 p-3.5 rounded-lg text-slate-700 dark:text-zinc-300 leading-relaxed">
              <p className="font-semibold text-blue-900 dark:text-blue-300 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                How to generate vector templates with Gemini, ChatGPT, or Claude:
              </p>
              <p className="text-[11px] text-slate-600 dark:text-zinc-400">
                1. Select a preset or type your custom design prompt below.<br />
                2. Click <strong>"Copy Full LLM Prompt"</strong> and paste it into your favorite LLM.<br />
                3. The LLM will output a raw JSON vector layout. Copy its response and paste it into tab <strong>"2. Paste & Load JSON Template"</strong>!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Template Style Preset:
                </label>
                <select
                  value={templateType}
                  onChange={e => setTemplateType(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 px-3 py-1.5 rounded-md text-xs outline-none focus:border-blue-500"
                >
                  <option value="flashcard">Flashcard Deck (5x9.5cm format with Question/Answer/Pill)</option>
                  <option value="poker">Poker / Trading Card (63.5x88.9mm Two-Sided)</option>
                  <option value="invoice">Business Bill / Invoice (A4 with Table & Totals)</option>
                  <option value="custom">Custom Description (Freeform)</option>
                </select>
              </div>

              {templateType === 'custom' && (
                <div>
                  <label className="block font-medium text-slate-700 dark:text-zinc-300 mb-1">
                    Describe what you want the AI to design:
                  </label>
                  <input
                    type="text"
                    value={customDescription}
                    onChange={e => setCustomDescription(e.target.value)}
                    placeholder="e.g. 6-card game inventory sheet with health & mana bars"
                    className="w-full bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 px-3 py-1.5 rounded-md text-xs outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-700 dark:text-zinc-300">
                  Engineered System Prompt & JSON Schema:
                </label>
                <button
                  onClick={handleCopyPrompt}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition-colors shadow-xs ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied Prompt!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Full LLM Prompt</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                readOnly
                value={getSystemPrompt()}
                rows={12}
                className="w-full font-mono text-[11px] bg-slate-900 text-slate-100 p-3.5 rounded-lg border border-slate-800 focus:outline-none select-all resize-none leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Code Import / Live Loader */}
        {activeTab === 'import' && (
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 dark:text-zinc-300">
                Paste JSON Template Code Generated by LLM:
              </label>
              <button
                onClick={handleValidateJson}
                className="px-3 py-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-300 dark:border-zinc-700 rounded-md text-slate-700 dark:text-zinc-200 font-medium"
              >
                Validate JSON Code
              </button>
            </div>

            <textarea
              value={jsonInput}
              onChange={e => {
                setJsonInput(e.target.value);
                setValidationResult(null);
              }}
              placeholder={`Paste raw JSON here, for example:\n{\n  "name": "My Custom Flashcard",\n  "unit": "mm",\n  "page": { "preset": "A4", "width": 210, "height": 297, "orientation": "portrait" },\n  "objects": [ ... ]\n}`}
              rows={13}
              className="w-full font-mono text-[11px] bg-slate-900 text-slate-100 p-3.5 rounded-lg border border-slate-800 focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
            />

            {validationResult && (
              <div
                className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                  validationResult.valid
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}
              >
                {validationResult.valid ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                )}
                <div>
                  <p className="font-medium text-xs">{validationResult.message}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-zinc-800">
              <button
                onClick={handleSaveToTemplates}
                className="px-4 py-2 border border-slate-300 dark:border-zinc-700 rounded-lg font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save to My Templates</span>
              </button>
              <button
                onClick={handleApplyToCanvas}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Apply to Canvas Editor</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
