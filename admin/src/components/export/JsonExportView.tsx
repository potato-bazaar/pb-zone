import React, { useState } from 'react';
import { Quiz } from '../../types/quiz';
import { Code2, Copy, Download, Check, FileJson } from 'lucide-react';

interface JsonExportViewProps {
  quiz: Quiz;
}

export const JsonExportView: React.FC<JsonExportViewProps> = ({ quiz }) => {
  const [copied, setCopied] = useState(false);
  const jsonString = JSON.stringify(quiz, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quiz.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Code2 className="h-6 w-6 text-cyan-400" />
            <span>Game JSON Payload & Web UI Integration</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Export the live 20-question package to plug directly into the PB Zone web game client or backend API.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-all"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy JSON'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Download .json</span>
          </button>
        </div>
      </div>

      {/* Code Viewer */}
      <div className="relative rounded-2xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-slate-400 text-[11px]">
          <div className="flex items-center gap-2">
            <FileJson className="h-4 w-4 text-amber-400" />
            <span>{quiz.id}.json ({quiz.questions.length} questions, status: {quiz.status})</span>
          </div>
          <span>UTF-8 JSON</span>
        </div>

        <pre className="max-h-[600px] overflow-auto text-slate-300 leading-relaxed scrollbar-thin">
          {jsonString}
        </pre>
      </div>
    </div>
  );
};
