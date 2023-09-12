import { Actor } from 'apify';
import { launchPuppeteer, sleep } from 'crawlee';
import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { SerpAPI, DynamicTool, DynamicStructuredTool } from 'langchain/tools';
import { Calculator } from 'langchain/tools/calculator';
import { get_page_content } from './html_processor.js';
import { Input } from './input.js';
import { OpenAIProcessor } from './openai.js';
import { ACTION_LIST } from './actions_list.js';
import { z } from "zod";
import {
    jsonSchemaToZod,
    jsonSchemaToZodDereffed,
    parseSchema,
} from "json-schema-to-zod";

// Initialize the Apify SDK
await Actor.init();

if (!process.env.OPENAI_API_KEY) {
    await Actor.fail('OPENAI_API_KEY cannot be empty!');
    throw new Error('OPENAI_API_KEY cannot be empty!');
}

const { startUrl, instructions } = await Actor.getInput() as Input;

const initialContext = {
    role: 'system',
    content: '## OBJECTIVE ##\n'
        + 'You have been tasked with automate action on web page based on a task given by the user. '
        + `The start URL is ${startUrl}. `
        + 'You are connected to a web browser which you can control via function calls to navigate to pages and list elements on the page. '
        + 'You can also type into search boxes and other input fields and send forms. '
        + 'You can also click links on the page. You will behave as a human browsing the web.\n'
        + '## NOTES ##\n'
        + 'You will try to navigate directly to the most relevant web address. '
        + 'If you were given a URL, go to it directly. If you encounter a Page Not Found error, try another URL. '
        + 'If multiple URLs don\'t work, you are probably using an outdated version of the URL scheme of that website. '
        + 'In that case, try navigating to their front page and using their search bar or try navigating to the right place with links.\n'
        + '## WHEN TASK IS FINISHED ##\n'
        + 'When you have executed all the operations needed for the original task, call answer_user to give a response to the user.',
};

const tools = ACTION_LIST.map((action) => {
    return new DynamicStructuredTool({
        name: action.name,
        description: action.description,
        schema: action.parameters,
        func: async () => console.log('action', action.name),
    });
});
const chat = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'gpt-3.5-turbo-16k',
    temperature: 0,
});

const executor = await initializeAgentExecutorWithOptions(tools, chat, {
    agentType: 'openai-functions',
    agentArgs: {
        prefix: initialContext.content,
    },
    verbose: true,
});

const result = await executor.invoke({ input: instructions });
console.log(result);

// console.log('initialPlan', initialPlan);

const browser = await launchPuppeteer({ launchOptions: { headless: false } });
const page = await browser.newPage();

await page.goto(startUrl);

await sleep(2000);

// Minimize HTML for to use low tokens
const html = await page.content();
const minHtml = await get_page_content(page);

// const processNextStep = await openaiProcessor.processChatGptAction({
//     message: {
//         role: 'function',
//         name: 'make_plan',
//         content: JSON.stringify({
//             status: 'success',
//             message: 'Continues regarding the plan.'
//                 + `The browser is currently on the start page ${startUrl} and content of page is ${minHtml}`,
//         }),
//     },
// });

// console.log('processNextStep', processNextStep);

// for (let i = 0; i < 3; i++) {
//     const processNextStep = // TODO process next step based on previous step
//     let nextStep = await openaiProcessor.processChatGptAction({
//
//     });
// }

console.log('html', html.length);
console.log('minHtml', minHtml.length);

await Actor.setValue('minHtml.html', minHtml);

await sleep(10000);

// Exit successfully
await Actor.exit();
