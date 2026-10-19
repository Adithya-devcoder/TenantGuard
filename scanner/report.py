"""
scanner/report.py
Structured JSON report generation.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def build_report_dict(
    report_id: str,
    status: str,
    results: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Build a JSON-serialisable report dictionary.

    Args:
        report_id: Unique scan identifier.
        status: "completed" | "error"
        results: List of ScanResult.model_dump() dicts.

    Returns:
        Full report dict ready for JSON serialization.
    """
    vulns = sum(1 for r in results if r.get("outcome") == "vulnerable")
    return {
        "report_id": report_id,
        "generated_at": datetime.now(tz=timezone.utc).isoformat(),
        "status": status,
        "total_tests": len(results),
        "vulnerabilities_found": vulns,
        "summary": (
            f"{vulns} vulnerability/ies found out of {len(results)} tests."
            if vulns > 0
            else f"No vulnerabilities found in {len(results)} tests."
        ),
        "disclaimer": (
            "This scanner tests a limited set of BOLA scenarios against controlled "
            "demo data. A clean result does not certify the application is fully secure."
        ),
        "results": results,
    }


def save_report_json(report: dict[str, Any], output_path: Path | str) -> None:
    """Write the report to a JSON file."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, default=str)


def format_report_text(report: dict[str, Any]) -> str:
    """Return a human-readable text summary of the report."""
    lines = [
        "=" * 70,
        f"  TenantGuard BOLA Scan Report",
        f"  Report ID : {report['report_id']}",
        f"  Generated : {report['generated_at']}",
        f"  Status    : {report['status']}",
        f"  Tests     : {report['total_tests']}",
        f"  Vulns     : {report['vulnerabilities_found']}",
        "=" * 70,
    ]
    for result in report.get("results", []):
        icon = "🔴 VULNERABLE" if result["outcome"] == "vulnerable" else (
            "🟡 INCONCLUSIVE" if result["outcome"] == "inconclusive" else "🟢 SAFE"
        )
        lines.append(
            f"\n{icon}  [{result['method']}] {result['endpoint']}"
            f"\n  Actor   : {result['actor_tenant']}"
            f"\n  Target  : {result['target_tenant']}"
            f"\n  Severity: {result['severity']}"
            f"\n  Evidence: {result['evidence']}"
        )
    lines.append("\n" + "=" * 70)
    lines.append(f"  {report['summary']}")
    lines.append(f"  Note: {report['disclaimer']}")
    lines.append("=" * 70)
    return "\n".join(lines)
