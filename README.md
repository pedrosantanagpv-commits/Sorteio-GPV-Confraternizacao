# GPV Sorteios — V0.3.5 | Anúncio dos Prêmios

Atualização incremental sobre a V0.3.4. Preserva Firebase Authentication, Firestore, API de sorteios, as matrizes oficiais do Gladiador/Gladiadora e a animação de standby aprovada.

## Novidades

- **Anunciar prêmio no telão:** após selecionar um prêmio no painel, o operador aciona o botão `ANUNCIAR PRÊMIO NO TELÃO`. O servidor grava o novo estado `announced` no Firestore, e a tela pública exibe o nome, a foto e a descrição do prêmio. A tela permanece nesse estado até o operador clicar em `INICIAR SORTEIO`.
- **Sorteio sincronizado:** a função `draw` exige que o prêmio tenha sido anunciado. Em seguida são mantidos os 10 segundos de giro + retirada da bola + revelação do participante e validação de presença.
- **Ausência:** ao marcar um participante ausente, o telão retorna ao anúncio do mesmo prêmio; ele fica excluído das tentativas seguintes desse prêmio, mas permanece elegível aos outros.
- **Imagem do prêmio:** cadastro e edição aceitam upload de JPG/PNG/WebP com até **5 MB**, mostram prévia e permitem remover o vínculo. A imagem fica hospedada no Cloudinary, e apenas a URL pública é registrada no documento do Firestore. O nome e o emoji continuam como fallback.
- **Modo de demonstração:** `/telao?demo=1` oferece um botão de anúncio, depois o giro, com dados fictícios e sem registro no banco.
- **Reiniciar testes:** a função da V0.3.3 foi preservada.

## Configuração obrigatória para o upload

O Firebase Storage **não está disponível no plano Spark**; esta versão usa Cloudinary com assinatura de upload calculada na API Vercel após autenticar o UID administrador. Não é necessário alterar o plano do Firebase.

1. Crie uma conta Cloudinary e acesse **Dashboard / API Keys**.
2. Na Vercel → Projeto → **Settings → Environment Variables**, adicione estas variáveis no ambiente Production:

   - `CLOUDINARY_CLOUD_NAME` = seu Cloud name
   - `CLOUDINARY_API_KEY` = API Key
   - `CLOUDINARY_API_SECRET` = API Secret (secreta!)

3. Mantenha todas as variáveis Firebase já cadastradas, incluindo `GPV_ADMIN_UID`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `EVENT_ID` e `VITE_EVENT_ID`.
4. Faça o **redeploy** depois de cadastrar as variáveis. Não envie a API Secret ou o JSON do Firebase ao GitHub.
5. Cadastre um prêmio em **Prêmios → Adicionar prêmio**, selecione uma imagem e aguarde a prévia. Clique **Salvar prêmio**. Depois vá a **Sorteio ao vivo → Anunciar prêmio no telão**.

**Sem as três variáveis Cloudinary**, o restante do sistema continua funcionando, inclusive anúncio sem foto, mas o upload mostrará erro de configuração.

Uploads são assinados pelo backend `/api/upload-sign`, que exige Firebase ID token válido e UID igual a `GPV_ADMIN_UID`. Os arquivos sobem diretamente do navegador para o Cloudinary; o segredo não é enviado ao frontend. O upload tem uma validação de tipo/tamanho no navegador, e o Cloudinary aceita apenas arquivos de imagem nesse endpoint. Não coloque fotografias pessoais sensíveis em recursos públicos sem autorização. A exclusão ou troca de uma foto no cadastro **não remove automaticamente o arquivo antigo do Cloudinary**.

## Deploy

1. Extraia o ZIP e substitua os arquivos na raiz do repositório `Sorteio-GPV-Confraternizacao`.
2. Faça commit na branch `main` e acompanhe o novo deploy na Vercel.
3. No Firebase **não é necessário editar regras Firestore**, pois toda escrita de prêmio e mudança de estado é feita pela função protegida `/api/action`.
4. Teste em dois dispositivos: `/admin/sorteio` e `/telao`. Abra os dois antes de clicar em `ANUNCIAR PRÊMIO NO TELÃO`.

## Testes sugeridos

- Selecionar um prêmio sem imagem e anunciar: aparece o emoji, nome e descrição.
- Enviar JPG/PNG/WebP e anunciar: a imagem deve aparecer em ambos os dispositivos.
- Iniciar sorteio: globo de 10 segundos, retirada da bola, revelação automática (Gladiador ou Gladiadora).
- Marcar ausência: volta ao anúncio; repetir giro sem repetir a pessoa ausente.
- Confirmar: salva um único resultado e impede novo prêmio para o mesmo participante.
- Concluir e preparar o próximo: volta ao standby animado.

## Validação

Sintaxe da API verificada com `node --check`, sintaxe JSX verificada com o parser TypeScript e arquivos ZIP íntegros. O build completo depende do `npm install`/`npm run build` na Vercel, pois a instalação não foi concluída neste ambiente. Testar primeiro com dados fictícios.
