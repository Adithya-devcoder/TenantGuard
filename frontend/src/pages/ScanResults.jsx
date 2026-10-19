import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getScanReport, getLatestScanReport } from '../services/api'
import {
  FileCheck2,
  ScanSearch,
  Terminal,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  ArrowUpRight,
  Shield,
  Loader2,
  RefreshCw,
} from 'lucide-react'

// Illustrative findings fixture for previewing schema when no scan has run
const DEMO_REPORT = {
  reportId: 'scan-template',
  status: 'completed',
  totalTests: 3,
  vulnerabilitiesFound: 0,
  findings: [
    {
      id: 'f-001',
      endpoint: 'GET /invoices/101',
      method: 'GET',
      path: '/invoices/101',
      scenario: 'Same-tenant baseline access (Tenant Alpha)',
      expectedPolicy: 'ALLOW · 200 OK',
      observedStatus: '200 OK',
      severity: 'Info',
      severityColor: 'slate',
      verdict: 'PASSED',
      isPassed: true,
      analysis: 'Tenant A authorized for own invoice. Identity verified against tenant_id in database.',
      requestWire: `GET /invoices/101 HTTP/1.1\nHost: 127.0.0.1:8000\nAuthorization: Bearer <tenant_a_jwt>\nAccept: application/json`,
      responseWire: `HTTP/1.1 200 OK\nContent-Type: application/json\n\n{\n  "invoice_id": 101,\n  "tenant_id": 1,\n  "amount": 1500.00,\n  "status": "paid"\n}`,
    },
    {
      id: 'f-002',
      endpoint: 'GET /invoices/202',
      method: 'GET',
      path: '/invoices/202',
      scenario: 'Cross-tenant object traversal (BOLA vector)',
      expectedPolicy: 'DENY · 403/404',
      observedStatus: '404 Not Found',
      severity: 'Low',
      severityColor: 'slate',
      verdict: 'PASSED',
      isPassed: true,
      analysis: 'Cross-tenant request correctly blocked by multi-tenant isolation gate. Resource inaccessible.',
      requestWire: `GET /invoices/202 HTTP/1.1\nHost: 127.0.0.1:8000\nAuthorization: Bearer <tenant_a_jwt>\nAccept: application/json`,
      responseWire: `HTTP/1.1 404 Not Found\nContent-Type: application/json\n\n{\n  "detail": "Invoice 202 not found."\n}`,
    },
    {
      id: 'f-003',
      endpoint: 'GET /invoices',
      method: 'GET',
      path: '/invoices',
      scenario: 'Unauthenticated collection probe',
      expectedPolicy: 'DENY · 401 Unauthorized',
      observedStatus: '401 Unauthorized',
      severity: 'Info',
      severityColor: 'slate',
      verdict: 'PASSED',
      isPassed: true,
      analysis: 'Gateway authentication boundary verified. Request without bearer token rejected.',
      requestWire: `GET /invoices HTTP/1.1\nHost: 127.0.0.1:8000\nAccept: application/json`,
      responseWire: `HTTP/1.1 401 Unauthorized\nContent-Type: application/json\n\n{\n  "detail": "Not authenticated"\n}`,
    },
  ],
}

