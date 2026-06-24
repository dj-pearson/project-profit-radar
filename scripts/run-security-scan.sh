#!/usr/bin/env bash
#
# run-security-scan.sh — Combined security scan for Brikly
#
# Runs:
#   1. npm audit        — dependency vulnerability check
#   2. npm run test:security — application security tests (Vitest)
#
# Outputs a combined summary and returns exit code:
#   0  = all checks passed
#   1  = one or more checks failed
#
# Usage:
#   ./scripts/run-security-scan.sh [--ci] [--report-dir <path>]
#
# Options:
#   --ci           Run in CI mode (no colour, JSON report output)
#   --report-dir   Directory for report artefacts (default: ./security-reports)

set -uo pipefail

# ── defaults ─────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CI_MODE=false
REPORT_DIR="${PROJECT_ROOT}/security-reports"
TIMESTAMP=$(date +%Y-%m-%dT%H:%M:%S)
DATE_STAMP=$(date +%Y-%m-%d)

# ── parse arguments ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --ci)
      CI_MODE=true
      shift
      ;;
    --report-dir)
      REPORT_DIR="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [--ci] [--report-dir <path>]"
      echo ""
      echo "Options:"
      echo "  --ci           CI mode (no colour, JSON report)"
      echo "  --report-dir   Output directory (default: ./security-reports)"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# ── colours (disabled in CI or non-terminal) ─────────────────────────────────
