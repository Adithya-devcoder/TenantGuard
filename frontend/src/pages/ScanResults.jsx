import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from 'lucide-react'

// Illustrative findings fixture — not from real backend scan
const DEMO_REPORT = {
  reportId: 'scan-001',
  status: 'completed',
  totalTests: 3,
  vulnerabilitiesFound: 0,
  findings: [
    {
      id: 'f-001',
      endpoint: 'GET /invoices/101',
      method: 'GET',
      path: '/invoices/101',
      scenario: 'Same-tenant baseline access',
      expectedPolicy: 'ALLOW · 200 OK',
      observedStatus: '200 OK',
      severity: 'Info',
      severityColor: 'slate',
      verdict: 'PASSED',
      isPassed: true,
      analysis: 'Tenant A authorized for own invoice. Identity verified against tenant_id in database.',
      requestWire: `GET /invoices/101 HTTP/1.1\nHost: 127.0.0.1:8000\nAuthorization: Bearer <tenant_a_jwt>\nAccept: application/json`,
      responseWire: `HTTP/1.1 200 OK\nContent-Type: application/json\n\n{\n  "invoice_id": 101,\n  "tenant_id": 1,\n  "amount": 4200.00,\n  "status": "paid"\n}`,
    },
    {
      id: 'f-002',
      endpoint: 'GET /invoices/202',
      method: 'GET',
      path: '/invoices/202',
      scenario: 'Cross-tenant object traversal (BOLA vector)',
      expectedPolicy: 'DENY · 403 Forbidden',
      observedStatus: '403 Forbidden',
      severity: 'High',
      severityColor: 'rose',
      verdict: 'PASSED',
      isPassed: true,
      analysis: 'Cross-tenant request correctly blocked by authorization gate. No data disclosed.',
      requestWire: `GET /invoices/202 HTTP/1.1\nHost: 127.0.0.1:8000\nAuthorization: Bearer <tenant_a_jwt>\nAccept: application/json`,
      responseWire: `HTTP/1.1 403 Forbidden\nContent-Type: application/json\n\n{\n  "detail": "Access forbidden: resource belongs to another tenant"\n}`,
    },
    {
      id: 'f-003',
      endpoint: 'GET /invoices',
      method: 'GET',
      path: '/invoices',
      scenario: 'Unauthenticated collection probe',
      expectedPolicy: 'DENY · 401 Unauthorized',
      observedStatus: '401 Unauthorized',
      severity: 'Medium',
      severityColor: 'amber',
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
  const [showDemoReport, setShowDemoReport] = useState(false)
  const [selectedFindingId, setSelectedFindingId] = useState('f-002')

  const activeFinding =
    DEMO_REPORT.findings.find((f) => f.id === selectedFindingId) || DEMO_REPORT.findings[0]

  return (
    <div className="space-y-5 pb-12">
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
              style={{ background: showDemoReport ? '#059669' : '#94A3B8' }}
            />
            <span>{showDemoReport ? 'Template loaded' : 'Awaiting first scan'}</span>
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

      {/* ─── Empty State ─── */}
      {!showDemoReport && (
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
      {showDemoReport && (
        <div className="space-y-5">
          {/* Illustrative notice */}
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

          {/* Report summary metrics */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-0 rounded-xl overflow-hidden"
            style={{ background: '#FFFFFF', border: '1px solid #E1E7EF', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            {[
              { label: 'Report ID', value: DEMO_REPORT.reportId, mono: true },
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
              { label: 'Endpoints Evaluated', value: `${DEMO_REPORT.totalTests} tests`, mono: true },
              {
                label: 'Vulnerabilities Found',
                value: (
                  <span className="font-mono font-semibold" style={{ color: '#059669' }}>
                    {DEMO_REPORT.vulnerabilitiesFound} detected
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
                <div className="text-[11px] mb-1" style={{ color: '#8A9BB0' }}>{m.label}</div>
                <div className={m.mono ? 'font-mono font-semibold text-[14px]' : 'text-[14px]'} style={{ color: '#0D1526' }}>
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
                {DEMO_REPORT.findings.length} findings
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
                  {DEMO_REPORT.findings.map((f, i) => {
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
                        <td className="py-3.5 px-4 max-w-[180px]" style={{ color: '#52637A' }}>
                          {f.scenario}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                            style={{ background: severityStyle.bg, color: severityStyle.text, border: `1px solid ${severityStyle.border}` }}
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
                          <span
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {f.verdict}
                          </span>
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
                  <span className="font-mono" style={{ color: '#93C5FD' }}>{activeFinding.endpoint}</span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded"
                  style={{ background: 'rgba(5,150,105,0.2)', color: '#34D399', border: '1px solid rgba(5,150,105,0.3)' }}
                >
                  <CheckCircle2 className="h-3 w-3" />
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
                    <span className="text-[10px] font-mono" style={{ color: '#3D5070' }}>HTTP/1.1</span>
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
                    <span className="text-[10px] font-mono" style={{ color: '#34D399' }}>
                      {activeFinding.observedStatus}
                    </span>
                  </div>
                  <pre
                    className="p-4 rounded-lg overflow-x-auto text-[11px] font-mono leading-relaxed"
                    style={{ background: '#040D1A', border: '1px solid #0F1F35', color: '#6EE7B7' }}
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
                <span className="font-semibold" style={{ color: '#7A90A8' }}>Analyzer Evaluation: </span>
                <span style={{ color: '#4A6080' }}>{activeFinding.analysis}</span>
              </div>
            </div>
          </div>

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