const SEVERITY_STYLE = {
  slate: { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
  rose: { bg: '#FFF1F2', text: '#9F1239', border: '#FECDD3' },
  amber: { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
}

export default function ScanResults() {
  const navigate = useNavigate()
  const location = useLocation()

  const [liveReport, setLiveReport] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [showDemoReport, setShowDemoReport] = useState(false)
  const [selectedFindingId, setSelectedFindingId] = useState(null)

  // Fetch or load the scan report
  const fetchReport = async () => {
    setIsLoading(true)
    setLoadError(null)

    // 1. Check if router state has full result passed from Scanner
    const passedResult = location.state?.scanResult
    if (passedResult && passedResult.report_id && Array.isArray(passedResult.results) && passedResult.results.length > 0) {
      setLiveReport(passedResult)
      setIsLoading(false)
      return
    }

    // 2. Check if a report_id was passed or stored in sessionStorage
    const targetId =
      passedResult?.report_id ||
      location.state?.reportId ||
      (() => {
        try {
          return sessionStorage.getItem('tenantguard_latest_report_id')
        } catch (_) {
          return null
        }
      })()

    if (targetId) {
      try {
        const report = await getScanReport(targetId)
        if (report && report.report_id) {
          setLiveReport(report)
          setIsLoading(false)
          return
        }
      } catch (err) {
        console.warn('Could not fetch report by ID:', targetId, err)
      }
    }

    // 3. Fallback: query backend for most recent report
    try {
      const latest = await getLatestScanReport()
      if (latest && latest.report_id) {
        setLiveReport(latest)
        setIsLoading(false)
        return
      }
    } catch (err) {
      // 404 means no report has been executed yet
      const msg = err.message || ''
      if (!msg.includes('404') && !msg.includes('No scan reports')) {
        setLoadError(msg)
      }
    }

    setLiveReport(null)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchReport()
  }, [location.state])

  // Derive findings list
  const findings = useMemo(() => {
    if (liveReport && Array.isArray(liveReport.results) && liveReport.results.length > 0) {
      return liveReport.results.map((r, index) => {
        const probeId = `probe-${String(index + 1).padStart(3, '0')}`
        const method = r.method || 'GET'
        const endpoint = r.endpoint || `${method} /invoices`
        const path = endpoint.replace(/^[A-Z]+\s+/, '')

        let scenario = ''
        let expectedPolicy = ''
        if (r.test_type === 'own_access') {
          const tenantName = r.actor_tenant === 'tenant_a' ? 'Tenant Alpha' : 'Tenant Beta'
          scenario = `Same-tenant baseline access (${tenantName})`
          expectedPolicy = 'ALLOW · 200 OK'
        } else if (r.test_type === 'cross_tenant_read') {
          const crossDirection = r.actor_tenant === 'tenant_a' ? 'Tenant A → Invoice B' : 'Tenant B → Invoice A'
          scenario = `Cross-tenant read vector (${crossDirection})`
          expectedPolicy = 'DENY · 403/404'
        } else {
          scenario = r.test_type || 'Authorization probe'
          expectedPolicy = 'DENY · 403/404'
        }

        const isVulnerable = r.outcome === 'vulnerable'
        const isInconclusive = r.outcome === 'inconclusive'
        const isPassed = r.outcome === 'not_vulnerable'

        const verdict = isVulnerable ? 'VULNERABLE' : isInconclusive ? 'INCONCLUSIVE' : 'PASSED'
        const severity = isVulnerable ? 'High' : isInconclusive ? 'Medium' : r.test_type === 'own_access' ? 'Info' : 'Low'
        const severityColor = isVulnerable ? 'rose' : isInconclusive ? 'amber' : 'slate'

        let statusText = 'No Response'
        if (r.http_status) {
          if (r.http_status === 200) statusText = '200 OK'
          else if (r.http_status === 404) statusText = '404 Not Found'
          else if (r.http_status === 403) statusText = '403 Forbidden'
          else if (r.http_status === 401) statusText = '401 Unauthorized'
          else statusText = `${r.http_status}`
        }

        const requestWire = `${method} ${path} HTTP/1.1\nHost: 127.0.0.1:8000\nAuthorization: Bearer <${r.actor_tenant || 'tenant'}_jwt_token>\nAccept: application/json`

        let responseWire = `HTTP/1.1 ${statusText}\nContent-Type: application/json\n\n`
        if (r.raw_response_snippet) {
          try {
            const parsed = JSON.parse(r.raw_response_snippet)
            responseWire += JSON.stringify(parsed, null, 2)
          } catch (_) {
            responseWire += r.raw_response_snippet
          }
        } else {
          responseWire += '{\n  "status": "empty response"\n}'
        }

        return {
          id: probeId,
          endpoint,
          method,
          path,
          scenario,
          expectedPolicy,
          observedStatus: statusText,
          httpStatus: r.http_status,
          severity,
          severityColor,
          verdict,
          isPassed,
          analysis: r.evidence || 'Authorization evaluation recorded by backend scanner.',
          requestWire,
          responseWire,
          rawResult: r,
        }
      })
    }

    if (showDemoReport) {
      return DEMO_REPORT.findings
    }

    return []
  }, [liveReport, showDemoReport])

  // Maintain active selected finding
  useEffect(() => {
    if (findings.length > 0) {
      if (!selectedFindingId || !findings.some((f) => f.id === selectedFindingId)) {
        const preferred = findings.find((f) => f.rawResult?.test_type === 'cross_tenant_read') || findings[0]
        setSelectedFindingId(preferred.id)
      }
    } else {
      setSelectedFindingId(null)
    }
  }, [findings, selectedFindingId])

  const activeFinding = findings.find((f) => f.id === selectedFindingId) || findings[0] || null

  const displayReportId = liveReport?.report_id || (showDemoReport ? DEMO_REPORT.reportId : null)
  const displayTests = liveReport?.total_tests ?? (showDemoReport ? DEMO_REPORT.totalTests : 0)
  const displayVulns = liveReport?.vulnerabilities_found ?? (showDemoReport ? DEMO_REPORT.vulnerabilitiesFound : 0)

  const isPopulated = !!liveReport || showDemoReport

  return (
    <div className="space-y-5 pb-12">
      {/* ─── Live Loaded Banner ─── */}
      {liveReport && (
        <div
          className="px-4 py-3 rounded-xl flex items-center justify-between gap-3 text-[13px] font-medium"
          style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46' }}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: '#059669' }} />
            <span>
              Live scan report loaded: <span className="font-mono font-semibold">{liveReport.report_id}</span>
            </span>
          </div>
          <div className="flex items-center gap-4 text-[12px] font-normal" style={{ color: '#166534' }}>
            <span>
              {liveReport.total_tests} tests · {liveReport.vulnerabilities_found} vulnerability/ies found
            </span>
            <button
              type="button"
              onClick={fetchReport}
              className="inline-flex items-center gap-1 font-medium hover:underline cursor-pointer"
              style={{ color: '#047857' }}
              title="Refresh report"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* ─── Error Alert ─── */}
      {loadError && (
        <div
          className="px-4 py-3 rounded-xl flex items-center justify-between gap-3 text-[13px]"
          style={{ background: '#FFF7ED', border: '1px solid #FED7AA', color: '#9A3412' }}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 flex-shrink-0" style={{ color: '#EA580C' }} />
            <span>Could not retrieve scan report: {loadError}</span>
          </div>
          <button
            type="button"
            onClick={fetchReport}
            className="text-[12px] font-semibold underline cursor-pointer"
            style={{ color: '#9A3412' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0D1526' }}>
              Scan Evidence
            </h1>
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-md"
              style={{ background: '#EFF4FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
            >
              Audit Reports
            </span>
          </div>
          <p className="text-[13px] mt-1" style={{ color: '#52637A' }}>
            Vulnerability findings, HTTP wire evidence, and fix-verification records.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]"
            style={{ background: '#FFFFFF', border: '1px solid #E1E7EF', color: '#52637A' }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: liveReport ? '#059669' : showDemoReport ? '#D97706' : '#94A3B8',
              }}
            />
            <span>
              {liveReport
                ? `Live Report: ${liveReport.report_id}`
                : showDemoReport
                ? 'Template loaded'
                : 'Awaiting first scan'}
            </span>
          </div>

          <button
            type="button"
            id="launch-scanner-btn"
            onClick={() => navigate('/scanner')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[13px] font-semibold transition-all cursor-pointer"
            style={{ background: '#1D4ED8', boxShadow: '0 1px 3px rgba(29,78,216,0.3)' }}
          >
            <ScanSearch className="h-3.5 w-3.5" />
            Launch Scanner
          </button>
        </div>
      </div>

      {/* ─── Loading State ─── */}
      {isLoading && (
        <div
          className="rounded-xl p-12 flex flex-col items-center justify-center gap-3"
          style={{ background: '#FFFFFF', border: '1px solid #E1E7EF' }}
        >
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#1D4ED8' }} />
          <span className="text-[13px] font-medium" style={{ color: '#52637A' }}>
            Loading scan evidence from backend…
          </span>
        </div>
      )}

      {/* ─── Empty State ─── */}
      {!isLoading && !isPopulated && (
        <div
          className="rounded-xl p-8 sm:p-12"
          style={{ background: '#FFFFFF', border: '1px solid #E1E7EF', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="flex items-start gap-5">
              <div
                className="h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #EFF4FF, #DBEAFE)' }}
              >
                <FileCheck2 className="h-7 w-7" style={{ color: '#1D4ED8' }} />
              </div>
              <div>
                <h2 className="text-[16px] font-semibold mb-1" style={{ color: '#0D1526' }}>
                  No Scan Reports Recorded
                </h2>
                <p className="text-[13px] leading-relaxed max-w-lg" style={{ color: '#52637A' }}>
                  Security findings and HTTP wire evidence will be cataloged here once an assessment
                  executes against the target API (
                  <span className="font-mono" style={{ color: '#0D1526' }}>POST /scanner/scan</span>).
                </p>

                {/* What to expect */}
                <div className="mt-4 flex flex-wrap gap-3">
                  {[
                    { icon: Shield, label: 'Authorization verdicts' },
                    { icon: Terminal, label: 'HTTP wire evidence' },
                    { icon: ShieldCheck, label: 'Fix verification' },
                  ].map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px]"
                      style={{ background: '#F8FAFC', border: '1px solid #E1E7EF', color: '#52637A' }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: '#8A9BB0' }} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 self-stretch sm:self-auto">
              <button
                type="button"
                id="preview-schema-btn"
                onClick={() => setShowDemoReport(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer"
                style={{ background: '#F8FAFC', border: '1px solid #E1E7EF', color: '#52637A' }}
              >
                <HelpCircle className="h-4 w-4" style={{ color: '#8A9BB0' }} />
                Preview Schema
              </button>

              <button
                type="button"
                onClick={() => navigate('/scanner')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-[13px] font-semibold transition-all cursor-pointer"
                style={{ background: '#1D4ED8', boxShadow: '0 1px 3px rgba(29,78,216,0.3)' }}
              >
                Run First Probe
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Populated Report Workspace ─── */}
      {!isLoading && isPopulated && (
        <div className="space-y-5">
          {/* Illustrative notice ONLY for demo preview */}
          {showDemoReport && !liveReport && (
            <div
              className="p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px]"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
            >
              <div className="flex items-center gap-2.5" style={{ color: '#92400E' }}>
                <ShieldAlert className="h-4 w-4 flex-shrink-0" style={{ color: '#D97706' }} />
                <span>
                  <strong>Illustrative Template:</strong> Demonstrating how real reports structure expected policies,
                  observed results, and wire evidence (
                  <span className="font-mono">GET /scanner/reports/{'{id}'}</span>).
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowDemoReport(false)}
                className="font-semibold underline cursor-pointer text-[12px] flex-shrink-0 self-start sm:self-auto"
                style={{ color: '#92400E' }}
              >
                Return to Empty State
              </button>
            </div>
          )}

          {/* Report summary metrics */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-0 rounded-xl overflow-hidden"
            style={{ background: '#FFFFFF', border: '1px solid #E1E7EF', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            {[
              { label: 'Report ID', value: displayReportId || '—', mono: true },
              {
                label: 'Execution Status',
                value: (
                  <span className="flex items-center gap-1.5 font-semibold" style={{ color: '#059669' }}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Completed
                  </span>
                ),
                mono: false,
              },
              { label: 'Endpoints Evaluated', value: `${displayTests} tests`, mono: true },
              {
                label: 'Vulnerabilities Found',
                value: (
                  <span
                    className="font-mono font-semibold"
                    style={{ color: displayVulns > 0 ? '#DC2626' : '#059669' }}
                  >
                    {displayVulns} detected
                  </span>
                ),
                mono: false,
              },
            ].map((m, i) => (
              <div
                key={m.label}
                className="p-5"
                style={{ borderRight: i < 3 ? '1px solid #EEF2F7' : 'none' }}
              >
                <div className="text-[11px] mb-1" style={{ color: '#8A9BB0' }}>
                  {m.label}
                </div>
                <div
                  className={m.mono ? 'font-mono font-semibold text-[14px]' : 'text-[14px]'}
                  style={{ color: '#0D1526' }}
                >
                  {m.value}
                </div>
              </div>
            ))}
          </div>

          {/* Findings table */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: '#FFFFFF', border: '1px solid #E1E7EF', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid #EEF2F7' }}
            >
              <div>
                <h2 className="text-[15px] font-semibold" style={{ color: '#0D1526' }}>
                  Authorization Findings Ledger
                </h2>
                <p className="text-[12px] mt-0.5" style={{ color: '#52637A' }}>
                  Endpoint, expected policy, observed result, and final verdict.
                </p>
              </div>
              <span className="text-[12px] font-mono" style={{ color: '#52637A' }}>
                {findings.length} findings
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px] border-collapse">
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E1E7EF' }}>
                    {['Endpoint', 'Scenario', 'Severity', 'Expected', 'Observed', 'Verdict', ''].map((h) => (
                      <th
                        key={h}
                        className="py-3 px-4 text-[11px] font-semibold"
                        style={{ color: '#52637A' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {findings.map((f, i) => {
                    const isSelected = f.id === selectedFindingId
                    const severityStyle = SEVERITY_STYLE[f.severityColor] || SEVERITY_STYLE.slate
                    return (
                      <tr
                        key={f.id}
                        id={`finding-row-${f.id}`}
                        onClick={() => setSelectedFindingId(f.id)}
                        className="cursor-pointer transition-all"
                        style={{
                          background: isSelected ? '#F5F8FF' : i % 2 === 1 ? '#FAFBFD' : '#FFFFFF',
                          borderBottom: '1px solid #EEF2F7',
                          borderLeft: isSelected ? '3px solid #1D4ED8' : '3px solid transparent',
                        }}
                      >
                        <td className="py-3.5 px-4 font-mono font-semibold" style={{ color: '#0D1526' }}>
                          <span
                            className="inline-block px-1.5 py-0.5 rounded text-[10px] mr-1.5"
                            style={{ background: '#EFF4FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
                          >
                            {f.method}
                          </span>
                          {f.path}
                        </td>
                        <td className="py-3.5 px-4 max-w-[200px]" style={{ color: '#52637A' }}>
                          {f.scenario}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                            style={{
                              background: severityStyle.bg,
                              color: severityStyle.text,
                              border: `1px solid ${severityStyle.border}`,
                            }}
                          >
                            {f.severity}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px]" style={{ color: '#52637A' }}>
                          {f.expectedPolicy}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] font-semibold" style={{ color: '#0D1526' }}>
                          {f.observedStatus}
                        </td>
                        <td className="py-3.5 px-4">
                          {f.isPassed ? (
                            <span
                              className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              {f.verdict}
                            </span>
                          ) : f.verdict === 'VULNERABLE' ? (
                            <span
                              className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: '#FFF1F2', color: '#9F1239', border: '1px solid #FECDD3' }}
                            >
                              <ShieldAlert className="h-3 w-3" />
                              {f.verdict}
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}
                            >
                              <HelpCircle className="h-3 w-3" />
                              {f.verdict}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className="inline-flex items-center gap-1 text-[12px] font-medium"
                            style={{ color: isSelected ? '#1D4ED8' : '#8A9BB0' }}
                          >
                            {isSelected ? 'Inspecting' : 'Inspect'}
                            <ArrowUpRight className="h-3 w-3" />
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Forensic Wire Evidence Inspector */}
          {activeFinding && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: '#07111F', border: '1px solid #162035', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}
            >
              {/* Inspector header */}
              <div
                className="px-5 py-4 flex items-center justify-between"
                style={{ borderBottom: '1px solid #162035' }}
              >
                <div className="flex items-center gap-2.5">
                  <Terminal className="h-4 w-4" style={{ color: '#60A5FA' }} />
                  <h3 className="text-[13px] font-semibold text-white">
                    Wire Evidence Inspector:{' '}
                    <span className="font-mono" style={{ color: '#93C5FD' }}>
                      {activeFinding.endpoint}
                    </span>
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded"
                    style={
                      activeFinding.isPassed
                        ? {
                            background: 'rgba(5,150,105,0.2)',
                            color: '#34D399',
                            border: '1px solid rgba(5,150,105,0.3)',
                          }
                        : activeFinding.verdict === 'VULNERABLE'
                        ? {
                            background: 'rgba(220,38,38,0.2)',
                            color: '#F87171',
                            border: '1px solid rgba(220,38,38,0.3)',
                          }
                        : {
                            background: 'rgba(217,119,6,0.2)',
                            color: '#FBBF24',
                            border: '1px solid rgba(217,119,6,0.3)',
                          }
                    }
                  >
                    {activeFinding.isPassed ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <ShieldAlert className="h-3 w-3" />
                    )}
                    {activeFinding.verdict}
                  </span>
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded"
                    style={{ background: '#0C1A2E', color: '#60A5FA', border: '1px solid #162035' }}
                  >
                    {activeFinding.id}
                  </span>
                </div>
              </div>

              <div className="p-5">
                {/* Wire grids */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  {/* Request wire */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-medium" style={{ color: '#7A90A8' }}>
                        Recorded HTTP Request
                      </span>
                      <span className="text-[10px] font-mono" style={{ color: '#3D5070' }}>
                        HTTP/1.1
                      </span>
                    </div>
                    <pre
                      className="p-4 rounded-lg overflow-x-auto text-[11px] font-mono leading-relaxed"
                      style={{ background: '#040D1A', border: '1px solid #0F1F35', color: '#93C5FD' }}
                    >
{activeFinding.requestWire}
                    </pre>
                  </div>

                  {/* Response wire */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-medium" style={{ color: '#7A90A8' }}>
                        Captured HTTP Response
                      </span>
                      <span
                        className="text-[10px] font-mono"
                        style={{ color: activeFinding.isPassed ? '#34D399' : '#F87171' }}
                      >
                        {activeFinding.observedStatus}
                      </span>
                    </div>
                    <pre
                      className="p-4 rounded-lg overflow-x-auto text-[11px] font-mono leading-relaxed"
                      style={{
                        background: '#040D1A',
                        border: '1px solid #0F1F35',
                        color: activeFinding.isPassed ? '#6EE7B7' : '#FCA5A5',
                      }}
                    >
{activeFinding.responseWire}
                    </pre>
                  </div>
                </div>

                {/* Analysis */}
                <div
                  className="p-4 rounded-lg text-[12px]"
                  style={{ background: '#0A1628', border: '1px solid #162035' }}
                >
                  <span className="font-semibold" style={{ color: '#7A90A8' }}>
                    Analyzer Evaluation:{' '}
                  </span>
                  <span style={{ color: '#D1D5DB' }}>{activeFinding.analysis}</span>
                </div>
              </div>
            </div>
          )}

          {/* Fix-Verification Architecture Note */}
          <div
            className="rounded-xl p-6"
            style={{ background: '#FFFFFF', border: '1px solid #E1E7EF', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            <div
              className="flex items-center gap-2.5 pb-4 mb-4"
              style={{ borderBottom: '1px solid #EEF2F7' }}
            >
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ background: '#EFF4FF' }}
              >
                <ShieldCheck className="h-4 w-4" style={{ color: '#1D4ED8' }} />
              </div>
              <h2 className="text-[15px] font-semibold" style={{ color: '#0D1526' }}>
                Fix-Verification Comparison Protocol
              </h2>
            </div>

            <p className="text-[13px] leading-relaxed mb-4" style={{ color: '#52637A' }}>
              Fix verification compares an initial vulnerability report against a subsequent post-patch
              retest report. Side-by-side delta comparisons activate once both an initial baseline
              report and a retest report exist in backend storage.
            </p>

            <div
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-lg text-[12px]"
              style={{ background: '#F8FAFC', border: '1px solid #E1E7EF' }}
            >
              <span style={{ color: '#52637A' }}>
                Fix Verification State:{' '}
                <span className="font-mono font-medium" style={{ color: '#0D1526' }}>
                  Requires 2+ completed scan reports
                </span>
              </span>
              <span className="font-mono text-[11px]" style={{ color: '#8A9BB0' }}>
                GET /scanner/reports/{'{report_id}'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
