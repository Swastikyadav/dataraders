"use client";

import { useState } from "react";
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
  const activeLabel =
    DATE_RANGES.find((r) => r.value === range)?.label ?? DATE_RANGES[0].label;

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-6 py-2 font-sans text-sm uppercase tracking-wider">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-outline"
            strokeWidth={1.75}
          />
          <input
            type="text"
            placeholder="SEARCH DATASETS..."
            className="w-64 rounded-sm border-none bg-surface-container-low py-1.5 pr-4 pl-10 text-xs placeholder:text-outline/60 focus:ring-1 focus:ring-accent-magenta focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-full items-center gap-2 border-b-2 border-primary py-1 font-bold text-primary outline-none cursor-pointer"
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
    </header>
  );
}
