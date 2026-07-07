import React, { useState } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ignoreList: string[];
  onAddWord: (word: string) => void;
  onRemoveWord: (word: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, ignoreList, onAddWord, onRemoveWord }) => {
  const [newWord, setNewWord] = useState('');

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWord.trim()) {
      onAddWord(newWord);
      setNewWord('');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700 p-6 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside
      >
        <div className="flex justify-between items-center">
          <h2 id="settings-modal-title" className="text-xl font-semibold text-slate-800 dark:text-slate-200">
            รายการคำที่ละเว้น
          </h2>
          <button 
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <p className="text-sm text-slate-500 dark:text-slate-400 -mt-4">
          คำหรือวลีในรายการนี้จะไม่ถูกทำเครื่องหมายว่าเป็นข้อผิดพลาด (ไม่คำนึงถึงตัวพิมพ์เล็ก-ใหญ่)
        </p>

        <form onSubmit={handleAddWord} className="flex gap-2">
          <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder="เพิ่มคำใหม่..."
            className="flex-grow bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <button type="submit" className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50" disabled={!newWord.trim()}>
            เพิ่ม
          </button>
        </form>
        
        <div className="flex-grow overflow-y-auto max-h-60 border-t border-b border-slate-200 dark:border-slate-700 -mx-6 px-6 py-4">
          {ignoreList.length > 0 ? (
            <ul className="space-y-2">
              {ignoreList.map((word) => (
                <li key={word} className="flex items-center justify-between bg-slate-100 dark:bg-slate-900/50 p-2 rounded-md">
                  <span className="text-slate-700 dark:text-slate-300">{word}</span>
                  <button 
                    onClick={() => onRemoveWord(word)} 
                    className="h-6 w-6 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                    aria-label={`Remove ${word} from ignore list`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-slate-500 dark:text-slate-400 py-4">รายการละเว้นของคุณว่างเปล่า</p>
          )}
        </div>
        
        <button
          onClick={onClose}
          className="w-full sm:w-auto self-end px-6 py-2 font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          เสร็จสิ้น
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;