import { useState, useRef, useEffect, useCallback } from 'react'

// ── Constants ───────────────────────────────────────────────────
const CATEGORIES = ['Protein','Seafood','Produce','Dairy','Sauce','Pantry','Frozen','Beverage','Supplies']
const UNITS      = ['kg','lb','L','units','boxes','bags','bottles','cans','flats','bundles','cases']

const pct = (cur, par) => par > 0 ? Math.round((cur / par) * 100) : 0
const fmt = n => '$' + Number(n || 0).toFixed(2)

function status(cur, par) {
  const v = pct(cur, par)
  if (v <= 30) return { lbl:'Critical', color:'#e05252', bg:'rgba(224,82,82,.15)' }
  if (v <= 60) return { lbl:'Low',      color:'#f5a623', bg:'rgba(245,166,35,.15)' }
  return               { lbl:'OK',       color:'#3ecf8e', bg:'rgba(62,207,142,.15)' }
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
const C = {
  side:   { width:200, background:'#161616', borderRight:'1px solid #242424', display:'flex', flexDirection:'column', position:'fixed', top:0, left:0, bottom:0, zIndex:100 },
  main:   { marginLeft:200, minHeight:'100vh', display:'flex', flexDirection:'column' },
  bar:    { background:'#161616', borderBottom:'1px solid #242424', padding:'0 24px', height:52, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 },
  page:   { padding:24 },
  card:   { background:'#161616', border:'1px solid #242424', borderRadius:12, marginBottom:16 },
  ch:     { padding:'13px 18px', borderBottom:'1px solid #242424', display:'flex', alignItems:'center', justifyContent:'space-between' },
  input:  { background:'#0f0f0f', border:'1px solid #2a2a2a', borderRadius:8, color:'#f0ede8', fontFamily:'inherit', fontSize:13, padding:'8px 12px', width:'100%' },
  numIn:  { background:'#0f0f0f', border:'1px solid #2a2a2a', borderRadius:8, color:'#f0ede8', fontFamily:'inherit', fontSize:13, padding:'7px 10px', width:80 },
  sel:    { background:'#0f0f0f', border:'1px solid #2a2a2a', borderRadius:8, color:'#f0ede8', fontFamily:'inherit', fontSize:13, padding:'8px 10px', cursor:'pointer' },
  tag:    (c,b) => ({ display:'inline-block', padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:600, color:c, background:b }),
  alert:  (c,b,br) => ({ padding:'10px 14px', borderRadius:8, fontSize:12.5, marginBottom:10, color:c, background:b, border:`1px solid ${br}` }),
  modal:  { position:'fixed', inset:0, background:'rgba(0,0,0,.8)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:24 },
}

function Btn({ label, onClick, primary, sm, disabled, full, color }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display:'inline-flex', alignItems:'center', gap:5,
      padding: sm ? '5px 12px' : '8px 16px',
      borderRadius:8, fontSize: sm ? 12 : 13, fontWeight:500,
      cursor: disabled ? 'not-allowed' : 'pointer', fontFamily:'inherit',
      border: primary ? 'none' : '1px solid #2a2a2a',
      background: disabled ? '#222' : color || (primary ? '#3ecf8e' : 'transparent'),
      color: disabled ? '#555' : primary ? '#000' : '#f0ede8',
      opacity: disabled ? .6 : 1, transition:'opacity .15s',
      width: full ? '100%' : undefined, justifyContent: full ? 'center' : undefined,
    }}>{label}</button>
  )
}

