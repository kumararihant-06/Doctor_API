import config from "./config/index.js";
import {buildApp} from './app.js';

const app = buildApp();

const server = app.listen(config.port, () => {
    console.log(`[server] listening on port ${config.port} (${config.env})`);

});

const shutdown = (signal) => {
    console.log(`[server] recieved ${signal}, shutting down`);
    server.close(() =>{
        console.log('[server] HTTP server closed');
        process.exit(0);
    });

    setTimeout(() => {
        console.log(`[server] forced shutdown after timeout`);
        process.exit(1);
    }, 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));