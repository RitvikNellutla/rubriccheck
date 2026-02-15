
import React, { useMemo, useEffect, useRef, useState } from 'react';
import { CriterionResult, UploadedFile } from '../types';

interface AnnotatedWorkProps {
  text: string;
  files: UploadedFile[];
  criteria: CriterionResult[];
  focusedCriterionIndex: number | null;
  hoveredCriterionIndex?: number | null;
  onHighlightClick: (index: number) => void;
}

// Sub-component to handle PDF Blob URL lifecycle safely with Fallback detection
const PdfViewer: React.FC<{ data: string; name: string }> = ({ data, name }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (!data) return;
    try {
      const cleanedData = data.replace(/\s/g, '');
      const byteCharacters = atob(cleanedData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      setUrl(blobUrl);

      // If it takes longer than 4s, it's likely blocked by a browser setting/extension
      const timer = setTimeout(() => setShowFallback(true), 4000);

      return () => {
        URL.revokeObjectURL(blobUrl);
        clearTimeout(timer);
      };
    } catch (e) {
      console.error("Failed to process PDF data:", e);
      setShowFallback(true);
    }
  }, [data]);

  if (!url) {
    return (
      <div className="w-full h-[800px] flex items-center justify-center bg-stone-50 border border-stone-100 rounded-2xl">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-stone-300" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Opening Project...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[800px] bg-white rounded-2xl overflow-hidden shadow-inner border border-stone-100 relative group/pdf">
      {/* Background Blueprint Pattern */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-30"></div>
      
      <embed 
        src={url} 
        type="application/pdf"
        className="w-full h-full relative z-0"
        width="100%"
        height="100%"
      />

      {showFallback && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-50/90 backdrop-blur-sm z-10 p-10 text-center animate-fade-in">
           <div className="w-20 h-20 bg-white rounded-3xl shadow-xl border border-stone-100 flex items-center justify-center mb-6 text-stone-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 12 12 14 10 12"></polyline><line x1="12" y1="8" x2="12" y2="14"></line></svg>
           </div>
           <h4 className="text-stone-900 font-black tracking-tight text-xl mb-3">Browser Security Check</h4>
           <p className="text-stone-500 text-sm max-w-sm leading-relaxed mb-8">
             Usually you'd see your work here, but your browser is keeping things extra secure today. 
             <span className="block mt-2 font-bold text-stone-700 italic">Don't worry—the AI has already read every detail!</span>
           </p>
           <div className="flex gap-4">
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-8 py-3.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg active:scale-95 flex items-center gap-2"
              >
                View Project in New Tab
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              </a>
           </div>
        </div>
      )}

      {/* Manual Full View Toggle (Floating) */}
      {!showFallback && (
        <div className="absolute top-4 right-4 opacity-0 group-hover/pdf:opacity-100 transition-opacity z-20">
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="bg-white/95 backdrop-blur px-3 py-1.5 rounded-lg border border-stone-200 text-[9px] font-black uppercase tracking-widest text-stone-600 hover:text-black shadow-sm flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            Pop Out View
          </a>
        </div>
      )}
    </div>
  );
};

