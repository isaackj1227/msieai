import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../../lib/airtable'

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const suppliers = await getSuppliers()
      return res.status(200).json(suppliers)
    }
    if (req.method === 'POST') {
      const id = await createSupplier(req.body)
      return res.status(201).json({ id })
    }
    if (req.method === 'PATCH') {
      const { id, ...fields } = req.body
      await updateSupplier(id, fields)
      return res.status(200).json({ ok: true })
    }
    if (req.method === 'DELETE') {
      await deleteSupplier(req.body.id)
      return res.status(200).json({ ok: true })
    }
    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Suppliers API error:', err)
    res.status(500).json({ error: err.message })
  }
}
