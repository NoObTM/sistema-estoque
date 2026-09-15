# Arquitetura e especificação inicial do banco

Status: proposta para revisão operacional. Este documento não é uma migração executável.

## Limites

Monorepositório npm com interface e API separadas. A primeira entrega executa apenas o protótipo. Na etapa 2, Fastify recebe comandos validados por Zod e chama casos de uso; estes dependem de contratos de repositório, implementados com Prisma/PostgreSQL. Redis/BullMQ e S3 só entram quando houver necessidade de tarefas e anexos.

O frontend não importa Prisma. Contratos compartilhados não dependem de React ou Fastify. Regras pertencem ao domínio; componentes apresentam resultados. Adaptadores cuidam de transporte e persistência. O módulo de demonstração é substituível e não serve como backend.

## Modelo relacional proposto

IDs UUID, instantes `timestamptz` em UTC, apresentação no fuso da operação. Quantidades `numeric(15,3)`; limites equivalentes no contrato. Cadastro único de materiais para uma construtora. Multiempresa está fora do escopo inicial.

| Entidade          | Campos principais e restrições                                                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local             | id, código único, nome, tipo OBRA/DEPOSITO, endereço, ativo                                                                                                                        |
| Usuário e sessão  | Modelos oficiais gerados pelo Better Auth na etapa 2; cadastro por convite                                                                                                         |
| Vínculo de acesso | usuário, local, perfil; unicidade usuário/local; administrador global explícito                                                                                                    |
| Convite           | email, perfil, locais, token com hash, validade, aceitoEm, convidadoPor; uso único                                                                                                 |
| GrupoMaterial     | id, nome único, ativo                                                                                                                                                              |
| Unidade           | id, sigla única, descrição                                                                                                                                                         |
| Material          | id, código único, nome, grupoId, unidadeId, códigoBarras opcional único, NCM opcional, fotoKey, ativo                                                                              |
| Fornecedor        | id, nome, documento opcional único, contato, ativo                                                                                                                                 |
| Funcionário       | id, nome, matrícula opcional única, ativo; vínculo a locais separado                                                                                                               |
| CentroCusto       | id, localId, código, descrição, ativo; código único no local                                                                                                                       |
| EstoqueLocal      | id, localId, materialId, disponível, mínimo, ideal opcional, localização, versão; único local/material; quantidades não negativas                                                  |
| Movimentação      | id, tipo, localId, estado, fornecedorId/funcionárioId/centroCustoId conforme tipo, documento, justificativa, originalId opcional, criadoPor, confirmadoPor, criadoEm, confirmadoEm |
| ItemMovimentação  | id, movimentaçãoId, materialId, quantidade positiva; único movimentação/material                                                                                                   |
| LançamentoEstoque | id, operaçãoId, localId, materialId, delta assinado não zero, saldoApós, autorId, ocorridoEm; imutável                                                                             |
| Transferência     | id, código único, origemId, destinoId, estado, criadoPor, enviadoPor, criadoEm, enviadoEm; origem diferente do destino                                                             |
| ItemTransferência | id, transferênciaId, materialId, enviada, recebida, devolvida, perdida; único transferência/material; parcelas não negativas e soma das baixas de trânsito ≤ enviada               |
| Recebimento       | id, transferênciaId, recebidoPor, recebidoEm, observação; vários por transferência                                                                                                 |
| ItemRecebimento   | recebimentoId, itemTransferênciaId, quantidade positiva; único por recebimento/item                                                                                                |
| ResoluçãoTrânsito | id, itemTransferênciaId, tipo DEVOLUCAO/PERDA, quantidade positiva, justificativa, autorizadoPor, confirmadoPor, ocorridoEm                                                        |
| Requisição        | id, localId, solicitanteId, estado, criadoEm; itens com quantidade solicitada e atendida                                                                                           |
| Inventário        | id, localId, estado, responsávelId, iniciadoEm, confirmadoEm; itens com contado, saldoBase e justificativa de diferença                                                            |
| Idempotência      | chave, usuárioId, operação, hashPayload, resultado, criadoEm; chave única por usuário/operação                                                                                     |
| Auditoria         | id, atorId, ação, entidade, entidadeId, ocorridoEm, dados mínimos da alteração; sem senhas ou tokens                                                                               |

FKs de registros operacionais usam RESTRICT; desativação substitui exclusão de cadastros utilizados. NCM e documentos são texto para preservar zeros iniciais. EstoqueLocal também configura mínimo e localização de materiais cujo saldo é zero. A unidade do material utilizado não pode ser alterada sem processo explícito de conversão.

Índices: lançamentos por `(localId, materialId, ocorridoEm, id)`, transferências por `(destinoId, estado, enviadoEm)`, movimentações por `(localId, confirmadoEm)` e vínculos por usuário. Paginação do histórico por cursor. Campos de moeda/custo aguardam validação da política de custo médio.

## Transação de confirmação

1. Autenticar sessão e verificar permissão no local dentro da operação autorizada.
2. Validar payload, IDs, cadastros ativos, quantidades e chave de idempotência.
3. Abrir transação serializável. Registrar a chave única e hash do payload. Repetição com mesmo payload retorna resultado anterior; payload diferente com mesma chave retorna conflito.
4. Bloquear linhas de saldo em ordem determinística de local/material; criar posição inexistente com tratamento da restrição única.
5. Validar estado atual, saldo disponível e limites de cada item. Aplicar baixa condicional (`disponível >= quantidade`) e verificar quantidade de linhas alteradas.
6. Atualizar saldos, trânsito, lançamentos, estado e auditoria na mesma transação. Persistir o resultado idempotente antes do commit.
7. Em conflito serializável/deadlock, repetir de forma limitada usando a mesma chave. Falha final não confirma parcialmente nenhum item.

Nenhuma confirmação depende do Redis. Notificações futuras usam outbox gravada na mesma transação e worker idempotente. Não faça chamadas externas dentro da transação.

Recebimento bloqueia a transferência e seus itens, verifica o destino e limita a quantidade ao pendente. Cadastra recebimento e lançamento positivo no destino atomicamente. A baixa da origem acontece somente no envio. Resolução por perda não credita local; devolução efetiva credita a origem e reduz trânsito. Operações de resolução não são cancelamento.

## Conciliação e testes obrigatórios da API

- Saldo disponível = soma dos lançamentos confirmados, incluindo saldo inicial.
- Pendente por item = enviada − recebida − devolvida − perdida.
- Sem entrada, saída ou perda, disponível total + trânsito conserva quantidades por material (nunca some unidades diferentes).
- Dois saques concorrentes de 7 sobre saldo 10: somente um confirma.
- Confirmações concorrentes com a mesma chave retornam a mesma operação, sem segundo lançamento.
- Recebimentos concorrentes de 2 sobre pendente 2: somente um efetiva.
- Falha em um item desfaz todos os itens; tentativa sem vínculo não altera nada.

Essas garantias precisam de testes de integração contra PostgreSQL real. Os testes atuais cobrem apenas aritmética e simulação em memória.
