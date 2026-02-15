import React, { useRef, useState } from 'react';
import { AppState, UploadedFile } from '../types';

interface InputPanelProps {
  state: AppState;
  onChange: (field: keyof AppState, value: any) => void;
  onClear: () => void;
  onLoadExample: () => void;
  onCheck: () => void;
  hasStoredDraft?: boolean;
  onRestoreDraft?: () => void;
}

const WORK_TYPES = [
  { id: 'General', label: 'General Project', icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg> },
  { id: 'Essay', label: 'Essay / Paper', icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-0.5-5"></path></svg> },
  { id: 'Discussion', label: 'Discussion Board', icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> },
  { id: 'Presentation', label: 'Presentation / Slides', icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg> },
  { id: 'Creative', label: 'Creative & Design', icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.5-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H17c2.8 0 5-2.2 5-5 0-5.3-4.5-9.6-10-9.6z"/></svg> }
];

const EmptyStateOverlay: React.FC<{ icon: React.ReactNode; title: string; subtitle: string; isVisible: boolean }> = ({ icon, title, subtitle, isVisible }) => {
  if (!isVisible) return null;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 pointer-events-none select-none animate-fade-in z-0">
      <div className="w-16 h-16 bg-stone-50 rounded-[1.5rem] flex items-center justify-center text-stone-300 mb-4 border border-stone-100 shadow-inner group-hover:text-stone-400 transition-colors">
        {icon}
      </div>
      <h4 className="text-stone-900 font-bold text-base tracking-tight mb-1.5 font-heading whitespace-nowrap">{title}</h4>
      <p className="text-stone-400 text-[10px] font-medium max-w-[180px] text-center leading-relaxed uppercase tracking-wider">
        {subtitle}
      </p>
    </div>
  );
};

const StepHeader: React.FC<{ step: number; title: string; helper: string; icon: React.ReactNode }> = ({ step, title, helper, icon }) => (
  <div className="flex items-center gap-4 mb-5">
    <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shrink-0 shadow-sm">
      {icon}
    </div>
    <div>
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Step 0{step}</span>
        <h3 className="text-black font-heading font-bold text-lg leading-tight tracking-tight whitespace-nowrap">{title}</h3>
      </div>
      <p className="text-stone-500 text-xs font-medium mt-0.5 whitespace-nowrap">{helper}</p>
    </div>
  </div>
);

const StrictToggle: React.FC<{ isStrict: boolean; onToggle: () => void }> = ({ isStrict, onToggle }) => (
  <div className="relative group/strict shrink-0">
    <button
      onClick={onToggle}
      className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] border rounded-xl transition-all flex items-center gap-2 active:scale-95 group/btn whitespace-nowrap ${
        isStrict 
          ? 'bg-black border-black text-white shadow-lg hover:bg-stone-900' 
          : 'bg-white border-black text-black hover:bg-black hover:text-white'
      }`}
    >
      <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
        isStrict 
          ? 'bg-white' 
          : 'bg-stone-300 group-hover/btn:bg-white'
      }`}></div>
      Strict Mode: {isStrict ? 'ON' : 'OFF'}
    </button>
    
    <div className="absolute top-full right-0 mt-3 w-64 p-4 bg-black text-white text-[11px] leading-relaxed rounded-xl shadow-2xl opacity-0 group-hover/strict:opacity-100 pointer-events-none transition-all duration-300 z-50 border border-stone-800">
      <p className="font-bold text-stone-400 mb-1 uppercase tracking-widest text-[9px]">Strict Mode</p>
      This makes the AI way stricter. It’ll be super picky and catch even the tiny mistakes or rubric gaps to help you get the best grade possible.
      <div className="absolute bottom-full right-6 border-8 border-transparent border-b-black"></div>
    </div>
  </div>
);

