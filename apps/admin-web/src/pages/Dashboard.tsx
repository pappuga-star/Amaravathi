import { useQuery } from '@tanstack/react-query';
import { Card } from '@amaravathi/shared-ui';
import { api } from '../lib/api';

const cards = [
  { label: 'Tea powder types', path: '/tea-powder-types' },
  { label: 'Purchase batches', path: '/add-purchase-batch' },
  { label: 'Customers', path: '/customers' },
  { label: 'Users', path: '/users' },
];

export function Dashboard() {
  const queries = cards.map((card) =>
    useQuery({
      queryKey: ['count', card.path],
      queryFn: () => api<{ total: number }>(`${card.path}?limit=1`),
    }),
  );

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, index) => (
          <Card key={card.path}>
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-3 text-3xl font-bold">
              {queries[index]?.data?.total ?? 0}
            </p>
          </Card>
        ))}
      </section>
      <Card className="p-5">
        <h3 className="text-lg font-bold">Purchase verification workflow</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            'Create tea powder types',
            'Create tea powders',
            'Add purchase batches',
            'Search and verify rates',
          ].map((item, index) => (
            <div key={item} className="rounded-md border bg-slate-50 p-4">
              <span className="text-xs font-semibold text-emerald-700">
                Step {index + 1}
              </span>
              <p className="mt-2 font-medium">{item}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
