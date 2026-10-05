/**
 * AI Drilling Assistant Page
 * Full chat UI: session management sidebar, context selector,
 * markdown-rendered messages, source citations.
 */
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot, Send, ArrowUp, Plus, Trash2, Edit2, Check, X,
  Globe, Drill, Map, Layers, Activity,
  ChevronRight, BookOpen, AlertTriangle, MessageSquare, Sparkles,
  FileText, Database, ChevronLeft,
} from "lucide-react";
import { assistantService, documentsService } from "@/services/intelligenceService";
import { basinsService, wellsService } from "@/services/wellsService";
import { cn } from "@/utils";
import { useAuthStore } from "@/store/authStore";

// ─── Context type config ──────────────────────────────────────
const CONTEXT_CONFIG = {
  Global:    { icon: Globe,     label: "Global Knowledge", color: "#2563eb" },
  Well:      { icon: Drill,     label: "Well Context",     color: "#059669" },
  Field:     { icon: Map,       label: "Field Context",    color: "#7c3aed" },
  Formation: { icon: Layers,    label: "Formation Context",color: "#d97706" },
  Event:     { icon: Activity,  label: "Event Context",    color: "#dc2626" },
};

// ─── Suggested prompts ────────────────────────────────────────
const SUGGESTIONS = [
  "What are the most common causes of mud loss in the Assam Shelf Basin?",
  "Show historical stuck pipe incidents and their mitigations",
  "What are the drilling risks in the Barail Formation?",
  "How many wells have been drilled in Mumbai High field?",
  "Explain the kick hazards in overpressured formations",
  "What lessons have been learned from lost circulation events?",
];

