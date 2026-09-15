# Obra Estoque

Sistema de estoque por obra para construtoras, iniciado a partir do [plano de desenvolvimento](plano-sistema-estoque-construtora.md).

## Estado atual

Primeira entrega para revisão: especificação do modelo de dados e protótipo React com painel, catálogo de materiais, saldos por obra e conferência de transferências. Busca, filtro de local e recebimento parcial funcionam com dados fictícios em memória. Recarregar a página reinicia a demonstração.

**Não é um sistema pronto para operação:** ainda não há API, PostgreSQL, login, controle de acesso real, histórico persistente, envio de transferências ou cadastros editáveis. A etapa 2 do plano permanece pendente. O catálogo é global; o seletor filtra painel, saldos e transferências.

## Executar

Use Node.js 24 LTS e npm 11.

```sh
npm ci
npm run dev
```

Acesse o endereço local exibido pelo Vite (normalmente `http://localhost:5173`).

```sh
npm run lint
npm test
npm run build
npm run format:check
npm run test:e2e
```

Os testes de navegador usam Microsoft Edge localmente e Chromium no GitHub Actions. As capturas de desktop e celular ficam em `artifacts/`, fora do Git.

## Estrutura

```text
apps/web/src/
  components/     Elementos visuais compartilhados
  demo/           Dados fictícios e operações em memória
  pages/          Telas organizadas por funcionalidade
packages/contracts/src/  Quantidades e validações compartilhadas
docs/             Arquitetura, banco, permissões e roteiro de revisão
```

`apps/api`, `apps/worker` e `packages/database` serão criados quando suas implementações começarem. TanStack Query, React Hook Form, shadcn/ui e Better Auth entram conforme as telas reais e a API forem implementadas. A base atual usa React, Vite, TypeScript, React Router, Tailwind CSS, Zod e Vitest.

## Revisar a primeira entrega

1. Abra Transferências. TR-001 já tem 18 de 20 sacos recebidos.
2. Tente receber 3: o protótipo bloqueia a quantidade excedente.
3. Receba 1: a transferência continua parcial e o saldo de Aurora passa de 18 para 19.
4. Receba mais 1: a transferência fica recebida e Aurora passa a 20.
5. Consulte Estoque por obra: o central continua com 180; sua baixa já ocorreu no cenário de envio.
6. Use “Reiniciar demonstração” para voltar ao cenário inicial.

Veja [arquitetura e regras de banco](docs/architecture.md), [permissões e fluxos](docs/flows-and-permissions.md) e [próximas entregas](docs/roadmap.md). As convenções de clean code estão em [AGENTS.md](AGENTS.md).

## GitHub

Repositório: [NoObTM/sistema-estoque](https://github.com/NoObTM/sistema-estoque).

A integração contínua executa lint, testes, build e verificação de formatação em pushes e pull requests. Nunca envie `.env`, credenciais ou dados operacionais reais.

## Referências técnicas

Base consultada: [Vite](https://vite.dev/guide/) e [React Router](https://reactrouter.com/start/declarative/installation). As demais integrações seguem o plano e serão verificadas na implementação de cada etapa.
