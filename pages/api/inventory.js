import { getInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem } from '../../lib/airtable'

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const items = await getInventory()
      return res.status(200).json(items)
    }

    if (req.method === 'POST') {
      const id = await createInventoryItem(req.body)
      return res.status(201).json({ id })
    }

    if (req.method === 'PATCH') {
      const { id, ...fields } = req.body
      await updateInventoryItem(id, fields)
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'DELETE') {
      await deleteInventoryItem(req.body.id)
      return res.status(200).json({ ok: true })
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Inventory API error:', err)
    res.status(500).json({ error: err.message })
  }
}
