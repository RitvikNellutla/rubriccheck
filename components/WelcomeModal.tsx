import React, { useEffect, useRef } from 'react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const startButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => startButtonRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] grid place-items-center p-4 bg-stone-900/60 backdrop-blur-sm overflow-y-auto"
      aria-modal="true"
      role="dialog"
      aria-labelledby="welcome-title"
    >
      <div className="bg-white max-w-lg w-full rounded-[2.5rem] shadow-2xl p-8 md:p-10 border border-stone-200 relative overflow-hidden transition-all transform animate-fade-in">
        {/* Subtle Decorative Background */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-stone-50 rounded-bl-full -z-10"></div>
        
        <h2 id="welcome-title" className="text-3xl font-bold text-stone-900 mb-3 tracking-tight font-display">Welcome to RubricCheck</h2>
        
        <p className="text-stone-700 text-lg font-medium leading-snug mb-8 font-sans">
            Instantly check if your work actually hits every requirement. Perfect for essays, presentations, and creative projects.
        </p>

        <div className="space-y-6 mb-8">
            {/* The 3-Step Workflow */}
            <div className="grid grid-cols-1 gap-4">
                <div className="flex gap-4 group">
                    <div className="w-10 h-10 shrink-0 bg-stone-100 rounded-xl flex items-center justify-center text-stone-600 border border-stone-200 transition-colors group-hover:bg-stone-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </div>
                    <div>
                        <h4 className="font-bold text-stone-900 text-sm">1. Paste the Rubric</h4>
                        <p className="text-stone-500 text-xs font-medium">Add the assignment prompt, checklist, or scoring rules.</p>
                    </div>
                </div>
                <div className="flex gap-4 group">
                    <div className="w-10 h-10 shrink-0 bg-stone-100 rounded-xl flex items-center justify-center text-stone-600 border border-stone-200 transition-colors group-hover:bg-stone-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </div>
                    <div>
                        <h4 className="font-bold text-stone-900 text-sm">2. Upload Your Work</h4>
                        <p className="text-stone-500 text-xs font-medium">Drop in your text, slides, or images for the AI to analyze.</p>
                    </div>
                </div>
                <div className="flex gap-4 group">
                    <div className="w-10 h-10 shrink-0 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </div>
                    <div>
                        <h4 className="font-bold text-stone-900 text-sm">3. Get the Fixes</h4>
                        <p className="text-stone-500 text-xs font-medium italic">Our AI maps the rules directly to your work and shows you what's missing.</p>
                    </div>
                </div>
            </div>

            {/* Post-Analysis Viewing Section */}
            <div className="py-6 px-7 bg-[#1c1a19] rounded-[2.2rem] border border-stone-800 shadow-2xl relative overflow-hidden">
                <h5 className="text-[10px] font-bold text-stone-500 uppercase tracking-[0.25em] mb-5">How to View Your Results</h5>
                
                <div className="grid grid-cols-2 gap-4">
                    {/* List Mode Explanation */}
                    <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 rounded bg-stone-800 flex items-center justify-center shadow-inner">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line></svg>
                            </div>
                            <span className="text-white text-[11px] font-bold tracking-tight">List Mode</span>
                        </div>
                        <p className="text-stone-500 text-[10px] leading-relaxed">
                            Best for <span className="text-stone-300">quick scans</span>. See your score and a scrollable list of all met and missing requirements.
                        </p>
                    </div>

                    {/* Feedback Mode Explanation */}
                    <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 hover:border-indigo-500/40 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 rounded bg-indigo-950 flex items-center justify-center shadow-inner">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="3" x2="12" y2="21"></line></svg>
                            </div>
                            <span className="text-indigo-300 text-[11px] font-bold tracking-tight">Feedback Mode</span>
                        </div>
                        <p className="text-stone-500 text-[10px] leading-relaxed">
                            The <span className="text-indigo-400">Deep Dive</span>. A split-screen that highlights exactly where in your work you missed a rule.
                        </p>
                    </div>
                </div>
            </div>

            {/* Strict Mode Tip */}
            <div className="flex items-center gap-4 text-xs bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 border border-stone-200/50">💡</div>
                <p className="text-stone-500 font-medium leading-relaxed font-sans">
                    Use <span className="text-stone-900 font-bold underline decoration-stone-200">Strict Mode</span> if you want the AI to be extremely picky for that perfect grade.
                </p>
            </div>
        </div>

        <div className="flex items-center justify-end">
            <button 
                ref={startButtonRef}
                onClick={onClose}
                className="px-10 py-4 bg-[#1c1a19] hover:bg-black text-white text-sm font-bold rounded-2xl shadow-xl transition-all transform active:scale-95 flex items-center gap-3 group font-sans"
            >
                Continue
                <svg className="transition-transform group-hover:translate-x-1" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
        </div>
      </div>
    </div>
  );
};