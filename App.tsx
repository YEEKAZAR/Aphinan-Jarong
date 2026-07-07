import React, { useState, useCallback, useEffect } from 'react';
import { checkThaiSpelling, extractTextFromImage } from './services/geminiService';
import type { Correction, HistoryEntry } from './types';
import Loader from './components/Loader';
import ResultCard from './components/ResultCard';
import CorrectedTextDisplay from './components/CorrectedTextDisplay';
import { useTheme } from './hooks/useTheme';
import { useHistory } from './hooks/useHistory';
import { useIgnoreList } from './hooks/useIgnoreList';
import HistorySidebar from './components/HistorySidebar';
import Tabs from './components/Tabs';
import ImageUploader from './components/ImageUploader';
import SettingsModal from './components/SettingsModal';
import Header from './components/Header';

const EXAMPLE_TEXTS = [
  'เดวไปกินข้าวนะ',
  'เทอน่ารักมากเลย',
  'พรุ่งนี้เจอกันน่ะค่ะ',
  'ผลลัพมันออกมาดีมาก',
  'สังเกตุการณ์ได้ว่าท้องฟ้าวันนี้สดใส'
];

type InputMode = 'text' | 'image';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64String = result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = error => reject(error);
    });
};

const App: React.FC = () => {
  const [theme, toggleTheme] = useTheme();
  const { history, addHistoryEntry, clearHistory } = useHistory();
  const [ignoreList, addIgnoreWord, removeIgnoreWord] = useIgnoreList();
  
  const [inputText, setInputText] = useState<string>('');
  const [corrections, setCorrections] = useState<Correction[] | null>(null);
  const [correctedText, setCorrectedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [enabledCorrections, setEnabledCorrections] = useState<Set<string>>(new Set());
  
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isExtractingText, setIsExtractingText] = useState<boolean>(false);
  const [exampleIndex, setExampleIndex] = useState<number>(0);

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const resetState = (clearInput: boolean = false) => {
    if (clearInput) {
      setInputText('');
      setImagePreview(null);
    }
    setCorrections(null);
    setCorrectedText('');
    setError(null);
    setEnabledCorrections(new Set());
  };

  const handleTabChange = (mode: InputMode) => {
    if (mode === inputMode) return;
    setInputMode(mode);
    resetState(true);
  };

  const handleFileSelect = async (file: File, previewUrl: string) => {
    setImagePreview(previewUrl);
    setIsExtractingText(true);
    setError(null);
    resetState(); // Clear previous corrections

    try {
        const base64Data = await fileToBase64(file);
        const extracted = await extractTextFromImage(base64Data, file.type);
        setInputText(extracted || 'ไม่พบข้อความในรูปภาพ');
        setInputMode('text'); // Switch back to text view to show result
    } catch (err) {
        setError('เกิดข้อผิดพลาดในการดึงข้อความจากรูปภาพ');
        console.error(err);
        setInputMode('text'); // Switch back even on error
    } finally {
        setIsExtractingText(false);
    }
  };

  const applyCorrections = (originalText: string, correctionList: Correction[]): string => {
    if (!correctionList || correctionList.length === 0 || !originalText) {
      return originalText;
    }
    const correctionMap = new Map(correctionList.map(c => [c.original, c.correction]));
    const regex = new RegExp(
      Array.from(correctionMap.keys())
        .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|'),
      'g'
    );
    return originalText.replace(regex, (matched) => correctionMap.get(matched) || matched);
  };

  const processAndSetResults = useCallback((originalText: string, correctionResult: Correction[]) => {
      setCorrections(correctionResult);
      const initialEnabled = new Set(correctionResult.map(c => c.original));
      setEnabledCorrections(initialEnabled);
      const newCorrectedText = applyCorrections(originalText, correctionResult);
      return { correctedText: newCorrectedText, corrections: correctionResult };
  }, []);

  // Recalculate corrected text whenever the enabled corrections change, input text changes, or ignoreList changes
  useEffect(() => {
    if (corrections) {
      const activeCorrections = corrections.filter(c => 
        enabledCorrections.has(c.original) &&
        !ignoreList.some(ignored => ignored.toLowerCase() === c.original.toLowerCase())
      );
      const newCorrectedText = applyCorrections(inputText, activeCorrections);
      setCorrectedText(newCorrectedText);
    }
  }, [enabledCorrections, corrections, inputText, ignoreList]);

  const handleToggleCorrection = (originalWord: string) => {
    setEnabledCorrections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(originalWord)) {
        newSet.delete(originalWord);
      } else {
        newSet.add(originalWord);
      }
      return newSet;
    });
  };
  
  const handleCorrectionChange = (originalWord: string, newCorrection: string) => {
    if (!corrections) return;

    // Do not allow blank corrections
    const finalCorrection = newCorrection.trim() === '' ? originalWord : newCorrection.trim();

    const newCorrections = corrections.map(c =>
      c.original === originalWord
        ? { ...c, correction: finalCorrection }
        : c
    );
    setCorrections(newCorrections);
  };

  const handleCheckSpelling = useCallback(async () => {
    if (!inputText.trim()) {
      setError('กรุณาป้อนข้อความที่ต้องการตรวจสอบ');
      return;
    }
    setIsLoading(true);
    resetState(); 

    try {
      const result = await checkThaiSpelling(inputText, 0.2);
      const { correctedText: newCorrectedText, corrections: newCorrections } = processAndSetResults(inputText, result);
      
      // Calculate active corrections for history entry, filtered by ignoreList
      const filteredCorrections = newCorrections.filter(c => 
        !ignoreList.some(ignored => ignored.toLowerCase() === c.original.toLowerCase())
      );
      
      addHistoryEntry({
        originalText: inputText,
        correctedText: applyCorrections(inputText, filteredCorrections),
        corrections: filteredCorrections,
      });

    } catch (err) {
      setError('เกิดข้อผิดพลาดในการสื่อสารกับ AI กรุณาลองใหม่อีกครั้ง');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, processAndSetResults, addHistoryEntry, ignoreList]);

  const handleCopy = () => {
    if(!correctedText) return;
    navigator.clipboard.writeText(correctedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleUseExample = () => {
    setInputMode('text');
    resetState(true);
    setInputText(EXAMPLE_TEXTS[exampleIndex]);
    setExampleIndex((prevIndex) => (prevIndex + 1) % EXAMPLE_TEXTS.length);
  };
  
  const handleSelectHistoryItem = (entry: HistoryEntry) => {
    setInputText(entry.originalText);
    setCorrections(entry.corrections);
    setEnabledCorrections(new Set(entry.corrections.map(c => c.original)));
    setError(null);
  };

  const handleDownload = () => {
    if (!correctedText) return;
    const blob = new Blob([correctedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'corrected_text.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearText = () => {
    resetState(true);
  };
  
  // Dynamic filtered lists
  const activeCorrections = corrections 
    ? corrections.filter(c => 
        enabledCorrections.has(c.original) &&
        !ignoreList.some(ignored => ignored.toLowerCase() === c.original.toLowerCase())
      ) 
    : [];

  const visibleCorrections = corrections 
    ? corrections.filter(c => 
        !ignoreList.some(ignored => ignored.toLowerCase() === c.original.toLowerCase())
      ) 
    : [];

  const charCount = inputText.length;
  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100 font-sans flex flex-col transition-colors duration-300">
      
      {/* Header */}
      <Header 
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleHistory={() => setShowHistory(prev => !prev)}
        historyCount={history.length}
      />

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-grow flex flex-col relative">
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: Input Workspace (lg:col-span-6) */}
          <section className="lg:col-span-6 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200/85 dark:border-slate-800/85 flex flex-col min-h-[520px]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <Tabs activeTab={inputMode} onTabChange={handleTabChange} />
              
              {/* Reset/Clear Button */}
              {inputText && (
                <button 
                  onClick={handleClearText}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium cursor-pointer"
                  title="ล้างข้อความทั้งหมด"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>ล้างจอ</span>
                </button>
              )}
            </div>

            {inputMode === 'text' ? (
              <div className="flex flex-col flex-grow">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    ข้อความต้นฉบับ
                  </h2>
                  <div className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950/60 px-2 py-1 rounded-md border border-slate-200/40 dark:border-slate-800/40">
                    <span>{charCount} ตัวอักษร</span>
                    <span className="mx-1.5">|</span>
                    <span>{wordCount} คำ</span>
                  </div>
                </div>

                <div className="relative flex-grow min-h-[320px] sm:min-h-[380px] flex flex-col">
                  <textarea
                    value={inputText}
                    onChange={(e) => {
                        setInputText(e.target.value);
                        if (error) setError(null);
                    }}
                    className="w-full flex-grow p-4 bg-slate-50/50 dark:bg-slate-950/40 focus:bg-white dark:focus:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-2 focus:ring-blue-500/10 dark:focus:ring-cyan-500/10 rounded-xl transition-all duration-200 resize-none focus:outline-none text-slate-700 dark:text-slate-200 text-sm sm:text-base leading-relaxed"
                    disabled={isLoading || isExtractingText}
                    placeholder="พิมพ์หรือวางบทความ ข่าว หรือข้อความของคุณที่นี่ เพื่อตรวจสอบคำสะกดภาษาไทย..."
                    aria-label="Input text for spell checking"
                  />
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                        onClick={handleUseExample}
                        disabled={isLoading || isExtractingText}
                        className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        ใช้ตัวอย่างทดสอบ
                    </button>
                    <button
                      onClick={handleCheckSpelling}
                      disabled={isLoading || isExtractingText || !inputText.trim()}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader />
                          <span>กำลังตรวจสอบ...</span>
                        </div>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>ตรวจคำผิดด้วย AI</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col flex-grow items-center justify-center py-8">
                  <div className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-cyan-400 mb-3 border border-blue-100 dark:border-blue-900/30">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">อัปโหลดรูปภาพเพื่อดึงข้อความ (OCR)</h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 text-center max-w-sm">
                    อัปโหลดรูปภาพเอกสาร ข่าวสิ่งพิมพ์ หรือภาพแคปหน้าจอ เพื่อให้ AI ดึงข้อความภาษาไทยเข้าสู่ระบบโดยอัตโนมัติ
                  </p>
                  <ImageUploader 
                      onFileSelect={handleFileSelect} 
                      imagePreview={imagePreview}
                      isLoading={isExtractingText}
                  />
              </div>
            )}
          </section>

          {/* Right Panel: Proofing Hub (lg:col-span-6) */}
          <section className="lg:col-span-6 flex flex-col gap-6">
            
            {/* Loading or Extracting text animation */}
            {isLoading || isExtractingText ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center min-h-[520px] text-center">
                <div className="relative mb-6">
                  <div className="h-16 w-16 rounded-full border-4 border-blue-100 dark:border-blue-950/60 animate-pulse"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-6 w-6 rounded-full bg-blue-600 dark:bg-cyan-500 animate-ping opacity-75"></div>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
                  {isLoading ? 'กำลังวิเคราะห์พิสูจน์อักษร...' : 'กำลังประมวลผลข้อความจากรูปภาพ...'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                  ระบบ AI กำลังตรวจหาคำผิด ไวยากรณ์ คำทับศัพท์ภาษาอังกฤษ และเปรียบเทียบชื่อเฉพาะที่ถูกต้อง... โปรดรอสักครู่
                </p>
              </div>
            ) : error ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center min-h-[520px] text-center">
                <div className="h-14 w-14 rounded-full bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-500 mb-4 border border-rose-100 dark:border-rose-900/30">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">เกิดข้อผิดพลาด</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
                  {error}
                </p>
                <button 
                  onClick={() => setError(null)}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  ลองใหม่อีกครั้ง
                </button>
              </div>
            ) : correctedText ? (
              
              /* RESULTS RECEIVED */
              <div className="flex flex-col gap-6">
                
                {/* 1. Corrected Text View Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col">
                  <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">ข้อความที่ปรับปรุงแล้ว</h3>
                    </div>
                    
                    {/* Clipboard and Download Actions */}
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={handleCopy} 
                        disabled={!correctedText} 
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border cursor-pointer ${
                          copied
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                        }`}
                      >
                        {copied ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>คัดลอกแล้ว</span>
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            <span>คัดลอก</span>
                          </>
                        )}
                      </button>

                      <button 
                        onClick={handleDownload} 
                        disabled={!correctedText} 
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 transition-all cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>ดาวน์โหลด .txt</span>
                      </button>
                    </div>
                  </div>

                  {/* High Quality Rich-text Corrected text box */}
                  <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/80 dark:border-slate-850 rounded-xl p-4 sm:p-5 whitespace-pre-wrap text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed overflow-y-auto max-h-[300px] min-h-[140px] focus:outline-none">
                    <CorrectedTextDisplay
                      originalText={inputText}
                      corrections={activeCorrections}
                      onUpdateCorrection={handleCorrectionChange}
                    />
                  </div>

                  <p className="mt-3 text-2xs text-slate-400 dark:text-slate-500 flex items-start gap-1">
                    <span className="text-blue-500 dark:text-cyan-400 font-bold">💡 ทริค:</span>
                    <span>คุณสามารถคลิกที่คำที่เป็นตัวหนาสีเขียวเพื่อแก้ไขคำเฉพาะ หรือเลือกที่จะยกเว้นการแก้ไขได้ที่รายการคำแนะนำด้านล่าง</span>
                  </p>
                </div>

                {/* 2. Suggestions list container */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base pb-3 border-b border-slate-100 dark:border-slate-800 mb-4 flex items-center justify-between">
                    <span>รายการตรวจสอบคำผิด</span>
                    {visibleCorrections.length > 0 && (
                      <span className="text-xs px-2.5 py-1 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-full border border-rose-100/60 dark:border-rose-900/20 font-bold">
                        พบ {visibleCorrections.length} จุดผิดพลาด
                      </span>
                    )}
                  </h3>

                  {visibleCorrections.length > 0 ? (
                    <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1.5 -mr-1.5">
                      {visibleCorrections.map((correction) => (
                        <ResultCard 
                          key={correction.original} 
                          correction={correction} 
                          isChecked={enabledCorrections.has(correction.original)}
                          onToggle={() => handleToggleCorrection(correction.original)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 border border-emerald-100 dark:border-emerald-900/30 animate-bounce">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h4 className="text-base font-bold text-emerald-600 dark:text-emerald-400">สะกดถูกต้องทั้งหมด!</h4>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                        ยอดเยี่ยมมาก! ไม่พบข้อผิดพลาดในการสะกดคำหรือข้อบกพร่องตามพจนานุกรมในเนื้อหาข่าวชิ้นนี้
                      </p>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              
              /* EMPTY IDLE STATE (Guide user) */
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col items-center justify-center min-h-[520px] text-center">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-50 to-cyan-50 dark:from-slate-800/80 dark:to-slate-800/40 flex items-center justify-center text-blue-600 dark:text-cyan-400 mb-5 border border-slate-200/50 dark:border-slate-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
                  พร้อมสำหรับพิสูจน์อักษร
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
                  ป้อนบทความหรือวางข่าวสารของคุณในช่องซ้ายมือ แล้วกดปุ่ม <span className="font-semibold text-blue-600 dark:text-cyan-400">"ตรวจคำผิดด้วย AI"</span> เพื่อวิเคราะห์ความถูกต้องและสะกดคำ
                </p>

                <div className="w-full max-w-sm border-t border-slate-100 dark:border-slate-800 pt-5 text-left space-y-3.5">
                  <div className="flex gap-2.5 items-start">
                    <span className="text-emerald-500 font-bold text-sm mt-0.5">✔</span>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">ความแม่นยำสูงสไตล์งานข่าว</p>
                      <p className="text-2xs text-slate-400 dark:text-slate-500">กรองตัวสะกด ไวยากรณ์ และชื่อเฉพาะอย่างพิถีพิถัน</p>
                    </div>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="text-emerald-500 font-bold text-sm mt-0.5">✔</span>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">คัดกรองคำเฉพาะและคำทับศัพท์</p>
                      <p className="text-2xs text-slate-400 dark:text-slate-500">รองรับพรรคการเมือง รัฐบุรุษ สถานที่ท่องเที่ยว และคำไอทีสมัยใหม่</p>
                    </div>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="text-emerald-500 font-bold text-sm mt-0.5">✔</span>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">ดึงข้อความจากภาพถ่าย (OCR)</p>
                      <p className="text-2xs text-slate-400 dark:text-slate-500">แคปหน้าจอข่าวหรือเอกสารแล้วอัปโหลดได้ทันที</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

        </main>
      </div>

      {/* Sliding History Sidebar (Drawer) */}
      <div className={`fixed inset-y-0 right-0 z-40 w-full max-w-sm bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
        <HistorySidebar 
          history={history}
          onSelectItem={handleSelectHistoryItem}
          onClearHistory={clearHistory}
          currentInput={inputText}
          onClose={() => setShowHistory(false)}
        />
      </div>

      {/* Backdrop for Sidebar */}
      {showHistory && (
        <div 
          onClick={() => setShowHistory(false)} 
          className="fixed inset-0 bg-black/50 backdrop-blur-2xs z-35 transition-opacity cursor-pointer" 
        />
      )}

      {/* Settings Modal (Ignore list) */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        ignoreList={ignoreList}
        onAddWord={addIgnoreWord}
        onRemoveWord={removeIgnoreWord}
      />

    </div>
  );
};

export default App;
