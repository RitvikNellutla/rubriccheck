import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { InputPanel } from './components/InputPanel';
import { ResultsSection } from './components/ResultsSection';
import { LoadingDisplay } from './components/LoadingDisplay';
import { Footer } from './components/Footer';
import { ChatWidget } from './components/ChatWidget';
import { WelcomeModal } from './components/WelcomeModal';
import { AppState } from './types';
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

  useEffect(() => {
    let timer: number;
    if (quotaCountdown !== null && quotaCountdown > 0) {
      timer = window.setInterval(() => {
        setQuotaCountdown(prev =>
          prev !== null && prev > 0 ? prev - 1 : null
        );
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [quotaCountdown]);

  const checkDraftExistence = useCallback(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (!savedDraft) return setHasStoredDraft(false);

    try {
      const parsed = JSON.parse(savedDraft);
      const exists = !!(
        parsed.rubric?.trim() ||
        parsed.essay?.trim() ||
        parsed.rubricFiles?.length ||
        parsed.essayFiles?.length
      );
      setHasStoredDraft(exists);
    } catch {
      setHasStoredDraft(false);
    }
  }, []);

  useEffect(() => {
    checkDraftExistence();
    window.scrollTo(0, 0);
  }, [checkDraftExistence]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const hasContent =
      state.rubric.trim() ||
      state.essay.trim() ||
      state.rubricFiles.length ||
      state.essayFiles.length;

    if (!hasContent) return;

    const draftData = {
      rubric: state.rubric,
      rubricFiles: state.rubricFiles,
      essay: state.essay,
      essayFiles: state.essayFiles,
      essayExplanation: state.essayExplanation,
      workType: state.workType,
      isStrict: state.isStrict,
    };

    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
      setHasStoredDraft(true);
    } catch {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ ...draftData, rubricFiles: [], essayFiles: [] })
        );
        setHasStoredDraft(true);
      } catch {
        console.warn('Failed to save draft');
      }
    }
  }, [
    state.rubric,
    state.essay,
    state.essayExplanation,
    state.isStrict,
    state.rubricFiles,
    state.essayFiles,
    state.workType,
  ]);

  const scrollToResults = () => {
    setTimeout(() => {
      document
        .getElementById('results-view-container')
        ?.scrollIntoView({ behavior: 'smooth' });
    }, 200);
  };

  const handleCheck = useCallback(async () => {
    console.log('HANDLE CHECK FIRED'); // 🔥 DEBUG LINE (INTENTIONAL)

    const requestId = ++currentRequestId.current;
    setState(prev => ({ ...prev, isLoading: true, error: null, result: null }));
    scrollToResults();

    try {
      const result = await analyzeEssay(
        state.rubric,
        state.rubricFiles,
        state.essay,
        state.essayFiles,
        state.essayExplanation,
        state.isStrict,
        state.workType
      );

      if (requestId === currentRequestId.current) {
        setState(prev => ({ ...prev, isLoading: false, result }));
        scrollToResults();
      }
    } catch (err: any) {
      if (requestId !== currentRequestId.current) return;

      if (err.message === 'QUOTA_EXCEEDED') {
        setQuotaCountdown(60);
        setState(prev => ({ ...prev, isLoading: false, error: 'QUOTA_EXCEEDED' }));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Something went wrong. Check your connection.',
        }));
      }
    }
  }, [
    state.rubric,
    state.rubricFiles,
    state.essay,
    state.essayFiles,
    state.essayExplanation,
    state.isStrict,
    state.workType,
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <WelcomeModal
        isOpen={isWelcomeOpen}
        onClose={() => setIsWelcomeOpen(false)}
      />

      <Header
        showStartOver={!!(state.rubric || state.essay || state.result)}
        onStartOver={() => setState(initialState)}
        result={state.result}
        isStrict={state.isStrict}
        essayExplanation={state.essayExplanation}
        onShowWelcome={() => setIsWelcomeOpen(true)}
      />

      <div className="max-w-6xl mx-auto w-full flex-grow px-6 md:px-10">
        <main className="pt-8">
          <InputPanel
            state={state}
            onChange={(f, v) =>
              setState(prev => ({ ...prev, [f]: v, error: null }))
            }
            onClear={() => setState(initialState)}
            onLoadExample={() =>
              setState(prev => ({
                ...prev,
                rubric: SAMPLE_RUBRIC,
                essay: SAMPLE_ESSAY,
              }))
            }
            onCheck={handleCheck}
            hasStoredDraft={hasStoredDraft}
            onRestoreDraft={() => {}}
          />

          {(state.isLoading || state.result) && (
            <div id="results-view-container">
              {state.isLoading ? (
                <LoadingDisplay />
              ) : (
                <ResultsSection
                  result={state.result!}
                  appState={state}
                  onViewModeChange={() => {}}
                  onOverride={() => {}}
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