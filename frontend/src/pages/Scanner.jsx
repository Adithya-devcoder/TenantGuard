import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  Info,
  Radio,
  ArrowRight,
  ShieldAlert,
  Wifi,
  WifiOff,
  Loader2,
  CircleDot,
} from 'lucide-react'
import { checkBackendConnection, runSecurityScan } from '../services/api'

const TEST_VECTORS = [
  {
    id: 'v1',
    num: '01',
    title: 'Same-Tenant Baseline',
    endpoint: 'GET /invoices/101',
    method: 'GET',
    expectedCode: '200',
    expectedLabel: 'ALLOW · 200 OK',
    expectedType: 'allow',
    description: 'Tenant A accesses their own invoice record. Verifies legitimate caller access is permitted.',
  },
  {
    id: 'v2',
    num: '02',
    title: 'Cross-Tenant BOLA Probe',
    endpoint: 'GET /invoices/202',
    method: 'GET',
    expectedCode: '403',
    expectedLabel: 'DENY · 403 Forbidden',
    expectedType: 'deny',
    description: 'Core BOLA test: Tenant A token attempts to read Tenant B\'s protected invoice. Must be blocked.',
  },
  {
    id: 'v3',
    num: '03',
    title: 'Unauthenticated Probe',
    endpoint: 'GET /invoices',
    method: 'GET',
    expectedCode: '401',
    expectedLabel: 'DENY · 401 Unauthorized',
    expectedType: 'deny',
    description: 'Baseline perimeter check: API must reject requests without a verified Bearer JWT token.',
  },
]

