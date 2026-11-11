# GPV Sorteios — V0.3.6

**Base:** V0.3.5 — todos os recursos existentes de sorteio e telão preservados.

## Novo: upload das artes dos participantes

Em **Participantes → Novo participante / Editar**, selecione uma arte em JPG, PNG ou WebP de até 5 MB. O upload passa pela API protegida `/api/upload-sign` e é enviado diretamente ao Cloudinary, na pasta `gpv-sorteios/<EVENT_ID>/participantes`. A prévia aparece no formulário; clique em **Salvar participante** para gravar a URL HTTPS no Firestore junto com o cadastro. A listagem também exibe miniatura e indica quando existe arte personalizada.

O telão já utiliza `artUrl` e exibe automaticamente a arte do participante sorteado. Sem arte, mantém a matriz oficial de Gladiador ou Gladiadora. A V0.3.6 não altera fases, animações, critérios de sorteio ou validação de presença.

**Ambiente:** reutiliza `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `GPV_ADMIN_UID` e `EVENT_ID` existentes na Vercel. Não exige novas variáveis nem mudanças nas regras do Firestore. O segredo do Cloudinary permanece apenas no servidor. A API só emite assinatura após autenticação do UID administrador.

**Atenção:** remover ou substituir uma imagem no cadastro desvincula a URL, mas não exclui o arquivo anteriormente enviado ao Cloudinary. Verifique autorização de uso de imagem dos participantes.

## Publicação

Substitua o conteúdo do repositório GitHub pelos arquivos deste ZIP, faça commit e aguarde o deploy da Vercel. Faça um teste com um participante antes de cadastrar as demais artes; confirme no telão que a imagem correta aparece após o sorteio.
