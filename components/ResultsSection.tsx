
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AnalysisResult, AppState } from '../types';
import { CriterionCard } from './CriterionCard';
import { AnnotatedEssay } from './AnnotatedEssay';

interface ResultsSectionProps {
  result: AnalysisResult;
  appState: AppState;
  onViewModeChange: (mode: 'list' | 'feedback') => void;
  onOverride: (index: number, status: 'met' | 'weak' | 'missing' | undefined) => void;
}

export const ResultsSection: React.FC<ResultsSectionProps> = ({ result, appState, onViewModeChange, onOverride }) => {
  const { summary, criteria } = result;
  const { viewMode, essay, rubric, essayFiles } = appState;
  
  const [displayScore, setDisplayScore] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  
  // Controlled expansion state for all criteria cards
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({});

  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const isResizing = useRef(false);

  // Initialize all to expanded on first load of results
  useEffect(() => {
    const initial: Record<number, boolean> = {};
    criteria.forEach((_, i) => { initial[i] = true; });
    setExpandedIndices(initial);
  }, [result.criteria.length]);

  // Handle auto-expansion when focused
  useEffect(() => {
    if (focusedIndex !== null) {
      setExpandedIndices(prev => ({ ...prev, [focusedIndex]: true }));
    }
  }, [focusedIndex]);

  // Recalculate summary metrics based on overrides
  const adjustedMetrics = useMemo(() => {
    const counts = { met: 0, weak: 0, missing: 0 };
    criteria.forEach(c => {
      counts[c.userStatus || c.status]++;
    });
    
    const total = criteria.length;
    if (total === 0) return { ...counts, score: summary.score };
    
    const metVal = 1, weakVal = 0.5;
    const currentScore = Math.round(((counts.met * metVal) + (counts.weak * weakVal)) / total * 100);
    
    return { ...counts, score: currentScore };
  }, [criteria, summary.score]);

  useEffect(() => {
    setFocusedIndex(null);
    setHighlightedIndex(null);
  }, [viewMode]);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const targetScore = adjustedMetrics.score;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / 800, 1);
      setDisplayScore(Math.floor((1 - Math.pow(2, -10 * progress)) * targetScore));
      if (progress < 1) window.requestAnimationFrame(step);
      else setDisplayScore(targetScore);
    };
    window.requestAnimationFrame(step);
  }, [adjustedMetrics.score]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const container = document.getElementById('split-container');
    if (container) {
      const rect = container.getBoundingClientRect();
      setLeftPanelWidth(Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 20), 80));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const scrollToStatus = (status: 'met' | 'weak' | 'missing') => {
    const idx = criteria.findIndex(c => (c.userStatus || c.status) === status);
    if (idx !== -1) {
       setFocusedIndex(idx);
       if (viewMode === 'list') {
          const el = document.querySelector(`div[data-rubric-status="${status}"]`);
          if (el) {
             const offset = 100;
             const elementPosition = el.getBoundingClientRect().top + window.pageYOffset;
             window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
          }
       } else setHighlightedIndex(idx);
    }
  };

  const handleLocate = (idx: number) => {
    if (highlightedIndex === idx) {
      setHighlightedIndex(null);
    } else {
      setFocusedIndex(idx);
      setHighlightedIndex(idx);
    }
  };

  const toggleExpand = (idx: number) => {
    setExpandedIndices(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const expandAll = () => {
    const updated: Record<number, boolean> = {};
    criteria.forEach((_, i) => { updated[i] = true; });
    setExpandedIndices(updated);
  };

  const collapseAll = () => {
    const updated: Record<number, boolean> = {};
    criteria.forEach((_, i) => { updated[i] = false; });
    setExpandedIndices(updated);
  };

  const totalCriteria = criteria.length;
  const metWidth = (adjustedMetrics.met / totalCriteria) * 100;
  const weakWidth = (adjustedMetrics.weak / totalCriteria) * 100;
  const missingWidth = (adjustedMetrics.missing / totalCriteria) * 100;

  return (
    <div className="pt-6 animate-fade-in">
      {/* SUMMARY BOX */}
      <div className="bg-[#1c1a19] text-stone-50 rounded-[2.5rem] p-8 md:p-12 mb-12 border border-stone-800 overflow-visible relative">
        <div className="flex flex-col lg:flex-row gap-6 mb-10">
          <div className="flex-[1.6] bg-[#110f0e]/50 border border-stone-800 rounded-[2rem] p-10 flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-stone-700 to-transparent opacity-50"></div>
            <h4 className="text-[11px] font-black text-stone-500 uppercase tracking-[0.4em] mb-6">Current Score</h4>
            <div className={`text-[120px] md:text-[160px] font-black leading-none tabular-nums transition-colors duration-1000 ${displayScore >= 70 ? 'text-[#4ade80]' : displayScore >= 40 ? 'text-[#facc15]' : 'text-[#f87171]'}`}>
              {displayScore}
            </div>
            {adjustedMetrics.score !== summary.score && (
              <div className="mt-2 text-[10px] font-black uppercase text-stone-600 tracking-widest text-center">this is the score you would have received</div>
            )}
          </div>
          
          <div className="flex-1 bg-[#110f0e]/50 border border-stone-800 rounded-[2rem] p-8 flex flex-col items-center justify-center relative group min-h-[320px] overflow-hidden">
             <div className="flex flex-col items-center justify-center animate-fade-in text-center px-4">
               <div className="text-[60px] md:text-[80px] font-black mb-2 leading-tight text-stone-100 tracking-tighter">
                 {summary.ai_score}<span className="text-stone-700 text-[40px]">%</span>
               </div>
               <div className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">AI Likelihood</div>
             </div>
          </div>
        </div>

        <div className="w-full h-2.5 bg-stone-900 rounded-full flex overflow-hidden mb-10 shadow-inner">
           <div className="h-full bg-[#22c55e] transition-all duration-1000" style={{ width: `${metWidth}%` }}></div>
           <div className="h-full bg-[#facc15] transition-all duration-1000" style={{ width: `${weakWidth}%` }}></div>
           <div className="h-full bg-[#ef4444] transition-all duration-1000" style={{ width: `${missingWidth}%` }}></div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: 'met', count: adjustedMetrics.met, color: 'text-[#4ade80]', bg: 'bg-[#262423]' },
            { label: 'weak', count: adjustedMetrics.weak, color: 'text-[#facc15]', bg: 'bg-[#262423]' },
            { label: 'missing', count: adjustedMetrics.missing, color: 'text-[#f87171]', bg: 'bg-[#262423]' }
          ].map(s => (
            <button key={s.label} onClick={() => scrollToStatus(s.label as any)} className={`${s.bg} rounded-2xl p-6 flex flex-col items-center border border-stone-800 transition-all hover:border-stone-600 active:scale-95 group`}>
              <div className={`text-4xl font-black mb-1 ${s.color} transition-transform group-hover:scale-110`}>{s.count}</div>
              <div className="text-[10px] text-stone-500 uppercase font-black tracking-[0.2em]">{s.label}</div>
            </button>
          ))}
        </div>

        <div className="border-t border-stone-800 pt-10">
           <div className="flex items-center gap-4 mb-8">
              <div className="w-8 h-8 bg-stone-800 rounded-xl flex items-center justify-center text-yellow-500 border border-stone-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
              </div>
              <h5 className="text-[11px] font-black text-stone-400 uppercase tracking-[0.3em]">Top Priorities for Your Grade</h5>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
              {summary.top_fixes.map((fix, i) => (
                <div key={i} className="bg-[#110f0e] p-6 rounded-2xl border border-stone-800 flex gap-5 items-start group hover:border-stone-700 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center text-[11px] font-black text-stone-500 shrink-0 border border-stone-700 transition-colors group-hover:text-stone-300 group-hover:border-stone-600">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-stone-100 font-bold text-sm mb-1.5">{fix.fix}</p>
                    <p className="text-stone-300 text-xs leading-relaxed font-medium">{fix.reason}</p>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <h2 className="text-2xl font-bold text-stone-800 tracking-tight">Detailed Feedback</h2>
        
        <div className="flex items-center gap-6">
          <div className="flex gap-2">
            <button 
              onClick={expandAll}
              className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-stone-500 hover:text-black hover:border-black border border-stone-200 rounded-xl bg-white transition-all active:scale-95"
            >
              Expand All
            </button>
            <button 
              onClick={collapseAll}
              className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-stone-500 hover:text-black hover:border-black border border-stone-200 rounded-xl bg-white transition-all active:scale-95"
            >
              Collapse All
            </button>
          </div>

          <div className="flex bg-stone-200/50 p-1.5 rounded-2xl">
            <button 
              onClick={() => onViewModeChange('list')} 
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-stone-900 shadow-md' : 'text-stone-500 hover:text-stone-700'}`}
            >
              List View
            </button>
            <button 
              onClick={() => onViewModeChange('feedback')} 
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewMode === 'feedback' ? 'bg-white text-stone-900 shadow-md' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Feedback Mode
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="space-y-6 pb-2">
          {criteria.map((c, idx) => (
            <div key={idx} data-rubric-status={c.userStatus || c.status} className="scroll-mt-24">
              <CriterionCard 
                criterion={c} 
                essayContext={essay} 
                rubricContext={rubric} 
                onViewModeChange={onViewModeChange} 
                onOverride={(status) => onOverride(idx, status)}
                isExpanded={expandedIndices[idx]}
                onToggleExpand={() => toggleExpand(idx)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div id="split-container" className="flex flex-col lg:flex-row gap-6 items-start pb-2">
          <div className="w-full lg:sticky lg:top-24 max-h-[calc(100vh-10rem)] overflow-y-auto rounded-[2.5rem] border border-stone-200/60 custom-scrollbar shadow-none" style={{ width: window.innerWidth >= 1024 ? `${leftPanelWidth}%` : '100%' }}>
             <AnnotatedEssay text={essay} files={essayFiles} criteria={criteria} focusedCriterionIndex={highlightedIndex} onHighlightClick={setHighlightedIndex} />
          </div>
          
          <div onMouseDown={handleMouseDown} className="hidden lg:block w-1.5 h-[600px] cursor-col-resize hover:bg-stone-300 rounded-full transition-colors z-30 self-center"></div>
          
          <div className="flex-1 space-y-4" style={{ width: window.innerWidth >= 1024 ? `${100 - leftPanelWidth}%` : '100%' }}>
            {criteria.map((c, idx) => (
              <div key={idx} className="scroll-mt-24">
                <CriterionCard 
                  criterion={c} essayContext={essay} rubricContext={rubric} 
                  isFocused={focusedIndex === idx} isHighlighted={highlightedIndex === idx} viewMode="review" 
                  onFocus={() => setFocusedIndex(idx)} onLocate={() => handleLocate(idx)} 
                  onViewModeChange={onViewModeChange}
                  onOverride={(status) => onOverride(idx, status)}
                  isExpanded={expandedIndices[idx]}
                  onToggleExpand={() => toggleExpand(idx)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
