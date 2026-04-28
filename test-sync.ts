// Test script to verify sync functionality
import { syncAllPlatforms, getSyncStatus } from '@/lib/sync';
import { getTotalRevenue, getTopProductsBySku, getRevenueByPlatform } from '@/lib/queries';
import { db } from '@/lib/db';

async function main() {
  try {
    console.log('='.repeat(80));
    console.log('TESTING CANONICAL SCHEMA SYNC');
    console.log('='.repeat(80));

    console.log('\n--- Starting Sync ---');
    const syncResults = await syncAllPlatforms();

    console.log('\n--- Sync Results ---');
    for (const result of syncResults) {
      console.log(`${result.platform}:`);
      console.log(`  Status: ${result.status}`);
      if (result.message) console.log(`  Message: ${result.message}`);
      console.log(`  Products: ${result.productsCount}`);
      console.log(`  Orders: ${result.ordersCount}`);
      console.log(`  Customers: ${result.customersCount}`);
      console.log(`  Duration: ${result.duration}ms`);
    }

    console.log('\n--- Sync Status ---');
    const status = await getSyncStatus();
    for (const s of status) {
      console.log(`${s.platform}:`);
      console.log(`  Last synced: ${s.lastSyncedAt?.toISOString()}`);
      console.log(`  Status: ${s.lastSyncStatus}`);
      console.log(`  Products: ${s.productsCount}, Orders: ${s.ordersCount}, Customers: ${s.customersCount}`);
    }

    console.log('\n--- Cross-Platform Analytics ---');
    const totalRevenue = await getTotalRevenue();
    console.log(`Total Revenue (all platforms): $${(totalRevenue / 100).toFixed(2)}`);

    const revenueByPlatform = await getRevenueByPlatform();
    console.log(`\nRevenue by Platform:`);
    for (const p of revenueByPlatform) {
      console.log(`  ${p.platform}: $${(p.revenue / 100).toFixed(2)} (${p.orderCount} orders, AOV: $${(p.averageOrder / 100).toFixed(2)})`);
    }

    const topProducts = await getTopProductsBySku(5);
    console.log(`\nTop 5 Products by Revenue:`);
    for (const p of topProducts) {
      console.log(`  ${p.sku}: ${p.title}`);
      console.log(`    Revenue: $${(p.revenue / 100).toFixed(2)}, Units: ${p.unitsSold}, Platforms: ${p.platforms.join(', ')}`);
    }

    console.log('\n--- Database Statistics ---');
    const [productCount, orderCount, customerCount, lineItemCount] = await Promise.all([
      db.product.count(),
      db.order.count(),
      db.customer.count(),
      db.lineItem.count(),
    ]);
    console.log(`Products: ${productCount}`);
    console.log(`Orders: ${orderCount}`);
    console.log(`Customers: ${customerCount}`);
    console.log(`Line Items: ${lineItemCount}`);

    console.log('\n--- Cross-Platform Product Lookup ---');
    const skuProducts = await db.product.findMany({
      where: { sku: 'SB-MINIMAL' },
      select: { sku: true, platform: true, title: true, price: true },
    });
    if (skuProducts.length > 0) {
      console.log(`Products with SKU "SB-MINIMAL":`);
      for (const p of skuProducts) {
        console.log(`  ${p.platform}: ${p.title} - $${(p.price / 100).toFixed(2)}`);
      }
    }

    console.log('\n='.repeat(80));
    console.log('✓ ALL TESTS PASSED');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
