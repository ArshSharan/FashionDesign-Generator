const express = require('express');
const cors = require('cors');
const path = require('path');
const OpenAI = require('openai');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files

// Environment variables for API keys
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SITE_URL = process.env.SITE_URL || 'http://localhost:3001';
const SITE_NAME = process.env.SITE_NAME || 'Fashion Inspiration Generator';

if (!OPENROUTER_API_KEY && !OPENAI_API_KEY) {
    console.error('❌ Either OPENROUTER_API_KEY or OPENAI_API_KEY environment variable is required!');
    console.log('Please add to your .env file: OPENROUTER_API_KEY=your_openrouter_key_here');
    process.exit(1);
}

// Initialize OpenAI client
let openai;
if (OPENAI_API_KEY && OPENAI_API_KEY !== 'your_openai_api_key_here') {
    openai = new OpenAI({
        apiKey: OPENAI_API_KEY
    });
}

// Initialize OpenRouter client (using OpenAI SDK with custom base URL)
let openrouter;
if (OPENROUTER_API_KEY && OPENROUTER_API_KEY.startsWith('sk-or-v1-')) {
    openrouter = new OpenAI({
        apiKey: OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1'
    });
}

// Generate fashion images using multiple methods
app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        console.log('🎨 Generating AI image for prompt:', prompt);

        // Enhanced fashion prompt
        const enhancedPrompt = `${prompt}, high-quality fashion design, detailed textile patterns, professional fashion photography, studio lighting, elegant draping, beautiful fabric textures, handloom weaving inspiration, traditional craftsmanship meets modern design, vibrant colors, intricate patterns`;

        // Method 1: Try direct OpenAI first (most reliable for image generation)
        if (openai && OPENAI_API_KEY !== 'your_openai_api_key_here') {
            try {
                console.log('🔄 Trying direct OpenAI DALL-E...');
                
                const response = await openai.images.generate({
                    model: "dall-e-3",
                    prompt: enhancedPrompt,
                    size: "1024x1024",
                    quality: "standard",
                    n: 1,
                });

                const imageUrl = response.data[0].url;
                console.log('✅ REAL AI IMAGE GENERATED via OpenAI DALL-E!');
                
                return res.json({
                    success: true,
                    type: 'ai-generated-openai',
                    imageUrl: imageUrl,
                    aiDescription: 'AI-generated fashion design via OpenAI DALL-E',
                    prompt: prompt
                });

            } catch (openaiError) {
                console.error('❌ OpenAI DALL-E 3 failed:', openaiError.message);
                
                // Try DALL-E 2 if DALL-E 3 fails
                try {
                    console.log('🔄 Trying OpenAI DALL-E 2...');
                    
                    const response2 = await openai.images.generate({
                        model: "dall-e-2",
                        prompt: enhancedPrompt.substring(0, 1000),
                        size: "1024x1024",
                        n: 1,
                    });

                    const imageUrl = response2.data[0].url;
                    console.log('✅ AI IMAGE GENERATED via OpenAI DALL-E 2!');
                    
                    return res.json({
                        success: true,
                        type: 'ai-generated-dalle2',
                        imageUrl: imageUrl,
                        aiDescription: 'AI-generated fashion design via DALL-E 2',
                        prompt: prompt
                    });

                } catch (dalle2Error) {
                    console.error('❌ OpenAI DALL-E 2 also failed:', dalle2Error.message);
                }
            }
        }

        // Method 2: Try alternative image generation with Replicate API
        console.log('🔄 Trying alternative image generation...');
        try {
            // Use a free image generation service
            const stableDiffusionUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=800&height=600&seed=${Math.floor(Math.random() * 10000)}`;
            
            console.log('✅ Using Pollinations AI for image generation');
            
            return res.json({
                success: true,
                type: 'ai-generated-pollinations',
                imageUrl: stableDiffusionUrl,
                aiDescription: 'AI-generated fashion design via Pollinations AI',
                prompt: prompt
            });

        } catch (alternativeError) {
            console.error('❌ Alternative AI generation failed:', alternativeError.message);
        }

        // Method 2: Generate AI description and use it with a simple design
        console.log('🔄 Generating AI description instead...');
        
        let aiDescription = `Fashion design inspiration for: ${prompt}`;
        
        if (openrouter) {
            try {
                const descResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'HTTP-Referer': SITE_URL,
                        'X-Title': SITE_NAME,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'google/gemini-2.0-flash-exp',
                        messages: [{
                            role: 'user',
                            content: `Create a detailed fashion design description for handloom weavers based on: "${prompt}". Include colors, patterns, textures, and weaving techniques. Be specific and inspiring.`
                        }],
                        max_tokens: 400
                    })
                });

                if (descResponse.ok) {
                    const descData = await descResponse.json();
                    aiDescription = descData.choices[0].message.content;
                    console.log('✅ Generated AI description');
                }
            } catch (descError) {
                console.log('⚠️ Description generation failed, using fallback');
            }
        }

        // Create a simple SVG design based on the prompt
        console.log('🎨 Creating custom SVG design...');
        
        const colors = ['#4F46E5', '#7C3AED', '#DB2777', '#DC2626', '#EA580C', '#D97706'];
        const primaryColor = colors[Math.floor(Math.random() * colors.length)];
        const secondaryColor = colors[Math.floor(Math.random() * colors.length)];
        
        let patternId = 'minimal';
        let patternDef = `<rect width="80" height="80" fill="${primaryColor}"/>
            <line x1="0" y1="40" x2="80" y2="40" stroke="${secondaryColor}" stroke-width="2"/>
            <line x1="40" y1="0" x2="40" y2="80" stroke="${secondaryColor}" stroke-width="2"/>`;
        
        if (prompt.toLowerCase().includes('geometric')) {
            patternId = 'geo';
            patternDef = `<rect width="100" height="100" fill="${primaryColor}"/>
                <rect width="50" height="50" fill="${secondaryColor}"/>
                <rect x="50" y="50" width="50" height="50" fill="${secondaryColor}"/>`;
        }
        
        if (prompt.toLowerCase().includes('floral') || prompt.toLowerCase().includes('flower')) {
            patternId = 'floral';
            patternDef = `<rect width="120" height="120" fill="${primaryColor}"/>
                <circle cx="60" cy="60" r="25" fill="${secondaryColor}" opacity="0.7"/>
                <circle cx="30" cy="30" r="15" fill="${secondaryColor}" opacity="0.5"/>`;
        }

        const svgDesign = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="100" height="100">
                    ${patternDef}
                </pattern>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:0.8" />
                    <stop offset="100%" style="stop-color:${secondaryColor};stop-opacity:0.6" />
                </linearGradient>
            </defs>
            <rect width="800" height="600" fill="url(#grad)"/>
            <rect x="50" y="50" width="700" height="500" fill="url(#${patternId})" opacity="0.8" rx="20"/>
            <text x="400" y="320" font-family="serif" font-size="36" fill="white" text-anchor="middle" font-weight="bold">Fashion Design</text>
            <text x="400" y="360" font-family="serif" font-size="18" fill="white" text-anchor="middle" opacity="0.9">AI-Enhanced Pattern Design</text>
        </svg>`;

        const imageBase64 = 'data:image/svg+xml;base64,' + Buffer.from(svgDesign).toString('base64');
        
        console.log('✅ SVG design created successfully');

        res.json({
            success: true,
            type: 'ai-enhanced-design',
            imageUrl: imageBase64,
            aiDescription: aiDescription,
            prompt: prompt
        });
        
        console.log('✅ Response sent to client');

    } catch (error) {
        console.error('❌ Critical error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error: ' + error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    const hasApiKey = !!(
        (OPENROUTER_API_KEY && OPENROUTER_API_KEY.startsWith('sk-or-v1-')) ||
        (OPENAI_API_KEY && OPENAI_API_KEY !== 'your_openai_api_key_here')
    );
    
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        hasApiKey: hasApiKey,
        hasOpenRouterKey: !!(OPENROUTER_API_KEY && OPENROUTER_API_KEY.startsWith('sk-or-v1-')),
        hasOpenAIKey: !!(OPENAI_API_KEY && OPENAI_API_KEY !== 'your_openai_api_key_here')
    });
});

