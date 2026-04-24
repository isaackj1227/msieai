export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { imageBase64, mimeType, notes } = req.body
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' })
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GOOGLE_API_KEY not set' })

  const prompt = `Analyze this restaurant inventory image. You MUST respond with ONLY a JSON object. No text before or after. No markdown. No explanation. Just the JSON object starting with { and ending with }.

Return this exact structure:
{
  "scene_description": "what you see",
  "items": [
    {
      "name": "ingredient name",
      "icon": "one emoji",
      "category": "Produce",
      "estimated_quantity": 5,
      "unit": "kg",
      "confidence": "high",
      "condition": "good",
      "stock_level": "adequate",
      "notes": "observation"
    }
  ],
  "alerts": [],
  "overall_assessment": "summary"
}${notes ? '\n\nContext: ' + notes : ''}`

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 2000 * attempt))
    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [
              { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } },
              { text: prompt }
            ]}],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 2048,
              responseMimeType: 'application/json'
            }
          })
        }
      )
      if (response.status === 503) continue
      if (!response.ok) {
        const t = await response.text()
        return res.status(500).json({ error: 'Gemini error ' + response.status + ': ' + t.slice(0, 200) })
      }
      const data = await response.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) return res.status(500).json({ error: 'Empty response from Gemini' })

      let jsonStr = text.trim()
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
      const s = jsonStr.indexOf('{')
      const e = jsonStr.lastIndexOf('}')
      if (s === -1 || e === -1) {
        return res.status(500).json({ error: 'No JSON found. Raw: ' + jsonStr.slice(0, 200) })
      }
      const parsed = JSON.parse(jsonStr.slice(s, e + 1))
      return res.status(200).json(parsed)
    } catch (err) {
      if (attempt === 2) return res.status(500).json({ error: err.message || 'Analysis failed' })
    }
  }
  return res.status(503).json({ error: 'Gemini busy, please try again in a moment' })
}
