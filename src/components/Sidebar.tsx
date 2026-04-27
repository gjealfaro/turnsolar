'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { TurnSolarLogo } from './TurnSolarLogo'

export default function Sidebar() {
  const pathname = usePathname()
  const { isAdmin, logout, role } = useAuth()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <TurnSolarLogo width={140} />
      </div>

      <nav>
        <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}><FileIcon /> New Offer</Link>
        <Link href="/offers" className={`nav-link ${pathname === '/offers' ? 'active' : ''}`}><ListIcon /> Saved Offers</Link>
        {isAdmin && (
          <Link href="/admin" className={`nav-link ${pathname === '/admin' ? 'active' : ''}`}><DatabaseIcon /> Manage Products</Link>
        )}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
            Signed in as&nbsp;
            <span style={{ color: isAdmin ? '#95D43E' : 'rgba(255,255,255,0.7)', fontWeight: 700, textTransform: 'capitalize' }}>
              {role}
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
            color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLElement).style.color = 'white' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
        >
          <LogoutIcon /> Sign Out
        </button>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 10 }}>Solar Offers v2.0 · Prices excl. VAT</div>
      </div>
    </aside>
  )
}

const FileIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
const ListIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
const DatabaseIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
const LogoutIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
