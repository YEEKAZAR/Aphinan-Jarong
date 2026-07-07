
import React from 'react';
import type { Correction } from '../types';

interface ResultCardProps {
  correction: Correction;
  isChecked: boolean;
  onToggle: () => void;
}

const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const HighlightedExplanation: React.FC<{ text: string, original: string, corrected: string }> = ({ text, original, corrected }) => {
  if (!text) return null;
  const regex = new RegExp(`(${escapeRegExp(original)}|${escapeRegExp(corrected)})`, 'g');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        if (part === original) {
          return <strong key={index} className="font-semibold text-red-600 dark:text-red-400">{part}</strong>;
        }
        if (part === corrected) {
          return <strong key={index} className="font-semibold text-emerald-600 dark:text-emerald-400">{part}</strong>;
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
};

const ResultCard: React.FC<ResultCardProps> = ({ correction, isChecked, onToggle }) => {
  const uniqueId = `checkbox-${correction.original}`;
  return (
    <div className={`border rounded-xl p-4 flex items-start gap-3.5 transition-all duration-300 ${
      isChecked 
        ? 'bg-blue-50/30 dark:bg-blue-950/10 border-blue-200/60 dark:border-blue-900/40 shadow-sm' 
        : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/80 dark:border-slate-800 opacity-60 hover:opacity-80'
    }`}>
      <div className="flex-shrink-0 pt-0.5">
        <input
          type="checkbox"
          id={uniqueId}
          checked={isChecked}
          onChange={onToggle}
          className="h-4.5 w-4.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 dark:text-cyan-500 bg-white dark:bg-slate-800 shadow-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-cyan-500 cursor-pointer"
          aria-label={`Apply correction for ${correction.original}`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
          <label htmlFor={uniqueId} className="cursor-pointer">
            <span className="text-red-600 dark:text-red-400 line-through text-md font-semibold">{correction.original}</span>
          </label>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <label htmlFor={uniqueId} className="cursor-pointer">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-md">{correction.correction}</span>
          </label>
        </div>
        <div className="pl-2.5 border-l-2 border-blue-500/50 dark:border-cyan-500/50">
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
             <HighlightedExplanation text={correction.explanation} original={correction.original} corrected={correction.correction} />
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResultCard;
