"use client";

import { useEffect, useState, useTransition } from "react";
import { Package, ShoppingCart, User } from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { searchAll, type SearchResults } from "@/lib/actions/search";
import { customerName, formatMoney } from "@/lib/utils";

const EMPTY: SearchResults = { orders: [], customers: [], products: [] };
const DEBOUNCE_MS = 200;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SearchPalette({ open, onOpenChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [, startTransition] = useTransition();

  const trimmed = query.trim();

  useEffect(() => {
    if (!trimmed) return;
    const handle = setTimeout(() => {
      startTransition(async () => {
        const next = await searchAll(trimmed);
        setResults(next);
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [trimmed]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setQuery("");
      setResults(EMPTY);
    }
    onOpenChange(next);
  };

  const showResults = trimmed.length > 0;
  const hasAnyResult =
    showResults &&
    results.orders.length + results.customers.length + results.products.length >
      0;

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <Command shouldFilter={false}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search orders, customers, products…"
        />
        <CommandList>
          {showResults && !hasAnyResult && (
            <CommandEmpty>No matches found.</CommandEmpty>
          )}

          {showResults && results.orders.length > 0 && (
            <CommandGroup heading="Orders">
              {results.orders.map((o) => (
                <CommandItem
                  key={o.id}
                  value={`order-${o.id}`}
                  onSelect={() => {
                    onOpenChange(false);
                    location.replace("/orders");
                  }}
                  className="cursor-pointer"
                >
                  <ShoppingCart />
                  <div className="flex flex-col">
                    <span className="font-mono">#{o.orderNumber}</span>
                    <span className="truncate text-on-surface-variant">
                      {o.customerEmail ?? "—"}
                    </span>
                  </div>
                  <span className="ml-auto font-mono text-on-surface-variant">
                    {formatMoney(o.totalAmount, o.currency)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {showResults &&
            results.orders.length > 0 &&
            results.customers.length > 0 && <CommandSeparator />}

          {showResults && results.customers.length > 0 && (
            <CommandGroup heading="Customers">
              {results.customers.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`customer-${c.id}`}
                  onSelect={() => {
                    onOpenChange(false);
                    location.replace("/customers");
                  }}
                  className="cursor-pointer"
                >
                  <User />
                  <div className="flex flex-col">
                    <span>{customerName(c)}</span>
                    {c.email && (
                      <span className="truncate text-on-surface-variant">
                        {c.email}
                      </span>
                    )}
                  </div>
                  <span className="ml-auto text-label-sm uppercase tracking-architectural text-on-surface-variant">
                    {c.platform}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {showResults &&
            results.customers.length > 0 &&
            results.products.length > 0 && <CommandSeparator />}

          {showResults && results.products.length > 0 && (
            <CommandGroup heading="Products">
              {results.products.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`product-${p.id}`}
                  onSelect={() => {
                    onOpenChange(false);
                    location.replace("/analytics");
                  }}
                  className="cursor-pointer"
                >
                  <Package />
                  <div className="flex flex-col truncate">
                    <span className="truncate">{p.title}</span>
                    {p.sku && (
                      <span className="font-mono text-on-surface-variant">
                        {p.sku}
                      </span>
                    )}
                  </div>
                  <span className="ml-auto font-mono text-on-surface-variant">
                    {formatMoney(p.priceAmount, p.priceCurrency)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
