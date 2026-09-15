import { InfoMessage } from '@/components/forms';
import { Card } from '@/components/ui/card';
import { SelectInput } from '@/components/select-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FieldSet, FieldLegend } from '@/components/ui/field';
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
        action={
          <Button variant="highlight" onClick={() => edit('new')}>
            Convidar usuário
          </Button>
        }
      />
      {editing && (
        <Card asChild className="block gap-0">
          <section className="panel">
            <h2>{editing === 'new' ? 'Novo convite' : `Acesso de ${name}`}</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const result = await mutation
                  .mutateAsync({
                    path:
                      editing === 'new'
                        ? '/invitations'
                        : `/users/${editing.id}`,
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
                  <SelectInput
                    required
                    value={role}
                    onValueChange={setRole}
                    options={roles.map((r) => ({
                      value: r,
                      label: <>{roleLabels[r]}</>,
                    }))}
                  />
                </Field>
                {editing !== 'new' && (
                  <Field label="Acesso ativo">
                    <Checkbox
                      checked={active}
                      onCheckedChange={(checked) => setActive(checked === true)}
                    />
                  </Field>
                )}
              </div>
              <FieldSet className="location-checks flex-row">
                <FieldLegend>Obras autorizadas</FieldLegend>
                {locations.map((l) => (
                  <Label key={l.id}>
                    <Checkbox
                      checked={selected.includes(l.id)}
                      onCheckedChange={(checked) =>
                        setSelected(
                          checked === true
                            ? [...selected, l.id]
                            : selected.filter((id) => id !== l.id),
                        )
                      }
                    />
                    {l.name}
                  </Label>
                ))}
              </FieldSet>
              <MutationStatus mutation={mutation} />
              {invitation && (
                <InfoMessage>
                  <p>
                    Convite criado, válido por 48 horas. Compartilhe este link
                    com o destinatário:
                  </p>
                  <Input
                    aria-label="Link do convite"
                    readOnly
                    value={invitation}
                  />
                </InfoMessage>
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
        </Card>
      )}
      <Card asChild className="block gap-0">
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
      </Card>
      <Card asChild className="block gap-0">
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
      </Card>
    </>
  );
}
