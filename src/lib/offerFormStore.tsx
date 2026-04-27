'use client'
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { SECTIONS } from './supabase'

export type SectionRowState = { selectedProductId: string; quantity: number }

export type OfferFormState = {
  offerNumber: string
  editingOfferId: string | null
  editingVersion: number
  date: string
  client: {
    first_name: string
    last_name: string
    salutation: string
    address: string
    postal_code: string
    email: string
    phone: string
  }
  sectionStates: Record<string, SectionRowState[]>
  manpowerDays: number
  manpowerPeople: number
  manpowerDailyRate: number
  mobilizationEnabled: boolean
  mobilizationFee: number
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function newOfferNumber() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 900 + 100)}`
}

function defaultState(): OfferFormState {
  return {
    offerNumber: newOfferNumber(),
    editingOfferId: null,
    editingVersion: 1,
    date: today(),
    client: { first_name: '', last_name: '', salutation: 'Mr.', address: '', postal_code: '', email: '', phone: '' },
    sectionStates: Object.fromEntries(SECTIONS.map(s => [s, [{ selectedProductId: '', quantity: 0 }]])),
    manpowerDays: 0,
    manpowerPeople: 0,
    manpowerDailyRate: 0,
    mobilizationEnabled: false,
    mobilizationFee: 0,
  }
}

const STORAGE_KEY = 'solar_offer_form'

type OfferFormContextType = {
  form: OfferFormState
  setForm: (form: OfferFormState) => void
  updateForm: (partial: Partial<OfferFormState>) => void
  resetForm: () => void
  loadFromOffer: (offer: any, newVersion: number) => void
}

const OfferFormContext = createContext<OfferFormContextType>({
  form: defaultState(),
  setForm: () => {},
  updateForm: () => {},
  resetForm: () => {},
  loadFromOffer: () => {},
})

export function OfferFormProvider({ children }: { children: ReactNode }) {
  const [form, setFormState] = useState<OfferFormState>(defaultState)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setFormState(parsed)
      }
    } catch {}
    setHydrated(true)
  }, [])

  const setForm = useCallback((newForm: OfferFormState) => {
    setFormState(newForm)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newForm)) } catch {}
  }, [])

  const updateForm = useCallback((partial: Partial<OfferFormState>) => {
    setFormState(prev => {
      const next = { ...prev, ...partial }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const resetForm = useCallback(() => {
    const fresh = defaultState()
    setFormState(fresh)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)) } catch {}
  }, [])

  const loadFromOffer = useCallback((offer: any, newVersion: number) => {
    // Rebuild sectionStates from saved items
    const sectionStates: Record<string, SectionRowState[]> = Object.fromEntries(
      SECTIONS.map(s => [s, [{ selectedProductId: '', quantity: 0 }]])
    )
    if (Array.isArray(offer.items)) {
      const bySec: Record<string, SectionRowState[]> = {}
      offer.items.forEach((item: any) => {
        const sec = item.product?.section
        if (!sec) return
        if (!bySec[sec]) bySec[sec] = []
        bySec[sec].push({ selectedProductId: item.product.id, quantity: item.quantity })
      })
      SECTIONS.forEach(s => { if (bySec[s]) sectionStates[s] = bySec[s] })
    }

    const mp = offer.manpower || {}
    const next: OfferFormState = {
      offerNumber: offer.offer_number,
      editingOfferId: offer.id,
      editingVersion: newVersion,
      date: today(),
      client: {
        first_name: offer.first_name || '',
        last_name: offer.last_name || '',
        salutation: offer.salutation || 'Mr.',
        address: offer.address || '',
        postal_code: offer.postal_code || '',
        email: offer.email || '',
        phone: offer.phone || '',
      },
      sectionStates,
      manpowerDays: mp.days || 0,
      manpowerPeople: mp.people || 0,
      manpowerDailyRate: mp.daily_rate || 0,
      mobilizationEnabled: offer.mobilization_enabled || false,
      mobilizationFee: offer.mobilization_fee || 0,
    }
    setFormState(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
  }, [])

  if (!hydrated) return null

  return (
    <OfferFormContext.Provider value={{ form, setForm, updateForm, resetForm, loadFromOffer }}>
      {children}
    </OfferFormContext.Provider>
  )
}

export const useOfferForm = () => useContext(OfferFormContext)
