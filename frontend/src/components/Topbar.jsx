import { useLocation, Link } from 'react-router-dom'
import { Menu, Globe, ChevronRight, AlertCircle } from 'lucide-react'

const CRUMB_MAP = {
  '/dashboard': ['Core Operations', 'Boundary Overview'],
  '/workspaces': ['Core Operations', 'Tenant Workspaces'],
  '/scanner': ['BOLA Verification', 'Security Scanner'],
  '/results': ['BOLA Verification', 'Scan Evidence'],
}

export default function Topbar({ onOpenMobileSidebar }) {
  const { pathname } = useLocation()
  const crumbs = CRUMB_MAP[pathname] || ['TenantGuard']

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
          className="md:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100"
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
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px]"
          style={{
            background: '#F8FAFC',
            border: '1px solid #E1E7EF',
            color: '#52637A',
          }}
        >
          <Globe className="h-3.5 w-3.5" style={{ color: '#8A9BB0' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
            http://127.0.0.1:8000
          </span>
          <span
            className="flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded"
            style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}
          >
            <AlertCircle className="h-3 w-3" />
            Offline
          </span>
        </div>
      </div>
    </header>
  )
}
