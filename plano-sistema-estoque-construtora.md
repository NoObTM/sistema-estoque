# Plano de desenvolvimento — Sistema de estoque para construtora

## Objetivo e premissas

Desenvolver um sistema online de estoque para uma construtora, com controle por obra, transferências com confirmação de recebimento e histórico completo das movimentações. O Estoque Fácil 10.0 será a referência funcional, adaptada à operação online.

Premissa inicial: uma construtora com várias obras e possibilidade de almoxarifado central, acessada por computador e celular.

## 1. Stack proposta

| Camada | Tecnologias | Finalidade |
|---|---|---|
| Interface | React, Vite e TypeScript | Aplicação web |
| Componentes e estilos | shadcn/ui e Tailwind CSS | Interface consistente e responsiva |
| Navegação | React Router | Rotas e organização das telas |
| Consultas à API | TanStack Query | Carregamento, atualização e cache da interface |
| Formulários | React Hook Form e Zod | Formulários e validação |
| Backend | Node.js, Fastify e TypeScript | API e regras de negócio |
| Banco de dados | PostgreSQL e Prisma ORM | Persistência, relacionamentos e transações |
| Autenticação | Better Auth | Login, sessões e recuperação de senha |
| Processamento assíncrono | Redis e BullMQ | Notificações e relatórios demorados |
| Arquivos | Armazenamento compatível com S3 | Fotos de materiais e comprovantes |
| Infraestrutura | Docker Compose e Nginx | Serviços, proxy reverso e HTTPS |
| Testes | Vitest e Playwright | Regras de estoque e fluxos completos |

O shadcn/ui possui suporte a projetos Vite, e o Better Auth oferece adaptador para Prisma.