function Field({ label, warn, children }) {
  return (
    <div>
      <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'.7px',color: warn ? '#f5a623' : '#666',marginBottom:5,fontWeight:500}}>
        {label} {warn && '⚠'}
      </div>
      {children}
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
        <div style={{ padding:'20px 16px', borderBottom:'1px solid #242424' }}>
          <div style={{ fontFamily:'serif', fontSize:20, fontWeight:700 }}>
            Mise<span style={{ color:'#3ecf8e', fontStyle:'italic' }}>AI</span>
          </div>
          <div style={{ fontSize:10, color:'#555', marginTop:2 }}>Restaurant Inventory</div>
        </div>
        <nav style={{ padding:8, flex:1 }}>
          {[
            { id:'vision',    icon:'📷', label:'Vision Scan' },
            { id:'inventory', icon:'📊', label:'Inventory' },
            { id:'suppliers', icon:'🏪', label:'Suppliers' },
            { id:'orders',    icon:'📦', label:'Orders' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display:'flex', alignItems:'center', gap:8, width:'100%',
              padding:'9px 10px', borderRadius:8, border:'none', fontFamily:'inherit',
              background: tab===t.id ? 'rgba(62,207,142,.1)' : 'none',
              color: tab===t.id ? '#3ecf8e' : '#888', fontSize:13,
              cursor:'pointer', fontWeight: tab===t.id ? 600 : 400,
              marginBottom:2, textAlign:'left',
            }}>
              {t.icon} {t.label}
              {t.id==='orders' && criticalCount > 0 && (
                <span style={{ marginLeft:'auto', background:'#e05252', color:'#fff', fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:10 }}>{criticalCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div style={{ padding:'12px 16px', borderTop:'1px solid #242424', fontSize:10, color:'#444' }}>
          {loading ? '⏳ Loading...' : `${inventory.length} items · ${suppliers.length} suppliers`}
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={C.main}>
        <div style={C.bar}>
          <div>
            <div style={{ fontSize:14, fontWeight:600 }}>
              {{ vision:'Vision Scan', inventory:'Inventory', suppliers:'Suppliers', orders:'Supplier Orders' }[tab]}
            </div>
            <div style={{ fontSize:11, color:'#666' }}>
              {new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}
            </div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {saving && <span style={{ fontSize:12, color:'#f5a623' }}>💾 Saving...</span>}
            <span style={{ fontSize:11, color:'#3ecf8e', background:'rgba(62,207,142,.1)', padding:'3px 10px', borderRadius:20 }}>● Airtable Sync</span>
          </div>
        </div>

        <div style={C.page}>

          {/* ══════════ VISION ══════════ */}
          {tab === 'vision' && (
            <div>
              <div style={{ fontFamily:'serif', fontSize:22, marginBottom:3 }}>Vision Scan</div>
              <div style={{ fontSize:12, color:'#888', marginBottom:20 }}>
                사진을 찍으면 AI가 품목을 감지하고 Airtable에 자동 저장합니다
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, alignItems:'start' }}>
                {/* Left */}
                <div>
                  <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                    <Btn label="📁 Upload Photo" onClick={() => { stopCamera(); setImgSrc(null); setImgB64(null) }} primary={!camMode} sm />
                    <Btn label="📸 Camera" onClick={startCamera} primary={camMode} sm />
                  </div>

                  {camMode && (
                    <div style={{ marginBottom:12 }}>
                      <div style={{ position:'relative', borderRadius:12, overflow:'hidden', border:'1px solid #2a2a2a', background:'#000', marginBottom:8 }}>
                        <video ref={videoRef} autoPlay playsInline muted style={{ width:'100%', maxHeight:260, objectFit:'cover', display:'block' }} />
                        {!camReady && <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.7)', color:'#666', fontSize:13 }}>Starting camera...</div>}
                        <canvas ref={canvasRef} style={{ display:'none' }} />
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <Btn label="📷 Capture" onClick={captureFrame} primary disabled={!camReady} full />
                        <Btn label="✕" onClick={stopCamera} sm />
                      </div>
                    </div>
                  )}

                  {!camMode && !imgSrc && (
                    <div onClick={() => fileRef.current.click()}
                      onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor='#3ecf8e' }}
                      onDragLeave={e => e.currentTarget.style.borderColor='#2a2a2a'}
                      onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor='#2a2a2a'; loadFile(e.dataTransfer.files[0]) }}
                      style={{ border:'2px dashed #2a2a2a', borderRadius:12, padding:'36px 24px', textAlign:'center', cursor:'pointer', transition:'border-color .2s', marginBottom:12 }}>
                      <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => loadFile(e.target.files[0])} />
                      <div style={{ fontSize:36, marginBottom:10 }}>📁</div>
                      <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Click or drag a photo</div>
                      <div style={{ fontSize:12, color:'#666' }}>Walk-in · Freezer · Dry storage · Prep area</div>
                    </div>
                  )}

                  {!camMode && imgSrc && (
                    <div style={{ marginBottom:12 }}>
                      <div style={{ borderRadius:10, overflow:'hidden', border:'1px solid #2a2a2a', marginBottom:8, position:'relative' }}>
                        <img src={imgSrc} alt="" style={{ width:'100%', maxHeight:220, objectFit:'cover', display:'block' }} />
                        <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(transparent,rgba(0,0,0,.7))', padding:'16px 12px 8px', fontSize:11, color:'#fff' }}>✅ Photo ready</div>
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <Btn label="✕ Remove" onClick={() => { setImgSrc(null); setImgB64(null); setDetected(null) }} sm />
                        <Btn label="🔄 Change" onClick={() => fileRef.current.click()} sm />
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
                      <Btn label={analyzing ? '⏳ Analyzing...' : '🔍 Analyze & Detect Items'}
                        onClick={doAnalyze} primary full disabled={!imgB64 || analyzing} />
                    </>
                  )}

                  {vErr && <div style={{ ...C.alert('#e05252','rgba(224,82,82,.1)','rgba(224,82,82,.3)'), marginTop:10 }}>⚠️ {vErr}</div>}
                </div>

                {/* Right: results */}
                <div>
                  {!detected && !analyzing && (
                    <div style={C.card}>
                      <div style={{ padding:20, textAlign:'center' }}>
                        <div style={{ fontSize:40, marginBottom:12 }}>🤖</div>
                        <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>AI Vision Ready</div>
                        <div style={{ fontSize:12, color:'#666', lineHeight:1.6 }}>
                          사진을 찍으면 AI가 자동으로<br/>모든 식재료를 감지합니다
                        </div>
                        <div style={{ marginTop:16, fontSize:12, color:'#555', textAlign:'left' }}>
                          ✅ 품목 자동 감지<br/>
                          ✅ 수량 추정<br/>
                          ✅ 상태 평가<br/>
                          ✅ Airtable 자동 저장
                        </div>
                      </div>
                    </div>
                  )}

                  {analyzing && (
                    <div style={C.card}>
                      <div style={{ padding:'40px 20px', textAlign:'center' }}>
                        <div style={{ fontSize:40, marginBottom:12 }}>🧠</div>
                        <div style={{ fontWeight:600, marginBottom:4 }}>Claude AI가 분석 중...</div>
                        <div style={{ fontSize:12, color:'#666' }}>모든 식재료를 감지하고 있습니다</div>
                      </div>
                    </div>
                  )}

                  {detected && (
                    <div style={C.card}>
                      <div style={C.ch}>
                        <div>
                          <div style={{ fontSize:13.5, fontWeight:600 }}>🎯 {detected.items?.length || 0}개 품목 감지</div>
                          <div style={{ fontSize:11, color:'#666', marginTop:1 }}>{detected.scene_description}</div>
                        </div>
                        <span style={C.tag('#3ecf8e','rgba(62,207,142,.15)')}>AI</span>
                      </div>

                      {detected.alerts?.length > 0 && (
                        <div style={{ padding:'10px 18px 0' }}>
                          {detected.alerts.map((a,i) => <div key={i} style={C.alert('#f5a623','rgba(245,166,35,.1)','rgba(245,166,35,.3)')}>⚠️ {a}</div>)}
                        </div>
                      )}

                      <div style={{ padding:'0 18px' }}>
                        <div style={{ fontSize:11, color:'#555', padding:'8px 0 6px', borderBottom:'1px solid #242424', marginBottom:4 }}>
                          추가할 품목을 선택하세요
                        </div>
                        {detected.items?.map((item, i) => {
                          const exists = inventory.find(x => x.name.toLowerCase() === item.name.toLowerCase())
                          return (
                            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid #1a1a1a' }}>
                              <input type="checkbox" checked={item._selected}
                                onChange={e => setDetected(d => ({ ...d, items: d.items.map((x,j) => j===i ? { ...x, _selected:e.target.checked } : x) }))}
                                style={{ accentColor:'#3ecf8e', width:16, height:16, cursor:'pointer' }} />
                              <span style={{ fontSize:20, width:28, textAlign:'center' }}>{item.icon}</span>
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:13, fontWeight:500 }}>
                                  {item.name}
                                  {exists && <span style={C.tag('#3ecf8e','rgba(62,207,142,.1)', { marginLeft:6 })}> ↻ update</span>}
                                </div>
                                <div style={{ fontSize:11, color:'#666', marginTop:1 }}>
                                  ~{item.estimated_quantity} {item.unit} · {item.condition}
                                  {item.notes ? ` — ${item.notes}` : ''}
                                </div>
                              </div>
                              <span style={C.tag(
                                item.stock_level==='critical'?'#e05252':item.stock_level==='low'?'#f5a623':'#3ecf8e',
                                item.stock_level==='critical'?'rgba(224,82,82,.15)':item.stock_level==='low'?'rgba(245,166,35,.15)':'rgba(62,207,142,.15)'
                              )}>{item.stock_level}</span>
                            </div>
                          )
                        })}
                      </div>

                      <div style={{ padding:18, display:'flex', gap:8 }}>
                        <Btn label={saving ? '💾 Saving...' : `✅ ${detected.items?.filter(i=>i._selected).length || 0}개 Airtable에 저장`}
                          onClick={addDetectedToInventory} primary
                          disabled={saving || !detected.items?.some(i=>i._selected)} />
                        <Btn label="✕" onClick={() => setDetected(null)} sm />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════ INVENTORY ══════════ */}
          {tab === 'inventory' && (
            <div>
              <div style={{ fontFamily:'serif', fontSize:22, marginBottom:3 }}>Inventory</div>
              <div style={{ fontSize:12, color:'#888', marginBottom:18 }}>수량, Par Level, Supplier를 설정하고 자동 발주를 활성화하세요</div>

              {/* Stats */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
                {[
                  { lbl:'Total Items',  val:inventory.length,  color:null },
                  { lbl:'Critical',     val:criticalCount,     color:'#e05252' },
                  { lbl:'No Par Set',   val:noPar,             color: noPar>0?'#f5a623':null },
                  { lbl:'No Supplier',  val:noSup,             color: noSup>0?'#f5a623':null },
                ].map(s => (
                  <div key={s.lbl} style={{ background:'#161616', border:'1px solid #242424', borderRadius:10, padding:16 }}>
                    <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.8px', color:'#666', marginBottom:6 }}>{s.lbl}</div>
                    <div style={{ fontFamily:'serif', fontSize:28, color: s.color || '#f0ede8' }}>{s.val}</div>
                  </div>
                ))}
              </div>

              {noPar > 0 && <div style={C.alert('#f5a623','rgba(245,166,35,.08)','rgba(245,166,35,.25)')}>
                ⚠️ <strong>{noPar}개 품목</strong>에 Par Level 미설정 — 각 품목의 Edit 버튼을 눌러 설정하세요
              </div>}
              {noSup > 0 && <div style={C.alert('#5b8dee','rgba(91,141,238,.08)','rgba(91,141,238,.25)')}>
                ℹ️ <strong>{noSup}개 품목</strong>에 Supplier 미설정 — 발주서 생성을 위해 지정해 주세요
              </div>}

              {loading ? (
                <div style={{ textAlign:'center', padding:40, color:'#666' }}>⏳ Loading from Airtable...</div>
              ) : inventory.length === 0 ? (
                <div style={C.card}>
                  <div style={{ padding:'48px 20px', textAlign:'center' }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>📷</div>
                    <div style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>Inventory가 비어있습니다</div>
                    <div style={{ fontSize:13, color:'#666', marginBottom:20 }}>Vision Scan에서 사진을 찍어 품목을 추가하세요</div>
                    <Btn label="📷 Vision Scan으로 이동" onClick={() => setTab('vision')} primary />
                  </div>
                </div>
              ) : (
                <div style={C.card}>
                  <div style={C.ch}>
                    <div style={{ fontSize:13.5, fontWeight:600 }}>재고 목록 ({filteredInv.length})</div>
                    <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                      <input type="text" placeholder="🔍 Search..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ ...C.input, width:140, padding:'5px 10px', fontSize:12 }} />
                      {['All',...CATEGORIES].map(c => (
                        <button key={c} onClick={() => setFilter(c)} style={{
                          padding:'4px 10px', borderRadius:20, fontSize:11, cursor:'pointer', fontFamily:'inherit', border:'none',
                          background: invFilter===c ? '#3ecf8e' : 'rgba(255,255,255,.05)',
                          color: invFilter===c ? '#000' : '#888',
                        }}>{c}</button>
                      ))}
                    </div>
                  </div>

                  {filteredInv.map(item => {
                    const s = status(item.cur, item.par)
                    const v = item.par > 0 ? Math.min(pct(item.cur, item.par), 100) : null
                    return (
                      <div key={item.id} style={{ borderBottom:'1px solid #1e1e1e', padding:'12px 18px', display:'flex', alignItems:'center', gap:12 }}>
                        <span style={{ fontSize:24, width:32, textAlign:'center' }}>{item.icon}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:14 }}>{item.name}</div>
                          <div style={{ fontSize:11, color:'#666', marginTop:2 }}>
                            {item.category} · {item.cur} {item.unit}
                            {item.sup && ` · ${item.sup}`}
                          </div>
                          {v !== null && (
                            <div style={{ marginTop:5, display:'flex', alignItems:'center', gap:8 }}>
                              <div style={{ flex:1, height:4, background:'#2a2a2a', borderRadius:2, overflow:'hidden' }}>
                                <div style={{ height:'100%', width:v+'%', background:s.color, borderRadius:2, transition:'width .4s' }} />
                              </div>
                              <span style={{ fontSize:10, color:s.color, fontWeight:600, whiteSpace:'nowrap' }}>{v}% of par</span>
                            </div>
                          )}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          {item.par > 0
                            ? <span style={C.tag(s.color, s.bg)}>{s.lbl}</span>
                            : <span style={C.tag('#666','rgba(255,255,255,.05)')}>No par</span>}
                          {!item.sup && <span style={C.tag('#f5a623','rgba(245,166,35,.1)')}>No supplier</span>}
                          <Btn label="✏️ Edit" onClick={() => setEditModal({ ...item })} sm />
                          <Btn label="🗑" onClick={() => deleteItem(item.id)} sm />
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
            <div>
              <div style={{ fontFamily:'serif', fontSize:22, marginBottom:3 }}>Suppliers</div>
              <div style={{ fontSize:12, color:'#888', marginBottom:18 }}>공급업체 정보를 관리하세요</div>

              <div style={{ marginBottom:16 }}>
                <Btn label="+ Add Supplier" onClick={() => setSupModal({ name:'', phone:'', email:'', leadTime:'' })} primary />
              </div>

              {suppliers.length === 0 ? (
                <div style={C.card}>
                  <div style={{ padding:'40px 20px', textAlign:'center', color:'#666' }}>
                    <div style={{ fontSize:36, marginBottom:10 }}>🏪</div>
                    <div style={{ fontSize:14, fontWeight:600, color:'#f0ede8', marginBottom:4 }}>No suppliers yet</div>
                    <div style={{ fontSize:12 }}>Add suppliers to enable automatic order grouping</div>
                  </div>
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
                  {suppliers.map(sup => (
                    <div key={sup.id} style={{ ...C.card, marginBottom:0, padding:16 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                        <div style={{ fontWeight:600, fontSize:14 }}>🏪 {sup.name}</div>
                        <div style={{ display:'flex', gap:6 }}>
                          <Btn label="✏️" onClick={() => setSupModal({ ...sup })} sm />
                          <Btn label="🗑" onClick={() => deleteSup(sup.id)} sm />
                        </div>
                      </div>
                      {sup.phone && <div style={{ fontSize:12, color:'#888', marginBottom:3 }}>📞 {sup.phone}</div>}
                      {sup.email && <div style={{ fontSize:12, color:'#888', marginBottom:3 }}>✉️ {sup.email}</div>}
                      {sup.leadTime && <div style={{ fontSize:12, color:'#888' }}>🕐 Lead time: {sup.leadTime}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════ ORDERS ══════════ */}
          {tab === 'orders' && (
            <div>
              <div style={{ fontFamily:'serif', fontSize:22, marginBottom:3 }}>Supplier Orders</div>
              <div style={{ fontSize:12, color:'#888', marginBottom:18 }}>Par level 미달 품목의 발주서를 자동 생성합니다</div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
                {(() => {
                  const needs  = inventory.filter(i => i.par > 0 && pct(i.cur,i.par) < 80)
                  const total  = orders ? Object.values(orders).flat().reduce((s,i)=>s+i.lineTotal,0) : 0
                  return [
                    { lbl:'Items to Order', val:needs.length,  color:'#f5a623' },
                    { lbl:'Suppliers',      val:[...new Set(needs.map(i=>i.sup||'Unassigned'))].length, color:null },
                    { lbl:'Critical',       val:criticalCount, color: criticalCount>0?'#e05252':null },
                    { lbl:'Est. Total',     val:fmt(total),    color:'#3ecf8e' },
                  ].map(s => (
                    <div key={s.lbl} style={{ background:'#161616', border:'1px solid #242424', borderRadius:10, padding:16 }}>
                      <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.8px', color:'#666', marginBottom:6 }}>{s.lbl}</div>
                      <div style={{ fontFamily:'serif', fontSize:24, color: s.color || '#f0ede8' }}>{s.val}</div>
                    </div>
                  ))
                })()}
              </div>

              {noPar > 0 && <div style={C.alert('#f5a623','rgba(245,166,35,.08)','rgba(245,166,35,.25)')}>
                ⚠️ {noPar}개 품목에 Par Level 미설정 → Inventory 탭에서 먼저 설정하세요
              </div>}

              {!orders ? (
                <div style={C.card}>
                  <div style={{ padding:'36px 20px', textAlign:'center' }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>📦</div>
                    <div style={{ fontFamily:'serif', fontSize:18, marginBottom:8 }}>발주서 자동 생성</div>
                    <div style={{ fontSize:12, color:'#666', marginBottom:20 }}>Par level 미달 품목을 공급업체별로 자동 그룹핑합니다</div>
                    <Btn label="⚡ Generate Orders" onClick={generateOrders} primary
                      disabled={inventory.filter(i=>i.par>0).length===0} />
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                    <div style={{ fontSize:12, color:'#666' }}>{Object.keys(orders).length}개 발주서 생성됨</div>
                    <Btn label="↺ Reset" onClick={() => { setOrders(null); setSent({}) }} sm />
                  </div>

                  {Object.entries(orders).map(([supName, items]) => {
                    const supInfo = suppliers.find(s => s.name === supName)
                    const subT = items.reduce((s,i) => s+i.lineTotal, 0)
                    return (
                      <div key={supName} style={{ border:'1px solid #242424', borderRadius:10, overflow:'hidden', marginBottom:12 }}>
                        <div style={{ background:'rgba(62,207,142,.08)', borderBottom:'1px solid #242424', padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <div>
                            <div style={{ fontWeight:600, fontSize:13 }}>🏪 {supName}</div>
                            {supInfo && <div style={{ fontSize:11, color:'#666', marginTop:2 }}>
                              {supInfo.phone && `📞 ${supInfo.phone}  `}{supInfo.email && `✉️ ${supInfo.email}`}
                            </div>}
                          </div>
                          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                            {supInfo?.leadTime && <span style={C.tag('#5b8dee','rgba(91,141,238,.15)')}>🕐 {supInfo.leadTime}</span>}
                            {sentMap[supName]
                              ? <span style={C.tag('#3ecf8e','rgba(62,207,142,.15)')}>✓ Sent</span>
                              : <Btn label="📧 Send Order" onClick={() => setSent(s=>({...s,[supName]:true}))} primary sm />}
                          </div>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 90px', gap:12, padding:'7px 16px', fontSize:10, textTransform:'uppercase', letterSpacing:'.6px', color:'#666', background:'rgba(255,255,255,.02)' }}>
                          <span>Item</span><span>Qty</span><span>Cost</span><span>Total</span>
                        </div>
                        {items.map(item => (
                          <div key={item.id} style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 90px', gap:12, padding:'8px 16px', borderTop:'1px solid #1a1a1a', fontSize:13, alignItems:'center' }}>
                            <span>{item.icon} {item.name}{pct(item.cur,item.par)<=30&&<span style={{...C.tag('#e05252','rgba(224,82,82,.15)'),marginLeft:6}}>Urgent</span>}</span>
                            <span style={{ fontWeight:600 }}>{item.qty} {item.unit}</span>
                            <span style={{ color:'#666' }}>{item.cost ? fmt(item.cost) : '—'}</span>
                            <span style={{ fontWeight:600 }}>{item.cost ? fmt(item.lineTotal) : '—'}</span>
                          </div>
                        ))}
                        <div style={{ padding:'9px 16px', display:'flex', justifyContent:'flex-end', gap:8, fontSize:13, fontWeight:600, borderTop:'1px solid #242424', background:'rgba(255,255,255,.02)' }}>
                          <span style={{ fontWeight:400, color:'#666' }}>Subtotal:</span>
                          <span>{subT > 0 ? fmt(subT) : '(no cost set)'}</span>
                        </div>
                      </div>
                    )
                  })}

                  <div style={{ ...C.card, padding:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontFamily:'serif', fontSize:18 }}>Total Order Value</div>
                    <div style={{ fontFamily:'serif', fontSize:24, color:'#3ecf8e' }}>
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
          <div style={{ background:'#161616', border:'1px solid #2a2a2a', borderRadius:16, width:'100%', maxWidth:560, maxHeight:'90vh', overflow:'auto' }}>
            <div style={{ padding:'18px 20px', borderBottom:'1px solid #242424', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:16, fontWeight:600 }}>{editModal.icon} {editModal.name}</div>
              <button onClick={() => setEditModal(null)} style={{ background:'none', border:'none', color:'#888', fontSize:20, cursor:'pointer' }}>✕</button>
            </div>

            <div style={{ padding:20, display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

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

            <div style={{ padding:'0 20px 20px', display:'flex', gap:8, justifyContent:'flex-end' }}>
              <Btn label="Cancel" onClick={() => setEditModal(null)} />
              <Btn label="💾 Save to Airtable" primary onClick={async () => {
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
          <div style={{ background:'#161616', border:'1px solid #2a2a2a', borderRadius:16, width:'100%', maxWidth:440 }}>
            <div style={{ padding:'18px 20px', borderBottom:'1px solid #242424', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:16, fontWeight:600 }}>{supModal.id ? 'Edit Supplier' : 'Add Supplier'}</div>
              <button onClick={() => setSupModal(null)} style={{ background:'none', border:'none', color:'#888', fontSize:20, cursor:'pointer' }}>✕</button>
            </div>

            <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
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

            <div style={{ padding:'0 20px 20px', display:'flex', gap:8, justifyContent:'space-between' }}>
              <div>
                {supModal.id && <Btn label="🗑 Delete" onClick={() => deleteSup(supModal.id)} color="#e05252" />}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <Btn label="Cancel" onClick={() => setSupModal(null)} />
                <Btn label="💾 Save" primary onClick={() => saveSupplier(supModal)} disabled={!supModal.name} />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
