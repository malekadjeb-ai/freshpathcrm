"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Loader2, Bot, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: SuggestedAction[];
}

interface SuggestedAction {
  type: string;
  label: string;
  data: Record<string, string>;
}

const SUGGESTED_PROMPTS = [
  "What should I focus on today?",
  "Which customers are at risk of churning?",
  "What's my projected revenue this month?",
  "Write a follow-up text for my last completed job",
  "Suggest pricing for a ceramic coating on a 2024 BMW X5",
  "What are my best revenue opportunities right now?",
];

export function AIPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keyboard shortcut: Cmd+J to toggle AI panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, history }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get AI response");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message, actions: data.actions },
      ]);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      // Remove the pending user message if the request failed
      setMessages((prev) => prev.slice(0, -1));
    },
  });

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || chatMutation.isPending) return;
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setInput("");
      chatMutation.mutate(trimmed);
    },
    [chatMutation]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleAction = async (action: SuggestedAction) => {
    if (action.type === "create_task" && action.data.title) {
      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: action.data.title,
            type: action.data.type || "general",
            priority: "medium",
          }),
        });
        if (res.ok) {
          toast.success(`Task created: ${action.data.title}`);
        } else {
          toast.error("Failed to create task");
        }
      } catch {
        toast.error("Failed to create task");
      }
    } else if (action.type === "send_message") {
      // Navigate to communications page with customer pre-selected
      window.location.href = `/communications?search=${encodeURIComponent(action.data.customerName || "")}`;
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <>
      {/* Floating AI button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-20 md:bottom-6 right-6 z-40 w-12 h-12 rounded-full",
          "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg hover:shadow-xl",
          "flex items-center justify-center transition-all duration-200",
          "hover:scale-105 active:scale-95",
          open && "hidden"
        )}
        title="AI Assistant (⌘J)"
      >
        <Sparkles className="w-5 h-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
          <SheetHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <SheetTitle className="text-base">Fresh Path AI</SheetTitle>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearChat} title="New conversation">
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
          </SheetHeader>

          {/* Messages area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Bot className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h3 className="font-semibold text-slate-900">How can I help?</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    I know your customers, jobs, revenue, and schedule.
                  </p>
                </div>
                <div className="space-y-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="w-full text-left px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 hover:border-emerald-200 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-3", msg.role === "user" && "justify-end")}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-emerald-600" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm",
                      msg.role === "user"
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 text-slate-800"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm prose-slate max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:my-1.5 [&_strong]:font-semibold">
                        <AIMarkdown content={msg.content} />
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200 flex flex-wrap gap-1.5">
                        {msg.actions.map((action, ai) => (
                          <button
                            key={ai}
                            onClick={() => handleAction(action)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-7 h-7 bg-slate-200 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-slate-600" />
                    </div>
                  )}
                </div>
              ))
            )}
            {chatMutation.isPending && (
              <div className="flex gap-3">
                <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="bg-slate-100 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Thinking...
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t px-4 py-3">
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your business..."
                className="resize-none min-h-[44px] max-h-32"
                rows={1}
                disabled={chatMutation.isPending}
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || chatMutation.isPending}
                size="icon"
                className="shrink-0 bg-emerald-500 hover:bg-emerald-600 h-[44px] w-[44px]"
              >
                {chatMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 text-center">
              ⌘J to toggle · Shift+Enter for new line
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function AIMarkdown({ content }: { content: string }) {
  // Simple markdown rendering for AI responses
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc pl-4">
          {listItems.map((item, i) => (
            <li key={i}><InlineFormat text={item} /></li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/^#{1,3}\s/)) {
      flushList();
      const text = line.replace(/^#{1,3}\s/, "");
      elements.push(<h3 key={i}><InlineFormat text={text} /></h3>);
    } else if (line.match(/^[-*]\s/)) {
      listItems.push(line.replace(/^[-*]\s/, ""));
    } else if (line.match(/^\d+\.\s/)) {
      listItems.push(line.replace(/^\d+\.\s/, ""));
    } else {
      flushList();
      if (line.trim()) {
        elements.push(<p key={i}><InlineFormat text={line} /></p>);
      }
    }
  }
  flushList();

  return <>{elements}</>;
}

function InlineFormat({ text }: { text: string }) {
  // Split the text on inline markdown tokens and render as React elements,
  // avoiding dangerouslySetInnerHTML entirely.
  const parts: React.ReactNode[] = [];
  // Regex captures: **bold**, *italic*, `code`, $number
  const pattern = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\$\d[\d,.]*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("`")) {
      parts.push(<code key={key++} className="bg-slate-200 px-1 rounded text-xs">{token.slice(1, -1)}</code>);
    } else if (token.startsWith("$")) {
      parts.push(<span key={key++} className="font-mono font-semibold">{token}</span>);
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}
