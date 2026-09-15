import {
  ArrowRight,
  Boxes,
  Building2,
  TriangleAlert,
  Truck,
} from 'lucide-react';
import { Link } from 'react-router';
import { toMilliunits } from '@estoque/contracts';
import { Badge, EmptyState, PageHeading } from '../components/ui';
import { locationName, locations, materialById } from '../demo/data';
import type { DemoState } from '../demo/receive-transfer';

export function Dashboard({
  state,
  locationId,
}: {
  state: DemoState;
  locationId: string;
}) {
  const stock = state.stock.filter(
    (entry) => locationId === 'all' || entry.locationId === locationId,
  );
  const alerts = stock.filter(
    (entry) => toMilliunits(entry.quantity) < toMilliunits(entry.minimum),
  );
  const pending = state.transfers.filter(
    (entry) =>
      ['sent', 'partial'].includes(entry.status) &&
      (locationId === 'all' || entry.destinationId === locationId),
  );
  const metrics = [
    {
      label: 'Materiais em estoque',
      value: new Set(stock.map((entry) => entry.materialId)).size,
      hint: 'Materiais únicos neste recorte',
      icon: Boxes,
    },
    {
      label: 'Locais acompanhados',
      value: locationId === 'all' ? locations.length : 1,
      hint: 'Obras e almoxarifados',
      icon: Building2,
    },
    {
      label: 'Abaixo do mínimo',
      value: alerts.length,
      hint: 'Itens que precisam de atenção',
      icon: TriangleAlert,
    },
    {
      label: 'Recebimentos pendentes',
      value: pending.length,
      hint: 'Transferências a conferir',
      icon: Truck,
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="VISÃO GERAL"
        title="Cada material, no lugar certo."
        description="Acompanhe os estoques e mantenha suas obras em movimento."
        action={
          <Link className="button" to="/transferencias">
            Conferir recebimentos <ArrowRight size={17} />
          </Link>
        }
      />
      <div className="metrics">
        {metrics.map(({ label, value, hint, icon: Icon }) => (
          <article className="metric" key={label}>
            <div className="metric-label">
              {label}
              <Icon size={20} />
            </div>
            <strong>{String(value).padStart(2, '0')}</strong>
            <small>{hint}</small>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">PLANEJE A REPOSIÇÃO</p>
              <h2>Atenção ao estoque</h2>
            </div>
            <Badge tone="warning">{alerts.length} alertas</Badge>
          </div>
          {alerts.length ? (
            alerts.map((entry) => (
              <div
                className="list-row"
                key={`${entry.locationId}-${entry.materialId}`}
              >
                <span className="material-icon">
                  <Boxes size={20} />
                </span>
                <div>
                  <strong>{materialById(entry.materialId).name}</strong>
                  <small>{locationName(entry.locationId)}</small>
                </div>
                <Badge tone="warning">Abaixo do mínimo</Badge>
              </div>
            ))
          ) : (
            <EmptyState>
              Nenhum material abaixo do mínimo neste local.
            </EmptyState>
          )}
          <Link className="text-link" to="/estoque">
            Consultar estoque por obra <ArrowRight size={16} />
          </Link>
        </section>
        <section className="panel accent-panel">
          <Truck size={30} />
          <p className="eyebrow">ENTRE O ENVIO E A CHEGADA</p>
          <h2>Receber também é controlar.</h2>
          <p>
            Confira os materiais na chegada. O saldo da obra só aumenta com a
            confirmação do recebimento.
          </p>
          <Link className="button light" to="/transferencias">
            Ver transferências <ArrowRight size={17} />
          </Link>
        </section>
      </div>
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">SUA OPERAÇÃO</p>
            <h2>Obras e depósitos</h2>
          </div>
          <span className="muted">
            {locationId === 'all' ? 'Visão consolidada' : 'Local selecionado'}
          </span>
        </div>
        <div className="locations">
          {locations
            .filter((entry) => locationId === 'all' || entry.id === locationId)
            .map((location) => (
              <article className="location-card" key={location.id}>
                <Building2 size={22} />
                <Badge tone="success">Ativo</Badge>
                <h3>{location.name}</h3>
                <p>{location.detail}</p>
              </article>
            ))}
        </div>
      </section>
    </>
  );
}
