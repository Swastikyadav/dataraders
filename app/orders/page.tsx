import { OrdersTable } from "@/components/ordersTable";
import { type DateRange } from "@/lib/actions/_shared";

const DATE_RANGES: DateRange[] = ["7d", "28d", "90d", "all"];

function asDateRange(value: string | undefined): DateRange | undefined {
  return value && (DATE_RANGES as string[]).includes(value)
    ? (value as DateRange)
    : undefined;
}

function asString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function asPage(value: string | string[] | undefined): number {
  const raw = asString(value);
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

type Props = {
  searchParams: Promise<{
    sku?: string | string[];
    status?: string | string[];
    platform?: string | string[];
    range?: string | string[];
    customerId?: string | string[];
    page?: string | string[];
  }>;
};

export default async function Orders({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <main className="flex flex-col gap-6 p-6">
      <OrdersTable
        sku={asString(params.sku)}
        financialStatus={asString(params.status)}
        platform={asString(params.platform)}
        range={asDateRange(asString(params.range))}
        customerId={asString(params.customerId)}
        page={asPage(params.page)}
      />
    </main>
  );
}
