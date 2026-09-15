import { useState } from 'react';
import { Search } from 'lucide-react';
import { Badge, EmptyState, PageHeading } from '../components/ui';
import { materials } from '../demo/data';

export function Materials() {
  const [search, setSearch] = useState('');
  const filtered = materials.filter((entry) =>
    `${entry.code} ${entry.name} ${entry.group}`
      .toLocaleLowerCase('pt-BR')
      .includes(search.toLocaleLowerCase('pt-BR')),
  );
  return (
    <>
      <PageHeading
        eyebrow="CADASTROS"
        title="Materiais"
        description="Um catálogo único para todas as obras e depósitos."
      />
      <section className="panel">
        <div className="section-heading">
          <h2>Catálogo de materiais</h2>
          <Badge>{materials.length} materiais</Badge>
        </div>
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Buscar material"
            placeholder="Buscar por nome, código ou grupo"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Material</th>
                <th>Grupo</th>
                <th>Unidade</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.id}>
                  <td className="muted">{entry.code}</td>
                  <td>
                    <strong>{entry.name}</strong>
                  </td>
                  <td>{entry.group}</td>
                  <td>{entry.unit}</td>
                  <td>
                    <Badge tone="success">Ativo</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <EmptyState>
            Nenhum material encontrado. Tente outra busca.
          </EmptyState>
        )}
      </section>
    </>
  );
}
