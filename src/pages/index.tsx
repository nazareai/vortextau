import React, { useState, useEffect, useRef } from 'react'
import { Plus as PlusIcon, Send as SendIcon, Edit as EditIcon, Trash as TrashIcon, AlertCircle as AlertIcon, Menu as MenuIcon, Share as ShareIcon, Info as InfoIcon } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Message = {
    role: 'user' | 'assistant';
    content: string;
}

type Chat = {
    id: string;
    title: string;
    messages: Message[];
}

type Model = {
    name: string;
    details: {
        parameter_size: string;
        quantization_level: string;
    };
}

export default function VortexTau() {
    const [models, setModels] = useState<Model[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [chats, setChats] = useState<Chat[]>([]);
    const [currentChat, setCurrentChat] = useState<Chat | null>(null);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isModelLoading, setIsModelLoading] = useState(true);
    const [streamingContent, setStreamingContent] = useState('');
    const [editingChatId, setEditingChatId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);
    const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);

    const MAX_INPUT_LENGTH = 5000;

    useEffect(() => {
        console.log('Component mounted. Fetching models and loading chats...');
        fetchModels();
        loadChatsFromStorage();

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [currentChat, streamingContent, isLoading]);

    useEffect(() => {
        console.log('Chats state updated:', chats);
        saveChatsToStorage();
    }, [chats]);

    const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'vortextau-chats') {
            console.log('Local storage for chats changed externally');
            loadChatsFromStorage();
        }
    };

    const fetchModels = async () => {
        setIsModelLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/models');
            if (!response.ok) {
                throw new Error('Failed to fetch models');
            }
            const data = await response.json();
            console.log('Fetched models:', data);
            setModels(data);
            
            // Set default model - replace 'llama2' with your preferred default model name
            const defaultModel = '0xroyce/plutus:latest';
            const modelExists = data.some((model: Model) => model.name === defaultModel);
            
            if (modelExists) {
                setSelectedModel(defaultModel);
            } else if (data.length > 0) {
                setSelectedModel(data[0].name);
            }
        } catch (error) {
            console.error('Error fetching models:', error);
            setError('Failed to load models. Please try again later.');
        } finally {
            setIsModelLoading(false);
        }
    };

    const loadChatsFromStorage = () => {
        console.log('Loading chats from storage');
        const savedChats = localStorage.getItem('vortextau-chats') || sessionStorage.getItem('vortextau-chats');
        if (savedChats) {
            try {
                const parsedChats = JSON.parse(savedChats);
                console.log('Loaded chats:', parsedChats);
                setChats(parsedChats);
                if (parsedChats.length > 0 && !currentChat) {
                    setCurrentChat(parsedChats[0]);
                }
            } catch (error) {
                console.error('Error parsing saved chats:', error);
                setError('Failed to load saved chats. Starting with a new session.');
                setChats([]);
            }
        } else {
            console.log('No saved chats found in storage');
        }
    };

    const saveChatsToStorage = () => {
        console.log('Saving chats to storage:', chats);
        const chatsJSON = JSON.stringify(chats);
        try {
            localStorage.setItem('vortextau-chats', chatsJSON);
            sessionStorage.setItem('vortextau-chats', chatsJSON);
        } catch (error) {
            console.error('Error saving chats to storage:', error);
            setError('Failed to save chats. Your conversation may not persist after closing the browser.');
        }
    };

    const createNewChat = () => {
        console.log('Creating new chat');
        const newChat: Chat = {
            id: Date.now().toString(),
            title: 'New Chat',
            messages: []
        };
        setChats(prevChats => {
            console.log('Updating chats state with new chat:', newChat);
            return [newChat, ...prevChats];
        });
        setCurrentChat(newChat);
        setIsSidebarOpen(false);
        return newChat;
    };

    const selectChat = (chat: Chat) => {
        console.log('Selecting chat:', chat);
        setCurrentChat(chat);
        setIsSidebarOpen(false);
    };

    const startEditingChat = (chatId: string, currentTitle: string) => {
        setEditingChatId(chatId);
        setEditingTitle(currentTitle);
    };

    const saveEditedChatTitle = () => {
        if (editingChatId) {
            console.log('Saving edited chat title:', editingTitle);
            setChats(prevChats =>
                prevChats.map(chat =>
                    chat.id === editingChatId ? { ...chat, title: editingTitle } : chat
                )
            );
            if (currentChat && currentChat.id === editingChatId) {
                setCurrentChat(prevChat => prevChat ? { ...prevChat, title: editingTitle } : null);
            }
            setEditingChatId(null);
        }
    };

    const deleteChat = (chatId: string) => {
        console.log('Deleting chat:', chatId);
        setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
        if (currentChat && currentChat.id === chatId) {
            setCurrentChat(null);
        }
    };

    const performSearch = async (query: string) => {
        console.log('Performing search for query:', query);
        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const data = await response.json();
            console.log('Search results:', data.results);
            return data.results;
        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim() || !selectedModel) return;
        if (input.length > MAX_INPUT_LENGTH) return;
    
        let chat = currentChat;
        if (!chat) {
            chat = createNewChat();
        }
    
        const newMessage: Message = { role: 'user', content: input };
        const updatedChat = {
            ...chat,
            messages: [...chat.messages, newMessage]
        };
        setCurrentChat(updatedChat);
        setChats(prevChats => prevChats.map(c => c.id === updatedChat.id ? updatedChat : c));
        setInput('');
        setIsLoading(true);
        setStreamingContent('');
        setError(null);
    
        try {
            // Always search for current information for relevant queries
            if (input.toLowerCase().includes('president') || 
                input.toLowerCase().includes('weather') || 
                input.toLowerCase().includes('news') ||
                input.toLowerCase().includes('current') ||
                input.toLowerCase().includes('latest') ||
                input.toLowerCase().includes('today')) {
                
                console.log('Query requires current information, performing search...');
                const searchResults = await performSearch(input);
                
                if (searchResults && searchResults.length > 0) {
                    console.log('Search results found:', searchResults);
                    
                    // Instead of adding search results to chat history, use them directly in the prompt
                    const searchContext = searchResults.map((result: any) => 
                        `Source: ${result.title}\n${result.snippet}\n`
                    ).join('\n');

                    // Create the final prompt that forces the model to use the search results
                    const finalPrompt = `Here is some current information about the topic:\n\n${searchContext}\n\nBased ONLY on the information provided above (not your existing knowledge), provide a clear and concise answer to this question: ${input}. Format the response as a direct answer without mentioning the sources or that you're using provided information.`;
                    
                    await sendMessageToChat(finalPrompt, updatedChat);
                    return;
                }
            }

            // If no search results or not a current events query, proceed with normal processing
            if (!isThinkingEnabled) {
                if (/^(hi|hello|hey)\.?$/i.test(input)) {
                    await sendMessageToChat("User has greeted you with " + input, updatedChat);
                } else {
                    await sendMessageToChat(input, updatedChat);
                }
            } else {
                const classifyPrompt = `Given the user's input: "${input}", classify it into one of the following intents: 
                [greeting, farewell, question, task, complex_task, riddle, coded_message, other]. Only provide the intent as a single word from the list.
                Do not include any extra text.`;
                const intentResponse = await runPrompt(classifyPrompt);
                const intent = intentResponse.trim().toLowerCase();
                console.log("************************\n\n"+intent+"\n\n************************")
    
                if (/^(greeting|farewell|other)\.?$/i.test(intent)) {
                    const response = await runPrompt("User said " + input + " which is a greeting so just greet him without anything else.");
                    await sendMessageToChat(response, updatedChat);
                } else if (/^(question|task|complex_task)\.?$/i.test(intent)) {
                    const questionsPrompt = `Given the task: "${input}", consider the following:
                - if generating additional questions would help provide a better response, generate up to 5 relevant questions that would aid in completing this task. Each question should be concise and directly related to the task.
                - if generating next best action would lead into better response and generate up to 5 next best actions. Each action should be concise and directly related to the task.
                - always provide a clear and concise response. 
                - If additional questions or generating next best actions are not necessary, proceed to provide a direct and appropriate response to the user's input.`;
                    const questionsResponse = await runPrompt(questionsPrompt);
                    const questions = questionsResponse.split('\n').filter(q => q.trim() !== '').slice(0, 5);
    
                    if (questions.length === 0) {
                        await sendMessageToChat(questionsResponse, updatedChat);
                    } else {
                        let thinkingProcess = '';
                        let answers: string[] = [];
    
                        for (const question of questions) {
                            thinkingProcess += `Assistant: Thinking: ${question}\n`;
                            thinkingProcess += `Assistant: Processing: ...\n\n`;
                            setStreamingContent(thinkingProcess);
                            await new Promise(resolve => setTimeout(resolve, 1000));
    
                            const answer = await runPrompt(question);
                            answers.push(answer);
                        }
    
                        const synthesisPrompt = `Based on the following questions and answers, provide a comprehensive response to the original task: "${input}"\n\nQ&A:\n${questions.map((q, i) => `Q: ${q}\nA: ${answers[i]}`).join('\n\n')}`;
                        await sendMessageToChat(synthesisPrompt, updatedChat);
                    }
                } else if (/^coded_message|riddle\.?$/i.test(intent)) {
                    const codedMessagePrompt = `Analyze the following potential coded message:
        
                    "${input}"
                    
                    Follow these steps in your analysis:
                    1. List all items with their quantities.
                    2. Extract the numbers from the message.
                    3. Consider if these numbers could represent letters (A=1, B=2, C=3, etc., up to Z=26).
                    4. If a number-to-letter pattern seems possible:
                    a. Map each number to its corresponding letter.
                    b. Combine these letters to see if they form a word or phrase.
                    5. Look for other patterns or codes (e.g., first letter of each word, alternating items, etc.).
                    6. If multiple interpretations are possible, list them in order of likelihood.
                    7. Provide your final decoded message or messages, if any are found.
                    8. Explain your reasoning throughout the process.
                    
                    Present your analysis in a clear, step-by-step format.`;
                    
                    const response = await runPrompt(codedMessagePrompt);
                    await sendMessageToChat(response, updatedChat);
                            
                } else {
                    const response = await runPrompt(input);
                    await sendMessageToChat(response, updatedChat);
                }
            }
        } catch (error) {
            console.error('Error in chat process:', error);
            setError('Failed to process the message. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const runPrompt = async (prompt: string): Promise<string> => {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: selectedModel,
                message: prompt,
                history: []
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get response from model');
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('ReadableStream not supported');
        }

        let result = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') break;
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.content) {
                            result += parsed.content;
                        }
                    } catch (e) {
                        console.error('Error parsing SSE data:', e);
                    }
                }
            }
        }

        return result;
    };

    const sendMessageToChat = async (message: string, chat: Chat) => {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: selectedModel,
                message: message,
                history: chat.messages  // Include full chat history with search results
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get response from model');
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('ReadableStream not supported');
        }

        let accumulatedContent = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        break;
                    }
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.content) {
                            accumulatedContent += parsed.content;
                            setStreamingContent(accumulatedContent);
                        }
                    } catch (e) {
                        console.error('Error parsing SSE data:', e);
                    }
                }
            }
        }

        // Create the final assistant message
        const assistantMessage: Message = { role: 'assistant', content: accumulatedContent };

        // Update the chat with the new message
        const finalChat = {
            ...chat,
            messages: [...chat.messages, assistantMessage]
        };
        setCurrentChat(finalChat);
        setChats(prevChats => prevChats.map(c => c.id === finalChat.id ? finalChat : c));

        // Clear the streaming content as it's now part of the chat messages
        setStreamingContent('');
    };

    const ShareModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                <h2 className="text-2xl font-bold mb-4">Share this chat</h2>
                <div className="mb-4">
                    <label htmlFor="share-link" className="block text-sm font-medium text-gray-700 mb-2">
                        Shareable Link
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                        <input
                            type="text"
                            id="share-link"
                            name="share-link"
                            className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md border border-gray-300 text-sm"
                            value={shareUrl || ''}
                            readOnly
                        />
                        <button
                            onClick={() => {
                                if (shareUrl) {
                                    navigator.clipboard.writeText(shareUrl);
                                }
                            }}
                            className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                        >
                            Copy
                        </button>
                    </div>
                </div>
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={() => setIsShareModalOpen(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                    >
                        Close
                    </button>
                    <button
                        onClick={() => {
                            if (shareUrl) {
                                navigator.clipboard.writeText(shareUrl);
                            }
                            setIsShareModalOpen(false);
                        }}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                    >
                        Copy & Close
                    </button>
                </div>
            </div>
        </div>
    );

    const shareChat = async (chatId: string) => {
        try {
            const chatToShare = chats.find(chat => chat.id === chatId);
            if (!chatToShare) {
                throw new Error('Chat not found');
            }

            const response = await fetch('/api/share-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(chatToShare)
            });

            if (!response.ok) {
                throw new Error('Failed to share chat');
            }

            const { shareId } = await response.json();
            const url = `${window.location.origin}?share=${shareId}`;
            setShareUrl(url);
            setIsShareModalOpen(true);  // Open the modal when the URL is set
        } catch (error) {
            console.error('Error sharing chat:', error);
            setError('Failed to share chat. Please try again.');
        }
    };

    const loadSharedChat = async (shareId: string) => {
        try {
            const response = await fetch(`/api/shared-chat/${shareId}`);
            if (!response.ok) {
                throw new Error('Failed to load shared chat');
            }

            const sharedChat = await response.json();
            setChats(prevChats => {
                // Check if the chat already exists
                const chatExists = prevChats.some(chat => chat.id === sharedChat.id);
                if (chatExists) {
                    return prevChats; // Don't add if it already exists
                }
                return [sharedChat, ...prevChats];
            });
            setCurrentChat(sharedChat);
        } catch (error) {
            console.error('Error loading shared chat:', error);
            setError('Failed to load shared chat. Please check the URL and try again.');
        }
    };

    const ThinkingToggle = () => {
        const [showTooltip, setShowTooltip] = useState(false);

        return (
            <div className="flex items-center mb-2 relative">
                <span className="mr-2 text-sm">Thinking (beta):</span>
                <button
                    onClick={() => setIsThinkingEnabled(!isThinkingEnabled)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 ${
                        isThinkingEnabled ? 'bg-black' : 'bg-gray-300'
                    }`}
                >
                    <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${
                            isThinkingEnabled ? 'translate-x-6' : 'translate-x-0'
                        }`}
                    ></div>
                </button>
                <div
                    className="ml-2 cursor-pointer"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                >
                    <InfoIcon size={16} />
                </div>
                {showTooltip && (
                    <div className="absolute left-0 top-full mt-2 p-2 bg-[#baff2a] border border-black shadow-lg rounded z-10 max-w-xs">
                        <p className="text-xs">
                            Thinking is a beta feature that allows the AI to think/reason.
                            Please note that when enabled, responses may take longer to generate.
                        </p>
                    </div>
                )}
            </div>
        );
    };

    useEffect(() => {
        const shareId = new URLSearchParams(window.location.search).get('share');
        if (shareId) {
            loadSharedChat(shareId);
        }
    }, []);

    return (
        <div className="flex flex-col h-screen bg-white text-black">
            {/* Header */}
            <header className="flex justify-between items-center p-2 border-b border-black">
                <h1 className="text-xl font-bold">VortexTau</h1>
                <div className="flex items-center">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="mr-2 p-1 border border-black hover:bg-gray-100 md:hidden"
                    >
                        <MenuIcon size={18} />
                    </button>
                    {isModelLoading ? (
                        <div className="p-1 text-sm">Loading models...</div>
                    ) : (
                        <div className="relative inline-block text-left">
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="p-1 border border-black text-sm bg-white appearance-none pr-8 w-full"
                            >
                                <option value="">Select a model</option>
                                {models.map((model) => (
                                    <option key={model.name} value={model.name}>
                                        {model.name}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                </svg>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Main content area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div className={`w-64 border-r border-black relative ${isSidebarOpen ? 'block' : 'hidden'} md:block`}>
                    <div className="overflow-y-auto absolute inset-0 bottom-8">
                        <div className="p-2">
                            <ThinkingToggle />
                            <button
                                onClick={createNewChat}
                                className="w-full bg-white hover:bg-gray-100 text-black font-bold py-1 px-2 border border-black text-sm mb-2"
                            >
                                <PlusIcon className="inline-block mr-1" size={14} />
                                New Chat
                            </button>
                            {chats.map(chat => (
                                <div key={chat.id} className="mb-1">
                                    {editingChatId === chat.id ? (
                                        <div className="flex items-center">
                                            <input
                                                type="text"
                                                value={editingTitle}
                                                onChange={(e) => setEditingTitle(e.target.value)}
                                                onBlur={saveEditedChatTitle}
                                                onKeyPress={(e) => e.key === 'Enter' && saveEditedChatTitle()}
                                                className="flex-1 p-1 text-sm border border-black bg-white"
                                                autoFocus
                                            />
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => selectChat(chat)}
                                            className={`p-1 text-sm flex items-center justify-between border border-black ${currentChat?.id === chat.id ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                                        >
                                            <span className="truncate flex-1">{chat.title}</span>
                                            <div className="flex items-center">
                                                <button
                                                    onClick={() => shareChat(chat.id)}
                                                    className="ml-1 p-1 hover:bg-gray-200"
                                                >
                                                    <ShareIcon size={12} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        startEditingChat(chat.id, chat.title);
                                                    }}
                                                    className="ml-1 p-1 hover:bg-gray-200"
                                                >
                                                    <EditIcon size={12} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteChat(chat.id);
                                                    }}
                                                    className="ml-1 p-1 hover:bg-gray-200"
                                                >
                                                    <TrashIcon size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Footer */}
                    <div className="absolute bottom-0 left-0 right-0 h-16 p-2 text-xs text-center border-t border-black bg-white">
                        <a href='https://linktr.ee/0xroyce' target='_blank'>0xroyce</a> @ <a href="https://nazareai.com" target='_blank'>NazareAI</a>
                    </div>
                </div>

                {/* Chat area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-2">
                        {currentChat?.messages.map((message, index) => (
                            <div key={index} className={`mb-2 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block border border-black ${message.role === 'user' ? 'bg-gray-200' : 'bg-white'}`}>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="markdown-content px-2 py-1"
                    components={{
                        p: ({node, ...props}) => <p className="whitespace-pre-wrap" {...props} />
                    }}
                >
                    {message.content}
                </ReactMarkdown>
            </span>
                            </div>
                        ))}
                        {streamingContent && (
                            <div className="mb-2 text-left">
            <span className="inline-block border border-black bg-white">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="markdown-content px-2 py-1"
                    components={{
                        p: ({node, ...props}) => <p className="whitespace-pre-wrap" {...props} />
                    }}
                >
                    {streamingContent}
                </ReactMarkdown>
            </span>
                            </div>
                        )}
                        {isLoading && !streamingContent && (
                            <div className="mb-2 text-left">
            <span className="inline-block border border-black bg-white">
                <div className="markdown-content px-2 py-1">
                    Processing<span className="animate-pulse">...</span>
                </div>
            </span>
                            </div>
                        )}
                        {error && (
                            <div className="mb-2 p-1 bg-white border border-black flex items-center">
                                <AlertIcon size={16} className="mr-1" />
                                {error}
                            </div>
                        )}
                    </div>
                    {isShareModalOpen && <ShareModal />}
                    <div className="border-t border-black h-16 p-2">
                        <div className="flex items-center">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Type your message..."
                                className="flex-1 p-1 mr-1 border border-black text-sm bg-white"
                                disabled={isLoading}
                                maxLength={MAX_INPUT_LENGTH}
                            />
                            <button
                                onClick={handleSendMessage}
                                className={`p-1 ${isLoading ? 'bg-gray-300' : 'bg-white hover:bg-gray-100'} border border-black text-black font-bold`}
                                disabled={isLoading || input.length > MAX_INPUT_LENGTH}
                            >
                                {isLoading ? 'Processing...' : <SendIcon size={18} />}
                            </button>
                        </div>
                        <div className="text-right text-xs mt-1">
                            {input.length}/{MAX_INPUT_LENGTH}
                        </div>
                    </div>
                </div>
            </div>
            {/* Debug information
            <div className="fixed bottom-0 right-0 p-2 bg-white border border-black text-xs">
                Chats: {chats.length} | Current: {currentChat?.id ?? 'None'}
            </div>
			 */}
        </div>
    );
}