
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, AppState } from '../types';
import { getChatResponse } from '../services/geminiService';

interface ChatWidgetProps {
  appState: AppState;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ appState }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Resizing State
  const [size, setSize] = useState({ width: 380, height: 500 });
  const [isResizingState, setIsResizingState] = useState(false);

  // Dragging State
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialOffset = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  // Resize Refs
  const isResizing = useRef(false);
  const resizeDir = useRef<string | null>(null);
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const initialResizeSize = useRef({ width: 0, height: 0 });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing.current && resizeDir.current) {
         const dx = e.clientX - resizeStartPos.current.x;
         const dy = e.clientY - resizeStartPos.current.y;
         
         if (resizeDir.current.includes('w')) {
            const newWidth = Math.max(300, Math.min(800, initialResizeSize.current.width - dx));
            setSize(prev => ({ ...prev, width: newWidth }));
         }
         
         if (resizeDir.current.includes('n')) {
            const newHeight = Math.max(400, Math.min(800, initialResizeSize.current.height - dy));
            setSize(prev => ({ ...prev, height: newHeight }));
         }
         return; 
      }

      if (isDragging.current) {
          const dx = e.clientX - dragStartPos.current.x;
          const dy = e.clientY - dragStartPos.current.y;
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            hasMoved.current = true;
          }
          setOffset({
            x: initialOffset.current.x + dx,
            y: initialOffset.current.y + dy
          });
      }
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.userSelect = '';
      }
      if (isResizing.current) {
        isResizing.current = false;
        resizeDir.current = null;
        setIsResizingState(false);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, input, textarea')) return;
    e.preventDefault();
    isDragging.current = true;
    hasMoved.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    initialOffset.current = { ...offset };
    document.body.style.userSelect = 'none';
  };

  const handleResizeStart = (e: React.MouseEvent, dir: string) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    setIsResizingState(true);
    resizeDir.current = dir;
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
    initialResizeSize.current = { ...size };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = dir === 'w' ? 'ew-resize' : dir === 'n' ? 'ns-resize' : 'nwse-resize';
  };

  const handleToggle = () => {
    if (hasMoved.current) return; 
    setIsOpen(!isOpen);
    if (!isOpen) setShowNudge(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Corrected rubricFile to rubricFiles and essayFile to essayFiles
      const responseText = await getChatResponse(
        [...messages, userMsg],
        appState.rubric,
        appState.rubricFiles,
        appState.essay,
        appState.essayFiles,
        appState.essayExplanation,
        appState.result
      );
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I can't reply right now." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-stone-900">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div 
      ref={widgetRef}
      className="fixed bottom-8 right-8 z-50 flex flex-col items-end pointer-events-none transition-transform duration-75 ease-out"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      {/* Chat Window */}
      <div 
        className={`bg-white rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border border-stone-200 overflow-hidden origin-bottom-right mb-6 pointer-events-auto flex flex-col relative max-w-[calc(100vw-2rem)] ${
          isResizingState ? 'transition-none' : 'transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)'
        } ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-12 h-0 pointer-events-none'
        }`}
        style={{ width: size.width, height: isOpen ? size.height : 0 }}
      >
        {isOpen && (
          <>
            <div onMouseDown={(e) => handleResizeStart(e, 'w')} className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-stone-400/10 z-20"></div>
            <div onMouseDown={(e) => handleResizeStart(e, 'n')} className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-stone-400/10 z-20"></div>
            <div onMouseDown={(e) => handleResizeStart(e, 'nw')} className="absolute top-0 left-0 w-5 h-5 cursor-nwse-resize hover:bg-stone-400/20 z-30 rounded-br-lg"></div>
          </>
        )}

        {/* Header */}
        <div 
          onMouseDown={handleDragStart}
          className="bg-[#1c1a19] p-5 flex items-center justify-between shrink-0 cursor-move select-none border-b border-stone-800"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-stone-800 flex items-center justify-center text-yellow-500 shadow-inner">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
            </div>
            <div>
              <h3 className="text-stone-100 font-bold text-sm tracking-tight">RubricCheck Assistant</h3>
              <p className="text-[10px] text-stone-500 font-black uppercase tracking-widest">Powered by Gemini</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="text-stone-500 hover:text-white p-2 rounded-xl hover:bg-stone-800 transition-all active:scale-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 bg-stone-50/50 p-6 overflow-y-auto space-y-5 custom-scrollbar">
          {messages.length === 0 && (
            <div className="text-center mt-12 opacity-80">
              <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-5 text-stone-300 shadow-sm border border-stone-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <p className="text-sm font-bold text-stone-900 tracking-tight mb-2">Need project help?</p>
              <p className="text-xs text-stone-500 font-medium leading-relaxed px-6">
                Ask me to explain any requirement, or how to hit a specific rule in your work.
              </p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                msg.role === 'user' ? 'bg-[#1c1a19] text-stone-50 rounded-br-none' : 'bg-white border border-stone-200 text-stone-800 rounded-bl-none'
              }`}>
                {renderMessage(msg.text)}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-stone-200 p-4 rounded-2xl rounded-bl-none shadow-sm flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce [animation-delay:-.3s]"></div>
                <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce [animation-delay:-.5s]"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-stone-100 shrink-0">
          <div className="relative group">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about the rules..."
              className="w-full bg-stone-100 text-stone-900 rounded-2xl pl-5 pr-12 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-stone-200 focus:bg-white transition-all placeholder-stone-400 border border-transparent focus:border-stone-200"
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1.5 bottom-1.5 w-10 bg-[#1c1a19] text-stone-50 rounded-xl flex items-center justify-center hover:bg-black disabled:opacity-20 transition-all active:scale-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </form>
      </div>

      {/* Improved Nudge Tooltip */}
      {showNudge && !isOpen && (
        <div 
          onClick={handleToggle}
          className="pointer-events-auto mb-4 mr-1 bg-white border border-stone-200 text-stone-800 text-xs font-bold py-3 px-5 rounded-2xl shadow-xl cursor-pointer hover:border-stone-800 hover:-translate-y-1 transition-all animate-fade-in group/nudge select-none relative"
        >
          <div className="flex items-center gap-3">
            <span className="text-yellow-500 animate-pulse">💡</span>
            <span className="tracking-tight">Have questions about your score?</span>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowNudge(false); }}
              className="ml-2 text-stone-300 hover:text-stone-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div className="absolute top-full right-8 -mt-[1px] border-[6px] border-transparent border-t-stone-200"></div>
          <div className="absolute top-full right-8 -mt-[2px] border-[6px] border-transparent border-t-white"></div>
        </div>
      )}

      {/* Custom Floating Button */}
      <div 
        onMouseDown={handleDragStart}
        onClick={handleToggle}
        className={`pointer-events-auto h-16 w-16 rounded-[1.5rem] shadow-2xl flex items-center justify-center transition-all duration-500 transform hover:scale-105 active:scale-95 cursor-move group/fab ${
          isOpen ? 'bg-[#1c1a19] rotate-90 text-white' : 'bg-[#1c1a19] text-stone-50 hover:shadow-stone-300/50'
        }`}
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        ) : (
          <div className="relative">
            <svg className="transition-transform group/fab:rotate-12" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            {!isOpen && (
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full border-2 border-[#1c1a19] animate-ping"></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