const FileTag: React.FC<{ name: string; onRemove: () => void }> = ({ name, onRemove }) => (
  <div className="flex items-center gap-2 bg-stone-100 text-stone-600 text-[9px] px-3 py-1.5 rounded-lg border border-stone-200 font-black uppercase tracking-tighter animate-fade-in group whitespace-nowrap">
    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white scale-90">
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
    </div>
    <span className="truncate max-w-[120px]">{name}</span>
    <button onClick={onRemove} className="hover:text-red-500 ml-1 text-sm font-bold transition-colors">×</button>
  </div>
);

const SuccessSticker: React.FC<{ show: boolean }> = ({ show }) => {
  if (!show) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center rounded-[2rem] pointer-events-none animate-success-fade bg-white/60 backdrop-blur-md">
       <div className="animate-success-pop flex items-center justify-center">
         <div className="bg-green-500 text-white w-24 h-24 rounded-full flex items-center justify-center shadow-[0_20px_40px_rgba(34,197,94,0.4)] border-4 border-white">
           <svg className="w-12 h-12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
             <polyline points="20 6 9 17 4 12"></polyline>
           </svg>
         </div>
       </div>
       <style>{`
         @keyframes successPop {
           0% { opacity: 0; transform: scale(0.3) rotate(-10deg); }
           50% { opacity: 1; transform: scale(1.1) rotate(5deg); }
           100% { opacity: 1; transform: scale(1) rotate(0); }
         }
         @keyframes successFade {
           0% { opacity: 0; }
           15% { opacity: 1; }
           85% { opacity: 1; }
           100% { opacity: 0; }
         }
         .animate-success-pop {
           animation: successPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
         }
         .animate-success-fade {
           animation: successFade 1.6s ease-in-out forwards;
         }
       `}</style>
    </div>
  );
};

