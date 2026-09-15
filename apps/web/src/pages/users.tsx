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
          <button className="button" onClick={() => edit('new')}>
            Convidar usuário
          </button>
        }
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
                    <input
                      required
                      minLength={2}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Field>
                  <Field label="E-mail">
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Field>
                </>
              )}
              <Field label="Perfil">
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  {roles.map((r) => (
                    <option value={r} key={r}>
                      {roleLabels[r]}
                    </option>
                  ))}
                </select>
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
                <input
                  aria-label="Link do convite"
                  readOnly
                  value={invitation}
                />
              </div>
            )}
            <div className="actions-row">
              <button className="button" disabled={mutation.isPending}>
                {editing === 'new' ? 'Gerar convite' : 'Salvar acesso'}
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditing(null)}
              >
                Fechar
              </button>
            </div>
          </form>
        </section>
      )}
      <section className="panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Perfil</th>
                <th>Obras</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.data.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                    <small>{user.email}</small>
                  </td>
                  <td>{roleLabels[user.role]}</td>
                  <td>
                    {user.role === 'ADMIN'
                      ? 'Todas'
                      : user.memberships
                          .map(
                            (m) =>
                              locations.find((l) => l.id === m.locationId)
                                ?.name,
                          )
                          .join(', ')}
                  </td>
                  <td>
                    <Badge>{user.active ? 'Ativo' : 'Inativo'}</Badge>
                  </td>
                  <td>
                    <button className="text-link" onClick={() => edit(user)}>
                      Editar acesso
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h2>Últimas 200 operações auditadas</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Responsável</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {audit.data?.map((entry) => (
                <tr key={entry.id}>
                  <td>{dateTime(entry.createdAt)}</td>
                  <td>
                    {users.data.find((u) => u.id === entry.actorId)?.name ??
                      entry.actorId}
                  </td>
                  <td>{entry.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
