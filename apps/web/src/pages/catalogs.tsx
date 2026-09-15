import { Card } from '@/components/ui/card';
import { FormSelect } from '@/components/form-select';
import { Button } from '@/components/ui/button';
import { FormCheckbox } from '@/components/form-checkbox';
import { FieldError } from '@/components/ui/field';
import { Link, useSearchParams } from 'react-router';
import { ArrowLeft, ArrowRight, Package } from 'lucide-react';
import { catalogCategories, type CatalogCategory } from './catalog-categories';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Badge, EmptyState, PageHeading } from '../components/ui';
import { Field, MutationStatus } from '../components/forms';
import { useCommand } from '../lib/api';
import type { Actor, Catalog, Location, Material } from '../lib/types';

type Values = Record<string, string | boolean | null>;
type Option = { id: string; name: string };
interface FormField {
  name: string;
  label: string;
  options?: Option[];
  type?: string;
  required?: boolean;
}

function Editor({
  path,
  initial,
  fields,
  onClose,
  title,
}: {
  path: string;
  initial: Values;
  fields: FormField[];
  onClose: () => void;
  title?: string;
}) {
  const { register, handleSubmit, setValue, control } = useForm<Values>({
    defaultValues: initial,
  });
  const mutation = useCommand();
  const [photoError, setPhotoError] = useState('');
  return (
    <Card asChild className="block gap-0">
      <section className="panel">
        <div className="section-heading">
          <h2>{title ?? (initial.id ? 'Editar cadastro' : 'Novo cadastro')}</h2>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
        <form
          onSubmit={handleSubmit(async (values) => {
            const body = { ...values };
            delete body.id;
            if ('locationId' in body) body.locationId = body.locationId || null;
            if ('barcode' in body) body.barcode = body.barcode || null;
            await mutation
              .mutateAsync({
                path: `${path}${initial.id ? `/${initial.id}` : ''}`,
                method: initial.id ? 'PUT' : 'POST',
                body,
              })
              .then(onClose)
              .catch(() => {});
          })}
        >
          <div className="form-grid columns">
            {fields.map((field) => (
              <Field key={field.name} label={field.label}>
                {field.options ? (
                  <FormSelect
                    required={field.required}
                    control={control}
                    name={field.name}
                    emptyLabel="Selecione"
                    options={field.options.map((option) => ({
                      value: option.id,
                      label: <>{option.name}</>,
                    }))}
                  />
                ) : field.type === 'checkbox' ? (
                  <FormCheckbox control={control} name={field.name} />
                ) : field.type === 'textarea' ? (
                  <Textarea {...register(field.name)} />
                ) : (
                  <Input
                    required={field.required}
                    type={field.type ?? 'text'}
                    {...register(field.name)}
                  />
                )}
              </Field>
            ))}
            {'photo' in initial && (
              <Field label="Foto do material (até 1 MB)">
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (file.size > 1_000_000) {
                      setPhotoError('Escolha uma imagem de até 1 MB.');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      setValue('photo', String(reader.result));
                      setPhotoError('');
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setValue('photo', null)}
                >
                  Remover foto
                </Button>
                {photoError && <FieldError>{photoError}</FieldError>}
              </Field>
            )}
          </div>
          <MutationStatus mutation={mutation} />
          <Button className="form-submit" disabled={mutation.isPending}>
            Salvar cadastro
          </Button>
        </form>
      </section>
    </Card>
  );
}

interface CatalogsProps {
  actor: Actor;
  locations: Location[];
  catalogs: Catalog[];
}

