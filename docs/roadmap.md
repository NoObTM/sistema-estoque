# Entregas e decisões

## Etapa 1 — preparada para revisão

- [x] Ler plano e preservar documentos originais.
- [x] Especificar entidades, invariantes, transações e índices.
- [x] Propor matriz de permissões e fluxos.
- [x] Implementar protótipo de painel, materiais, estoque e recebimento parcial.
- [x] Definir convenções de manutenção, validação e integração contínua.
- [ ] Revisão operacional e aprovação da especificação pelo responsável.

## Próxima implementação — etapa 2

1. Criar API Fastify, Prisma/PostgreSQL e Docker Compose de desenvolvimento.
2. Gerar migração revisada a partir da especificação, incluindo restrições SQL.
3. Integrar Better Auth: convite, sessão, recuperação e inscrição pública desativada.
4. Implementar permissões no backend e testar usuários de obras distintas.
5. Substituir fixtures por consultas reais com TanStack Query, estados de carregamento/erro e formulários com React Hook Form/Zod.
6. Consolidar componentes acessíveis com shadcn/ui e testes de navegação.

Critério: usuários reais acessam somente as obras autorizadas. Não marcar etapa 2 concluída por ter apenas layout ou scaffolding.

## Decisões a validar antes do módulo correspondente

- Custo médio por material/local, precisão monetária e comportamento de estornos.
- Autorizações exatas de gestores e visibilidade das requisições.
- Encerramento de transferências com devolução ou perda.
- Provedor de hospedagem, envio de convites/email e armazenamento de arquivos.
- Exportações disponíveis do Estoque Fácil e estratégia de carga inicial.

Etapas 3 a 7 seguem o plano original. Não incluir compras, kits ou empréstimos antes de estabilizar o MVP.
