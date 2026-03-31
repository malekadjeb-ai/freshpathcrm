"use client";

import { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Rocket,
  CalendarDays,
  Receipt,
  Megaphone,
  Star,
  Settings,
  Keyboard,
  Mail,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface FAQ {
  question: string;
  answer: string;
}

interface Category {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  faqs: FAQ[];
}

const CATEGORIES: Category[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: Rocket,
    faqs: [
      {
        question: "How do I add my first customer?",
        answer:
          "Go to Customers from the sidebar, then click the 'New Customer' button in the top right. Fill in their name, phone number, and any vehicle info. You can also add customers directly from a new job or lead.",
      },
      {
        question: "How do I create a job?",
        answer:
          "Navigate to Jobs and click 'New Job'. Select or create a customer, choose the services, pick a date and time, set the location, and save. The job will appear on your calendar and jobs list.",
      },
      {
        question: "How do I send my first invoice?",
        answer:
          "After completing a job, go to the job detail page and click 'Create Invoice'. Review the line items, add any discounts or taxes, then click 'Send'. The customer will receive the invoice via email or text.",
      },
      {
        question: "How do I set up my business info?",
        answer:
          "Go to Settings > General and fill in your business name, phone, email, address, and logo. This information appears on invoices, estimates, and customer communications.",
      },
    ],
  },
  {
    id: "jobs-scheduling",
    label: "Jobs & Scheduling",
    icon: CalendarDays,
    faqs: [
      {
        question: "How do I use the calendar?",
        answer:
          "The Schedule page shows all your jobs in a calendar view. Click any day to see its jobs, or click the + button to schedule a new one. You can switch between day, week, and month views.",
      },
      {
        question: "How do I create recurring jobs?",
        answer:
          "When creating or editing a job, enable 'Recurring' and choose the frequency (weekly, bi-weekly, monthly). The system will automatically create future jobs based on your schedule.",
      },
      {
        question: "How do I assign a job to a tech?",
        answer:
          "On the job form, use the 'Assigned To' dropdown to select a team member. They will be able to see their assigned jobs when they log in. You can reassign jobs at any time from the job detail page.",
      },
      {
        question: "How do I track job progress?",
        answer:
          "Jobs move through statuses: Scheduled, En Route, In Progress, Completed, Invoiced, and Paid. Update the status from the job detail page or the jobs list. The dashboard shows today's schedule at a glance.",
      },
    ],
  },
  {
    id: "invoicing-payments",
    label: "Invoicing & Payments",
    icon: Receipt,
    faqs: [
      {
        question: "How do I create an invoice?",
        answer:
          "Go to Invoicing > New Invoice, or create one from a completed job. Add line items for services performed, set the tax rate, and send it to the customer. Invoices are automatically numbered.",
      },
      {
        question: "How do I accept payments?",
        answer:
          "When a customer pays, go to the invoice and click 'Record Payment'. Select the payment method (Cash, Venmo, Zelle, Card, Check) and enter the amount. Partial payments are supported.",
      },
      {
        question: "How do I track expenses?",
        answer:
          "Go to Analytics to view expense tracking. You can add expenses manually with category, amount, date, and vendor. Recurring expenses like supplies are tracked automatically if enabled in Settings.",
      },
      {
        question: "How do I set up payment terms?",
        answer:
          "In Settings > General, set your default payment terms (e.g. 'Due on receipt', 'Net 15', 'Net 30'). You can override these on individual invoices. Overdue invoices are highlighted automatically.",
      },
    ],
  },
  {
    id: "leads-marketing",
    label: "Leads & Marketing",
    icon: Megaphone,
    faqs: [
      {
        question: "How do I manage leads?",
        answer:
          "The Marketing page shows all incoming leads organized by status (New, Contacted, Qualified, Lost). Click a lead to view details, add notes, schedule follow-ups, or convert them to a customer.",
      },
      {
        question: "How do I send campaigns?",
        answer:
          "Go to Marketing > Campaigns and click 'New Campaign'. Choose your audience criteria (location, service history, etc.), write your message, and schedule the send. Track open and response rates from the campaign detail page.",
      },
      {
        question: "How do I automate follow-ups?",
        answer:
          "Set up automated workflows in Settings > Webhooks and workflows. For example, you can automatically send a follow-up message 24 hours after a lead is created, or a rebooking reminder 30 days after a completed job.",
      },
      {
        question: "How do I track where leads come from?",
        answer:
          "Each lead has a 'Source' field (Google, Referral, Social Media, Walk-in, etc.). The Analytics page shows lead source breakdown so you can see which marketing channels are performing best.",
      },
    ],
  },
  {
    id: "reviews-referrals",
    label: "Reviews & Referrals",
    icon: Star,
    faqs: [
      {
        question: "How do I request reviews?",
        answer:
          "After completing a job, the system can automatically send a review request to the customer (configurable in Settings). You can also manually request a review from the Reviews page or the customer's profile.",
      },
      {
        question: "How do I track referrals?",
        answer:
          "When adding a new customer, use the 'Referred By' field to link them to the referring customer. The referring customer's profile will show their referral count and you can track referral revenue in Analytics.",
      },
      {
        question: "How do I manage my Google reviews?",
        answer:
          "Add your Google Review URL in Settings > General. When review requests are sent, customers are directed to your Google Business Profile. The Reviews page tracks which customers have been asked and who responded.",
      },
    ],
  },
  {
    id: "settings",
    label: "Settings & Configuration",
    icon: Settings,
    faqs: [
      {
        question: "How do I configure my business info?",
        answer:
          "Go to Settings > General to set your business name, contact info, logo, tax rate, working hours, and payment terms. These settings are used across invoices, estimates, and the booking page.",
      },
      {
        question: "How do I manage services and pricing?",
        answer:
          "Go to Settings > Services to add, edit, or deactivate your service offerings. Set base prices for each vehicle type, add optional add-ons, and configure package deals. Changes apply to new jobs going forward.",
      },
      {
        question: "How do I customize message templates?",
        answer:
          "Go to Settings > Templates to create and edit message templates for confirmations, reminders, follow-ups, and review requests. Use variables like {{customer_name}} and {{job_date}} for personalization.",
      },
      {
        question: "How do I manage team members?",
        answer:
          "Go to Settings > Team to invite new members, assign roles (Admin, Tech, Viewer), and manage permissions. Team members receive an email invitation to create their account.",
      },
    ],
  },
  {
    id: "keyboard-shortcuts",
    label: "Keyboard Shortcuts",
    icon: Keyboard,
    faqs: [
      {
        question: "What keyboard shortcuts are available?",
        answer:
          "Ctrl/Cmd + K: Open command palette and search\nCtrl/Cmd + N: Create new item (job, customer, etc.)\nEsc: Close modals and dialogs\n/: Focus the search bar\nJ/K: Navigate up/down in lists\nEnter: Open selected item",
      },
      {
        question: "How do I use the command palette?",
        answer:
          "Press Ctrl/Cmd + K to open the command palette. Type to search for customers, jobs, invoices, or navigate to any page. Use arrow keys to select and Enter to confirm. The palette also shows quick actions.",
      },
    ],
  },
];

