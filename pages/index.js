import { useState, useRef, useEffect, useCallback } from 'react'

// ── Constants ───────────────────────────────────────────────────
const CATEGORIES = ['Protein','Seafood','Produce','Dairy','Sauce','Pantry','Frozen','Beverage','Supplies']
const UNITS      = ['kg','lb','L','units','boxes','bags','bottles','cans','flats','bundles','cases']

const pct = (cur, par) => par > 0 ? Math.round((cur / par) * 100) : 0
const fmt = n => '$' + Number(n || 0).toFixed(2)

function status(cur, par) {
  const v = pct(cur, par)
  if (v <= 30) return { lbl:'Critical', color:'#ef5a5a', bg:'rgba(239,90,90,.12)' }
  if (v <= 60) return { lbl:'Low',      color:'#f5a623', bg:'rgba(245,166,35,.12)' }
  return               { lbl:'OK',       color:'#3ecf8e', bg:'rgba(62,207,142,.12)' }
}

// ── API helpers ─────────────────────────────────────────────────
const api = {
  getInventory:  ()           => fetch('/api/inventory').then(r => r.json()),
  addItem:       (item)       => fetch('/api/inventory', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(item) }).then(r => r.json()),
  updateItem:    (id, fields) => fetch('/api/inventory', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id,...fields}) }).then(r => r.json()),
  deleteItem:    (id)         => fetch('/api/inventory', { method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id}) }).then(r => r.json()),
  getSuppliers:  ()           => fetch('/api/suppliers').then(r => r.json()),
  addSupplier:   (sup)        => fetch('/api/suppliers', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(sup) }).then(r => r.json()),
  updateSupplier:(id, fields) => fetch('/api/suppliers', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id,...fields}) }).then(r => r.json()),
  deleteSupplier:(id)         => fetch('/api/suppliers', { method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id}) }).then(r => r.json()),
  analyze:       (body)       => fetch('/api/analyze',   { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) }).then(r => r.json()),
}

// ── Styles ──────────────────────────────────────────────────────
const SIDEBAR_W = 224
const C = {
  side:   { width:SIDEBAR_W, background:'#0d0d0d', borderRight:'1px solid rgba(255,255,255,.06)', display:'flex', flexDirection:'column', position:'fixed', top:0, left:0, bottom:0, zIndex:100 },
  main:   { marginLeft:SIDEBAR_W, minHeight:'100vh', display:'flex', flexDirection:'column' },
  bar:    { background:'rgba(10,10,10,.85)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,.06)', padding:'0 32px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 },
  page:   { padding:'28px 32px', maxWidth:1280, margin:'0 auto', width:'100%' },
  card:   { background:'#141414', border:'1px solid rgba(255,255,255,.06)', borderRadius:14, marginBottom:16, boxShadow:'0 1px 2px rgba(0,0,0,.4)' },
  ch:     { padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,.06)', display:'flex', alignItems:'center', justifyContent:'space-between' },
  input:  { background:'#0d0d0d', border:'1px solid rgba(255,255,255,.08)', borderRadius:10, color:'#f4f2ee', fontFamily:'inherit', fontSize:13, padding:'9px 12px', width:'100%' },
  numIn:  { background:'#0d0d0d', border:'1px solid rgba(255,255,255,.08)', borderRadius:10, color:'#f4f2ee', fontFamily:'inherit', fontSize:13, padding:'8px 10px', width:80 },
  sel:    { background:'#0d0d0d', border:'1px solid rgba(255,255,255,.08)', borderRadius:10, color:'#f4f2ee', fontFamily:'inherit', fontSize:13, padding:'9px 10px', cursor:'pointer' },
  tag:    (c,b) => ({ display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:600, color:c, background:b, letterSpacing:'-.005em' }),
  alert:  (c,b,br) => ({ padding:'11px 14px', borderRadius:10, fontSize:12.5, marginBottom:10, color:c, background:b, border:`1px solid ${br}`, display:'flex', alignItems:'center', gap:8 }),
  modal:  { position:'fixed', inset:0, background:'rgba(0,0,0,.72)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:24, animation:'fadeIn .18s ease-out' },
  stat:   { background:'#141414', border:'1px solid rgba(255,255,255,.06)', borderRadius:12, padding:'18px 20px' },
  h1:     { fontFamily:"'Instrument Serif', Georgia, serif", fontSize:30, letterSpacing:'-.02em', marginBottom:4 },
  sub:    { fontSize:13, color:'#8a8a8a', marginBottom:24, letterSpacing:'-.005em' },
}

function Btn({ label, onClick, primary, sm, disabled, full, color, ghost, icon }) {
  const isPrimary = primary && !color
  const bg = disabled ? 'rgba(255,255,255,.04)'
    : color ? color
    : isPrimary ? '#3ecf8e'
    : ghost ? 'transparent'
    : 'rgba(255,255,255,.04)'
  const fg = disabled ? '#555'
    : isPrimary ? '#0a0a0a'
    : color ? '#fff'
    : '#f4f2ee'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.filter = 'brightness(1.12)' }}
      onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
      style={{
        display:'inline-flex', alignItems:'center', justifyContent: full ? 'center' : 'flex-start', gap:7,
        padding: sm ? '6px 12px' : '9px 16px',
        borderRadius:10, fontSize: sm ? 12 : 13, fontWeight:500,
        cursor: disabled ? 'not-allowed' : 'pointer', fontFamily:'inherit',
        border: isPrimary || color ? '1px solid transparent' : '1px solid rgba(255,255,255,.08)',
        background: bg, color: fg,
        opacity: disabled ? .55 : 1, transition:'filter .15s ease, transform .05s ease',
        width: full ? '100%' : undefined, letterSpacing:'-.005em',
      }}>
      {icon && <Icon name={icon} size={sm ? 13 : 14} />}
      {label}
    </button>
  )
}

function Field({ label, warn, children }) {
  return (
    <div>
      <div style={{fontSize:10.5,textTransform:'uppercase',letterSpacing:'.08em',color: warn ? '#f5a623' : '#7a7a7a',marginBottom:6,fontWeight:600}}>
        {label}{warn && <span style={{ marginLeft:4 }}>•</span>}
      </div>
      {children}
    </div>
  )
}

