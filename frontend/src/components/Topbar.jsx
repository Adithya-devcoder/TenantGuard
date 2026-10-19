import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, Globe, ChevronRight, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import { checkBackendConnection, API_BASE_URL } from '../services/api'

const CRUMB_MAP = {
  '/dashboard': ['Core Operations', 'Boundary Overview'],
  '/workspaces': ['Core Operations', 'Tenant Workspaces'],
  '/scanner': ['BOLA Verification', 'Security Scanner'],
  '/results': ['BOLA Verification', 'Scan Evidence'],
}

export default function Topbar({ onOpenMobileSidebar }) {
  const { pathname } = useLocation()
  const crumbs = CRUMB_MAP[pathname] || ['TenantGuard']

  const [backendState, setBackendState] = useState({
    status: 'checking', // 'checking' | 'online' | 'offline'
    details: null,
    database: null,
  })
  const [isChecking, setIsChecking] = useState(false)

  const verifyHealth = useCallback(async () => {
    setIsChecking(true)
    try {
      const res = await checkBackendConnection()
      if (res.connected && res.status === 'ok') {
        setBackendState({
          status: 'online',
          details: null,
          database: res.database || 'connected',
        })
      } else {
        setBackendState({
          status: 'offline',
          details: res.error || 'Connection failed',
          database: null,
        })
      }
    } catch (err) {
      setBackendState({
        status: 'offline',
        details: err.message || 'Connection error',
        database: null,
      })
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    verifyHealth()
    const interval = setInterval(verifyHealth, 15000)
    return () => clearInterval(interval)
  }, [verifyHealth])

  return (
    <header
      className="h-14 flex-shrink-0 flex items-center justify-between px-6"
      style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E1E7EF',
      }}
    >
      {/* Left: Hamburger + Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="md:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[13px]">
          <span style={{ color: '#8A9BB0' }}>TenantGuard</span>
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5" style={{ color: '#C8D3E0' }} />
              <span
                style={{
                  color: i === crumbs.length - 1 ? '#0D1526' : '#8A9BB0',
                  fontWeight: i === crumbs.length - 1 ? '600' : '400',
                }}
              >
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Right: Target API indicator */}
      <div className="flex items-center gap-3">
        <div
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] transition-all"
          style={{
            background: '#F8FAFC',
            border: '1px solid #E1E7EF',
            color: '#52637A',
          }}
          title={
            backendState.status === 'online'
              ? `Backend: Online (${API_BASE_URL}) | Database: ${backendState.database || 'connected'}`
              : backendState.status === 'checking'
              ? `Checking connectivity to ${API_BASE_URL}...`
              : `Backend: Offline (${API_BASE_URL}) | ${backendState.details || 'Connection refused'}`
          }
        >
          <Globe className="h-3.5 w-3.5" style={{ color: '#8A9BB0' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
            {API_BASE_URL}
          </span>

          {backendState.status === 'online' ? (
            <button
              type="button"
              onClick={verifyHealth}
              disabled={isChecking}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded cursor-pointer transition-colors"
              style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}
              title="Backend online. Click to re-verify"
            >
              <span className={`h-1.5 w-1.5 rounded-full bg-emerald-500 ${isChecking ? 'animate-ping' : ''}`} />
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              Online
            </button>
          ) : backendState.status === 'checking' ? (
            <span
              className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded"
              style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' }}
            >
              <RefreshCw className="h-3 w-3 animate-spin text-slate-500" />
              Checking...
            </span>
          ) : (
            <button
              type="button"
              onClick={verifyHealth}
              disabled={isChecking}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded cursor-pointer transition-colors"
              style={{ background: '#FFF1F2', color: '#9F1239', border: '1px solid #FECDD3' }}
              title={`Backend offline. Click to retry. Details: ${backendState.details || 'Connection refused'}`}
            >
              <AlertCircle className="h-3 w-3 text-rose-600" />
              Offline
            </button>
          )}
        </div>
      </div>
    </header>
  )
}