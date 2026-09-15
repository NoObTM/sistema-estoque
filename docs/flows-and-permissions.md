# Fluxos e permissões iniciais

## Matriz proposta

Todo acesso abaixo, exceto administrador global, exige vínculo com o local. Perfil e vínculo são verificados na API; a seleção de obra no frontend apenas filtra a apresentação.

| Operação                          | Administrador | Gestor            | Almoxarife        | Solicitante | Consulta   |
| --------------------------------- | ------------- | ----------------- | ----------------- | ----------- | ---------- |
| Consultar saldo e catálogo        | Todos         | Vinculados        | Vinculados        | Vinculados  | Vinculados |
| Consultar histórico/relatórios    | Todos         | Vinculados        | Vinculados        | Não         | Vinculados |
| Manter cadastros globais          | Sim           | Não               | Não               | Não         | Não        |
| Entrada e saída                   | Todos         | Vinculados        | Vinculados        | Não         | Não        |
| Enviar transferência              | Todos         | Origem vinculada  | Origem vinculada  | Não         | Não        |
| Confirmar recebimento             | Todos         | Destino vinculado | Destino vinculado | Não         | Não        |
| Solicitar materiais               | Todos         | Vinculados        | Vinculados        | Vinculados  | Não        |
| Autorizar ajuste, estorno e perda | Todos         | Vinculados        | Não               | Não         | Não        |
| Convidar e atribuir permissões    | Sim           | Não               | Não               | Não         | Não        |

Restrições detalhadas são proposta de especificação, sujeitas à revisão com a construtora. Destinos elegíveis para envio devem ser expostos por endpoint mínimo, sem conceder acesso aos saldos do destino. Solicitante acompanha as próprias requisições. Estorno que afete múltiplos locais exige autoridade em todos eles.

## Operações

- Entrada: rascunho com local, fornecedor, documento e itens; confirmação aumenta saldo.
- Saída: local, funcionário, centro de custo e itens; confirmação exige saldo e registra consumo.
- Transferência: rascunho editável → enviada → parcial → recebida. Rascunho pode ser cancelado sem saldo. Envio debita origem e cria trânsito. Recebimento credita somente destino.
- Devolução/perda depois do envio: operação vinculada, quantidade limitada ao pendente, justificativa e autorização. Quando não houver pendência e houver devolução/perda, propor estado ENCERRADA_COM_DIVERGENCIA, distinto de RECEBIDA; validar antes da etapa 5.
- Inventário: salvar contagem não altera saldo. Na confirmação, bloquear local para movimentações ou invalidar a contagem se versão do saldo mudou; estratégia proposta: conferir versões e exigir recontagem dos itens alterados. Ajuste justificado registra diferença no histórico.
- Estorno: nova operação vinculada à original, com limites acumulados por item e justificativa; preservar histórico e impedir saldo negativo. Não permitir estorno direto de envio já recebido: seguir fluxo de devolução.

## Protótipo para revisão

Painel mostra indicadores derivados do cenário selecionado; materiais tem busca; estoque mostra saldo, mínimo e localização; transferências mostra recebido e pendente por item. Seletor fica disponível também no celular. Indicadores usam texto além de cor.

O protótipo demonstra somente conferência, usando estado em memória. Não representa autenticação, autorização, idempotência ou concorrência em produção. Material é cadastrado globalmente; a visão de saldos é por local. Não há indicadores financeiros até validar a política de custo.

## Referência do PDF existente

O arquivo `prototipo-estoque-construtora.pdf` contém 18 páginas de proposta visual. A implementação inicial cobre um recorte interativo, sem pretender reproduzir todas as telas do PDF. Os cenários numéricos são menores e fictícios; o nome da aplicação continua provisório.

Preservar nas próximas etapas: peso, referência do fabricante e observações no material; observação de divergência e comprovante na conferência; trânsito por material na consulta de estoque; funcionário separado de usuário de acesso. Requisição não reserva nem baixa estoque: atendimento gera saída vinculada. Telas de entradas, cadastros editáveis, requisições e relatórios serão implementadas nas etapas correspondentes.
