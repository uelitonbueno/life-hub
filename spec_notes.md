# Notas da especificação do Life Hub

## Páginas 1–5

O documento define o **Life Hub** como uma aplicação **exclusivamente web**, **responsiva** e com orientação **local-first**, acessível por navegador em desktop e celular. A primeira versão não deve depender de APIs móveis, builds nativos, distribuição por loja ou instruções de publicação para Android/iOS.

O propósito do produto é centralizar informações pessoais e familiares em um único lugar, cobrindo documentos, contas, agenda, aniversários, contatos, veículos, saúde, garantias e assinaturas. A primeira versão deve priorizar **dados locais**, **clareza de uso**, **edição universal**, **navegação simples**, **segurança proporcional ao navegador** e **evolução modular**.

O estado do protótipo anterior indica que já existiam, ao menos conceitualmente, marca LifeHub, tema claro/escuro, dashboard, documentos, finanças, agenda, navegação desktop, navegação móvel, persistência local, OCR/importação real, busca global, assistente local, backup/restauração e autenticação/sincronização. Contudo, várias dessas áreas precisam ser recriadas ou reimplementadas no novo projeto web.

As decisões de produto enfatizam os princípios de **local-first**, **edição universal**, **automação assistida**, **privacidade explícita**, **evolução modular** e **ausência de falsas certezas**. Isso implica que sugestões automáticas não podem ocultar revisão humana e que OCR, classificação ou assistência precisam sinalizar ausência ou baixa confiança.

A direção visual preservada informa os tokens base do tema claro: `primary #2F80ED`, `background #F7F4EE`, `surface #FFFFFF`, `foreground #20252B`, `muted #6F7B86`, `success #6FAF8B`, `warning #D99A2B` e `error #D9655D`. Para o modo escuro, o documento estabelece fundo `#111820` e superfícies `#1C2732` com contraste equivalente.

O layout desktop deve manter sidebar fixa com largura aproximada de **248 px**. Em larguras abaixo de **900 px**, a navegação deve colapsar para um modo compacto, sem semântica de aplicativo móvel e sem dependência de APIs móveis.

Na arquitetura recomendada, o documento pede **React 19 + TypeScript**, roteamento client-side, Tailwind CSS com tokens, componentes acessíveis, validação com Zod, formulários com React Hook Form, testes com Vitest e persistência local em **IndexedDB** com abstração por repositórios. O dashboard financeiro deve usar gráficos acessíveis, com recomendação de Recharts ou equivalente.

O texto destaca explicitamente que a nova aplicação web deve usar **IndexedDB** como fonte local de dados, abstraindo o armazenamento por repositórios, de forma a permitir futura sincronização criptografada sem reescrever os componentes.

## Páginas 6–10

O documento recomenda uma organização modular com áreas como `dashboard`, `documents`, `finance`, `calendar`, `contacts`, `family`, `warranties`, `search`, `backup` e `settings`, além de camadas separadas para domínio, dados, serviços, hooks, utilitários, estilos, testes e documentação. Cada feature deve possuir, quando aplicável, seus próprios tipos, repositórios, serviços, estado, componentes, formulário de edição e testes. O documento também proíbe acoplamento direto entre componentes visuais e leituras do IndexedDB, bem como regras financeiras e classificações embutidas em JSX.

No domínio já definido, a entidade **DocumentRecord** deve incluir campos como identificador, título, categoria, subcategoria, status (`new`, `processing`, `needs_review`, `confirmed`), origem, metadados do arquivo, texto extraído, datas relevantes, valor, vínculos com fornecedor, pessoa, veículo e residência, além de `confidence`, `createdAt` e `updatedAt`. As categorias iniciais incluem energia, água, internet, telefone, boleto, fatura, nota fiscal, comprovante, contrato, documento pessoal, saúde, veículo, seguro, imposto, educação, viagem, garantia, assinatura e outros.

O domínio financeiro estabelece uma entidade **FinancialRecord** com identificador, título, categoria, subcategoria, valor, status (`paid`, `pending`, `overdue`, `cancelled`), datas de ocorrência e vencimento, competência, método de pagamento, fornecedor, recorrência, parcelamento, observações e vínculos opcionais. As categorias iniciais incluem moradia, alimentação, transporte, saúde, educação, lazer, assinaturas, compras, viagens, impostos, pets, seguros, dívidas, investimentos, trabalho, cuidados pessoais, presentes e outros.

O domínio da agenda define uma entidade **CalendarEvent** com identificador, título, tipo, descrição opcional, datas de início e fim, indicação de dia inteiro, recorrência, local, vínculos com pessoa, contato, documento e registro financeiro, além de offsets de lembrete e metadados de criação e atualização. O documento ainda reserva entidades futuras como contato, perfil familiar, residência, veículo, saúde, garantia, assinatura, regra de categoria, trilha de auditoria e configurações da aplicação, mas informa que esses módulos não devem bloquear a primeira entrega de documentos, finanças e agenda.

