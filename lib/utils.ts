import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...args: ClassValue[]) {
  return twMerge(clsx(...args));
}

export function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(ratio: number, fractionDigits = 1) {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(ratio);
}

export function customerName(c: {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}) {
  return (
    [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
    c.email ||
    "(no name)"
  );
}
