import type { NextApiRequest, NextApiResponse } from 'next'
import { Ollama } from 'ollama'
import fs from 'fs'
import path from 'path'

const ollama = new Ollama()

const logFile = path.join(process.cwd(), 'api-chat.log')
const chatStorageFile = path.join(process.cwd(), 'chat-storage.json')

function log(message: string) {
    const timestamp = new Date().toISOString()
    const logMessage = `${timestamp} - ${message}\n`
    console.log(logMessage.trim())
    fs.appendFileSync(logFile, logMessage)
}

function saveChatData(data: any) {
    try {
        fs.writeFileSync(chatStorageFile, JSON.stringify(data, null, 2))
        log('Chat data saved successfully')
    } catch (error) {
        log(`Error saving chat data: ${error}`)
    }
}

function loadChatData() {
    try {
        if (fs.existsSync(chatStorageFile)) {
            const data = fs.readFileSync(chatStorageFile, 'utf8')
            log('Chat data loaded successfully')
            return JSON.parse(data)
        }
    } catch (error) {
        log(`Error loading chat data: ${error}`)
    }
    return {}
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    log(`Received ${req.method} request to /api/chat`)

    if (req.method === 'POST') {
        const { model, message, history } = req.body
        log(`Chat request for model: ${model}, message length: ${message.length}, history length: ${history.length}`)

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        })

        try {
            log('Initiating Ollama chat stream')
            const stream = await ollama.chat({
                model,
                messages: [...history, { role: 'user', content: message }],
                stream: true,
            })

            let fullResponse = ''

            for await (const chunk of stream) {
                if (chunk.message) {
                    //log(`Sending chunk: ${JSON.stringify(chunk.message)}`)
                    res.write(`data: ${JSON.stringify(chunk.message)}\n\n`)
                    fullResponse += chunk.message.content
                }
            }

            // Save the chat data
            const chatData = loadChatData()
            if (!chatData[model]) {
                chatData[model] = []
            }
            chatData[model].push({
                timestamp: new Date().toISOString(),
                message,
                response: fullResponse,
            })
            saveChatData(chatData)

            log('Finished streaming Ollama chat response')
        } catch (error) {
            log(`Error in chat: ${error}`)
            console.error('Error in chat:', error)
            res.write(`data: ${JSON.stringify({ error: 'Failed to get response from model' })}\n\n`)
        } finally {
            log('Ending chat response stream')
            res.write('data: [DONE]\n\n')
            res.end()
        }
    } else if (req.method === 'GET') {
        // Endpoint to retrieve chat data
        const chatData = loadChatData()
        res.status(200).json(chatData)
    } else {
        log(`Method ${req.method} Not Allowed`)
        res.setHeader('Allow', ['POST', 'GET'])
        res.status(405).end(`Method ${req.method} Not Allowed`)
    }
}