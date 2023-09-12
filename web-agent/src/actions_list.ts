import { z } from 'zod';
import { get_page_content } from './html_processor.js';

// TODO: Types
export const ACTIONS = {
    GO_TO_URL: {
        name: 'go_to_url',
        description: 'Goes to a specific URL and gets the content',
        parameters: z.object({
            url: z.string().url().describe('The valid URL to go to (including protocol)'),
        }),
        required: ['url'],
        action: async (page, { url }) => {
            console.log('go_to_url', url);
            await page.goto(url);
            await page.waitForTimeout(1000);
            const minHtml = await get_page_content(page);
            return minHtml;
        },
    },
    CLICK_LINK: {
        name: 'click_link',
        description: 'Clicks a link with the given gid on the page. Note that gid is required and you must use the corresponding gid attribute from the page content. Add the text of the link to confirm that you are clicking the right link.',
        parameters: z.object({
            text: z.string().describe('The text on the link you want to click'),
            gid: z.number().int().positive().describe('The gid of the link to click (from the page content)'),
        }),
        required: ['text', 'gid'],
        action: async (page, { text, gid }) => {
            console.log('click_link', { text, gid });
        },
    },
    TYPE_TEXT: {
        name: 'type_text',
        description: 'Types text to input fields and optionally submit the form',
        parameters: z.object({
            form_data: z.array(z.object({
                gid: z.number().int().positive().describe('The gid attribute of the input to type into (from the page content)'),
                text: z.string().describe('The text to type'),
            })).describe('The gid attribute of the input to type into (from the page content)'),
            submit: z.boolean().describe('Whether to submit the form after filling the fields'),
        }),
        required: ['form_data', 'submit'],
        action: async (page, { form_data, submit }) => {
            console.log('form_data', { form_data, submit });
        },
    },
    EXTRACT_DATA: {
        name: 'extract_data',
        description: 'Extract data from page content',
        parameters: z.object({
            extract_data: z.array(z.object({
                gid: z.number().int().positive().describe('The gid attribute from the content to extract data'),
                attribute_name: z.string().describe('The name of the attribute to extract'),
            })).describe('The gid attribute of the input to type into (from the page content)'),
        }),
        required: ['extract_data'],
        action: async (page, { extract_data }) => {
            console.log('extract_data', { extract_data });
        },
    },
    SAVE_OUTPUT: {
        name: 'save_output',
        description: 'Give an answer to the user and end the navigation. Use when the given task has been completed. Summarize the relevant parts of the page content first and give an answer to the user based on that.',
        parameters: z.object({
            summary: z.string().describe('A summary of the relevant parts of the page content that you base the answer on'),
            answer: z.string().describe('The response to the user'),
        }),
        required: ['summary', 'answer'],
        action: async (page, { summary, answer }) => {
            console.log('save_output',  { summary, answer });
        },
    },
};

export const ACTION_LIST = Object.values(ACTIONS);
