import Airtable from 'airtable'

const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID)

// ── INVENTORY ──────────────────────────────────────────────────

export async function getInventory() {
  const records = await base('Inventory').select({ view: 'Grid view' }).all()
  return records.map(r => ({
    id: r.id,
    name:        r.fields.Name        || '',
    icon:        r.fields.Icon        || '📦',
    category:    r.fields.Category    || 'Pantry',
    cur:         r.fields.CurrentQty  || 0,
    unit:        r.fields.Unit        || 'units',
    par:         r.fields.ParLevel    || 0,
    reorder:     r.fields.ReorderQty  || 0,
    cost:        r.fields.UnitCost    || 0,
    condition:   r.fields.Condition   || 'good',
    stock_level: r.fields.StockLevel  || 'adequate',
    notes:       r.fields.Notes       || '',
    sup:         r.fields.SupplierName|| '',
  }))
}

export async function createInventoryItem(item) {
  const record = await base('Inventory').create({
    Name:         item.name,
    Icon:         item.icon        || '📦',
    Category:     item.category    || 'Pantry',
    CurrentQty:   Number(item.cur) || 0,
    Unit:         item.unit        || 'units',
    ParLevel:     Number(item.par) || 0,
    ReorderQty:   Number(item.reorder) || 0,
    UnitCost:     Number(item.cost) || 0,
    Condition:    item.condition   || 'good',
    StockLevel:   item.stock_level || 'adequate',
    Notes:        item.notes       || '',
    SupplierName: item.sup         || '',
  })
  return record.id
}

export async function updateInventoryItem(id, fields) {
  const airtableFields = {}
  if (fields.name        !== undefined) airtableFields.Name         = fields.name
  if (fields.icon        !== undefined) airtableFields.Icon         = fields.icon
  if (fields.category    !== undefined) airtableFields.Category     = fields.category
  if (fields.cur         !== undefined) airtableFields.CurrentQty   = Number(fields.cur)
  if (fields.unit        !== undefined) airtableFields.Unit         = fields.unit
  if (fields.par         !== undefined) airtableFields.ParLevel     = Number(fields.par)
  if (fields.reorder     !== undefined) airtableFields.ReorderQty   = Number(fields.reorder)
  if (fields.cost        !== undefined) airtableFields.UnitCost     = Number(fields.cost)
  if (fields.condition   !== undefined) airtableFields.Condition    = fields.condition
  if (fields.stock_level !== undefined) airtableFields.StockLevel   = fields.stock_level
  if (fields.notes       !== undefined) airtableFields.Notes        = fields.notes
  if (fields.sup         !== undefined) airtableFields.SupplierName = fields.sup
  await base('Inventory').update(id, airtableFields)
}

export async function deleteInventoryItem(id) {
  await base('Inventory').destroy(id)
}

// ── SUPPLIERS ──────────────────────────────────────────────────

export async function getSuppliers() {
  const records = await base('Suppliers').select({ view: 'Grid view' }).all()
  return records.map(r => ({
    id:       r.id,
    name:     r.fields.Name     || '',
    phone:    r.fields.Phone    || '',
    email:    r.fields.Email    || '',
    leadTime: r.fields.LeadTime || '',
  }))
}

export async function createSupplier(sup) {
  const record = await base('Suppliers').create({
    Name:     sup.name,
    Phone:    sup.phone    || '',
    Email:    sup.email    || '',
    LeadTime: sup.leadTime || '',
  })
  return record.id
}

export async function updateSupplier(id, fields) {
  const f = {}
  if (fields.name     !== undefined) f.Name     = fields.name
  if (fields.phone    !== undefined) f.Phone    = fields.phone
  if (fields.email    !== undefined) f.Email    = fields.email
  if (fields.leadTime !== undefined) f.LeadTime = fields.leadTime
  await base('Suppliers').update(id, f)
}

export async function deleteSupplier(id) {
  await base('Suppliers').destroy(id)
}
