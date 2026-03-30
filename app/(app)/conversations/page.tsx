"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import {
  Search, Send, MessageSquare, Mail, Phone, ArrowDownLeft,
  ArrowUpRight, User, CheckCheck, Clock, AlertCircle,
  RefreshCw, ExternalLink, PhoneCall,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, fetchJson, timeAgo } from "@/lib/utils";

interface Thread {
  customerId: string | null;
  leadId: string | null;
  isLead: boolean;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  lastMessage: {
    id: string;
    type: string;
    direction: string;
    status: string;
    summary: string | null;
    body: string | null;
    createdAt: string;
  } | null;
  unreadCount: number;
}

interface Message {
  id: string;
  type: string;
  direction: string;
  status: string;
  summary: string | null;
  body: string | null;
  channel: string | null;
  externalId: string | null;
  createdAt: string;
  deliveredAt: string | null;
}

interface ConversationDetail {
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  };
  messages: Message[];
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  sent: <CheckCheck className="w-3 h-3 text-slate-400" />,
  delivered: <CheckCheck className="w-3 h-3 text-blue-500" />,
  read: <CheckCheck className="w-3 h-3 text-emerald-500" />,
  failed: <AlertCircle className="w-3 h-3 text-red-500" />,
  logged_dev: <Clock className="w-3 h-3 text-amber-500" />,
};

