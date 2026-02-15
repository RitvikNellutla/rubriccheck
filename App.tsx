import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { InputPanel } from './components/InputPanel';
import { ResultsSection } from './components/ResultsSection';
import { LoadingDisplay } from './components/LoadingDisplay';
import { Footer } from './components/Footer';
import { ChatWidget } from './components/ChatWidget';
import { WelcomeModal } from './components/WelcomeModal';
import { AppState, AnalysisResult } from './types';
import { SAMPLE_RUBRIC, SAMPLE_ESSAY } from './constants';
import { analyzeEssay } from './services/geminiService';

const DRAFT_KEY = 'rubric_check_draft_v3'; 

const initialState: AppState = {
  rubric: '',
  rubricFiles: [],
  essay: '',
  essayFiles: [],
  essayExplanation: '',
  workType: 'General',
  isStrict: false,
  isRubricVague: false,
  isLoading: false,
  error: null,
  result: null,
  viewMode: 'list',
};

function App() {
  const [state, setState] = useState<AppState>(initialState);
  const [hasStoredDraft, setHasStoredDraft] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(true);
  const [quotaCountdown, setQuotaCountdown] = useState<number | null>(null);
  const currentRequestId = useRef<number>(0);
  const isInitialMount = useRef(true);

  // Countdown timer effect for Quota errors
  useEffect(() => {
    let timer: number;
    if (quotaCountdown !== null && quotaCountdown > 0) {
      timer = window.setInterval(() => {
        setQuotaCountdown(prev => (prev !== null && prev > 0) ? prev - 1 : null);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [quotaCountdown]);

  // Check for persistent draft existence on mount and state changes
  const checkDraftExistence = useCallback(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        const exists = !!(parsed.rubric?.trim() || parsed.essay?.trim() || (parsed.rubricFiles?.length || 0) > 0 || (parsed.essayFiles?.length || 0) > 0);
        setHasStoredDraft(exists);
      } catch (e) {
        setHasStoredDraft(false);
      }
    } else {
      setHasStoredDraft(false);
    }
  }, []);

  useEffect(() => {
    checkDraftExistence();
    window.scrollTo(0, 0);
  }, [checkDraftExistence]);

  // Save draft on changes - but ONLY if there's actual content
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const hasContent = state.rubric.trim() || state.essay.trim() || state.rubricFiles.length > 0 || state.essayFiles.length > 0;
    
    // Only save if there's actual data to save.
    if (!hasContent) return;

    const draftData = {
      rubric: state.rubric,
      rubricFiles: state.rubricFiles,
      essay: state.essay,
      essayFiles: state.essayFiles,
      essayExplanation: state.essayExplanation,
      workType: state.workType,
      isStrict: state.isStrict
    };

    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
      setHasStoredDraft(true);
    } catch (e) {
      try {
        const lightDraft = { ...draftData, rubricFiles: [], essayFiles: [] };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(lightDraft));
        setHasStoredDraft(true);
      } catch (e2) {
        console.warn("Could not save draft to local storage.");
      }
    }
  }, [state.rubric, state.essay, state.essayExplanation, state.isStrict, state.rubricFiles, state.essayFiles, state.workType]);

  const scrollToResults = () => {
    setTimeout(() => {
      const resultsEl = document.getElementById('results-view-container');
      if (resultsEl) {
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 200);
  };

  const handleStateChange = useCallback((field: keyof AppState, value: any) => {
    const isInputModifying = ['rubric', 'essay', 'essayFiles', 'essayExplanation', 'rubricFiles', 'isStrict', 'workType'].includes(field);
    
    if (state.isLoading && isInputModifying) {
      currentRequestId.current += 1;
      setState(prev => ({ ...prev, [field]: value, isLoading: false, error: null }));
      return;
    }

    if (field === 'isStrict' && state.result) {
      const requestId = ++currentRequestId.current;
      setState(prev => ({ ...prev, isStrict: value, isLoading: true, result: null, error: null }));
      scrollToResults();
      analyzeEssay(state.rubric, state.rubricFiles, state.essay, state.essayFiles, state.essayExplanation, value, state.workType)
        .then(result => requestId === currentRequestId.current && setState(prev => ({ ...prev, result, isLoading: false })))
        .catch((err) => {
          if (requestId === currentRequestId.current) {
            if (err.message === 'QUOTA_EXCEEDED') {
              setQuotaCountdown(60);
              setState(prev => ({ ...prev, isLoading: false, error: 'QUOTA_EXCEEDED' }));
            } else {
              setState(prev => ({ ...prev, isLoading: false, error: "Update failed. Check your connection." }));
            }
          }
        });
      return;
    }

    if (state.result && isInputModifying) {
       setState(prev => ({ ...prev, [field]: value, result: null, error: null }));
       return;
    }
    setState(prev => ({ ...prev, [field]: value, error: null }));
  }, [state.isLoading, state.result, state.rubric, state.essay, state.essayFiles, state.essayExplanation, state.rubricFiles, state.workType]);

  const handleRestoreDraft = useCallback(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setState(prev => ({
          ...prev,
          rubric: parsed.rubric || '',
          rubricFiles: parsed.rubricFiles || [],
          essay: parsed.essay || '',
          essayFiles: parsed.essayFiles || [],
          essayExplanation: parsed.essayExplanation || '',
          workType: parsed.workType || 'General',
          isStrict: !!parsed.isStrict,
          result: null,
          error: null
        }));
      } catch (e) {
        console.error("Failed to restore draft", e);
      }
    }
  }, []);

  const handleOverride = useCallback((index: number, newStatus: 'met' | 'weak' | 'missing' | undefined) => {
    if (!state.result) return;
    
    const newCriteria = [...state.result.criteria];
    newCriteria[index] = { ...newCriteria[index], userStatus: newStatus };
    
    const updatedResult = { ...state.result, criteria: newCriteria };
    setState(prev => ({
      ...prev,
      result: updatedResult
    }));
  }, [state.result]);

  const handleClear = useCallback(() => {
    currentRequestId.current += 1;
    setState({ ...initialState });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleLoadExample = useCallback(() => {
    setState(prev => ({ ...prev, rubric: SAMPLE_RUBRIC, rubricFiles: [], essay: SAMPLE_ESSAY, essayFiles: [], workType: 'Essay', result: null, error: null, viewMode: 'list' }));
  }, []);

  const handleCheck = useCallback(async () => {
    const requestId = ++currentRequestId.current;
    setState(prev => ({ ...prev, isLoading: true, error: null, result: null }));
    scrollToResults();
    try {
      const result = await analyzeEssay(state.rubric, state.rubricFiles, state.essay, state.essayFiles, state.essayExplanation, state.isStrict, state.workType);
      if (requestId === currentRequestId.current) {
        setState(prev => ({ ...prev, isLoading: false, result }));
        scrollToResults();
      }
    } catch (error: any) {
      if (requestId === currentRequestId.current) {
        if (error.message === 'QUOTA_EXCEEDED') {
          setQuotaCountdown(60);
          setState(prev => ({ ...prev, isLoading: false, error: 'QUOTA_EXCEEDED' }));
        } else {
          setState(prev => ({ ...prev, isLoading: false, error: "Something went wrong. Check your connection." }));
        }
      }
    }
  }, [state.rubric, state.rubricFiles, state.essay, state.essayFiles, state.essayExplanation, state.isStrict, state.workType]);

  const renderErrorBanner = () => {
    if (!state.error) return null;

    const isQuota = state.error === 'QUOTA_EXCEEDED';
    const isReady = isQuota && quotaCountdown === 0;
    
    return (
      <div className={`mb-6 p-4 rounded-2xl flex items-center justify-between animate-fade-in shadow-sm border transition-all duration-500 ${
        isReady 
          ? 'bg-green-50 border-green-200 shadow-[0_0_15px_rgba(34,197,94,0.1)]' 
          : 'bg-red-50 border-red-200'
      }`}>
        <div className={`flex items-center gap-3 ${isReady ? 'text-green-800' : 'text-red-800'}`}>
          {isReady ? (
            <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
          <p className="text-sm font-bold">
            {isQuota 
              ? (isReady ? "Ready to try again!" : `AI is a bit busy (Rate Limit). Please wait ${quotaCountdown}s...`)
              : state.error
            }
          </p>
        </div>
        <button 
          onClick={() => {
            setState(prev => ({ ...prev, error: null }));
            setQuotaCountdown(null);
          }}
          className={`${isReady ? 'text-green-400 hover:text-green-600' : 'text-red-400 hover:text-red-600'} transition-colors`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l18 18" /></svg>
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <WelcomeModal isOpen={isWelcomeOpen} onClose={() => setIsWelcomeOpen(false)} />
      
      <Header 
        showStartOver={!!(state.rubric || state.essay || state.result || state.essayFiles.length > 0 || state.rubricFiles.length > 0)} 
        onStartOver={handleClear} 
        result={state.result} 
        isStrict={state.isStrict} 
        essayExplanation={state.essayExplanation} 
        onShowWelcome={() => setIsWelcomeOpen(true)}
      />

      <div className="max-w-6xl mx-auto w-full font-sans text-ink flex flex-col flex-grow px-6 md:px-10">
        <main className="flex flex-col pt-8">
          {renderErrorBanner()}

          <InputPanel 
            state={state} 
            onChange={handleStateChange} 
            onClear={handleClear} 
            onLoadExample={handleLoadExample} 
            onCheck={handleCheck}
            hasStoredDraft={hasStoredDraft} 
            onRestoreDraft={handleRestoreDraft}
          />
          
          {(state.isLoading || state.result) && (
            <div id="results-view-container" className="w-full pb-4 scroll-mt-24">
              {state.isLoading ? (
                <LoadingDisplay />
              ) : (
                <ResultsSection 
                  result={state.result!} 
                  appState={state} 
                  onViewModeChange={(mode) => setState(prev => ({ ...prev, viewMode: mode }))} 
                  onOverride={handleOverride}
                />
              )}
            </div>
          )}
        </main>
        <Footer />
        {state.result && <ChatWidget appState={state} />}
      </div>
    </div>
  );
}

export default App;