import { useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { documentSchema, type DocumentInput } from '@estoque/contracts/schemas';
import { fromMilliunits, toMilliunits } from '@estoque/contracts';
import { Badge, EmptyState, PageHeading } from '../components/ui';
import {
  Field,
  MutationStatus,
  Loading,
  ErrorPanel,
} from '../components/forms';
import {
  dateTime,
  kindLabels,
  number,
  statusLabels,
  useCommand,
  usePagedData,
} from '../lib/api';
import type {
  Actor,
  Catalog,
  Document,
  Location,
  Material,
} from '../lib/types';

const pendingQuantity = (item: Document['items'][number]) =>
  fromMilliunits(
    toMilliunits(item.quantity) -
      toMilliunits(item.completed) -
      toMilliunits(item.returned) -
      toMilliunits(item.lost),
  );
interface Props {
  actor: Actor;
  locationId: string;
  locations: Location[];
  destinations: Location[];
  materials: Material[];
  catalogs: Catalog[];
  kinds: DocumentInput['kind'][];
  title: string;
}

function DocumentEditor({
  initial,
  props,
  onClose,
}: {
  initial?: Document;
  props: Props;
  onClose: () => void;
}) {
  const mutation = useCommand();
  const defaults: DocumentInput = initial
    ? {
        ...initial,
        kind: initial.kind as DocumentInput['kind'],
        items: initial.items.map((i) => ({
          materialId: i.materialId,
          quantity: i.quantity,
          unitCost: i.unitCost,
        })),
      }
    : {
        kind: props.kinds[0]!,
        locationId:
          props.locationId || props.locations.find((l) => l.active)?.id || '',
        destinationId: null,
        supplierId: null,
        employeeId: null,
        costCenterId: null,
        reference: '',
        notes: '',
        neededAt: null,
        items: [{ materialId: '', quantity: '1', unitCost: '0' }],
      };
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(documentSchema),
    defaultValues: defaults,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const kind = useWatch({ control, name: 'kind' });
  const locationId = useWatch({ control, name: 'locationId' });
  const applicable = (type: string) =>
    props.catalogs.filter(
      (c) =>
        c.kind === type &&
        c.active &&
        (!c.locationId || c.locationId === locationId),
    );
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>{initial ? `Editar #${initial.number}` : 'Novo documento'}</h2>
        <button className="button secondary" onClick={onClose}>
          Fechar
        </button>
      </div>
      <form
        onSubmit={handleSubmit(async (body) => {
          await mutation
            .mutateAsync({
              path: `/documents${initial ? `/${initial.id}` : ''}`,
              method: initial ? 'PUT' : 'POST',
              body,
            })
            .then(onClose)
            .catch(() => {});
        })}
      >
        <div className="form-grid columns">
          <Field label="Tipo">
            <select {...register('kind')} disabled={!!initial}>
              {props.kinds.map((k) => (
                <option value={k} key={k}>
                  {kindLabels[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Obra / origem">
            <select required {...register('locationId')} disabled={!!initial}>
              <option value="">Selecione</option>
              {props.locations
                .filter((l) => l.active)
                .map((l) => (
                  <option value={l.id} key={l.id}>
                    {l.name}
                  </option>
                ))}
            </select>
          </Field>
          {kind === 'TRANSFER' && (
            <Field label="Destino">
              <select required {...register('destinationId')}>
                <option value="">Selecione</option>
                {props.destinations
                  .filter((l) => l.id !== locationId)
                  .map((l) => (
                    <option value={l.id} key={l.id}>
                      {l.name}
                    </option>
                  ))}
              </select>
            </Field>
          )}
          {kind === 'ENTRY' && (
            <Field label="Fornecedor">
              <select required {...register('supplierId')}>
                <option value="">Selecione</option>
                {applicable('SUPPLIER').map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {['EXIT', 'REQUEST'].includes(kind) && (
            <>
              <Field label="Funcionário">
                <select required {...register('employeeId')}>
                  <option value="">Selecione</option>
                  {applicable('EMPLOYEE').map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Centro de custo">
                <select required {...register('costCenterId')}>
                  <option value="">Selecione</option>
                  {applicable('COST_CENTER').map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
          <Field label="Documento / referência">
            <input {...register('reference')} />
          </Field>
          {kind === 'REQUEST' && (
            <Field label="Necessário em">
              <input
                type="date"
                {...register('neededAt', {
                  setValueAs: (value) => value || null,
                })}
              />
            </Field>
          )}
          <Field label="Observações / justificativa">
            <textarea {...register('notes')} />
          </Field>
        </div>
        <h3 className="form-section-title">
          {kind === 'INVENTORY' ? 'Quantidades contadas' : 'Itens do documento'}
        </h3>
        <p className="muted">
          Use ponto para quantidades decimais, por exemplo 2.500. Salvar
          rascunho não movimenta estoque.
        </p>
        {fields.map((field, index) => (
          <div className="item-editor" key={field.id}>
            <Field label="Material">
              <select required {...register(`items.${index}.materialId`)}>
                <option value="">Selecione</option>
                {props.materials
                  .filter((m) => m.active)
                  .map((m) => (
                    <option value={m.id} key={m.id}>
                      {m.name} ({m.unit.code})
                    </option>
                  ))}
              </select>
            </Field>
            <Field label={kind === 'INVENTORY' ? 'Contado' : 'Quantidade'}>
              <input
                required
                inputMode="decimal"
                {...register(`items.${index}.quantity`)}
              />
            </Field>
            {['ENTRY', 'INITIAL'].includes(kind) && (
              <Field label="Custo unitário (R$)">
                <input
                  required
                  inputMode="decimal"
                  {...register(`items.${index}.unitCost`)}
                />
              </Field>
            )}
            <button
              type="button"
              className="button secondary"
              disabled={fields.length === 1}
              onClick={() => remove(index)}
            >
              Remover item
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-link"
          onClick={() =>
            append({ materialId: '', quantity: '1', unitCost: '0' })
          }
        >
          + Adicionar material
        </button>
        {Object.keys(errors).length > 0 && (
          <p role="alert" className="form-error">
            Revise os campos obrigatórios, a justificativa e as quantidades.
            Materiais não podem se repetir.
          </p>
        )}
        <MutationStatus mutation={mutation} />
        <button className="button form-submit" disabled={mutation.isPending}>
          Salvar rascunho
        </button>
      </form>
    </section>
  );
}

function DocumentActions({
  doc,
  actor,
  onEdit,
}: {
  doc: Document;
  actor: Actor;
  onEdit: () => void;
}) {
  const mutation = useCommand();
  const [action, setAction] = useState('');
  const [notes, setNotes] = useState('');
  const [attachment, setAttachment] = useState<{
    name: string;
    content: string;
  }>();
  const [fileError, setFileError] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const hasAccess = (id: string | null) =>
    !!id && (actor.role === 'ADMIN' || actor.locationIds.includes(id));
  const operator = ['ADMIN', 'MANAGER', 'KEEPER'].includes(actor.role);
  const manager = ['ADMIN', 'MANAGER'].includes(actor.role);
  const draftAccess =
    hasAccess(doc.locationId) &&
    (operator || (doc.kind === 'REQUEST' && doc.createdBy === actor.id));
  async function command(path: string, body: unknown = {}) {
    await mutation
      .mutateAsync({ path: `/documents/${doc.id}/${path}`, body })
      .then(() => {
        setAction('');
        setQuantities({});
        setNotes('');
        setAttachment(undefined);
      })
      .catch(() => {});
  }
  return (
    <div className="document-actions">
      {doc.status === 'DRAFT' && draftAccess && (
        <div className="actions-row">
          <button className="button secondary" onClick={onEdit}>
            Editar
          </button>
          <button
            className="button"
            disabled={mutation.isPending}
            onClick={() => setAction('confirm')}
          >
            Confirmar {doc.kind === 'TRANSFER' ? 'envio' : 'documento'}
          </button>
          <button
            className="button secondary"
            onClick={() => setAction('cancel')}
          >
            Cancelar rascunho
          </button>
        </div>
      )}
      {doc.kind === 'TRANSFER' && ['SENT', 'PARTIAL'].includes(doc.status) && (
        <div className="actions-row">
          {operator && hasAccess(doc.destinationId) && (
            <button className="button" onClick={() => setAction('RECEIVE')}>
              Conferir recebimento
            </button>
          )}
          {manager && hasAccess(doc.locationId) && (
            <>
              <button
                className="button secondary"
                onClick={() => setAction('RETURN')}
              >
                Registrar devolução
              </button>
              <button
                className="button secondary"
                onClick={() => setAction('LOSS')}
              >
                Registrar perda
              </button>
            </>
          )}
        </div>
      )}
      {doc.kind === 'REQUEST' &&
        ['PENDING', 'PARTIAL'].includes(doc.status) &&
        operator &&
        hasAccess(doc.locationId) && (
          <button className="button" onClick={() => setAction('FULFILL')}>
            Atender requisição
          </button>
        )}
      {manager &&
        hasAccess(doc.locationId) &&
        doc.status === 'CONFIRMED' &&
        ['ENTRY', 'EXIT', 'INITIAL', 'INVENTORY'].includes(doc.kind) &&
        !doc.corrections?.some((c) => c.kind === 'REVERSAL') && (
          <button className="text-link" onClick={() => setAction('reverse')}>
            Estornar movimentação
          </button>
        )}
      {action && (
        <form
          className="action-confirm"
          onSubmit={async (event) => {
            event.preventDefault();
            if (['confirm', 'cancel'].includes(action)) await command(action);
            else if (action === 'reverse') await command(action, { notes });
            else
              await command('resolve', {
                action,
                notes,
                attachment,
                items: Object.entries(quantities)
                  .filter(([, value]) => value.trim() && value !== '0')
                  .map(([materialId, quantity]) => ({
                    materialId,
                    quantity: quantity.replace(',', '.'),
                  })),
              });
          }}
        >
          <h3>
            {
              (
                {
                  confirm: 'Confirme os dados antes de concluir',
                  cancel: 'Cancelar este rascunho?',
                  reverse: 'Estorno com justificativa',
                  RECEIVE: 'Informe somente o que chegou',
                  RETURN: 'Informe o que retornou fisicamente à origem',
                  LOSS: 'Registrar perda autorizada',
                  FULFILL: 'Informe os materiais entregues ao funcionário',
                } as Record<string, string>
              )[action]
            }
          </h3>
          {['RECEIVE', 'RETURN', 'LOSS', 'FULFILL'].includes(action) &&
            doc.items
              .filter((i) => toMilliunits(pendingQuantity(i)) > 0n)
              .map((item) => (
                <Field
                  key={item.id}
                  label={`${item.material.name} · Pendente: ${number(pendingQuantity(item))} ${item.material.unit.code}`}
                >
                  <input
                    aria-label={`Quantidade ${item.material.name}`}
                    inputMode="decimal"
                    value={quantities[item.materialId] ?? ''}
                    onChange={(e) =>
                      setQuantities({
                        ...quantities,
                        [item.materialId]: e.target.value,
                      })
                    }
                  />
                </Field>
              ))}
          {!['confirm', 'cancel'].includes(action) && (
            <Field label="Justificativa / conferência">
              <textarea
                required
                minLength={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          )}
          <div className="actions-row">
            <button className="button" disabled={mutation.isPending}>
              {mutation.isPending ? 'Gravando…' : 'Concluir operação'}
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => setAction('')}
            >
              Voltar
            </button>
          </div>
        </form>
      )}
      <MutationStatus mutation={mutation} />
      {action && !['confirm', 'cancel', 'reverse'].includes(action) && (
        <Field label="Comprovante (PNG, JPEG, WebP ou PDF, até 1 MB)">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                setAttachment(undefined);
                return;
              }
              if (file.size > 1_000_000) {
                setFileError('O comprovante deve ter até 1 MB.');
                setAttachment(undefined);
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                setAttachment({
                  name: file.name,
                  content: String(reader.result),
                });
                setFileError('');
              };
              reader.readAsDataURL(file);
            }}
          />
        </Field>
      )}
      {fileError && (
        <p role="alert" className="form-error">
          {fileError}
        </p>
      )}
    </div>
  );
}

export function OperationsPage(props: Props) {
  const [editing, setEditing] = useState<Document | 'new' | null>(null);
  const [filter, setFilter] = useState('');
  const documents = usePagedData<Document>(
    `/documents?kind=${props.kinds.join(',')}&status=${filter}${props.locationId ? `&locationId=${props.locationId}` : ''}`,
    200,
  );
  if (documents.isPending) return <Loading />;
  if (documents.error)
    return (
      <ErrorPanel
        error={documents.error}
        retry={() => void documents.refetch()}
      />
    );
  const entries = (documents.data ?? []).filter(
    (doc) =>
      props.kinds.includes(doc.kind as DocumentInput['kind']) &&
      (!filter || doc.status === filter),
  );
  const canCreate =
    props.actor.role !== 'VIEWER' &&
    (props.actor.role !== 'REQUESTER' || props.kinds.includes('REQUEST')) &&
    (!props.kinds.includes('INVENTORY') ||
      ['ADMIN', 'MANAGER'].includes(props.actor.role));
  return (
    <>
      <PageHeading
        eyebrow="OPERAÇÃO"
        title={props.title}
        description="Documentos persistentes com confirmação, responsáveis e histórico."
        action={
          canCreate && (
            <button className="button" onClick={() => setEditing('new')}>
              Novo documento
            </button>
          )
        }
      />
      {editing && (
        <DocumentEditor
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? undefined : editing}
          props={props}
          onClose={() => setEditing(null)}
        />
      )}
      <div className="filters">
        <Field label="Situação">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Todas</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <span className="muted">{entries.length} documentos carregados</span>
      </div>
      {!entries.length && (
        <section className="panel">
          <EmptyState>
            Nenhum documento encontrado. Cadastre os materiais e locais para
            começar.
          </EmptyState>
        </section>
      )}
      {documents.hasNextPage && (
        <button
          className="button secondary"
          disabled={documents.isFetchingNextPage}
          onClick={() => void documents.fetchNextPage()}
        >
          Carregar mais documentos
        </button>
      )}
      {entries.map((doc) => (
        <section className="panel" key={doc.id}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                {kindLabels[doc.kind]} #{doc.number} · {dateTime(doc.createdAt)}
              </p>
              <h2>
                {doc.location.name}
                {doc.destination && ` → ${doc.destination.name}`}
              </h2>
            </div>
            <Badge
              tone={
                ['DRAFT', 'SENT', 'PARTIAL', 'PENDING'].includes(doc.status)
                  ? 'warning'
                  : 'success'
              }
            >
              {statusLabels[doc.status]}
            </Badge>
          </div>
          {doc.notes && <p className="document-notes">{doc.notes}</p>}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Quantidade</th>
                  {['TRANSFER', 'REQUEST'].includes(doc.kind) && (
                    <>
                      <th>Recebido / atendido</th>
                      <th>Devolvido / perdido</th>
                      <th>Pendente</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {doc.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.material.name}</td>
                    <td>
                      {number(item.quantity)} {item.material.unit.code}
                    </td>
                    {['TRANSFER', 'REQUEST'].includes(doc.kind) && (
                      <>
                        <td>{number(item.completed)}</td>
                        <td>
                          {number(item.returned)} / {number(item.lost)}
                        </td>
                        <td>{number(pendingQuantity(item))}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {doc.corrections?.some((c) => c.kind === 'REVERSAL') && (
            <p className="form-error">
              Movimentação estornada por documento vinculado.
            </p>
          )}
          <DocumentActions
            doc={doc}
            actor={props.actor}
            onEdit={() => setEditing(doc)}
          />
          {doc.events.length > 0 && (
            <details className="history">
              <summary>Comprovantes ({doc.attachments.length})</summary>
              {doc.attachments.map((file) => (
                <a
                  key={file.id}
                  className="text-link"
                  href={`/api/attachments/${file.id}`}
                >
                  {file.name}
                </a>
              ))}
            </details>
          )}
          {doc.events.length > 0 && (
            <details className="history">
              <summary>Histórico de conferências ({doc.events.length})</summary>
              {doc.events.map((event) => (
                <p key={event.id}>
                  <strong>{dateTime(event.createdAt)}</strong> · {event.kind} ·{' '}
                  {event.notes}
                </p>
              ))}
            </details>
          )}
        </section>
      ))}
    </>
  );
}
