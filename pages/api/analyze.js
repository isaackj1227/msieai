export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { imageBase64, mimeType, notes } = req.body
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' })
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GOOGLE_API_KEY not set' })

  const prompt = `You are a restaurant inventory AI. Analyze this image and return ONLY a raw JSON object, no markdown, no explanation.
Schema: {"scene_description":"string","items":[{"name":"string","icon":"emoji","category":"Protein|Seafood|Produce|Dairy|Sauce|Pantry|Frozen|Beverage|Supplies","estimated_quantity":0,"unit":"kg|lb|L|units|boxes|bags|bottles|cans|flats|bundles","confidence":"high|medium|low","condition":"fresh|good|aging|poor","stock_level":"critical|low|adequate|overstocked","notes":"string"}],"alerts":["string"],"overall_assessment":"string"}${notes ? '\nContext: ' + notes : ''}`

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
            generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
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
      let jsonStr = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
      const s = jsonStr.indexOf('{'), e = jsonStr.lastIndexOf('}')
      if (s === -1 || e === -1) return res.status(500).json({ error: 'No JSON in response' })
      return res.status(200).json(JSON.parse(jsonStr.slice(s, e + 1)))
    } catch (err) {
      if (attempt === 2) return res.status(500).json({ error: err.message || 'Analysis failed' })
    }
  }
  return res.status(503).json({ error: 'Gemini busy, please try again' })
}
