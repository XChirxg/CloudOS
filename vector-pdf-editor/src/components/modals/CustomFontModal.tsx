import React, { useState, useRef } from 'react';
import { Type, Upload, Link as LinkIcon, Check, X, Trash2, AlertCircle } from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';
import { CustomFont, TextObject } from '../../types/document';

interface CustomFontModalProps {
  onFontAdded?: (fontName: string) => void;
}

export const CustomFontModal: React.FC<CustomFontModalProps> = ({ onFontAdded }) => {
  const { activeModal, setActiveModal, project, updateObject, selectedIds, addCustomFontFamily } = useDocument();

  const [activeTab, setActiveTab] = useState<'upload' | 'google'>('upload');
  const [fontName, setFontName] = useState('');
  const [googleUrl, setGoogleUrl] = useState('');
  const [previewText, setPreviewText] = useState('The quick brown fox jumps over the lazy dog (1234567890)');
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (activeModal !== 'custom-fonts') return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['ttf', 'otf', 'woff', 'woff2'].includes(ext || '')) {
      setError('Please upload a valid font file (.ttf, .otf, .woff, or .woff2).');
      return;
    }

    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9\s_-]/g, '');
    setFontName(cleanName);

    const reader = new FileReader();
    reader.onload = evt => {
      const dataUrl = evt.target?.result as string;
      setUploadedBase64(dataUrl);

      // Dynamically test font face
      try {
        const fontFace = new FontFace(cleanName, `url(${dataUrl})`);
        fontFace.load().then(loaded => {
          document.fonts.add(loaded);
          setSuccessMsg(`Font "${cleanName}" loaded successfully!`);
        });
      } catch (err: any) {
        console.error('Font face error', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyFont = () => {
    setError(null);
    if (!fontName.trim()) {
      setError('Please provide a name for this font family.');
      return;
    }

    const cleanFamily = fontName.trim();

    if (activeTab === 'upload') {
      if (!uploadedBase64) {
        setError('Please choose a font file to upload.');
        return;
      }

      // Inject @font-face style rule into document
      const styleId = `custom-font-${cleanFamily.toLowerCase().replace(/\s+/g, '-')}`;
      let styleTag = document.getElementById(styleId);
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
      }
      styleTag.textContent = `
        @font-face {
          font-family: '${cleanFamily}';
          src: url('${uploadedBase64}');
        }
      `;

      // Save to localStorage list of custom fonts
      const savedFonts = JSON.parse(localStorage.getItem('vector_pdf_custom_fonts') || '[]');
      if (!savedFonts.find((f: any) => f.name === cleanFamily)) {
        savedFonts.push({ name: cleanFamily, type: 'upload', data: uploadedBase64 });
        localStorage.setItem('vector_pdf_custom_fonts', JSON.stringify(savedFonts));
      }
    } else {
      // Google fonts or Web link
      if (!googleUrl.trim()) {
        setError('Please enter a Google Fonts link or family name.');
        return;
      }

      let href = googleUrl.trim();
      if (!href.startsWith('http')) {
        // User typed just family name e.g. "Playfair Display"
        const formatted = href.replace(/\s+/g, '+');
        href = `https://fonts.googleapis.com/css2?family=${formatted}:wght@400;600;700&display=swap`;
      }

      const linkId = `google-font-${cleanFamily.toLowerCase().replace(/\s+/g, '-')}`;
      let linkTag = document.getElementById(linkId) as HTMLLinkElement | null;
      if (!linkTag) {
        linkTag = document.createElement('link');
        linkTag.id = linkId;
        linkTag.rel = 'stylesheet';
        document.head.appendChild(linkTag);
      }
      linkTag.href = href;

      const savedFonts = JSON.parse(localStorage.getItem('vector_pdf_custom_fonts') || '[]');
      if (!savedFonts.find((f: any) => f.name === cleanFamily)) {
        savedFonts.push({ name: cleanFamily, type: 'google', url: href });
        localStorage.setItem('vector_pdf_custom_fonts', JSON.stringify(savedFonts));
      }
    }

    // Register custom font in application context state
    addCustomFontFamily(cleanFamily);

    // If an object is selected and is text, immediately apply the font!
    const selectedText = project.objects.find(o => selectedIds.includes(o.id) && o.type === 'text');
    if (selectedText) {
      updateObject(selectedText.id, { fontFamily: cleanFamily }, true);
    }

    if (onFontAdded) {
      onFontAdded(cleanFamily);
    }

    setActiveModal(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-zinc-100 text-sm">
            <Type className="w-4 h-4 text-blue-500" />
            <span>Add Custom Font</span>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 px-4 pt-2 gap-4">
          <button
            onClick={() => {
              setActiveTab('upload');
              setError(null);
            }}
            className={`pb-2 font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File (.ttf / .otf / .woff2)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('google');
              setError(null);
            }}
            className={`pb-2 font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'google'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Google Fonts / Web URL</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {activeTab === 'upload' ? (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                className="hidden"
                onChange={handleFileUpload}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer bg-slate-50 dark:bg-zinc-800/50 hover:bg-blue-50/30 transition-colors"
              >
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-700 dark:text-zinc-300">
                  Click to select font file
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports TrueType (.ttf), OpenType (.otf), and WOFF2 (.woff2)
                </p>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">
                  Font Family Name:
                </label>
                <input
                  type="text"
                  value={fontName}
                  onChange={e => setFontName(e.target.value)}
                  placeholder="e.g. MyBrandSans"
                  className="w-full bg-slate-50 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 outline-none font-medium"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">
                  Google Font Name or Stylesheet URL:
                </label>
                <input
                  type="text"
                  value={googleUrl}
                  onChange={e => {
                    setGoogleUrl(e.target.value);
                    if (!fontName) {
                      // Attempt to extract family name from URL
                      const match = e.target.value.match(/family=([^:&]+)/);
                      if (match) {
                        setFontName(decodeURIComponent(match[1].replace(/\+/g, ' ')));
                      } else if (!e.target.value.startsWith('http')) {
                        setFontName(e.target.value);
                      }
                    }
                  }}
                  placeholder="e.g. Playfair Display or https://fonts.googleapis.com/css2?family=Playfair+Display..."
                  className="w-full bg-slate-50 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">
                  Assigned Font Family Name:
                </label>
                <input
                  type="text"
                  value={fontName}
                  onChange={e => setFontName(e.target.value)}
                  placeholder="e.g. Playfair Display"
                  className="w-full bg-slate-50 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 outline-none font-medium"
                />
              </div>
            </div>
          )}

          {/* Live Preview Box */}
          <div className="bg-slate-50 dark:bg-zinc-800/80 p-3 rounded-lg border border-slate-200 dark:border-zinc-700 space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Live Preview
            </span>
            <div
              style={{ fontFamily: fontName || 'sans-serif' }}
              className="text-base text-slate-800 dark:text-zinc-100 p-2 bg-white dark:bg-zinc-900 rounded border border-slate-200 dark:border-zinc-700/60 break-words"
            >
              {previewText}
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 text-xs flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-zinc-800/50 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2">
          <button
            onClick={() => setActiveModal(null)}
            className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApplyFont}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors cursor-pointer"
          >
            Install & Use Font
          </button>
        </div>
      </div>
    </div>
  );
};
