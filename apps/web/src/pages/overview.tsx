import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Link } from 'react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toMilliunits } from '@estoque/contracts';
import { Badge, EmptyState, PageHeading } from '../components/ui';
import {
  Field,
  Loading,
  ErrorPanel,
  MutationStatus,
} from '../components/forms';
import { money, number, useCommand, useData } from '../lib/api';
import type { Actor, Location, Material, Stock } from '../lib/types';

export interface Report {
  transit: {
    id: string;
    document: number;
    origin: string;
    destination: string;
    material: string;
    unit: string;
    pending: string;
  }[];
  totalValue: string;
  materialCount: number;
  lowCount: number;
  pendingCount: number;
  consumption: { id: string; name: string; value: string; documents: number }[];
  stock: (Stock & { value: string; low: boolean })[];
}
export function OverviewPage({
  locationId,
  actor,
}: {
  locationId: string;
  actor: Actor;
}) {
  const query = useData<Report>(
    `/reports${locationId ? `?locationId=${locationId}` : ''}`,
    actor.role !== 'REQUESTER',
  );
  if (actor.role === 'REQUESTER')
    return (
      <section className="panel">
        <h1>Suas solicitações de materiais</h1>
        <p>
          Acompanhe o estoque autorizado e solicite os itens necessários para a
          obra.
        </p>
        <Link className="button form-submit" to="/requisicoes">
          Abrir requisições
        </Link>
      </section>
    );
  if (query.isPending) return <Loading />;
  if (query.error)
    return (
      <ErrorPanel error={query.error} retry={() => void query.refetch()} />
    );
  const report = query.data;
  return (
    <>
      <PageHeading
        eyebrow="VISÃO GERAL"
        title="Cada material, no lugar certo."
        description="Saldos e prioridades atualizados a partir das movimentações confirmadas."
        action={
          <Link className="button" to="/transferencias">
            Ver transferências
          </Link>
        }
      />
      <div className="metrics">
        {[
          ['Valor em estoque', money(report.totalValue)],
          ['Materiais em estoque', report.materialCount],
          ['Abaixo do mínimo', report.lowCount],
          ['Transferências pendentes', report.pendingCount],
        ].map(([label, value]) => (
          <article className="metric" key={label}>
            <div className="metric-label">{label}</div>
            <strong className="metric-value">{value}</strong>
          </article>
        ))}
      </div>
      <section className="panel">
        <div className="section-heading">
          <h2>Reposição de materiais</h2>
          <Link className="text-link" to="/estoque">
            Consultar saldos
          </Link>
        </div>
        {report.stock
          .filter((s) => s.low)
          .map((stock) => (
            <div className="list-row" key={stock.id}>
              <div>
                <strong>{stock.material.name}</strong>
                <small>{stock.location.name}</small>
              </div>
              <Badge tone="warning">
                {number(stock.quantity)} / mínimo {number(stock.minimum)}{' '}
                {stock.material.unit.code}
              </Badge>
            </div>
          ))}
        {!report.lowCount && (
          <EmptyState>
            Nenhum material abaixo do mínimo. Configure os parâmetros de
            reposição em Estoque por obra.
          </EmptyState>
        )}
      </section>
      <section className="panel">
        <h2>Comece pela organização da operação</h2>
        <p className="document-notes">
          Cadastre obras, grupos e unidades. Depois inclua os materiais e
          registre os saldos iniciais ou entradas.
        </p>
        <div className="actions-row">
          <Link className="button secondary" to="/cadastros">
            Cadastros
          </Link>
          <Link className="button secondary" to="/materiais">
            Materiais
          </Link>
          <Link className="button" to="/movimentacoes">
            Entradas e saídas
          </Link>
        </div>
      </section>
    </>
  );
}
function StockSettings({
  stock,
  locations,
  materials,
  onClose,
}: {
  stock?: Stock;
  locations: Location[];
  materials: Material[];
  onClose: () => void;
}) {
  const { register, handleSubmit } = useForm({
    defaultValues: stock
      ? {
          locationId: stock.locationId,
          materialId: stock.materialId,
          minimum: stock.minimum,
          ideal: stock.ideal,
          address: stock.address,
        }
      : {
          locationId: '',
          materialId: '',
          minimum: '0',
          ideal: '0',
          address: '',
        },
  });
  const mutation = useCommand();
  return (
    <section className="panel">
      <h2>Parâmetros de reposição</h2>
      <form
        onSubmit={handleSubmit(async (body) => {
          await mutation
            .mutateAsync({ path: '/stocks/settings', body })
            .then(onClose)
            .catch(() => {});
        })}
      >
        <div className="form-grid columns">
          <Field label="Obra">
            <NativeSelect
              required
              {...register('locationId')}
              disabled={!!stock}
            >
              <NativeSelectOption value="">Selecione</NativeSelectOption>
              {locations.map((l) => (
                <NativeSelectOption value={l.id} key={l.id}>
                  {l.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Material">
            <NativeSelect
              required
              {...register('materialId')}
              disabled={!!stock}
            >
              <NativeSelectOption value="">Selecione</NativeSelectOption>
              {materials.map((m) => (
                <NativeSelectOption value={m.id} key={m.id}>
                  {m.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Estoque mínimo">
            <Input required {...register('minimum')} />
          </Field>
          <Field label="Estoque ideal">
            <Input required {...register('ideal')} />
          </Field>
          <Field label="Localização física">
            <Input {...register('address')} />
          </Field>
        </div>
        <MutationStatus mutation={mutation} />
        <div className="actions-row">
          <Button disabled={mutation.isPending}>Salvar parâmetros</Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </form>
    </section>
  );
}
export function StockOverview({
  actor,
  locationId,
  locations,
  materials,
}: {
  actor: Actor;
  locationId: string;
  locations: Location[];
  materials: Material[];
}) {
  const query = useData<Stock[]>(
    `/stocks${locationId ? `?locationId=${locationId}` : ''}`,
  );
  const [editing, setEditing] = useState<Stock | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const canEdit = ['ADMIN', 'MANAGER'].includes(actor.role);
  if (query.isPending) return <Loading />;
  if (query.error)
    return (
      <ErrorPanel error={query.error} retry={() => void query.refetch()} />
    );
  const rows = query.data.filter((s) =>
    `${s.material.name} ${s.material.code}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="SALDOS"
        title="Estoque por obra"
        description="Saldo disponível, custo médio e parâmetros de reposição de cada local."
        action={
          canEdit && (
            <Button onClick={() => setEditing('new')}>
              Configurar material no local
            </Button>
          )
        }
      />
      {editing && (
        <StockSettings
          key={editing === 'new' ? 'new' : editing.id}
          stock={editing === 'new' ? undefined : editing}
          locations={locations}
          materials={materials}
          onClose={() => setEditing(null)}
        />
      )}
      <section className="panel">
        <Input
          className="search"
          aria-label="Buscar saldo"
          placeholder="Buscar material"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material / obra</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Disponível</TableHead>
                <TableHead>Mínimo / ideal</TableHead>
                <TableHead>Custo médio</TableHead>
                <TableHead>Situação</TableHead>
                {canEdit && <TableHead>Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <strong>{s.material.name}</strong>
                    <small>{s.location.name}</small>
                  </TableCell>
                  <TableCell>{s.address || 'A definir'}</TableCell>
                  <TableCell>
                    {number(s.quantity)} {s.material.unit.code}
                  </TableCell>
                  <TableCell>
                    {number(s.minimum)} / {number(s.ideal)}
                  </TableCell>
                  <TableCell>{money(s.averageCost)}</TableCell>
                  <TableCell>
                    <Badge
                      tone={
                        toMilliunits(s.quantity) < toMilliunits(s.minimum)
                          ? 'warning'
                          : 'success'
                      }
                    >
                      {toMilliunits(s.quantity) < toMilliunits(s.minimum)
                        ? 'Abaixo do mínimo'
                        : 'Regular'}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button
                        variant="link"
                        className="mt-4 px-0"
                        onClick={() => setEditing(s)}
                      >
                        Configurar
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {!rows.length && (
          <EmptyState>
            Nenhum saldo encontrado. Registre uma entrada ou configure o
            material neste local.
          </EmptyState>
        )}
      </section>
    </>
  );
}
