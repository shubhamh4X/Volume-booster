import { useState } from 'react';
import {
  Download,
  FolderArchive,
  Check,
  Copy,
  HelpCircle,
  Bookmark,
  Code2,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  downloadExtensionZip,
  BOOKMARKLET_CODE,
  EXTENSION_FILES,
} from '../utils/extensionGenerator';

export function ExtensionExporter() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);
  const [showCodeInspector, setShowCodeInspector] = useState(false);
  const [selectedFile, setSelectedFile] = useState(EXTENSION_FILES[0]);
  const [copiedFile, setCopiedFile] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadExtensionZip();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const copyCode = (text: string, isBookmarklet = false) => {
    navigator.clipboard.writeText(text);
    if (isBookmarklet) {
      setCopiedBookmarklet(true);
      setTimeout(() => setCopiedBookmarklet(false), 2500);
    } else {
      setCopiedFile(true);
      setTimeout(() => setCopiedFile(false), 2500);
    }
  };

  return (
    <div id="extension-exporter" className="max-w-4xl mx-auto w-full flex flex-col gap-6">
      {/* Download Action Card */}
      <div className="bg-zinc-950 rounded-3xl border border-zinc-800 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center font-black shrink-0 shadow-md">
            <FolderArchive className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Download Chrome Extension</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 font-bold">
                Manifest V3
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 max-w-lg">
              Complete, ready-to-load ZIP package with popup controls, background service worker, and Web Audio gain hooks.
            </p>
          </div>
        </div>

        <button
          id="download-extension-zip-btn"
          onClick={handleDownload}
          disabled={isDownloading}
          className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition-all shrink-0 active:scale-95 shadow-md ${
            downloadSuccess
              ? 'bg-white text-black border border-white'
              : 'bg-white hover:bg-zinc-200 text-black border border-white'
          }`}
        >
          {downloadSuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>Downloaded ZIP!</span>
            </>
          ) : (
            <>
              <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
              <span>{isDownloading ? 'Packaging...' : 'Download Extension (.ZIP)'}</span>
            </>
          )}
        </button>
      </div>

      {/* 3-Step Clean Installation Guide & Bookmarklet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Simple 3-Step Setup */}
        <div className="bg-zinc-950 p-6 rounded-3xl border border-zinc-800 flex flex-col gap-4 shadow-md">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-white" />
            <h3 className="text-sm font-bold text-white">3 Simple Steps to Install</h3>
          </div>

          <div className="flex flex-col gap-3 text-xs text-zinc-300">
            <div className="flex items-start gap-3 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/80">
              <span className="w-5 h-5 rounded-full bg-white text-black font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                1
              </span>
              <span>
                Click <strong>Download Extension (.ZIP)</strong> and unzip the archive on your computer.
              </span>
            </div>

            <div className="flex items-start gap-3 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/80">
              <span className="w-5 h-5 rounded-full bg-white text-black font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                2
              </span>
              <span>
                Open Chrome and go to <code className="text-white bg-zinc-800 px-1.5 py-0.5 rounded font-mono">chrome://extensions</code>, then enable <strong>Developer mode</strong>.
              </span>
            </div>

            <div className="flex items-start gap-3 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/80">
              <span className="w-5 h-5 rounded-full bg-white text-black font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                3
              </span>
              <span>
                Click <strong>"Load unpacked"</strong> and choose the unzipped folder. Pin the icon to boost any tab!
              </span>
            </div>
          </div>
        </div>

        {/* Instant In-Page Bookmarklet */}
        <div className="bg-zinc-950 p-6 rounded-3xl border border-zinc-800 flex flex-col justify-between gap-4 shadow-md">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-white" />
                <h3 className="text-sm font-bold text-white">Instant Bookmarklet</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 font-bold">
                No Install Needed
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-2">
              Want to boost audio right now without installing an extension? Paste this 1-line script into your browser Console (F12) or save as a bookmark:
            </p>
          </div>

          <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 font-mono text-[11px] text-zinc-300 overflow-x-auto truncate">
            {BOOKMARKLET_CODE}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-zinc-500 font-mono">
              Direct Web Audio GainNode boost
            </span>
            <button
              id="copy-bookmarklet-btn"
              onClick={() => copyCode(BOOKMARKLET_CODE, true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-mono font-bold transition-all active:scale-95 shadow-sm"
            >
              {copiedBookmarklet ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedBookmarklet ? 'Copied Script!' : 'Copy Script'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Clean Expandable Code Inspector */}
      <div className="bg-zinc-950 rounded-3xl border border-zinc-800 p-6 flex flex-col gap-4 shadow-md">
        <button
          onClick={() => setShowCodeInspector(!showCodeInspector)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-white" />
            <span className="text-sm font-bold text-white">
              Inspect Extension Package Files ({EXTENSION_FILES.length} Files)
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs font-mono text-zinc-400">
            <span>{showCodeInspector ? 'Hide Files' : 'Show Files'}</span>
            {showCodeInspector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showCodeInspector && (
          <div className="flex flex-col gap-3 pt-2 border-t border-zinc-850">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-400">
                Viewing: <strong className="text-white">{selectedFile.path}</strong>
              </span>
              <button
                id="copy-selected-file-btn"
                onClick={() => copyCode(selectedFile.content)}
                className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 transition-colors font-mono"
              >
                {copiedFile ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedFile ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col md:flex-row">
              {/* File list sidebar */}
              <div className="w-full md:w-52 bg-zinc-950 border-r border-zinc-800 p-2 flex md:flex-col gap-1 overflow-x-auto">
                {EXTENSION_FILES.map((file) => {
                  const isCur = file.path === selectedFile.path;
                  return (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFile(file)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono text-left transition-all ${
                        isCur
                          ? 'bg-white text-black font-bold'
                          : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Code display */}
              <div className="flex-1 p-4 bg-zinc-900 overflow-x-auto max-h-80">
                <pre className="font-mono text-xs text-zinc-300 leading-relaxed">
                  <code>{selectedFile.content}</code>
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