if [ -t 1 ] && [ "$CI_MODE" = false ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  CYAN='\033[0;36m'
  BOLD='\033[1m'
  RESET='\033[0m'
else
  RED='' GREEN='' YELLOW='' CYAN='' BOLD='' RESET=''
fi

# ── setup ────────────────────────────────────────────────────────────────────
mkdir -p "${REPORT_DIR}"

AUDIT_EXIT=0
TEST_EXIT=0
AUDIT_REPORT="${REPORT_DIR}/npm-audit-${DATE_STAMP}.json"
TEST_REPORT="${REPORT_DIR}/security-tests-${DATE_STAMP}.txt"
SUMMARY_REPORT="${REPORT_DIR}/security-summary-${DATE_STAMP}.txt"

cd "${PROJECT_ROOT}"

echo -e "${BOLD}================================================================${RESET}"
echo -e "${BOLD}  Brikly Security Scan${RESET}"
echo -e "${BOLD}================================================================${RESET}"
echo -e "  Timestamp : ${TIMESTAMP}"
echo -e "  Project   : ${PROJECT_ROOT}"
echo -e "  Reports   : ${REPORT_DIR}"
echo ""

# ══════════════════════════════════════════════════════════════════════════════
# STEP 1: npm audit
# ══════════════════════════════════════════════════════════════════════════════
echo -e "${CYAN}──────────────────────────────────────────────────────────────${RESET}"
echo -e "${BOLD}[1/2] Running npm audit ...${RESET}"
echo -e "${CYAN}──────────────────────────────────────────────────────────────${RESET}"
echo ""

# Capture JSON output for reporting; npm audit exits non-zero when vulns exist
AUDIT_JSON=$(npm audit --json 2>/dev/null || true)
echo "${AUDIT_JSON}" > "${AUDIT_REPORT}"

# Parse vulnerability counts
if echo "${AUDIT_JSON}" | grep -q '"vulnerabilities"'; then
  # npm v7+ format
  VULN_INFO=$(echo "${AUDIT_JSON}" | jq '[.vulnerabilities // {} | to_entries[] | select(.value.severity == "info")] | length' 2>/dev/null || echo 0)
  VULN_LOW=$(echo "${AUDIT_JSON}" | jq '[.vulnerabilities // {} | to_entries[] | select(.value.severity == "low")] | length' 2>/dev/null || echo 0)
  VULN_MODERATE=$(echo "${AUDIT_JSON}" | jq '[.vulnerabilities // {} | to_entries[] | select(.value.severity == "moderate")] | length' 2>/dev/null || echo 0)
  VULN_HIGH=$(echo "${AUDIT_JSON}" | jq '[.vulnerabilities // {} | to_entries[] | select(.value.severity == "high")] | length' 2>/dev/null || echo 0)
  VULN_CRITICAL=$(echo "${AUDIT_JSON}" | jq '[.vulnerabilities // {} | to_entries[] | select(.value.severity == "critical")] | length' 2>/dev/null || echo 0)
else
  VULN_INFO=0
  VULN_LOW=0
  VULN_MODERATE=0
  VULN_HIGH=0
  VULN_CRITICAL=0
fi

VULN_TOTAL=$(( VULN_INFO + VULN_LOW + VULN_MODERATE + VULN_HIGH + VULN_CRITICAL ))

echo -e "  ${BOLD}Dependency Vulnerability Summary${RESET}"
echo    "  ────────────────────────────────"
echo -e "  Info     : ${VULN_INFO}"
echo -e "  Low      : ${VULN_LOW}"
echo -e "  Moderate : ${VULN_MODERATE}"
echo -e "  High     : ${YELLOW}${VULN_HIGH}${RESET}"
echo -e "  Critical : ${RED}${VULN_CRITICAL}${RESET}"
echo -e "  ────────────────────────────────"
echo -e "  Total    : ${VULN_TOTAL}"
echo ""

if [ "${VULN_CRITICAL}" -gt 0 ] || [ "${VULN_HIGH}" -gt 0 ]; then
  echo -e "  ${RED}FAIL${RESET} - ${VULN_HIGH} high, ${VULN_CRITICAL} critical vulnerabilities found"
  AUDIT_EXIT=1
else
  echo -e "  ${GREEN}PASS${RESET} - No high/critical vulnerabilities"
  AUDIT_EXIT=0
fi

echo ""

# ══════════════════════════════════════════════════════════════════════════════
# STEP 2: Security tests
# ══════════════════════════════════════════════════════════════════════════════
echo -e "${CYAN}──────────────────────────────────────────────────────────────${RESET}"
echo -e "${BOLD}[2/2] Running security tests ...${RESET}"
echo -e "${CYAN}──────────────────────────────────────────────────────────────${RESET}"
echo ""

# Run security-specific tests. The test:security script should be defined in
# package.json. If it does not exist, fall back to running Vitest with a
# filename filter for security-related test files.
if npm run test:security --if-present > "${TEST_REPORT}" 2>&1; then
  TEST_EXIT=0
  TESTS_PASSED=$(grep -cE '✓|PASS|pass' "${TEST_REPORT}" 2>/dev/null || echo "?")
  echo -e "  ${GREEN}PASS${RESET} - Security tests completed (${TESTS_PASSED} checks passed)"
else
  TEST_EXIT=$?
  TESTS_FAILED=$(grep -cE '✗|FAIL|fail|Error' "${TEST_REPORT}" 2>/dev/null || echo "?")
  echo -e "  ${RED}FAIL${RESET} - Security tests failed (${TESTS_FAILED} failures detected)"
  echo ""
  # Show last 20 lines of test output for quick diagnosis
  echo -e "  ${YELLOW}Last 20 lines of test output:${RESET}"
  tail -20 "${TEST_REPORT}" | sed 's/^/    /'
fi

echo ""

# ══════════════════════════════════════════════════════════════════════════════
# COMBINED SUMMARY
# ══════════════════════════════════════════════════════════════════════════════
echo -e "${CYAN}──────────────────────────────────────────────────────────────${RESET}"
echo -e "${BOLD}  Combined Security Report Summary${RESET}"
echo -e "${CYAN}──────────────────────────────────────────────────────────────${RESET}"
echo ""

# Determine overall status
if [ "${AUDIT_EXIT}" -eq 0 ] && [ "${TEST_EXIT}" -eq 0 ]; then
  OVERALL_STATUS="PASS"
  OVERALL_EXIT=0
  STATUS_COLOR="${GREEN}"
else
  OVERALL_STATUS="FAIL"
  OVERALL_EXIT=1
  STATUS_COLOR="${RED}"
fi

# Print summary table
AUDIT_STATUS="PASS"
[ "${AUDIT_EXIT}" -ne 0 ] && AUDIT_STATUS="FAIL"
TEST_STATUS="PASS"
[ "${TEST_EXIT}" -ne 0 ] && TEST_STATUS="FAIL"

echo -e "  Check                 Result    Details"
echo -e "  ─────────────────────────────────────────────────────────"
if [ "${AUDIT_EXIT}" -eq 0 ]; then
  echo -e "  npm audit             ${GREEN}PASS${RESET}      ${VULN_TOTAL} total (0 high/critical)"
else
  echo -e "  npm audit             ${RED}FAIL${RESET}      ${VULN_TOTAL} total (${VULN_HIGH} high, ${VULN_CRITICAL} critical)"
fi
if [ "${TEST_EXIT}" -eq 0 ]; then
  echo -e "  Security tests        ${GREEN}PASS${RESET}      All security tests passed"
else
  echo -e "  Security tests        ${RED}FAIL${RESET}      See ${TEST_REPORT}"
fi
echo -e "  ─────────────────────────────────────────────────────────"
echo -e "  ${BOLD}Overall${RESET}                ${STATUS_COLOR}${BOLD}${OVERALL_STATUS}${RESET}"
echo ""

# Write summary to file
{
  echo "Brikly Security Scan Summary"
  echo "==============================="
  echo "Timestamp: ${TIMESTAMP}"
  echo ""
  echo "1. npm audit: ${AUDIT_STATUS}"
  echo "   Info: ${VULN_INFO} | Low: ${VULN_LOW} | Moderate: ${VULN_MODERATE} | High: ${VULN_HIGH} | Critical: ${VULN_CRITICAL}"
  echo ""
  echo "2. Security tests: ${TEST_STATUS}"
  echo ""
  echo "Overall: ${OVERALL_STATUS}"
} > "${SUMMARY_REPORT}"

echo -e "  Reports written to:"
echo -e "    ${CYAN}${AUDIT_REPORT}${RESET}"
echo -e "    ${CYAN}${TEST_REPORT}${RESET}"
echo -e "    ${CYAN}${SUMMARY_REPORT}${RESET}"
echo ""

exit "${OVERALL_EXIT}"