- [Documentação do shadcn/ui](https://ui.shadcn.com/docs/installation)
- [Adaptador Prisma do Better Auth](https://better-auth.com/docs/adapters/prisma)

Dispensar bcrypt inicialmente: o Better Auth já utiliza scrypt para senhas. Manter seu mecanismo nativo, sem implementar um segundo fluxo de autenticação.

- [Documentação de senhas](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/authentication/email-password.mdx)

O PostgreSQL será a fonte oficial dos saldos. Redis não será responsável por confirmar movimentações.

## 2. Organização da aplicação

Um repositório com aplicações separadas para interface e API, compartilhando contratos de validação:

```text
apps/
  web/          Interface React
  api/          API e regras de negócio
  worker/       Tarefas em segundo plano

packages/
  database/     Prisma e migrações
  contracts/    Schemas Zod e contratos da API
```

O Nginx disponibilizará a interface e encaminhará /api para o backend no mesmo domínio. As permissões e regras serão verificadas na API, inclusive em acessos diretos.

## 3. Módulos do sistema

| Módulo | Escopo |
|---|---|
| Painel inicial | Indicadores por obra, estoque mínimo e recebimentos pendentes |
| Obras e depósitos | Cadastro, endereço, responsáveis e situação |
| Materiais | Campos já mapeados, foto, unidade, grupo, código de barras e NCM |
| Estoque por local | Saldo, localização física, estoque mínimo e ideal por obra |
| Fornecedores e funcionários | Cadastros utilizados nas movimentações |
| Centros de custo | Identificação de etapas ou setores que consomem materiais |
| Entradas | Recebimento de compras com fornecedor, documento e vários itens |
| Saídas | Consumo com obra, funcionário, centro de custo e vários itens |
| Transferências | Envio, trânsito, recebimento parcial ou total e divergências |
| Requisições | Solicitação e acompanhamento do atendimento de materiais |
| Inventário | Contagem física e ajustes justificados |
| Relatórios | Saldos, movimentações, consumo, valorização e trânsito |
| Administração | Usuários, permissões e auditoria |

Pedidos de compra, kits e empréstimos entram em uma segunda entrega, após estabilizar o controle principal.

## 4. Regras essenciais do estoque

- Material cadastrado uma única vez, com saldo independente em cada obra ou depósito.
- Entrada aumenta o estoque do local informado; saída registra consumo naquele local.
- Transferência movimenta materiais entre locais sem contabilizar compra ou consumo.
- Bloqueio de movimentações superiores ao saldo disponível.
- Quantidades com três casas decimais e cálculos com tipos decimais.
- Movimentações confirmadas não serão apagadas: correções ocorrerão por estorno ou ajuste vinculado, com justificativa.
- Registro de usuário, data e hora em cada operação.
- Proteção contra confirmação duplicada e operações simultâneas sobre o mesmo saldo.

Saldo e histórico serão atualizados na mesma transação de banco, com tratamento de conflitos de concorrência.

- [Documentação de transações do Prisma](https://www.prisma.io/docs/orm/fundamentals/transactions)

### Política de custo proposta — pendente de validação

Custo médio por material e local, mantendo separado o custo de referência do cadastro. A transferência levará o custo registrado na origem. Essa política deverá ser validada antes de desenvolver os cálculos financeiros.

## 5. Fluxo de transferência

A confirmação de recebimento pela obra de destino é um requisito confirmado.

| Etapa | Comportamento |
|---|---|
| Rascunho | Permite editar materiais e quantidades; não altera estoque |
| Enviada | Baixa o disponível da origem e registra as quantidades em trânsito |
| Parcialmente recebida | Credita apenas o que foi recebido; mantém o restante pendente |
| Recebida | Todos os itens foram conferidos e recebidos |
| Cancelada | Permitida diretamente apenas antes do envio |

Depois do envio, devoluções ou perdas terão operações próprias e justificadas.

Exemplo: A envia 20 unidades para B. A perde 20 do disponível, e 20 ficam em trânsito. B recebe 18: seu saldo aumenta em 18, e 2 permanecem pendentes. A pendência só termina com recebimento, devolução efetiva ou registro autorizado de perda.

A conferência será por item, com múltiplos recebimentos possíveis. O sistema não permitirá receber mais que a quantidade pendente.

## 6. Usuários e permissões

| Perfil inicial | Acesso previsto |
|---|---|
| Administrador | Configurações, usuários e todas as obras |
| Gestor | Acompanhamento e autorizações nas obras atribuídas |
| Almoxarife | Entradas, saídas, envios e recebimentos nos locais atribuídos |
| Solicitante | Criação e acompanhamento de requisições |
| Consulta | Visualização de dados e relatórios autorizados |

Permissões serão combinadas com o vínculo à obra. Ter o perfil de almoxarife não dará acesso automático a todos os estoques.

O cadastro de usuários será por convite, sem inscrição pública.

## 7. Identidade visual

| Cor | Aplicação |
|---|---|
| #004D61 | Menu lateral, títulos e botões principais |
| #348498 | Elementos secundários e gráficos |
| #5BD1D7 | Destaques suaves, seleção e indicadores informativos |
| #FF502F | Chamadas de atenção e ações de destaque |

Usar fundos claros e tons neutros nas tabelas para facilitar a leitura. Verificar contraste; sobre o turquesa claro, priorizar texto escuro. Estados também terão texto e ícones.

A navegação terá seletor de obra sempre visível. A visão consolidada ficará disponível conforme a permissão. No celular, a prioridade será consultar materiais, solicitar itens e confirmar recebimentos.

## 8. Etapas de desenvolvimento

| Etapa | Entregas | Critério de conclusão |
|---|---|---|
| 1 — Especificação | Modelo de dados, fluxos, permissões e protótipos das telas principais | Regras e exemplos de operação definidos |
| 2 — Fundação | Projeto, banco, login, permissões, layout e ambientes | Usuários acessam apenas as obras autorizadas |
| 3 — Cadastros | Obras, materiais, grupos, fornecedores, funcionários e centros de custo | Cadastros utilizáveis pela interface |
| 4 — Estoque | Saldo inicial, entradas, saídas, histórico e ajustes | Saldos conciliados com as movimentações |
| 5 — Transferências | Envio, trânsito, conferência parcial e tratamento de pendências | Fluxo entre duas obras validado |
| 6 — Operação | Requisições, painel, alertas e relatórios essenciais | Equipes conseguem executar a rotina diária |
| 7 — Piloto | Implantação, carga inicial, treinamento e correções | Operação validada em locais selecionados |
| 8 — Expansão | Compras, kits, empréstimos e relatórios adicionais | Entregas conforme prioridade operacional |

O primeiro MVP termina na etapa 7, com estoque por obra e transferências completas.

## 9. Testes e implantação

### Testes prioritários

- Dois usuários tentando movimentar o mesmo saldo.
- Reenvio de uma confirmação por clique repetido ou falha de conexão.
- Recebimentos parciais e tentativas de receber além do enviado.
- Acesso a obras não autorizadas.
- Estornos, ajustes e conciliação entre saldo e histórico.
- Conservação das quantidades entre origem, trânsito e destino.

### Ambientes e operação

Ambientes separados de desenvolvimento, homologação e produção, migrações controladas, logs e backups automáticos com teste de restauração.

### Migração do Estoque Fácil

Tratar a migração à parte: primeiro verificar as exportações disponíveis e a qualidade dos cadastros. O início da operação poderá usar materiais importados e saldos iniciais conferidos por obra, sem depender da importação de todo o histórico antigo.

## Primeira entrega concreta

Especificação do banco e protótipo das telas de painel, materiais, estoque por obra e transferência com recebimento. Essa entrega permitirá revisar a operação antes de avançar para a implementação.
