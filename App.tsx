
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

const DRAFT_KEY = 'rubric_check_draft_v2'; // Bumped version for new schema

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
  const currentRequestId = useRef<number>(0);
  const isInitialMount = useRef(true);

  // 1. Check if a draft exists on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.rubric?.trim() || parsed.essay?.trim()) {
          setHasStoredDraft(true);
        }
      } catch (e) {
        setHasStoredDraft(false);
      }
    }
    window.scrollTo(0, 0);
  }, []);

  // 2. Save draft on changes - but ONLY if there's actual content
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const hasContent = state.rubric.trim() || state.essay.trim() || state.rubricFiles.length > 0 || state.essayFiles.length > 0;
    
    if (!hasContent) return;

    const draftData = {
      rubric: state.rubric,
      essay: state.essay,
      essayExplanation: state.essayExplanation,
      workType: state.workType,
      isStrict: state.isStrict
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    setHasStoredDraft(true);
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
      setState(prev => ({ ...prev, isStrict: value, isLoading: true, result: null }));
      scrollToResults();
      analyzeEssay(state.rubric, state.rubricFiles, state.essay, state.essayFiles, state.essayExplanation, value, state.workType)
        .then(result => requestId === currentRequestId.current && setState(prev => ({ ...prev, result, isLoading: false })))
        .catch(() => requestId === currentRequestId.current && setState(prev => ({ ...prev, isLoading: false, error: "Update failed." })));
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
          essay: parsed.essay || '',
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
    } catch (error) {
      if (requestId === currentRequestId.current) setState(prev => ({ ...prev, isLoading: false, error: "Something went wrong. Check connection." }));
    }
  }, [state.rubric, state.rubricFiles, state.essay, state.essayFiles, state.essayExplanation, state.isStrict, state.workType]);

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <WelcomeModal />
      <div className="max-w-6xl mx-auto w-full font-sans text-ink flex flex-col flex-grow px-6 md:px-10">
        <Header showStartOver={!!(state.rubric || state.essay || state.result || state.essayFiles.length > 0)} onStartOver={handleClear} result={state.result} isStrict={state.isStrict} essayExplanation={state.essayExplanation} />
        <main className="flex flex-col pt-8">
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