As rotas centrais já definidas são `/` para início, `/documents` para documentos, `/finance` para finanças, `/calendar` para agenda, `/more` para módulos complementares e `/settings` para configurações. Em desktop, a navegação deve usar sidebar fixa; em telas menores, deve migrar para uma navegação compacta web, como barra inferior, drawer ou menu expansível, mantendo consistência e acessibilidade por teclado.

O dashboard obrigatório precisa reunir os blocos de saudação, resumo do dia, valores a vencer, gastos do período, próximo evento, resumo de documentos e ações rápidas. Esses blocos devem ser derivados dos registros persistidos e não de dados estáticos. O documento especifica que o resumo do dia mostre quantidade de documentos pendentes e contas não pagas, que a seção “A vencer” some lançamentos pendentes por período, que a área de gastos some os lançamentos do período selecionado, que o próximo evento selecione o primeiro evento futuro por `startsAt`, que o card de documentos mostre o total e a quantidade em `needs_review`, e que as ações rápidas permitam criar documento, conta, evento, lembrete ou pergunta.

Na área de documentos, a biblioteca precisa oferecer filtros como Todos, Recentes, Revisar e Favoritos. Cada linha deve exibir ícone de categoria, título, categoria, estado, informação de data e acesso ao detalhe. O fluxo mínimo previsto é criar ou importar, processar ou sugerir, revisar, confirmar e então consultar, editar ou arquivar. Mesmo que OCR completo seja entregue depois, a estrutura de estados `processing` e `needs_review` deve existir desde o início.

Na área financeira, os indicadores devem ser derivados de registros persistidos, com seleção de período, CRUD completo, edição de status e agrupamento por categoria. O documento destaca que o protótipo anterior já calculava total de lançamentos, total pago, total pendente e total vencido, e que a nova versão deve preservar essa lógica e expandi-la com filtros e categorização.

## Páginas 11–14

A agenda deve mostrar eventos locais, lista de próximos eventos e criação rápida. Na primeira versão web, os lembretes devem ser tratados apenas como dados internos; notificações do navegador podem ser adicionadas depois e somente com autorização do usuário.

O novo projeto precisa oferecer uma ação explícita para **carregar dados de demonstração** e outra para **apagar dados de demonstração**, sempre com confirmação. O conjunto de demonstração deve incluir documentos fictícios, lançamentos financeiros, eventos, uma família fictícia, uma residência, um veículo, assinaturas e garantias. O documento proíbe distribuir dados reais do usuário como exemplo.

O esquema sugerido para IndexedDB inclui coleções `documents`, `financialRecords`, `calendarEvents`, `contacts`, `settings`, `auditLogs` e `files`, com índices mínimos voltados a status, categoria, datas, tipos e relacionamentos. O documento também exige versionamento e migradores estáveis para o banco local, proibindo apagar dados automaticamente ao alterar o schema. Em falha de migração, a aplicação deve preservar o banco anterior e oferecer exportação de emergência.

Em segurança e privacidade, o MVP não deve prometer criptografia ponta a ponta nem backup remoto antes de realmente implementá-los. A aplicação precisa comunicar claramente que os dados ficam armazenados localmente no navegador em uso. O documento também orienta que arquivos importados mantenham apenas o necessário, que logs não registrem CPF, texto documental, dados médicos ou valores completos, que exclusões peçam confirmação e que autenticação e sincronização fiquem fora do MVP local.

Há uma seção explícita sobre o que **não** deve ser reaproveitado: base Expo/React Native, arquivos de configuração mobile, ícones adaptativos, plugins nativos, scripts de Android/iOS, componentes de safe area, QR code nativo e navegação dependente de semântica mobile. Também não se deve embutir dados de demonstração diretamente em componentes; eles devem ser inseridos por um repositório local de forma idempotente.

Os critérios de aceite do primeiro MVP exigem: projeto identificado como web, sidebar e navegação por URL no desktop, navegação compacta sem transbordamento no celular, persistência após atualização da página para documentos/contas/eventos, CRUD funcional de documentos com revisão e arquivamento, CRUD financeiro com atualização automática dos totais derivados, agenda com criação e ordenação de próximos eventos, acessibilidade básica por teclado com foco visível e contraste, aviso claro de armazenamento local e qualidade mínima com TypeScript, lint e testes sem erro.

A ordem recomendada de implementação é: criar o projeto web estático, configurar tokens visuais e shell da aplicação, criar domínio e IndexedDB com dados de demonstração, implementar dashboard derivado de dados locais, depois CRUD de documentos, CRUD financeiro, CRUD de agenda, busca global e filtros persistentes, importação/classificação/OCR como módulos separados e por fim backup/exportação, testes completos e publicação.

Por fim, o resumo de abertura do novo projeto determina que o Life Hub seja uma aplicação web local-first e responsiva, usando React, TypeScript, Tailwind, roteamento web e IndexedDB. O texto manda evitar servidor, login, sincronização, pagamentos e IA online no primeiro MVP. Embora o template atual possua backend e autenticação disponíveis, o escopo funcional autorizado pelo documento para a primeira entrega permanece essencialmente **local**, com módulos centrais de dashboard, documentos, finanças e agenda.
