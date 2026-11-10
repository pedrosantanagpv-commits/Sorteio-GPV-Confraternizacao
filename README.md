# GPV Sorteios — V0.3.3 (reinicialização dos testes)

Esta versão preserva o visual e as matrizes oficiais da V0.3.2 e adiciona, em **Configurações → Reiniciar testes**, uma operação protegida por login administrativo e confirmação digitada `REINICIAR TESTES`.

A reinicialização remove o histórico de ganhadores do evento ativo e limpa o sorteio em andamento, mas **mantém todos os participantes e prêmios**. Os vencedores anteriores voltam a ser elegíveis. Antes da limpeza, o servidor salva um snapshot em `events/{EVENT_ID}/resetArchives/{id}`, acessível a administradores via Firebase Admin SDK. Não é recomendável executar depois de iniciar a premiação oficial.

## Instalação

1. Extraia o ZIP e envie o conteúdo à raiz do repositório GitHub já vinculado à Vercel.
2. Não adicione arquivos JSON de contas de serviço ao GitHub. As variáveis Firebase/Vercel atuais permanecem válidas.
3. Aguarde o deploy automático e verifique **Configurações → Reiniciar testes**.
4. Antes de reiniciar, use **Exportar JSON** para ter um backup local adicional.
5. Confirme a expressão exata **REINICIAR TESTES** na janela de confirmação.

## Atenção

O reinício afeta o evento identificado por `EVENT_ID` na Vercel. A operação deve ser usada somente enquanto os registros forem de teste. A versão não cria um ambiente de homologação separado; recomendamos separá-lo antes do evento oficial.

Sem necessidade de alterar as regras Firestore: a operação de arquivamento e reinicialização é feita pelo servidor usando Firebase Admin SDK após validar o UID autorizado.
