import { useState } from 'react'
import {
  RefreshCw,
  Key,
  Lock,
  Database,
  Info,
  AlertTriangle,
  FileText,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react'
import { getInvoices, loginUser } from '../services/api'

// Illustrative demo invoice data for structure visualization — not real database records
const DEMO_INVOICES = [
  {
    id: 101,
    tenant: 'Tenant A (Acme Corp)',
    tenantId: 1,
    customer: 'Acme Logistics Ltd',
    amount: '$4,200.00',
    status: 'Paid',
    statusColor: 'emerald',
    boundaryPolicy: 'Accessible to Tenant A only',
    isCallerOwned: true,
  },
  {
    id: 102,
    tenant: 'Tenant A (Acme Corp)',
    tenantId: 1,
    customer: 'Acme Retail Services',
    amount: '$1,850.00',
    status: 'Pending',
    statusColor: 'amber',
    boundaryPolicy: 'Accessible to Tenant A only',
    isCallerOwned: true,
  },
  {
    id: 201,
    tenant: 'Tenant B (Globex Inc)',
    tenantId: 2,
    customer: 'Globex Holdings Group',
    amount: '$12,400.00',
    status: 'Paid',
    statusColor: 'emerald',
    boundaryPolicy: 'Isolated — deny cross-tenant access',
    isCallerOwned: false,
  },
  {
    id: 202,
    tenant: 'Tenant B (Globex Inc)',
    tenantId: 2,
    customer: 'Globex Defense Systems',
    amount: '$9,300.00',
    status: 'Overdue',
    statusColor: 'rose',
    boundaryPolicy: 'Isolated — deny cross-tenant access',
    isCallerOwned: false,
  },
]

const STATUS_STYLE = {
  emerald: { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
  amber: { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
  rose: { bg: '#FFF1F2', text: '#9F1239', border: '#FECDD3' },
}

export default function Workspaces() {
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [showDemoTable, setShowDemoTable] = useState(true)
  const [liveSuccess, setLiveSuccess] = useState(null)
  const [selectedTenant, setSelectedTenant] = useState('tenant_a') // 'tenant_a' | 'tenant_b'
  const [liveData, setLiveData] = useState(null) // null | { tenantKey, tenantName, tenantId, username, boundaryPolicy, items }

  const handleSelectTenant = (tenantKey) => {
    setSelectedTenant(tenantKey)
    if (liveData) {
      handleFetchLiveInvoices(tenantKey)
    }
  }

  const handleFetchLiveInvoices = async (tenantKey = selectedTenant) => {
    setLoading(true)
    setFetchError(null)
    setLiveSuccess(null)
    try {
      const config = tenantKey === 'tenant_a'
        ? {
            username: 'tenant_a_user',
            password: 'TenantA_demo_pw_2024',
            tenantName: 'Tenant A (Acme Corp)',
            tenantId: 1,
            boundaryPolicy: 'Accessible to Tenant A only',
          }
        : {
            username: 'tenant_b_user',
            password: 'TenantB_demo_pw_2024',
            tenantName: 'Tenant B (Globex Inc)',
            tenantId: 2,
            boundaryPolicy: 'Accessible to Tenant B only',
          }

      const auth = await loginUser(config.username, config.password)
      if (!auth || !auth.access_token) {
        throw new Error('No access token returned by authentication endpoint')
      }
      const response = await getInvoices(auth.access_token)
      const items = response.items || []

      setLiveData({
        tenantKey,
        tenantName: config.tenantName,
        tenantId: config.tenantId,
        username: auth.user?.username || config.username,
        boundaryPolicy: config.boundaryPolicy,
        items,
      })
      setLiveSuccess(`Live query successful! Authenticated as ${auth.user?.username || config.username} (${config.tenantName}, tenant_id=${config.tenantId}) and retrieved ${items.length} records.`)
    } catch (err) {
      setFetchError(
        `Live query failed: ${err.message || 'Connection refused'}`
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5 pb-12">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0D1526' }}>
              Tenant Workspaces
            </h1>
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-md"
              style={{ background: '#EFF4FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
            >
              Multi-Tenant Isolation
            </span>
          </div>
          <p className="text-[13px] mt-1" style={{ color: '#52637A' }}>
            Compare requesting tenant identity with resource-owning tenant security boundaries.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap self-start">
          {/* Tenant A / Tenant B Scope Selector */}
          <div
            className="inline-flex items-center p-1 rounded-lg"
            style={{ background: '#F1F5F9', border: '1px solid #E2E8F0' }}
            role="tablist"
            aria-label="Select Tenant Scope"
          >
            <button
              type="button"
              id="select-tenant-a-btn"
              onClick={() => handleSelectTenant('tenant_a')}
              className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedTenant === 'tenant_a'
                  ? 'bg-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              style={selectedTenant === 'tenant_a' ? { color: '#1D4ED8' } : {}}
            >
              <Key className="h-3.5 w-3.5" />
              Tenant A (Acme)
            </button>
            <button
              type="button"
              id="select-tenant-b-btn"
              onClick={() => handleSelectTenant('tenant_b')}
              className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedTenant === 'tenant_b'
                  ? 'bg-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              style={selectedTenant === 'tenant_b' ? { color: '#BE123C' } : {}}
            >
              <Lock className="h-3.5 w-3.5" />
              Tenant B (Globex)
            </button>
          </div>

          <button
            type="button"
            id="query-live-invoices-btn"
            onClick={() => handleFetchLiveInvoices(selectedTenant)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[13px] font-semibold transition-all duration-150 cursor-pointer flex-shrink-0"
            style={{ background: loading ? '#94A3B8' : '#1D4ED8', boxShadow: '0 1px 3px rgba(29,78,216,0.25)' }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Querying...' : `Query Live Invoices (${selectedTenant === 'tenant_a' ? 'Tenant A' : 'Tenant B'})`}
          </button>
        </div>
      </div>

      {/* ─── Error Banner ─── */}
      {fetchError && (
        <div
          className="p-4 rounded-xl flex items-start gap-3 text-[13px]"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}
        >
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#D97706' }} />
          <div className="space-y-1">
            <div className="font-semibold">Backend Connection Offline</div>
            <p style={{ color: '#92400E' }}>{fetchError}</p>
            <p className="text-[12px]" style={{ color: '#A16207' }}>
              Start the FastAPI backend on port 8000 (
              <span className="font-mono">uvicorn app.main:app --reload</span>) to query live PostgreSQL records.
            </p>
          </div>
        </div>
      )}
      {liveSuccess && (
        <div
          className="p-4 rounded-xl flex items-start gap-3 text-[13px]"
          style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46' }}
        >
          <ShieldCheck className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#059669' }} />
          <div className="space-y-1">
            <div className="font-semibold">Live Invoice Query Succeeded</div>
            <p style={{ color: '#065F46' }}>{liveSuccess}</p>
          </div>
        </div>
      )}

      {/* ─── Tenant Comparison Panel ─── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: '#FFFFFF', border: '1px solid #E1E7EF', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      >
        <div
          className="px-6 py-4"
          style={{ borderBottom: '1px solid #EEF2F7' }}
        >
          <h2 className="text-[15px] font-semibold" style={{ color: '#0D1526' }}>
            Tenant Identity &amp; Boundary Comparison
          </h2>
          <p className="text-[12px] mt-0.5" style={{ color: '#52637A' }}>
            Differentiates caller permissions from protected resource ownership across tenant isolation boundaries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Requesting Tenant */}
          <div
            className="p-6 space-y-5"
            style={{ borderRight: '1px solid #EEF2F7' }}
          >
            {/* Tenant header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #EFF4FF, #DBEAFE)' }}
                >
                  <Key className="h-5 w-5" style={{ color: '#1D4ED8' }} />
                </div>
                <div>
                  <div className="text-[14px] font-semibold" style={{ color: '#0D1526' }}>
                    Requesting Tenant
                  </div>
                  <div className="text-[12px]" style={{ color: '#52637A' }}>
                    Tenant A — Acme Corp
                  </div>
                </div>
              </div>
              <span
                className="text-[11px] font-mono px-2.5 py-1 rounded-lg"
                style={{ background: '#EFF4FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
              >
                Scope #1
              </span>
            </div>

            {/* Attributes */}
            <div className="space-y-0">
              {[
                ['Authenticated Identity', 'tenant_a_user', true],
                ['Token Claims', 'Bearer JWT (tenant_id=1)', true],
                ['Owned Records', 'Invoices #101, #102', true],
                ['Authorization Boundary', 'Permitted for Tenant A objects only', false],
              ].map(([label, val, mono], i, arr) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-3 text-[12px]"
                  style={i < arr.length - 1 ? { borderBottom: '1px solid #EEF2F7' } : {}}
                >
                  <span style={{ color: '#52637A' }}>{label}</span>
                  <span
                    className={mono ? 'font-mono' : 'font-medium'}
                    style={{ color: label === 'Authorization Boundary' ? '#059669' : '#0D1526' }}
                  >
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Resource-Owning Tenant */}
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #FFF1F2, #FFE4E6)' }}
                >
                  <Lock className="h-5 w-5" style={{ color: '#BE123C' }} />
                </div>
                <div>
                  <div className="text-[14px] font-semibold" style={{ color: '#0D1526' }}>
                    Resource-Owning Tenant
                  </div>
                  <div className="text-[12px]" style={{ color: '#52637A' }}>
                    Tenant B — Globex Inc
                  </div>
                </div>
              </div>
              <span
                className="text-[11px] font-mono px-2.5 py-1 rounded-lg"
                style={{ background: '#FFF1F2', color: '#BE123C', border: '1px solid #FECDD3' }}
              >
                Scope #2
              </span>
            </div>

            <div className="space-y-0">
              {[
                ['Target Identity', 'tenant_b_user', true],
                ['Storage Scope', 'PostgreSQL schema (tenant_id=2)', true],
                ['Protected Resources', 'Invoices #201, #202', true],
                ['Boundary Defense', 'Cross-tenant queries return 403 / 404', false],
              ].map(([label, val, mono], i, arr) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-3 text-[12px]"
                  style={i < arr.length - 1 ? { borderBottom: '1px solid #EEF2F7' } : {}}
                >
                  <span style={{ color: '#52637A' }}>{label}</span>
                  <span
                    className={mono ? 'font-mono' : 'font-medium'}
                    style={{ color: label === 'Boundary Defense' ? '#BE123C' : '#0D1526' }}
                  >
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Architectural rule notice */}
        <div
          className="mx-6 mb-6 p-4 rounded-lg flex items-start gap-3 text-[12px]"
          style={{ background: '#F8FAFC', border: '1px solid #E1E7EF' }}
        >
          <ShieldCheck className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#1D4ED8' }} />
          <div style={{ color: '#52637A' }}>
            <span className="font-semibold" style={{ color: '#0D1526' }}>Architectural Rule: </span>
            TenantGuard does not allow cosmetic client-side tenant switching. Authenticated tenant identity must always be derived from cryptographically verified server-side JWT claims.
          </div>
        </div>
      </div>

      {/* ─── Tenant Invoice Inventory Table ─── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: '#FFFFFF', border: '1px solid #E1E7EF', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      >
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid #EEF2F7' }}
        >
          <div>
            <div className="flex items-center gap-2.5">
              <Database className="h-4 w-4" style={{ color: '#1D4ED8' }} />
              <h2 className="text-[15px] font-semibold" style={{ color: '#0D1526' }}>
                Tenant Invoice Inventory
              </h2>
            </div>
            <p className="text-[12px] mt-0.5" style={{ color: '#52637A' }}>
              Records evaluated during cross-tenant boundary verification tests.
            </p>
          </div>
          {liveData ? (
            <div className="flex items-center gap-2">
              <span
                id="table-status-badge"
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Backend Records ({liveData.tenantName})
              </span>
              <button
                type="button"
                id="reset-reference-records-btn"
                onClick={() => { setLiveData(null); setLiveSuccess(null); }}
                className="text-[11px] font-medium px-2 py-0.5 rounded cursor-pointer transition-colors"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B' }}
                title="Return to reference records"
              >
                Reset to Reference
              </button>
            </div>
          ) : (
            <span
              id="table-status-badge"
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg"
              style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}
            >
              Illustrative records
            </span>
          )}
        </div>

        {showDemoTable ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px] border-collapse">
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E1E7EF' }}>
                  {['Invoice ID', 'Owner Tenant', 'Customer', 'Amount', 'Status', 'Access Policy'].map((h) => (
                    <th
                      key={h}
                      className="py-3 px-5 font-semibold text-[11px]"
                      style={{ color: '#52637A' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {liveData ? (
                  liveData.items.map((inv, i) => (
                    <tr
                      key={inv.id}
                      style={{
                        borderBottom: '1px solid #EEF2F7',
                        background: i % 2 === 1 ? '#FAFBFD' : '#FFFFFF',
                      }}
                    >
                      <td className="py-3.5 px-5 font-mono font-semibold" style={{ color: '#0D1526' }}>
                        #{inv.id}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="font-medium" style={{ color: '#0D1526' }}>{liveData.tenantName}</div>
                        <div className="text-[11px] font-mono" style={{ color: '#8A9BB0' }}>
                          ID: {liveData.tenantId} ({liveData.username})
                        </div>
                      </td>
                      <td className="py-3.5 px-5 font-medium" style={{ color: '#0D1526' }}>
                        {inv.description}
                      </td>
                      <td className="py-3.5 px-5 font-mono font-semibold" style={{ color: '#0D1526' }}>
                        ${Number(inv.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}
                        >
                          {inv.notes || 'Active'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-lg"
                          style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}
                        >
                          {liveData.boundaryPolicy}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  DEMO_INVOICES.map((inv, i) => {
                    const statusStyle = STATUS_STYLE[inv.statusColor] || STATUS_STYLE.emerald
                    return (
                      <tr
                        key={inv.id}
                        style={{
                          borderBottom: '1px solid #EEF2F7',
                          background: i % 2 === 1 ? '#FAFBFD' : '#FFFFFF',
                        }}
                      >
                        <td className="py-3.5 px-5 font-mono font-semibold" style={{ color: '#0D1526' }}>
                          #{inv.id}
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="font-medium" style={{ color: '#0D1526' }}>{inv.tenant.split('(')[0].trim()}</div>
                          <div className="text-[11px]" style={{ color: '#8A9BB0' }}>
                            ({inv.tenant.match(/\(([^)]+)\)/)?.[1]})
                          </div>
                        </td>
                        <td className="py-3.5 px-5" style={{ color: '#52637A' }}>
                          {inv.customer}
                        </td>
                        <td className="py-3.5 px-5 font-mono font-semibold" style={{ color: '#0D1526' }}>
                          {inv.amount}
                        </td>
                        <td className="py-3.5 px-5">
                          <span
                            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                            style={{ background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border}` }}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          <span
                            className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-lg"
                            style={
                              inv.isCallerOwned
                                ? { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }
                                : { background: '#FFF1F2', color: '#9F1239', border: '1px solid #FECDD3' }
                            }
                          >
                            {inv.boundaryPolicy}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 flex flex-col items-center gap-3">
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center"
              style={{ background: '#F8FAFC', border: '1px solid #E1E7EF' }}
            >
              <FileText className="h-5 w-5" style={{ color: '#8A9BB0' }} />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-center" style={{ color: '#0D1526' }}>
                No Database Records Loaded
              </div>
              <p className="text-[12px] text-center mt-1 max-w-sm" style={{ color: '#52637A' }}>
                Start the backend and database to query live PostgreSQL invoice records.
              </p>
            </div>
          </div>
        )}

        <div
          className="px-6 py-3 flex items-center justify-between"
          style={{ borderTop: '1px solid #EEF2F7', background: '#FAFBFD' }}
        >
          <span className="text-[12px]" style={{ color: '#52637A' }}>
            Backend contract:{' '}
            <span className="font-mono" style={{ color: '#0D1526' }}>GET /invoices</span>
          </span>
          <button
            type="button"
            onClick={() => setShowDemoTable(!showDemoTable)}
            className="text-[12px] font-medium transition-colors cursor-pointer"
            style={{ color: '#1D4ED8' }}
          >
            {showDemoTable ? 'Hide reference records' : 'Show reference records'}
          </button>
        </div>
      </div>
    </div>
  )
}
