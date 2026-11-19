import React, { useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";
import { 
  MessageSquare, 
  X, 
  Maximize2, 
  Minimize2, 
  Send, 
  Loader2, 
  RotateCcw 
} from "lucide-react";
import { UserProfile } from "../types";
import { getApiUrl } from "../config";

interface FloatingAIAssistantProps {
  userProfile: UserProfile | null;
  onNavigate: (view: string) => void;
  themeMode: "light" | "dark";
}

interface ChatMessage {
  role: "user" | "model";
  text: string;
  timestamp?: string;
}

export default function FloatingAIAssistant({ userProfile, themeMode }: FloatingAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const storageKey = `godscare_floating_chat_${userProfile?.uid || "guest"}`;

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    const patientName = userProfile?.name ? userProfile.name.split(' ')[0] : '';
    return [
      {
        role: "model",
        text: patientName ? `Hello ${patientName}! How can I help you today?` : "Hello! How can I help you today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages, storageKey]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isDark = themeMode === "dark";

  // Draggable window state
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (window.innerWidth < 640) return;
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("input")) {
      return;
    }
    e.preventDefault();
    setIsDragging(true);

    const currentX = position ? position.x : 0;
    const currentY = position ? position.y : 0;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentX,
      initialY: currentY
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.innerWidth < 640) return;
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("input")) {
      return;
    }
    const touch = e.touches[0];
    setIsDragging(true);

    const currentX = position ? position.x : 0;
    const currentY = position ? position.y : 0;

    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initialX: currentX,
      initialY: currentY
    };
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setPosition(null);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;

      const newX = dragRef.current.initialX + deltaX;
      const newY = dragRef.current.initialY + deltaY;

      const maxDeltaX = window.innerWidth / 2 - 50;
      const maxDeltaY = window.innerHeight / 2 - 50;

      setPosition({
        x: Math.max(-maxDeltaX, Math.min(maxDeltaX, newX)),
        y: Math.max(-maxDeltaY, Math.min(maxDeltaY, newY))
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragRef.current.startX;
      const deltaY = touch.clientY - dragRef.current.startY;

      const newX = dragRef.current.initialX + deltaX;
      const newY = dragRef.current.initialY + deltaY;

      const maxDeltaX = window.innerWidth / 2 - 50;
      const maxDeltaY = window.innerHeight / 2 - 50;

      setPosition({
        x: Math.max(-maxDeltaX, Math.min(maxDeltaX, newX)),
        y: Math.max(-maxDeltaY, Math.min(maxDeltaY, newY))
      });
    };

    const handleMouseUp = () => setIsDragging(false);
    const handleTouchEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, loading]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || input).trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      role: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const apiFormat = nextMessages.map(m => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }]
      }));

      const res = await fetch(getApiUrl("/api/gemini/agent"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiFormat,
          uid: userProfile?.uid || "guest_portal_user",
          role: "general_assistant"
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const replyText = data.text || data.message || "How can I help you today?";

      setMessages(prev => [
        ...prev,
        {
          role: "model" as const,
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      console.error("[Chat Assistant Error]:", err);
      setMessages(prev => [
        ...prev,
        {
          role: "model" as const,
          text: "I'm having trouble connecting right now, but I'm here to help. Please try asking again in a moment.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    const patientName = userProfile?.name ? userProfile.name.split(' ')[0] : '';
    setMessages([
      {
        role: "model",
        text: patientName ? `Hello ${patientName}! How can I help you today?` : "Hello! How can I help you today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div id="godscare-global-floating-assistant" className="select-none">
      {/* Floating Trigger Button (when closed) */}
      {!isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center"
          style={position ? { transform: `translate3d(${position.x}px, ${position.y}px, 0)` } : undefined}
        >
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open Chat"
            id="btn-global-ai-assistant"
            className="h-13 w-13 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer border border-emerald-400/30"
            title="Chat"
          >
            <MessageSquare className="h-6 w-6 text-white" />
          </button>
        </div>
      )}

      {/* Floating Moveable Chat Modal (when open) */}
      {isOpen && (
        <div
          id="global-ai-assistant-modal"
          style={position ? { transform: `translate3d(${position.x}px, ${position.y}px, 0)` } : undefined}
          className={`fixed bottom-3 right-3 left-3 sm:left-auto sm:bottom-6 sm:right-6 z-50 transition-all duration-200 flex flex-col overflow-hidden border shadow-2xl rounded-2xl ${
            isExpanded 
              ? "w-auto sm:w-[600px] md:w-[700px] h-[82vh] max-h-[820px]" 
              : "w-auto sm:w-[420px] h-[75vh] sm:h-[560px] max-h-[85vh]"
          } ${
            isDark 
              ? "bg-zinc-900 border-zinc-700/80 text-zinc-100 shadow-zinc-950/80" 
              : "bg-white border-zinc-200/90 text-zinc-900 shadow-slate-900/15"
          }`}
        >
          {/* Header Bar */}
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className={`p-3 sm:p-3.5 px-4 flex items-center justify-between border-b cursor-move select-none ${
              isDark 
                ? "bg-zinc-950 border-zinc-800 text-white" 
                : "bg-slate-900 border-slate-800 text-white"
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
                  <span>Chat Assistant</span>
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </h3>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center space-x-1">
              <button
                onClick={handleResetChat}
                title="Restart chat"
                aria-label="Restart chat"
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse" : "Expand"}
                aria-label={isExpanded ? "Collapse" : "Expand"}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer hidden sm:block"
              >
                {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                aria-label="Close"
                className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className={`flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3.5 text-xs sm:text-sm ${
            isDark ? "bg-zinc-950/60" : "bg-slate-50/60"
          }`}>
            {messages.map((msg, index) => {
              const isUser = msg.role === "user";
              return (
                <div key={index} className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1`}>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                    <span className="font-medium">{isUser ? "You" : "Assistant"}</span>
                    {msg.timestamp && <span>• {msg.timestamp}</span>}
                  </div>

                  <div
                    className={`max-w-[90%] sm:max-w-[85%] p-3 sm:p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed break-words overflow-hidden ${
                      isUser
                        ? "bg-emerald-600 text-white rounded-tr-none shadow-xs font-medium" 
                        : isDark
                          ? "bg-zinc-800/95 border border-zinc-700/80 text-zinc-100 rounded-tl-none shadow-xs"
                          : "bg-white border border-zinc-200/90 text-zinc-900 rounded-tl-none shadow-xs"
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <div className="markdown-content">
                        <Markdown>{msg.text}</Markdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center space-x-2 text-zinc-400 text-xs py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                <span>Typing response...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Suggestion Chips */}
          <div className={`px-3 py-1.5 border-t flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] shrink-0 ${
            isDark ? "bg-zinc-900/90 border-zinc-800" : "bg-zinc-50/90 border-zinc-200/80"
          }`}>
            {[
              "📅 Book Appointment",
              "💊 Pharmacy Catalog",
              "⏰ Clinic Hours",
              "📋 Medical Records"
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip.replace(/^[^\s]+\s/, ""))}
                disabled={loading}
                className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-medium transition-all cursor-pointer shrink-0 border ${
                  isDark
                    ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                    : "bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input & Send Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className={`p-2.5 sm:p-3 border-t flex items-center gap-2 ${
              isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
            }`}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about appointments, medicines, symptoms..."
              disabled={loading}
              className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm focus:outline-hidden border transition-all ${
                isDark 
                  ? "bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500" 
                  : "bg-slate-50 border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-emerald-600"
              }`}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="px-3.5 sm:px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
