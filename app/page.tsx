import {
  getTotalRevenue,
  getRevenueByPlatform,
  getTopProductsBySku,
  getOrderCountByFinancialStatus,
  getUnpaidOrders,
  getUnshippedOrders,
} from '@/lib/queries';
import { getSyncStatus } from '@/lib/sync';

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function Home() {
  const [
    totalRevenue,
    revenueByPlatform,
    topProducts,
    financialStatus,
    unpaidOrders,
    unshippedOrders,
    syncStatus,
  ] = await Promise.all([
    getTotalRevenue(),
    getRevenueByPlatform(),
    getTopProductsBySku(5),
    getOrderCountByFinancialStatus(),
    getUnpaidOrders(),
    getUnshippedOrders(),
    getSyncStatus(),
  ]);

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Canonical E-Commerce Dashboard
        </h1>
        <p className="text-gray-600 mb-8">
          Unified analytics across all platforms (Shopify, Amazon, WooCommerce, Etsy)
        </p>

        {/* Sync Status */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Sync Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {syncStatus.map((s) => (
              <div
                key={s.platform}
                className="border border-gray-200 rounded p-4"
              >
                <div className="font-semibold text-gray-900 capitalize">
                  {s.platform}
                </div>
                <div
                  className={`text-sm font-medium ${
                    s.lastSyncStatus === 'success'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {s.lastSyncStatus || 'Never'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {s.lastSyncedAt
                    ? new Date(s.lastSyncedAt).toLocaleString()
                    : 'N/A'}
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  {s.productsCount} products, {s.ordersCount} orders,{' '}
                  {s.customersCount} customers
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Key Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <div className="text-sm text-gray-600">Total Revenue</div>
              <div className="text-3xl font-bold text-blue-600 mt-1">
                {formatMoney(totalRevenue)}
              </div>
            </div>
          </div>
        </div>

        {/* Revenue by Platform */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Revenue by Platform
          </h2>
          <div className="space-y-3">
            {revenueByPlatform.map((p) => (
              <div key={p.platform} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-semibold capitalize text-gray-900">
                    {p.platform}
                  </div>
                  <div className="text-sm text-gray-500">
                    {p.orderCount} orders, AOV {formatMoney(p.averageOrder)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">
                    {formatMoney(p.revenue)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.round((p.revenue / totalRevenue) * 100)}% of total
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Top Products by Revenue
          </h2>
          <div className="space-y-4">
            {topProducts.map((p) => (
              <div key={p.sku} className="border border-gray-200 rounded p-4">
                <div className="font-semibold text-gray-900">{p.title}</div>
                <div className="text-sm text-gray-600 mt-1">SKU: {p.sku}</div>
                <div className="flex justify-between mt-2">
                  <div className="text-sm">
                    <span className="text-gray-600">{p.unitsSold} units sold</span>
                  </div>
                  <div className="font-semibold text-gray-900">
                    {formatMoney(p.revenue)}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Available on: {p.platforms.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Status */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Order Status Distribution
          </h2>
          <div className="space-y-2">
            {financialStatus.map((s) => (
              <div key={s.status} className="flex items-center justify-between">
                <div className="capitalize text-gray-600">{s.status}</div>
                <div className="flex items-center gap-4">
                  <div className="font-semibold text-gray-900 w-12 text-right">
                    {s.count}
                  </div>
                  <div className="text-gray-600 w-24 text-right">
                    {formatMoney(s.revenue)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unpaid Orders */}
        {unpaidOrders.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-8 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Unpaid Orders ({unpaidOrders.length})
            </h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {unpaidOrders.slice(0, 5).map((o) => (
                <div
                  key={o.id}
                  className="border border-red-200 rounded p-3 bg-red-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {o.platformId}
                      </div>
                      <div className="text-sm text-gray-600">
                        {o.platform} • {o.customerEmail}
                      </div>
                    </div>
                    <div className="font-semibold text-gray-900">
                      {formatMoney(o.total)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unshipped Orders */}
        {unshippedOrders.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Unshipped Orders ({unshippedOrders.length})
            </h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {unshippedOrders.slice(0, 5).map((o) => (
                <div
                  key={o.id}
                  className="border border-yellow-200 rounded p-3 bg-yellow-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {o.platformId}
                      </div>
                      <div className="text-sm text-gray-600">
                        {o.platform} • {o.customerEmail}
                      </div>
                    </div>
                    <div className="font-semibold text-gray-900">
                      {formatMoney(o.total)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
