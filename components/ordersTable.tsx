import { OrdersTableView } from "@/components/ordersTableView";
import { getOrders } from "@/lib/actions/orders";
import { type DateRange } from "@/lib/actions/_shared";

type Props = {
  range?: DateRange;
  platform?: string;
  financialStatus?: string;
  sku?: string;
  customerId?: string;
  page?: number;
  pageSize?: number;
};

export async function OrdersTable({
  range = "all",
  platform,
  financialStatus,
  sku,
  customerId,
  page = 1,
  pageSize = 20,
}: Props) {
  const { rows, total, page: actualPage, pageSize: actualPageSize } =
    await getOrders({
      range,
      platform,
      financialStatus,
      sku,
      customerId,
      page,
      pageSize,
    });

  const filterParts: string[] = [];
  if (customerId) {
    const customerLabel = rows[0]?.customerEmail ?? "customer";
    filterParts.push(customerLabel);
  }
  if (sku) filterParts.push(`SKU ${sku}`);
  if (financialStatus) filterParts.push(financialStatus);
  if (platform) filterParts.push(platform);
  const filterSummary = filterParts.length
    ? filterParts.join(" · ")
    : undefined;

  return (
    <OrdersTableView
      data={rows}
      total={total}
      page={actualPage}
      pageSize={actualPageSize}
      filterSummary={filterSummary}
    />
  );
}