export const InputPanel: React.FC<InputPanelProps> = ({ state, onChange, onLoadExample, onCheck, hasStoredDraft, onRestoreDraft }) => {
  const { rubric, rubricFiles, essay, essayFiles, isStrict, isLoading, result, workType } = state;
  const rubricInputRef = useRef<HTMLInputElement>(null);
  const essayInputRef = useRef<HTMLInputElement>(null);
  
  const [activePanel, setActivePanel] = useState<'rubric' | 'essay' | null>(null);
  const [showRubricSuccess, setShowRubricSuccess] = useState(false);
  const [showEssaySuccess, setShowEssaySuccess] = useState(false);
  const [dragActive, setDragActive] = useState<'rubric' | 'essay' | null>(null);

  // New states to track focus
  const [isRubricFocused, setIsRubricFocused] = useState(false);
  const [isEssayFocused, setIsEssayFocused] = useState(false);

  const hasRubric = rubric.trim().length > 0 || rubricFiles.length > 0;
  const hasEssay = essay.trim().length > 0 || essayFiles.length > 0;
  const isFormValid = hasRubric && hasEssay;

  const canRestore = hasStoredDraft && !hasRubric && !hasEssay;

  const processFiles = async (files: FileList | null, type: 'rubric' | 'essay') => {
    if (!files || files.length === 0) return;
    const newFiles: UploadedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      newFiles.push({ name: file.name, mimeType: file.type || 'application/octet-stream', data: base64 });
    }
    const currentFiles = type === 'rubric' ? rubricFiles : essayFiles;
    onChange(type + 'Files' as any, [...currentFiles, ...newFiles]);
    if (type === 'rubric') {
        setShowRubricSuccess(true);
        setTimeout(() => setShowRubricSuccess(false), 1600);
    } else {
        setShowEssaySuccess(true);
        setTimeout(() => setShowEssaySuccess(false), 1600);
    }
  };

  const handleDrag = (e: React.DragEvent, type: 'rubric' | 'essay') => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(type);
    else if (e.type === "dragleave") setDragActive(null);
  };

  const handleDrop = (e: React.DragEvent, type: 'rubric' | 'essay') => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) processFiles(e.dataTransfer.files, type);
  };

  const clearRubric = () => {
    onChange('rubric', '');
    onChange('rubricFiles', []);
  };

  const clearEssay = () => {
    onChange('essay', '');
    onChange('essayFiles', []);
    onChange('essayExplanation', '');
  };

  if (isLoading || !!result) return null;

  return (
    <div className="max-w-[1120px] mx-auto w-full px-6 space-y-4 animate-fade-in pb-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 px-2 border-b border-stone-200 pb-4">
        <div className="space-y-1 shrink-0 text-center md:text-left">
          <h2 className="text-5xl font-heading font-black text-black tracking-tighter whitespace-nowrap">Input Station</h2>
          <p className="text-stone-500 text-sm font-medium whitespace-nowrap">Rules on the left. Your work on the right.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={onRestoreDraft} 
            disabled={!canRestore}
            className={`px-5 py-2.5 text-[10px] font-black rounded-lg transition-all border uppercase tracking-widest flex items-center gap-2 whitespace-nowrap shrink-0 ${
              canRestore 
                ? 'text-indigo-600 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-600 hover:text-white cursor-pointer active:scale-95 shadow-sm' 
                : 'text-stone-400/50 border-stone-200 bg-stone-100/30 cursor-not-allowed opacity-80'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
            Restore Last Draft
          </button>
          <button 
            onClick={onLoadExample} 
            className="px-5 py-2.5 text-[10px] font-black text-black hover:bg-black hover:text-white rounded-lg transition-all border border-black uppercase tracking-widest active:scale-95 whitespace-nowrap shrink-0"
          >
            Try an Example
          </button>
          <StrictToggle isStrict={isStrict} onToggle={() => onChange('isStrict', !isStrict)} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
        {/* LEFT PANEL */}
        <div 
          onMouseEnter={() => setActivePanel('rubric')}
          onMouseLeave={() => setActivePanel(null)}
          onDragEnter={(e) => handleDrag(e, 'rubric')}
          onDragOver={(e) => handleDrag(e, 'rubric')}
          onDragLeave={(e) => handleDrag(e, 'rubric')}
          onDrop={(e) => handleDrop(e, 'rubric')}
          className={`flex flex-col bg-white rounded-[2rem] border-2 p-8 transition-all duration-300 shadow-sm relative group ${
            activePanel === 'essay' ? 'opacity-30 scale-[0.99]' : 'opacity-100'
          } ${activePanel === 'rubric' || dragActive === 'rubric' ? 'border-black' : 'border-stone-100'} ${dragActive === 'rubric' ? 'bg-stone-50' : ''}`}
        >
          <StepHeader step={1} title="The Requirements" helper="Paste the rules here." icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>} />

          <div className="relative flex-grow min-h-[260px] flex flex-col bg-paper rounded-2xl border border-stone-200 focus-within:border-black transition-colors overflow-hidden">
            <textarea
              className="w-full h-full p-6 text-black text-sm focus:outline-none transition-all font-sans resize-none leading-relaxed z-10 bg-transparent placeholder-stone-800"
              placeholder=""
              value={rubric}
              onChange={(e) => onChange('rubric', e.target.value)}
              onFocus={() => setIsRubricFocused(true)}
              onBlur={() => setIsRubricFocused(false)}
            />
            <EmptyStateOverlay 
               isVisible={!isRubricFocused && rubric.length === 0 && rubricFiles.length === 0}
               title="Rules & Requirements"
               subtitle="Type or upload the criteria"
               icon={<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>}
            />
            <SuccessSticker show={showRubricSuccess} />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap gap-2">
              {rubricFiles.map((f, i) => (
                <FileTag key={i} name={f.name} onRemove={() => onChange('rubricFiles', rubricFiles.filter((_, idx) => idx !== i))} />
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {hasRubric && (
                <button 
                  onClick={clearRubric}
                  className="px-4 py-2 bg-white border border-stone-200 rounded-xl text-stone-400 hover:text-red-500 hover:border-red-200 transition-all shadow-sm active:scale-95 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                >
                  Clear
                </button>
              )}
              <button 
                onClick={() => rubricInputRef.current?.click()} 
                className="px-4 py-2 bg-white border border-stone-200 rounded-xl text-stone-500 hover:text-black hover:border-black transition-all shadow-sm active:scale-95 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                Upload Rules
              </button>
            </div>
            <input type="file" ref={rubricInputRef} className="hidden" multiple onChange={(e) => processFiles(e.target.files, 'rubric')} />
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div 
          onMouseEnter={() => setActivePanel('essay')}
          onMouseLeave={() => setActivePanel(null)}
          onDragEnter={(e) => handleDrag(e, 'essay')}
          onDragOver={(e) => handleDrag(e, 'essay')}
          onDragLeave={(e) => handleDrag(e, 'essay')}
          onDrop={(e) => handleDrop(e, 'essay')}
          className={`flex flex-col bg-white rounded-[2rem] border-2 p-8 transition-all duration-300 shadow-sm relative group ${
            activePanel === 'rubric' ? 'opacity-30 scale-[0.99]' : 'opacity-100'
          } ${activePanel === 'essay' || dragActive === 'essay' ? 'border-black' : 'border-stone-100'} ${dragActive === 'essay' ? 'bg-stone-50' : ''}`}
        >
          <StepHeader step={2} title="Your Work" helper="Drop your project here." icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>} />

          <div className="mb-6">
            <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest block mb-1.5 whitespace-nowrap">Type of Work</span>
            <div className="flex flex-wrap gap-2 mt-3">
              {WORK_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => onChange('workType', type.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-bold transition-all active:scale-95 whitespace-nowrap ${
                    workType === type.id ? 'bg-black border-black text-white shadow-md' : 'bg-white border-stone-200 text-stone-500 hover:border-black hover:text-black'
                  }`}
                >
                  {type.icon}
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex-grow min-h-[260px] flex flex-col bg-paper rounded-2xl border border-stone-200 focus-within:border-black transition-colors overflow-hidden">
            <textarea
              className="w-full h-full p-6 text-black text-sm focus:outline-none transition-all font-sans resize-none leading-relaxed z-10 bg-transparent placeholder-stone-800"
              placeholder=""
              value={essay}
              onChange={(e) => onChange('essay', e.target.value)}
              onFocus={() => setIsEssayFocused(true)}
              onBlur={() => setIsEssayFocused(false)}
            />
            <EmptyStateOverlay 
               isVisible={!isEssayFocused && essay.length === 0 && essayFiles.length === 0}
               title="Your Project"
               subtitle="Type or upload your work"
               icon={<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>}
            />
            <SuccessSticker show={showEssaySuccess} />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap gap-2">
              {essayFiles.map((f, i) => (
                <FileTag key={i} name={f.name} onRemove={() => onChange('essayFiles', essayFiles.filter((_, idx) => idx !== i))} />
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {hasEssay && (
                <button 
                  onClick={clearEssay}
                  className="px-4 py-2 bg-white border border-stone-200 rounded-xl text-stone-400 hover:text-red-500 hover:border-red-200 transition-all shadow-sm active:scale-95 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                >
                  Clear
                </button>
              )}
              <button 
                onClick={() => essayInputRef.current?.click()} 
                className="px-4 py-2 bg-white border border-stone-200 rounded-xl text-stone-500 hover:text-black hover:border-black transition-all shadow-sm active:scale-95 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                Upload Project
              </button>
            </div>
            <input type="file" ref={essayInputRef} className="hidden" multiple onChange={(e) => processFiles(e.target.files, 'essay')} />
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center -mt-8 pb-8 px-8">
        <button
          onClick={onCheck}
          disabled={!isFormValid || isLoading}
          className={`px-32 py-7 rounded-2xl font-heading font-black text-xl uppercase tracking-[0.3em] transition-all active:scale-[0.98] flex items-center justify-center gap-6 whitespace-nowrap ${
            !isFormValid || isLoading 
              ? 'bg-stone-200 text-stone-400 cursor-not-allowed border border-stone-300' 
              : 'bg-black text-white hover:bg-stone-900 shadow-[0_30px_60px_rgba(0,0,0,0.15)] hover:-translate-y-1'
          }`}
        >
          Check My Work
          <svg className="w-8 h-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </button>
      </div>
    </div>
  );
};