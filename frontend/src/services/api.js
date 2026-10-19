/**
 * TenantGuard API Client Service
 * 
 * Target Backend: FastAPI on http://127.0.0.1:8000
 * Handles communication with backend endpoints according to the agreed API contract.
 * Does not fabricate successful responses when backend is offline.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

/**
 * Checks connectivity to the backend API base URL
 */
export async function checkBackendConnection() {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      return {
        connected: false,
        url: API_BASE_URL,
        status: response.status,
        error: `HTTP ${response.status} ${response.statusText}`,
      }
    }

    const data = await response.json()
    if (data && data.status === 'ok') {
      return {
        connected: true,
        url: API_BASE_URL,
        status: data.status,
        database: data.database || 'connected',
      }
    } else {
      return {
        connected: false,
        url: API_BASE_URL,
        status: data?.status || 'degraded',
        error: `Unexpected backend status: ${data?.status || 'unknown'}`,
      }
    }
  } catch (error) {
    return {
      connected: false,
      url: API_BASE_URL,
      error: error.name === 'AbortError' ? 'Connection timed out (4s)' : error.message || 'Connection refused',
    }
  }
}

/**
 * Authenticates a demo user with username and password
 * Contract: POST /auth/login
 */
export async function loginUser(username, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `Authentication failed with status ${response.status}`)
  }

  return response.json()
}

/**
 * Fetches tenant-accessible invoices
 * Contract: GET /invoices
 */
export async function getInvoices(token) {
  const headers = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}/invoices`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `Failed to fetch invoices (${response.status})`)
  }

  return response.json()
}

/**
 * Fetches a single invoice by ID
 * Contract: GET /invoices/{invoice_id}
 */
export async function getInvoiceById(invoiceId, token) {
  const headers = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `Failed to fetch invoice #${invoiceId} (${response.status})`)
  }

  return response.json()
}

/**
 * Initiates a BOLA security scan
 * Contract: POST /scanner/scan
 */
export async function runSecurityScan(scanConfig) {
  const response = await fetch(`${API_BASE_URL}/scanner/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(scanConfig),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `Scan initiation failed (${response.status})`)
  }

  return response.json()
}

/**
 * Retrieves a scan report by ID
 * Contract: GET /scanner/reports/{report_id}
 */
export async function getScanReport(reportId) {
  const response = await fetch(`${API_BASE_URL}/scanner/reports/${reportId}`, {
    method: 'GET',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `Failed to retrieve scan report #${reportId} (${response.status})`)
  }

  return response.json()
}

/**
 * Retrieves the most recent scan report
 * Contract: GET /scanner/reports/latest
 */
export async function getLatestScanReport() {
  const response = await fetch(`${API_BASE_URL}/scanner/reports/latest`, {
    method: 'GET',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `Failed to retrieve latest scan report (${response.status})`)
  }

  return response.json()
}

export { API_BASE_URL }

