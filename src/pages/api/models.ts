import type { NextApiRequest, NextApiResponse } from 'next'
import { Ollama } from 'ollama'

const ollama = new Ollama()

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method === 'GET') {
        try {
            const models = await ollama.list()
            const userModels = models.models.filter((model: any) => model.name.startsWith('0xroyce/'))
            res.status(200).json(userModels)
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch models' })
        }
    } else {
        res.setHeader('Allow', ['GET'])
        res.status(405).end(`Method ${req.method} Not Allowed`)
    }
}