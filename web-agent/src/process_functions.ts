import fs from 'fs';

export async function process_functions({ page, nextStep }) {
    if ()
};

export async function do_next_step(page, context, next_step, links_and_inputs, element) {
    let message;
    let msg;
    let no_content = false;

    if (next_step.hasOwnProperty('function_call')) {
        const { function_call } = next_step;
        const function_name = function_call.name;
        let func_arguments;

        try {
            func_arguments = JSON.parse(function_call.arguments);
        } catch (e) {
            if (function_name === 'answer_user') {
                func_arguments = {
                    answer: function_call.arguments,
                };
            }
        }

        if (function_name === 'make_plan') {
            message = 'OK. Please continue according to the plan';
        } else if (function_name === 'read_file') {
            const { filename } = func_arguments;

            if (autopilot || await input(`\nGPT: I want to read the file ${filename}\nDo you allow this? (y/n): `) == 'y') {
                print();
                print(`${task_prefix}Reading file ${filename}`);

                if (fs.existsSync(filename)) {
                    let file_data = fs.readFileSync(filename, 'utf-8');
                    file_data = file_data.substring(0, context_length_limit);
                    message = file_data;
                } else {
                    message = 'ERROR: That file does not exist';
                }
            } else {
                print();
                message = 'ERROR: You are not allowed to read this file';
            }
        } else if (function_name === 'goto_url') {
            let { url } = func_arguments;

            print(`${task_prefix}Going to ${url}`);

            try {
                await page.goto(url, {
                    waitUntil: wait_until,
                });

                url = await page.url();

                message = `You are now on ${url}`;
            } catch (error) {
                message = check_download_error(error);
                message = message ?? 'There was an error going to the URL';
            }

            print(`${task_prefix}Scraping page...`);
            links_and_inputs = await get_tabbable_elements(page);
        } else if (function_name === 'click_link') {
            const link_id = func_arguments.pgpt_id;
            const link_text = func_arguments.text;

            if (!link_id) {
                message = 'ERROR: Missing parameter pgpt_id';
            } else if (!link_text) {
                message = '';
                context.pop();
                msg = {
                    role: 'user',
                    content: 'Please the correct link on the page. Remember to set both the text and the pgpt_id parameter.',
                };
            } else {
                const link = links_and_inputs.find((elem) => elem && elem.id == link_id);

                try {
                    print(`${task_prefix}Clicking link "${link.text}"`);

                    request_count = 0;
                    response_count = 0;
                    download_started = false;

                    if (!page.$(`.pgpt-element${link_id}`)) {
                        throw new Error('Element not found');
                    }

                    page.click(`.pgpt-element${link_id}`);

                    await wait_for_navigation(page);

                    const url = await page.url();

                    if (download_started) {
                        download_started = false;
                        message = 'Link clicked and file download started successfully!';
                        no_content = true;
                    } else {
                        message = `Link clicked! You are now on ${url}`;
                    }
                } catch (error) {
                    if (debug) {
                        print(error);
                    }
                    if (error instanceof TimeoutError) {
                        message = 'NOTICE: The click did not cause a navigation.';
                    } else {
                        const link_text = link ? link.text : '';

                        message = `Sorry, but link number ${link_id} (${link_text}) is not clickable, please select another link or another command. You can also try to go to the link URL directly with "goto_url".`;
                    }
                }
            }

            print(`${task_prefix}Scraping page...`);
            links_and_inputs = await get_tabbable_elements(page);
        } else if (function_name === 'type_text') {
            const { form_data } = func_arguments;
            let prev_input;

            for (const data of form_data) {
                const element_id = data.pgpt_id;
                const { text } = data;

                message = '';

                try {
                    element = await page.$(`.pgpt-element${element_id}`);

                    if (!prev_input) {
                        prev_input = element;
                    }

                    const name = await element.evaluate((el) => {
                        return el.getAttribute('name');
                    });

                    const type = await element.evaluate((el) => {
                        return el.getAttribute('type');
                    });

                    const tagName = await element.evaluate((el) => {
                        return el.tagName;
                    });

                    // ChatGPT sometimes tries to type empty string
                    // to buttons to click them
                    if (tagName === 'BUTTON' || type === 'submit' || type === 'button') {
                        func_arguments.submit = true;
                    } else {
                        prev_input = element;
                        await element.type(text);
                        const sanitized = text.replace('\n', ' ');
                        print(`${task_prefix}Typing "${sanitized}" to ${name}`);
                        message += `Typed "${text}" to input field "${name}"\n`;
                    }
                } catch (error) {
                    if (debug) {
                        print(error);
                    }
                    message += `Error typing "${text}" to input field ID ${data.element_id}\n`;
                }
            }

            if (func_arguments.submit !== false) {
                print(`${task_prefix}Submitting form`);

                try {
                    const form = await prev_input.evaluateHandle(
                        (input) => input.closest('form'),
                    );

                    await form.evaluate((form) => form.submit());
                    await wait_for_navigation(page);

                    const url = await page.url();

                    message += `Form sent! You are now on ${url}\n`;
                } catch (error) {
                    if (debug) {
                        print(error);
                    }
                    print(`${task_prefix}Error submitting form`);
                    message += 'There was an error submitting the form.\n';
                }

                print(`${task_prefix}Scraping page...`);
                links_and_inputs = await get_tabbable_elements(page);
            }
        } else if (function_name === 'answer_user') {
            let text = func_arguments.answer;

            if (!text) {
                text = func_arguments.summary;
            }

            print_current_cost();

            if (autopilot) {
                message = await input(`<!_RESPONSE_!>${JSON.stringify(text)}\n`);
            } else {
                message = await input(`\nGPT: ${text}\nYou: `);
            }

            print();
        } else {
            message = 'That is an unknown function. Please call another one';
        }

        message = message.substring(0, context_length_limit);
        msg = msg ?? {
            role: 'function',
            name: function_name,
            content: JSON.stringify({
                status: 'OK',
                message,
            }),
        };
    } else {
        print_current_cost();

        let next_content = next_step.content.trim();

        if (next_content === '') {
            next_content = '<empty response>';
        }

        if (autopilot) {
            message = await input(`<!_RESPONSE_!>${JSON.stringify(next_content)}\n`);
        } else {
            message = await input(`GPT: ${next_content}\nYou: `);
            print();
        }

        msg = {
            role: 'user',
            content: message,
        };
    }

    if (no_content !== true) {
        const page_content = await get_page_content(page);
        msg.content += `\n\n${page_content.substring(0, context_length_limit)}`;
    }

    msg.url = await page.url();

    next_step = await send_chat_message(msg, context);

    msg.content = message,

    context.push(msg);
    context.push(next_step);

    if (debug) {
        fs.writeFileSync('context.json', JSON.stringify(context, null, 2));
    }

    await do_next_step(page, context, next_step, links_and_inputs, element);
}
