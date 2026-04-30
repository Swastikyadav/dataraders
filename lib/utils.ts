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
