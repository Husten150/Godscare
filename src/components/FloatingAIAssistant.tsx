import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  X, 
  Minus, 
  Maximize2, 
  Minimize2, 
  Send, 
  GripHorizontal, 
  Loader2, 
  Stethoscope, 
  HeartPulse, 
  ShieldAlert, 
  Activity, 
  RotateCcw,
  User,
  ArrowRight
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
  thoughts?: Array<{ action: string; input?: any; result?: any }>;
  modelUsed?: string;
  roleUsed?: string;
  timestamp?: string;
}

export default function FloatingAIAssistant({ userProfile, onNavigate, themeMode }: FloatingAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"physician" | "general_assistant" | "quick_triage" | "wellness_coach">("physician");
  
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        role: "model",
        text: `Hello ${userProfile?.name ? userProfile.name.split(' ')[0] : 'there'}! I am your GodsCare Clinical Care Assistant. You can ask me any medical questions, describe symptoms for an immediate triage assessment, or get guidance on doctors and hospital services. How can I assist your health today?`,
        modelUsed: "gemini-3.1-pro",
        roleUsed: "physician",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

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

  // Clamped viewport bounds for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag when clicking the drag handle or header background, not buttons
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("select")) {
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
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("select")) {
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
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;

      const newX = dragRef.current.initialX + deltaX;
      const newY = dragRef.current.initialY + deltaY;

      // Limit bounds roughly to screen
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

    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging]);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updatedMessages = [...messages, { role: "user" as const, text, timestamp: timeStr }];
    setMessages(updatedMessages);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const apiFormat = updatedMessages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      const modeMap: Record<string, string> = {
        physician: "complex",
        general_assistant: "general",
        quick_triage: "fast",
        wellness_coach: "general"
      };

      const res = await fetch(getApiUrl("/api/gemini/agent"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiFormat,
          uid: userProfile?.uid || "guest_portal_user",
          role: selectedRole,
          mode: modeMap[selectedRole] || "general"
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const replyText = data.text || data.message || "I have received your request and am processing your inquiry.";

      setMessages(prev => [
        ...prev,
        {
          role: "model" as const,
          text: replyText,
          thoughts: data.thoughts,
          modelUsed: data.modelUsed,
          roleUsed: data.roleUsed || selectedRole,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      console.error("[Clinical Assistant Error]:", err);
      setMessages(prev => [
        ...prev,
        {
          role: "model" as const,
          text: "I am currently unable to connect to the medical knowledge server. Please verify your internet connection or reach out directly to GodsCare emergency reception.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        role: "model",
        text: `Chat reset. Hello ${userProfile?.name ? userProfile.name.split(' ')[0] : 'there'}! How can I assist you right now?`,
        modelUsed: "gemini-3.1-pro",
        roleUsed: selectedRole,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div id="godscare-global-floating-assistant" className="select-none">
      {/* Floating Trigger Button (when closed) */}
      {!isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5"
          style={position ? { transform: `translate3d(${position.x}px, ${position.y}px, 0)` } : undefined}
        >
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open GodsCare AI Assistant"
            id="btn-global-ai-assistant"
            className="p-3.5 sm:p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer group border border-emerald-400/30 backdrop-blur-md"
            title="Open GodsCare Clinical AI Assistant (Moveable)"
          >
            <div className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
            </div>
            <Sparkles className="h-6 w-6 text-white group-hover:rotate-12 transition-transform" />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out font-mono text-[11px] font-bold uppercase tracking-wider group-hover:ml-2 whitespace-nowrap">
              Clinical Assistant
            </span>
          </button>
        </div>
      )}

      {/* Floating Moveable Chat Modal (when open) */}
      {isOpen && (
        <div
          id="global-ai-assistant-modal"
          style={position ? { transform: `translate3d(${position.x}px, ${position.y}px, 0)` } : undefined}
          className={`fixed bottom-5 right-5 z-50 transition-all duration-200 flex flex-col overflow-hidden border shadow-2xl rounded-2xl ${
            isExpanded 
              ? "w-[94vw] sm:w-[600px] md:w-[700px] h-[85vh] max-h-[850px]" 
              : "w-[92vw] sm:w-[420px] h-[580px] max-h-[90vh]"
          } ${
            isDark 
              ? "bg-zinc-900 border-zinc-700/80 text-zinc-100 shadow-zinc-950/80" 
              : "bg-white border-zinc-200/90 text-zinc-900 shadow-slate-900/15"
          }`}
        >
          {/* Draggable Header Bar */}
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className={`p-3.5 px-4 flex items-center justify-between border-b cursor-move select-none ${
              isDark 
                ? "bg-zinc-950 border-zinc-800 text-white" 
                : "bg-slate-900 border-slate-800 text-white"
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 shrink-0">
                <Stethoscope className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold font-display tracking-tight text-white flex items-center gap-1.5">
                    GodsCare Clinical AI
                  </h3>
                  <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                    Live
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
                  <GripHorizontal className="h-3 w-3 text-zinc-500" />
                  <span>Drag header to move</span>
                </div>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center space-x-1">
              <button
                onClick={handleResetChat}
                title="Restart conversation"
                aria-label="Restart conversation"
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse view" : "Expand view"}
                aria-label={isExpanded ? "Collapse view" : "Expand view"}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors cursor-pointer hidden sm:block"
              >
                {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Assistant"
                aria-label="Close Assistant"
                className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Role Switcher Toolbar */}
          <div className={`px-3 py-2 border-b flex items-center justify-between gap-2 text-xs ${
            isDark ? "bg-zinc-900/90 border-zinc-800" : "bg-slate-50 border-zinc-200"
          }`}>
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
              <button
                onClick={() => setSelectedRole("physician")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                  selectedRole === "physician"
                    ? "bg-emerald-600 text-white font-bold shadow-xs"
                    : isDark ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800" : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/70"
                }`}
              >
                <Stethoscope className="h-3 w-3" />
                <span>Physician</span>
              </button>

              <button
                onClick={() => setSelectedRole("quick_triage")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                  selectedRole === "quick_triage"
                    ? "bg-amber-600 text-white font-bold shadow-xs"
                    : isDark ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800" : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/70"
                }`}
              >
                <ShieldAlert className="h-3 w-3" />
                <span>Triage</span>
              </button>

              <button
                onClick={() => setSelectedRole("general_assistant")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                  selectedRole === "general_assistant"
                    ? "bg-sky-600 text-white font-bold shadow-xs"
                    : isDark ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800" : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/70"
                }`}
              >
                <HeartPulse className="h-3 w-3" />
                <span>Care Guide</span>
              </button>

              <button
                onClick={() => setSelectedRole("wellness_coach")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                  selectedRole === "wellness_coach"
                    ? "bg-teal-600 text-white font-bold shadow-xs"
                    : isDark ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800" : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/70"
                }`}
              >
                <Activity className="h-3 w-3" />
                <span>Wellness</span>
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className={`flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3.5 text-xs ${
            isDark ? "bg-zinc-950/60" : "bg-slate-50/60"
          }`}>
            {messages.map((msg, index) => {
              const isUser = msg.role === "user";
              return (
                <div key={index} className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1`}>
                  <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-400">
                    <span>{isUser ? (userProfile?.name || "You") : "GodsCare Clinical AI"}</span>
                    {msg.timestamp && <span>• {msg.timestamp}</span>}
                  </div>

                  <div
                    className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? isDark 
                          ? "bg-emerald-600 text-white rounded-tr-none shadow-xs font-medium" 
                          : "bg-slate-900 text-white rounded-tr-none shadow-xs font-medium"
                        : isDark
                          ? "bg-zinc-800/90 border border-zinc-700/80 text-zinc-100 rounded-tl-none shadow-xs"
                          : "bg-white border border-zinc-200/80 text-zinc-900 rounded-tl-none shadow-xs"
                    }`}
                  >
                    {msg.text}

                    {/* Executed Clinical Handshakes */}
                    {msg.thoughts && msg.thoughts.length > 0 && (
                      <div className={`mt-2 pt-2 border-t text-[9px] font-mono space-y-1 ${
                        isDark ? "border-zinc-700 text-zinc-300" : "border-zinc-200 text-zinc-600"
                      }`}>
                        <span className="font-bold text-emerald-500 uppercase tracking-wider block">
                          Verified Clinical Tool Handshake:
                        </span>
                        {msg.thoughts.map((t, idx) => (
                          <div key={idx} className={`p-1.5 rounded border ${
                            isDark ? "bg-zinc-900 border-zinc-700" : "bg-slate-50 border-zinc-200"
                          }`}>
                            • Action: {t.action}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center space-x-2 text-zinc-500 dark:text-zinc-400 text-xs font-mono py-1">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                <span>Consulting GodsCare Clinical Knowledge Base...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Clinical Suggestions */}
          <div className={`px-3 py-2 border-t flex items-center gap-1.5 overflow-x-auto no-scrollbar ${
            isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
          }`}>
            {[
              "Check symptom severity",
              "Book doctor consultation",
              "Over-the-counter remedy",
              "Hospital department guide",
              "Emergency signs"
            ].map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(suggestion)}
                disabled={loading}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all border shrink-0 cursor-pointer disabled:opacity-50 ${
                  isDark
                    ? "bg-zinc-800/80 hover:bg-zinc-700 border-zinc-700 text-zinc-300 hover:text-white"
                    : "bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 border-zinc-200/80 text-zinc-700"
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Direct Link Actions */}
          <div className={`px-3 py-1.5 border-t flex items-center justify-between text-[11px] font-medium ${
            isDark ? "bg-zinc-950/80 border-zinc-800 text-zinc-400" : "bg-slate-50 border-zinc-200 text-zinc-600"
          }`}>
            <span>Quick Links:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onNavigate("doctors");
                  setIsOpen(false);
                }}
                className="hover:text-emerald-500 flex items-center gap-1 cursor-pointer"
              >
                <span>Find Doctors</span>
                <ArrowRight className="h-3 w-3" />
              </button>
              <span>•</span>
              <button
                onClick={() => {
                  onNavigate("departments");
                  setIsOpen(false);
                }}
                className="hover:text-emerald-500 flex items-center gap-1 cursor-pointer"
              >
                <span>Departments</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Input & Send Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className={`p-3 border-t flex items-center gap-2 ${
              isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
            }`}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a medical or health question..."
              disabled={loading}
              className={`flex-1 px-3.5 py-2 rounded-xl text-xs focus:outline-hidden border transition-all ${
                isDark 
                  ? "bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500" 
                  : "bg-slate-50 border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-emerald-600"
              }`}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="p-2 sm:px-3.5 sm:py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
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
