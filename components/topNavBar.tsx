"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Calendar,
  Bell,
  CircleUserRound,
  RefreshCcw,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropDownMenu";
import { SearchPalette } from "@/components/searchPalette";
import { runSync } from "@/lib/actions/sync";
import { cn } from "@/lib/utils";

const iconButtonClass =
  "text-outline transition-colors duration-50 ease-technical hover:text-primary cursor-pointer";

const DATE_RANGES = [
  { value: "all", label: "All Time" },
  { value: "7d", label: "Last 7 Days" },
  { value: "28d", label: "Last 28 Days" },
  { value: "90d", label: "Last 90 Days" },
] as const;

type DateRangeValue = (typeof DATE_RANGES)[number]["value"];

const VALID_RANGES = DATE_RANGES.map((r) => r.value) as readonly string[];

export function TopNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchOpen, setSearchOpen] = useState(false);
  const [syncing, startSync] = useTransition();

  const rangeParam = searchParams.get("range");
  const range: DateRangeValue =
    rangeParam && VALID_RANGES.includes(rangeParam)
      ? (rangeParam as DateRangeValue)
      : "all";

  const handleRangeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("range");
    else params.set("range", value);
    // Reset pagination so users don't land on an out-of-range page after
    // narrowing the window.
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const handleSync = () => {
    startSync(async () => {
      await runSync();
    });
  };

  const activeLabel =
    DATE_RANGES.find((r) => r.value === range)?.label ?? DATE_RANGES[0].label;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-6 py-2 font-sans text-sm uppercase tracking-wider">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="relative flex w-64 cursor-pointer items-center gap-2 rounded-sm bg-surface-container-low py-1.5 pr-2 pl-10 text-left text-xs text-outline/60 transition-colors duration-50 ease-technical hover:bg-surface-container-highest focus:ring-1 focus:ring-accent-magenta focus:outline-none"
        >
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-outline"
            strokeWidth={1.75}
          />
          <span className="flex-1 truncate">SEARCH DATASETS...</span>
          <kbd className="rounded-sm border border-outline-variant bg-surface-container-lowest px-1.5 py-0.5 font-mono text-label-sm tracking-normal text-on-surface-variant">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-full cursor-pointer items-center gap-2 border-b-2 border-primary py-1 font-bold text-primary outline-none"
            >
              <span>{activeLabel}</span>
              <Calendar className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-40 bg-surface-container-lowest"
          >
            <DropdownMenuRadioGroup
              value={range}
              onValueChange={handleRangeChange}
            >
              {DATE_RANGES.map((option) => (
                <DropdownMenuRadioItem
                  key={option.value}
                  value={option.value}
                  className="cursor-pointer"
                >
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Notifications"
            className={iconButtonClass}
          >
            <Bell className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            aria-label="Sync connectors"
            className={cn(
              iconButtonClass,
              syncing && "pointer-events-none opacity-60",
            )}
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCcw
              className={cn("h-5 w-5", syncing && "animate-spin")}
              strokeWidth={1.75}
            />
          </button>
          <button
            type="button"
            aria-label="Account"
            className={iconButtonClass}
          >
            <CircleUserRound className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
