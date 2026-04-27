// quick-sku-check.ts
import "dotenv/config";
import { shopifyConnector } from "./lib/connectors/shopify";

async function check() {
  const products = await shopifyConnector.fetchProducts();
  for (const p of products) {
    console.log(
      `${p.sku ?? "(no sku)"}\t${p.title}\t$${(p.priceAmount / 100).toFixed(2)}`,
    );
  }
}

check();
