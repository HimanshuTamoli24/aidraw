"use client";

import React, { useState, useRef, useEffect } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Diagram, LayoutedDiagram } from "@/lib/diagram/types";
import { renderDiagramToExcalidraw } from "@/lib/diagram/renderer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Send,
  Sparkles,
  Layers,
  RotateCcw,
  Maximize2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Bot,
  User,
  ArrowRight,
  Lightbulb,
  AlertCircle,
  FileCode2,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  diagram?: Diagram;
  layout?: LayoutedDiagram;
  timestamp: Date;
}

interface ChatSidebarProps {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
}

const EXAMPLE_PROMPTS = [
  {
    title: "SSH Key Auth & Keygen",
    prompt:
      "Explain SSH public key authentication. Show key generation on client (Linux/macOS/Windows), uploading public key to server authorized_keys, and challenge-response authentication.",
  },
  {
    title: "Google.com Request Journey",
    prompt:
      "Explain what happens when I type google.com in my browser. Show DNS lookup, IP resolution, TCP connection, TLS handshake, Nginx reverse proxy, and application server response.",
  },
  {
    title: "Fullstack Architecture",
    prompt:
      "Create a client-server architecture with React frontend, Node.js API backend, PostgreSQL database, and Redis cache.",
  },
  {
    title: "HTTPS & TLS 1.3 Handshake",
    prompt:
      "Explain how HTTPS works, detailing the TLS 1.3 cryptographic handshake, certificate verification, and encrypted communication.",
  },
  {
    title: "Docker VPS Deploy",
    prompt:
      "Explain what happens when I deploy a Next.js application to a VPS using Docker containers and Nginx reverse proxy with SSL.",
  },
];

const CHAT_STORAGE_KEY = "aidraw_chat_messages";
const DIAGRAM_STORAGE_KEY = "aidraw_current_diagram";
const CLEAR_ON_NEW_KEY = "aidraw_clear_on_new";

function getSavedMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
      }
    }
  } catch (e) {
    console.warn("Failed to load chat messages from storage:", e);
  }
  return [];
}

function getSavedDiagram(): Diagram | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DIAGRAM_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to load current diagram from storage:", e);
  }
  return null;
}

