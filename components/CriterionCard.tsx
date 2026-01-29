import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CriterionResult } from '../types';
import { getRewriteSuggestion } from '../services/geminiService';

interface CriterionCardProps {
  criterion: CriterionResult;
  essayContext: string;
  rubricContext: string;
  isFocused?: boolean;
  isHighlighted?: boolean;
  isExpanded?: boolean;
  viewMode?: 'list' | 'feedback' | 'review';
  onFocus?: () => void;
  onLocate?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onToggleExpand?: () => void;
  onViewModeChange?: (mode: 'list' | 'feedback') => void;
  onOverride?: (status: 'met' | 'weak' | 'missing' | undefined) => void;
}

const REWRITE_PHRASES = [
  "Thinking of new ideas...",
  "Polishing sentences...",
  "Checking the flow...",
  "Applying the rules...",
  "Trying different words...",
  "Finalizing suggestions..."
];

export const CriterionCard: React.FC<CriterionCardProps> = ({ 
  criterion, 
  essayContext, 
  rubricContext,
  isFocused = false,
  isHighlighted = false,
  isExpanded = true,
  viewMode = 'list',
  onFocus,
  onLocate,
  onMouseEnter,
  onMouseLeave,
  onToggleExpand,
  onViewModeChange,
  onOverride
}) => {
  const [isRewriting, setIsRewriting] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showOverrideMenu, setShowOverrideMenu] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const overrideMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFocused) {
      if (viewMode === 'list') {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } 
    }
  }, [isFocused, viewMode]);

  useEffect(() => {
    let interval: number;
    if (isRewriting) {
      interval = window.setInterval(() => {
        setPhraseIndex(prev => (prev + 1) % REWRITE_PHRASES.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isRewriting]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overrideMenuRef.current && !overrideMenuRef.current.contains(event.target as Node)) {
        setShowOverrideMenu(false);
      }
    };
    if (showOverrideMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOverrideMenu]);

  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cleanEvidence = (ev: string) => ev.replace(/^(Topic Sentence \d+:|Evidence:|Quote:|Context:)\s*/i, '').replace(/^["'“”]|["'“”]$/g, '').trim();

  const isLocatable = useMemo(() => {
    if (criterion.visual_coordinates) return true;
    if (!criterion.evidence || criterion.evidence.length < 5) return false;
    
    const target = cleanEvidence(criterion.evidence);
    const words = target.split(/[^a-zA-Z0-9]+/).filter(w => w.length > 0);
    if (words.length === 0) return false;

    const flexibleRegexStr = words.map(w => escapeRegExp(w)).join('[^a-zA-Z0-9]+');
    const regex = new RegExp(flexibleRegexStr, 'i');
    return regex.test(essayContext);
  }, [criterion.evidence, essayContext, criterion.visual_coordinates]);

  const currentStatus = criterion.userStatus || criterion.status;

  const statusColors = {
    met: 'bg-green-100 text-green-800 border-green-200',
    weak: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    missing: 'bg-red-50 text-red-900 border-red-200',
  };

  const statusAccentColors = {
    met: 'border-green-500',
    weak: 'border-yellow-500',
    missing: 'border-red-500',
  };

  const handleHeaderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand?.();
    if (onFocus) onFocus();
  };

  const handleRewrite = async () => {
    if (suggestions.length > 0) {
      setSuggestions([]);
      return;
    }
    setIsRewriting(true);
    try {
      const results = await getRewriteSuggestion(criterion, essayContext, rubricContext);
      setSuggestions(results);
    } catch (e) {
      setSuggestions(["Sorry, I couldn't think of anything right now."]);
    } finally {
      setIsRewriting(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const hasEvidence = !!criterion.evidence && criterion.evidence.length > 5;
  const shouldBulge = isFocused && viewMode === 'list';

  return (
    <div 
      ref={cardRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`border rounded-xl mb-4 transition-all duration-300 relative scroll-mt-24 overflow-visible ${
        shouldBulge 
          ? `shadow-2xl ring-4 ring-stone-100 z-30 bg-white border-stone-800 border-l-8 ${statusAccentColors[currentStatus]}` 
          : isExpanded 
            ? 'bg-white shadow-sm border-stone-200' 
            : 'bg-stone-50 border-stone-200 opacity-80 hover:opacity-100'
      }`}
    >
      <div 
        onClick={handleHeaderClick}
        className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-stone-50 transition-colors rounded-t-xl"
      >
        <div className="flex items-center gap-3 flex-1 overflow-visible">
          {/* Static Badge on left */}
          <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusColors[currentStatus]}`}>
            {currentStatus === 'met' ? 'Good' : currentStatus}
          </div>
          
          <div className="flex flex-col">
            <h3 className={`font-bold transition-colors leading-tight ${shouldBulge ? 'text-stone-900' : 'text-stone-700'}`}>{criterion.criterion}</h3>
            {criterion.userStatus && (
              <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest mt-0.5">Corrected by you</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3" ref={overrideMenuRef}>
          {/* Dedicated Override Trigger */}
          <div className="relative group/override-btn">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowOverrideMenu(!showOverrideMenu); }}
              className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 transition-all shadow-sm flex items-center gap-2.5 group/btn-inner active:scale-95"
            >
               <svg className="w-3.5 h-3.5 text-stone-600 group-hover/btn-inner:text-stone-900 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"></path>
                 <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
               </svg>
               <span className="text-[10px] font-black uppercase text-stone-700 group-hover/btn-inner:text-stone-900 tracking-[0.1em]">OVERRIDE</span>
            </button>

            {/* Hover Explainer Tooltip - Dropdown below button, hides if menu is open */}
            <div className={`absolute top-full right-0 mt-3 w-56 p-3.5 bg-black text-white text-[11px] rounded-2xl shadow-2xl transition-all duration-300 z-[100] border border-stone-800 leading-relaxed font-sans translate-y-[-4px] pointer-events-none ${
              showOverrideMenu 
                ? 'opacity-0' 
                : 'opacity-0 group-hover/override-btn:opacity-100 group-hover/override-btn:translate-y-0'
            }`}>
               <div className="absolute bottom-full right-8 border-[8px] border-transparent border-b-black"></div>
               <p className="font-black mb-1.5 text-stone-400 uppercase tracking-widest text-[9px]">Manual Override</p>
               Is the AI wrong? Use this button to manually fix the status. Your overall score will update instantly based on your corrections.
            </div>

            {showOverrideMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-stone-200 p-1.5 z-[110] animate-fade-in origin-top-right">
                <div className="px-2 py-2 mb-1 border-b border-stone-100">
                   <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest">AI was wrong? Change to:</span>
                </div>
                {(['met', 'weak', 'missing'] as const).map(s => (
                  <button 
                    key={s}
                    onClick={(e) => { e.stopPropagation(); onOverride?.(s); setShowOverrideMenu(false); }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-between transition-all mb-0.5 ${currentStatus === s ? 'bg-stone-100 text-stone-900 shadow-inner' : 'text-stone-500 hover:bg-stone-50 hover:pl-4'}`}
                  >
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${s === 'met' ? 'bg-green-500' : s === 'weak' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                       {s === 'met' ? 'GOOD' : s}
                    </div>
                    {currentStatus === s && <svg className="w-3 h-3 text-stone-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                  </button>
                ))}
                {criterion.userStatus && (
                   <button 
                     onClick={(e) => { e.stopPropagation(); onOverride?.(undefined); setShowOverrideMenu(false); }}
                     className="w-full text-left px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors mt-1 border-t border-stone-100"
                   >
                     Reset to Original
                   </button>
                )}
              </div>
            )}
          </div>

          <div className="text-stone-300 transform transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 pt-0 border-t border-stone-100 animate-fade-in overflow-hidden rounded-b-xl">
          <div className="grid grid-cols-1 gap-4 mt-4">
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Feedback</span>
              <p className="text-stone-700 leading-relaxed text-sm">{criterion.why}</p>
            </div>

            {(hasEvidence || criterion.visual_coordinates) && (
              <div className={`p-5 rounded-2xl border-l-[6px] group/evidence relative ${currentStatus === 'met' ? 'bg-green-50/50 border-green-500' : currentStatus === 'weak' ? 'bg-yellow-50/50 border-yellow-500' : 'bg-red-50/50 border-red-500'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] block">
                    {criterion.visual_coordinates ? 'Location on Project' : 'Relevant Text'}
                  </span>
                  
                  {viewMode === 'review' && (
                    <div className="relative group/tooltip">
                      <button 
                        disabled={!isLocatable}
                        onClick={(e) => { 
                          if (!isLocatable) return;
                          e.stopPropagation(); 
                          if (!isHighlighted) {
                            cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                          onLocate?.(); 
                        }}
                        className={`text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 px-3 py-1.5 rounded-lg border shadow-sm active:scale-95 ${
                          !isLocatable 
                            ? 'text-stone-300 bg-transparent border-stone-100 opacity-50 cursor-not-allowed'
                            : isHighlighted 
                              ? 'text-white bg-black border-black shadow-md'
                              : 'text-black bg-white border-black hover:bg-black hover:text-white'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        Find it
                      </button>
                    </div>
                  )}
                </div>

                {criterion.visual_coordinates ? (
                  <div className="space-y-3">
                    <p className="text-stone-700 text-[13px] font-medium leading-relaxed">
                      This feedback is pointed at a specific spot in your project.
                    </p>
                    {viewMode === 'list' && (
                      <button 
                        onClick={() => onViewModeChange?.('feedback')}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors group/link"
                      >
                        <div className="w-5 h-5 bg-indigo-100 rounded flex items-center justify-center group-hover/link:bg-indigo-200 transition-colors">
                           <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="3" x2="12" y2="21"></line></svg>
                        </div>
                        See where this is in Feedback Mode
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-stone-700 italic text-sm font-serif leading-relaxed">"{criterion.evidence}"</p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              {currentStatus !== 'met' && (
                <>
                  <div className="bg-stone-900 text-stone-50 p-5 rounded-2xl shadow-xl border-t-4 border-yellow-500/30">
                    <div className="flex items-start gap-3">
                        <div className="w-7 h-7 bg-stone-800 rounded-lg flex items-center justify-center text-yellow-500 border border-stone-700 shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                        </div>
                        <div className="flex-1">
                          <span className="text-[9px] font-black text-stone-500 uppercase tracking-[0.3em] block mb-1.5">How to fix it</span>
                          <p className="font-medium text-[13px] text-stone-100 leading-relaxed">{criterion.exact_fix}</p>
                        </div>
                    </div>
                  </div>

                  <button 
                    onClick={(e) => { e.stopPropagation(); handleRewrite(); }}
                    disabled={isRewriting}
                    className="group flex items-center justify-center gap-2.5 px-6 py-4 border border-stone-200 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 bg-white text-stone-600 hover:bg-black hover:text-white hover:border-black relative overflow-hidden"
                  >
                    {isRewriting ? (
                      <div className="flex items-center gap-2">
                        <svg className="animate-spin h-3 w-3 text-stone-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span>{REWRITE_PHRASES[phraseIndex]}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500 group-hover:text-yellow-400 transition-colors"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                        <span>{suggestions.length > 0 ? 'Hide Improvement Ideas' : 'Get Ideas on how to fix this'}</span>
                      </div>
                    )}
                  </button>

                  {suggestions.length > 0 && (
                    <div className="mt-2 space-y-3 animate-fade-in px-1">
                      <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
                         Try one of these solutions
                         <div className="h-px flex-1 bg-stone-100"></div>
                      </div>
                      {suggestions.map((s, i) => (
                        <button 
                          key={i} 
                          onClick={() => copyToClipboard(s, i)}
                          className={`w-full text-left p-5 rounded-2xl transition-all group/sugg border ${
                            copiedIndex === i 
                              ? 'bg-green-50 border-green-500 shadow-inner translate-x-1' 
                              : 'bg-stone-50 border-stone-200 hover:bg-white hover:border-black hover:shadow-xl hover:-translate-y-1'
                          }`}
                        >
                          <p className={`text-sm leading-relaxed font-serif italic mb-3 transition-colors ${copiedIndex === i ? 'text-green-800' : 'text-stone-700'}`}>"{s}"</p>
                          <div className={`flex justify-end transition-opacity duration-200 ${copiedIndex === i ? 'opacity-100' : 'opacity-0 group-hover/sugg:opacity-100'}`}>
                             <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${copiedIndex === i ? 'text-green-700' : 'text-stone-400'}`}>
                                {copiedIndex === i ? (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                                    Copy Idea
                                  </>
                                )}
                             </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
