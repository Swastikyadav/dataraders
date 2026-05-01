import { ProductsTable } from "@/components/productsTable";
import { type DateRange } from "@/lib/actions/_shared";

const VALID_RANGES: DateRange[] = ["7d", "28d", "90d", "all"];

function asString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function asPage(value: string | string[] | undefined): number {
  const raw = asString(value);
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function asDateRange(value: string | string[] | undefined): DateRange {
  const raw = asString(value);
  return raw && (VALID_RANGES as string[]).includes(raw)
    ? (raw as DateRange)
    : "all";
}

function asSkus(value: string | string[] | undefined): string[] | undefined {
  const raw = asString(value);
  if (!raw) return undefined;
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

type Props = {
  searchParams: Promise<{
    page?: string | string[];
    skus?: string | string[];
    range?: string | string[];
  }>;
};

export default async function Analytics({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <main className="flex flex-col gap-6 p-6">
      <ProductsTable
        skus={asSkus(params.skus)}
        page={asPage(params.page)}
        range={asDateRange(params.range)}
      />
    </main>
  );
}
