import { useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import {
  fromMilliunits,
  toMilliunits,
  type TransferStatus,
} from '@estoque/contracts';
import {
  Badge,
  EmptyState,
  formatQuantity,
  PageHeading,
} from '../components/ui';
import { locationName, materialById, type Transfer } from '../demo/data';

const statusLabels: Record<TransferStatus, string> = {
  draft: 'Rascunho',
  sent: 'Enviada',
  partial: 'Parcialmente recebida',
  received: 'Recebida',
  cancelled: 'Cancelada',
};

function ReceiptForm({
  transfer,
  onReceive,
}: {
  transfer: Transfer;
  onReceive: (id: string, materialId: string, quantity: string) => void;
}) {
  const [quantity, setQuantity] = useState('');
  const [materialId, setMaterialId] = useState(
    transfer.items[0]?.materialId ?? '',
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      onReceive(transfer.id, materialId, quantity.trim().replace(',', '.'));
      setQuantity('');
      setError('');
      setMessage('Recebimento simulado. O saldo do destino foi atualizado.');
    } catch (cause) {
      setMessage('');
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível receber o item.',
      );
    }
  }
  return (
    <>
      <form className="receipt-form" onSubmit={submit}>
        <label>
          Material
          <select
            value={materialId}
            onChange={(event) => setMaterialId(event.target.value)}
          >
            {transfer.items.map((item) => (
              <option key={item.materialId} value={item.materialId}>
                {materialById(item.materialId).name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Quantidade recebida
          <input
            required
            inputMode="decimal"
            placeholder="Ex.: 2,000"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            disabled={transfer.status === 'received'}
          />
        </label>
        <button className="button" disabled={transfer.status === 'received'}>
          <CheckCircle2 size={17} />
          {transfer.status === 'received'
            ? 'Conferência concluída'
            : 'Confirmar recebimento'}
        </button>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="form-success" role="status">
          {message}
        </p>
      )}
    </>
  );
}

export function Transfers({
  transfers,
  locationId,
  onReceive,
}: {
  transfers: Transfer[];
  locationId: string;
  onReceive: (id: string, materialId: string, quantity: string) => void;
}) {
  const filtered = transfers.filter(
    (entry) =>
      locationId === 'all' ||
      entry.originId === locationId ||
      entry.destinationId === locationId,
  );
  return (
    <>
      <PageHeading
        eyebrow="MOVIMENTAÇÕES"
        title="Transferências"
        description="Acompanhe o trânsito de materiais e confira cada recebimento."
      />
      <div className="info-note">
        Recebimentos parciais mantêm o restante em trânsito. Neste protótipo,
        você simula a conferência como responsável pelo destino.
      </div>
      {filtered.map((transfer) => (
        <section className="panel transfer" key={transfer.id}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                {transfer.id} · {transfer.date.split('-').reverse().join('/')}
              </p>
              <h2 className="transfer-route">
                {locationName(transfer.originId)} <ArrowRight size={18} />{' '}
                {locationName(transfer.destinationId)}
              </h2>
            </div>
            <Badge
              tone={transfer.status === 'received' ? 'success' : 'warning'}
            >
              {statusLabels[transfer.status]}
            </Badge>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Enviado</th>
                  <th>Recebido</th>
                  <th>Pendente</th>
                </tr>
              </thead>
              <tbody>
                {transfer.items.map((item) => (
                  <tr key={item.materialId}>
                    <td>
                      <strong>{materialById(item.materialId).name}</strong>
                    </td>
                    <td>
                      {formatQuantity(item.sent)}{' '}
                      {materialById(item.materialId).unit}
                    </td>
                    <td>
                      {formatQuantity(item.received)}{' '}
                      {materialById(item.materialId).unit}
                    </td>
                    <td>
                      <strong>
                        {formatQuantity(
                          fromMilliunits(
                            toMilliunits(item.sent) -
                              toMilliunits(item.received),
                          ),
                        )}{' '}
                        {materialById(item.materialId).unit}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ReceiptForm transfer={transfer} onReceive={onReceive} />
        </section>
      ))}
      {!filtered.length && (
        <EmptyState>Nenhuma transferência para este local.</EmptyState>
      )}
    </>
  );
}
