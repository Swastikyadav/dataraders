import { CustomersTable } from "@/components/customersTable";
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

type Props = {
  searchParams: Promise<{
    search?: string | string[];
    page?: string | string[];
    range?: string | string[];
  }>;
};

export default async function Customers({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <main className="flex flex-col gap-6 p-6">
      <CustomersTable
        search={asString(params.search)}
        page={asPage(params.page)}
        range={asDateRange(params.range)}
      />
    </main>
  );
}