export default function Scanner() {
  const navigate = useNavigate()
  const [preflightStatus, setPreflightStatus] = useState('idle') // 'idle' | 'checking' | 'reachable' | 'offline'
  const [preflightDetails, setPreflightDetails] = useState(null)

  const [scanStatus, setScanStatus] = useState('idle') // 'idle' | 'running' | 'error' | 'completed'
  const [scanError, setScanError] = useState(null)
  const [scanResult, setScanResult] = useState(null)

  const handlePreflightCheck = async () => {
    setPreflightStatus('checking')
    setPreflightDetails(null)
    const result = await checkBackendConnection()
    if (result.connected) {
      setPreflightStatus('reachable')
      setPreflightDetails(`Backend responded at ${result.url}`)
    } else {
      setPreflightStatus('offline')
      setPreflightDetails(`Unable to reach ${result.url} — ${result.error}`)
    }
  }

  const handleRunScan = async () => {
    if (scanStatus === 'running') return
    setScanStatus('running')
    setScanError(null)
    setScanResult(null)
    try {
      const response = await runSecurityScan({
        target_base_url: 'http://127.0.0.1:8000',
        note: 'Live probe from TenantGuard frontend',
      })
      setScanStatus('completed')
      setScanResult(response)
    } catch (err) {
      setScanStatus('error')
      setScanError(
        `Failed to reach scanner endpoint at http://127.0.0.1:8000 (${err.message || 'Connection refused'}). Please start the FastAPI backend service.`
      )
    }
  }

  const preflightIcon = {
    idle: <CircleDot className="h-4 w-4" style={{ color: '#94A3B8' }} />,
    checking: <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#1D4ED8' }} />,
    reachable: <Wifi className="h-4 w-4" style={{ color: '#059669' }} />,
    offline: <WifiOff className="h-4 w-4" style={{ color: '#DC2626' }} />,
  }

  const preflightBadge = {
    idle: { text: 'Not checked', bg: '#F8FAFC', color: '#8A9BB0', border: '#E1E7EF' },
    checking: { text: 'Probing…', bg: '#EFF4FF', color: '#1D4ED8', border: '#BFDBFE' },
    reachable: { text: 'Backend reachable', bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
    offline: { text: 'Backend offline', bg: '#FFF1F2', color: '#9F1239', border: '#FECDD3' },
  }[preflightStatus]

  return (
    <div className="space-y-5 pb-12">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0D1526' }}>
              Security Scanner
            </h1>
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-md"
              style={{ background: '#EFF4FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
            >
              Probe Console
            </span>
          </div>
          <p className="text-[13px] mt-1" style={{ color: '#52637A' }}>
            Three-stage automated workflow for Broken Object Level Authorization (BOLA) testing.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Connection indicator */}
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]"
            style={{ background: '#FFFFFF', border: '1px solid #E1E7EF', color: '#52637A' }}
          >
            {preflightIcon[preflightStatus]}
            <span className="font-mono text-[11px]">127.0.0.1:8000</span>
          </div>

          <button
            type="button"
            id="execute-bola-scan-btn"
            onClick={handleRunScan}
            disabled={scanStatus === 'running'}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[13px] font-semibold transition-all cursor-pointer"
            style={{
              background: scanStatus === 'running' ? '#94A3B8' : '#1D4ED8',
              boxShadow: scanStatus === 'running' ? 'none' : '0 1px 3px rgba(29,78,216,0.3)',
            }}
          >
            <Play className={`h-3.5 w-3.5 fill-current ${scanStatus === 'running' ? 'animate-pulse' : ''}`} />
            {scanStatus === 'running' ? 'Executing…' : 'Execute BOLA Scan'}
          </button>
        </div>
      </div>

      {/* ─── Step 1: Preflight ─── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: '#FFFFFF', border: '1px solid #E1E7EF', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      >
        <div
          className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{ borderBottom: '1px solid #EEF2F7' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
              style={{
                background: preflightStatus === 'reachable' ? '#ECFDF5' : preflightStatus === 'offline' ? '#FFF1F2' : '#EFF4FF',
                color: preflightStatus === 'reachable' ? '#059669' : preflightStatus === 'offline' ? '#DC2626' : '#1D4ED8',
                border: `1px solid ${preflightStatus === 'reachable' ? '#A7F3D0' : preflightStatus === 'offline' ? '#FECDD3' : '#BFDBFE'}`,
              }}
            >
              1
            </div>
            <div>
              <h2 className="text-[14px] font-semibold" style={{ color: '#0D1526' }}>
                Backend Connectivity Preflight
              </h2>
              <p className="text-[12px]" style={{ color: '#52637A' }}>
                Verify the FastAPI server on port 8000 is running and accepting HTTP requests.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="check-backend-btn"
            onClick={handlePreflightCheck}
            disabled={preflightStatus === 'checking'}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12px] font-medium transition-all cursor-pointer flex-shrink-0 self-start sm:self-auto"
            style={{
              background: '#F8FAFC',
              border: '1px solid #E1E7EF',
              color: '#0D1526',
            }}
          >
            <Radio className={`h-3.5 w-3.5 ${preflightStatus === 'checking' ? 'animate-spin' : ''}`} style={{ color: '#52637A' }} />
            {preflightStatus === 'checking' ? 'Testing connection…' : 'Check Connectivity'}
          </button>
        </div>

        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[12px]">
          <div className="flex items-center gap-2.5">
            <span style={{ color: '#8A9BB0' }}>Preflight Status:</span>
            <span
              className="inline-flex items-center gap-1.5 font-semibold px-2.5 py-1 rounded-lg"
              style={{ background: preflightBadge.bg, color: preflightBadge.color, border: `1px solid ${preflightBadge.border}` }}
            >
              {preflightIcon[preflightStatus]}
              {preflightBadge.text}
            </span>
          </div>
          {preflightDetails && (
            <span className="font-mono text-[11px]" style={{ color: '#52637A' }}>
              {preflightDetails}
            </span>
          )}
        </div>
      </div>

      {/* ─── Step 2: Test Plan ─── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: '#FFFFFF', border: '1px solid #E1E7EF', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      >
        <div
          className="px-6 py-4 flex items-center gap-3"
          style={{ borderBottom: '1px solid #EEF2F7' }}
        >
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
            style={{ background: '#EFF4FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
          >
            2
          </div>
          <div>
            <h2 className="text-[14px] font-semibold" style={{ color: '#0D1526' }}>
              Authorization Test Plan
            </h2>
            <p className="text-[12px]" style={{ color: '#52637A' }}>
              Pre-configured BOLA test vectors that evaluate cross-tenant isolation boundaries.
            </p>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TEST_VECTORS.map((v) => (
              <div
                key={v.id}
                className="rounded-xl p-4 space-y-3"
                style={{ background: '#F8FAFC', border: '1px solid #E1E7EF' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div
                      className="text-[10px] font-bold tracking-widest uppercase mb-1"
                      style={{ color: '#8A9BB0', fontFamily: 'var(--font-mono)' }}
                    >
                      Vector {v.num}
                    </div>
                    <div className="text-[13px] font-semibold" style={{ color: '#0D1526' }}>
                      {v.title}
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded flex-shrink-0"
                    style={
                      v.expectedType === 'allow'
                        ? { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }
                        : { background: '#FFF1F2', color: '#9F1239', border: '1px solid #FECDD3' }
                    }
                  >
                    {v.expectedCode}
                  </span>
                </div>

                <div
                  className="font-mono text-[11px] px-2.5 py-1.5 rounded-lg"
                  style={{ background: '#FFFFFF', border: '1px solid #E1E7EF', color: '#334155' }}
                >
                  {v.endpoint}
                </div>

                <p className="text-[12px] leading-relaxed" style={{ color: '#52637A' }}>
                  {v.description}
                </p>

                <div
                  className="text-[11px] font-medium px-2 py-1 rounded"
                  style={{ background: '#FFFFFF', color: '#8A9BB0', border: '1px solid #EEF2F7' }}
                >
                  Expected: {v.expectedLabel}
                </div>
              </div>
            ))}
          </div>

          {/* Plan notice */}
          <div
            className="mt-4 p-4 rounded-xl flex items-start gap-3 text-[12px]"
            style={{ background: '#F8FAFC', border: '1px solid #E1E7EF' }}
          >
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#1D4ED8' }} />
            <div style={{ color: '#52637A' }}>
              <span className="font-semibold" style={{ color: '#0D1526' }}>Plan Notice: </span>
              A displayed test vector represents a configured testing target, not an executed test. Results only appear when the backend scanner runs and analyzes real HTTP responses.
            </div>
          </div>
        </div>
      </div>

      {/* ─── Step 3: Scan Execution ─── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: '#FFFFFF', border: '1px solid #E1E7EF', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      >
        <div
          className="px-6 py-4 flex items-center gap-3"
          style={{ borderBottom: '1px solid #EEF2F7' }}
        >
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
            style={
              scanStatus === 'completed'
                ? { background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }
                : scanStatus === 'error'
                ? { background: '#FFF1F2', color: '#DC2626', border: '1px solid #FECDD3' }
                : { background: '#EFF4FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }
            }
          >
            3
          </div>
          <div>
            <h2 className="text-[14px] font-semibold" style={{ color: '#0D1526' }}>
              Probe Execution &amp; Live Outcome
            </h2>
            <p className="text-[12px]" style={{ color: '#52637A' }}>
              Triggers <span className="font-mono" style={{ color: '#0D1526' }}>POST /scanner/scan</span> on the backend server.
            </p>
          </div>
        </div>

        <div className="p-6">
          {/* ─ Idle ─ */}
          {scanStatus === 'idle' && (
            <div
              className="rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              style={{ background: '#F8FAFC', border: '1px solid #E1E7EF' }}
            >
              <div>
                <div className="text-[14px] font-semibold mb-1" style={{ color: '#0D1526' }}>
                  Ready to Execute Security Probe
                </div>
                <p className="text-[12px]" style={{ color: '#52637A' }}>
                  Clicking "Execute BOLA Scan" sends a live request to the FastAPI scanner service at{' '}
                  <span className="font-mono">http://127.0.0.1:8000</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunScan}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-[13px] font-semibold transition-all cursor-pointer flex-shrink-0"
                style={{ background: '#1D4ED8', boxShadow: '0 1px 3px rgba(29,78,216,0.3)' }}
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Execute BOLA Scan
              </button>
            </div>
          )}

          {/* ─ Running ─ */}
          {scanStatus === 'running' && (
            <div
              className="rounded-xl p-6 flex items-start gap-4"
              style={{ background: '#EFF4FF', border: '1px solid #BFDBFE' }}
            >
              <Loader2 className="h-5 w-5 animate-spin flex-shrink-0 mt-0.5" style={{ color: '#1D4ED8' }} />
              <div>
                <div className="text-[14px] font-semibold mb-1" style={{ color: '#1E3A8A' }}>
                  Executing Live Scan Probe…
                </div>
                <p className="text-[12px]" style={{ color: '#3B5EA6' }}>
                  Sending request to{' '}
                  <span className="font-mono">POST /scanner/scan</span> at{' '}
                  <span className="font-mono">http://127.0.0.1:8000</span>. Please wait…
                </p>
              </div>
            </div>
          )}

          {/* ─ Error ─ */}
          {scanStatus === 'error' && (
            <div
              className="rounded-xl p-6 space-y-4"
              style={{ background: '#FFF1F2', border: '1px solid #FECDD3' }}
            >
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#DC2626' }} />
                <div>
                  <div className="text-[14px] font-semibold mb-1" style={{ color: '#7F1D1D' }}>
                    Scan Execution Halted — Backend Unreachable
                  </div>
                  <p className="text-[12px] leading-relaxed" style={{ color: '#9F1239' }}>
                    {scanError}
                  </p>
                  <p className="text-[11px] mt-2" style={{ color: '#BE123C' }}>
                    No simulated scan or fabricated verdict was generated. Run{' '}
                    <span className="font-mono">uvicorn app.main:app --reload</span> to enable scanning.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2" style={{ borderTop: '1px solid #FECDD3' }}>
                <button
                  type="button"
                  onClick={handleRunScan}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-medium cursor-pointer transition-all"
                  style={{ background: '#FFFFFF', border: '1px solid #FECDD3', color: '#9F1239' }}
                >
                  Retry Probe
                </button>
                <button
                  type="button"
                  onClick={() => setScanStatus('idle')}
                  className="text-[12px] cursor-pointer"
                  style={{ color: '#BE123C' }}
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* ─ Completed ─ */}
          {scanStatus === 'completed' && scanResult && (
            <div
              className="rounded-xl p-6 space-y-4"
              style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#059669' }} />
                <div>
                  <div className="text-[14px] font-semibold mb-1" style={{ color: '#14532D' }}>
                    Security Scan Completed
                  </div>
                  <p className="text-[12px]" style={{ color: '#166534' }}>
                    Scan report received from backend. Report ID:{' '}
                    <span className="font-mono font-semibold">{scanResult.report_id || 'scan-001'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2" style={{ borderTop: '1px solid #A7F3D0' }}>
                <button
                  type="button"
                  onClick={() => navigate('/results')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[13px] font-semibold cursor-pointer"
                  style={{ background: '#059669' }}
                >
                  View Generated Report
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
