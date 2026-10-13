import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, FileJson } from 'lucide-react';
import { GameConfig } from '../../types/gameConfig';
import { Button } from '../ui/pb';

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
    <div className="overflow-hidden rounded-xl border border-[#E6ECE8] bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-[#E6ECE8] bg-[#F6F9F7] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#E3F8E8] text-[#16A34A]">
            <FileJson className="h-4 w-4" />
          </span>
          <span className="truncate font-mono font-medium text-[#0F172A]">{config.id}.json</span>
          <span className="shrink-0 text-[#94A3B8]">· {sizeKb} KB</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="outline" size="xs" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5 text-[#16A34A]" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </Button>
          <Button size="xs" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5" />
            <span>.json</span>
          </Button>
        </div>
      </div>
      <pre
        className="overflow-auto bg-[#0F172A] p-4 font-mono text-[11px] leading-relaxed text-[#E2E8F0] [color-scheme:dark]"
        style={{ maxHeight }}
      >
        {json}
      </pre>
    </div>
  );
};
