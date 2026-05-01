import {
  Globe,
  MoreVertical,
  Package,
  ShoppingBag,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { getSyncState, type SyncStateRow } from "@/lib/actions/sync";
import { cn } from "@/lib/utils";

type Status = "connected" | "error" | "disconnected";

type Platform = {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
};

const PLATFORMS: Platform[] = [
  {
    key: "shopify",
    name: "Shopify",
    description:
      "Sync orders, inventory, and customer data directly from your Shopify storefront.",
    icon: ShoppingBag,
  },
  {
    key: "amazon",
    name: "Amazon",
    description:
      "Pull SP-API order, FBA inventory, and buyer data into the analytics engine.",
    icon: Package,
  },
  {
    key: "woocommerce",
    name: "WooCommerce",
    description:
      "Integrate your self-hosted WordPress store for unified, cross-channel analytics.",
    icon: Globe,
  },
  {
    key: "etsy",
    name: "Etsy",
    description:
      "Bring your Etsy listings, receipts, and buyer profiles into the canonical schema.",
    icon: Sparkles,
  },
];

function deriveStatus(sync?: SyncStateRow): Status {
  if (!sync) return "disconnected";
  if (sync.lastSyncStatus === "error") return "error";
  return "connected";
}

export default async function Integrations() {
  const syncStates = await getSyncState();
  const syncByPlatform = new Map(syncStates.map((s) => [s.platform, s]));

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-primary">
            Integrations Hub
          </h1>
          <p className="max-w-2xl text-sm text-on-surface-variant">
            Connect your e-commerce storefronts to the DataRaders analytics
            engine. New connectors share the canonical schema automatically.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PLATFORMS.map((p) => {
            const sync = syncByPlatform.get(p.key);
            return (
              <PlatformCard
                key={p.key}
                platform={p}
                status={deriveStatus(sync)}
                sync={sync}
              />
            );
          })}
        </div>
      </div>
    </main>
  );
}

function PlatformCard({
  platform,
  status,
  sync,
}: {
  platform: Platform;
  status: Status;
  sync?: SyncStateRow;
}) {
  const { name, description, icon: Icon } = platform;
  const isConnected = status === "connected";
  const isError = status === "error";

  return (
    <article className="flex h-full flex-col rounded-sm border border-accent-magenta bg-surface-container-lowest p-6 transition-colors duration-50 ease-technical hover:border-accent-magenta">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-outline-variant/30 bg-surface-container-low">
          <Icon className="h-6 w-6 text-primary" strokeWidth={1.75} />
        </div>
        <button
          type="button"
          aria-label={`${name} options`}
          className="cursor-pointer text-outline transition-colors duration-50 ease-technical hover:text-primary"
        >
          <MoreVertical className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>

      <h3 className="mb-1 text-lg font-bold text-primary">{name}</h3>
      <p className="mb-6 flex-1 text-xs text-on-surface-variant">
        {description}
      </p>

      <div className="mt-auto flex items-center justify-between border-t border-outline-variant/20 pt-6">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              isConnected
                ? "bg-positive"
                : isError
                  ? "bg-accent-magenta"
                  : "bg-outline",
            )}
            aria-hidden="true"
          />
          <span
            className={cn(
              "font-mono text-xs font-semibold uppercase tracking-architectural",
              isConnected
                ? "text-positive"
                : isError
                  ? "text-accent-magenta"
                  : "text-outline",
            )}
            title={isError ? (sync?.lastSyncError ?? undefined) : undefined}
          >
            {isConnected
              ? "Status: Connected"
              : isError
                ? "Status: Error"
                : "Status: DisConnected"}
          </span>
        </div>
        {isConnected ? (
          <button
            type="button"
            className="cursor-pointer text-xs font-bold text-primary hover:underline"
          >
            Manage
          </button>
        ) : isError ? (
          <button
            type="button"
            className="h-8 cursor-pointer rounded-sm border border-accent-magenta px-4 text-xs font-bold uppercase tracking-architectural text-accent-magenta transition-colors duration-50 ease-technical hover:bg-accent-magenta hover:text-on-primary"
          >
            Retry
          </button>
        ) : (
          <button
            type="button"
            className="h-8 cursor-pointer rounded-sm border border-primary px-4 text-xs font-bold uppercase tracking-architectural text-primary transition-colors duration-50 ease-technical hover:bg-accent-magenta hover:text-on-primary"
          >
            Connect
          </button>
        )}
      </div>
    </article>
  );
}
