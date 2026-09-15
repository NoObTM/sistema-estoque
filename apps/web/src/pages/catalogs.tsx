import { Button } from '@/components/ui/button';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
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
const catalogLabels: Record<string, string> = {
  GROUP: 'Grupos',
  UNIT: 'Unidades',
  SUPPLIER: 'Fornecedores',
  EMPLOYEE: 'Funcionários',
  COST_CENTER: 'Centros de custo',
};

function Editor({
  path,
  initial,
  fields,
  onClose,
}: {
  path: string;
  initial: Values;
  fields: FormField[];
  onClose: () => void;
}) {
  const { register, handleSubmit, setValue } = useForm<Values>({
    defaultValues: initial,
  });
  const mutation = useCommand();
  const [photoError, setPhotoError] = useState('');
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>{initial.id ? 'Editar cadastro' : 'Novo cadastro'}</h2>
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
                <NativeSelect
                  required={field.required}
                  {...register(field.name)}
                >
                  <NativeSelectOption value="">Selecione</NativeSelectOption>
                  {field.options.map((option) => (
                    <NativeSelectOption value={option.id} key={option.id}>
                      {option.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              ) : field.type === 'checkbox' ? (
                <input type="checkbox" {...register(field.name)} />
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
              {photoError && <span role="alert">{photoError}</span>}
            </Field>
          )}
        </div>
        <MutationStatus mutation={mutation} />
        <Button className="form-submit" disabled={mutation.isPending}>
          Salvar cadastro
        </Button>
      </form>
    </section>
  );
}

export function CatalogsPage({
  actor,
  locations,
  catalogs,
}: {
  actor: Actor;
  locations: Location[];
  catalogs: Catalog[];
}) {
  const [tab, setTab] = useState('LOCATION');
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
      <PageHeading
        eyebrow="ORGANIZAÇÃO"
        title="Cadastros"
        description="Organize as obras, as pessoas e as classificações dos materiais."
      />
      <div className="tabs">
        {[
          ['LOCATION', 'Obras e depósitos'],
          ...Object.entries(catalogLabels),
        ].map(([key, label]) => (
          <Button
            variant="ghost"
            key={key}
            className={tab === key ? 'selected' : ''}
            onClick={() => {
              setTab(key!);
              setEditing(null);
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      {editing && (
        <Editor
          key={`${tab}-${editing.id ?? 'new'}`}
          path={tab === 'LOCATION' ? '/locations' : '/catalogs'}
          initial={editing}
          fields={fields}
          onClose={() => setEditing(null)}
        />
      )}
      <section className="panel">
        <div className="section-heading">
          <Input
            aria-label="Buscar cadastro"
            placeholder="Buscar por código ou nome"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {canEdit && (
            <Button onClick={() => openEditor()}>Novo cadastro</Button>
          )}
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
            Nenhum cadastro encontrado. Comece cadastrando seus locais, grupos e
            unidades.
          </EmptyState>
        )}
      </section>
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
    </>
  );
}
