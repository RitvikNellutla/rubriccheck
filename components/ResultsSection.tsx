import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AnalysisResult, AppState } from '../types';
import { CriterionCard } from './CriterionCard';
import { AnnotatedEssay } from './AnnotatedEssay';

interface ResultsSectionProps {
  result?: AnalysisResult | null;
  appState: AppState;
  onViewModeChange: (mode: 'list' | 'feedback') => void;
  onOverride: (index: number, status: 'met' | 'weak' | 'missing' | undefined) => void;
}

const safeNumber = (n: any, fallback = 0) => (typeof n === 'number' && Number.isFinite(n) ? n : fallback);
const safeArray = <T,>(arr: any): T[] => (Array.isArray(arr) ? arr : []);

export const ResultsSection: React.FC<ResultsSectionProps> = ({
  result,
  appState,
  onViewModeChange,
  onOverride
}) => {
  // ---- hard guards (this is the crash fix) ----
  const criteria = safeArray<any>(result?.criteria);
  const summary = (result?.summary ?? {}) as any;

  const { viewMode, essay, rubric, essayFiles } = appState;

  const [displayScore, setDisplayScore] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [showScrollNudge, setShowScrollNudge] = useState(false);

  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({});
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const isResizing = useRef(false);
  const nudgeTimerRef = useRef<number | null>(null);

  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 1024;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Build expanded state safely
  useEffect(() => {
    const initial: Record<number, boolean> = {};
    criteria.forEach((_: any, i: number) => {
      initial[i] = true;
    });
    setExpandedIndices(initial);
  }, [criteria.length]);

  useEffect(() => {
    if (nudgeDismissed) return;

    const startNudgeTimer = () => {
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
      nudgeTimerRef.current = window.setTimeout(() => {
        if (window.scrollY <= 250 && !nudgeDismissed) setShowScrollNudge(true);
      }, 3500);
    };

    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollNudge(false);
        setNudgeDismissed(true);
        if (nudgeTimerRef.current) {
          clearTimeout(nudgeTimerRef.current);
          nudgeTimerRef.current = null;
        }
      } else if (!showScrollNudge && !nudgeTimerRef.current && !nudgeDismissed) {
        startNudgeTimer();
      }
    };

    startNudgeTimer();
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    };
  }, [showScrollNudge, nudgeDismissed]);

  const handleDismissNudge = () => {
    setShowScrollNudge(false);
    setNudgeDismissed(true);
  };

  useEffect(() => {
    if (focusedIndex !== null) {
      setExpandedIndices((prev) => ({ ...prev, [focusedIndex]: true }));
    }
  }, [focusedIndex]);

  const adjustedMetrics = useMemo(() => {
    const counts = { met: 0, weak: 0, missing: 0 };
    criteria.forEach((c: any) => {
      const s = (c?.userStatus || c?.status) as 'met' | 'weak' | 'missing' | undefined;
      if (s === 'met') counts.met += 1;
      else if (s === 'weak') counts.weak += 1;
      else if (s === 'missing') counts.missing += 1;
    });

    const total = criteria.length;
    const originalScore = safeNumber(summary?.score, 0);

    if (total === 0) return { ...counts, score: originalScore };

    const metVal = 1;
    const weakVal = 0.5;
    const currentScore = Math.round(((counts.met * metVal + counts.weak * weakVal) / total) * 100);
    return { ...counts, score: currentScore };
  }, [criteria, summary?.score]);

  useEffect(() => {
    setFocusedIndex(null);
    setHighlightedIndex(null);
  }, [viewMode]);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const targetScore = safeNumber(adjustedMetrics.score, 0);

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / 800, 1);
      setDisplayScore(Math.floor((1 - Math.pow(2, -10 * progress)) * targetScore));
      if (progress < 1) window.requestAnimationFrame(step);
      else setDisplayScore(targetScore);
    };

    window.requestAnimationFrame(step);
  }, [adjustedMetrics.score]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const container = document.getElementById('split-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const next = ((e.clientX - rect.left) / rect.width) * 100;
    setLeftPanelWidth(Math.min(Math.max(next, 20), 80));
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [handleMouseMove, handleMouseUp]
  );

  const scrollToStatus = (status: 'met' | 'weak' | 'missing') => {
    const idx = criteria.findIndex((c: any) => (c?.userStatus || c?.status) === status);
    if (idx === -1) return;

    setFocusedIndex(idx);

    if (viewMode === 'list') {
      const el = document.querySelector(`div[data-rubric-status="${status}"]`);
      if (el) {
        const offset = 120;
        const elementPosition = (el as HTMLElement).getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
      }
    } else {
      setHighlightedIndex(idx);
    }
  };

  const handleLocate = (idx: number) => {
    if (highlightedIndex === idx) setHighlightedIndex(null);
    else {
      setFocusedIndex(idx);
      setHighlightedIndex(idx);
    }
  };

  const toggleExpand = (idx: number) => {
    setExpandedIndices((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const expandAll = () => {
    const updated: Record<number, boolean> = {};
    criteria.forEach((_: any, i: number) => {
      updated[i] = true;
    });
    setExpandedIndices(updated);
  };

  const collapseAll = () => {
    const updated: Record<number, boolean> = {};
    criteria.forEach((_: any, i: number) => {
      updated[i] = false;
    });
    setExpandedIndices(updated);
  };

  const totalCriteria = criteria.length || 1; // prevents NaN widths
  const metWidth = (adjustedMetrics.met / totalCriteria) * 100;
  const weakWidth = (adjustedMetrics.weak / totalCriteria) * 100;
  const missingWidth = (adjustedMetrics.missing / totalCriteria) * 100;

  // If result not ready / empty, don't crash the whole app
  if (!result) {
    return (
      <div className="pt-10">
        <div className="bg-white border border-stone-200 rounded-3xl p-8">
          <h2 className="text-xl font-black text-stone-900 tracking-tight">No results yet</h2>
          <p className="text-sm text-stone-600 mt-2">Run an analysis first, then your detailed breakdown will show here.</p>
        </div>
      </div>
    );
  }

  const topFixes = safeArray<any>(summary?.top_fixes);
  const aiScore = safeNumber(summary?.ai_score, 0);
  const originalScore = safeNumber(summary?.score, 0);

  return (
    <div className="pt-4 animate-fade-in relative scroll-mt-[100px]">
      {/* PERSISTENT SCROLL NUDGE */}
      <div
        className={`fixed right-8 top-[130px] z-[100] transition-all duration-700 pointer-events-none ${
          showScrollNudge ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0'
        }`}
      >
        <div className="bg-[#1c1a19] text-white w-60 p-7 rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.5)] border border-stone-800 flex flex-col items-start gap-4 pointer-events-auto group relative animate-float">
          <button
            onClick={handleDismissNudge}
            className="absolute top-5 right-5 w-7 h-7 rounded-xl bg-stone-800 flex items-center justify-center hover:bg-stone-700 transition-colors"
          >
            <svg className="w-4 h-4 text-stone-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-500 border border-yellow-500/20 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
              </svg>
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-yellow-500/80">Psst!</span>
          </div>

          <div className="space-y-2.5">
            <p className="text-[15px] font-bold leading-tight text-stone-100 tracking-tight">
              Scroll down to see <span className="text-yellow-500 underline decoration-yellow-500/30 underline-offset-4">exactly</span> how you did
            </p>
            <p className="text-[10px] text-stone-500 font-bold leading-relaxed uppercase tracking-widest">Every part of your work is broken down below.</p>
          </div>
        </div>
        <style>{`
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
          }
          .animate-float { animation: float 4s ease-in-out infinite; }
        `}</style>
      </div>

      {/* SUMMARY BOX */}
      <div className="bg-[#1c1a19] text-stone-50 rounded-[3rem] p-7 md:p-10 mb-10 border border-stone-800 overflow-visible relative group/summary shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          <div className="flex-[1.6] bg-[#110f0e]/60 border border-stone-800 rounded-[2.2rem] p-8 flex flex-col items-center justify-center relative overflow-hidden group min-h-[280px]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-stone-700 to-transparent opacity-50"></div>
            <h4 className="text-[10px] font-black text-stone-500 uppercase tracking-[0.5em] mb-4">Current Score</h4>
            <div
              className={`text-[100px] md:text-[130px] font-black leading-none tabular-nums transition-colors duration-1000 tracking-tighter ${
                displayScore >= 70 ? 'text-[#4ade80]' : displayScore >= 40 ? 'text-[#facc15]' : 'text-[#f87171]'
              }`}
            >
              {displayScore}
            </div>
            {adjustedMetrics.score !== originalScore && (
              <div className="mt-3 text-[9px] font-black uppercase text-stone-600 tracking-widest text-center">
                this is the score you would have received
              </div>
            )}
          </div>

          <div className="flex-1 bg-[#110f0e]/60 border border-stone-800 rounded-[2.2rem] p-8 flex flex-col items-center justify-center relative group min-h-[280px] overflow-hidden">
            <div className="flex flex-col items-center justify-center animate-fade-in text-center">
              <div className="text-[60px] md:text-[80px] font-black mb-1 leading-tight text-stone-100 tracking-tighter">
                {aiScore}
                <span className="text-stone-700 text-[40px]">%</span>
              </div>
              <div className="text-[10px] font-black text-stone-500 uppercase tracking-[0.4em]">AI Likelihood</div>
            </div>
          </div>
        </div>

        <div className="w-full h-2.5 bg-stone-900 rounded-full flex overflow-hidden mb-8 shadow-inner">
          <div className="h-full bg-[#22c55e] transition-all duration-1000" style={{ width: `${metWidth}%` }}></div>
          <div className="h-full bg-[#facc15] transition-all duration-1000" style={{ width: `${weakWidth}%` }}></div>
          <div className="h-full bg-[#ef4444] transition-all duration-1000" style={{ width: `${missingWidth}%` }}></div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'good', count: adjustedMetrics.met, color: 'text-[#4ade80]', bg: 'bg-[#262423]' },
            { label: 'weak', count: adjustedMetrics.weak, color: 'text-[#facc15]', bg: 'bg-[#262423]' },
            { label: 'missing', count: adjustedMetrics.missing, color: 'text-[#f87171]', bg: 'bg-[#262423]' }
          ].map((s) => (
            <button
              key={s.label}
              onClick={() => scrollToStatus(s.label === 'good' ? 'met' : (s.label as any))}
              className={`${s.bg} rounded-[1.8rem] p-6 flex flex-col items-center border border-stone-800 transition-all hover:border-stone-600 active:scale-95 group shadow-sm`}
            >
              <div className={`text-3xl font-black mb-1 ${s.color} transition-transform group-hover:scale-110`}>{s.count}</div>
              <div className="text-[9px] text-stone-500 uppercase font-black tracking-[0.2em]">{s.label}</div>
            </button>
          ))}
        </div>

        <div className="border-t border-stone-800/60 pt-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-7 h-7 bg-stone-800 rounded-xl flex items-center justify-center text-yellow-500 border border-stone-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
            <h5 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.35em]">Top Priorities for Your Grade</h5>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {topFixes.length === 0 ? (
              <div className="bg-[#110f0e] p-6 rounded-[1.8rem] border border-stone-800 text-stone-400 text-sm">
                No top fixes returned.
              </div>
            ) : (
              topFixes.map((fix: any, i: number) => (
                <div
                  key={i}
                  className="bg-[#110f0e] p-6 rounded-[1.8rem] border border-stone-800 flex gap-4 items-start group hover:border-stone-700 transition-colors shadow-sm"
                >
                  <div className="w-7 h-7 rounded-xl bg-stone-800 flex items-center justify-center text-[10px] font-black text-stone-500 shrink-0 border border-stone-700 transition-colors group-hover:text-stone-300 group-hover:border-stone-600">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-stone-100 font-bold text-[13px] mb-1 leading-tight">{fix?.fix ?? 'Fix'}</p>
                    <p className="text-stone-400 text-[11px] leading-relaxed font-medium">{fix?.reason ?? ''}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* FEEDBACK NAVIGATION */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
        <h2 className="text-3xl font-black text-stone-900 tracking-tighter">Detailed Analysis</h2>

        <div className="flex items-center gap-6">
          <div className="flex gap-3">
            <button
              onClick={expandAll}
              className="px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 hover:text-black hover:border-black border border-stone-200 rounded-xl bg-white transition-all active:scale-95 shadow-sm"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 hover:text-black hover:border-black border border-stone-200 rounded-xl bg-white transition-all active:scale-95 shadow-sm"
            >
              Collapse All
            </button>
          </div>

          <div className="flex bg-stone-200/50 p-2 rounded-[1.25rem]">
            <button
              onClick={() => onViewModeChange('list')}
              className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${
                viewMode === 'list' ? 'bg-white text-stone-900 shadow-md' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => onViewModeChange('feedback')}
              className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${
                viewMode === 'feedback' ? 'bg-white text-stone-900 shadow-md' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Feedback Mode
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="space-y-6 pb-4">
          {criteria.map((c: any, idx: number) => (
            <div key={idx} data-rubric-status={c?.userStatus || c?.status} className="scroll-mt-[120px]">
              <CriterionCard
                criterion={c}
                essayContext={essay}
                rubricContext={rubric}
                onViewModeChange={onViewModeChange}
                onOverride={(status) => onOverride(idx, status)}
                isExpanded={!!expandedIndices[idx]}
                onToggleExpand={() => toggleExpand(idx)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div id="split-container" className="flex flex-col lg:flex-row gap-8 items-start pb-4">
          <div
            className="w-full lg:sticky lg:top-[110px] max-h-[calc(100vh-12rem)] overflow-y-auto rounded-[3rem] border border-stone-200/60 custom-scrollbar shadow-none"
            style={{ width: isDesktop ? `${leftPanelWidth}%` : '100%' }}
          >
            <AnnotatedEssay
              text={essay}
              files={essayFiles}
              criteria={criteria}
              focusedCriterionIndex={highlightedIndex}
              onHighlightClick={setHighlightedIndex}
            />
          </div>

          <div
            onMouseDown={handleMouseDown}
            className="hidden lg:block w-2 h-[600px] cursor-col-resize hover:bg-stone-300 rounded-full transition-colors z-30 self-center"
          ></div>

          <div className="flex-1 space-y-5" style={{ width: isDesktop ? `${100 - leftPanelWidth}%` : '100%' }}>
            {criteria.map((c: any, idx: number) => (
              <div key={idx} className="scroll-mt-[120px]">
                <CriterionCard
                  criterion={c}
                  essayContext={essay}
                  rubricContext={rubric}
                  isFocused={focusedIndex === idx}
                  isHighlighted={highlightedIndex === idx}
                  viewMode="review"
                  onFocus={() => setFocusedIndex(idx)}
                  onLocate={() => handleLocate(idx)}
                  onViewModeChange={onViewModeChange}
                  onOverride={(status) => onOverride(idx, status)}
                  isExpanded={!!expandedIndices[idx]}
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