export function CatalogsPage(props: CatalogsProps) {
  const [params] = useSearchParams();
  const selected = catalogCategories.find(
    (category) => category.id === params.get('tipo'),
  );
  if (selected)
    return <CatalogList key={selected.id} {...props} category={selected} />;
  return (
    <>
      <PageHeading
        eyebrow="ORGANIZAÇÃO"
        title="O que você deseja cadastrar?"
        description="Escolha uma categoria para consultar, incluir ou atualizar os registros."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {catalogCategories.map((category) => {
          const Icon = category.icon;
          const count =
            category.id === 'LOCATION'
              ? props.locations.length
              : props.catalogs.filter((entry) => entry.kind === category.id)
                  .length;
          return (
            <Card key={category.id} className="gap-4 border-border p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-xl bg-accent/30 p-3 text-primary">
                  <Icon aria-hidden="true" size={24} />
                </span>
                <Badge>{count} registros</Badge>
              </div>
              <h2>{category.title}</h2>
              <p className="text-sm text-muted-foreground">
                {category.description}
              </p>
              <p className="text-xs text-muted-foreground">
                {category.example}
              </p>
              <Button
                asChild
                variant="outline"
                className="mt-auto w-full justify-between"
              >
                <Link
                  to={`?tipo=${category.id}`}
                  aria-label={`Abrir ${category.title}`}
                >
                  Acessar <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </Card>
          );
        })}
      </div>
      <Card className="mt-5 flex-col items-start gap-4 border-border bg-muted p-5 sm:flex-row sm:items-center">
        <Package aria-hidden="true" className="text-primary" />
        <div className="min-w-0 flex-1">
          <h2>Cadastro de materiais</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Para cadastrar cimento, ferramentas e outros itens, acesse
            Materiais. Tenha um grupo e uma unidade de medida cadastrados.
          </p>
        </div>
        <Button asChild variant="highlight" className="w-full sm:w-auto">
          <Link to="/materiais">
            Ir para materiais <ArrowRight />
          </Link>
        </Button>
      </Card>
    </>
  );
}

function CatalogList({
  actor,
  locations,
  catalogs,
  category,
}: CatalogsProps & { category: CatalogCategory }) {
  const tab = category.id;
  const [editing, setEditing] = useState<Values | null>(null);
  const [search, setSearch] = useState('');
  const canEdit = actor.role === 'ADMIN';
  const entries = (
    tab === 'LOCATION' ? locations : catalogs.filter((c) => c.kind === tab)
  ).filter((c) =>
    `${c.code} ${c.name}`.toLowerCase().includes(search.toLowerCase()),
  );
  const fields: FormField[] = [
    { name: 'code', label: 'Código', required: true },
    { name: 'name', label: 'Nome', required: true },
    ...(tab === 'LOCATION'
      ? [
          {
            name: 'kind',
            label: 'Tipo',
            required: true,
            options: [
              { id: 'SITE', name: 'Obra' },
              { id: 'WAREHOUSE', name: 'Depósito' },
            ],
          },
          { name: 'address', label: 'Endereço' },
          { name: 'responsible', label: 'Responsável' },
        ]
      : [
          {
            name: 'details',
            label: 'Dados complementares / documento / contato',
            type: 'textarea',
          },
          ...(['COST_CENTER', 'EMPLOYEE'].includes(tab)
            ? [
                {
                  name: 'locationId',
                  label: 'Obra vinculada',
                  required: tab === 'COST_CENTER',
                  options: locations,
                },
              ]
            : []),
        ]),
    { name: 'active', label: 'Cadastro ativo', type: 'checkbox' },
  ];
  function openEditor(entry?: Location | Catalog) {
    setEditing(
      entry
        ? {
            ...Object.fromEntries(
              Object.entries(entry).filter(
                ([, value]) =>
                  typeof value === 'string' ||
                  typeof value === 'boolean' ||
                  value === null,
              ),
            ),
          }
        : {
            code: '',
            name: '',
            kind: tab === 'LOCATION' ? 'SITE' : tab,
            active: true,
            ...(tab === 'LOCATION'
              ? { address: '', responsible: '' }
              : { details: '', locationId: null }),
          },
    );
  }
  return (
    <>
      <Button asChild variant="link" className="mb-4 px-0">
        <Link to="/cadastros">
          <ArrowLeft /> Todas as categorias
        </Link>
      </Button>
      <PageHeading
        eyebrow="ORGANIZAÇÃO"
        title={category.title}
        description={category.description}
        action={
          canEdit &&
          !editing && (
            <Button variant="highlight" onClick={() => openEditor()}>
              {category.createLabel}
            </Button>
          )
        }
      />
      {editing && (
        <Editor
          key={`${tab}-${editing.id ?? 'new'}`}
          path={tab === 'LOCATION' ? '/locations' : '/catalogs'}
          initial={editing}
          fields={fields}
          title={editing.id ? category.editLabel : category.createLabel}
          onClose={() => setEditing(null)}
        />
      )}
      <Card asChild className="block gap-0">
        <section className="panel">
          <div className="section-heading">
            <Input
              aria-label="Buscar cadastro"
              placeholder="Buscar por código ou nome"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.code}</TableCell>
                    <TableCell>{entry.name}</TableCell>
                    <TableCell>
                      <Badge tone={entry.active ? 'success' : 'neutral'}>
                        {entry.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canEdit && (
                        <Button
                          variant="link"
                          className="mt-4 px-0"
                          onClick={() => openEditor(entry)}
                        >
                          Editar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!entries.length && (
            <EmptyState>
              {search
                ? 'Nenhum resultado para esta busca.'
                : `Ainda não há registros em ${category.title.toLowerCase()}.`}
            </EmptyState>
          )}
        </section>
      </Card>
    </>
  );
}

