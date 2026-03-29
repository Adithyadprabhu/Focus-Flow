'use client';

import { useState, useRef, useEffect } from 'react';

const mockResponses = [
  "Based on recent tests, your class accuracy is up 12%. I recommend focusing next on advanced algebra concepts.",
  "I noticed 3 students are slipping in engagement. You might want to try a gamified pop quiz for tomorrow's session.",
  "That's an interesting observation! The data suggests students perform 20% better when tests include visual diagrams.",
  "I'm analyzing the results from 'Midterm Assessment'. Question 4 had the lowest pass rate at 31%. Might need a review.",
  "Sure, I can generate a quick summary report of this week's activity. Give me just a second..."
];

export default function AIAssistantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Hi there! I am your Focus-Flow AI assistant. Ask me anything about your class performance or let me draft a test for you.',
      timestamp: new Date()
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, isOpen]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: 'user',
      text: inputVal,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMsg]);
    setInputVal('');
    setIsTyping(true);

    // Simulate AI thinking
    setTimeout(() => {
      const responseText = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: responseText,
        timestamp: new Date()
      }]);
      setIsTyping(false);
    }, 1500 + Math.random() * 1000); // 1.5 - 2.5s delay
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Ask AI Instructor"
          className="fixed bottom-24 lg:bottom-10 right-8 w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-90 transition-all z-[60] group border border-white/20"
        >
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
          <span
            className="material-symbols-outlined text-3xl group-hover:rotate-12 transition-transform drop-shadow-md"
            aria-hidden="true"
          >
            auto_awesome
          </span>
          {/* Tooltip */}
          <div className="absolute -top-12 right-0 bg-white text-primary px-4 py-2 rounded-xl text-xs font-bold shadow-lg border border-primary/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Ask AI Instructor
          </div>
        </button>
      )}

      {/* Chat Panel Backdrop for Mobile (optional, but good for focus) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/5 z-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat Panel */}
      <div 
        className={`fixed z-[60] bottom-0 right-0 lg:bottom-10 lg:right-8 w-full h-[85vh] lg:w-[400px] lg:h-[600px] bg-surface flex flex-col shadow-2xl border border-outline-variant/20 transition-all duration-300 transform origin-bottom-right ${
          isOpen 
            ? 'scale-100 opacity-100 lg:rounded-2xl rounded-t-3xl' 
            : 'scale-90 opacity-0 pointer-events-none translate-y-10'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-primary to-secondary text-white lg:rounded-t-2xl rounded-t-3xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30">
              <span className="material-symbols-outlined text-xl">smart_toy</span>
            </div>
            <div>
              <h3 className="font-bold text-lg font-headline leading-tight">Focus AI</h3>
              <p className="text-[10px] text-white/80 uppercase tracking-wider font-bold">Online</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-surface-container-lowest/50">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-sm ${
                  isUser 
                    ? 'bg-primary text-white rounded-tr-sm' 
                    : 'bg-white border border-outline-variant/10 text-on-surface rounded-tl-sm'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
                <span className="text-[10px] text-on-surface-variant font-medium mt-1.5 px-1">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            );
          })}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex flex-col items-start">
              <div className="bg-white border border-outline-variant/10 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex gap-1.5 items-center">
                <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Chips (optional touch of AI flair) */}
        {!isTyping && messages.length < 3 && (
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
            {["Summarize performance", "Draft a quiz"].map((chip) => (
              <button 
                key={chip}
                onClick={() => setInputVal(chip)}
                className="whitespace-nowrap bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 rounded-full px-4 py-1.5 text-xs font-bold transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Input Area */}
        <form 
          onSubmit={handleSend}
          className="p-4 bg-white border-t border-outline-variant/10 flex items-center gap-3 lg:rounded-b-2xl flex-shrink-0"
        >
          <input 
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Ask AI anything..."
            className="flex-1 bg-surface-container-lowest border border-outline-variant/40 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-on-surface-variant/50"
          />
          <button 
            type="submit"
            disabled={!inputVal.trim() || isTyping}
            className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
              !inputVal.trim() || isTyping
                ? 'bg-surface-container-high text-on-surface-variant/50 cursor-not-allowed'
                : 'bg-primary text-white shadow-md hover:scale-105 hover:shadow-lg active:scale-95'
            }`}
          >
            <span className="material-symbols-outlined text-[20px] ml-1">send</span>
          </button>
        </form>
      </div>
    </>
  );
}
