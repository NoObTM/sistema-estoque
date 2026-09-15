import { toMilliunits } from '@estoque/contracts';
import {
  Badge,
  EmptyState,
  formatQuantity,
  PageHeading,
} from '../components/ui';
import { locationName, materialById, type Stock } from '../demo/data';

export function StockPage({
  stock,
  locationId,
}: {
  stock: Stock[];
  locationId: string;
}) {
  const filtered = stock.filter(
    (entry) => locationId === 'all' || entry.locationId === locationId,
  );
  return (
    <>
      <PageHeading
        eyebrow="CONTROLE DE MATERIAIS"
        title="Estoque por obra"
        description="Consulte o saldo disponível e a localização física de cada material."
      />
      <section className="panel">
        <div className="section-heading">
          <h2>Saldos disponíveis</h2>
          <Badge>{filtered.length} posições de estoque</Badge>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Material / local</th>
                <th>Localização</th>
                <th>Disponível</th>
                <th>Mínimo</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const material = materialById(entry.materialId);
                const low =
                  toMilliunits(entry.quantity) < toMilliunits(entry.minimum);
                return (
                  <tr key={`${entry.locationId}-${entry.materialId}`}>
                    <td>
                      <strong>{material.name}</strong>
                      <small>{locationName(entry.locationId)}</small>
                    </td>
                    <td>{entry.address}</td>
                    <td>
                      <strong>
                        {formatQuantity(entry.quantity)} {material.unit}
                      </strong>
                    </td>
                    <td>
                      {formatQuantity(entry.minimum)} {material.unit}
                    </td>
                    <td>
                      <Badge tone={low ? 'warning' : 'success'}>
                        {low ? 'Abaixo do mínimo' : 'Regular'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <EmptyState>Nenhum saldo cadastrado neste local.</EmptyState>
        )}
      </section>
    </>
  );
}
