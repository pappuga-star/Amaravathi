import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Input, Field, Button } from '@amaravathi/shared-ui';
import { api, endpoints } from '../lib/api';
import { Search, User, TrendingUp, ClipboardList, Printer } from 'lucide-react';
import { formatCurrency } from '@amaravathi/shared-utils';
import type { PurchaseBatch } from '@amaravathi/shared-types';
import { useTabsKeyboardNavigation } from '../hooks/useTabsKeyboardNavigation';

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<
    'trends' | 'list' | 'detail' | 'seller'
  >('trends');
  const [sellerSearch, setSellerSearch] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const reportTabs = ['trends', 'list', 'detail', 'seller'] as const;
  const onReportTabsKeyDown = useTabsKeyboardNavigation(reportTabs, activeTab, setActiveTab);

  // Fetch all purchase batches for Batch List and Selector
  const batchesQuery = useQuery({
    queryKey: ['report-batches'],
    queryFn: () =>
      api<{ items: PurchaseBatch[] }>(`${endpoints.batches}?limit=1000`).then(
        (res) => res.items,
      ),
  });

  // Fetch latest rates report
  const latestByTea = useQuery({
    queryKey: ['latest-rates-by-tea'],
    queryFn: () => api<any[]>('/reports/latest-rates-by-tea-powder'),
  });

  // Fetch seller purchase history
  const sellerHistory = useQuery({
    queryKey: ['seller-history', sellerSearch],
    queryFn: () =>
      api<any[]>(
        `/reports/seller-purchase-history?sellerName=${encodeURIComponent(sellerSearch)}`,
      ),
    enabled: sellerSearch.length >= 2,
  });

  const selectedBatch = batchesQuery.data?.find(
    (b) => b.id === selectedBatchId,
  );

  return (
    <div className="grid gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">System Reports</h2>
          <p className="text-sm text-slate-500">
            View latest pricing trends, supplier history, and purchase batches.
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Reports sections"
          onKeyDown={onReportTabsKeyDown}
          className="flex rounded-xl bg-slate-100 p-1 font-semibold text-slate-600 ring-1 ring-slate-200"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'trends'}
            tabIndex={activeTab === 'trends' ? 0 : -1}
            onClick={() => setActiveTab('trends')}
            className={`rounded-lg px-4 py-2 text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.99] ${
              activeTab === 'trends'
                ? 'bg-white text-emerald-800 shadow'
                : 'hover:bg-slate-50 hover:text-slate-950'
            }`}
          >
            Latest Prices
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'list'}
            tabIndex={activeTab === 'list' ? 0 : -1}
            onClick={() => setActiveTab('list')}
            className={`rounded-lg px-4 py-2 text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.99] ${
              activeTab === 'list'
                ? 'bg-white text-emerald-800 shadow'
                : 'hover:bg-slate-50 hover:text-slate-950'
            }`}
          >
            Batch List
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'detail'}
            tabIndex={activeTab === 'detail' ? 0 : -1}
            onClick={() => setActiveTab('detail')}
            className={`rounded-lg px-4 py-2 text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.99] ${
              activeTab === 'detail'
                ? 'bg-white text-emerald-800 shadow'
                : 'hover:bg-slate-50 hover:text-slate-950'
            }`}
          >
            Batch Details
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'seller'}
            tabIndex={activeTab === 'seller' ? 0 : -1}
            onClick={() => setActiveTab('seller')}
            className={`rounded-lg px-4 py-2 text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.99] ${
              activeTab === 'seller'
                ? 'bg-white text-emerald-800 shadow'
                : 'hover:bg-slate-50 hover:text-slate-950'
            }`}
          >
            Seller History
          </button>
        </div>
      </div>

      {activeTab === 'trends' && (
        <Card className="p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Latest Tea Prices
            </h3>
          </div>
          <div className="overflow-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-4 py-3">Tea Powder Type</th>
                  <th className="px-4 py-3 text-right">Latest Rate</th>
                  <th className="px-4 py-3 text-right">Batch Code</th>
                  <th className="px-4 py-3 text-right">Purchase Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {latestByTea.data?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-700">
                      {item.teaPowderType}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-700">
                      {formatCurrency(item.ratePerKg)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-slate-900">
                      {item.batchCode}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500 font-medium">
                      {new Date(item.purchaseDate).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
                {latestByTea.data?.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-slate-400 italic"
                    >
                      No price data available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'list' && (
        <Card className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                <ClipboardList size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Batch List Report
              </h3>
            </div>
            <Button
              variant="default"
              className="h-9 px-3 no-print"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4 text-current" />
              <span>Print Report</span>
            </Button>
          </div>
          <div className="overflow-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-4 py-3">S.No</th>
                  <th className="px-4 py-3">Batch Code</th>
                  <th className="px-4 py-3">Seller Name</th>
                  <th className="px-4 py-3">Bill Number</th>
                  <th className="px-4 py-3 text-right">No. of Bags</th>
                  <th className="px-4 py-3 text-right">Purchase Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batchesQuery.data?.map((batch, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-500">
                      #{batch.serialNumber}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-800">
                      {batch.batchCode}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {batch.sellerName}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {batch.billNumber}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {batch.numberOfBags} Bags
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500 font-medium">
                      {new Date(batch.purchaseDate).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
                {batchesQuery.data?.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-400 italic"
                    >
                      No purchase batches found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'detail' && (
        <div className="grid gap-6">
          <Card className="p-6 no-print">
            <h3 className="mb-4 text-base font-bold text-slate-900">
              Select Batch Code
            </h3>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Field label="Select Purchase Batch to View Details">
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                  >
                    <option value="">-- Choose Batch Code --</option>
                    {batchesQuery.data?.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        Batch: {batch.batchCode} (Seller: {batch.sellerName} |
                        Date:{' '}
                        {new Date(batch.purchaseDate).toLocaleDateString(
                          'en-IN',
                        )}
                        )
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Button
                variant="default"
                className="h-10 px-6"
                disabled={!selectedBatchId}
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4 text-current" />
                <span>Print Invoice Style</span>
              </Button>
            </div>
          </Card>

          {selectedBatch ? (
            <Card className="p-8 ring-1 ring-slate-200">
              <div className="flex flex-col justify-between border-b pb-6 sm:flex-row sm:items-start">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                    Amaravathi Tea Estates
                  </p>
                  <h3 className="text-3xl font-black text-slate-900">
                    {selectedBatch.batchCode}
                  </h3>
                  <p className="text-sm text-slate-500 font-semibold">
                    Batch Details Statement
                  </p>
                </div>
                <div className="mt-4 text-left sm:mt-0 sm:text-right">
                  <p className="text-xs text-slate-400">SERIAL NUMBER</p>
                  <p className="text-base font-extrabold text-slate-800">
                    #{selectedBatch.serialNumber}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">PURCHASE DATE</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {new Date(selectedBatch.purchaseDate).toLocaleDateString(
                      'en-IN',
                      {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      },
                    )}
                  </p>
                </div>
              </div>

              <div className="my-6 grid gap-6 rounded-xl bg-slate-50 p-6 sm:grid-cols-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Seller / Supplier
                  </span>
                  <p className="mt-1 font-bold text-slate-900">
                    {selectedBatch.sellerName}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Bill Number
                  </span>
                  <p className="mt-1 font-bold text-slate-900">
                    {selectedBatch.billNumber}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    No. of Bags
                  </span>
                  <p className="mt-1 font-extrabold text-emerald-800">
                    {selectedBatch.numberOfBags} Bags
                  </p>
                </div>
              </div>

              <div>
                <h4 className="mb-4 text-xs font-black uppercase tracking-wider text-slate-400">
                  Tea Powder Line Items
                </h4>
                <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Sub S.No</th>
                        <th className="px-4 py-3">Tea Powder Type</th>
                        <th className="px-4 py-3 text-right">Price per Kg</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedBatch.items.map((item) => (
                        <tr key={item.subSerialNumber}>
                          <td className="px-4 py-3 font-bold text-slate-500">
                            #{item.subSerialNumber}
                          </td>
                          <td className="px-4 py-3 font-extrabold text-slate-900">
                            {item.teaPowderType}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-emerald-700">
                            {formatCurrency(item.ratePerKg ?? item.pricePerKg)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="grid h-64 place-items-center border-dashed text-slate-400">
              <p className="text-sm italic">
                Please select a batch from the dropdown above to view details.
              </p>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'seller' && (
        <Card className="p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-blue-50 text-blue-700">
              <User size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Seller Purchase History
            </h3>
          </div>
          <div className="mb-6">
            <Field label="Search Seller">
              <div className="relative">
                <Search
                  className="absolute left-3 top-3 text-slate-400"
                  size={18}
                />
                <Input
                  className="pl-10"
                  placeholder="Enter seller name..."
                  value={sellerSearch}
                  onChange={(e) => setSellerSearch(e.target.value)}
                />
              </div>
            </Field>
          </div>
          <div className="grid gap-3">
            {sellerHistory.data?.map((batch, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg bg-slate-50 p-4 ring-1 ring-slate-100 hover:ring-blue-100 transition-all"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {batch.batchCode}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(batch.purchaseDate).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-400">
                    Bill: {batch.billNumber}
                  </p>
                  <p className="text-sm font-black text-emerald-700">
                    {batch.numberOfBags} Bags
                  </p>
                </div>
              </div>
            ))}
            {sellerSearch.length >= 2 &&
              !sellerHistory.isLoading &&
              sellerHistory.data?.length === 0 && (
                <p className="py-10 text-center text-sm text-slate-400">
                  No history found for this seller.
                </p>
              )}
            {sellerSearch.length < 2 && (
              <p className="py-10 text-center text-sm text-slate-400 italic">
                Enter at least 2 characters to search history.
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
