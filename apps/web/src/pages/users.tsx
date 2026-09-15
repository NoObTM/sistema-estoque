import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { useState } from 'react';
import { roles } from '@estoque/contracts/schemas';
import { PageHeading, Badge } from '../components/ui';
import {
  Field,
  Loading,
  ErrorPanel,
  MutationStatus,
} from '../components/forms';
import { dateTime, roleLabels, useCommand, useData } from '../lib/api';
import type { Location, User } from '../lib/types';
export function UsersPage({ locations }: { locations: Location[] }) {
  const users = useData<User[]>('/users');
  const audit = useData<
    {
      id: string;
      actorId: string;
      action: string;
      entityId: string;
      createdAt: string;
    }[]
  >('/audit');
  const [editing, setEditing] = useState<User | 'new' | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [active, setActive] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [invitation, setInvitation] = useState('');
  const mutation = useCommand<{ url?: string }>();
  if (users.isPending) return <Loading />;
  if (users.error)
    return (
      <ErrorPanel error={users.error} retry={() => void users.refetch()} />
    );
  function edit(user: User | 'new') {
    setEditing(user);
    setInvitation('');
    setName(user === 'new' ? '' : user.name);
    setEmail(user === 'new' ? '' : user.email);
    setRole(user === 'new' ? 'VIEWER' : user.role);
    setActive(user === 'new' ? true : user.active);
    setSelected(
      user === 'new' ? [] : user.memberships.map((m) => m.locationId),
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRAÇÃO"
        title="Usuários e auditoria"
        description="Convide a equipe e controle o acesso às obras."
        action={<Button onClick={() => edit('new')}>Convidar usuário</Button>}
      />
      {editing && (
        <section className="panel">
          <h2>{editing === 'new' ? 'Novo convite' : `Acesso de ${name}`}</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const result = await mutation
                .mutateAsync({
                  path:
                    editing === 'new' ? '/invitations' : `/users/${editing.id}`,
                  method: editing === 'new' ? 'POST' : 'PUT',
                  body:
                    editing === 'new'
                      ? { name, email, role, locationIds: selected }
                      : { role, active, locationIds: selected },
                })
                .catch(() => null);
              if (result?.url) setInvitation(result.url);
              else if (result) setEditing(null);
            }}
          >
            <div className="form-grid columns">
              {editing === 'new' && (
                <>
                  <Field label="Nome">
                    <Input
                      required
                      minLength={2}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Field>
                  <Field label="E-mail">
                    <Input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Field>
                </>
              )}
              <Field label="Perfil">
                <NativeSelect
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {roles.map((r) => (
                    <NativeSelectOption value={r} key={r}>
                      {roleLabels[r]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              {editing !== 'new' && (
                <Field label="Acesso ativo">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                  />
                </Field>
              )}
            </div>
            <fieldset className="location-checks">
              <legend>Obras autorizadas</legend>
              {locations.map((l) => (
                <label key={l.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(l.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, l.id]
                          : selected.filter((id) => id !== l.id),
                      )
                    }
                  />
                  {l.name}
                </label>
              ))}
            </fieldset>
            <MutationStatus mutation={mutation} />
            {invitation && (
              <div className="info-note">
                <p>
                  Convite criado, válido por 48 horas. Compartilhe este link com
                  o destinatário:
                </p>
                <Input
                  aria-label="Link do convite"
                  readOnly
                  value={invitation}
                />
              </div>
            )}
            <div className="actions-row">
              <Button disabled={mutation.isPending}>
                {editing === 'new' ? 'Gerar convite' : 'Salvar acesso'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
              >
                Fechar
              </Button>
            </div>
          </form>
        </section>
      )}
      <section className="panel">
        <div className="table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Obras</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.data.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <strong>{user.name}</strong>
                    <small>{user.email}</small>
                  </TableCell>
                  <TableCell>{roleLabels[user.role]}</TableCell>
                  <TableCell>
                    {user.role === 'ADMIN'
                      ? 'Todas'
                      : user.memberships
                          .map(
                            (m) =>
                              locations.find((l) => l.id === m.locationId)
                                ?.name,
                          )
                          .join(', ')}
                  </TableCell>
                  <TableCell>
                    <Badge>{user.active ? 'Ativo' : 'Inativo'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      className="mt-4 px-0"
                      onClick={() => edit(user)}
                    >
                      Editar acesso
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
      <section className="panel">
        <h2>Últimas 200 operações auditadas</h2>
        <div className="table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.data?.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{dateTime(entry.createdAt)}</TableCell>
                  <TableCell>
                    {users.data.find((u) => u.id === entry.actorId)?.name ??
                      entry.actorId}
                  </TableCell>
                  <TableCell>{entry.action}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </>
  );
}
