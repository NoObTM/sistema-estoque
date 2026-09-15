import { useState } from 'react';
import { NavLink, Route, Routes } from 'react-router';
import {
  Boxes,
  Building2,
  LayoutDashboard,
  Package,
  Truck,
  ArrowLeftRight,
  ClipboardList,
  Users,
  BarChart3,
  LogOut,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { api, roleLabels, useData } from './lib/api';
import type { Actor, Catalog, Location, Material } from './lib/types';
import { AuthPage } from './pages/auth';
import { CatalogsPage, MaterialsPage } from './pages/catalogs';
import { OperationsPage } from './pages/operations';
import { OverviewPage, StockOverview } from './pages/overview';
import { ReportsPage } from './pages/reports';
import { UsersPage } from './pages/users';
import { Loading, ErrorPanel } from './components/forms';

export function App() {
  const client = useQueryClient();
  const setup = useData<{ required: boolean }>('/setup');
  const me = useData<Actor>('/me', setup.data?.required === false);
  if (setup.isPending) return <Loading />;
  if (setup.error)
    return (
      <ErrorPanel error={setup.error} retry={() => void setup.refetch()} />
    );
  if (!setup.data.required && me.isPending) return <Loading />;
  if (
    setup.data.required ||
    me.error ||
    ['/convite', '/redefinir-senha'].includes(window.location.pathname)
  )
    return (
      <AuthPage
        setup={setup.data.required}
        onSuccess={async () => {
          await client.resetQueries();
        }}
      />
    );
  return <Workspace actor={me.data!} />;
}
function Workspace({ actor }: { actor: Actor }) {
  const [locationId, setLocationId] = useState('');
  const locations = useData<Location[]>('/locations');
  const catalogs = useData<Catalog[]>('/catalogs');
  const materials = useData<Material[]>('/materials');
  const destinations = useData<Location[]>(
    '/destinations',
    ['ADMIN', 'MANAGER', 'KEEPER'].includes(actor.role),
  );
  const client = useQueryClient();
  if (locations.isPending || catalogs.isPending || materials.isPending)
    return <Loading />;
  const error = locations.error || catalogs.error || materials.error;
  if (error)
    return (
      <ErrorPanel
        error={error}
        retry={() => {
          void client.invalidateQueries();
        }}
      />
    );
  const base = {
    actor,
    locationId,
    locations: locations.data!,
    catalogs: catalogs.data!,
    materials: materials.data!,
    destinations: destinations.data ?? [],
  };
  const links = [
    { to: '/', label: 'Painel inicial', icon: LayoutDashboard },
    { to: '/materiais', label: 'Materiais', icon: Package },
    { to: '/estoque', label: 'Estoque por obra', icon: Boxes },
    ...(actor.role !== 'REQUESTER'
      ? [
          {
            to: '/movimentacoes',
            label: 'Entradas e saídas',
            icon: ArrowLeftRight,
          },
          { to: '/transferencias', label: 'Transferências', icon: Truck },
          { to: '/inventario', label: 'Inventários', icon: ClipboardList },
        ]
      : []),
    { to: '/requisicoes', label: 'Requisições', icon: ClipboardList },
    ...(actor.role !== 'REQUESTER'
      ? [{ to: '/relatorios', label: 'Relatórios', icon: BarChart3 }]
      : []),
    { to: '/cadastros', label: 'Cadastros', icon: Building2 },
    ...(actor.role === 'ADMIN'
      ? [{ to: '/usuarios', label: 'Usuários e auditoria', icon: Users }]
      : []),
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink className="brand" to="/">
          <span className="brand-mark">
            <Building2 size={27} />
          </span>
          <span>
            obra<span className="brand-light">estoque</span>
            <small>CONTROLE QUE CONSTRÓI</small>
          </span>
        </NavLink>
        <p className="nav-caption">ÁREA DE TRABALHO</p>
        <nav aria-label="Navegação principal">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="avatar">{actor.name.slice(0, 2).toUpperCase()}</span>
          <div>
            <strong>{actor.name}</strong>
            <small>{roleLabels[actor.role]}</small>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">Gestão de materiais</div>
          <label className="location-selector">
            <Building2 size={18} />
            <span className="sr-only">Obra ou depósito</span>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              <option value="">Todos os locais autorizados</option>
              {locations.data!.map((l) => (
                <option value={l.id} key={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button secondary"
            onClick={async () => {
              await api('/auth/sign-out', { method: 'POST', body: {} });
              client.clear();
              window.location.assign('/');
            }}
          >
            <LogOut size={16} />
            Sair
          </button>
        </header>
        <main>
          <Routes>
            <Route
              path="/"
              element={<OverviewPage actor={actor} locationId={locationId} />}
            />
            <Route path="/materiais" element={<MaterialsPage {...base} />} />
            <Route path="/estoque" element={<StockOverview {...base} />} />
            <Route path="/cadastros" element={<CatalogsPage {...base} />} />
            <Route
              path="/movimentacoes"
              element={
                <OperationsPage
                  {...base}
                  kinds={['ENTRY', 'EXIT', 'INITIAL']}
                  title="Entradas e saídas"
                />
              }
            />
            <Route
              path="/transferencias"
              element={
                <OperationsPage
                  {...base}
                  kinds={['TRANSFER']}
                  title="Transferências"
                />
              }
            />
            <Route
              path="/requisicoes"
              element={
                <OperationsPage
                  {...base}
                  kinds={['REQUEST']}
                  title="Requisições"
                />
              }
            />
            <Route
              path="/inventario"
              element={
                <OperationsPage
                  {...base}
                  kinds={['INVENTORY']}
                  title="Inventários e ajustes"
                />
              }
            />
            <Route
              path="/relatorios"
              element={<ReportsPage locationId={locationId} />}
            />
            <Route
              path="/usuarios"
              element={
                actor.role === 'ADMIN' ? (
                  <UsersPage locations={locations.data!} />
                ) : (
                  <p>Acesso não autorizado.</p>
                )
              }
            />
            <Route
              path="*"
              element={
                <p>
                  Página não encontrada.{' '}
                  <NavLink to="/">Voltar ao painel</NavLink>
                </p>
              }
            />
          </Routes>
          <footer className="page-footer">
            Obra Estoque<span>Saldos e movimentações da sua operação.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
