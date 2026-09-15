import { InfoMessage } from '@/components/forms';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/date-picker';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { useState } from 'react';
import { PageHeading, EmptyState } from '../components/ui';
import { Field, Loading, ErrorPanel } from '../components/forms';
import {
  dateTime,
  kindLabels,
  money,
  number,
  useData,
  usePagedData,
} from '../lib/api';
import type { Ledger } from '../lib/types';
import type { Report } from './overview';
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv =
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((value) => {
            const safe = String(value);
            return `"${(/^[=+@\t\r-]/.test(safe) ? "'" : '') + safe.replaceAll('"', '""')}"`;
          })
          .join(';'),
      )
      .join('\r\n');
  const url = URL.createObjectURL(
    new Blob([csv], { type: 'text/csv;charset=utf-8' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
export function ReportsPage({ locationId }: { locationId: string }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [tab, setTab] = useState('stock');
  const params = new URLSearchParams();
  if (locationId) params.set('locationId', locationId);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const report = useData<Report>(`/reports?${params}`);
  const ledger = usePagedData<Ledger>(`/ledger?${params}`, 500);
  if (report.isPending || ledger.isPending) return <Loading />;
  if (report.error || ledger.error)
    return (
      <ErrorPanel
        error={(report.error || ledger.error)!}
        retry={() => {
          void report.refetch();
          void ledger.refetch();
        }}
      />
    );
  const rows: (string | number)[][] =
    tab === 'transit'
      ? [
          ['Documento', 'Origem', 'Destino', 'Material', 'Pendente', 'Unidade'],
          ...report.data.transit.map((t) => [
            t.document,
            t.origin,
            t.destination,
            t.material,
            t.pending,
            t.unit,
          ]),
        ]
      : tab === 'stock'
        ? [
            [
              'Obra',
              'Material',
              'Unidade',
              'Disponível',
              'Custo médio',
              'Valor',
            ],
            ...report.data.stock.map((s) => [
              s.location.name,
              s.material.name,
              s.material.unit.code,
              s.quantity,
              s.averageCost,
              s.value,
            ]),
          ]
        : tab === 'consumption'
          ? [
              ['Centro de custo', 'Documentos', 'Consumo (R$)'],
              ...report.data.consumption.map((c) => [
                c.name,
                c.documents,
                c.value,
              ]),
            ]
          : [
              [
                'Data',
                'Obra',
                'Material',
                'Operação',
                'Documento',
                'Variação',
                'Saldo após',
              ],
              ...(ledger.data ?? []).map((l) => [
                dateTime(l.createdAt),
                l.location.name,
                l.material.name,
                kindLabels[l.document.kind] ?? l.document.kind,
                l.document.number,
                l.delta,
                l.balance,
              ]),
            ];
  return (
    <>
      <PageHeading
        eyebrow="ACOMPANHAMENTO"
        title="Relatórios e histórico"
        description="Consulte os saldos atuais e as movimentações do período nas obras autorizadas."
        action={
          <div className="actions-row">
            <Button variant="outline" onClick={() => window.print()}>
              Imprimir / PDF
            </Button>
            <Button onClick={() => downloadCsv(`estoque-${tab}.csv`, rows)}>
              Exportar CSV
            </Button>
          </div>
        }
      />
      <div className="filters">
        <Field label="De" className="w-auto min-w-44">
          <DatePicker value={from} onValueChange={setFrom} />
        </Field>
        <Field label="Até" className="w-auto min-w-44">
          <DatePicker value={to} onValueChange={setTo} />
        </Field>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="section-tabs w-full justify-start overflow-x-auto">
          {[
            ['stock', 'Saldos atuais'],
            ['transit', 'Materiais em trânsito'],
            ['consumption', 'Consumo por centro de custo'],
            ['ledger', 'Histórico de movimentações'],
          ].map(([id, label]) => (
            <TabsTrigger
              className="shrink-0 flex-none data-[state=active]:bg-primary data-[state=active]:text-white"
              key={id}
              value={id!}
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab}>
          <Card asChild className="block gap-0">
            <section className="panel">
              <div className="section-heading">
                <h2>
                  {tab === 'stock'
                    ? `Valor disponível: ${money(report.data.totalValue)}`
                    : tab === 'consumption'
                      ? 'Saídas de consumo por centro de custo'
                      : tab === 'transit'
                        ? 'Pendências entre obras'
                        : 'Lançamentos do período'}
                </h2>
              </div>
              <div className="table-scroll">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {rows[0]!.map((label) => (
                        <TableHead key={label}>{label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(1).map((row, i) => (
                      <TableRow key={i}>
                        {row.map((value, j) => (
                          <TableCell key={j}>
                            {typeof value === 'number' ? number(value) : value}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {tab === 'ledger' && ledger.hasNextPage && (
                <InfoMessage>
                  Há mais registros. Carregue os lançamentos desejados antes de
                  exportar ou imprimir.{' '}
                  <Button
                    variant="outline"
                    disabled={ledger.isFetchingNextPage}
                    onClick={() => void ledger.fetchNextPage()}
                  >
                    Carregar mais lançamentos
                  </Button>
                </InfoMessage>
              )}
              {rows.length === 1 && (
                <EmptyState>Nenhum registro no período selecionado.</EmptyState>
              )}
            </section>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
