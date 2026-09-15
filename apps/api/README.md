# Backend

Diretório exclusivo da API Node.js/Fastify, separado do frontend em `apps/web`.

A implementação começa na etapa 2. Quando iniciada, esta aplicação terá seu próprio `package.json`, configuração TypeScript, scripts e variáveis de ambiente. Ainda não há servidor executável neste diretório.

Responsabilidades: autenticação, autorização por obra, casos de uso de estoque e acesso ao PostgreSQL por meio da camada de persistência. O frontend se comunica com a API por HTTP; apenas contratos de dados e validação são compartilhados em `packages/contracts`.

Consulte a [especificação de arquitetura](../../docs/architecture.md).
