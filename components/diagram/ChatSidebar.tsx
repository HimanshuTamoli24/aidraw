"use client";

import React, { useState, useRef, useEffect } from "react";
import { Editor } from "tldraw";
import { Diagram, LayoutedDiagram } from "@/lib/diagram/types";
import { renderDiagramToCanvas } from "@/lib/diagram/renderer";
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
  CheckCircle2,
  AlertCircle,
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
  editor: Editor | null;
}

const EXAMPLE_PROMPTS = [
  {
    title: "Google.com Request Flow",
    prompt:
      "Explain what happens when I type google.com in my browser. Show DNS lookup, IP resolution, TCP connection, TLS handshake, Nginx reverse proxy, and application server response.",
  },
  {
    title: "Fullstack Architecture",
    prompt:
      "Create a client-server architecture with React frontend, Node.js API backend, PostgreSQL database, and Redis cache.",
  },
  {
    title: "HTTPS & TLS Handshake",
    prompt:
      "Explain how HTTPS works, detailing the TLS 1.3 cryptographic handshake, certificate verification, and encrypted communication.",
  },
  {
    title: "DNS Resolution",
    prompt:
      "Explain how DNS converts a domain name into an IP address via Recursive Resolver, Root Server, TLD Server, and Authoritative Name Server.",
  },
  {
    title: "VPS Docker & Nginx Deploy",
    prompt:
      "Explain what happens when I deploy a Next.js application to a VPS using Docker containers and Nginx reverse proxy with SSL.",
  },
];

export function ChatSidebar({ editor }: ChatSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentDiagram, setCurrentDiagram] = useState<Diagram | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, statusMessage]);

  const handleClearCanvas = () => {
    if (!editor) return;
    const allIds = Array.from(editor.getCurrentPageShapeIds());
    if (allIds.length > 0) {
      editor.deleteShapes(allIds);
    }
    setCurrentDiagram(null);
  };

  const handleFitCanvas = () => {
    if (!editor) return;
    editor.zoomToFit({ animation: { duration: 300 } });
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
    setStatusMessage("Architecting technical diagram...");

    try {
      // Build conversation history for context
      const history = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setStatusMessage("Consulting AI model for system topology...");

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

      setStatusMessage("Rendering hand-drawn shapes and connections...");

      let layout: LayoutedDiagram | undefined;
      if (editor) {
        layout = renderDiagramToCanvas(editor, generatedDiagram, {
          clearCanvas: false,
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

  const handleReFocus = (diagram?: Diagram) => {
    if (!editor || !diagram) return;
    renderDiagramToCanvas(editor, diagram, { clearCanvas: true, animate: true });
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
          <span className="font-semibold text-xs tracking-wide">AI Whiteboard Architect</span>
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
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                AI Diagram Architect
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-600 dark:text-amber-400">
                  GPT-OSS 120B
                </Badge>
              </h1>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Natural language to editable tldraw
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
                  <span>Technical Whiteboard Generator</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-[11px]">
                  Type any software flow, network topology, protocol handshake, or hardware pipeline. The AI will draw
                  interactive, editable shapes, grouped zones, and labeled arrows directly on this whiteboard.
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
                        <div className="font-medium text-zinc-800 dark:text-zinc-200 text-xs group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                          {item.prompt}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0" />
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
                      <Bot className="w-3 h-3 text-amber-500" />
                      <span>Whiteboard Architect</span>
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
                    <div className="mt-3 pt-2.5 border-t border-zinc-200/50 dark:border-zinc-800/50 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0.5">
                        <Layers className="w-3 h-3" />
                        {msg.diagram.nodes.length} Nodes
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0.5">
                        <ArrowRight className="w-3 h-3" />
                        {msg.diagram.connections.length} Arrows
                      </Badge>
                      {msg.diagram.groups && msg.diagram.groups.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                          {msg.diagram.groups.length} Zones
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
                  )}
                </div>
              </div>
            ))
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center gap-2.5 animate-pulse">
              <Spinner className="w-4 h-4 text-amber-500" />
              <div className="text-[11px] font-medium">
                {statusMessage || "Architecting your diagram..."}
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
          <div className="relative rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 shadow-inner focus-within:ring-2 focus-within:ring-amber-500/50 transition-all">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe a technical concept or architecture..."
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
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-sm disabled:opacity-40 transition-all"
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
