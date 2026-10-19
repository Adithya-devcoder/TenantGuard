import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Play,
  ArrowRight,
  Shield,
  Lock,
  Terminal,
  Clock,
  X,
  ChevronRight,
  Key,
  Database,
  CheckCircle,
  HelpCircle,
  Cpu,
  AlertTriangle,
} from 'lucide-react'

// Illustrative demo assertions — labeled clearly, not real scan results
const DEMO_ASSERTIONS = [
  {
    id: 'same-tenant-read',
    category: 'Legitimate Access',
    categoryColor: 'emerald',
    title: 'Same-Tenant Invoice Access',
    targetEndpoint: 'GET /invoices/101',
    method: 'GET',
    path: '/invoices/101',
    requestingIdentity: 'tenant_a_user',
    tenantScope: 'Tenant A (Acme Corp)',
    resourceOwnership: 'Tenant A — Invoice #101',
    expectedPolicy: 'ALLOW · 200 OK',
    policyType: 'allow',
    observedResult: 'Awaiting probe',
    verdict: 'Pending',
    description:
      'Tenant A requests their own invoice record. Caller tenant must match resource owner for access to be granted.',
    wireTemplate: `GET /invoices/101 HTTP/1.1\nHost: 127.0.0.1:8000\nAuthorization: Bearer <tenant_a_jwt>\nAccept: application/json`,
    rule: 'resource.tenant_id == caller.tenant_id',
    demoResponse: `HTTP/1.1 200 OK\nContent-Type: application/json\n\n{\n  "invoice_id": 101,\n  "tenant_id": 1,\n  "amount": 4200.00,\n  "status": "paid"\n}`,
  },
  {
    id: 'cross-tenant-read',
    category: 'Cross-Tenant BOLA',
    categoryColor: 'rose',
    title: 'Cross-Tenant Invoice Traversal',
    targetEndpoint: 'GET /invoices/202',
    method: 'GET',
    path: '/invoices/202',
    requestingIdentity: 'tenant_a_user',
    tenantScope: 'Tenant A (Acme Corp)',
    resourceOwnership: 'Tenant B — Invoice #202',
    expectedPolicy: 'DENY · 403 Forbidden',
    policyType: 'deny',
    observedResult: 'Awaiting probe',
    verdict: 'Pending',
    description:
      'Tenant A attempts to access Tenant B confidential invoice. Authorization gate must block cross-tenant traversal.',
    wireTemplate: `GET /invoices/202 HTTP/1.1\nHost: 127.0.0.1:8000\nAuthorization: Bearer <tenant_a_jwt>\nAccept: application/json`,
    rule: 'resource.tenant_id != caller.tenant_id → BLOCK',
    demoResponse: `HTTP/1.1 403 Forbidden\nContent-Type: application/json\n\n{\n  "detail": "Access forbidden: resource belongs to another tenant"\n}`,
  },
  {
    id: 'unauthenticated-read',
    category: 'Authentication Boundary',
    categoryColor: 'amber',
    title: 'Anonymous Resource Traversal',
    targetEndpoint: 'GET /invoices',
    method: 'GET',
    path: '/invoices',
    requestingIdentity: 'unauthenticated',
    tenantScope: 'None (Anonymous)',
    resourceOwnership: 'Protected Invoices Collection',
    expectedPolicy: 'DENY · 401 Unauthorized',
    policyType: 'deny',
    observedResult: 'Awaiting probe',
    verdict: 'Pending',
    description:
      'Request sent without authentication headers. Verifies baseline gateway protection is active.',
    wireTemplate: `GET /invoices HTTP/1.1\nHost: 127.0.0.1:8000\nAccept: application/json`,
    rule: 'caller.authenticated == true [REQUIRED]',
    demoResponse: `HTTP/1.1 401 Unauthorized\nContent-Type: application/json\n\n{\n  "detail": "Not authenticated"\n}`,
  },
]

