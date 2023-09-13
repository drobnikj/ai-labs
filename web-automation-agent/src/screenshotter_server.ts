import express from 'express';
import http from 'node:http';
import { writeFile } from 'node:fs/promises';
import type { Page } from 'puppeteer';

const PORT = 4000; // TODO: apify view port
const PAGE_FILE_NAME = 'test.jpeg';

const DUMMY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page live view</title>
    <!--  Ensures page refresh every 1 sec  -->
     <meta http-equiv="refresh" content="1">
</head>
<body>
   <img src="${PAGE_FILE_NAME}" />
</body>
</html>`;

/**
 * Create server which serves screenshots from puppeteer page.
 * Uses this for server live view of the page in Apify live view.
 * This is experimental.
 */
export const createServer = async (page: Page) => {
    const app = express();
    const server = http.createServer(app);
    const client = await page.target().createCDPSession();

    let initialPage = true;

    app.get('/', async (req, res) => {
        if (initialPage) {
            const startOptions = {
                format: 'jpeg',
                quality: 50,
                everyNthFrame: 1,
            };
            client.on('Page.screencastFrame', async (frameObject) => {
                const buffer = Buffer.from(frameObject.data, 'base64');
                await writeFile('test.jpeg', buffer);
                await client.send('Page.screencastFrameAck', {
                    sessionId: frameObject.sessionId,
                });
            });
            await client.send('Page.startScreencast', startOptions);
            initialPage = false;
        }
        res.status(200).send(DUMMY_HTML);
    });

    app.get(`/${PAGE_FILE_NAME}`, (req, res, next) => {
        const options = {
            root: './',
            dotfiles: 'deny',
            headers: {
                'x-timestamp': Date.now(),
                'x-sent': true,
            },
        };
        res.sendFile(PAGE_FILE_NAME, options, (err) => {
            if (err) next(err);
            next();
        });
    });

    server.listen(PORT, () => {
        console.log(`Server listening on ${PORT}`);
    });

    return server;
};