export function MaterialsPage({
  actor,
  materials,
  catalogs,
}: {
  actor: Actor;
  materials: Material[];
  catalogs: Catalog[];
}) {
  const [editing, setEditing] = useState<Values | null>(null);
  const [search, setSearch] = useState('');
  const fields: FormField[] = [
    { name: 'code', label: 'Código', required: true },
    { name: 'name', label: 'Nome do material', required: true },
    {
      name: 'groupId',
      label: 'Grupo',
      required: true,
      options: catalogs.filter((c) => c.kind === 'GROUP' && c.active),
    },
    {
      name: 'unitId',
      label: 'Unidade',
      required: true,
      options: catalogs.filter((c) => c.kind === 'UNIT' && c.active),
    },
    { name: 'barcode', label: 'Código de barras' },
    { name: 'ncm', label: 'NCM' },
    { name: 'reference', label: 'Referência do fabricante' },
    { name: 'weight', label: 'Peso em kg (use ponto decimal)' },
    {
      name: 'referenceCost',
      label: 'Custo de referência em R$ (use ponto decimal)',
    },
    { name: 'notes', label: 'Observações', type: 'textarea' },
    { name: 'active', label: 'Ativo', type: 'checkbox' },
  ];
  const entries = materials.filter((m) =>
    `${m.code} ${m.name} ${m.barcode ?? ''} ${m.group.name}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="CATÁLOGO"
        title="Materiais"
        description="Cadastro único, com saldos independentes em cada obra."
        action={
          actor.role === 'ADMIN' && (
            <Button
              variant="highlight"
              onClick={() =>
                setEditing({
                  code: '',
                  name: '',
                  groupId: '',
                  unitId: '',
                  barcode: null,
                  ncm: '',
                  reference: '',
                  weight: '0',
                  referenceCost: '0',
                  photo: null,
                  notes: '',
                  active: true,
                })
              }
            >
              Novo material
            </Button>
          )
        }
      />
      {editing && (
        <Editor
          key={String(editing.id ?? 'new')}
          path="/materials"
          initial={editing}
          fields={fields}
          onClose={() => setEditing(null)}
        />
      )}
      <Card asChild className="block gap-0">
        <section className="panel">
          <Input
            className="search"
            aria-label="Buscar material"
            placeholder="Nome, código, grupo ou código de barras"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell>
                      <div className="material-cell">
                        {material.photo && <img src={material.photo} alt="" />}
                        <div>
                          <strong>{material.name}</strong>
                          <small>{material.code}</small>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{material.group.name}</TableCell>
                    <TableCell>{material.unit.code}</TableCell>
                    <TableCell>
                      <Badge>{material.active ? 'Ativo' : 'Inativo'}</Badge>
                    </TableCell>
                    <TableCell>
                      {actor.role === 'ADMIN' && (
                        <Button
                          variant="link"
                          className="mt-4 px-0"
                          onClick={() => {
                            const { group, unit, ...values } = material;
                            void group;
                            void unit;
                            setEditing(values);
                          }}
                        >
                          Editar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!entries.length && (
            <EmptyState>
              Nenhum material encontrado. Cadastre grupos e unidades antes do
              primeiro material.
            </EmptyState>
          )}
        </section>
      </Card>
    </>
  );
}
