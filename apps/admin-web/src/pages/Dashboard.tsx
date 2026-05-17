import { useQuery } from '@tanstack/react-query';
import { Card } from '@amaravathi/shared-ui';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';

export function Dashboard() {
  const { t } = useTranslation();

  const cards = [
    { label: t('dashboard.teaPowderTypes'), path: '/tea-powder-types' },
    { label: t('dashboard.purchaseBatches'), path: '/add-purchase-batch' },
    { label: t('dashboard.customers'), path: '/customers' },
    { label: t('dashboard.users'), path: '/users' },
  ];

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
        <h3 className="text-lg font-bold">{t('dashboard.workflow')}</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            t('dashboard.step1'),
            t('dashboard.step2'),
            t('dashboard.step3'),
            t('dashboard.step4'),
          ].map((item, index) => (
            <div key={item} className="rounded-md border bg-slate-50 p-4">
              <span className="text-xs font-semibold text-emerald-700">
                {t('dashboard.step')} {index + 1}
              </span>
              <p className="mt-2 font-medium">{item}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
