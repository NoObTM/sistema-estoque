import { useState } from 'react';
import { NavLink, Route, Routes } from 'react-router';
import {
  Boxes,
  Building2,
  LayoutDashboard,
  Package,
  Truck,
} from 'lucide-react';
import { initialStock, initialTransfers, locations } from './demo/data';
import { receiveTransfer } from './demo/receive-transfer';
import { Dashboard } from './pages/dashboard';
import { Materials } from './pages/materials';
import { StockPage } from './pages/stock';
import { Transfers } from './pages/transfers';

const navigation = [
  { to: '/', label: 'Painel inicial', icon: LayoutDashboard },
  { to: '/materiais', label: 'Materiais', icon: Package },
  { to: '/estoque', label: 'Estoque por obra', icon: Boxes },
  { to: '/transferencias', label: 'Transferências', icon: Truck },
];

export function App() {
  const [locationId, setLocationId] = useState('all');
  const [state, setState] = useState({
    stock: initialStock,
    transfers: initialTransfers,
  });
  function onReceive(id: string, materialId: string, quantity: string) {
    setState(receiveTransfer(state, id, materialId, quantity));
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/">
          <span className="brand-mark">
            <Building2 size={27} />
          </span>
          <span>
            obra<span className="brand-light">estoque</span>
            <small>CONTROLE QUE CONSTRÓI</small>
          </span>
        </a>
        <p className="nav-caption">ÁREA DE TRABALHO</p>
        <nav aria-label="Navegação principal">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}>
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="avatar">DE</span>
          <div>
            <strong>Demonstração</strong>
            <small>Revisão da operação</small>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            Gestão de materiais <span>/</span> Visão operacional
          </div>
          <label className="location-selector">
            <Building2 size={18} />
            <span className="sr-only">Obra ou depósito</span>
            <select
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
            >
              <option value="all">Todas as obras e depósitos</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
        </header>
        <div className="demo-banner">
          <span>
            <strong>Protótipo interativo</strong> · Dados fictícios. As
            alterações são reiniciadas ao recarregar.
          </span>
          <button
            onClick={() =>
              setState({ stock: initialStock, transfers: initialTransfers })
            }
          >
            Reiniciar demonstração
          </button>
        </div>
        <main>
          <Routes>
            <Route
              path="/"
              element={<Dashboard state={state} locationId={locationId} />}
            />
            <Route path="/materiais" element={<Materials />} />
            <Route
              path="/estoque"
              element={
                <StockPage stock={state.stock} locationId={locationId} />
              }
            />
            <Route
              path="/transferencias"
              element={
                <Transfers
                  transfers={state.transfers}
                  locationId={locationId}
                  onReceive={onReceive}
                />
              }
            />
            <Route
              path="*"
              element={
                <section className="panel">
                  <h1>Página não encontrada</h1>
                  <NavLink to="/">Voltar ao painel</NavLink>
                </section>
              }
            />
          </Routes>
          <footer className="page-footer">
            Obra Estoque{' '}
            <span>Mais clareza no estoque. Mais ritmo na obra.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
