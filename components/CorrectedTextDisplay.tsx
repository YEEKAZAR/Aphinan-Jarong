
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Correction } from '../types';

interface CorrectedTextDisplayProps {
  originalText: string;
  corrections: Correction[];
  onUpdateCorrection: (originalWord: string, newCorrection: string) => void;
}

const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Sub-component for inline editing with confirm/cancel actions
const EditableWord: React.FC<{ value: string; onSave: (newValue: string) => void }> = ({ value, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  // Focus and select text when entering edit mode
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);
  
  // Update internal state if the parent's value prop changes while not editing
  useEffect(() => {
    if (!isEditing) {
      setCurrentValue(value);
    }
  }, [value, isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    onSave(currentValue);
  };
  
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setCurrentValue(value); // Revert changes
  }, [value]);

  // Handle clicks outside the component to cancel editing
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        handleCancel();
      }
    };
    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, handleCancel]);
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          handleSave();
      } else if (e.key === 'Escape') {
          handleCancel();
      }
  };

  if (isEditing) {
    return (
      <span ref={wrapperRef} className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 rounded-md p-1 border border-blue-500 dark:border-cyan-500 shadow-xl relative z-20 -m-1">
        <input
          ref={inputRef}
          type="text"
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-emerald-600 dark:text-emerald-400 font-bold bg-slate-50 dark:bg-slate-900 focus:outline-none rounded px-1.5 py-0.5 text-sm"
          size={currentValue.length > 5 ? currentValue.length : 6}
        />
        <button
          onClick={handleSave}
          className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded text-emerald-600 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          aria-label="Confirm change"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
        </button>
        <button
          onClick={handleCancel}
          className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded text-red-500 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          aria-label="Cancel change"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
      </span>
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 border-b-2 border-emerald-500/50 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 rounded px-1 py-0.5 cursor-pointer transition-colors"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if(e.key === 'Enter') setIsEditing(true); }}
    >
      {value}
    </span>
  );
};


const CorrectedTextDisplay: React.FC<CorrectedTextDisplayProps> = ({ originalText, corrections, onUpdateCorrection }) => {
  // If there are no corrections, just display the original text as is.
  if (!corrections || corrections.length === 0) {
    return <>{originalText}</>;
  }

  // Create a Map for efficient lookup of correction details by the original word.
  const correctionMap = new Map<string, Correction>();
  corrections.forEach(c => correctionMap.set(c.original, c));

  // Build a regular expression to find all words that need correction.
  const regex = new RegExp(`(${corrections.map(c => escapeRegExp(c.original)).join('|')})`, 'g');

  // Split the text into an array of alternating normal text and incorrect words.
  const parts = originalText.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        const correction = correctionMap.get(part);

        // If the part is a word that has a correction, render it with a tooltip.
        if (correction) {
          return (
            <span key={index} className="relative group inline-block mx-0.5 my-0.5">
              <EditableWord
                value={correction.correction}
                onSave={(newValue) => onUpdateCorrection(correction.original, newValue)}
              />
              {/* Tooltip with explanation, appears on hover */}
              <span
                role="tooltip"
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-slate-900 dark:bg-slate-800 text-white text-xs sm:text-sm rounded-lg shadow-xl p-3 border border-slate-700 dark:border-slate-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none text-left"
              >
                <div className="font-semibold text-rose-400 mb-1">คำแนะนำการแก้ไข</div>
                <div className="text-slate-200 leading-relaxed text-xs">{correction.explanation}</div>
                {/* Arrow for the tooltip */}
                <svg className="absolute text-slate-900 dark:text-slate-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                   <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
                </svg>
              </span>
            </span>
          );
        } else {
          // Otherwise, it's a normal part of the text, render it as a fragment.
          return <React.Fragment key={index}>{part}</React.Fragment>;
        }
      })}
    </>
  );
};

export default CorrectedTextDisplay;
