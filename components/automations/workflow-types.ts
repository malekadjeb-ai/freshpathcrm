import {
  StickyNote, CheckSquare, Bell, ArrowRightCircle, Tag, Target,
  MessageSquare, Mail, FileText, Star, RefreshCw, Webhook, Clock, GitBranch,
} from "lucide-react";

export const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  create_activity: StickyNote,
  create_task: CheckSquare,
  send_notification: Bell,
  update_status: ArrowRightCircle,
  update_customer_tag: Tag,
  update_lead_status: Target,
  send_sms: MessageSquare,
  send_email: Mail,
  create_invoice: FileText,
  request_review: Star,
  send_rebook_prompt: RefreshCw,
  webhook: Webhook,
  wait: Clock,
  condition: GitBranch,
};

export interface WorkflowAction {
  type: string;
  config?: Record<string, unknown>;
  delay?: number;
}

export interface WorkflowTrigger {
  type: string;
  conditions?: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  isActive: boolean;
  isTemplate: boolean;
  runCount: number;
  lastRunAt: string | null;
  logCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowLog {
  id: string;
  triggeredBy: string;
  status: string;
  actions: { action: string; status: string; result?: string; timestamp: string }[];
  error: string | null;
  createdAt: string;
}
