import urllib.request, json, sys

base = "http://127.0.0.1:8000"

print("=== Live Scanner End-to-End Test ===")

scan_payload = {
    "target_base_url": "http://127.0.0.1:8000",
    "tenant_a_username": "tenant_a_user",
    "tenant_a_password": "TenantA_demo_pw_2024",
    "tenant_b_username": "tenant_b_user",
    "tenant_b_password": "TenantB_demo_pw_2024",
    "tenant_a_invoice_id": 101,
    "tenant_b_invoice_id": 202,
}

req = urllib.request.Request(
    base + "/scanner/scan",
    data=json.dumps(scan_payload).encode(),
    headers={"Content-Type": "application/json"},
    method="POST"
)
print("Posting to /scanner/scan...")
resp = urllib.request.urlopen(req, timeout=30)
scan_result = json.loads(resp.read())

print("Report ID   :", scan_result["report_id"])
print("Status      :", scan_result["status"])
print("Total tests :", scan_result["total_tests"])
print("Vulns found :", scan_result["vulnerabilities_found"])
print()
for r in scan_result["results"]:
    icon = "[VULN]" if r["outcome"] == "vulnerable" else "[SAFE]" if r["outcome"] == "not_vulnerable" else "[????]"
    print(icon, r["test_type"].ljust(20), "actor=" + r["actor_tenant"].ljust(10), "HTTP", str(r["http_status"]).ljust(4), r["outcome"])

report_id = scan_result["report_id"]
req2 = urllib.request.Request(base + "/scanner/reports/" + report_id)
resp2 = urllib.request.urlopen(req2, timeout=10)
fetched = json.loads(resp2.read())
print()
print("GET /scanner/reports/" + report_id + " -> status=" + fetched["status"])
print("=== Scanner E2E PASSED ===")
