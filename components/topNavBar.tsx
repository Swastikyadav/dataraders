"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Calendar,
  Bell,
  HelpCircle,
  CircleUserRound,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropDownMenu";
import { SearchPalette } from "@/components/searchPalette";

const iconButtonClass =
  "text-outline transition-colors duration-50 ease-technical hover:text-primary";

const DATE_RANGES = [
  { value: "7d", label: "Last 7 Days" },
  { value: "28d", label: "Last 28 Days" },
  { value: "90d", label: "Last 90 Days" },
] as const;

type DateRangeValue = (typeof DATE_RANGES)[number]["value"];

export function TopNavBar() {
  const [range, setRange] = useState<DateRangeValue>("7d");
  const [searchOpen, setSearchOpen] = useState(false);

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
              onValueChange={(value) => setRange(value as DateRangeValue)}
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
          <button type="button" aria-label="Help" className={iconButtonClass}>
            <HelpCircle className="h-5 w-5" strokeWidth={1.75} />
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
