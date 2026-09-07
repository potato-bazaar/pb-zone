import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, FileJson } from 'lucide-react';
import { GameConfig } from '../../types/gameConfig';

export const GameConfigJsonPanel: React.FC<{ config: GameConfig; maxHeight?: number }> = ({ config, maxHeight = 520 }) => {
  const [copied, setCopied] = useState(false);
  const json = useMemo(() => JSON.stringify(config, null, 2), [config]);
  const sizeKb = (new Blob([json]).size / 1024).toFixed(1);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Clipboard unavailable', e);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border border-[#E2E2E2] bg-white">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#E2E2E2] bg-[#F6F6F6]">
        <div className="flex items-center gap-1.5 text-[11px] text-[#545454] font-mono truncate">
          <FileJson className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{config.id}.json</span>
          <span className="text-[#A0A0A0]">· {sizeKb} KB</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold border border-[#E2E2E2] bg-white hover:border-black text-black transition-colors"
          >
            {copied ? <Check className="h-3 w-3 text-[#0E8345]" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold bg-black text-white hover:bg-[#262626] transition-colors"
          >
            <Download className="h-3 w-3" />
            <span>.json</span>
          </button>
        </div>
      </div>
      <pre
        className="p-3 text-[10.5px] font-mono leading-relaxed overflow-auto bg-[#FAFAFA] text-[#333333]"
        style={{ maxHeight }}
      >
        {json}
      </pre>
    </div>
  );
};
