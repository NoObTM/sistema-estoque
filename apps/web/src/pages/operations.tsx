import { FieldError } from '@/components/ui/field';
import { Card } from '@/components/ui/card';
import { FormSelect } from '@/components/form-select';
import { SelectInput } from '@/components/select-input';
import { Button } from '@/components/ui/button';
import { FormDatePicker } from '@/components/form-date-picker';
import { Disclosure } from '@/components/disclosure';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
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
    <Card asChild className="block gap-0">
      <section className="panel">
        <div className="section-heading">
          <h2>{initial ? `Editar #${initial.number}` : 'Novo documento'}</h2>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
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
              <FormSelect
                required
                control={control}
                name={'kind'}
                disabled={!!initial}
                options={props.kinds.map((k) => ({
                  value: k,
                  label: <>{kindLabels[k]}</>,
                }))}
              />
            </Field>
            <Field label="Obra / origem">
              <FormSelect
                required
                control={control}
                name={'locationId'}
                disabled={!!initial}
                emptyLabel="Selecione"
                options={props.locations
                  .filter((l) => l.active)
                  .map((l) => ({ value: l.id, label: <>{l.name}</> }))}
              />
            </Field>
            {kind === 'TRANSFER' && (
              <Field label="Destino">
                <FormSelect
                  required
                  control={control}
                  name={'destinationId'}
                  emptyLabel="Selecione"
                  options={props.destinations
                    .filter((l) => l.id !== locationId)
                    .map((l) => ({ value: l.id, label: <>{l.name}</> }))}
                />
              </Field>
            )}
            {kind === 'ENTRY' && (
              <Field label="Fornecedor">
                <FormSelect
                  required
                  control={control}
                  name={'supplierId'}
                  emptyLabel="Selecione"
                  options={applicable('SUPPLIER').map((c) => ({
                    value: c.id,
                    label: <>{c.name}</>,
                  }))}
                />
              </Field>
            )}
            {['EXIT', 'REQUEST'].includes(kind) && (
              <>
                <Field label="Funcionário">
                  <FormSelect
                    required
                    control={control}
                    name={'employeeId'}
                    emptyLabel="Selecione"
                    options={applicable('EMPLOYEE').map((c) => ({
                      value: c.id,
                      label: <>{c.name}</>,
                    }))}
                  />
                </Field>
                <Field label="Centro de custo">
                  <FormSelect
                    required
                    control={control}
                    name={'costCenterId'}
                    emptyLabel="Selecione"
                    options={applicable('COST_CENTER').map((c) => ({
                      value: c.id,
                      label: <>{c.name}</>,
                    }))}
                  />
                </Field>
              </>
            )}
            <Field label="Documento / referência">
              <Input {...register('reference')} />
            </Field>
            {kind === 'REQUEST' && (
              <Field label="Necessário em">
                <FormDatePicker control={control} name="neededAt" />
              </Field>
            )}
            <Field label="Observações / justificativa">
              <Textarea {...register('notes')} />
            </Field>
          </div>
          <h3 className="form-section-title">
            {kind === 'INVENTORY'
              ? 'Quantidades contadas'
              : 'Itens do documento'}
          </h3>
          <p className="muted">
            Use ponto para quantidades decimais, por exemplo 2.500. Salvar
            rascunho não movimenta estoque.
          </p>
          {fields.map((field, index) => (
            <div className="item-editor" key={field.id}>
              <Field label="Material">
                <FormSelect
                  required
                  control={control}
                  name={`items.${index}.materialId`}
                  emptyLabel="Selecione"
                  options={props.materials
                    .filter((m) => m.active)
                    .map((m) => ({
                      value: m.id,
                      label: (
                        <>
                          {m.name} ({m.unit.code})
                        </>
                      ),
                    }))}
                />
              </Field>
              <Field label={kind === 'INVENTORY' ? 'Contado' : 'Quantidade'}>
                <Input
                  required
                  inputMode="decimal"
                  {...register(`items.${index}.quantity`)}
                />
              </Field>
              {['ENTRY', 'INITIAL'].includes(kind) && (
                <Field label="Custo unitário (R$)">
                  <Input
                    required
                    inputMode="decimal"
                    {...register(`items.${index}.unitCost`)}
                  />
                </Field>
              )}
              <Button
                type="button"
                variant="outline"
                disabled={fields.length === 1}
                onClick={() => remove(index)}
              >
                Remover item
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="link"
            className="mt-4 px-0"
            onClick={() =>
              append({ materialId: '', quantity: '1', unitCost: '0' })
            }
          >
            + Adicionar material
          </Button>
          {Object.keys(errors).length > 0 && (
            <FieldError>
              Revise os campos obrigatórios, a justificativa e as quantidades.
              Materiais não podem se repetir.
            </FieldError>
          )}
          <MutationStatus mutation={mutation} />
          <Button className="form-submit" disabled={mutation.isPending}>
            Salvar rascunho
          </Button>
        </form>
      </section>
    </Card>
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
          <Button variant="outline" onClick={onEdit}>
            Editar
          </Button>
          <Button
            disabled={mutation.isPending}
            onClick={() => setAction('confirm')}
          >
            Confirmar {doc.kind === 'TRANSFER' ? 'envio' : 'documento'}
          </Button>
          <Button variant="outline" onClick={() => setAction('cancel')}>
            Cancelar rascunho
          </Button>
        </div>
      )}
      {doc.kind === 'TRANSFER' && ['SENT', 'PARTIAL'].includes(doc.status) && (
        <div className="actions-row">
          {operator && hasAccess(doc.destinationId) && (
            <Button onClick={() => setAction('RECEIVE')}>
              Conferir recebimento
            </Button>
          )}
          {manager && hasAccess(doc.locationId) && (
            <>
              <Button variant="outline" onClick={() => setAction('RETURN')}>
                Registrar devolução
              </Button>
              <Button variant="outline" onClick={() => setAction('LOSS')}>
                Registrar perda
              </Button>
            </>
          )}
        </div>
      )}
      {doc.kind === 'REQUEST' &&
        ['PENDING', 'PARTIAL'].includes(doc.status) &&
        operator &&
        hasAccess(doc.locationId) && (
          <Button onClick={() => setAction('FULFILL')}>
            Atender requisição
          </Button>
        )}
      {manager &&
        hasAccess(doc.locationId) &&
        doc.status === 'CONFIRMED' &&
        ['ENTRY', 'EXIT', 'INITIAL', 'INVENTORY'].includes(doc.kind) &&
        !doc.corrections?.some((c) => c.kind === 'REVERSAL') && (
          <Button
            variant="link"
            className="mt-4 px-0"
            onClick={() => setAction('reverse')}
          >
            Estornar movimentação
          </Button>
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
                  <Input
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
              <Textarea
                required
                minLength={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          )}
          <div className="actions-row">
            <Button disabled={mutation.isPending}>
              {mutation.isPending ? 'Gravando…' : 'Concluir operação'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAction('')}
            >
              Voltar
            </Button>
          </div>
        </form>
      )}
      <MutationStatus mutation={mutation} />
      {action && !['confirm', 'cancel', 'reverse'].includes(action) && (
        <Field label="Comprovante (PNG, JPEG, WebP ou PDF, até 1 MB)">
          <Input
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
      {fileError && <FieldError>{fileError}</FieldError>}
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
            <Button variant="highlight" onClick={() => setEditing('new')}>
              Novo documento
            </Button>
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
          <SelectInput
            value={filter}
            onValueChange={setFilter}
            emptyLabel="Todas"
            options={Object.entries(statusLabels).map(([key, label]) => ({
              value: key,
              label: <>{label}</>,
            }))}
          />
        </Field>
        <span className="muted">{entries.length} documentos carregados</span>
      </div>
      {!entries.length && (
        <Card asChild className="block gap-0">
          <section className="panel">
            <EmptyState>
              Nenhum documento encontrado. Cadastre os materiais e locais para
              começar.
            </EmptyState>
          </section>
        </Card>
      )}
      {documents.hasNextPage && (
        <Button
          variant="outline"
          disabled={documents.isFetchingNextPage}
          onClick={() => void documents.fetchNextPage()}
        >
          Carregar mais documentos
        </Button>
      )}
      {entries.map((doc) => (
        <Card asChild className="block gap-0">
          <section className="panel" key={doc.id}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  {kindLabels[doc.kind]} #{doc.number} ·{' '}
                  {dateTime(doc.createdAt)}
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Quantidade</TableHead>
                    {['TRANSFER', 'REQUEST'].includes(doc.kind) && (
                      <>
                        <TableHead>Recebido / atendido</TableHead>
                        <TableHead>Devolvido / perdido</TableHead>
                        <TableHead>Pendente</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doc.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.material.name}</TableCell>
                      <TableCell>
                        {number(item.quantity)} {item.material.unit.code}
                      </TableCell>
                      {['TRANSFER', 'REQUEST'].includes(doc.kind) && (
                        <>
                          <TableCell>{number(item.completed)}</TableCell>
                          <TableCell>
                            {number(item.returned)} / {number(item.lost)}
                          </TableCell>
                          <TableCell>{number(pendingQuantity(item))}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {doc.corrections?.some((c) => c.kind === 'REVERSAL') && (
              <FieldError>
                Movimentação estornada por documento vinculado.
              </FieldError>
            )}
            <DocumentActions
              doc={doc}
              actor={props.actor}
              onEdit={() => setEditing(doc)}
            />
            {doc.attachments.length > 0 && (
              <Disclosure title={`Comprovantes (${doc.attachments.length})`}>
                {doc.attachments.map((file) => (
                  <a
                    key={file.id}
                    className="text-link"
                    href={`/api/attachments/${file.id}`}
                  >
                    {file.name}
                  </a>
                ))}
              </Disclosure>
            )}
            {doc.events.length > 0 && (
              <Disclosure
                title={`Histórico de conferências (${doc.events.length})`}
              >
                {doc.events.map((event) => (
                  <p key={event.id}>
                    <strong>{dateTime(event.createdAt)}</strong> · {event.kind}{' '}
                    · {event.notes}
                  </p>
                ))}
              </Disclosure>
            )}
          </section>
        </Card>
      ))}
    </>
  );
}
