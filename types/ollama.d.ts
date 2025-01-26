declare module 'ollama' {
    export class Ollama {
        list(): Promise<any>;
        chat(params: { model: string; messages: Array<{ role: string; content: string }> }): Promise<any>;
    }
}