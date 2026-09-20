const fs = require('fs');
require('dotenv').config({ path: 'backend/.env' });

async function listModels() {
  const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await res.json();
  if (data.models) {
    console.log('Available models:');
    for (const m of data.models) {
      if (m.supportedGenerationMethods?.includes('generateContent')) {
        console.log(`- ${m.name} (${m.displayName})`);
      }
    }
  } else {
    console.error('Failed to list models:', data);
  }
}

listModels();
