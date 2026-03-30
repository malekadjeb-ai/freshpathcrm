"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
  CommandShortcut, CommandSeparator,
} from "@/components/ui/command";
import {
  Users, Briefcase, FileText, LayoutDashboard, Calendar, BarChart2, Settings, Wrench,
  Target, ClipboardList, CheckSquare, Phone, MessageSquare, Clock, Receipt, RefreshCw,
  HardHat, ClipboardCheck, Tag, Building2, Megaphone, Image, Star, Webhook, Zap, DollarSign,
  Download, Activity, History,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface SearchResult {
  customers: { id: string; name: string; phone: string | null; email: string | null }[];
  jobs: { id: string; status: string; total: number; customer: { name: string } }[];
  invoices: { id: string; invoiceNumber: string; total: number; job: { customer: { name: string } } }[];
  leads?: { id: string; name: string; status: string; phone: string | null }[];
  estimates?: { id: string; estimateNumber: string; total: number; customer: { name: string } }[];
  tasks?: { id: string; title: string; priority: string }[];
  staff?: { id: string; name: string; role: string; isActive: boolean }[];
  services?: { id: string; name: string; basePrice: number; category: string }[];
}

interface Command {
  id: string;
  label: string;
  icon: typeof Users;
  shortcut?: string;
  action: string;
}

const QUICK_ACTIONS = [
  { id: "new-customer", label: "New Customer", icon: Users, shortcut: "Alt+C", action: "quick:customer" },
  { id: "new-estimate", label: "New Estimate", icon: ClipboardList, shortcut: "Alt+E", action: "quick:estimate" },
  { id: "new-invoice", label: "New Invoice", icon: FileText, shortcut: "Alt+I", action: "quick:invoice" },
  { id: "new-job", label: "New Job", icon: Briefcase, shortcut: "Alt+J", action: "nav:/jobs/new" },
  { id: "log-call", label: "Log Call", icon: Phone, shortcut: "Alt+L", action: "quick:call" },
  { id: "new-lead", label: "New Lead", icon: Target, shortcut: "Alt+N", action: "nav:/leads" },
  { id: "new-task", label: "New Task", icon: CheckSquare, shortcut: "Alt+T", action: "nav:/tasks" },
];

// Primary navigation — matches new sidebar
const NAV_PRIMARY = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs Hub", icon: Briefcase },
  { href: "/calendar", label: "Schedule", icon: Calendar },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/conversations", label: "Messages", icon: MessageSquare },
  { href: "/invoicing", label: "Invoicing Hub", icon: FileText },
  { href: "/marketing", label: "Marketing Hub", icon: Megaphone },
  { href: "/reviews", label: "Reviews", icon: Star },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

// All navigable pages (including those now inside hubs)
const NAV_ALL = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/jobs/new", label: "New Job", icon: Briefcase },
  { href: "/calendar", label: "Calendar / Schedule", icon: Calendar },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/conversations", label: "Messages / Inbox", icon: MessageSquare },
  { href: "/leads", label: "Leads", icon: Target },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/estimates", label: "Estimates", icon: ClipboardList },
  { href: "/recurring-jobs", label: "Recurring Jobs", icon: RefreshCw },
  { href: "/invoicing", label: "Invoicing", icon: FileText },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/payments", label: "Payments", icon: DollarSign },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/subscriptions", label: "Plans / Subscriptions", icon: DollarSign },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/automations", label: "Automations", icon: Zap },
  { href: "/promo-codes", label: "Promo Codes", icon: Tag },
  { href: "/gallery", label: "Gallery", icon: Image },
  { href: "/content", label: "Content", icon: Image },
  { href: "/reviews", label: "Reviews", icon: Star },
  { href: "/referrals", label: "Referrals", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/reports", label: "Reports", icon: BarChart2 },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/communications", label: "All Communications", icon: Phone },
  { href: "/scheduled-messages", label: "Scheduled Messages", icon: Clock },
  { href: "/field", label: "Field View", icon: Briefcase },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/services", label: "Services", icon: Wrench },
  { href: "/staff", label: "Staff", icon: HardHat },
  { href: "/templates", label: "Templates", icon: MessageSquare },
  { href: "/checklists", label: "Checklists", icon: ClipboardCheck },
  { href: "/fleet", label: "Fleet", icon: Building2 },
  { href: "/routes", label: "Routes", icon: Briefcase },
  { href: "/pricing", label: "Pricing", icon: DollarSign },
  { href: "/intelligence", label: "Intelligence", icon: Zap },
  { href: "/webhooks", label: "Webhooks", icon: Webhook },
];