// ─── Message renderer ─────────────────────────────────────────
function MessageBubble({ role, message, sources, isStreaming, isThinking }: {
  role: string;
  message: string;
  sources?: string[];
  isStreaming?: boolean;
  isThinking?: boolean;
}) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3 max-w-[80%]", isUser ? "ml-auto flex-row-reverse" : "mr-auto")}>
      {/* Avatar */}
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
        isUser ? "bg-blue-600" : "bg-gray-800"
      )}>
        {isUser ? (
          <span className="text-white text-xs font-bold">U</span>
        ) : (
          <Bot size={14} className="text-white" />
        )}
      </div>

      <div className={cn("min-w-0 flex flex-col w-full", isUser ? "items-end" : "items-start")}>
        <div className={cn(
          "rounded-2xl px-4 py-3 text-sm shadow-xs max-w-full overflow-hidden",
          isUser
            ? "bg-blue-600 text-white rounded-tr-sm"
            : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm"
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message}</p>
          ) : isThinking ? (
            <div className="flex items-center gap-2 text-gray-500 font-medium">
              <Sparkles size={16} className="animate-sparkle-think" />
              <span>Thinking...</span>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none break-words overflow-hidden">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({node, ...props}) => (
                    <div className="overflow-x-auto my-3 max-w-full">
                      <table className="min-w-full divide-y divide-gray-300 border border-gray-200 rounded-sm" {...props} />
                    </div>
                  ),
                  th: ({node, ...props}) => <th className="px-3 py-2 bg-gray-100 text-left text-xs font-semibold text-gray-700 border-b border-r border-gray-200 last:border-r-0" {...props} />,
                  td: ({node, ...props}) => <td className="px-3 py-2 text-xs text-gray-600 border-b border-r border-gray-200 last:border-r-0" {...props} />,
                  pre: ({node, ...props}) => <pre className="max-w-full overflow-x-auto bg-gray-900 text-gray-100 p-3 rounded-lg my-3" {...props} />,
                  code: ({node, inline, ...props}: any) => inline ? <code className="bg-gray-100 text-pink-600 px-1 py-0.5 rounded text-xs" {...props} /> : <code {...props} />,
                  p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                  h1: ({node, ...props}) => <h1 className="text-lg font-bold text-gray-900 mt-4 mb-2" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-md font-bold text-gray-900 mt-3 mb-2 border-b pb-1" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-sm font-bold text-gray-900 mt-2 mb-1" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
                  li: ({node, ...props}) => <li className="text-gray-700" {...props} />,
                  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-3 italic text-gray-600 my-2" {...props} />
                }}
              >
                {message}
              </ReactMarkdown>
              {isStreaming && <span className="inline-block w-1.5 h-3.5 bg-gray-400 animate-pulse ml-1 rounded" />}
            </div>
          )}
        </div>

        {/* Sources */}
        {sources && sources.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <BookOpen size={10} className="text-gray-400" />
            {sources.map((s) => (
              <span key={s} className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Session list item ────────────────────────────────────────
function SessionItem({
  session,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  session: { id: number; title: string; context_type: string; updated_at: string };
  active: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(session.title);
  const ctxCfg = CONTEXT_CONFIG[session.context_type as keyof typeof CONTEXT_CONFIG] || CONTEXT_CONFIG.Global;
  const Icon = ctxCfg.icon;

  const save = () => {
    if (editVal.trim()) onRename(editVal.trim());
    setEditing(false);
  };

  return (
    <div
      onClick={() => !editing && onSelect()}
      className={cn(
        "group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors",
        active ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-100 border border-transparent"
      )}
    >
      <Icon size={13} style={{ color: ctxCfg.color }} className="flex-shrink-0" />

      {editing ? (
        <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
          <input
            autoFocus
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
            className="flex-1 text-xs bg-white border border-blue-300 rounded px-1.5 py-0.5 focus:outline-none min-w-0"
          />
          <button onClick={save} className="text-green-600 hover:text-green-700"><Check size={11} /></button>
          <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={11} /></button>
        </div>
      ) : (
        <>
          <span className={cn("text-xs flex-1 truncate", active ? "text-blue-700 font-medium" : "text-gray-700")}>
            {session.title}
          </span>
          <div className="hidden group-hover:flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setEditing(true); setEditVal(session.title); }}
              className="p-0.5 text-gray-400 hover:text-gray-600 rounded"
            >
              <Edit2 size={10} />
            </button>
            <button onClick={onDelete} className="p-0.5 text-gray-400 hover:text-red-600 rounded">
              <Trash2 size={10} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export function AssistantPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [contextType, setContextType] = useState<keyof typeof CONTEXT_CONFIG>("Global");
  const [isSending, setIsSending] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<number[]>([]);
  const [selectedWellId, setSelectedWellId] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<"docs" | "wells" | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  // ── Data queries ─────────────────────────────────────────────
  const { data: catalogData } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => documentsService.getBasinsFieldsWells(),
    staleTime: 300_000,
  });

  const { data: docsList } = useQuery({
    queryKey: ["documents-list"],
    queryFn: () => documentsService.list(),
    staleTime: 300_000,
  });
  const { data: sessions } = useQuery({
    queryKey: ["chat-sessions"],
    queryFn: assistantService.listSessions,
    staleTime: 5_000,
  });

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ["chat-messages", activeSessionId],
    queryFn: () => assistantService.getMessages(activeSessionId!),
    enabled: !!activeSessionId,
    staleTime: 0,
  });

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // ── Create session ────────────────────────────────────────────
  const createSession = async () => {
    const sess = await assistantService.createSession({
      title: "New Conversation",
      context_type: contextType,
    });
    qc.invalidateQueries({ queryKey: ["chat-sessions"] });
    setActiveSessionId(sess.id);
  };

  // ── Delete session ────────────────────────────────────────────
  const deleteSession = async (id: number) => {
    await assistantService.deleteSession(id);
    qc.invalidateQueries({ queryKey: ["chat-sessions"] });
    if (activeSessionId === id) setActiveSessionId(null);
  };

  // ── Rename session ────────────────────────────────────────────
  const renameSession = async (id: number, title: string) => {
    await assistantService.renameSession(id, title);
    qc.invalidateQueries({ queryKey: ["chat-sessions"] });
  };

  // ── Send message ──────────────────────────────────────────────
  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isSending) return;

    let sessionId = activeSessionId;

    // Auto-create session on first message
    if (!sessionId) {
      const sess = await assistantService.createSession({ context_type: contextType });
      sessionId = sess.id;
      setActiveSessionId(sess.id);
      qc.invalidateQueries({ queryKey: ["chat-sessions"] });
    }

    setInput("");
    setIsSending(true);
    setPendingMessage(msg);

    try {
      if (!sessionId) return;
      
      let extraContext = "";
      if (selectedDocs.length > 0) {
        extraContext += "--- SELECTED DOCUMENTS TEXT ---\n";
        for (const id of selectedDocs) {
          try {
            const doc = await documentsService.getDetail(id);
            extraContext += `Document: ${doc.file_name}\n${doc.markdown_content || ""}\n\n`;
          } catch(e) {}
        }
      }
      if (selectedWellId && catalogData) {
        let fieldId = null;
        let wellName = "";
        const w = catalogData.wells.find((well: any) => well.id === selectedWellId);
        if (w) { fieldId = w.field_id; wellName = w.name; }
        if (fieldId) {
          extraContext += "--- SELECTED WELL DATA ---\n";
          extraContext += `Target Well: ${wellName}\n`;
          try {
            const eventsData = await documentsService.getHistoricalEvents({ field_id: fieldId, limit: 1000 });
            if (eventsData.events && eventsData.events.length > 0) {
              extraContext += "Historical Events in Field:\n";
              eventsData.events.forEach((ev: any) => {
                const rel = ev.well_id === selectedWellId ? "Target Well" : "Offset Well";
                extraContext += `[${rel} - ${ev.well_name || "Unknown Well"}] ${ev.event_type} (${ev.severity}): ${ev.description}\n`;
              });
            }
          } catch (e) {}
        }
      }

      await assistantService.sendMessage(sessionId, { 
        message: msg, 
        context_type: contextType,
        ai_provider: localStorage.getItem("aiProvider") || undefined,
        extra_context: extraContext || undefined
      });
      await refetchMessages();
      qc.invalidateQueries({ queryKey: ["chat-sessions"] });
    } finally {
      setIsSending(false);
      setPendingMessage(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentMessages = messages ?? [];
  const hasMessages = currentMessages.length > 0;

  return (
    <div className="flex flex-row-reverse h-screen overflow-hidden">

      {/* ── Session sidebar ────────────────────────────────────── */}
      <div className="w-64 bg-gray-50 border-l border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-gray-200">
          <button
            onClick={createSession}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus size={13} />
            New Conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {(sessions ?? []).length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare size={24} className="text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">No conversations yet</p>
            </div>
          ) : (
            (sessions ?? []).map((s: { id: number; title: string; context_type: string; updated_at: string }) => (
              <SessionItem
                key={s.id}
                session={s}
                active={activeSessionId === s.id}
                onSelect={() => setActiveSessionId(s.id)}
                onRename={(title) => renameSession(s.id, title)}
                onDelete={() => deleteSession(s.id)}
              />
            ))
          )}
        </div>


      </div>

      {/* ── Chat area ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">NWIS Drilling Assistant</h1>
              <p className="text-xs text-gray-400">
                Domain-aware drilling intelligence
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-gray-500">RAG Knowledge Active</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {!hasMessages && !isSending && (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center mb-4">
                <Bot size={28} className="text-white" />
              </div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">NWIS Drilling Assistant</h2>
              <p className="text-sm text-gray-500 text-center max-w-sm mb-8">
                Ask about wells, formations, historical incidents, mitigation procedures, and drilling risks across all Indian petroleum basins.
              </p>
              {/* Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-left text-xs p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors text-gray-600"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentMessages.map((msg: { id: number; role: string; message: string; sources?: string[] }) => (
            <MessageBubble
              key={msg.id}
              role={msg.role}
              message={msg.message}
              sources={msg.sources}
            />
          ))}

          {pendingMessage && (
            <MessageBubble
              role="user"
              message={pendingMessage}
            />
          )}

          {isSending && (
            <MessageBubble
              role="assistant"
              message=""
              isThinking
            />
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white">
          {(selectedDocs.length > 0 || selectedWellId) && (
            <div className="flex items-center gap-2 mb-2 px-1">
              {selectedDocs.length > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] text-blue-700 bg-blue-50/80 border border-blue-100 px-2.5 py-1 rounded-full font-medium group">
                  <FileText size={12} className="text-blue-500" />
                  {selectedDocs.length} {selectedDocs.length === 1 ? "Doc" : "Docs"} Selected
                  <button onClick={() => setSelectedDocs([])} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 hover:text-blue-900 focus:outline-none">
                    <X size={12} />
                  </button>
                </div>
              )}
              {selectedWellId && catalogData && (
                <div className="flex items-center gap-1.5 text-[11px] text-green-700 bg-green-50/80 border border-green-100 px-2.5 py-1 rounded-full font-medium group">
                  <Database size={12} className="text-green-500" />
                  {catalogData.wells.find((w: any) => w.id === selectedWellId)?.name || "Well Context"}
                  <button onClick={() => setSelectedWellId(null)} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 hover:text-green-900 focus:outline-none">
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-end gap-3">
            <div ref={menuRef} className="relative flex-shrink-0">
              <button
                onClick={() => {
                  setMenuOpen(!menuOpen);
                  if (menuOpen) setActiveSubmenu(null);
                }}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border",
                  menuOpen 
                    ? "bg-gray-800 text-white border-gray-800 rotate-45" 
                    : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700"
                )}
              >
                <Plus size={18} />
              </button>
              
              {menuOpen && (
                <div className="absolute bottom-12 left-0 w-64 bg-white border border-gray-200 shadow-xl rounded-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-200 origin-bottom-left">
                  {!activeSubmenu ? (
                    <div className="space-y-1">
                      <button onClick={() => setActiveSubmenu("docs")} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="flex items-center gap-2.5"><FileText size={15} className="text-blue-500" /> Add Documents</div>
                        <ChevronRight size={14} className="text-gray-400" />
                      </button>
                      <button onClick={() => setActiveSubmenu("wells")} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="flex items-center gap-2.5"><Database size={15} className="text-green-500" /> Add Wells Context</div>
                        <ChevronRight size={14} className="text-gray-400" />
                      </button>
                    </div>
                  ) : activeSubmenu === "docs" ? (
                    <div className="flex flex-col max-h-64">
                      <button onClick={() => setActiveSubmenu(null)} className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-800 mb-1 font-medium transition-colors">
                        <ChevronLeft size={13} /> Back
                      </button>
                      <div className="overflow-y-auto space-y-0.5 p-1">
                        {docsList?.map((d: any) => (
                          <label key={d.id} className="flex items-center gap-2.5 px-2 py-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group">
                            <input 
                              type="checkbox" 
                              checked={selectedDocs.includes(d.id)} 
                              onChange={(e) => {
                                if (e.target.checked) setSelectedDocs([...selectedDocs, d.id]);
                                else setSelectedDocs(selectedDocs.filter(id => id !== d.id));
                              }} 
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300" 
                            />
                            <span className="text-xs text-gray-700 truncate group-hover:text-blue-700">{d.file_name}</span>
                          </label>
                        ))}
                        {(!docsList || docsList.length === 0) && <p className="text-xs text-gray-400 px-2 py-2">No documents found.</p>}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col max-h-[300px]">
                      <button onClick={() => setActiveSubmenu(null)} className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-800 mb-1 font-medium transition-colors">
                        <ChevronLeft size={13} /> Back
                      </button>
                      <div className="overflow-y-auto space-y-3 p-1">
                        {catalogData?.basins.map((b: any) => {
                          const basinFields = catalogData.fields.filter((f: any) => f.basin_id === b.id);
                          const basinWells = catalogData.wells.filter((w: any) => basinFields.some((f: any) => f.id === w.field_id));
                          if (basinWells.length === 0) return null;
                          return (
                            <div key={b.id}>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-2">{b.name}</p>
                              <div className="mb-2">
                                {basinWells.map((w: any) => (
                                  <label key={w.id} className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-green-50 rounded-lg cursor-pointer transition-colors group">
                                    <input 
                                      type="radio" 
                                      name="well_selection" 
                                      checked={selectedWellId === w.id} 
                                      onChange={() => setSelectedWellId(w.id)} 
                                      className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300" 
                                    />
                                    <span className="text-xs text-gray-700 truncate group-hover:text-green-700">{w.name}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {selectedWellId && (
                          <div className="px-2 pt-2 pb-1 border-t border-gray-100 mt-2">
                            <button 
                              onClick={() => setSelectedWellId(null)} 
                              className="w-full text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 py-1.5 rounded-md transition-colors"
                            >
                              Clear Selection
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about wells, formations, drilling risks, historical incidents…"
              rows={1}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-3xl px-5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all shadow-sm max-h-32 min-h-[20px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{ height: "auto" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 128) + "px";
              }}
              disabled={isSending}
            />
            
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isSending}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all shadow-sm",
                input.trim() && !isSending
                  ? "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md"
                  : "bg-gray-100 text-gray-300 cursor-not-allowed border border-gray-200"
              )}
            >
              <ArrowUp size={16} strokeWidth={2.5} />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2.5 text-center">
            Responses grounded in eRTMAC-NWIS knowledge base · Press Enter to send, Shift+Enter for newline
          </p>
        </div>
      </div>
    </div>
  );
}
