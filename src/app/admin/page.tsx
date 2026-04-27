'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, Product, SECTIONS } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'

const IDLE_TIMEOUT_MS = 3 * 60 * 1000

const EMPTY_PRODUCT: Omit<Product, 'id' | 'created_at' | 'updated_at'> = {
  section: SECTIONS[0], brand_model: '', colour: '', capacity: '', garantie: '', price_per_unit: 0, usp: '',
}

function IdleBanner({ secondsLeft }: { secondsLeft: number }) {
  if (secondsLeft > 30) return null
  return (
    <div style={{
      background: secondsLeft <= 10 ? '#FEE2E2' : '#FEF3C7',
      border: `1px solid ${secondsLeft <= 10 ? '#FECACA' : '#FDE68A'}`,
      borderRadius: 8, padding: '10px 16px', marginBottom: 16,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontSize: 13, color: secondsLeft <= 10 ? 'var(--danger)' : '#92400E', fontWeight: 500,
    }}>
      <span>⏱ Admin session expires in <strong>{secondsLeft}s</strong> due to inactivity</span>
      <span style={{ fontSize: 11, opacity: 0.7 }}>Move mouse or type to reset</span>
    </div>
  )
}

export default function AdminPage() {
  const { isAdmin, role } = useAuth()
  const router = useRouter()

  // Redirect non-admins
  useEffect(() => {
    if (role !== null && !isAdmin) router.push('/')
  }, [isAdmin, role, router])

  const [secondsLeft, setSecondsLeft] = useState(IDLE_TIMEOUT_MS / 1000)
  const [lockedOut, setLockedOut] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState(false)
  const lastActivity = useRef<number>(Date.now())
  const countdownTimer = useRef<NodeJS.Timeout | null>(null)

  const resetTimer = useCallback(() => { lastActivity.current = Date.now(); setSecondsLeft(IDLE_TIMEOUT_MS / 1000) }, [])

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, IDLE_TIMEOUT_MS - (Date.now() - lastActivity.current))
      setSecondsLeft(Math.ceil(remaining / 1000))
      if (remaining <= 0) setLockedOut(true)
    }
    countdownTimer.current = setInterval(tick, 1000)
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetTimer))
    return () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current)
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [resetTimer])

  // Admin panel products state
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ ...EMPTY_PRODUCT })
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [filterSection, setFilterSection] = useState('all')
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'products' | 'manpower'>('products')
  const [manpowerRate, setManpowerRate] = useState<number>(0)
  const [rateLoading, setRateLoading] = useState(true)
  const [rateSaving, setRateSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('section').order('brand_model')
    if (data) setProducts(data)
    setLoading(false)
  }

  const loadRate = async () => {
    setRateLoading(true)
    const { data } = await supabase.from('settings').select('value').eq('key', 'manpower_daily_rate').single()
    if (data) setManpowerRate(parseFloat(data.value) || 0)
    setRateLoading(false)
  }

  useEffect(() => { load(); loadRate() }, [])

  const showAlert = (type: 'success' | 'error', msg: string) => { setAlert({ type, msg }); setTimeout(() => setAlert(null), 3500) }

  const saveRate = async () => {
    setRateSaving(true)
    await supabase.from('settings').upsert({ key: 'manpower_daily_rate', value: manpowerRate.toString() }, { onConflict: 'key' })
    setRateSaving(false)
    showAlert('success', 'Default manpower rate saved.')
  }

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY_PRODUCT }); setShowModal(true) }
  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({ section: p.section, brand_model: p.brand_model, colour: p.colour || '', capacity: p.capacity || '', garantie: p.garantie || '', price_per_unit: p.price_per_unit, usp: p.usp || '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.brand_model.trim()) { showAlert('error', 'Please enter a brand/model name.'); return }
    if (form.price_per_unit <= 0) { showAlert('error', 'Price must be greater than 0.'); return }
    setSaving(true)
    const payload = { section: form.section, brand_model: form.brand_model.trim(), colour: form.colour?.trim() || null, capacity: form.capacity?.trim() || null, garantie: form.garantie?.trim() || null, price_per_unit: Number(form.price_per_unit), usp: form.usp?.trim() || null }
    if (editing) {
      const { error } = await supabase.from('products').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id)
      if (error) showAlert('error', 'Error saving.'); else showAlert('success', 'Product updated.')
    } else {
      const { error } = await supabase.from('products').insert([payload])
      if (error) showAlert('error', 'Error creating.'); else showAlert('success', 'Product added.')
    }
    setSaving(false); setShowModal(false); await load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return
    setDeleting(id); await supabase.from('products').delete().eq('id', id); await load(); setDeleting(null)
  }

  const filtered = products.filter(p => {
    const sm = filterSection === 'all' || p.section === filterSection
    const sr = !search || p.brand_model.toLowerCase().includes(search.toLowerCase())
    return sm && sr
  })

  const f = (field: keyof typeof form, value: string | number) => setForm(prev => ({ ...prev, [field]: value }))

  // Lock screen overlay
  if (lockedOut) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto' }}>
        <div className="card" style={{ padding: 36, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Session Locked</div>
          <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 24 }}>Re-enter your admin password to continue.</div>
          <div className="form-group" style={{ marginBottom: 14, textAlign: 'left' }}>
            <label>Admin Password</label>
            <input type="password" value={adminPassword} onChange={e => { setAdminPassword(e.target.value); setAdminError(false) }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const { PASSWORDS } = require('@/lib/auth')
                  if (adminPassword === PASSWORDS.admin) { setLockedOut(false); resetTimer() }
                  else { setAdminError(true); setAdminPassword('') }
                }
              }}
              placeholder="Enter admin password" autoFocus
              style={{ borderColor: adminError ? 'var(--danger)' : undefined }} />
            {adminError && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>Incorrect password.</div>}
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => {
            const { PASSWORDS } = require('@/lib/auth')
            if (adminPassword === PASSWORDS.admin) { setLockedOut(false); resetTimer() }
            else { setAdminError(true); setAdminPassword('') }
          }}>
            Unlock
          </button>
        </div>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div style={{ maxWidth: 1100 }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Manage Products</div>
          <div className="page-subtitle">{products.length} products in the system</div>
        </div>
        {activeTab === 'products' && (
          <button className="btn btn-primary" onClick={openAdd}><PlusIcon /> Add Product</button>
        )}
      </div>

      <IdleBanner secondsLeft={secondsLeft} />
      {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--gray-light)', marginBottom: 20 }}>
        {(['products', 'manpower'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            color: activeTab === tab ? 'var(--green)' : 'var(--gray)',
            borderBottom: activeTab === tab ? '2px solid var(--green)' : '2px solid transparent',
            marginBottom: -2,
          }}>
            {tab === 'products' ? '📦 Products' : '👷 Manpower Settings'}
          </button>
        ))}
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <>
          <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
            <select style={{ width: 200 }} value={filterSection} onChange={e => setFilterSection(e.target.value)}>
              <option value="all">All Sections</option>
              {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input style={{ width: 240 }} placeholder="Search by product..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {loading ? <div className="empty-state"><p>Loading...</p></div>
              : filtered.length === 0 ? <div className="empty-state"><p>No products found.</p></div>
              : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Section</th><th>Brand / Model</th><th>Capacity</th><th>Colour</th>
                      <th>Warranty</th><th style={{ textAlign: 'right' }}>Price / Unit</th><th>USP</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr key={p.id}>
                        <td><span className="badge badge-section">{p.section}</span></td>
                        <td style={{ fontWeight: 600 }}>{p.brand_model}</td>
                        <td className="text-sm text-gray">{p.capacity || '—'}</td>
                        <td className="text-sm text-gray">{p.colour || '—'}</td>
                        <td className="text-sm text-gray">{p.garantie ? `${p.garantie} yrs.` : '—'}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'Space Mono, monospace', fontWeight: 700, fontSize: 12 }}>{Number(p.price_per_unit).toFixed(2)} €</td>
                        <td className="text-sm text-gray" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.usp || '—'}</td>
                        <td>
                          <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}><EditIcon /> Edit</button>
                            <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(p.id)} disabled={deleting === p.id}><TrashIcon /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        </>
      )}

      {/* Manpower Settings Tab */}
      {activeTab === 'manpower' && (
        <div className="card" style={{ padding: 28, maxWidth: 500 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Default Manpower Daily Rate</div>
          <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 20 }}>
            This sets the default daily rate per person pre-filled when creating a new offer. It can still be overridden per offer.
          </div>
          {rateLoading ? <p style={{ color: 'var(--gray)' }}>Loading...</p> : (
            <>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Daily Rate per Person (€)</label>
                <input type="number" min={0} step={0.01} value={manpowerRate}
                  onChange={e => setManpowerRate(parseFloat(e.target.value) || 0)} placeholder="e.g. 350.00" />
              </div>
              <button className="btn btn-primary" onClick={saveRate} disabled={rateSaving}>
                {rateSaving ? 'Saving...' : 'Save Default Rate'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal">
            <div className="modal-title">{editing ? 'Edit Product' : 'Add New Product'}</div>
            <div className="form-grid">
              <div className="form-group">
                <label>Section *</label>
                <select value={form.section} onChange={e => f('section', e.target.value)}>
                  {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Price per Unit (€) *</label>
                <input type="number" min={0} step={0.01} value={form.price_per_unit} onChange={e => f('price_per_unit', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="form-group full">
                <label>Brand / Model *</label>
                <input value={form.brand_model} onChange={e => f('brand_model', e.target.value)} placeholder="e.g. Huawei | LUNA2000-7-S1" />
              </div>
              <div className="form-group">
                <label>Capacity</label>
                <input value={form.capacity} onChange={e => f('capacity', e.target.value)} placeholder="e.g. 6.9 or 440W" />
              </div>
              <div className="form-group">
                <label>Colour</label>
                <input value={form.colour} onChange={e => f('colour', e.target.value)} placeholder="e.g. Black, Silver" />
              </div>
              <div className="form-group">
                <label>Warranty (years)</label>
                <input value={form.garantie} onChange={e => f('garantie', e.target.value)} placeholder="e.g. 10 or 25 / 30" />
              </div>
              <div className="form-group full">
                <label>USP / Key Features</label>
                <input value={form.usp} onChange={e => f('usp', e.target.value)} placeholder="e.g. Includes backup power, SG-Ready" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const PlusIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const EditIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const TrashIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