const COMMANDS: Command[] = [
  { id: "cmd-new-lead", label: "New Lead", icon: Target, action: "nav:/leads" },
  { id: "cmd-new-customer", label: "New Customer", icon: Users, action: "quick:customer" },
  { id: "cmd-new-job", label: "New Job", icon: Briefcase, action: "nav:/jobs/new" },
  { id: "cmd-new-estimate", label: "New Estimate", icon: ClipboardList, action: "quick:estimate" },
  { id: "cmd-new-invoice", label: "New Invoice", icon: FileText, action: "quick:invoice" },
  { id: "cmd-new-task", label: "New Task", icon: CheckSquare, action: "nav:/tasks" },
  { id: "cmd-log-activity", label: "Log Activity", icon: Activity, action: "event:open-quick-log" },
  { id: "cmd-go-settings", label: "Go to Settings", icon: Settings, shortcut: "Settings", action: "nav:/settings" },
  { id: "cmd-go-calendar", label: "Go to Calendar", icon: Calendar, shortcut: "Calendar", action: "nav:/calendar" },
  { id: "cmd-go-analytics", label: "Go to Analytics", icon: BarChart2, shortcut: "Analytics", action: "nav:/analytics" },
  { id: "cmd-go-dashboard", label: "Go to Dashboard", icon: LayoutDashboard, shortcut: "Dashboard", action: "nav:/dashboard" },
  { id: "cmd-export-customers", label: "Export Customers CSV", icon: Download, action: "nav:/customers?export=csv" },
];

const RECENT_COMMANDS_KEY = "freshpath-recent-commands";
const RECENT_SEARCHES_KEY = "freshpath-recent-searches";
const MAX_RECENT = 5;

