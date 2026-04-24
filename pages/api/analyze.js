// Vision Analysis API — Google Gemini 2.5 Flash (FREE tier)
// Get your free API key at: aistudio.google.com -> Get API Key

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { imageBase64, mimeType, notes } = req.body
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' })

  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GOOGLE_API_KEY not set in environment variables' })

  const prompt = `You are a restaurant inventory AI. Analyze this image and return ONLY a raw JSON object with no markdown fences and no explanation.

Schema:
{
  "scene_description": "brief description",
  "items": [
    {
      "name": "item name",
      "icon": "single emoji",
      "category": "Protein|Seafood|Produce|Dairy|Sauce|Pantry|Frozen|Beverage|Supplies",
      "estimated_quantity": 0,
      "unit": "kg|lb|L|units|boxes|bags|bottles|cans|flats|bundles",
      "confidence": "high|medium|low",
      "condition": "fresh|good|aging|poor",
      "stock_level": "critical|low|adequate|overstocked",
      "notes": "brief observation"
    }
  ],
  "alerts": ["urgent alerts if any"],
  "overall_assessment": "1-2 sentence summary"
}${notes ? '\n\nContext: ' + notes : ''}`

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } },
              { text: prompt }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
        })
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      throw new Error('Gemini API error ' + response.status + ': ' + errText.slice(0, 300))
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Empty response from Gemini')

    let jsonStr = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const s = jsonStr.indexOf('{'), e = jsonStr.lastIndexOf('}')
    if (s === -1 || e === -1) throw new Error('No JSON in response: ' + text.slice(0, 200))

    return res.status(200).json(JSON.parse(jsonStr.slice(s, e + 1)))

  } catch (err) {
    console.error('Gemini error:', err)
    return res.status(500).json({ error: err.message || 'Analysis failed' })
  }
}
