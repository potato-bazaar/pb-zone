import React, { useState } from 'react';
import { Quiz } from '../../types/quiz';
import { Copy, Download, Check, FileJson } from 'lucide-react';
import { Button, IconTile, PageHeader, Pill, panelClass } from '../ui/pb';
import { cn } from '../../lib/utils';

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
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader
        title="Game JSON Payload & Web UI Integration"
        description="Export the live 20-question package to plug directly into the PB Zone web game client or backend API."
        actions={
          <>
            <Button variant="outline" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-[#16A34A]" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy JSON'}</span>
            </Button>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4" />
              <span>Download .json</span>
            </Button>
          </>
        }
      />

      <section className={cn(panelClass, 'overflow-hidden')}>
        <div className="flex items-center gap-3 border-b border-[#EEF2F6] px-4 py-3 sm:px-5">
          <IconTile icon={FileJson} tone="amber" size="sm" />
          <span className="min-w-0 flex-1 break-words font-mono text-xs text-[#475569]">
            {quiz.id}.json ({quiz.questions.length} questions, status: {quiz.status})
          </span>
          <Pill tone="gray">UTF-8 JSON</Pill>
        </div>

        <pre className="max-h-[600px] overflow-auto bg-[#F8FBF9] px-4 py-4 font-mono text-xs leading-relaxed text-[#334155] sm:px-5">
          {jsonString}
        </pre>
      </section>
    </div>
  );
};