const METHOD_COLORS = {
  GET: { bg: '#EFF4FF', text: '#1D4ED8', border: '#BFDBFE' },
  POST: { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' },
  DELETE: { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3' },
}

function CategoryBadge({ category, color }) {
  const styles = {
    emerald: { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
    rose: { bg: '#FFF1F2', text: '#9F1239', border: '#FECDD3' },
    amber: { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
  }
  const s = styles[color] || styles.emerald
  return (
    <span
      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {category}
    </span>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState('cross-tenant-read')
  const [showProbeModal, setShowProbeModal] = useState(false)
  const [showDemoResponse, setShowDemoResponse] = useState(false)

  const active = DEMO_ASSERTIONS.find((a) => a.id === selectedId) || DEMO_ASSERTIONS[0]
  const methodStyle = METHOD_COLORS[active.method] || METHOD_COLORS.GET

  return (
    <div className="space-y-5 pb-12">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0D1526' }}>
              Boundary Overview
            </h1>
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-md"
              style={{ background: '#EFF4FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
            >
              Forensic Ledger
            </span>
          </div>
          <p className="text-[13px] mt-1" style={{ color: '#52637A' }}>
            Authorization topology, cross-tenant boundary assertions, and forensic evidence inspector.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div
            className="flex items-center gap-2 text-[12px] px-3 py-2 rounded-lg"
            style={{ background: '#FFFFFF', border: '1px solid #E1E7EF', color: '#52637A' }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: '#94A3B8' }}
            />
            <span>Awaiting first probe</span>
          </div>

          <button
            type="button"
            id="run-boundary-probe-btn"
            onClick={() => setShowProbeModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[13px] font-semibold transition-all duration-150 cursor-pointer"
            style={{ background: '#1D4ED8', boxShadow: '0 1px 3px rgba(29,78,216,0.3)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1A3FC4')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#1D4ED8')}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Run Boundary Probe
          </button>
        </div>
      </div>

      {/* ─── Access Boundary Topology ─── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: '#FFFFFF', border: '1px solid #E1E7EF', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      >
        {/* Card header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid #EEF2F7' }}
        >
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-[15px] font-semibold" style={{ color: '#0D1526' }}>
                Access-Boundary Topology
              </h2>
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded"
                style={{ background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0' }}
              >
                Architectural model · illustrative
              </span>
            </div>
            <p className="text-[12px] mt-0.5" style={{ color: '#52637A' }}>
              Identity propagation, authorization decision point, and tenant resource boundary.
            </p>
          </div>
          <span
            className="text-[11px] font-mono px-2.5 py-1 rounded-md"
            style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}
          >
            Evaluation pending
          </span>
        </div>

        {/* Topology pipeline */}
        <div className="p-6">
          <div className="flex flex-col lg:flex-row items-stretch gap-0">

            {/* Stage 1: Caller */}
            <div
              className="flex-1 rounded-xl p-5"
              style={{
                background: 'linear-gradient(135deg, #EFF4FF 0%, #F5F8FF 100%)',
                border: '1px solid #BFDBFE',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-[10px] font-bold tracking-wider uppercase"
                  style={{ color: '#6B97E8', fontFamily: 'var(--font-mono)' }}
                >
                  01 · Caller
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded"
                  style={{ background: 'rgba(29,78,216,0.1)', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
                >
                  Origin
                </span>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: '#1D4ED8' }}
                >
                  <Key className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold" style={{ color: '#0D1526' }}>
                    Tenant A (Acme Corp)
                  </div>
                  <div className="text-[11px] font-mono" style={{ color: '#3B5EA6' }}>
                    user: tenant_a_user
                  </div>
                </div>
              </div>

              <div
                className="text-[11px] flex items-center justify-between pt-3"
                style={{ borderTop: '1px solid rgba(29,78,216,0.15)', color: '#52637A' }}
              >
                <span>JWT Scope</span>
                <span className="font-mono font-semibold" style={{ color: '#1D4ED8' }}>
                  tenant_id=1
                </span>
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden lg:flex items-center justify-center px-3 flex-shrink-0">
              <div className="flex flex-col items-center gap-1">
                <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, #BFDBFE, #1D4ED8)' }} />
                <ArrowRight className="h-4 w-4" style={{ color: '#1D4ED8', marginTop: '-6px' }} />
                <span className="text-[10px]" style={{ color: '#8A9BB0' }}>Request</span>
              </div>
            </div>

            {/* Stage 2: Auth Decision */}
            <div
              className="flex-1 rounded-xl p-5"
              style={{ background: '#07111F', border: '1px solid #162035' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-[10px] font-bold tracking-wider uppercase"
                  style={{ color: '#3D5070', fontFamily: 'var(--font-mono)' }}
                >
                  02 · Auth Gate
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded"
                  style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.25)' }}
                >
                  Policy Engine
                </span>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(29,78,216,0.2)', border: '1px solid rgba(29,78,216,0.3)' }}
                >
                  <Shield className="h-5 w-5" style={{ color: '#60A5FA' }} />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-white">
                    Object Authorization
                  </div>
                  <div
                    className="text-[11px] font-mono mt-1 px-2 py-1 rounded"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#60A5FA', border: '1px solid rgba(99,102,241,0.2)' }}
                  >
                    resource.tenant_id == caller.tenant_id
                  </div>
                </div>
              </div>

              <div
                className="text-[11px] flex items-center justify-between pt-3"
                style={{ borderTop: '1px solid #162035', color: '#4A6080' }}
              >
                <span>Evaluation</span>
                <span className="font-mono" style={{ color: '#6B7BA8' }}>Awaiting Probe</span>
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden lg:flex items-center justify-center px-3 flex-shrink-0">
              <div className="flex flex-col items-center gap-1">
                <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, #1D4ED8, #FECDD3)' }} />
                <ArrowRight className="h-4 w-4" style={{ color: '#94A3B8', marginTop: '-6px' }} />
                <span className="text-[10px]" style={{ color: '#8A9BB0' }}>Decision</span>
              </div>
            </div>

            {/* Stage 3: Protected Resource */}
            <div
              className="flex-1 rounded-xl p-5"
              style={{
                background: 'linear-gradient(135deg, #FFF8F8 0%, #FFF1F2 100%)',
                border: '2px dashed #FECDD3',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-[10px] font-bold tracking-wider uppercase"
                  style={{ color: '#E88A90', fontFamily: 'var(--font-mono)' }}
                >
                  03 · Protected
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1"
                  style={{ background: 'rgba(220,38,38,0.08)', color: '#BE123C', border: '1px solid #FECDD3' }}
                >
                  <Lock className="h-2.5 w-2.5" />
                  Tenant B Vault
                </span>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: '#FFFFFF', border: '1px solid #FECDD3' }}
                >
                  <Database className="h-5 w-5" style={{ color: '#E11D48' }} />
                </div>
                <div>
                  <div className="text-[14px] font-semibold" style={{ color: '#0D1526' }}>
                    Invoice Record #202
                  </div>
                  <div className="text-[11px]" style={{ color: '#9F1239' }}>
                    Owner: Tenant B (Globex Inc)
                  </div>
                </div>
              </div>

              <div
                className="text-[11px] flex items-center justify-between pt-3"
                style={{ borderTop: '1px solid #FECDD3', color: '#52637A' }}
              >
                <span>Perimeter</span>
                <span className="font-semibold" style={{ color: '#BE123C' }}>Isolated</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Ledger + Inspector Split ─── */}
      <div
        className="grid grid-cols-1 lg:grid-cols-12 rounded-xl overflow-hidden"
        style={{ border: '1px solid #E1E7EF', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      >
        {/* Left: Assertion Ledger */}
        <div
          className="lg:col-span-7 flex flex-col"
          style={{ background: '#FFFFFF', borderRight: '1px solid #E1E7EF' }}
        >
          {/* Header */}
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid #EEF2F7' }}
          >
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-[14px] font-semibold" style={{ color: '#0D1526' }}>
                  Boundary Assertion Ledger
                </h3>
                <span
                  className="text-[11px] font-mono px-2 py-0.5 rounded"
                  style={{ background: '#F8FAFC', color: '#52637A', border: '1px solid #E1E7EF' }}
                >
                  {DEMO_ASSERTIONS.length} assertions
                </span>
              </div>
              <p className="text-[12px] mt-0.5" style={{ color: '#52637A' }}>
                Configured policy rules versus expected observed outcomes.
              </p>
            </div>
            <span
              className="text-[10px] font-medium px-2 py-1 rounded"
              style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}
            >
              Illustrative fixtures
            </span>
          </div>

          {/* Assertion rows */}
          <div className="flex-1 divide-y" style={{ borderColor: '#EEF2F7' }}>
            {DEMO_ASSERTIONS.map((a) => {
              const isSelected = a.id === selectedId
              const isAllow = a.policyType === 'allow'
              return (
                <div
                  key={a.id}
                  id={`assertion-${a.id}`}
                  onClick={() => {
                    setSelectedId(a.id)
                    setShowDemoResponse(false)
                  }}
                  className="p-4 cursor-pointer transition-all duration-100 select-none"
                  style={{
                    background: isSelected ? '#F5F8FF' : 'transparent',
                    borderLeft: isSelected ? '3px solid #1D4ED8' : '3px solid transparent',
                    paddingLeft: isSelected ? '13px' : '16px',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = '#FAFBFD'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {/* Row top */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold" style={{ color: '#0D1526' }}>
                        {a.title}
                      </span>
                      <CategoryBadge category={a.category} color={a.categoryColor} />
                    </div>

                    <span
                      className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded flex-shrink-0"
                      style={
                        isAllow
                          ? { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }
                          : { background: '#FFF1F2', color: '#9F1239', border: '1px solid #FECDD3' }
                      }
                    >
                      {a.expectedPolicy}
                    </span>
                  </div>

                  <p className="text-[12px] mb-3 leading-relaxed" style={{ color: '#52637A' }}>
                    {a.description}
                  </p>

                  {/* Row footer */}
                  <div
                    className="flex items-center justify-between pt-2.5 text-[12px]"
                    style={{ borderTop: '1px solid #EEF2F7' }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono font-semibold text-[11px] px-2 py-0.5 rounded"
                        style={{
                          background: '#F1F5F9',
                          color: '#334155',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        {a.method}
                      </span>
                      <span className="font-mono" style={{ color: '#334155' }}>{a.path}</span>
                      <span style={{ color: '#C8D3E0' }}>·</span>
                      <span style={{ color: '#8A9BB0' }}>
                        {a.requestingIdentity}
                      </span>
                    </div>
                    <ChevronRight
                      className="h-4 w-4 transition-transform"
                      style={{
                        color: isSelected ? '#1D4ED8' : '#C8D3E0',
                        transform: isSelected ? 'translateX(2px)' : 'none',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderTop: '1px solid #EEF2F7', background: '#FAFBFD' }}
          >
            <span className="text-[12px]" style={{ color: '#8A9BB0' }}>
              Ready for initial execution
            </span>
            <span
              className="text-[11px] font-mono"
              style={{ color: '#52637A' }}
            >
              POST /scanner/scan
            </span>
          </div>
        </div>

        {/* Right: Forensic Evidence Inspector */}
        <div
          className="lg:col-span-5 flex flex-col"
          style={{ background: '#07111F', maxHeight: '680px', overflowY: 'auto' }}
        >
          <div
            className="p-5 flex flex-col gap-4 flex-1"
          >
            {/* Inspector header */}
            <div
              className="flex items-center justify-between pb-4"
              style={{ borderBottom: '1px solid #162035' }}
            >
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4" style={{ color: '#60A5FA' }} />
                <span className="text-[13px] font-semibold text-white">
                  Evidence Inspector
                </span>
              </div>
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded"
                style={{ background: '#0C1A2E', color: '#60A5FA', border: '1px solid #162035' }}
              >
                {active.id}
              </span>
            </div>

            {/* Target capsule */}
            <div
              className="rounded-lg p-3.5 space-y-2 text-[12px]"
              style={{ background: '#0A1628', border: '1px solid #162035' }}
            >
              {[
                ['Endpoint', <span className="font-mono font-semibold text-white">{active.targetEndpoint}</span>],
                ['Caller Scope', active.tenantScope],
                ['Target Resource', active.resourceOwnership],
                ['Expected Policy', <span className="font-mono font-semibold" style={{ color: '#60A5FA' }}>{active.expectedPolicy}</span>],
                ['Observed Result', <span className="font-mono" style={{ color: '#4A6080' }}>{active.observedResult}</span>],
              ].map(([label, val], i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3"
                  style={i > 0 ? { paddingTop: '6px', borderTop: '1px solid #0F1F35' } : {}}
                >
                  <span style={{ color: '#3D5070' }}>{label}</span>
                  <span style={{ color: '#7A90A8' }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Wire request */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium" style={{ color: '#7A90A8' }}>
                  Outbound Wire Request
                </span>
                <span className="text-[10px] font-mono" style={{ color: '#3D5070' }}>HTTP/1.1</span>
              </div>
              <pre
                className="p-3.5 rounded-lg overflow-x-auto text-[11px] font-mono leading-relaxed"
                style={{ background: '#040D1A', border: '1px solid #0F1F35', color: '#93C5FD' }}
              >
{active.wireTemplate}
              </pre>
            </div>

            {/* Response capture placeholder */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium" style={{ color: '#7A90A8' }}>
                  Response Capture &amp; Verdict
                </span>
                <span
                  className="text-[10px] font-mono font-semibold"
                  style={{ color: '#D97706' }}
                >
                  AWAITING CAPTURE
                </span>
              </div>

              <div
                className="p-4 rounded-lg"
                style={{ background: '#040D1A', border: '1px dashed #162035' }}
              >
                <div className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#3D5070' }} />
                  <div>
                    <div className="text-[12px] font-medium" style={{ color: '#7A90A8' }}>
                      No live transaction recorded
                    </div>
                    <p className="text-[11px] mt-1 leading-relaxed" style={{ color: '#3D5070' }}>
                      Response headers and payload will appear here once the probe executes against the backend.
                    </p>
                  </div>
                </div>
                <div
                  className="mt-3 pt-3 flex items-center justify-between text-[11px]"
                  style={{ borderTop: '1px solid #0F1F35', color: '#3D5070' }}
                >
                  <span>Enforcement rule</span>
                  <span className="font-mono" style={{ color: '#4A6080' }}>{active.rule}</span>
                </div>
              </div>
            </div>

            {/* Reference response toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowDemoResponse(!showDemoResponse)}
                className="flex items-center gap-1.5 text-[12px] transition-colors cursor-pointer"
                style={{ color: '#4A6080' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#7A90A8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#4A6080')}
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span>{showDemoResponse ? 'Hide' : 'Preview'} reference schema</span>
                <ChevronRight
                  className="h-3 w-3 transition-transform"
                  style={{ transform: showDemoResponse ? 'rotate(90deg)' : 'none' }}
                />
              </button>

              {showDemoResponse && (
                <div
                  className="mt-2.5 p-3 rounded-lg"
                  style={{ background: '#040D1A', border: '1px solid #162035' }}
                >
                  <div
                    className="text-[10px] font-semibold mb-2"
                    style={{ color: '#D97706', fontFamily: 'var(--font-mono)' }}
                  >
                    Illustrative fixture — not from backend
                  </div>
                  <pre
                    className="text-[11px] font-mono overflow-x-auto leading-relaxed"
                    style={{ color: '#4A6080' }}
                  >
{active.demoResponse}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Inspector footer */}
          <div
            className="px-5 py-3 flex items-center justify-between flex-shrink-0"
            style={{ borderTop: '1px solid #162035' }}
          >
            <span className="flex items-center gap-1.5 text-[11px]" style={{ color: '#3D5070' }}>
              <CheckCircle className="h-3.5 w-3.5" style={{ color: '#1D4ED8' }} />
              Evidence Auditor Ready
            </span>
            <span className="font-mono text-[11px]" style={{ color: '#3D5070' }}>Idle</span>
          </div>
        </div>
      </div>

      {/* ─── Integration Pending Modal ─── */}
      {showProbeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(7,17,31,0.7)', backdropFilter: 'blur(4px)' }}>
          <div
            className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl"
            style={{ border: '1px solid #E1E7EF' }}
          >
            <div
              className="flex items-center justify-between pb-4 mb-4"
              style={{ borderBottom: '1px solid #EEF2F7' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{ background: '#EFF4FF' }}
                >
                  <Cpu className="h-4 w-4" style={{ color: '#1D4ED8' }} />
                </div>
                <h3 className="text-[15px] font-semibold" style={{ color: '#0D1526' }}>
                  Probe Engine — Backend Pending
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowProbeModal(false)}
                className="p-1 rounded-md transition-colors cursor-pointer"
                style={{ color: '#8A9BB0' }}
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-[13px] leading-relaxed mb-4" style={{ color: '#52637A' }}>
              The backend scanner endpoint (
              <span className="font-mono" style={{ color: '#0D1526' }}>POST /scanner/scan</span>
              ) is awaiting integration. No mock scan execution or fabricated verdicts are generated — data honesty is strictly maintained.
            </p>

            <div
              className="p-4 rounded-lg space-y-2 mb-4 text-[12px]"
              style={{ background: '#F8FAFC', border: '1px solid #E1E7EF' }}
            >
              <div className="font-semibold mb-1" style={{ color: '#0D1526' }}>
                Integration Status
              </div>
              {[
                ['Scanner endpoint', 'POST /scanner/scan', false],
                ['Report endpoint', 'GET /scanner/reports/{id}', false],
                ['Live verification', 'Requires backend startup', null],
              ].map(([label, val, ok]) => (
                <div key={label} className="flex items-center justify-between" style={{ color: '#52637A' }}>
                  <span>{label}</span>
                  <span className="font-mono" style={{ color: '#0D1526' }}>{val}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowProbeModal(false)}
                className="px-3.5 py-2 text-[13px] rounded-lg transition-colors cursor-pointer"
                style={{ color: '#52637A', border: '1px solid #E1E7EF', background: '#FFFFFF' }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => { setShowProbeModal(false); navigate('/scanner') }}
                className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white rounded-lg transition-colors cursor-pointer"
                style={{ background: '#1D4ED8' }}
              >
                Open Scanner Console
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