export function ChatSidebar({ excalidrawAPI }: ChatSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentDiagram, setCurrentDiagram] = useState<Diagram | null>(null);
  const [clearOnNew, setClearOnNew] = useState(false);

  // Restore messages and current diagram from localStorage on mount
  useEffect(() => {
    const savedMsgs = getSavedMessages();
    if (savedMsgs.length > 0) setMessages(savedMsgs);

    const savedDiag = getSavedDiagram();
    if (savedDiag) setCurrentDiagram(savedDiag);

    try {
      const savedClearPref = localStorage.getItem(CLEAR_ON_NEW_KEY);
      if (savedClearPref !== null) setClearOnNew(savedClearPref === "true");
    } catch (e) {
      // ignore
    }
  }, []);

  // Save chat messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      } catch (e) {
        console.warn("Failed to save chat messages to storage:", e);
      }
    }
  }, [messages]);

  // Save current diagram context to localStorage
  useEffect(() => {
    if (currentDiagram) {
      try {
        localStorage.setItem(DIAGRAM_STORAGE_KEY, JSON.stringify(currentDiagram));
      } catch (e) {
        console.warn("Failed to save diagram to storage:", e);
      }
    }
  }, [currentDiagram]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, statusMessage]);

  const handleClearCanvas = () => {
    if (!excalidrawAPI) return;
    excalidrawAPI.resetScene();
    setCurrentDiagram(null);
    setMessages([]);
    try {
      localStorage.removeItem("aidraw_canvas_elements");
      localStorage.removeItem("aidraw_canvas_appstate");
      localStorage.removeItem(CHAT_STORAGE_KEY);
      localStorage.removeItem(DIAGRAM_STORAGE_KEY);
    } catch (e) {
      console.warn("Failed to clear storage:", e);
    }
  };

  const handleToggleClearOnNew = (checked: boolean) => {
    setClearOnNew(checked);
    try {
      localStorage.setItem(CLEAR_ON_NEW_KEY, String(checked));
    } catch (e) {
      // ignore
    }
  };

  const handleFitCanvas = () => {
    if (!excalidrawAPI) return;
    const elements = excalidrawAPI.getSceneElements();
    if (elements.length > 0) {
      excalidrawAPI.scrollToContent(elements, { fitToViewport: true, animate: true });
    }
  };


  const handleSubmit = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || isLoading) return;

    setErrorMessage(null);
    setInput("");

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setStatusMessage("Architecting technical diagram & commands...");

    try {
      // Build conversation history for context
      const history = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setStatusMessage("Consulting AI model for topology & cheat-sheet...");

      const response = await fetch("/api/diagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToSend,
          currentDiagram: currentDiagram,
          history,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate diagram");
      }

      const generatedDiagram: Diagram = data.diagram;
      setCurrentDiagram(generatedDiagram);

      setStatusMessage("Rendering hand-drawn Excalidraw elements & info card...");

      let layout: LayoutedDiagram | undefined;
      if (excalidrawAPI) {
        layout = await renderDiagramToExcalidraw(excalidrawAPI, generatedDiagram, {
          clearCanvas: clearOnNew,
          animate: true,
        });
      }

      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content:
          data.explanation ||
          `Generated diagram **${generatedDiagram.title}** with ${generatedDiagram.nodes.length} components and ${generatedDiagram.connections.length} connections.`,
        diagram: generatedDiagram,
        layout,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
      setStatusMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleReFocus = async (diagram?: Diagram) => {
    if (!excalidrawAPI || !diagram) return;
    await renderDiagramToExcalidraw(excalidrawAPI, diagram, { clearCanvas: true, animate: true });
  };

  return (
    <>
      {/* Floating Toggle Button when Sidebar is closed */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-40 shadow-xl bg-zinc-900/90 text-white hover:bg-zinc-800 backdrop-blur-md border border-zinc-700/50 flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all"
        >
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="font-semibold text-xs tracking-wide">AI Excalidraw Architect</span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
        </Button>
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-96 max-w-[90vw] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-r border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <header className="p-4 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 border border-blue-500/30 text-blue-600 dark:text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                Excalidraw Architect
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-blue-500/40 text-blue-600 dark:text-blue-400">
                  GPT-OSS 120B
                </Badge>
              </h1>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Natural language to hand-drawn Excalidraw
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleFitCanvas}
              title="Fit diagram on canvas"
              className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleClearCanvas}
              title="Clear Canvas"
              className="text-zinc-500 hover:text-red-500 dark:hover:text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setIsOpen(false)}
              title="Close sidebar"
              className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Message Feed / Prompt Suggestions */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {messages.length === 0 ? (
            <div className="py-4 space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-zinc-800/60 space-y-2">
                <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 font-semibold">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>Interactive Whiteboard & Cheat-Sheet</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-[11px]">
                  Describe any engineering architecture, protocol, or workflow. The AI will draw clean, hand-drawn
                  Excalidraw shapes, labeled connections, grouped zones, and a dedicated **Side Information & Commands Box**.
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
                  Try an example
                </span>
                <div className="space-y-1.5">
                  {EXAMPLE_PROMPTS.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSubmit(item.prompt)}
                      className="w-full text-left p-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100/90 dark:bg-zinc-900/50 dark:hover:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-800/60 transition-all flex items-center justify-between group"
                    >
                      <div className="pr-2">
                        <div className="font-medium text-zinc-800 dark:text-zinc-200 text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                          {item.prompt}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col gap-1.5 ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 px-1">
                  {msg.role === "user" ? (
                    <>
                      <span>You</span>
                      <User className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      <Bot className="w-3 h-3 text-blue-500" />
                      <span>Excalidraw Architect</span>
                    </>
                  )}
                </div>

                <div
                  className={`p-3 rounded-2xl max-w-[95%] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                      : "bg-zinc-100/80 dark:bg-zinc-900/80 text-zinc-800 dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-800/60"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {msg.diagram && (
                    <div className="mt-3 pt-2.5 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0.5">
                          <Layers className="w-3 h-3" />
                          {msg.diagram.nodes.length} Nodes
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0.5">
                          <ArrowRight className="w-3 h-3" />
                          {msg.diagram.connections.length} Arrows
                        </Badge>
                        {msg.diagram.infoBox && (
                          <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0.5 text-blue-600 dark:text-blue-400">
                            <FileCode2 className="w-3 h-3" />
                            Commands
                          </Badge>
                        )}
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleReFocus(msg.diagram)}
                          className="ml-auto text-[10px] h-6 px-2 border-zinc-300 dark:border-zinc-700"
                        >
                          <RotateCcw className="w-2.5 h-2.5 mr-1" />
                          Focus Canvas
                        </Button>
                      </div>

                      {/* Inline InfoBox Items */}
                      {msg.diagram.infoBox && msg.diagram.infoBox.items.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/50 space-y-1">
                          <div className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                            <FileCode2 className="w-3 h-3" />
                            {msg.diagram.infoBox.title || "Quick Reference"}
                          </div>
                          <ul className="space-y-0.5">
                            {msg.diagram.infoBox.items.map((item: string, i: number) => (
                              <li key={i} className="text-[10px] text-blue-900 dark:text-blue-200 font-mono leading-relaxed">
                                <span className="text-blue-500">•</span> {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center gap-2.5 animate-pulse">
              <Spinner className="w-4 h-4 text-blue-500" />
              <div className="text-[11px] font-medium">
                {statusMessage || "Architecting your Excalidraw diagram..."}
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <div className="space-y-1">
                <div className="font-semibold text-[11px]">Generation Failed</div>
                <p className="text-[10px] leading-relaxed">{errorMessage}</p>
                <Button
                  size="xs"
                  variant="destructive"
                  onClick={() => handleSubmit()}
                  className="mt-1.5 h-5 text-[10px]"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <footer className="p-3 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/70 space-y-2">
          {/* Clear Canvas Toggle */}
          <div className="flex items-center gap-2 px-1">
            <label className="flex items-center gap-1.5 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={clearOnNew}
                onChange={(e) => handleToggleClearOnNew(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-zinc-400 text-blue-600 focus:ring-blue-500/50 cursor-pointer"
              />
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
                Clear canvas before new diagram
              </span>
            </label>
          </div>

          <div className="relative rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 shadow-inner focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what to draw on Excalidraw..."
              className="resize-none min-h-[70px] max-h-[160px] border-0 bg-transparent text-xs p-2.5 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-zinc-400"
              disabled={isLoading}
            />
            <div className="flex items-center justify-between p-2 pt-0">
              <span className="text-[10px] text-zinc-400 select-none">
                Press ↵ to send • Shift+↵ for newline
              </span>
              <Button
                size="icon-sm"
                onClick={() => handleSubmit()}
                disabled={!input.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm disabled:opacity-40 transition-all"
              >
                {isLoading ? <Spinner className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        </footer>
      </aside>
    </>
  );
}
