import { ProductsTableView } from "@/components/productsTableView";
import { getProducts } from "@/lib/actions/products";
import { type DateRange } from "@/lib/actions/_shared";

type Props = {
  range?: DateRange;
  skus?: string[];
  page?: number;
  pageSize?: number;
};

export async function ProductsTable({
  range = "all",
  skus,
  page = 1,
  pageSize = 20,
}: Props) {
  const {
    rows,
    total,
    page: actualPage,
    pageSize: actualPageSize,
  } = await getProducts({ range, skus, page, pageSize });

  const filterSummary = skus && skus.length > 0
    ? `${skus.length} SKU${skus.length === 1 ? "" : "s"} filtered`
    : undefined;

  return (
    <ProductsTableView
      data={rows}
      total={total}
      page={actualPage}
      pageSize={actualPageSize}
      filterSummary={filterSummary}
    />
  );
}
