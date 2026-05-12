import { CustomersTableClient } from "@/components/customtersTable/customersTableClient";
import { getCustomers } from "@/lib/actions/customers";
import { type DateRange } from "@/lib/actions/_shared";

const RANGE_LABEL: Record<DateRange, string> = {
  "7d": "Last 7 Days",
  "28d": "Last 28 Days",
  "90d": "Last 90 Days",
  all: "All Time",
};

type Props = {
  page?: number;
  pageSize?: number;
  search?: string;
  range?: DateRange;
};

export async function CustomersTable({
  page = 1,
  pageSize = 20,
  search,
  range = "all",
}: Props) {
  const {
    rows,
    total,
    page: actualPage,
    pageSize: actualPageSize,
  } = await getCustomers({ page, pageSize, search, range });

  const filterParts: string[] = [];
  if (range !== "all") filterParts.push(`Active · ${RANGE_LABEL[range]}`);
  if (search) filterParts.push(`"${search}"`);
  const filterSummary =
    filterParts.length > 0 ? filterParts.join(" · ") : undefined;

  return (
    <CustomersTableClient
      data={rows}
      total={total}
      page={actualPage}
      pageSize={actualPageSize}
      filterSummary={filterSummary}
    />
  );
}
