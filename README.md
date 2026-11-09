# GPV Sorteios 2026 — v0.1.0

Aplicação de demonstração para os sorteios da Confraternização GPV 2026.

## Rodar localmente

```bash
npm install
npm run dev
```

## Publicar na Vercel

1. Crie um repositório privado no GitHub.
2. Envie os arquivos deste projeto para a **raiz** do repositório (não a pasta que contém o projeto).
3. Na Vercel: **Add New → Project → Import Git Repository**.
4. Framework preset: **Vite**; Build command: `npm run build`; Output directory: `dist`.
5. Clique em **Deploy**.

## Rotas

- `/admin` — Dashboard
- `/admin/participantes` — Gerenciar participantes
- `/admin/premios` — Gerenciar prêmios
- `/admin/sorteio` — Controle do sorteio
- `/admin/historico` — Histórico e exportação
- `/admin/configuracoes` — Configurações da demonstração
- `/telao` — Exibição para o telão (abrir em outra aba da mesma origem e navegador)

## Muito importante — limitações desta versão

**Esta versão é uma demonstração local, não é indicada para usar no evento real ainda.**

- Dados e resultados são gravados apenas no `localStorage` do navegador, sem backup no servidor.
- A atualização entre operador e telão usa `BroadcastChannel` e eventos de armazenamento: funciona com abas/janelas do **mesmo navegador e mesma origem**, não sincroniza notebooks diferentes nem navegação anônima.
- Não existe autenticação. Qualquer pessoa com o link do painel pode alterá-lo. Não publique dados pessoais verdadeiros nesta versão.
- A seleção usa `crypto.getRandomValues` no navegador, adequada à demonstração, mas a **versão definitiva deverá executar e validar os sorteios no backend autenticado** com transações Firestore, auditoria e regras de acesso.
- Os nomes e prêmios iniciais são fictícios, para teste.
- Um ganhador confirmado deixa de ser elegível; ausências ficam excluídas apenas das tentativas do prêmio em andamento. O histórico permite exportação CSV.
- O relógio/estado do sorteio pode perder o progresso se fechar ou recarregar o navegador no meio da animação.

## Próxima etapa (Firebase)

Criar Firebase Auth + Firestore, configurar regras de leitura pública controlada para o telão, API segura para seleção e confirmação, trilha de auditoria, transações para garantir um prêmio por pessoa e recuperação de sessão. Não configure chaves privilegiadas do Firebase no frontend.

## Arquivo de importação

Aceita `.csv` e `.xlsx` com colunas `nome`, `matricula`/`codigo`/`id` e `setor`/`equipe`. Uma coluna `nome` é obrigatória. Antes de importar é exibida prévia e resumo de conflitos.

## Identidade visual

A marca nesta versão está representada por tipografia `GPV ASSOCIADOS`, como placeholder. Na etapa final podemos integrar o arquivo oficial da logo sem alterar a estrutura das telas.
