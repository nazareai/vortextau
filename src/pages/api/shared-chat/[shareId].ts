import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const { shareId } = req.query;
        const filePath = path.join(process.cwd(), 'data', 'shared-chats', `${shareId}.json`);

        if (fs.existsSync(filePath)) {
            const chatData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            res.status(200).json(chatData);
        } else {
            res.status(404).json({ message: 'Shared chat not found' });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}