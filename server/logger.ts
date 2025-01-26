import fs from 'fs';
import path from 'path';

const logFile = path.join(process.cwd(), 'server.log');

export function log(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;

    console.log(logMessage);
    fs.appendFileSync(logFile, logMessage);
}