export default function ConversationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [emailSubject, setEmailSubject] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-sync Google Voice in background every 5 minutes
  useQuery({
    queryKey: ["gv-auto-sync"],
    queryFn: async () => {
      const res = await fetch("/api/cron/sync-voice");
      const data = await res.json();
      if (data.imported && data.imported > 0) {
        // Refresh threads when new messages are synced
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["conversation"] });
      }
      return data;
    },
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false, // Only sync when tab is visible
  });

  // Fetch conversation threads
  const { data: threads = [], isLoading: threadsLoading } = useQuery<Thread[]>({
    queryKey: ["conversations", search],
    queryFn: () => fetchJson(`/api/conversations?search=${encodeURIComponent(search)}`),
  });

  // Fetch selected conversation
  const { data: conversation, isLoading: convoLoading } = useQuery<ConversationDetail>({
    queryKey: ["conversation", selectedContactId],
    queryFn: () => fetchJson(`/api/conversations/${selectedContactId}`),
    enabled: !!selectedContactId,
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (data: { channel: string; to: string; message: string; subject?: string; customerId: string }) => {
      const res = await fetch("/api/communications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversation", selectedContactId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setNewMessage("");
      setEmailSubject("");
      if (data.mode === "dev") {
        toast.success("Message logged (dev mode — no provider configured)");
      } else {
        toast.success("Message sent!");
      }
    },
    onError: () => toast.error("Failed to send message"),
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  // Auto-select first thread
  useEffect(() => {
    if (!selectedContactId && threads.length > 0) {
      setSelectedContactId(threads[0].customerId || threads[0].leadId);
    }
  }, [threads, selectedContactId]);

  const handleSend = () => {
    if (!conversation) return;

    if (channel === "sms") {
      // Open Google Voice to send the text — sync will pull it back
      const phone = conversation.customer.phone;
      if (!phone) {
        toast.error("No phone number for this contact");
        return;
      }
      const digits = phone.replace(/\D/g, "");
      const formatted = digits.length === 10 ? `1${digits}` : digits;
      window.open(`https://voice.google.com/u/0/messages?a=nc,%2B${formatted}`, "_blank");
      toast.success("Opening Google Voice — your sent text will sync back automatically");
      return;
    }

    // Email sending via backend
    if (!newMessage.trim()) return;
    const to = conversation.customer.email;
    if (!to) {
      toast.error("No email address for this contact");
      return;
    }

    sendMutation.mutate({
      channel,
      to,
      message: newMessage,
      subject: channel === "email" ? emailSubject : undefined,
      customerId: conversation.customer.id,
    });
  };

  // Sync Google Voice messages
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/google/sync", { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversation"] });
      toast.success(`Synced ${data.synced ?? 0} messages from Google Voice`);
    },
    onError: () => toast.error("Failed to sync — check Google OAuth settings"),
  });

  const selectedThread = threads.find((t) => (t.customerId || t.leadId) === selectedContactId);

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Thread List */}
      <div className="w-80 border-r border-slate-200 flex flex-col bg-white">
        <div className="p-3 border-b border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-bold text-slate-900">Messages</h1>
            <div className="flex items-center gap-1">
              <button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="text-slate-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                title="Sync Google Voice"
              >
                <RefreshCw className={cn("w-4 h-4", syncMutation.isPending && "animate-spin")} />
              </button>
              <a
                href="https://voice.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                title="Open Google Voice"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threadsLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : threads.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No conversations yet</p>
              <p className="text-xs text-slate-400 mt-1">Send a message to start a conversation</p>
            </div>
          ) : (
            threads.map((thread) => {
              const threadId = thread.customerId || thread.leadId;
              return (
              <button
                key={threadId}
                onClick={() => setSelectedContactId(threadId)}
                className={cn(
                  "w-full text-left px-3 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors",
                  selectedContactId === threadId && "bg-emerald-50 border-l-2 border-l-emerald-500",
                  thread.isLead && "border-l-2 border-l-amber-300"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-slate-900 truncate">
                        {thread.customerName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {thread.lastMessage?.summary || "No messages"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {thread.lastMessage && (
                      <span className="text-[10px] text-slate-400">
                        {timeAgo(thread.lastMessage.createdAt)}
                      </span>
                    )}
                    {thread.unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
              );
            })
          )}
        </div>
      </div>

      {/* Conversation Detail */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {!selectedContactId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Select a conversation</p>
              <p className="text-sm text-slate-400 mt-1">Choose a customer from the list to view messages</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200 bg-white">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  selectedThread?.isLead ? "bg-amber-100" : "bg-emerald-100"
                )}>
                  <User className={cn("w-4 h-4", selectedThread?.isLead ? "text-amber-600" : "text-emerald-600")} />
                </div>
                <div>
                  <Link
                    href={selectedThread?.isLead ? `/jobs?tab=leads` : `/customers/${selectedContactId}`}
                    className="font-medium text-sm text-slate-900 hover:text-emerald-600"
                  >
                    {conversation?.customer.name || selectedThread?.customerName}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {conversation?.customer.phone || selectedThread?.customerPhone}
                    {conversation?.customer.email ? ` · ${conversation.customer.email}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    document.dispatchEvent(new KeyboardEvent("keydown", { altKey: true, key: "l" }));
                  }}
                  title="Quick Log Call (Alt+L)"
                >
                  <PhoneCall className="w-4 h-4 mr-1" />
                  <span className="text-xs">Log</span>
                </Button>
                {conversation?.customer.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/calls", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            customerId: selectedContactId,
                            to: conversation.customer.phone,
                          }),
                        });
                        const data = await res.json();
                        if (data.googleVoiceUrl) {
                          window.open(data.googleVoiceUrl, "_blank");
                          toast.success("Opening Google Voice — call logged");
                        } else {
                          toast.success("Call logged");
                        }
                      } catch {
                        toast.error("Failed to initiate call");
                      }
                    }}
                    title="Call via Google Voice"
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {convoLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : ""}`}>
                      <div className="h-12 w-64 bg-slate-200 rounded-xl animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : conversation?.messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No messages yet. Send the first one below.</p>
                </div>
              ) : (
                conversation?.messages.map((msg) => {
                  const isOutbound = msg.direction === "outbound";
                  return (
                    <div key={msg.id} className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm",
                          isOutbound
                            ? "bg-emerald-500 text-white rounded-br-md"
                            : "bg-white text-slate-900 rounded-bl-md border border-slate-200"
                        )}
                      >
                        {/* Channel badge */}
                        <div className={cn(
                          "flex items-center gap-1 text-[10px] mb-1",
                          isOutbound ? "text-emerald-100" : "text-slate-400"
                        )}>
                          {msg.type === "sms" ? (
                            <MessageSquare className="w-3 h-3" />
                          ) : (
                            <Mail className="w-3 h-3" />
                          )}
                          {msg.type.toUpperCase()}
                          {isOutbound ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownLeft className="w-3 h-3" />
                          )}
                        </div>

                        {/* Message body */}
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.body || msg.summary || "—"}
                        </p>

                        {/* Timestamp & status */}
                        <div className={cn(
                          "flex items-center gap-1 mt-1 text-[10px]",
                          isOutbound ? "text-emerald-200 justify-end" : "text-slate-400"
                        )}>
                          <span>{timeAgo(msg.createdAt)}</span>
                          {isOutbound && STATUS_ICONS[msg.status]}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Compose */}
            <div className="border-t border-slate-200 bg-white p-3">
              <div className="flex items-center gap-2 mb-2">
                <Select value={channel} onValueChange={(v) => setChannel((v as "sms" | "email") || "sms")}>
                  <SelectTrigger className="w-28 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" /> SMS
                      </span>
                    </SelectItem>
                    <SelectItem value="email">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> Email
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {channel === "email" && (
                  <Input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Subject..."
                    className="h-8 text-sm flex-1"
                  />
                )}
              </div>

              {channel === "sms" ? (
                <div>
                  <Button
                    onClick={handleSend}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                    disabled={!conversation?.customer.phone}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Text via Google Voice
                  </Button>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    Opens Google Voice to send a text. Your message will auto-sync back here.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-end gap-2">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Compose email..."
                      className="flex-1 min-h-[40px] max-h-32 resize-none text-sm"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!newMessage.trim() || sendMutation.isPending}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white h-10 w-10 p-0"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Press Enter to send, Shift+Enter for new line.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
