import type { LucideIcon } from "lucide-react";

/**
 * Extension point for future campaign-specific tools (spec §14).
 * To add a tool: create its route below `/campaigns/[slug]/tools/<key>` and
 * register it here; it then appears on the tools page of every campaign.
 */
export interface CampaignTool {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Path segment below /campaigns/[slug]/tools/ */
  path: string;
}

export const CAMPAIGN_TOOLS: CampaignTool[] = [];
