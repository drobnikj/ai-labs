import { z } from 'zod';
// TODO: Types
export const ACTIONS = {
    MAKE_PLAN: {
        name: 'make_plan',
        description: "Create a plan to accomplish the given task. Summarize what the user's task is in a step by step manner. How would you browse the internet to accomplish the task. Start with 'I will'",
        parameters: z.object({
            plan: z.string().describe('The step by step plan on how you will navigate the internet and what you will do'),

        }),
    },
    GO_TO_URL: {
        name: 'go_to_url',
        description: 'Goes to a specific URL and gets the content',
        parameters: z.object({
            url: z.string().url().describe('The valid URL to go to (including protocol)'),
        }),
        required: ['url'],
    },
    CLICK_LINK: {
        name: 'click_link',
        description: 'Clicks a link with the given gid on the page. Note that gid is required and you must use the corresponding gid attribute from the page content. Add the text of the link to confirm that you are clicking the right link.',
        parameters: z.object({
            text: z.string().describe('The text on the link you want to click'),
            gid: z.number().int().positive().describe('The gid of the link to click (from the page content)'),
        }),
        required: ['reason', 'gid'],
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
    },
    SAVE_OUTPUT: {
        name: 'save_output',
        description: 'Give an answer to the user and end the navigation. Use when the given task has been completed. Summarize the relevant parts of the page content first and give an answer to the user based on that.',
        parameters: z.object({
            summary: z.string().describe('A summary of the relevant parts of the page content that you base the answer on'),
            answer: z.string().describe('The response to the user'),
        }),
        required: ['summary', 'answer'],
    },
};

export const ACTION_LIST = Object.values(ACTIONS);
