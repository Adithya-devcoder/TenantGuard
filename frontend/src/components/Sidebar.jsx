import { NavLink } from 'react-router-dom'
import {
  Shield,
  LayoutDashboard,
  Building2,
  ScanSearch,
  FileCheck2,
  Server,
  X,
  Zap,
} from 'lucide-react'

const navGroups = [
  {
    groupTitle: 'Operations',
    items: [
      {
        name: 'Boundary Overview',
        to: '/dashboard',
        icon: LayoutDashboard,
        badge: null,
      },
      {
        name: 'Tenant Workspaces',
        to: '/workspaces',
        icon: Building2,
        badge: null,
      },
    ],
  },
  {
    groupTitle: 'BOLA Verification',
    items: [
      {
        name: 'Security Scanner',
        to: '/scanner',
        icon: ScanSearch,
        badge: 'Ready',
      },
      {
        name: 'Scan Evidence',
        to: '/results',
        icon: FileCheck2,
        badge: null,
      },
    ],
  },
]

export default function Sidebar({ onClose }) {
  return (
    <aside className="w-64 flex flex-col h-full flex-shrink-0 select-none" style={{ background: '#07111F' }}>
      {/* Brand Header */}
      <div
        className="h-16 px-5 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid #162035' }}
      >
        <div className="flex items-center gap-3">
          {/* Shield logo with glow */}
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)',
              boxShadow: '0 0 16px rgba(29,78,216,0.35)',
            }}
          >
            <Shield className="h-4.5 w-4.5 text-white" style={{ height: '18px', width: '18px' }} />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-white tracking-tight leading-tight">
              TenantGuard
            </span>
            <span className="text-[11px] leading-tight" style={{ color: '#4A6080' }}>
              BOLA Security Platform
            </span>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-1.5 rounded-md transition-colors"
            style={{ color: '#4A6080' }}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div
        className="flex-1 overflow-y-auto py-5 px-3 space-y-7 sidebar-scroll"
      >
        {navGroups.map((group) => (
          <div key={group.groupTitle}>
            <div
              className="px-3 pb-2.5 text-[10px] font-semibold tracking-widest uppercase"
              style={{ color: '#2D4260', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
            >
              {group.groupTitle}
            </div>
            <nav className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => { if (onClose) onClose() }}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-150 group ${
                        isActive
                          ? 'text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`
                    }
                    style={({ isActive }) =>
                      isActive
                        ? {
                            background: 'rgba(29,78,216,0.18)',
                            borderLeft: '2px solid #3B82F6',
                            paddingLeft: '10px',
                          }
                        : {
                            background: 'transparent',
                          }
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3">
                          <Icon
                            className="h-4 w-4 flex-shrink-0 transition-colors"
                            style={{ color: isActive ? '#60A5FA' : undefined }}
                          />
                          <span className="text-[13px] font-medium">{item.name}</span>
                        </div>
                        {item.badge && (
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(29,78,216,0.25)', color: '#93C5FD' }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* System Status Footer */}
      <div
        className="p-3 flex-shrink-0"
        style={{ borderTop: '1px solid #162035' }}
      >
        <div
          className="px-3 py-2.5 rounded-lg flex items-center justify-between"
          style={{ background: '#0C1A2E' }}
        >
          <div className="flex items-center gap-2.5">
            <Server className="h-3.5 w-3.5" style={{ color: '#4A6080' }} />
            <div className="flex flex-col">
              <span className="text-[12px] font-medium" style={{ color: '#7A90A8' }}>
                FastAPI Backend
              </span>
              <span className="text-[10px]" style={{ color: '#3D5070', fontFamily: 'var(--font-mono)' }}>
                Awaiting connection
              </span>
            </div>
          </div>
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: '#2D4260' }}
            title="Unverified"
          />
        </div>

        {/* Version tag */}
        <div className="mt-2.5 px-3 flex items-center gap-1.5">
          <Zap className="h-3 w-3" style={{ color: '#2D4260' }} />
          <span className="text-[10px]" style={{ color: '#2D4260', fontFamily: 'var(--font-mono)' }}>
            v0.1.0-beta · Hackathon Build
          </span>
        </div>
      </div>
    </aside>
  )
}
