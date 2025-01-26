import express from 'express';
import next from 'next';
import { log } from './logger';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = express();

    server.use((req, res, next) => {
        log(`Request received: ${req.method} ${req.url}`);
        next();
    });

    server.all('*', (req, res) => {
        return handle(req, res);
    });

    const port = process.env.PORT || 3000;
    server.listen(port, (err?: any) => {
        if (err) throw err;
        log(`> Ready on http://localhost:${port}`);
    });
});