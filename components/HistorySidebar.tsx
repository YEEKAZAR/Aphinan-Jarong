import React from 'react';
import type { HistoryEntry } from '../types';

interface HistorySidebarProps {
  history: HistoryEntry[];
  onSelectItem: (entry: HistoryEntry) => void;
  onClearHistory: () => void;
  currentInput: string;
  onClose?: () => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ 
  history, 
  onSelectItem, 
  onClearHistory, 
  currentInput,
  onClose
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">ประวัติการตรวจสอบ</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClearHistory}
            disabled={history.length === 0}
            className="text-xs font-semibold text-slate-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-40 transition-colors cursor-pointer"
            aria-label="Clear all history"
          >
            ล้างทั้งหมด
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors cursor-pointer"
              aria-label="Close sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-grow overflow-y-auto p-4 space-y-3">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">ยังไม่มีประวัติการใช้งาน</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {history.map((entry) => {
                const isActive = entry.originalText === currentInput && entry.correctedText;
                return (
                    <li key={entry.id}>
                        <button
                          onClick={() => {
                            onSelectItem(entry);
                            if (onClose) onClose();
                          }}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 focus:outline-none cursor-pointer ${
                            isActive 
                              ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-500 dark:border-cyan-500 shadow-sm' 
                              : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          aria-current={isActive ? 'true' : 'false'}
                        >
                          <p className="text-slate-700 dark:text-slate-300 font-medium truncate text-sm">
                              {entry.originalText}
                          </p>
                          <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
                              <span className="text-2xs font-medium text-slate-400 dark:text-slate-500">
                                  {new Date(entry.timestamp).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short'})}
                              </span>
                              <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${
                                  entry.corrections.length > 0 
                                    ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/20' 
                                    : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20'
                              }`}>
                                  {entry.corrections.length === 0 ? 'ถูกต้อง' : `ผิด ${entry.corrections.length} จุด`}
                              </span>
                          </div>
                        </button>
                    </li>
                );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default HistorySidebar;