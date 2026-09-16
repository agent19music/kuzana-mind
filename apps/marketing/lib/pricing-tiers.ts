/**
 * Editable Paddle catalog mapping for the marketing pricing section.
 * Price IDs are public (safe in client bundles). Sandbox vs live is chosen
 * from NEXT_PUBLIC_PADDLE_ENVIRONMENT at build time.
 */
export interface Tier {
  name: "Starter" | "Pro" | "Advanced";
  description: string;
  features: string[];
  priceId: { month: string; year: string };
  highlight?: boolean;
}

const LIVE = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "production";

const CATALOG = {
  starter: LIVE
    ? {
        month: "pri_01m2n22xz6j0kh3p2c96j8jwgp",
        year: "pri_01m2n22y0mdh7gknan1vqes5m4",
      }
    : {
        month: "pri_01m215b0ecq2b4ax936hxkg1zp",
        year: "pri_01m215b1hh683530gdj8xcc8c1",
      },
  pro: LIVE
    ? {
        month: "pri_01m2n22y5j4k2q8tz7w3eya9sz",
        year: "pri_01m2n22y7mabz8n6xw9evtngrq",
      }
    : {
        month: "pri_01m215b3khx25g48jem5rbk8tb",
        year: "pri_01m215b4y93q0h63peaj2w7ga6",
      },
  advanced: LIVE
    ? {
        month: "pri_01m2n22yc5pvsm72mymt36w615",
        year: "pri_01m2n22ydjtpk7s1dv64r5zfjb",
      }
    : {
        month: "pri_01m215b757n462c86r7tev62vq",
        year: "pri_01m215b83z0avwsv0va5tdxteq",
      },
} as const;

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
    priceId: CATALOG.starter,
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
    priceId: CATALOG.pro,
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
    priceId: CATALOG.advanced,
    highlight: true,
  },
];

export type BillingInterval = "month" | "year";