function FAQItem({ faq, defaultOpen }: { faq: FAQ; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen || false);

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-start gap-3 w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
        )}
        <span className="text-sm font-medium text-slate-800">{faq.question}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pl-11">
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
            {faq.answer}
          </p>
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["getting-started"])
  );

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return CATEGORIES;

    const q = search.toLowerCase();
    return CATEGORIES.map((cat) => ({
      ...cat,
      faqs: cat.faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(q) ||
          faq.answer.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.faqs.length > 0);
  }, [search]);

  function toggleCategory(id: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const isSearching = search.trim().length > 0;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Help Center</h1>
        <p className="text-sm text-slate-500 mt-1">
          Find answers to common questions about Fresh Path CRM
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Search for help..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredCategories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500">No results found for &quot;{search}&quot;</p>
          <p className="text-sm text-slate-400 mt-1">
            Try a different search term or browse the categories below
          </p>
          <button
            onClick={() => setSearch("")}
            className="text-sm text-emerald-600 hover:text-emerald-700 mt-3"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCategories.map((category) => {
            const isExpanded = isSearching || expandedCategories.has(category.id);
            const Icon = category.icon;

            return (
              <div
                key={category.id}
                className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="flex-1 text-sm font-semibold text-slate-800">
                    {category.label}
                  </span>
                  <span className="text-xs text-slate-400 mr-2">
                    {category.faqs.length} {category.faqs.length === 1 ? "article" : "articles"}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                {isExpanded && (
                  <div className="border-t border-slate-100">
                    {category.faqs.map((faq, i) => (
                      <FAQItem
                        key={i}
                        faq={faq}
                        defaultOpen={isSearching}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Contact Support */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-6 text-center">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
          <Mail className="w-5 h-5 text-emerald-600" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">
          Still need help?
        </h3>
        <p className="text-sm text-slate-500 mt-1 mb-3">
          Contact our support team and we will get back to you within 24 hours.
        </p>
        <a
          href="mailto:support@freshpathmobiledetailing.com"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors"
        >
          <Mail className="w-4 h-4" />
          Contact Support
        </a>
      </div>
    </div>
  );
}
