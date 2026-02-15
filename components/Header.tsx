import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult } from '../types';

interface HeaderProps {
  showStartOver?: boolean;
  onStartOver?: () => void;
  result?: AnalysisResult | null;
  isStrict?: boolean;
  essayExplanation?: string;
  onShowWelcome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ showStartOver, onStartOver, result, isStrict, essayExplanation, onShowWelcome }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowSaveMenu(false);
      }
    };

    if (showSaveMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSaveMenu]);

  const handleStartOver = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onStartOver?.();
  };

  const getExportText = () => {
    if (!result) return "";
    const { summary, criteria } = result;
    const explanationText = essayExplanation ? `\nOPTIONAL EXPLANATION:\n"${essayExplanation}"\n` : "";
    return `RUBRIC CHECK RESULTS${isStrict ? ' (STRICT MODE)' : ''}\nSCORE: ${summary.score}/100\nAI ESTIMATE: ${summary.ai_score}%\n${explanationText}\nSUMMARY\nMet: ${summary.met}\nWeak: ${summary.weak}\nMissing: ${summary.missing}\n\nTOP FIXES:\n${summary.top_fixes.map((f, i) => `${i+1}. ${f.fix} (${f.reason})`).join('\n')}\n\nDETAILED BREAKDOWN:\n\n${criteria.map(c => `[${c.status.toUpperCase()}] ${c.criterion}\nWhy: ${c.why}\nFix: ${c.exact_fix}\nEvidence: "${c.evidence}"`).join('\n\n')}`;
  };

  const handleDownloadTxt = () => {
    const textContent = getExportText();
    if (!textContent) return;
    
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const dateStr = new Date().toISOString().slice(0, 10);
    const strictLabel = isStrict ? '_strict' : '';
    a.download = `RubricCheck_Feedback_${dateStr}${strictLabel}.txt`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    const textContent = getExportText();
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#fdfbf7] border-b border-stone-200 transition-all duration-300 min-h-[90px] w-full shadow-none">
      <div className="max-w-6xl mx-auto w-full px-6 md:px-10 h-full flex items-center justify-between min-h-[90px]">
        {/* LEFT COLUMN (Balanced Spacer) */}
        <div className="flex-1 hidden md:block"></div>

        {/* CENTER COLUMN (Branding Group) */}
        <div className="flex items-center gap-4 shrink-0 mx-auto md:mx-0">
          <div className="p-2 bg-stone-100 rounded-lg text-stone-600 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
              <path d="M2 2l7.586 7.586"></path>
              <circle cx="11" cy="11" r="2"></circle>
            </svg>
          </div>
          
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-ink tracking-tight">RubricCheck</h1>
              <button 
                onClick={onShowWelcome}
                className="w-7 h-7 rounded-full bg-white border border-stone-200 text-stone-400 hover:text-stone-900 hover:border-stone-400 transition-all active:scale-95 group relative flex items-center justify-center shadow-sm"
                aria-label="How it works"
              >
                <svg className="relative z-10" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span className="absolute left-1/2 -bottom-10 -translate-x-1/2 px-3 py-1.5 bg-black text-white text-[9px] font-black uppercase tracking-[0.15em] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-y-2 group-hover:translate-y-0 shadow-xl whitespace-nowrap z-[60]">
                  How it works
                </span>
              </button>
            </div>
            <p className="text-[11px] text-stone-400 font-bold uppercase tracking-[0.15em] mt-0.5">
              Work checks made simple.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN (Actions) */}
        <div className="flex-1 flex items-center justify-end gap-2">
          {result && (
            <>
               <button 
                 onClick={handleCopy}
                 className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border rounded-lg transition-all shadow-sm active:scale-95 ${
                   isCopied 
                     ? 'bg-green-100 text-green-700 border-green-200' 
                     : 'text-stone-600 bg-white border-stone-300 hover:bg-stone-50'
                 }`}
                 title="Copy Summary"
               >
                 {isCopied ? (
                   <>
                     <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                     <span className="hidden lg:inline">Copied</span>
                   </>
                 ) : (
                   <>
                     <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                     <span className="hidden lg:inline">Copy</span>
                   </>
                 )}
               </button>

               <div className="relative" ref={menuRef}>
                  <button 
                     onClick={() => setShowSaveMenu(!showSaveMenu)}
                     className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-stone-600 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-all shadow-sm active:scale-95"
                     title="Save Options"
                  >
                      <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      <span className="hidden lg:inline">Save</span>
                      <svg className={`w-3 h-3 text-stone-400 transition-transform duration-200 ${showSaveMenu ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </button>

                  {showSaveMenu && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-stone-200 p-1.5 z-50 animate-fade-in origin-top-right">
                       <button 
                         onClick={() => { handleDownloadTxt(); setShowSaveMenu(false); }} 
                         className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-lg transition-colors group"
                       >
                         <div className="p-1.5 bg-stone-100 rounded-md group-hover:bg-white transition-colors">
                            <svg className="w-4 h-4 text-stone-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                         </div>
                         <div>
                            <span className="block text-stone-800 font-bold">Text File</span>
                            <span className="block text-[10px] text-stone-400 font-normal">.txt</span>
                         </div>
                       </button>
                       <div className="h-px bg-stone-100 my-1 mx-2"></div>
                       <div className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-xs font-medium text-stone-400 cursor-not-allowed rounded-lg transition-colors group opacity-60">
                         <div className="p-1.5 bg-stone-50 rounded-md">
                            <svg className="w-4 h-4 text-stone-300" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M10 13l2 2 2-2"></path><path d="M12 10v5"></path></svg>
                         </div>
                         <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                               <span className="block text-stone-500 font-bold">PDF Document</span>
                               <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter shrink-0">Coming Soon</span>
                            </div>
                            <span className="block text-[10px] text-stone-300 font-normal">.pdf (High Res)</span>
                         </div>
                       </div>
                    </div>
                  )}
               </div>
               <div className="w-px h-6 bg-stone-200 mx-1"></div>
            </>
          )}

          {showStartOver && (
            <button
              onClick={handleStartOver}
              className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-bold text-stone-600 bg-white border border-stone-300 rounded-lg hover:bg-stone-800 hover:text-white hover:border-stone-800 transition-all shadow-sm active:scale-95"
              title="Reset"
            >
              <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
              <span className="hidden sm:inline">Start Over</span>
              <span className="sm:hidden">Reset</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};