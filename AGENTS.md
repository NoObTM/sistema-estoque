# Convenções do projeto

## Escopo e arquitetura

- Mantenha frontend em `apps/web` e backend em `apps/api`, com dependências, configuração e scripts próprios por aplicação. A comunicação será por HTTP; não importe código interno de uma aplicação na outra. Contratos comuns ficam em `packages/contracts`.
- Leia o plano e `docs/architecture.md` antes de alterar regras de negócio.
- Organize a interface por funcionalidades; componentes compartilhados não devem conhecer dados de demonstração.
- A API validará autorização por local, entrada e regras em cada operação. A interface não é uma barreira de segurança.
- Mantenha funções pequenas, nomes explícitos e dependências direcionadas: interface → aplicação → domínio. Isole infraestrutura em adaptadores.
- Prefira composição e soluções simples. Não adicione abstrações sem uma necessidade concreta.
- Não implemente módulos futuros apenas para preencher diretórios.

## Integridade

- Quantidades trafegam como strings decimais, com até três casas. Nunca use ponto flutuante para cálculos de estoque ou custo.
- Movimentações confirmadas são imutáveis. Corrija com operações vinculadas e justificadas.
- Banco PostgreSQL é a fonte de verdade. Saldo, histórico e idempotência devem compartilhar uma transação.
- Não confunda simulações do protótipo com garantias de concorrência, autenticação ou persistência.
- Não registre segredos, documentos reais ou dados pessoais nos fixtures e logs.

## Validação

- Execute `npm run lint`, `npm test`, `npm run build` e `npm run format:check` antes de concluir alterações.
- Teste comportamentos de negócio, limites, autorização e concorrência; evite testes que apenas reproduzem a implementação.
- Atualize a documentação quando mudar decisões, comandos ou o escopo entregue.
- Novas dependências devem ter finalidade clara. Use o lockfile e não envie arquivos `.env`.