// ── Icons (lucide-style, 1.6 stroke) ────────────────────────────
const Icon = ({ name, size = 16, color = 'currentColor', strokeWidth = 1.6 }) => {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (name) {
    case 'camera':   return <svg {...p}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="4"/></svg>
    case 'box':      return <svg {...p}><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="m3 8 9 5 9-5"/><path d="M3 8v8l9 5 9-5V8"/><path d="m12 13 0 8"/></svg>
    case 'store':    return <svg {...p}><path d="M3 9 4.5 4h15L21 9"/><path d="M3 9v11h18V9"/><path d="M9 20v-6h6v6"/><path d="M3 9c0 1.7 1.3 3 3 3s3-1.3 3-3 1.3 3 3 3 3-1.3 3-3 1.3 3 3 3 3-1.3 3-3"/></svg>
    case 'package':  return <svg {...p}><path d="M16.5 9.4 7.5 4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.27 6.96 8.73 5.05 8.73-5.05"/><path d="M12 22.08V12"/></svg>
    case 'search':   return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    case 'plus':     return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>
    case 'edit':     return <svg {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
    case 'trash':    return <svg {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
    case 'x':        return <svg {...p}><path d="M18 6 6 18M6 6l12 12"/></svg>
    case 'check':    return <svg {...p}><path d="M20 6 9 17l-5-5"/></svg>
    case 'send':     return <svg {...p}><path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/></svg>
    case 'sparkle':  return <svg {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3"/></svg>
    case 'upload':   return <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8 12 3 7 8"/><path d="M12 3v12"/></svg>
    case 'refresh':  return <svg {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>
    case 'alert':    return <svg {...p}><path d="M10.3 3.86a2 2 0 0 1 3.4 0l8.6 14.36A2 2 0 0 1 20.6 21H3.4a2 2 0 0 1-1.7-2.78L10.3 3.86Z"/><path d="M12 9v4M12 17h.01"/></svg>
    case 'info':     return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>
    default: return null
  }
}

function PageHeader({ title, sub }) {
  return (
    <div style={{ marginBottom:24 }}>
      <div style={C.h1}>{title}</div>
      {sub && <div style={C.sub}>{sub}</div>}
    </div>
  )
}

// ── Main App ────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]           = useState('vision')
  const [inventory, setInv]     = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  // Vision
  const [imgSrc, setImgSrc]     = useState(null)
  const [imgB64, setImgB64]     = useState(null)
  const [imgMime, setImgMime]   = useState('image/jpeg')
  const [notes, setNotes]       = useState('')
  const [analyzing, setAnal]    = useState(false)
  const [detected, setDetected] = useState(null)
  const [vErr, setVErr]         = useState(null)
  const [camMode, setCamMode]   = useState(false)
  const [camReady, setCamReady] = useState(false)

  // Inventory
  const [invFilter, setFilter]  = useState('All')
  const [search, setSearch]     = useState('')
  const [editModal, setEditModal] = useState(null)  // item being edited in modal

  // Suppliers
  const [supModal, setSupModal] = useState(null)   // null | 'new' | {supplier object}

  // Orders
  const [orders, setOrders]     = useState(null)
  const [sentMap, setSent]      = useState({})

  const fileRef  = useRef()
  const videoRef = useRef()
  const canvasRef= useRef()
  const streamRef= useRef(null)

  // ── Load data ───────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [inv, sups] = await Promise.all([api.getInventory(), api.getSuppliers()])
      setInv(Array.isArray(inv) ? inv : [])
      setSuppliers(Array.isArray(sups) ? sups : [])
    } catch (e) {
      console.error('Load error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Camera ──────────────────────────────────────────────────
  async function startCamera() {
    setVErr(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => setCamReady(true)
      }
      setCamMode(true); setImgSrc(null); setImgB64(null); setDetected(null)
    } catch { setVErr('Camera access denied.') }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null
    setCamMode(false); setCamReady(false)
  }

  function captureFrame() {
    const v = videoRef.current, c = canvasRef.current
    if (!v || !c) return
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d').drawImage(v, 0, 0)
    const url = c.toDataURL('image/jpeg', 0.92)
    setImgSrc(url); setImgB64(url.split(',')[1]); setImgMime('image/jpeg'); stopCamera()
  }

  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    setImgMime(file.type); setVErr(null); setDetected(null)
    const r = new FileReader()
    r.onload = e => { setImgSrc(e.target.result); setImgB64(e.target.result.split(',')[1]) }
    r.readAsDataURL(file)
  }

  // ── Analyze ─────────────────────────────────────────────────
  async function doAnalyze() {
    if (!imgB64) return
    setAnal(true); setVErr(null); setDetected(null)
    try {
      const data = await api.analyze({ imageBase64: imgB64, mimeType: imgMime, notes })
      if (data.error) throw new Error(data.error)
      setDetected({ ...data, items: (data.items || []).map(i => ({ ...i, _selected: true })) })
    } catch (err) { setVErr(err.message) }
    finally { setAnal(false) }
  }

  // ── Add detected to Airtable ────────────────────────────────
  async function addDetectedToInventory() {
    if (!detected) return
    setSaving(true)
    try {
      const selected = detected.items.filter(i => i._selected)
      for (const item of selected) {
        // Check if name already exists → update qty instead
        const existing = inventory.find(x => x.name.toLowerCase() === item.name.toLowerCase())
        if (existing) {
          await api.updateItem(existing.id, { cur: item.estimated_quantity, condition: item.condition, stock_level: item.stock_level })
        } else {
          await api.addItem({
            name: item.name, icon: item.icon, category: item.category,
            cur: item.estimated_quantity, unit: item.unit,
            par: 0, reorder: 0, cost: 0,
            condition: item.condition, stock_level: item.stock_level, notes: item.notes || '', sup: ''
          })
        }
      }
      await loadAll()
      setDetected(null); setImgSrc(null); setImgB64(null)
      setTab('inventory')
    } catch (err) { setVErr('Save failed: ' + err.message) }
    finally { setSaving(false) }
  }

  // ── Inventory update ────────────────────────────────────────
  async function saveItem(id, fields) {
    await api.updateItem(id, fields)
    setInv(prev => prev.map(x => x.id === id ? { ...x, ...fields } : x))
  }

  async function deleteItem(id) {
    if (!confirm('Delete this item?')) return
    await api.deleteItem(id)
    setInv(prev => prev.filter(x => x.id !== id))
  }

  // ── Supplier CRUD ───────────────────────────────────────────
  async function saveSupplier(data) {
    if (data.id) {
      await api.updateSupplier(data.id, data)
      setSuppliers(prev => prev.map(x => x.id === data.id ? { ...x, ...data } : x))
    } else {
      const result = await api.addSupplier(data)
      setSuppliers(prev => [...prev, { ...data, id: result.id }])
    }
    setSupModal(null)
  }

  async function deleteSup(id) {
    if (!confirm('Delete this supplier?')) return
    await api.deleteSupplier(id)
    setSuppliers(prev => prev.filter(x => x.id !== id))
    setSupModal(null)
  }

  // ── Orders ──────────────────────────────────────────────────
  function generateOrders() {
    const needs = inventory.filter(i => i.par > 0 && pct(i.cur, i.par) < 80)
    if (!needs.length) { alert('No items below par. Set par levels first in Inventory tab.'); return }
    const grouped = {}
    needs.forEach(item => {
      const sup = item.sup || 'Unassigned'
      if (!grouped[sup]) grouped[sup] = []
      const qty = Math.max(0, Math.ceil((item.reorder || item.par) - item.cur))
      grouped[sup].push({ ...item, qty, lineTotal: qty * (item.cost || 0) })
    })
    setOrders(grouped); setSent({})
  }

  // ── Computed ────────────────────────────────────────────────
  const supNames     = ['', ...suppliers.map(s => s.name)]
  const criticalCount= inventory.filter(i => i.par > 0 && pct(i.cur, i.par) <= 30).length
  const noPar        = inventory.filter(i => i.par === 0).length
  const noSup        = inventory.filter(i => !i.sup).length
  const filteredInv  = inventory.filter(i => {
    const mc = invFilter === 'All' || i.category === invFilter
    const ms = i.name.toLowerCase().includes(search.toLowerCase())
    return mc && ms
  })

  // ── Render ──────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>

      {/* ── Sidebar ── */}
      <aside style={C.side}>
        <div style={{ padding:'24px 20px 20px', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
          <div className="serif" style={{ fontSize:24, fontWeight:600, letterSpacing:'-.02em' }}>
            Mise<span style={{ color:'#3ecf8e', fontStyle:'italic' }}>AI</span>
          </div>
          <div style={{ fontSize:10.5, color:'#5a5a5a', marginTop:3, letterSpacing:'.06em', textTransform:'uppercase', fontWeight:500 }}>Restaurant Inventory</div>
        </div>
        <nav style={{ padding:12, flex:1 }}>
          <div style={{ fontSize:10, color:'#4a4a4a', textTransform:'uppercase', letterSpacing:'.08em', fontWeight:600, padding:'4px 10px 8px' }}>Workspace</div>
          {[
            { id:'vision',    icon:'camera',  label:'Vision Scan' },
            { id:'inventory', icon:'box',     label:'Inventory' },
            { id:'suppliers', icon:'store',   label:'Suppliers' },
            { id:'orders',    icon:'package', label:'Orders' },
          ].map(t => {
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,.03)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                style={{
                  display:'flex', alignItems:'center', gap:10, width:'100%',
                  padding:'9px 10px', borderRadius:8, border:'none', fontFamily:'inherit',
                  background: active ? 'rgba(62,207,142,.10)' : 'transparent',
                  color: active ? '#3ecf8e' : '#9a9a9a', fontSize:13,
                  cursor:'pointer', fontWeight: active ? 600 : 500,
                  marginBottom:2, textAlign:'left', letterSpacing:'-.005em',
                  transition:'background .12s ease, color .12s ease',
              }}>
                <Icon name={t.icon} size={16} />
                <span>{t.label}</span>
                {t.id==='orders' && criticalCount > 0 && (
                  <span style={{ marginLeft:'auto', background:'#ef5a5a', color:'#fff', fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:999, lineHeight:1.5 }}>{criticalCount}</span>
                )}
              </button>
            )
          })}
        </nav>
        <div style={{ padding:'14px 20px', borderTop:'1px solid rgba(255,255,255,.06)', fontSize:11, color:'#5a5a5a', display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background: loading ? '#f5a623' : '#3ecf8e' }} className={loading ? 'pulse' : ''} />
          {loading ? 'Loading' : `${inventory.length} items · ${suppliers.length} suppliers`}
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={C.main}>
        <div style={C.bar}>
          <div>
            <div style={{ fontSize:14, fontWeight:600, letterSpacing:'-.01em' }}>
              {{ vision:'Vision Scan', inventory:'Inventory', suppliers:'Suppliers', orders:'Supplier Orders' }[tab]}
            </div>
            <div style={{ fontSize:11, color:'#666', marginTop:1 }}>
              {new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}
            </div>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            {saving && <span style={{ fontSize:12, color:'#f5a623', display:'inline-flex', alignItems:'center', gap:6 }}><span style={{ width:6, height:6, borderRadius:'50%', background:'#f5a623' }} className="pulse" /> Saving</span>}
            <span style={{ fontSize:11, color:'#3ecf8e', background:'rgba(62,207,142,.10)', padding:'4px 11px', borderRadius:999, display:'inline-flex', alignItems:'center', gap:6, fontWeight:500 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#3ecf8e' }} /> Airtable Sync
            </span>
          </div>
        </div>

        <div style={C.page}>

          {/* ══════════ VISION ══════════ */}
          {tab === 'vision' && (
            <div className="fade-in">
              <PageHeader title="Vision Scan" sub="사진을 찍으면 AI가 품목을 감지하고 Airtable에 자동 저장합니다" />

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }}>
                {/* Left */}
                <div>
                  <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                    <Btn label="Upload Photo" icon="upload" onClick={() => { stopCamera(); setImgSrc(null); setImgB64(null) }} primary={!camMode} sm />
                    <Btn label="Camera" icon="camera" onClick={startCamera} primary={camMode} sm />
                  </div>

                  {camMode && (
                    <div style={{ marginBottom:12 }}>
                      <div style={{ position:'relative', borderRadius:12, overflow:'hidden', border:'1px solid #2a2a2a', background:'#000', marginBottom:8 }}>
                        <video ref={videoRef} autoPlay playsInline muted style={{ width:'100%', maxHeight:260, objectFit:'cover', display:'block' }} />
                        {!camReady && <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.7)', color:'#666', fontSize:13 }}>Starting camera...</div>}
                        <canvas ref={canvasRef} style={{ display:'none' }} />
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <Btn label="Capture" icon="camera" onClick={captureFrame} primary disabled={!camReady} full />
                        <Btn label="" icon="x" onClick={stopCamera} sm />
                      </div>
                    </div>
                  )}

                  {!camMode && !imgSrc && (
                    <div onClick={() => fileRef.current.click()}
                      onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor='#3ecf8e'; e.currentTarget.style.background='rgba(62,207,142,.04)' }}
                      onDragLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,.10)'; e.currentTarget.style.background='transparent' }}
                      onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor='rgba(255,255,255,.10)'; e.currentTarget.style.background='transparent'; loadFile(e.dataTransfer.files[0]) }}
                      onMouseEnter={e => e.currentTarget.style.borderColor='rgba(255,255,255,.18)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,.10)'}
                      style={{ border:'1.5px dashed rgba(255,255,255,.10)', borderRadius:14, padding:'48px 24px', textAlign:'center', cursor:'pointer', transition:'border-color .2s, background .2s', marginBottom:12, background:'transparent' }}>
                      <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => loadFile(e.target.files[0])} />
                      <div style={{ width:48, height:48, margin:'0 auto 14px', borderRadius:14, background:'rgba(255,255,255,.04)', display:'flex', alignItems:'center', justifyContent:'center', color:'#9a9a9a' }}>
                        <Icon name="upload" size={20} />
                      </div>
                      <div style={{ fontSize:14, fontWeight:600, marginBottom:4, letterSpacing:'-.005em' }}>Click or drag a photo</div>
                      <div style={{ fontSize:12, color:'#7a7a7a' }}>Walk-in · Freezer · Dry storage · Prep area</div>
                    </div>
                  )}

                  {!camMode && imgSrc && (
                    <div style={{ marginBottom:12 }}>
                      <div style={{ borderRadius:12, overflow:'hidden', border:'1px solid rgba(255,255,255,.08)', marginBottom:10, position:'relative' }}>
                        <img src={imgSrc} alt="" style={{ width:'100%', maxHeight:240, objectFit:'cover', display:'block' }} />
                        <div style={{ position:'absolute', top:10, right:10, background:'rgba(62,207,142,.18)', color:'#3ecf8e', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', padding:'4px 10px', fontSize:11, borderRadius:999, fontWeight:600, display:'inline-flex', alignItems:'center', gap:5 }}>
                          <Icon name="check" size={12} /> Photo ready
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <Btn label="Remove" icon="x" onClick={() => { setImgSrc(null); setImgB64(null); setDetected(null) }} sm />
                        <Btn label="Change" icon="refresh" onClick={() => fileRef.current.click()} sm />
                        <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => loadFile(e.target.files[0])} />
                      </div>
                    </div>
                  )}

                  {!camMode && (
                    <>
                      <div style={{ marginBottom:12 }}>
                        <div style={{ fontSize:11, color:'#666', marginBottom:5 }}>Context (optional)</div>
                        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                          placeholder="e.g. Walk-in cooler, Saturday service..."
                          style={{ ...C.input, resize:'vertical' }} />
                      </div>
                      <Btn label={analyzing ? 'Analyzing…' : 'Analyze & Detect Items'} icon={analyzing ? null : 'sparkle'}
                        onClick={doAnalyze} primary full disabled={!imgB64 || analyzing} />
                    </>
                  )}

                  {vErr && <div style={{ ...C.alert('#ef5a5a','rgba(239,90,90,.10)','rgba(239,90,90,.25)'), marginTop:10 }}><Icon name="alert" size={14} color="#ef5a5a" />{vErr}</div>}
                </div>

                {/* Right: results */}
                <div>
                  {!detected && !analyzing && (
                    <div style={C.card}>
                      <div style={{ padding:'36px 24px', textAlign:'center' }}>
                        <div style={{ width:48, height:48, margin:'0 auto 16px', borderRadius:14, background:'rgba(62,207,142,.10)', display:'flex', alignItems:'center', justifyContent:'center', color:'#3ecf8e' }}>
                          <Icon name="sparkle" size={22} />
                        </div>
                        <div style={{ fontSize:15, fontWeight:600, marginBottom:6, letterSpacing:'-.01em' }}>AI Vision Ready</div>
                        <div style={{ fontSize:12.5, color:'#8a8a8a', lineHeight:1.65 }}>
                          사진을 찍으면 AI가 자동으로<br/>모든 식재료를 감지합니다
                        </div>
                        <div style={{ marginTop:22, padding:'14px 16px', borderRadius:10, background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.04)', fontSize:12.5, color:'#9a9a9a', textAlign:'left', display:'grid', gap:8 }}>
                          {['품목 자동 감지','수량 추정','상태 평가','Airtable 자동 저장'].map(line => (
                            <div key={line} style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <span style={{ color:'#3ecf8e', display:'inline-flex' }}><Icon name="check" size={13} /></span>
                              {line}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {analyzing && (
                    <div style={C.card}>
                      <div style={{ padding:'52px 24px', textAlign:'center' }}>
                        <div className="pulse" style={{ width:48, height:48, margin:'0 auto 16px', borderRadius:14, background:'rgba(62,207,142,.10)', display:'flex', alignItems:'center', justifyContent:'center', color:'#3ecf8e' }}>
                          <Icon name="sparkle" size={22} />
                        </div>
                        <div style={{ fontWeight:600, marginBottom:6, letterSpacing:'-.01em' }}>AI가 분석 중</div>
                        <div style={{ fontSize:12.5, color:'#8a8a8a' }}>모든 식재료를 감지하고 있습니다</div>
                      </div>
                    </div>
                  )}

                  {detected && (
                    <div style={C.card} className="fade-in">
                      <div style={C.ch}>
                        <div>
                          <div style={{ fontSize:14, fontWeight:600, letterSpacing:'-.01em' }}>{detected.items?.length || 0}개 품목 감지</div>
                          <div style={{ fontSize:11.5, color:'#7a7a7a', marginTop:2 }}>{detected.scene_description}</div>
                        </div>
                        <span style={C.tag('#3ecf8e','rgba(62,207,142,.14)')}>AI</span>
                      </div>

                      {detected.alerts?.length > 0 && (
                        <div style={{ padding:'12px 20px 0' }}>
                          {detected.alerts.map((a,i) => <div key={i} style={C.alert('#f5a623','rgba(245,166,35,.10)','rgba(245,166,35,.22)')}><Icon name="alert" size={14} color="#f5a623" />{a}</div>)}
                        </div>
                      )}

                      <div style={{ padding:'0 20px' }}>
                        <div style={{ fontSize:10.5, color:'#6a6a6a', padding:'12px 0 8px', borderBottom:'1px solid rgba(255,255,255,.04)', marginBottom:4, textTransform:'uppercase', letterSpacing:'.08em', fontWeight:600 }}>
                          추가할 품목 선택
                        </div>
                        {detected.items?.map((item, i) => {
                          const exists = inventory.find(x => x.name.toLowerCase() === item.name.toLowerCase())
                          return (
                            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 0', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                              <input type="checkbox" checked={item._selected}
                                onChange={e => setDetected(d => ({ ...d, items: d.items.map((x,j) => j===i ? { ...x, _selected:e.target.checked } : x) }))}
                                style={{ accentColor:'#3ecf8e', width:16, height:16, cursor:'pointer' }} />
                              <span style={{ fontSize:20, width:28, textAlign:'center' }}>{item.icon}</span>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:13, fontWeight:500, display:'flex', alignItems:'center', gap:6, letterSpacing:'-.005em' }}>
                                  {item.name}
                                  {exists && <span style={C.tag('#3ecf8e','rgba(62,207,142,.10)')}>update</span>}
                                </div>
                                <div style={{ fontSize:11.5, color:'#7a7a7a', marginTop:2 }}>
                                  ~{item.estimated_quantity} {item.unit} · {item.condition}
                                  {item.notes ? ` — ${item.notes}` : ''}
                                </div>
                              </div>
                              <span style={C.tag(
                                item.stock_level==='critical'?'#ef5a5a':item.stock_level==='low'?'#f5a623':'#3ecf8e',
                                item.stock_level==='critical'?'rgba(239,90,90,.12)':item.stock_level==='low'?'rgba(245,166,35,.12)':'rgba(62,207,142,.12)'
                              )}>{item.stock_level}</span>
                            </div>
                          )
                        })}
                      </div>

                      <div style={{ padding:20, display:'flex', gap:8 }}>
                        <Btn label={saving ? 'Saving…' : `Save ${detected.items?.filter(i=>i._selected).length || 0} to Airtable`}
                          icon={saving ? null : 'check'}
                          onClick={addDetectedToInventory} primary
                          disabled={saving || !detected.items?.some(i=>i._selected)} />
                        <Btn label="Cancel" onClick={() => setDetected(null)} sm />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════ INVENTORY ══════════ */}
          {tab === 'inventory' && (
            <div className="fade-in">
              <PageHeader title="Inventory" sub="수량, Par Level, Supplier를 설정하고 자동 발주를 활성화하세요" />

              {/* Stats */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:22 }}>
                {[
                  { lbl:'Total Items',  val:inventory.length,  color:null },
                  { lbl:'Critical',     val:criticalCount,     color:'#ef5a5a' },
                  { lbl:'No Par Set',   val:noPar,             color: noPar>0?'#f5a623':null },
                  { lbl:'No Supplier',  val:noSup,             color: noSup>0?'#f5a623':null },
                ].map(s => (
                  <div key={s.lbl} style={C.stat}>
                    <div style={{ fontSize:10.5, textTransform:'uppercase', letterSpacing:'.08em', color:'#7a7a7a', marginBottom:8, fontWeight:600 }}>{s.lbl}</div>
                    <div className="serif" style={{ fontSize:32, color: s.color || '#f4f2ee', fontWeight:500 }}>{s.val}</div>
                  </div>
                ))}
              </div>

              {noPar > 0 && <div style={C.alert('#f5a623','rgba(245,166,35,.08)','rgba(245,166,35,.20)')}>
                <Icon name="alert" size={14} color="#f5a623" />
                <span><strong>{noPar}개 품목</strong>에 Par Level 미설정 — 각 품목의 Edit 버튼을 눌러 설정하세요</span>
              </div>}
              {noSup > 0 && <div style={C.alert('#6ea8fe','rgba(110,168,254,.08)','rgba(110,168,254,.22)')}>
                <Icon name="info" size={14} color="#6ea8fe" />
                <span><strong>{noSup}개 품목</strong>에 Supplier 미설정 — 발주서 생성을 위해 지정해 주세요</span>
              </div>}

              {loading ? (
                <div style={{ textAlign:'center', padding:48, color:'#7a7a7a', fontSize:13 }}>
                  <span className="pulse">Loading from Airtable…</span>
                </div>
              ) : inventory.length === 0 ? (
                <div style={C.card}>
                  <div style={{ padding:'56px 24px', textAlign:'center' }}>
                    <div style={{ width:52, height:52, margin:'0 auto 16px', borderRadius:14, background:'rgba(62,207,142,.10)', display:'flex', alignItems:'center', justifyContent:'center', color:'#3ecf8e' }}>
                      <Icon name="camera" size={24} />
                    </div>
                    <div style={{ fontSize:16, fontWeight:600, marginBottom:8, letterSpacing:'-.01em' }}>Inventory가 비어있습니다</div>
                    <div style={{ fontSize:13, color:'#8a8a8a', marginBottom:22 }}>Vision Scan에서 사진을 찍어 품목을 추가하세요</div>
                    <Btn label="Go to Vision Scan" icon="camera" onClick={() => setTab('vision')} primary />
                  </div>
                </div>
              ) : (
                <div style={C.card}>
                  <div style={{ ...C.ch, flexDirection:'column', alignItems:'stretch', gap:12 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                      <div style={{ fontSize:14, fontWeight:600, letterSpacing:'-.01em' }}>재고 목록 <span style={{ color:'#666', fontWeight:400 }}>({filteredInv.length})</span></div>
                      <div style={{ position:'relative', width:220 }}>
                        <span style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#6a6a6a', display:'inline-flex' }}>
                          <Icon name="search" size={14} />
                        </span>
                        <input type="text" placeholder="Search items" value={search}
                          onChange={e => setSearch(e.target.value)}
                          style={{ ...C.input, width:'100%', padding:'7px 12px 7px 32px', fontSize:12.5 }} />
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                      {['All',...CATEGORIES].map(c => {
                        const active = invFilter === c
                        return (
                          <button key={c} onClick={() => setFilter(c)} style={{
                            padding:'5px 12px', borderRadius:999, fontSize:11.5, cursor:'pointer', fontFamily:'inherit', fontWeight:500,
                            border: active ? '1px solid transparent' : '1px solid rgba(255,255,255,.06)',
                            background: active ? '#3ecf8e' : 'transparent',
                            color: active ? '#0a0a0a' : '#9a9a9a',
                            transition:'background .12s, color .12s',
                          }}>{c}</button>
                        )
                      })}
                    </div>
                  </div>

                  {filteredInv.map(item => {
                    const s = status(item.cur, item.par)
                    const v = item.par > 0 ? Math.min(pct(item.cur, item.par), 100) : null
                    return (
                      <div key={item.id}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.015)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        style={{ borderBottom:'1px solid rgba(255,255,255,.04)', padding:'14px 20px', display:'flex', alignItems:'center', gap:14, transition:'background .12s' }}>
                        <span style={{ fontSize:24, width:36, textAlign:'center' }}>{item.icon}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:14, letterSpacing:'-.005em' }}>{item.name}</div>
                          <div style={{ fontSize:11.5, color:'#7a7a7a', marginTop:2 }}>
                            {item.category} · {item.cur} {item.unit}
                            {item.sup && ` · ${item.sup}`}
                          </div>
                          {v !== null && (
                            <div style={{ marginTop:7, display:'flex', alignItems:'center', gap:10, maxWidth:360 }}>
                              <div style={{ flex:1, height:5, background:'rgba(255,255,255,.05)', borderRadius:999, overflow:'hidden' }}>
                                <div style={{ height:'100%', width:v+'%', background:s.color, borderRadius:999, transition:'width .4s' }} />
                              </div>
                              <span style={{ fontSize:10.5, color:s.color, fontWeight:600, whiteSpace:'nowrap', minWidth:60, textAlign:'right' }}>{v}% of par</span>
                            </div>
                          )}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          {item.par > 0
                            ? <span style={C.tag(s.color, s.bg)}>{s.lbl}</span>
                            : <span style={C.tag('#7a7a7a','rgba(255,255,255,.04)')}>No par</span>}
                          {!item.sup && <span style={C.tag('#f5a623','rgba(245,166,35,.10)')}>No supplier</span>}
                          <Btn label="Edit" icon="edit" onClick={() => setEditModal({ ...item })} sm />
                          <Btn label="" icon="trash" onClick={() => deleteItem(item.id)} sm />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════════ SUPPLIERS ══════════ */}
          {tab === 'suppliers' && (
            <div className="fade-in">
              <PageHeader title="Suppliers" sub="공급업체 정보를 관리하세요" />

              <div style={{ marginBottom:18 }}>
                <Btn label="Add Supplier" icon="plus" onClick={() => setSupModal({ name:'', phone:'', email:'', leadTime:'' })} primary />
              </div>

              {suppliers.length === 0 ? (
                <div style={C.card}>
                  <div style={{ padding:'56px 24px', textAlign:'center' }}>
                    <div style={{ width:48, height:48, margin:'0 auto 14px', borderRadius:14, background:'rgba(255,255,255,.04)', display:'flex', alignItems:'center', justifyContent:'center', color:'#9a9a9a' }}>
                      <Icon name="store" size={22} />
                    </div>
                    <div style={{ fontSize:15, fontWeight:600, color:'#f4f2ee', marginBottom:6, letterSpacing:'-.01em' }}>No suppliers yet</div>
                    <div style={{ fontSize:12.5, color:'#8a8a8a' }}>Add suppliers to enable automatic order grouping</div>
                  </div>
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
                  {suppliers.map(sup => (
                    <div key={sup.id}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.10)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)'}
                      style={{ ...C.card, marginBottom:0, padding:18, transition:'border-color .15s' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                          <div style={{ width:36, height:36, borderRadius:10, background:'rgba(62,207,142,.10)', color:'#3ecf8e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:600, flexShrink:0 }}>
                            {sup.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div style={{ fontWeight:600, fontSize:14, letterSpacing:'-.005em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sup.name}</div>
                        </div>
                        <div style={{ display:'flex', gap:6 }}>
                          <Btn label="Edit" icon="edit" onClick={() => setSupModal({ ...sup })} sm />
                        </div>
                      </div>
                      <div style={{ display:'grid', gap:6 }}>
                        {sup.phone && <div style={{ fontSize:12.5, color:'#9a9a9a', display:'flex', gap:8 }}><span style={{ color:'#5a5a5a', width:60 }}>Phone</span>{sup.phone}</div>}
                        {sup.email && <div style={{ fontSize:12.5, color:'#9a9a9a', display:'flex', gap:8 }}><span style={{ color:'#5a5a5a', width:60 }}>Email</span>{sup.email}</div>}
                        {sup.leadTime && <div style={{ fontSize:12.5, color:'#9a9a9a', display:'flex', gap:8 }}><span style={{ color:'#5a5a5a', width:60 }}>Lead time</span>{sup.leadTime}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════ ORDERS ══════════ */}
          {tab === 'orders' && (
            <div className="fade-in">
              <PageHeader title="Supplier Orders" sub="Par level 미달 품목의 발주서를 자동 생성합니다" />

              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:22 }}>
                {(() => {
                  const needs  = inventory.filter(i => i.par > 0 && pct(i.cur,i.par) < 80)
                  const total  = orders ? Object.values(orders).flat().reduce((s,i)=>s+i.lineTotal,0) : 0
                  return [
                    { lbl:'Items to Order', val:needs.length,  color:'#f5a623' },
                    { lbl:'Suppliers',      val:[...new Set(needs.map(i=>i.sup||'Unassigned'))].length, color:null },
                    { lbl:'Critical',       val:criticalCount, color: criticalCount>0?'#ef5a5a':null },
                    { lbl:'Est. Total',     val:fmt(total),    color:'#3ecf8e' },
                  ].map(s => (
                    <div key={s.lbl} style={C.stat}>
                      <div style={{ fontSize:10.5, textTransform:'uppercase', letterSpacing:'.08em', color:'#7a7a7a', marginBottom:8, fontWeight:600 }}>{s.lbl}</div>
                      <div className="serif" style={{ fontSize:28, color: s.color || '#f4f2ee', fontWeight:500 }}>{s.val}</div>
                    </div>
                  ))
                })()}
              </div>

              {noPar > 0 && <div style={C.alert('#f5a623','rgba(245,166,35,.08)','rgba(245,166,35,.20)')}>
                <Icon name="alert" size={14} color="#f5a623" />
                <span>{noPar}개 품목에 Par Level 미설정 → Inventory 탭에서 먼저 설정하세요</span>
              </div>}

              {!orders ? (
                <div style={C.card}>
                  <div style={{ padding:'56px 24px', textAlign:'center' }}>
                    <div style={{ width:52, height:52, margin:'0 auto 16px', borderRadius:14, background:'rgba(62,207,142,.10)', display:'flex', alignItems:'center', justifyContent:'center', color:'#3ecf8e' }}>
                      <Icon name="package" size={24} />
                    </div>
                    <div className="serif" style={{ fontSize:22, marginBottom:8, fontWeight:500 }}>발주서 자동 생성</div>
                    <div style={{ fontSize:12.5, color:'#8a8a8a', marginBottom:22, maxWidth:400, margin:'0 auto 22px' }}>Par level 미달 품목을 공급업체별로 자동 그룹핑합니다</div>
                    <Btn label="Generate Orders" icon="sparkle" onClick={generateOrders} primary
                      disabled={inventory.filter(i=>i.par>0).length===0} />
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                    <div style={{ fontSize:12.5, color:'#8a8a8a' }}>{Object.keys(orders).length}개 발주서 생성됨</div>
                    <Btn label="Reset" icon="refresh" onClick={() => { setOrders(null); setSent({}) }} sm />
                  </div>

                  {Object.entries(orders).map(([supName, items]) => {
                    const supInfo = suppliers.find(s => s.name === supName)
                    const subT = items.reduce((s,i) => s+i.lineTotal, 0)
                    return (
                      <div key={supName} style={{ border:'1px solid rgba(255,255,255,.06)', borderRadius:14, overflow:'hidden', marginBottom:14, background:'#141414' }}>
                        <div style={{ background:'rgba(62,207,142,.06)', borderBottom:'1px solid rgba(255,255,255,.06)', padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                            <div style={{ width:34, height:34, borderRadius:10, background:'rgba(62,207,142,.14)', color:'#3ecf8e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:600 }}>
                              {supName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight:600, fontSize:13.5, letterSpacing:'-.005em' }}>{supName}</div>
                              {supInfo && <div style={{ fontSize:11, color:'#7a7a7a', marginTop:2 }}>
                                {supInfo.phone && supInfo.phone}{supInfo.phone && supInfo.email && ' · '}{supInfo.email}
                              </div>}
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                            {supInfo?.leadTime && <span style={C.tag('#6ea8fe','rgba(110,168,254,.12)')}>{supInfo.leadTime}</span>}
                            {sentMap[supName]
                              ? <span style={C.tag('#3ecf8e','rgba(62,207,142,.14)')}><Icon name="check" size={12} color="#3ecf8e" /> Sent</span>
                              : <Btn label="Send Order" icon="send" onClick={() => setSent(s=>({...s,[supName]:true}))} primary sm />}
                          </div>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 90px 90px 100px', gap:12, padding:'9px 18px', fontSize:10.5, textTransform:'uppercase', letterSpacing:'.08em', color:'#6a6a6a', background:'rgba(255,255,255,.015)', fontWeight:600 }}>
                          <span>Item</span><span>Qty</span><span>Cost</span><span>Total</span>
                        </div>
                        {items.map(item => (
                          <div key={item.id} style={{ display:'grid', gridTemplateColumns:'1fr 90px 90px 100px', gap:12, padding:'11px 18px', borderTop:'1px solid rgba(255,255,255,.04)', fontSize:13, alignItems:'center' }}>
                            <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                              <span style={{ fontSize:18 }}>{item.icon}</span>
                              <span>{item.name}</span>
                              {pct(item.cur,item.par)<=30 && <span style={C.tag('#ef5a5a','rgba(239,90,90,.12)')}>Urgent</span>}
                            </span>
                            <span style={{ fontWeight:600 }}>{item.qty} {item.unit}</span>
                            <span style={{ color:'#8a8a8a' }}>{item.cost ? fmt(item.cost) : '—'}</span>
                            <span style={{ fontWeight:600 }}>{item.cost ? fmt(item.lineTotal) : '—'}</span>
                          </div>
                        ))}
                        <div style={{ padding:'11px 18px', display:'flex', justifyContent:'flex-end', gap:10, fontSize:13, fontWeight:600, borderTop:'1px solid rgba(255,255,255,.06)', background:'rgba(255,255,255,.015)' }}>
                          <span style={{ fontWeight:400, color:'#7a7a7a' }}>Subtotal</span>
                          <span>{subT > 0 ? fmt(subT) : '(no cost set)'}</span>
                        </div>
                      </div>
                    )
                  })}

                  <div style={{ ...C.card, padding:'18px 22px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div className="serif" style={{ fontSize:20, fontWeight:500 }}>Total Order Value</div>
                    <div className="serif" style={{ fontSize:30, color:'#3ecf8e', fontWeight:500 }}>
                      {fmt(Object.values(orders).flat().reduce((s,i)=>s+i.lineTotal,0))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ══════════ EDIT MODAL ══════════ */}
      {editModal && (
        <div style={C.modal} onClick={e => { if(e.target===e.currentTarget) setEditModal(null) }}>
          <div className="fade-in" style={{ background:'#141414', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, width:'100%', maxWidth:580, maxHeight:'90vh', overflow:'auto', boxShadow:'0 24px 60px rgba(0,0,0,.55)' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid rgba(255,255,255,.06)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:16, fontWeight:600, letterSpacing:'-.01em', display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:20 }}>{editModal.icon}</span> {editModal.name}
              </div>
              <button onClick={() => setEditModal(null)} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.06)', color:'#9a9a9a', cursor:'pointer', width:30, height:30, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="x" size={14} /></button>
            </div>

            <div style={{ padding:'22px 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>

              <div style={{ gridColumn:'1/-1' }}>
                <Field label="Item Name">
                  <input type="text" value={editModal.name} onChange={e => setEditModal(m=>({...m,name:e.target.value}))} style={C.input} />
                </Field>
              </div>

              <Field label="Category">
                <select value={editModal.category} onChange={e => setEditModal(m=>({...m,category:e.target.value}))} style={{ ...C.sel, width:'100%' }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>

              <Field label="Unit">
                <select value={editModal.unit} onChange={e => setEditModal(m=>({...m,unit:e.target.value}))} style={{ ...C.sel, width:'100%' }}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>

              <Field label="Current Quantity">
                <input type="number" value={editModal.cur} min={0} step={0.1}
                  onChange={e => setEditModal(m=>({...m,cur:+e.target.value}))} style={C.input} />
              </Field>

              <Field label="Par Level" warn={editModal.par===0}>
                <input type="number" value={editModal.par} min={0} step={0.1}
                  onChange={e => setEditModal(m=>({...m,par:+e.target.value}))}
                  placeholder="Minimum stock level" style={{ ...C.input, borderColor: editModal.par===0?'#f5a623':'#2a2a2a' }} />
              </Field>

              <Field label="Reorder Quantity">
                <input type="number" value={editModal.reorder} min={0} step={0.1}
                  onChange={e => setEditModal(m=>({...m,reorder:+e.target.value}))}
                  placeholder="How much to order" style={C.input} />
              </Field>

              <Field label="Unit Cost (CAD)">
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ color:'#666' }}>$</span>
                  <input type="number" value={editModal.cost} min={0} step={0.01}
                    onChange={e => setEditModal(m=>({...m,cost:+e.target.value}))}
                    placeholder="0.00" style={{ ...C.input }} />
                </div>
              </Field>

              <Field label="Supplier" warn={!editModal.sup}>
                <select value={editModal.sup} onChange={e => setEditModal(m=>({...m,sup:e.target.value}))}
                  style={{ ...C.sel, width:'100%', borderColor: !editModal.sup?'#f5a623':'#2a2a2a' }}>
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </Field>

              <div style={{ gridColumn:'1/-1' }}>
                <Field label="Notes">
                  <textarea rows={2} value={editModal.notes}
                    onChange={e => setEditModal(m=>({...m,notes:e.target.value}))}
                    placeholder="Any notes..." style={{ ...C.input, resize:'vertical' }} />
                </Field>
              </div>

            </div>

            <div style={{ padding:'4px 24px 22px', display:'flex', gap:8, justifyContent:'flex-end' }}>
              <Btn label="Cancel" onClick={() => setEditModal(null)} />
              <Btn label="Save to Airtable" icon="check" primary onClick={async () => {
                setSaving(true)
                await saveItem(editModal.id, editModal)
                setSaving(false)
                setEditModal(null)
              }} />
            </div>
          </div>
        </div>
      )}

      {/* ══════════ SUPPLIER MODAL ══════════ */}
      {supModal !== null && (
        <div style={C.modal} onClick={e => { if(e.target===e.currentTarget) setSupModal(null) }}>
          <div className="fade-in" style={{ background:'#141414', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, width:'100%', maxWidth:460, boxShadow:'0 24px 60px rgba(0,0,0,.55)' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid rgba(255,255,255,.06)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:16, fontWeight:600, letterSpacing:'-.01em' }}>{supModal.id ? 'Edit Supplier' : 'Add Supplier'}</div>
              <button onClick={() => setSupModal(null)} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.06)', color:'#9a9a9a', fontSize:14, cursor:'pointer', width:30, height:30, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>

            <div style={{ padding:24, display:'flex', flexDirection:'column', gap:16 }}>
              <Field label="Supplier Name">
                <input type="text" value={supModal.name} onChange={e => setSupModal(m=>({...m,name:e.target.value}))}
                  placeholder="e.g. Metro Foods" style={C.input} />
              </Field>
              <Field label="Phone">
                <input type="text" value={supModal.phone} onChange={e => setSupModal(m=>({...m,phone:e.target.value}))}
                  placeholder="e.g. 604-555-0101" style={C.input} />
              </Field>
              <Field label="Email">
                <input type="email" value={supModal.email} onChange={e => setSupModal(m=>({...m,email:e.target.value}))}
                  placeholder="orders@supplier.com" style={C.input} />
              </Field>
              <Field label="Lead Time">
                <input type="text" value={supModal.leadTime} onChange={e => setSupModal(m=>({...m,leadTime:e.target.value}))}
                  placeholder="e.g. Next Day, Same Day, 2 Days" style={C.input} />
              </Field>
            </div>

            <div style={{ padding:'4px 24px 22px', display:'flex', gap:8, justifyContent:'space-between' }}>
              <div>
                {supModal.id && <Btn label="Delete" icon="trash" onClick={() => deleteSup(supModal.id)} color="#ef5a5a" />}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <Btn label="Cancel" onClick={() => setSupModal(null)} />
                <Btn label="Save" icon="check" primary onClick={() => saveSupplier(supModal)} disabled={!supModal.name} />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
