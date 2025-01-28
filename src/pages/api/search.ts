import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { query } = req.body;
    const serpApiKey = process.env.SERP_API_KEY;

    console.log('🔍 Search API called with query:', query);
    console.log('🔑 SERP API key exists:', !!serpApiKey);

    if (!serpApiKey) {
        console.error('❌ SERP API key not configured');
        return res.status(500).json({ error: 'SERP API key not configured' });
    }

    try {
        const searchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${serpApiKey}`;
        console.log('🌐 Calling SERP API...');
        
        const response = await fetch(searchUrl);
        if (!response.ok) {
            console.error('🚫 SERP API response not ok:', response.status);
            throw new Error(`SERP API response not ok: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 Raw SERP API response received');

        const organicResults = data.organic_results?.slice(0, 3) || [];
        const searchResults = organicResults.map((result: any) => ({
            title: result.title,
            snippet: result.snippet,
            link: result.link
        }));

        console.log('✅ Processed search results:', searchResults);
        res.status(200).json({ results: searchResults });
    } catch (error) {
        console.error('❌ SERP API Error:', error);
        res.status(500).json({ error: 'Failed to fetch search results' });
    }
} 