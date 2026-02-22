// 🔒 ORIGINAL STYLES + LOGIC PRESERVED
// ✅ ONLY override behavior safely fixed

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

  /* ---------- SCROLL SAFETY ---------- */
  useEffect(() => {
    if (isFocused && viewMode === 'list') {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isFocused, viewMode]);

  /* ---------- REWRITE PHRASES ---------- */
  useEffect(() => {
    if (!isRewriting) return;
    const interval = window.setInterval(
      () => setPhraseIndex(p => (p + 1) % REWRITE_PHRASES.length),
      1500
    );
    return () => clearInterval(interval);
  }, [isRewriting]);

  /* ---------- CLICK OUTSIDE OVERRIDE ---------- */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (overrideMenuRef.current && !overrideMenuRef.current.contains(e.target as Node)) {
        setShowOverrideMenu(false);
      }
    };
    if (showOverrideMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showOverrideMenu]);

  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cleanEvidence = (ev: string) =>
    ev.replace(/^(Topic Sentence \d+:|Evidence:|Quote:|Context:)\s*/i, '')
      .replace(/^["'“”]|["'“”]$/g, '')
      .trim();

  const isLocatable = useMemo(() => {
    if (criterion.visual_coordinates) return true;
    if (!criterion.evidence || criterion.evidence.length < 5) return false;

    const words = cleanEvidence(criterion.evidence)
      .split(/[^a-zA-Z0-9]+/)
      .filter(Boolean);

    if (!words.length) return false;
    const regex = new RegExp(words.map(escapeRegExp).join('[^a-zA-Z0-9]+'), 'i');
    return regex.test(essayContext);
  }, [criterion.evidence, essayContext, criterion.visual_coordinates]);

  const currentStatus = criterion.userStatus || criterion.status;
  const hasEvidence = !!criterion.evidence && criterion.evidence.length > 5;
  const shouldBulge = isFocused && viewMode === 'list';

  /* ---------- REWRITE ---------- */
  const handleRewrite = async () => {
    if (suggestions.length) {
      setSuggestions([]);
      return;
    }
    setIsRewriting(true);
    try {
      setSuggestions(await getRewriteSuggestion(criterion, essayContext, rubricContext));
    } catch {
      setSuggestions(["Sorry, I couldn't think of anything right now."]);
    } finally {
      setIsRewriting(false);
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`border rounded-xl mb-4 transition-all duration-300 relative scroll-mt-24 overflow-visible ${
        shouldBulge
          ? 'shadow-2xl ring-4 ring-stone-100 z-30 bg-white border-stone-800'
          : isExpanded
            ? 'bg-white shadow-sm border-stone-200'
            : 'bg-stone-50 border-stone-200 opacity-80 hover:opacity-100'
      }`}
    >
      {/* HEADER */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpand?.();
          onFocus?.();
        }}
        className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-stone-50 rounded-t-xl"
      >
        <div className="flex items-center gap-3 flex-1">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase border">
            {currentStatus === 'met' ? 'Good' : currentStatus}
          </span>
          <h3 className="font-bold text-stone-700">{criterion.criterion}</h3>
        </div>

        {/* OVERRIDE (isolated, safe) */}
        <div
          ref={overrideMenuRef}
          onClick={(e) => e.stopPropagation()}
          className="relative"
        >
          <button
            onClick={() => setShowOverrideMenu(v => !v)}
            className="px-4 py-2 text-[10px] font-black uppercase border rounded-xl bg-white"
          >
            Override
          </button>

          {showOverrideMenu && (
            <div className="absolute right-0 mt-2 bg-white border rounded-xl shadow-xl z-50">
              {(['met', 'weak', 'missing'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => {
                    onOverride?.(s);
                    setShowOverrideMenu(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-xs hover:bg-stone-100"
                >
                  {s.toUpperCase()}
                </button>
              ))}
              {criterion.userStatus && (
                <button
                  onClick={() => {
                    onOverride?.(undefined);
                    setShowOverrideMenu(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-xs text-red-600 border-t"
                >
                  RESET
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BODY */}
      {isExpanded && (
        <div className="p-4 border-t space-y-3">
          <p className="text-sm text-stone-700">{criterion.why}</p>

          {hasEvidence && (
            <p className="italic text-sm text-stone-600">"{criterion.evidence}"</p>
          )}

          {currentStatus !== 'met' && (
            <>
              <p className="text-sm font-medium">{criterion.exact_fix}</p>

              <button
                onClick={handleRewrite}
                disabled={isRewriting}
                className="text-xs font-black border px-4 py-2 rounded-lg"
              >
                {isRewriting
                  ? REWRITE_PHRASES[phraseIndex]
                  : suggestions.length
                    ? 'Hide Ideas'
                    : 'Get Fix Ideas'}
              </button>

              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => navigator.clipboard.writeText(s)}
                  className="block w-full text-left text-sm italic p-3 border rounded-lg"
                >
                  "{s}"
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};