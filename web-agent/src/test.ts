import { ChatOpenAI } from 'langchain/chat_models/openai';
import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import {DynamicTool} from "langchain/tools";

const chat = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'gpt-3.5-turbo-16k',
    temperature: 0,
});

const tools = [
    new DynamicTool({
        name: 'make_plan',
        description: 'Create plan for executing action base on user input.',
        func: async () => console.log('make_plan'),
    })
];

const executor = await initializeAgentExecutorWithOptions(tools, chat, {
    agentType: 'openai-functions',
    agentArgs: {
        prefix: 'You have been tasked with automate action on web page based on a task given by the user.',
    },
    verbose: true,
});

const result = await executor.run('Open apify.com, find the pricing page and returns all pricing plans in JSON format.');
console.log(result);