export const AnnotatedEssay: React.FC<AnnotatedWorkProps> = ({ 
  text, 
  files,
  criteria, 
  focusedCriterionIndex, 
  hoveredCriterionIndex = null,
  onHighlightClick 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState<number | null>(null);

  useEffect(() => {
    if (focusedCriterionIndex !== null) {
      setFlash(focusedCriterionIndex);
      const flashTimer = setTimeout(() => setFlash(null), 1500);
      
      const scrollHandler = () => {
        if (containerRef.current) {
          const element = containerRef.current.querySelector(`#highlight-${focusedCriterionIndex}`);
          const marker = containerRef.current.querySelector(`#marker-${focusedCriterionIndex}`);
          const target = element || marker;
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          }
        }
      };
      const scrollTimer = setTimeout(scrollHandler, 100);
      return () => { clearTimeout(flashTimer); clearTimeout(scrollTimer); };
    }
  }, [focusedCriterionIndex]);

  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cleanEvidence = (ev: string) => ev.replace(/^(Topic Sentence \d+:|Evidence:|Quote:|Context:)\s*/i, '').replace(/^["'“”]|["'“”]$/g, '').trim();

  const getHighlightedParts = (content: string, criterionIdx: number | null) => {
    if (!content || criterionIdx === null) return <span>{content}</span>;

    const c = criteria[criterionIdx];
    if (!c || !c.evidence || c.evidence.length < 5) return <span>{content}</span>;

    const targetEvidence = cleanEvidence(c.evidence);
    const words = targetEvidence.split(/[^a-zA-Z0-9]+/).filter(w => w.length > 0);
    if (words.length === 0) return <span>{content}</span>;

    const regex = new RegExp(`(${words.map(escapeRegExp).join('[^a-zA-Z0-9]+')})`, 'gi');
    
    if (!regex.test(content)) return <span>{content}</span>;

    regex.lastIndex = 0;
    const parts = content.split(regex);
    const colors = { met: 'bg-green-500 text-white', weak: 'bg-yellow-400 text-stone-900', missing: 'bg-red-500 text-white' };

    return parts.map((part, i) => {
      if (new RegExp(`^(${words.map(escapeRegExp).join('[^a-zA-Z0-9]+')})$`, 'gi').test(part)) {
        return (
          <mark 
            id={`highlight-${criterionIdx}`} 
            key={i} 
            onClick={() => onHighlightClick(criterionIdx)} 
            className={`cursor-pointer transition-all duration-300 z-10 px-0.5 rounded-sm ${colors[c.status]} ${flash === criterionIdx ? 'ring-2 ring-white opacity-100' : 'opacity-100'}`}
          >
            {part}
          </mark>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const renderVisualMarker = (criterion: CriterionResult, index: number, currentImageIndex: number) => {
    if (!criterion.visual_coordinates) return null;
    const targetFileIndex = criterion.visual_coordinates.file_index || 0;
    if (targetFileIndex !== currentImageIndex) return null;

    const isFocused = focusedCriterionIndex === index;
    const colors = { met: 'bg-green-500', weak: 'bg-yellow-400', missing: 'bg-red-500' };
    const strokeColors = { met: '#22c55e', weak: '#facc15', missing: '#ef4444' };

    return (
      <div 
        key={index} id={`marker-${index}`} onClick={() => onHighlightClick(index)}
        className={`absolute transition-all duration-300 cursor-pointer pointer-events-auto flex flex-col items-center ${isFocused ? 'scale-110 z-[100]' : 'scale-100 opacity-90 hover:opacity-100 z-80'}`}
        style={{ top: `${criterion.visual_coordinates.y}%`, left: `${criterion.visual_coordinates.x}%`, transform: 'translate(-50%, -100%)' }}
      >
        <div className={`flex flex-col items-center whitespace-nowrap ${flash === index ? 'animate-bounce' : ''}`}>
           <div className={`px-4 py-1.5 rounded-[0.85rem] text-[10px] font-black uppercase text-white mb-2 shadow-xl backdrop-blur-md border border-white/20 ${colors[criterion.status]} ${isFocused ? 'ring-2 ring-white scale-105' : ''}`}>
              {criterion.status === 'met' ? 'GOOD' : criterion.status.toUpperCase()}
           </div>
           <div className="relative flex flex-col items-center">
             <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                <path d="M12 21L12 3M12 21L6 15M12 21L18 15" stroke={strokeColors[criterion.status]} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
             </svg>
             <div className={`w-4 h-4 rounded-full -mt-3.5 border-4 border-white shadow-lg ${colors[criterion.status]} ${isFocused ? 'scale-125' : ''}`}></div>
           </div>
        </div>
      </div>
    );
  };

  const decodeFullText = (base64: string) => {
    try {
      return atob(base64);
    } catch (e) {
      return "[Error decoding file content]";
    }
  };

  const isVisualMode = files.length > 0;

  return (
    <div ref={containerRef} className={`bg-white rounded-[2.5rem] border border-stone-200/60 min-h-[500px] whitespace-pre-wrap selection:bg-stone-200 relative overflow-hidden ${isVisualMode ? 'p-0 bg-[#f8f6f2]' : 'p-8 md:p-14 font-serif leading-[2.6] text-stone-800 text-base md:text-lg'}`}>
      {isVisualMode ? (
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
           <div className="bg-white px-8 py-5 flex items-center justify-between border-b border-stone-100 z-20 sticky top-0 shadow-sm">
              <div className="flex items-center gap-4">
                 <h2 className="text-[13px] font-black text-stone-900 uppercase tracking-[0.3em]">Project Review</h2>
              </div>
              <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{files.length} Parts Loaded</div>
           </div>

           <div className="flex-1 space-y-12 p-8 lg:p-16">
             {text && (
               <div className="mx-auto max-w-4xl bg-white p-12 rounded-2xl border border-stone-200 font-serif leading-relaxed text-stone-800 italic relative overflow-hidden shadow-sm">
                 <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-6 border-b border-stone-100 pb-2 flex justify-between items-center">
                    <span>Draft Notes</span>
                    <span className="text-stone-300">Pasted Content</span>
                 </div>
                 <div className="relative z-10 leading-[2.2]">
                   {getHighlightedParts(text, focusedCriterionIndex)}
                 </div>
               </div>
             )}

             {files.map((file, fileIdx) => {
               const isImage = file.mimeType.startsWith('image/');
               const isText = file.mimeType === 'text/plain';
               const isPdf = file.mimeType === 'application/pdf';
               
               return (
                 <div key={fileIdx} className="relative mx-auto max-w-4xl rounded-[2rem] overflow-hidden border border-stone-200 bg-white shadow-sm group/canvas transition-all hover:shadow-md">
                    <div className="bg-stone-50/50 px-8 py-4 border-b border-stone-100 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-black text-stone-900 uppercase tracking-[0.2em]">Part {fileIdx + 1}: {file.name}</span>
                        {isPdf && <span className="px-2 py-0.5 rounded-md bg-stone-200 text-stone-600 text-[8px] font-black uppercase tracking-widest">PDF</span>}
                      </div>
                      <span className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">{file.mimeType.split('/')[1] || 'File'}</span>
                    </div>
                    <div className="relative">
                      {isImage ? (
                        <>
                          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-20"></div>
                          <img src={`data:${file.mimeType};base64,${file.data}`} alt={file.name} className="w-full h-auto block relative z-0" />
                          <div className="absolute inset-0 pointer-events-none overflow-visible">
                            {criteria.map((c, i) => renderVisualMarker(c, i, fileIdx))}
                          </div>
                        </>
                      ) : isText ? (
                        <div className="p-12 md:p-16 bg-white font-serif text-stone-800 leading-[2.4] text-lg">
                           <div className="relative z-10">
                              {getHighlightedParts(decodeFullText(file.data), focusedCriterionIndex)}
                           </div>
                        </div>
                      ) : isPdf ? (
                        <div className="relative w-full min-h-[800px] bg-stone-50 overflow-hidden">
                          <PdfViewer data={file.data} name={file.name} />
                          <div className="absolute inset-0 pointer-events-none overflow-visible z-50">
                            {criteria.map((c, i) => renderVisualMarker(c, i, fileIdx))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-16 flex flex-col items-center justify-center bg-stone-50/30 min-h-[400px]">
                           <div className="relative mb-8">
                             <div className="w-24 h-24 bg-white rounded-3xl shadow-xl border border-stone-100 flex items-center justify-center">
                                <svg className="w-12 h-12 text-stone-300" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                             </div>
                             <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-green-500 border-4 border-white flex items-center justify-center shadow-lg">
                               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                             </div>
                           </div>
                           <h4 className="text-stone-900 font-black tracking-tight text-xl mb-2">{file.name}</h4>
                           <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">{file.mimeType}</p>
                           
                           <div className="max-w-xs text-center p-6 bg-white/50 backdrop-blur-sm rounded-2xl border border-stone-100">
                              <p className="text-stone-500 text-xs font-medium leading-relaxed">
                                 Content is fully analyzed by RubricCheck AI. Although this file type isn't directly previewable in this view, every detail has been mapped against your rubric.
                              </p>
                           </div>
                        </div>
                      )}
                    </div>
                 </div>
               );
             })}
           </div>

           {focusedCriterionIndex !== null && (
             <div className="bg-white border-t border-stone-100 py-6 px-8 flex items-center justify-center gap-4 sticky bottom-0 z-[60] shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                <div className={`w-3 h-3 rounded-full ${criteria[focusedCriterionIndex].status === 'met' ? 'bg-green-500' : criteria[focusedCriterionIndex].status === 'weak' ? 'bg-yellow-400' : 'bg-red-500'}`}></div>
                <p className="text-[11px] font-black text-stone-900 uppercase tracking-[0.25em]">
                  Reviewing: <span className="text-stone-500 ml-1">{criteria[focusedCriterionIndex].criterion}</span>
                </p>
             </div>
           )}
        </div>
      ) : (
        <div className="relative z-0 text-stone-800">
           {getHighlightedParts(text, focusedCriterionIndex)}
        </div>
      )}
    </div>
  );
};
