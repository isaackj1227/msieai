export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { imageBase64, mimeType, notes } = req.body
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' })
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY not set' })

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        max_tokens: 1500,
        temperature: 0,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: 'data:' + (mimeType || 'image/jpeg') + ';base64,' + imageBase64
              }
            },
            {
              type: 'text',
              text: 'You are a restaurant inventory AI. Analyze this image and return ONLY a raw JSON object, no markdown, no explanation.\n\nSchema: {"scene_description":"string","items":[{"name":"string","icon":"emoji","category":"Protein|Seafood|Produce|Dairy|Sauce|Pantry|Frozen|Beverage|Supplies","estimated_quantity":0,"unit":"kg|lb|L|units|boxes|bags|bottles|cans|flats|bundles","confidence":"high|medium|low","condition":"fresh|good|aging|poor","stock_level":"critical|low|adequate|overstocked","notes":"string"}],"alerts":["string"],"overall_assessment":"string"}' + (notes ? '\n\nContext: ' + notes : '')
            }
          ]
        }]
      })
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
    
    const text = data?.choices?.[0]?.message?.content
    if (!text) throw new Error('Empty response from Groq')

    let raw = text.trim()
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const s = raw.indexOf('{'), e = raw.lastIndexOf('}')
    if (s === -1 || e === -1) throw new Error('No JSON found: ' + raw.slice(0, 200))
    
    return res.status(200).json(JSON.parse(raw.slice(s, e + 1)))
  } catch (err) {
    console.error('Groq error:', err)
    return res.status(500).json({ error: err.message || 'Analysis failed' })
  }
}
