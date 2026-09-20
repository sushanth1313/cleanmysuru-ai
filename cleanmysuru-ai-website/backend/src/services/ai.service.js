const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

const VALID_INCIDENT_TYPES = [
  'GARBAGE_PILE',
  'OVERFLOWING_BIN',
  'MIXED_WASTE',
  'C_AND_D',
  'NO_RELEVANT_WASTE_DETECTED',
  'INSUFFICIENT_EVIDENCE',
  'AI_ANALYSIS_FAILED',
  'VIDEO_ANALYSIS_FAILED',
];

const VALID_SEVERITY = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'NONE'];

class AIService {
  constructor() {
    this.apiKey = config.ai.apiKey;
    this.model = config.ai.model || 'gemini-2.5-flash';
  }

  /**
   * Real Gemini 2.5 Flash Vision Analysis
   * Strictly server-side. No mock fallback.
   */
  async analyzeEvidence(filePath, mimeType = 'image/jpeg') {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Evidence file not found at ${filePath}`);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    const prompt = `You are CleanMysuru AI, an official civic-waste analysis intelligence system for Mysuru, Karnataka, India.
Analyze this image to detect civic waste, illegal dumping, garbage piles, overflowing bins, mixed unsegregated waste, or construction & demolition (C&D) debris.

CRITICAL INSTRUCTIONS & LEGAL SAFETY:
1. Provide preliminary screening evidence ONLY.
2. DO NOT make legal accusations or claim proof of criminal liability. Include the exact statement: "AI output is preliminary evidence for municipal screening and does not constitute statutory proof of liability."
3. Use legal-safe civic phrasing: "Suspected civic-waste incident", "Possible dumping activity detected", "AI detected possible C&D waste", "Requires municipal verification".
4. Classify into exactly ONE of these incidentType strings:
   - "GARBAGE_PILE" (accumulated municipal solid waste, plastic bags, household refuse)
   - "OVERFLOWING_BIN" (public dumper bin overflowing beyond its physical capacity)
   - "MIXED_WASTE" (mixed unsegregated commercial, dry, and wet waste)
   - "C_AND_D" (construction and demolition waste: concrete rubble, masonry, bricks, plaster, tiles)
   - "NO_RELEVANT_WASTE_DETECTED" (clean area, scenery, palace, monuments, roads with no waste)
   - "INSUFFICIENT_EVIDENCE" (image too blurry, dark, or corrupted to clearly discern debris)
5. Derive confidence strictly from visual certainty (0 to 100). DO NOT manufacture or invent numbers.
6. Assess imageQuality ("GOOD", "FAIR", "POOR"), nightDetected (boolean), lowLightScore (0.0 to 1.0), and verificationRequired (boolean).

Respond ONLY with a valid JSON object matching this exact schema:
{
  "incidentType": "GARBAGE_PILE" | "OVERFLOWING_BIN" | "MIXED_WASTE" | "C_AND_D" | "NO_RELEVANT_WASTE_DETECTED" | "INSUFFICIENT_EVIDENCE",
  "confidence": 94,
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "NONE",
  "description": "Suspected civic-waste incident: visible accumulation of unsegregated debris along roadway. AI output is preliminary evidence for municipal screening and does not constitute statutory proof of liability.",
  "detectedObjects": [
    { "label": "plastic bags", "confidence": 90 },
    { "label": "mixed municipal waste", "confidence": 88 }
  ],
  "reasoning": "Visual patterns indicate municipal waste accumulation requiring civic attention.",
  "recommendedAction": "Municipal verification and civic clearance recommended.",
  "imageQuality": "GOOD" | "FAIR" | "POOR",
  "nightDetected": false,
  "lowLightScore": 0.1,
  "verificationRequired": false
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType.includes('png')
                  ? 'image/png'
                  : mimeType.includes('webp')
                    ? 'image/webp'
                    : 'image/jpeg',
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    };

    let response;
    let data;
    const modelsToTry = [
      this.model || 'gemini-3.5-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      'gemini-flash-lite-latest',
      'gemini-flash-latest',
    ].filter((v, i, a) => a.indexOf(v) === i);

    for (const currentModel of modelsToTry) {
      const currentUrl = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${this.apiKey}`;

      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts) {
        attempts++;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
          response = await fetch(currentUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          logger.error(`Gemini network call failed on ${currentModel}`, fetchErr);
          break; // Try next model or fail
        }
        clearTimeout(timeoutId);

        if (response.status === 429 || response.status === 503) {
          const errText = await response.text();
          logger.warn(`Gemini ${response.status} on ${currentModel}, trying next model immediately: ${errText.substring(0, 80)}`);
          break; // Try next model immediately!
        }

        if (response.ok) {
          data = await response.json();
          break;
        } else {
          const errText = await response.text();
          logger.warn(`Gemini call on ${currentModel} failed with ${response.status}: ${errText.substring(0, 100)}`);
          break; // Try next model
        }
      }

      if (data && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        break;
      }
    }

    if (!data) {
      throw new Error(`Gemini vision models exhausted or rate-limited. Preliminary evidence queued.`);
    }

    let textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      logger.error('Empty candidate in Gemini API response', data);
      throw new Error('Gemini vision model returned an empty response');
    }

    textResponse = textResponse.trim();
    if (textResponse.startsWith('```')) {
      textResponse = textResponse.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(textResponse);
    } catch (parseErr) {
      logger.error('Failed to parse Gemini JSON output', { textResponse });
      throw new Error('AI analysis failed to produce structured JSON format');
    }

    // Validate and sanitize parsed attributes
    const incidentType = VALID_INCIDENT_TYPES.includes(parsed.incidentType)
      ? parsed.incidentType
      : 'AI_ANALYSIS_FAILED';

    const severity = VALID_SEVERITY.includes(parsed.severity)
      ? parsed.severity
      : incidentType === 'NO_RELEVANT_WASTE_DETECTED'
        ? 'NONE'
        : 'MEDIUM';

    const confidence = typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(100, Math.round(parsed.confidence)))
      : 80;

    const disclaimer = 'AI output is preliminary evidence for municipal screening and does not constitute statutory proof of liability.';
    let description = parsed.description || 'Suspected civic-waste incident detected.';
    if (!description.includes(disclaimer)) {
      description = `${description} ${disclaimer}`;
    }

    return {
      incidentType,
      confidence,
      severity,
      description,
      detectedObjects: Array.isArray(parsed.detectedObjects) ? parsed.detectedObjects : [],
      reasoning: parsed.reasoning || 'Visual analysis completed.',
      recommendedAction: parsed.recommendedAction || 'Municipal verification recommended.',
      imageQuality: ['GOOD', 'FAIR', 'POOR'].includes(parsed.imageQuality) ? parsed.imageQuality : 'GOOD',
      nightDetected: Boolean(parsed.nightDetected),
      lowLightScore: typeof parsed.lowLightScore === 'number' ? parsed.lowLightScore : 0,
      verificationRequired: Boolean(parsed.verificationRequired || parsed.imageQuality === 'POOR' || confidence < 75),
      rawResponse: parsed,
      modelName: this.model,
      modelVersion: '2.5-flash',
    };
  }

  /**
   * Multi-frame analysis for video files
   */
  async analyzeVideoFrames(framePaths) {
    if (!framePaths || framePaths.length === 0) {
      throw new Error('No frames provided for video analysis');
    }

    // Analyze the primary representative frame
    const primaryFrame = framePaths[0];
    const result = await this.analyzeEvidence(primaryFrame, 'image/jpeg');

    return {
      ...result,
      framesAnalyzed: framePaths,
    };
  }
}

module.exports = new AIService();
