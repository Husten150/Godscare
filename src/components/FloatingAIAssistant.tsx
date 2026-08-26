import React, { useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";
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
  ArrowRight,
  Pill,
  Calendar,
  Building2,
  ClipboardList
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
  thoughts?: Array<{ action: string; arguments?: any; input?: any; result?: any }>;
  modelUsed?: string;
  roleUsed?: string;
  timestamp?: string;
}

export default function FloatingAIAssistant({ userProfile, onNavigate, themeMode }: FloatingAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"physician" | "general_assistant" | "quick_triage" | "wellness_coach">("physician");
  
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const patientName = userProfile?.name ? userProfile.name.split(' ')[0] : 'there';
    return [
      {
        role: "model",
        text: `### Welcome to GodsCare Medical Center\n\nHello **${patientName}**! I am **Dr. GodsCare**, Lead Attending Physician and Senior Clinical Consultant.\n\nI am here to attend attentively to your medical needs, provide thorough clinical evaluations, and recommend:\n- 💊 **Prescription & OTC Medications** with exact dosage guidelines\n- 👨‍⚕️ **Specialist Doctor Referrals** across all hospital departments\n- 📋 **Personalized Care Pathways** & Diagnostic Investigations\n- 🌿 **Evidence-Based Lifestyle & Dietary Protocols**\n\n*How are you feeling today, or what would you like me to evaluate and recommend?*`,
        modelUsed: "gemini-3.7-flash",
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
          mode: modeMap[selectedRole] || "complex"
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const replyText = data.text || data.message || "I have received your clinical inquiry and reviewed your record.";

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
          text: "### GodsCare Clinical Care\n\nI am currently operating in direct offline consultation mode. Please state your symptoms or questions clearly, and I will provide you with medical recommendations.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    const patientName = userProfile?.name ? userProfile.name.split(' ')[0] : 'there';
    setMessages([
      {
        role: "model",
        text: `### Consultation Reset\n\nHello **${patientName}**, I am ready for your next consultation. Please describe any symptoms you are feeling, or ask for specific medicine and doctor recommendations.`,
        modelUsed: "gemini-3.7-flash",
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
            title="Open GodsCare Clinical Doctor Assistant (Moveable)"
          >
            <div className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
            </div>
            <Stethoscope className="h-6 w-6 text-white group-hover:rotate-12 transition-transform" />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out font-mono text-[11px] font-bold uppercase tracking-wider group-hover:ml-2 whitespace-nowrap">
              Dr. GodsCare AI
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
              ? "w-[94vw] sm:w-[620px] md:w-[740px] h-[86vh] max-h-[880px]" 
              : "w-[92vw] sm:w-[460px] h-[600px] max-h-[92vh]"
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
                    Dr. GodsCare • Clinical Consultant
                  </h3>
                  <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                    On Duty
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
                  <GripHorizontal className="h-3 w-3 text-zinc-500" />
                  <span>Drag header to reposition</span>
                </div>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center space-x-1">
              <button
                onClick={handleResetChat}
                title="Restart consultation"
                aria-label="Restart consultation"
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
                <span>Physician (Doctor)</span>
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
                <span>Fast Triage</span>
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
                <span>Wellness & Diet</span>
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
                    <span className="font-bold">{isUser ? (userProfile?.name || "Patient") : "Dr. GodsCare"}</span>
                    {msg.modelUsed && !isUser && (
                      <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 rounded">
                        {msg.modelUsed}
                      </span>
                    )}
                    {msg.timestamp && <span>• {msg.timestamp}</span>}
                  </div>

                  <div
                    className={`max-w-[92%] p-4 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? isDark 
                          ? "bg-emerald-600 text-white rounded-tr-none shadow-xs font-medium" 
                          : "bg-slate-900 text-white rounded-tr-none shadow-xs font-medium"
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

                    {/* Executed Clinical Handshakes */}
                    {msg.thoughts && msg.thoughts.length > 0 && (
                      <div className={`mt-3 pt-2.5 border-t text-[9px] font-mono space-y-1 ${
                        isDark ? "border-zinc-700 text-zinc-300" : "border-zinc-200 text-zinc-600"
                      }`}>
                        <span className="font-bold text-emerald-500 uppercase tracking-wider block flex items-center gap-1">
                          <ClipboardList className="h-3 w-3" />
                          Clinical Database Operations:
                        </span>
                        {msg.thoughts.map((t, idx) => (
                          <div key={idx} className={`p-1.5 rounded border flex items-center justify-between gap-2 ${
                            isDark ? "bg-zinc-900 border-zinc-700" : "bg-slate-50 border-zinc-200"
                          }`}>
                            <span>• Executed: <strong>{t.action}</strong></span>
                            {t.arguments && (
                              <code className="text-[8px] truncate max-w-[180px]">
                                {JSON.stringify(t.arguments)}
                              </code>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick navigation action chips embedded in assistant messages */}
                    {!isUser && index > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-zinc-200/60 dark:border-zinc-700/60 flex flex-wrap gap-1.5">
                        <button
                          onClick={() => {
                            onNavigate("pharmacy");
                            setIsOpen(false);
                          }}
                          className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md text-[10px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Pill className="h-2.5 w-2.5" />
                          <span>View Pharmacy Medicines</span>
                        </button>
                        <button
                          onClick={() => {
                            onNavigate("doctors");
                            setIsOpen(false);
                          }}
                          className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-md text-[10px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Calendar className="h-2.5 w-2.5" />
                          <span>Book Doctor Appointment</span>
                        </button>
                        <button
                          onClick={() => {
                            onNavigate("departments");
                            setIsOpen(false);
                          }}
                          className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-md text-[10px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Building2 className="h-2.5 w-2.5" />
                          <span>Hospital Departments</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center space-x-2 text-zinc-500 dark:text-zinc-400 text-xs font-mono py-2">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                <span>Dr. GodsCare is reviewing symptoms, pharmacy catalog, and specialist schedules...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Clinical Recommendation Suggestions */}
          <div className={`px-3 py-2 border-t flex items-center gap-1.5 overflow-x-auto no-scrollbar ${
            isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
          }`}>
            <span className="text-zinc-400 font-mono text-[9px] uppercase font-bold shrink-0">Ask Doctor:</span>
            {[
              "Recommend medicine for headache & fever",
              "Recommend a specialist cardiologist",
              "Diet & home remedies for high blood pressure",
              "Recommend cough & sore throat remedy",
              "Remedy for stomach acid reflux / indigestion",
              "Fast triage: dizziness & fatigue"
            ].map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(suggestion)}
                disabled={loading}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all border shrink-0 cursor-pointer disabled:opacity-50 ${
                  isDark
                    ? "bg-zinc-800/90 hover:bg-zinc-700 border-zinc-700 text-zinc-300 hover:text-white"
                    : "bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 border-zinc-200/90 text-zinc-700"
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
            <span>Hospital Quick Links:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onNavigate("pharmacy");
                  setIsOpen(false);
                }}
                className="hover:text-emerald-500 flex items-center gap-1 cursor-pointer"
              >
                <Pill className="h-3 w-3" />
                <span>Pharmacy</span>
              </button>
              <span>•</span>
              <button
                onClick={() => {
                  onNavigate("doctors");
                  setIsOpen(false);
                }}
                className="hover:text-emerald-500 flex items-center gap-1 cursor-pointer"
              >
                <User className="h-3 w-3" />
                <span>Doctors</span>
              </button>
              <span>•</span>
              <button
                onClick={() => {
                  onNavigate("departments");
                  setIsOpen(false);
                }}
                className="hover:text-emerald-500 flex items-center gap-1 cursor-pointer"
              >
                <Building2 className="h-3 w-3" />
                <span>Departments</span>
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
              placeholder="Ask Dr. GodsCare for symptom advice, medications, or doctor referrals..."
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
              aria-label="Send message to doctor"
              className="p-2 sm:px-3.5 sm:py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Consult</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