// Test API connection
app.get('/api/test-connection', async (req, res) => {
    try {
        if (openrouter && OPENROUTER_API_KEY.startsWith('sk-or-v1-')) {
            // Test OpenRouter connection
            const response = await fetch('https://openrouter.ai/api/v1/models', {
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': SITE_URL,
                    'X-Title': SITE_NAME
                }
            });
            
            if (response.ok) {
                res.json({ 
                    success: true, 
                    message: 'OpenRouter API connection successful',
                    service: 'openrouter',
                    timestamp: new Date().toISOString()
                });
                return;
            }
        }
        
        if (openai && OPENAI_API_KEY !== 'your_openai_api_key_here') {
            // Test OpenAI connection with a simple request
            const response = await openai.models.list();
            res.json({ 
                success: true, 
                message: 'OpenAI API connection successful',
                service: 'openai',
                timestamp: new Date().toISOString()
            });
        } else {
            res.json({ 
                success: false, 
                message: 'No API keys configured',
                service: 'none',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'API connection failed',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 Fashion Inspiration Generator Server Started!');
    console.log(`📍 Server running at: http://localhost:${PORT}`);
    console.log('🔑 OpenRouter API Key configured:', (OPENROUTER_API_KEY && OPENROUTER_API_KEY.startsWith('sk-or-v1-')) ? '✅ Yes' : '❌ No');
    console.log('🔑 OpenAI API Key configured:', (OPENAI_API_KEY && OPENAI_API_KEY !== 'your_openai_api_key_here') ? '✅ Yes' : '❌ No');
    console.log('');
    console.log('📖 Available endpoints:');
    console.log('  GET  /              - Main application');
    console.log('  POST /api/generate-image - Generate fashion images');
    console.log('  GET  /api/health    - Health check');
    console.log('  GET  /api/test-connection - Test API connection');
    console.log('');
    
    if (!OPENROUTER_API_KEY || !OPENROUTER_API_KEY.startsWith('sk-or-v1-')) {
        console.log('⚠️  To enable OpenRouter AI image generation, add your API key to the .env file:');
        console.log('   OPENROUTER_API_KEY=your_openrouter_key_here');
        console.log('   Get your API key from: https://openrouter.ai/keys');
        console.log('');
    }
    
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
        console.log('⚠️  To enable OpenAI image generation, add your API key to the .env file:');
        console.log('   OPENAI_API_KEY=your_openai_api_key_here');
        console.log('   Get your API key from: https://platform.openai.com/account/api-keys');
        console.log('');
    }
});

module.exports = app;