function getRecentCommands(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_COMMANDS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentCommand(commandId: string) {
  try {
    const recent = getRecentCommands().filter((id) => id !== commandId);
    recent.unshift(commandId);
    localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // localStorage unavailable
  }
}

function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(searchQuery: string) {
  try {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.startsWith(">")) return;
    const recent = getRecentSearches().filter((q) => q !== trimmed);
    recent.unshift(trimmed);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // localStorage unavailable
  }
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const router = useRouter();

  const isCommandMode = query.startsWith(">");
  const commandFilter = query.slice(1).trim().toLowerCase();

  // Load recent items when palette opens
  useEffect(() => {
    if (open) {
      setRecentCommands(getRecentCommands());
      setRecentSearches(getRecentSearches());
    }
  }, [open]);

  const handleAction = useCallback((action: string, commandId?: string) => {
    setOpen(false);
    setQuery("");

    if (commandId) {
      saveRecentCommand(commandId);
    }

    if (action.startsWith("nav:")) {
      router.push(action.replace("nav:", ""));
      return;
    }
    if (action.startsWith("event:")) {
      document.dispatchEvent(new CustomEvent(action.replace("event:", "")));
      return;
    }
    if (action === "quick:customer") {
      document.dispatchEvent(new CustomEvent("quick-add", { detail: "customer" }));
      return;
    }
    if (action === "quick:estimate") {
      document.dispatchEvent(new CustomEvent("quick-add", { detail: "estimate" }));
      return;
    }
    if (action === "quick:invoice") {
      document.dispatchEvent(new CustomEvent("quick-add", { detail: "invoice" }));
      return;
    }
    if (action === "quick:call") {
      document.dispatchEvent(new CustomEvent("open-quick-log"));
      return;
    }
  }, [router]);

  const handleSearchSelect = useCallback((href: string, searchQuery?: string) => {
    if (searchQuery) {
      saveRecentSearch(searchQuery);
    }
    setOpen(false);
    setQuery("");
    router.push(href);
  }, [router]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && e.target === document.body)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const { data: results } = useQuery<SearchResult>({
    queryKey: ["search", query],
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(query)}`).then((r) => r.json()),
    enabled: query.length >= 2 && !isCommandMode,
  });

  const navigate = (href: string) => {
    saveRecentSearch(query);
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const hasResults = results && (
    (results.customers?.length ?? 0) > 0 ||
    (results.jobs?.length ?? 0) > 0 ||
    (results.invoices?.length ?? 0) > 0 ||
    (results.leads?.length ?? 0) > 0 ||
    (results.estimates?.length ?? 0) > 0 ||
    (results.tasks?.length ?? 0) > 0 ||
    (results.staff?.length ?? 0) > 0 ||
    (results.services?.length ?? 0) > 0
  );

  // Filter commands based on what the user typed after ">"
  const filteredCommands = COMMANDS.filter((cmd) =>
    commandFilter === "" || cmd.label.toLowerCase().includes(commandFilter)
  );

  // Get recent command objects in order
  const recentCommandObjects = recentCommands
    .map((id) => COMMANDS.find((cmd) => cmd.id === id))
    .filter((cmd): cmd is Command => cmd !== undefined);

  // Commands that are not in the recent list (for the "All Commands" group)
  const nonRecentCommands = filteredCommands.filter(
    (cmd) => !recentCommands.includes(cmd.id)
  );

  // Recent commands filtered by the current query
  const filteredRecentCommands = recentCommandObjects.filter((cmd) =>
    commandFilter === "" || cmd.label.toLowerCase().includes(commandFilter)
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder={isCommandMode ? "Type a command..." : "Search anything or type > for commands..."}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-96">
        {/* Commands Mode */}
        {isCommandMode && (
          <>
            <CommandEmpty>No commands found.</CommandEmpty>

            {filteredRecentCommands.length > 0 && (
              <CommandGroup heading="Recent Commands">
                {filteredRecentCommands.map((cmd) => (
                  <CommandItem key={`recent-${cmd.id}`} onSelect={() => handleAction(cmd.action, cmd.id)}>
                    <History className="w-4 h-4 mr-2 text-slate-400" />
                    <cmd.icon className="w-4 h-4 mr-2 text-emerald-500" />
                    <span className="font-medium">{cmd.label}</span>
                    {cmd.shortcut && <CommandShortcut>{cmd.shortcut}</CommandShortcut>}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredRecentCommands.length > 0 && nonRecentCommands.length > 0 && (
              <CommandSeparator />
            )}

            {nonRecentCommands.length > 0 && (
              <CommandGroup heading="Commands">
                {nonRecentCommands.map((cmd) => (
                  <CommandItem key={cmd.id} onSelect={() => handleAction(cmd.action, cmd.id)}>
                    <cmd.icon className="w-4 h-4 mr-2 text-emerald-500" />
                    <span className="font-medium">{cmd.label}</span>
                    {cmd.shortcut && <CommandShortcut>{cmd.shortcut}</CommandShortcut>}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}

        {/* Normal mode (search + quick actions) */}
        {!isCommandMode && (
          <>
            <CommandEmpty>
              {query.length >= 2 ? "No results found." : "Start typing to search or type > for commands..."}
            </CommandEmpty>

            {/* Recent Searches — show when no query */}
            {query.length < 2 && recentSearches.length > 0 && (
              <>
                <CommandGroup heading="Recent Searches">
                  {recentSearches.map((recentQuery) => (
                    <CommandItem
                      key={`recent-search-${recentQuery}`}
                      onSelect={() => setQuery(recentQuery)}
                    >
                      <History className="w-4 h-4 mr-2 text-slate-400" />
                      <span>{recentQuery}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Quick Actions — always show when no query */}
            {query.length < 2 && (
              <>
                <CommandGroup heading="Quick Actions">
                  {QUICK_ACTIONS.map((item) => (
                    <CommandItem key={item.id} onSelect={() => handleAction(item.action)}>
                      <item.icon className="w-4 h-4 mr-2 text-emerald-500" />
                      <span className="font-medium">{item.label}</span>
                      <CommandShortcut>{item.shortcut}</CommandShortcut>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Navigate">
                  {NAV_PRIMARY.map((item) => (
                    <CommandItem key={item.href} onSelect={() => navigate(item.href)}>
                      <item.icon className="w-4 h-4 mr-2 text-slate-500" />
                      {item.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Matching pages */}
            {query.length >= 2 && (() => {
              const matchingPages = NAV_ALL.filter((item) =>
                item.label.toLowerCase().includes(query.toLowerCase())
              );
              return matchingPages.length > 0 ? (
                <CommandGroup heading="Pages">
                  {matchingPages.slice(0, 5).map((item) => (
                    <CommandItem key={`page-${item.href}`} onSelect={() => navigate(item.href)}>
                      <item.icon className="w-4 h-4 mr-2 text-slate-500" />
                      {item.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null;
            })()}

            {/* Search Results */}
            {query.length >= 2 && hasResults && (
              <>
                {results?.customers && results.customers.length > 0 && (
                  <CommandGroup heading="Customers">
                    {results.customers.map((c) => (
                      <CommandItem key={c.id} onSelect={() => handleSearchSelect(`/customers/${c.id}`, query)}>
                        <Users className="w-4 h-4 mr-2 text-blue-500" />
                        <span className="font-medium">{c.name}</span>
                        {c.phone && <span className="ml-2 text-slate-400 text-xs">{c.phone}</span>}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {results?.leads && results.leads.length > 0 && (
                  <CommandGroup heading="Leads">
                    {results.leads.map((l) => (
                      <CommandItem key={l.id} onSelect={() => handleSearchSelect(`/leads/${l.id}`, query)}>
                        <Target className="w-4 h-4 mr-2 text-pink-500" />
                        <span className="font-medium">{l.name}</span>
                        <span className="ml-2 text-xs text-slate-400">{l.status}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {results?.jobs && results.jobs.length > 0 && (
                  <CommandGroup heading="Jobs">
                    {results.jobs.map((j) => (
                      <CommandItem key={j.id} onSelect={() => handleSearchSelect(`/jobs/${j.id}`, query)}>
                        <Briefcase className="w-4 h-4 mr-2 text-slate-500" />
                        <span>{j.customer.name}</span>
                        <span className="ml-2 text-xs text-slate-400">{j.status}</span>
                        <span className="ml-auto text-xs font-medium text-emerald-600">{formatCurrency(j.total)}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {results?.estimates && results.estimates.length > 0 && (
                  <CommandGroup heading="Estimates">
                    {results.estimates.map((e) => (
                      <CommandItem key={e.id} onSelect={() => handleSearchSelect(`/estimates/${e.id}`, query)}>
                        <ClipboardList className="w-4 h-4 mr-2 text-purple-500" />
                        <span className="font-mono text-xs">{e.estimateNumber}</span>
                        <span className="ml-2">{e.customer.name}</span>
                        <span className="ml-auto text-xs font-medium">{formatCurrency(e.total)}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {results?.invoices && results.invoices.length > 0 && (
                  <CommandGroup heading="Invoices">
                    {results.invoices.map((inv) => (
                      <CommandItem key={inv.id} onSelect={() => handleSearchSelect(`/invoices/${inv.id}`, query)}>
                        <FileText className="w-4 h-4 mr-2 text-orange-500" />
                        <span className="font-mono text-xs">{inv.invoiceNumber}</span>
                        <span className="ml-2">{inv.job.customer.name}</span>
                        <span className="ml-auto text-xs font-medium">{formatCurrency(inv.total)}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {results?.tasks && results.tasks.length > 0 && (
                  <CommandGroup heading="Tasks">
                    {results.tasks.map((t) => (
                      <CommandItem key={t.id} onSelect={() => handleSearchSelect("/tasks", query)}>
                        <CheckSquare className="w-4 h-4 mr-2 text-amber-500" />
                        <span>{t.title}</span>
                        <span className="ml-2 text-xs text-slate-400">{t.priority}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {results?.staff && results.staff.length > 0 && (
                  <CommandGroup heading="Staff">
                    {results.staff.map((s) => (
                      <CommandItem key={s.id} onSelect={() => handleSearchSelect("/staff", query)}>
                        <HardHat className="w-4 h-4 mr-2 text-purple-500" />
                        <span>{s.name}</span>
                        <span className="ml-2 text-xs text-slate-400">{s.role}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {results?.services && results.services.length > 0 && (
                  <CommandGroup heading="Services">
                    {results.services.map((s) => (
                      <CommandItem key={s.id} onSelect={() => handleSearchSelect("/services", query)}>
                        <Wrench className="w-4 h-4 mr-2 text-emerald-500" />
                        <span>{s.name}</span>
                        <span className="ml-2 text-xs text-slate-400">{formatCurrency(s.basePrice)}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
