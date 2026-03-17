'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { MessageSquare, Send, X, Sparkles } from 'lucide-react';
import { sendChatMessage, type ChatMessage } from '@/lib/api/chat.api';
import { cn } from '@/lib/utils';

const QUICK_PROMPTS = [
  "What's my total balance?",
  "Summarize my recent spending",
  "Which category do I spend most on?",
  "Any unusual transactions?",
];

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const { reply } = await sendChatMessage(userMessage, messages);
      setMessages([...newMessages, { role: 'model', content: reply }]);
    } catch {
      setMessages([...newMessages, { role: 'model', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleQuickPrompt(prompt: string) {
    setInput(prompt);
    // Submit after state update
    setTimeout(() => {
      const form = document.getElementById('chat-form') as HTMLFormElement;
      form?.requestSubmit();
    }, 0);
  }

  return (
    <>
      {/* Floating Action Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="chat-fab"
          aria-label="Open AI chat"
        >
          <Sparkles className="size-6 text-white" />
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="chat-panel">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 flex items-center justify-center">
                <Sparkles className="size-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
                <p className="text-[10px] text-slate-500">Powered by Gemini</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              <X className="size-4 text-slate-400" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="size-12 rounded-full bg-gradient-to-r from-violet-600/20 to-cyan-500/20 flex items-center justify-center">
                  <MessageSquare className="size-6 text-violet-400" />
                </div>
                <p className="text-sm text-slate-400 text-center">
                  Ask me anything about your finances
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleQuickPrompt(prompt)}
                      className="px-3 py-1.5 rounded-full text-xs text-slate-300 border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'max-w-[85%] px-4 py-3 text-sm rounded-2xl whitespace-pre-wrap',
                  msg.role === 'user'
                    ? 'ml-auto bg-violet-600/20 border border-violet-500/20 text-white rounded-br-md'
                    : 'mr-auto glass-card text-slate-200 rounded-bl-md'
                )}
              >
                {msg.content}
              </div>
            ))}

            {isLoading && (
              <div className="mr-auto glass-card px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1.5">
                  <div className="size-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="size-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="size-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form id="chat-form" onSubmit={handleSubmit} className="p-3 border-t border-white/[0.06]">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your finances..."
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-glow-violet transition-all"
              >
                <Send className="size-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
