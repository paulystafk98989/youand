
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

## Automação Meta AI (geração + animação + download)

Se quiser automatizar o fluxo do site de vídeo da Meta (preencher prompt, clicar em **Gerar**, **Animar** e **Baixar**), execute:

```bash
npm run meta
```

Variáveis úteis (todas opcionais) podem ser exportadas antes do comando:

- `META_URL`: URL do gerador (padrão `https://www.meta.ai/create/video`)
- `META_PROMPT`: texto do prompt (ou use `THEME` já existente)
- `META_PROMPT_SELECTOR`: seletor CSS do campo de prompt (padrão `textarea`)
- `META_GENERATE_LABELS`, `META_ANIMATE_LABELS`, `META_DOWNLOAD_LABELS`: lista de textos (separados por vírgula) para localizar os botões
- `META_BUTTON_SELECTORS`: seletores alternativos para botões (padrão `button,[role="button"],a[role="button"]`)
- `META_SKIP_ANIMATE`: defina como `true` para pular o clique em **Animar**
- `META_DOWNLOAD_DIR`: pasta onde o arquivo baixado será salvo (padrão `meta-downloads/`)
- `META_TIMEOUT`: tempo máximo (ms) para cada espera — padrão `600000`

Os logs do terminal mostram cada etapa (preenchimento, geração, animação e download) e o caminho final do arquivo baixado.
