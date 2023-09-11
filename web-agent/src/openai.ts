import { log } from 'crawlee';
import OpenAI from 'openai';
import { ACTION_LIST } from './actions_list.js';

export class OpenAIProcessor {
    private openai: OpenAI;
    private context: object[];

    constructor(
        { apiKey, initialContext }: { apiKey: string, initialContext?: object },
    ) {
        this.openai = new OpenAI({
            apiKey,
        });
        this.context = initialContext ? [initialContext] : [];
    }

    async processChatGptAction({
        message,
        action,
    }) {
        const messages = [...this.context, message];

        log.info('Sending message to OpenAI API', { messages });
        // TODO: Exponential backoff once 500 status or rate limits
        let conversation;
        try {
            conversation = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo-16k', // TODO: Make model configurable
                messages,
                function_call: action,
                functions: action ? [action] : ACTION_LIST,
            });
        } catch (err: unknown) {
            log.error('Error calling OpenAI API', { err });
            // TODO: Handle this properly
        }

        console.log('conversation', conversation);

        if (!conversation.choices) {
            throw new Error('Handle this properly!');
        }

        const lastMessage = conversation.choices[0].message;
        this.context.push(lastMessage);

        if (!message?.function_call) return lastMessage;

        // Parse function call arguments because it was returned as JSON
        let fceArguments;
        try {
            fceArguments = JSON.parse(message?.function_call?.arguments);
        } catch (err: unknown) {
            log.error('Error parsing function call', { err });
            return lastMessage;
        }

        return {
            ...lastMessage,
            function_call: {
                ...lastMessage.function_call,
                arguments: fceArguments,
            },
        };
    }
}
