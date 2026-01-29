
import React, { useState, useEffect } from 'react';

const LOADING_PHRASES = [
  "Reading your work...",
  "Looking at the requirements...",
  "Checking the rubric rules...",
  "Finding things you might have missed...",
  "Analyzing visuals and text...",
  "Thinking about feedback...",
  "Almost ready with your fixes..."
];

export const LoadingDisplay: React.FC = () => {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pt-2 animate-fade-in">
      <div className="bg-stone-900 text-stone-50 rounded-[2.5rem] p-12 shadow-2xl relative overflow-hidden min-h-[85vh] flex flex-col items-center justify-center text-center border border-stone-800">
        
        <div className="absolute top-[-50%] left-[-20%] w-[500px] h-[500px] bg-stone-800/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-[-50%] right-[-20%] w-[400px] h-[400px] bg-stone-800/20 rounded-full blur-3xl animate-pulse delay-700"></div>

        <div className="relative z-10 mb-8">
           <div className="w-20 h-20 bg-stone-800 rounded-full flex items-center justify-center relative border border-stone-700">
              <svg className="w-10 h-10 text-stone-400 animate-spin-slow" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"></path><path d="m16.2 7.8 2.9-2.9"></path><path d="M18 12h4"></path><path d="m16.2 16.2 2.9 2.9"></path><path d="M12 18v4"></path><path d="m4.9 19.1 2.9-2.9"></path><path d="M2 12h4"></path><path d="m4.9 4.9 2.9 2.9"></path></svg>
              
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
              </div>
           </div>
        </div>

        <h3 className="relative z-10 text-2xl md:text-3xl font-bold text-stone-200 tracking-tight transition-all duration-500 transform">
          {LOADING_PHRASES[phraseIndex]}
        </h3>
        
        <p className="relative z-10 text-stone-500 text-base mt-4 font-medium max-w-md">
          Hold tight, we're checking your work against every single rule.
        </p>

        <div className="relative z-10 w-72 h-1.5 bg-stone-800 rounded-full mt-12 overflow-hidden shadow-inner">
          <div className="h-full bg-stone-600 rounded-full animate-indeterminate-bar"></div>
        </div>
      </div>
    </div>
  );
};
