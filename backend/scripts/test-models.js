const fs = require('fs');
require('dotenv').config({ path: 'backend/.env' });

const apiKey = process.env.AI_API_KEY;
const imgBase64 = fs.readFileSync('backend/test-assets/waste_dump.jpg').toString('base64');
const models = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
];

async function testAll() {
  for (const m of models) {
    const start = Date.now();
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: 'Identify waste type in this image as JSON: { "type": "..." }' },
                { inlineData: { mimeType: 'image/jpeg', data: imgBase64 } },
              ],
            },
          ],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });
      const txt = await res.text();
      console.log(`${m} -> Status: ${res.status} (${Date.now() - start}ms)`);
      if (res.ok) {
        console.log('   Response snippet:', txt.substring(0, 100));
      } else {
        console.log('   Error snippet:', txt.substring(0, 120));
      }
    } catch (e) {
      console.log(`${m} -> Network Error: ${e.message}`);
    }
  }
}

testAll();
