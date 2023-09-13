import { Actor } from 'apify';
import { utils, log } from 'crawlee';
import { type Page } from 'puppeteer';
import { z } from 'zod';
import { shrinkHtmlForWebAutomation, tagAllElementsOnPage } from './shrink_html.js';
import { UNIQUE_ID_ATTRIBUTE } from './consts.js';
import { maybeShortsTextByTokenLength } from './tokens.js';

interface AgentBrowserContext {
    page: Page;
}

async function waitForNavigation(page: Page) {
    try {
        await page.waitForNavigation({
            timeout: 10000,
            waitUntil: 'load',
        });
    } catch (error: any) {
        log.warning('waitForNavigation failed', error?.message);
    }
}

export async function goToUrl(context: AgentBrowserContext, { url }) {
    log.info('Calling go to page', { url });
    const { page } = context;
    await page.goto(url);
    await waitForNavigation(page);
    await utils.puppeteer.closeCookieModals(page);
    await tagAllElementsOnPage(page, UNIQUE_ID_ATTRIBUTE);
    const minHtml = await shrinkHtmlForWebAutomation(page);
    return maybeShortsTextByTokenLength(`Previous action was: go_to_url, HTML of current page: ${minHtml}`, 10000);
}

export async function clickLink(context: AgentBrowserContext, { text, gid }) {
    log.info('Calling clicking on link', { text, gid });
    const { page } = context;
    let elementFoundAndClicked = false;
    if (gid) {
        const link = await page.$(`a[gid="${gid}"]`);
        if (link) {
            await link.click();
            elementFoundAndClicked = true;
        }
    }

    if (!elementFoundAndClicked && text) {
        const link = await page.$x(`//a[contains(text(), '${text}')]`);
        if (link && link.length) {
            await link[0].click();
            elementFoundAndClicked = true;
        }
    }

    if (!elementFoundAndClicked) {
        // TODO: Handle this error
        throw new Error('Element not found');
    }

    await waitForNavigation(page);
    await utils.puppeteer.closeCookieModals(page);
    await tagAllElementsOnPage(page, UNIQUE_ID_ATTRIBUTE);
    const minHtml = await shrinkHtmlForWebAutomation(page);

    return maybeShortsTextByTokenLength(`Previous action was: click_element, HTML of current page: ${minHtml}`, 10000);
}

export async function extractData(context: AgentBrowserContext, { data }) {
    log.info('Calling extracting data from page', { data });
    const { page } = context;
    const extractedData = {};
    for (const { gid, attribute_name } of data) {
        const element = await page.$(`[${UNIQUE_ID_ATTRIBUTE}="${gid}"]`);
        if (element) {
            const attributeValue = await element.evaluate((el, attr) => el.getAttribute(attr), attribute_name);
            extractedData[attribute_name] = attributeValue;
        }
    }
    return JSON.stringify(extractedData);
}

export async function saveOutput(context: AgentBrowserContext, { data }) {
    log.info('Calling save output', { data });
    await Actor.setValue('OUTPUT', data);
    return 'Output saved, you can finish the task now.';
}

export const ACTIONS = {
    GO_TO_URL: {
        name: 'go_to_url',
        description: 'Goes to a specific URL and gets the content',
        parameters: z.object({
            url: z.string().url().describe('The valid URL to go to (including protocol)'),
        }),
        required: ['url'],
        action: goToUrl,
    },
    CLICK_LINK: {
        name: 'click_link',
        description: 'Clicks a link with the given gid on the page. Note that gid is required and you must use the corresponding gid attribute from the page content. Add the text of the link to confirm that you are clicking the right link.',
        parameters: z.object({
            text: z.string().describe('The text on the link you want to click'),
            gid: z.number().describe('The gid of the link to click (from the page content)'),
        }),
        required: ['text', 'gid'],
        action: clickLink,
    },
    EXTRACT_DATA: {
        name: 'extract_data',
        description: 'Extract data from HTML page content',
        parameters: z.object({
            attributes_to_extract: z.array(z.object({
                gid: z.number().int().describe('The gid HTML attribute from the content to extract data'),
                attribute_name: z.string().describe('The name of the attribute to extract'),
            })).describe('The list of gid attributes of the elements to extract data from (from the page content)'),
        }),
        required: ['attributes_to_extract'],
        action: extractData,
    },
    SAVE_OUTPUT: {
        name: 'save_output',
        description: 'Saves the output in the key-value store',
        parameters: z.object({
            data: (z.object({})).describe('Object that can be stringify as JSON'),
        }),
        required: ['data'],
        action: saveOutput,
    },
};

export const ACTION_LIST = Object.values(ACTIONS);
