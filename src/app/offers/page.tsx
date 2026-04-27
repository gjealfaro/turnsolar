'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { downloadOfferPDF } from '@/lib/pdf'
import { useOfferForm } from '@/lib/offerFormStore'
import SendQuoteModal from '@/components/SendQuoteModal'

type SavedOffer = {
  id: string
  offer_number: string
  version: number
  date: string
  first_name: string
  last_name: string
  email: string
  phone: string
  salutation: string
  address: string
  postal_code: string
  total_price: number
  items: any[]
  manpower: any
  mobilization_fee: number
  mobilization_enabled: boolean
  created_at: string
}

export default function OffersPage() {
  const [offers, setOffers] = useState<SavedOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [sendingOffer, setSendingOffer] = useState<SavedOffer | null>(null)
  const { loadFromOffer } = useOfferForm()
  const router = useRouter()

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('offers')
      .select('*')
      .order('offer_number', { ascending: false })
      .order('version', { ascending: false })
    if (data) setOffers(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = offers.filter(o => {
    const q = search.toLowerCase()
    return (
      o.offer_number?.toLowerCase().includes(q) ||
      o.first_name?.toLowerCase().includes(q) ||
      o.last_name?.toLowerCase().includes(q) ||
      o.email?.toLowerCase().includes(q)
    )
  })

  // Group offers by offer_number to show versions together
  const grouped: Record<string, SavedOffer[]> = {}
  filtered.forEach(o => {
    if (!grouped[o.offer_number]) grouped[o.offer_number] = []
    grouped[o.offer_number].push(o)
  })

  const handleEdit = (offer: SavedOffer) => {
    // Find highest version for this offer_number
    const versions = grouped[offer.offer_number] || []
    const maxVersion = Math.max(...versions.map(v => v.version || 1))
    loadFromOffer(offer, maxVersion + 1)
    router.push('/')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this offer version?')) return
    setDeleting(id)
    await supabase.from('offers').delete().eq('id', id)
    await load()
    setDeleting(null)
  }

  const handleExport = (offer: SavedOffer) => {
    downloadOfferPDF({
      id: offer.id,
      offer_number: offer.offer_number,
      version: offer.version || 1,
      date: offer.date,
      first_name: offer.first_name,
      last_name: offer.last_name,
      salutation: offer.salutation,
      address: offer.address,
      postal_code: offer.postal_code,
      email: offer.email,
      phone: offer.phone,
      items: offer.items || [],
      manpower: offer.manpower || { days: 0, people: 0, daily_rate: 0, subtotal: 0 },
      mobilization_fee: offer.mobilization_fee || 0,
      mobilization_enabled: offer.mobilization_enabled || false,
      total_price: offer.total_price,
    })
  }

  const toOfferType = (o: SavedOffer) => ({
    id: o.id,
    offer_number: o.offer_number,
    version: o.version || 1,
    date: o.date,
    first_name: o.first_name,
    last_name: o.last_name,
    salutation: o.salutation,
    address: o.address,
    postal_code: o.postal_code,
    email: o.email,
    phone: o.phone,
    items: o.items || [],
    manpower: o.manpower || { days: 0, people: 0, daily_rate: 0, subtotal: 0 },
    mobilization_fee: o.mobilization_fee || 0,
    mobilization_enabled: o.mobilization_enabled || false,
    total_price: o.total_price,
  })

  return (
    <div style={{ maxWidth: 1000 }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Saved Offers</div>
          <div className="page-subtitle">{Object.keys(grouped).length} offer{Object.keys(grouped).length !== 1 ? 's' : ''} · {offers.length} version{offers.length !== 1 ? 's' : ''} total</div>
        </div>
        <input style={{ width: 240 }} placeholder="Search by name, number, email..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="card"><div className="empty-state"><p>Loading...</p></div></div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card"><div className="empty-state"><DocIcon /><p>{search ? 'No offers found.' : 'No offers created yet.'}</p></div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(grouped).map(([offerNumber, versions]) => {
            const latest = versions[0]
            const hasMultiple = versions.length > 1
            return (
              <div key={offerNumber} className="card" style={{ overflow: 'hidden' }}>
                {/* Offer group header */}
                <div style={{
                  padding: '14px 20px', background: 'var(--gray-xlight)',
                  borderBottom: '1px solid var(--gray-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                      #{offerNumber}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>
                      {latest.salutation} {latest.first_name} {latest.last_name}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--gray)' }}>{latest.email}</span>
                    {hasMultiple && (
                      <span style={{
                        background: 'rgba(230,90,30,0.1)', color: 'var(--green)',
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                      }}>
                        {versions.length} versions
                      </span>
                    )}
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => handleEdit(latest)}>
                    <EditIcon /> Edit / New Version
                  </button>
                </div>

                {/* Version rows */}
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Version</th>
                      <th>Date</th>
                      <th>Items</th>
                      <th>Manpower</th>
                      <th>Mobilization</th>
                      <th style={{ textAlign: 'right' }}>Total Price</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versions.map((offer, idx) => {
                      const mpTotal = offer.manpower ? (offer.manpower.days * offer.manpower.people * offer.manpower.daily_rate) : 0
                      return (
                        <tr key={offer.id}>
                          <td>
                            <span style={{
                              background: idx === 0 ? 'var(--dark)' : 'var(--gray-xlight)',
                              color: idx === 0 ? 'white' : 'var(--gray)',
                              padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                            }}>
                              v{offer.version || 1} {idx === 0 ? '· latest' : ''}
                            </span>
                          </td>
                          <td className="text-sm text-gray">{offer.date}</td>
                          <td>
                            <span className="badge badge-section">
                              {Array.isArray(offer.items) ? offer.items.filter((i: any) => i.quantity > 0).length : 0} items
                            </span>
                          </td>
                          <td className="text-sm text-gray">
                            {mpTotal > 0 ? `${mpTotal.toFixed(2)} €` : '—'}
                          </td>
                          <td className="text-sm text-gray">
                            {offer.mobilization_enabled && offer.mobilization_fee > 0 ? `${Number(offer.mobilization_fee).toFixed(2)} €` : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'Space Mono, monospace', fontWeight: 700 }}>
                            {Number(offer.total_price).toFixed(2)} €
                          </td>
                          <td>
                            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => handleExport(offer)}>
                                <PdfIcon /> PDF
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setSendingOffer(offer)}>
                                <SendIcon /> Send
                              </button>
                              <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(offer.id)} disabled={deleting === offer.id}>
                                <TrashIcon />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}

      {sendingOffer && (
        <SendQuoteModal offer={toOfferType(sendingOffer)} onClose={() => setSendingOffer(null)} />
      )}
    </div>
  )
}

const DocIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ display: 'block' }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
)
const EditIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const PdfIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
const SendIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
const TrashIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
