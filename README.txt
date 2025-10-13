
# Painel Auto Vídeos — Deploy simples

## Passo 1) Baixe este ZIP e crie um repositório no GitHub
- Faça upload de todos os arquivos deste pacote.

## Passo 2) Render.com (sem pagar)
- Crie um novo serviço *Web* usando **"Deploy an existing Dockerfile"**.
- Conecte ao seu repositório.
- Em *Environment*, adicione as variáveis do `.env.example` (GEMINI/GROQ/YOUTUBE e login do painel).
- Deploy.

## Passo 3) Entrar no painel
- Acesse a URL gerada pelo Render.
- Faça login com `PANEL_USER` e `PANEL_PASS`.
- Configure Tema, Idioma, etc.
- Clique "Gerar + Enviar".
- Veja os logs ao vivo.

Dica: Para publicar todos os dias às 18h, no campo CRON use: `0 21 * * *` (21:00 UTC ≈ 18:00 Brasil).
