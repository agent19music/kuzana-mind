/**
 * Editable Paddle catalog mapping for the marketing pricing section.
 * Price IDs are public (safe in client bundles). Swap IDs when recreating catalog.
 */
export interface Tier {
  name: "Starter" | "Pro" | "Advanced";
  description: string;
  features: string[];
  priceId: { month: string; year: string };
  highlight?: boolean;
}

export const TIERS: Tier[] = [
  {
    name: "Starter",
    description: "For small teams getting started",
    features: [
      "Notion + Google Docs",
      "Up to 10 uploaded files",
      "2,500 knowledge chunks",
      "Up to 20 members",
      "2 data sources",
      "Manual sync",
      "7-day free trial",
      "Community support",
    ],
    priceId: {
      month: "pri_01m215b0ecq2b4ax936hxkg1zp",
      year: "pri_01m215b1hh683530gdj8xcc8c1",
    },
  },
  {
    name: "Pro",
    description: "For teams that need Drive and more room",
    features: [
      "All Starter features",
      "Up to 50 uploaded files",
      "8,000 knowledge chunks",
      "Up to 40 members",
      "4 data sources",
      "Google Drive connector",
      "7-day free trial",
      "Email support",
    ],
    priceId: {
      month: "pri_01m215b3khx25g48jem5rbk8tb",
      year: "pri_01m215b4y93q0h63peaj2w7ga6",
    },
  },
  {
    name: "Advanced",
    description: "For growing orgs that need headroom",
    features: [
      "All Pro features",
      "Up to 2,000 uploaded files",
      "80,000 knowledge chunks",
      "Up to 200 members",
      "Unlimited sources",
      "Priority support",
      "7-day free trial",
      "Weekly auto-sync",
    ],
    priceId: {
      month: "pri_01m215b757n462c86r7tev62vq",
      year: "pri_01m215b83z0avwsv0va5tdxteq",
    },
    highlight: true,
  },
];

export type BillingInterval = "month" | "year";
