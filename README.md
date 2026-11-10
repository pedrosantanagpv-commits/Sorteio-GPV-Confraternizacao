# GPV Sorteios — v0.2.0 Firebase

Base: V0.1.1 publicada na Vercel. Mantém o CSS/layout de dashboard, participantes, prêmios, sorteio e telão.

## O que mudou

- Login do operador com Firebase Authentication (e-mail/senha).
- Firestore: estado privado de participantes, prêmios e histórico, com `onSnapshot` em tempo real.
- Telão acessível sem login, lendo apenas documento público de exibição (não permite baixar o cadastro inteiro).
- API Vercel `/api/action` com autenticação do ID Token e autorização pelo UID definido no servidor.
- Sorteio aleatório no servidor usando `crypto.randomInt`, registro e atualização do telão em uma transação Firestore.
- Um prêmio por participante; ausentes são excluídos apenas da rodada do prêmio corrente.
- Banco começa **vazio** — os 24 nomes fictícios da versão demonstrativa **não** são importados.
- Evento atual em `events/2026`, pronto para uma futura etapa de seleção de eventos (não basta trocar o CSS para trocar de ano).

## 1 — Subir no GitHub

Substitua os arquivos do repositório pela **pasta interna** deste ZIP (coloque `package.json`, `src`, `api`, `vercel.json` etc. na raiz). NÃO envie `.env`, contas de serviço, chaves privadas nem `node_modules`.

## 2 — Variáveis na Vercel

Acesse Project > Settings > Environment Variables e cadastre **todas** as linhas de `.env.example` conforme os nomes a seguir. Insira as variáveis em Production (e Preview somente se necessário).

Variáveis Web públicas (os valores estão no `.env.example`):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_EVENT_ID=2026`

Variáveis **privadas do servidor**:

- `EVENT_ID=2026`
- `GPV_ADMIN_UID` = UID exato do usuário cadastrado no Authentication > Users
- `FIREBASE_SERVICE_ACCOUNT_JSON` = JSON **completo**, em **uma linha**, de uma conta de serviço do mesmo projeto Firebase (veja abaixo)

**Jamais** coloque `FIREBASE_SERVICE_ACCOUNT_JSON` numa variável começando com `VITE_`, em arquivo `src`, no GitHub, ou aqui na conversa.

### Criar a credencial privada

Firebase Console > Configurações do projeto > Contas de serviço > Gerar nova chave privada. Baixe o JSON em seu computador e insira o conteúdo na variável de ambiente **somente na Vercel**. Não envie esse arquivo para ninguém, nem o inclua no ZIP do projeto ou em commits.

A conta de serviço é uma credencial poderosa; mantenha-a restrita. Se ela vazar, revogue a chave imediatamente.

## 3 — Regras Firestore

Firebase Console > Firestore Database > Regras: substitua o conteúdo pelo arquivo `firestore.rules` deste projeto e clique em **Publicar**. As regras liberam leitura da tela pública e do banco privado somente para o usuário marcado como admin pelo servidor; bloqueiam escritas diretas do navegador.

## 4 — Publicar e acessar

Na Vercel: framework Vite, build `npm run build`, output `dist`. Faça novo deploy após configurar as variáveis.

- `/admin` — login e painel.
- `/telao` — visualização pública para projetor/TV (não precisa estar logado).

Faça login com a conta criada no Firebase Authentication. No primeiro login autorizado, a API cria automaticamente a estrutura do evento no Firestore e um registro de administrador para o UID permitido. Em seguida, cadastre participantes e prêmios reais.

## 5 — Testes antes do evento

1. Teste login correto e senha errada.
2. Cadastre 2–3 participantes e 1 prêmio; confira atualização em outro navegador.
3. Abra `/telao` em navegador anônimo ou outro dispositivo e teste o sorteio.
4. Confirme um ganhador e veja se ele deixa de ser elegível.
5. Sorteie um ausente, marque ausência e confirme que ele não repete na mesma rodada, mas volta a ser elegível para outro prêmio.
6. Faça backup via Configurações; teste rede/conexão e recarregamento durante uma rodada.

## Notas técnicas / limites

- A V0.2.0 usa um **documento único de estado por evento** para facilitar migração da V0.1.1. O Firestore tem limite de tamanho de documento (~1 MiB); para listas grandes, migrar para coleções individuais antes do evento. Foi definido limite aplicativo de até 4.000 participantes, mas o limite real de tamanho do documento pode ser atingido antes disso.
- Não há edição de vencedores ou restauração de resultados nesta versão: isso é intencional para preservar a auditoria básica. Ainda falta um log administrativo detalhado e funcionalidades multiusuário.
- A API valida o `GPV_ADMIN_UID` em todas as chamadas administrativas. Somente esse usuário pode operar nesta versão.
- O telão exibe mensagens fictícias durante a animação de suspense e só recebe o nome real após a revelação, para não expor a lista inteira publicamente.
- As configurações públicas do Firebase Web não são segredo, mas a conta de serviço **é**.
- É preciso verificar os termos e os limites do plano Vercel atual antes do uso comercial/corporativo em produção.
- **Validação local:** sintaxe JSX e módulos do servidor verificados. A instalação de dependências e o `vite build` não puderam ser concluídos no ambiente de preparação; valide o build no deploy e não use para sorteio oficial antes de passar nos testes acima.
