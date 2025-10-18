const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const META_URL = process.env.META_URL || 'https://www.meta.ai/create/video';
const META_PROMPT = process.env.META_PROMPT || process.env.THEME || 'Create a short inspirational travel video about the ocean.';
const PROMPT_SELECTOR = process.env.META_PROMPT_SELECTOR || 'textarea';
const GENERATE_LABELS = (process.env.META_GENERATE_LABELS || 'Create,Generate,Gerar').split(',').map(l => l.trim()).filter(Boolean);
const ANIMATE_LABELS = (process.env.META_ANIMATE_LABELS || 'Animate,Animar').split(',').map(l => l.trim()).filter(Boolean);
const DOWNLOAD_LABELS = (process.env.META_DOWNLOAD_LABELS || 'Download,Baixar').split(',').map(l => l.trim()).filter(Boolean);
const BUTTON_SELECTORS = (process.env.META_BUTTON_SELECTORS || 'button,[role="button"],a[role="button"]').split(',').map(s => s.trim()).filter(Boolean);
const SKIP_ANIMATE = /^true$/i.test(process.env.META_SKIP_ANIMATE || 'false');
const TIMEOUT = parseInt(process.env.META_TIMEOUT || '600000', 10);
const DOWNLOAD_DIR = path.resolve(process.env.META_DOWNLOAD_DIR || path.join(__dirname, 'meta-downloads'));

function normalize(str) {
    return (str || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

async function clickByText(page, labels, elementSelectors = BUTTON_SELECTORS) {
    const labelsNormalized = labels.map(normalize);
    await page.waitForFunction((labelsNormalized, elementSelectors) => {
        const selectors = elementSelectors.join(',');
        const elements = Array.from(document.querySelectorAll(selectors));
        return elements.some(el => {
            const text = el.innerText.replace(/\s+/g, ' ').trim().toLowerCase();
            const disabled = el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';
            return labelsNormalized.includes(text) && !disabled;
        });
    }, { timeout: TIMEOUT }, labelsNormalized, elementSelectors);

    const clicked = await page.evaluate((labelsNormalized, elementSelectors) => {
        const selectors = elementSelectors.join(',');
        const elements = Array.from(document.querySelectorAll(selectors));
        for (const el of elements) {
            const text = el.innerText.replace(/\s+/g, ' ').trim().toLowerCase();
            const disabled = el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';
            if (labelsNormalized.includes(text) && !disabled) {
                el.scrollIntoView({ block: 'center', behavior: 'instant' });
                el.click();
                return true;
            }
        }
        return false;
    }, labelsNormalized, elementSelectors);

    if (!clicked) {
        throw new Error(`Nenhum elemento com os textos [${labels.join(', ')}] foi encontrado para clique.`);
    }
}

async function fillPrompt(page) {
    await page.waitForSelector(PROMPT_SELECTOR, { timeout: TIMEOUT });
    await page.evaluate((selector, prompt) => {
        const el = document.querySelector(selector);
        if (!el) {
            throw new Error(`Elemento de prompt não encontrado: ${selector}`);
        }
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.focus();
    }, PROMPT_SELECTOR, META_PROMPT);

    await page.type(PROMPT_SELECTOR, META_PROMPT, { delay: 25 });
    await page.evaluate(selector => {
        const el = document.querySelector(selector);
        if (el) {
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }, PROMPT_SELECTOR);
}

async function waitForDownload(page) {
    await fs.promises.mkdir(DOWNLOAD_DIR, { recursive: true });
    const client = await page.target().createCDPSession();
    await client.send('Browser.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: DOWNLOAD_DIR,
        eventsEnabled: true,
    });

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Tempo limite esperando download.')), TIMEOUT);
        page.on('download', async download => {
            try {
                const filePath = path.join(DOWNLOAD_DIR, download.suggestedFilename());
                await download.saveAs(filePath);
                clearTimeout(timeout);
                resolve(filePath);
            } catch (err) {
                clearTimeout(timeout);
                reject(err);
            }
        });
    });
}

async function main() {
    console.log('Iniciando automação do Meta AI Video...');
    console.log(`URL alvo: ${META_URL}`);
    console.log(`Prompt: ${META_PROMPT}`);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
        ],
        protocolTimeout: TIMEOUT,
    });

    try {
        const page = await browser.newPage();
        await page.goto(META_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT });

        await fillPrompt(page);
        console.log('Prompt preenchido com sucesso.');

        console.log('Clicando para gerar vídeo...');
        await clickByText(page, GENERATE_LABELS);

        if (!SKIP_ANIMATE) {
            console.log('Aguardando botão Animar...');
            await clickByText(page, ANIMATE_LABELS);
            console.log('Botão Animar clicado. Aguarde a renderização.');
        } else {
            console.log('Pulo da etapa Animar habilitado via variável de ambiente.');
        }

        const downloadPromise = waitForDownload(page);
        console.log('Procurando botão de download...');
        await clickByText(page, DOWNLOAD_LABELS);

        const downloadedFile = await downloadPromise;
        console.log('Download finalizado com sucesso.');
        console.log(`Download concluído: ${downloadedFile}`);
    } catch (error) {
        console.error('Erro na automação do Meta:', error.message);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
}

main();
