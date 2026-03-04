#!/usr/bin/env bash
#
# security-audit.sh — Dependency vulnerability scanner for CI
# Runs npm audit, filters by severity, supports an allowlist with expiry dates.
# Exit 0 = pass, Exit 1 = fail (critical/high vulnerabilities found).
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ALLOWLIST_FILE="${SCRIPT_DIR}/audit-allowlist.json"
TODAY=$(date +%Y-%m-%d)

# ── colours (disabled when not a terminal) ──────────────────────────────────
if [ -t 1 ]; then
  RED='\033[0;31m'
  YELLOW='\033[1;33m'
  GREEN='\033[0;32m'
  CYAN='\033[0;36m'
  BOLD='\033[1m'
  RESET='\033[0m'
else
  RED='' YELLOW='' GREEN='' CYAN='' BOLD='' RESET=''
fi

echo -e "${BOLD}══════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  BuildDesk Dependency Vulnerability Scanner${RESET}"
echo -e "${BOLD}══════════════════════════════════════════════════════${RESET}"
echo ""
echo -e "  Date : ${TODAY}"
echo ""

# ── check for jq ────────────────────────────────────────────────────────────
if ! command -v jq &>/dev/null; then
  echo -e "${RED}Error: jq is required but not installed.${RESET}"
  echo "  Install with:  apt-get install jq  |  brew install jq"
  exit 1
fi

# ── run npm audit (returns non-zero when vulns exist, so capture it) ────────
echo -e "${CYAN}Running npm audit ...${RESET}"
AUDIT_JSON=$(npm audit --json 2>/dev/null || true)

if [ -z "$AUDIT_JSON" ] || [ "$AUDIT_JSON" = "{}" ]; then
  echo -e "${GREEN}npm audit returned no data — no known vulnerabilities.${RESET}"
  exit 0
fi

# ── load allowlist ──────────────────────────────────────────────────────────
ALLOWLIST_IDS="[]"
EXPIRED_IDS="[]"
if [ -f "$ALLOWLIST_FILE" ]; then
  # Active (non-expired) allowlisted IDs
  ALLOWLIST_IDS=$(jq -r \
    --arg today "$TODAY" \
    '[.allowlist[] | select(.expires >= $today) | .id]' \
    "$ALLOWLIST_FILE")

  # Expired allowlisted IDs (for reporting)
  EXPIRED_IDS=$(jq -r \
    --arg today "$TODAY" \
    '[.allowlist[] | select(.expires < $today) | .id]' \
    "$ALLOWLIST_FILE")
else
  echo -e "${YELLOW}No allowlist file found at ${ALLOWLIST_FILE} — processing all vulnerabilities.${RESET}"
fi

# ── report expired allowlist entries ────────────────────────────────────────
EXPIRED_COUNT=$(echo "$EXPIRED_IDS" | jq 'length')
if [ "$EXPIRED_COUNT" -gt 0 ]; then
  echo ""
  echo -e "${YELLOW}WARNING: ${EXPIRED_COUNT} allowlist entry/entries have expired and will no longer be suppressed:${RESET}"
  echo "$EXPIRED_IDS" | jq -r '.[]' | while read -r eid; do
    REASON=$(jq -r --arg id "$eid" '.allowlist[] | select(.id == $id) | "\(.expires) — \(.reason)"' "$ALLOWLIST_FILE")
    echo -e "  ${YELLOW}• ${eid}${RESET}  (expired ${REASON})"
  done
  echo ""
fi

# ── parse vulnerabilities ──────────────────────────────────────────────────
# npm audit v7+ JSON format uses .vulnerabilities object keyed by package name.
# Each entry has: severity, via[], effects[], range, fixAvailable, etc.
# We also handle the older format that uses .advisories keyed by numeric id.

# Detect format: if .vulnerabilities exists, it's v7+ format
HAS_VULNS_KEY=$(echo "$AUDIT_JSON" | jq 'has("vulnerabilities")')

if [ "$HAS_VULNS_KEY" = "true" ]; then
  # ── npm v7+ format ────────────────────────────────────────────────────
  # Extract all vulnerabilities with critical or high severity
  ALL_VULNS=$(echo "$AUDIT_JSON" | jq -r '
    [.vulnerabilities | to_entries[] |
      select(.value.severity == "critical" or .value.severity == "high") |
      {
        name: .key,
        severity: .value.severity,
        id: (.value.via[]? | if type == "object" then (.url // .source // .name // "") else . end) | tostring,
        via: [.value.via[]? | if type == "object" then .name // .title // "" else . end] | join(", "),
        fix_available: (if .value.fixAvailable then "yes" else "no" end),
        range: .value.range
      }
    ] | unique_by(.name)')

  # Extract advisory IDs/URLs for allowlist matching
  # We match on package name OR advisory URL/source
  FILTERED_VULNS=$(echo "$ALL_VULNS" | jq -r \
    --argjson allowlist "$ALLOWLIST_IDS" \
    '[.[] | select(
      (.name as $n | $allowlist | index($n) | not) and
      (.id as $i | $allowlist | index($i) | not)
    )]')
else
  # ── legacy format (npm v6 / .advisories) ──────────────────────────────
  ALL_VULNS=$(echo "$AUDIT_JSON" | jq -r '
    [.advisories // {} | to_entries[] |
      select(.value.severity == "critical" or .value.severity == "high") |
      {
        name: .value.module_name,
        severity: .value.severity,
        id: (.key | tostring),
        via: .value.title,
        fix_available: (if .value.patched_versions != "<0.0.0" then "yes" else "no" end),
        range: .value.vulnerable_versions
      }
    ] | unique_by(.name)')

  FILTERED_VULNS=$(echo "$ALL_VULNS" | jq -r \
    --argjson allowlist "$ALLOWLIST_IDS" \
    '[.[] | select(
      (.name as $n | $allowlist | index($n) | not) and
      (.id as $i | $allowlist | index($i) | not)
    )]')
fi

# ── gather summary counts from full audit ───────────────────────────────────
if [ "$HAS_VULNS_KEY" = "true" ]; then
  TOTAL_INFO=$(echo "$AUDIT_JSON" | jq '[.vulnerabilities | to_entries[] | select(.value.severity == "info")] | length')
  TOTAL_LOW=$(echo "$AUDIT_JSON" | jq '[.vulnerabilities | to_entries[] | select(.value.severity == "low")] | length')
  TOTAL_MODERATE=$(echo "$AUDIT_JSON" | jq '[.vulnerabilities | to_entries[] | select(.value.severity == "moderate")] | length')
  TOTAL_HIGH=$(echo "$AUDIT_JSON" | jq '[.vulnerabilities | to_entries[] | select(.value.severity == "high")] | length')
  TOTAL_CRITICAL=$(echo "$AUDIT_JSON" | jq '[.vulnerabilities | to_entries[] | select(.value.severity == "critical")] | length')
else
  TOTAL_INFO=$(echo "$AUDIT_JSON" | jq '[.advisories // {} | to_entries[] | select(.value.severity == "info")] | length')
  TOTAL_LOW=$(echo "$AUDIT_JSON" | jq '[.advisories // {} | to_entries[] | select(.value.severity == "low")] | length')
  TOTAL_MODERATE=$(echo "$AUDIT_JSON" | jq '[.advisories // {} | to_entries[] | select(.value.severity == "moderate")] | length')
  TOTAL_HIGH=$(echo "$AUDIT_JSON" | jq '[.advisories // {} | to_entries[] | select(.value.severity == "high")] | length')
  TOTAL_CRITICAL=$(echo "$AUDIT_JSON" | jq '[.advisories // {} | to_entries[] | select(.value.severity == "critical")] | length')
fi

TOTAL=$(( TOTAL_INFO + TOTAL_LOW + TOTAL_MODERATE + TOTAL_HIGH + TOTAL_CRITICAL ))

# ── print summary ───────────────────────────────────────────────────────────
echo -e "${BOLD}Vulnerability Summary${RESET}"
echo "──────────────────────────────────────"
echo -e "  Info     : ${TOTAL_INFO}"
echo -e "  Low      : ${TOTAL_LOW}"
echo -e "  Moderate : ${TOTAL_MODERATE}"
echo -e "  High     : ${YELLOW}${TOTAL_HIGH}${RESET}"
echo -e "  Critical : ${RED}${TOTAL_CRITICAL}${RESET}"
echo "──────────────────────────────────────"
echo -e "  Total    : ${TOTAL}"
echo ""

ALLOWLISTED_COUNT=$(echo "$ALL_VULNS" | jq 'length')
FAILING_COUNT=$(echo "$FILTERED_VULNS" | jq 'length')
SUPPRESSED=$(( ALLOWLISTED_COUNT - FAILING_COUNT ))

if [ "$SUPPRESSED" -gt 0 ]; then
  echo -e "${CYAN}Allowlisted (suppressed): ${SUPPRESSED} high/critical vulnerability/vulnerabilities${RESET}"
  echo ""
fi

# ── detailed output for failing vulnerabilities ─────────────────────────────
if [ "$FAILING_COUNT" -gt 0 ]; then
  echo -e "${RED}${BOLD}FAILING: ${FAILING_COUNT} critical/high vulnerability/vulnerabilities require attention${RESET}"
  echo ""

  echo "$FILTERED_VULNS" | jq -r '.[] | @base64' | while read -r encoded; do
    vuln=$(echo "$encoded" | base64 --decode)
    name=$(echo "$vuln" | jq -r '.name')
    severity=$(echo "$vuln" | jq -r '.severity')
    via=$(echo "$vuln" | jq -r '.via')
    fix=$(echo "$vuln" | jq -r '.fix_available')
    range=$(echo "$vuln" | jq -r '.range')
    vid=$(echo "$vuln" | jq -r '.id')

    if [ "$severity" = "critical" ]; then
      SEV_COLOR="$RED"
    else
      SEV_COLOR="$YELLOW"
    fi

    echo -e "  ${SEV_COLOR}${BOLD}[${severity^^}]${RESET} ${BOLD}${name}${RESET}"
    echo -e "    Affected : ${range}"
    echo -e "    Via      : ${via}"
    echo -e "    Fix avail: ${fix}"
    echo -e "    ID       : ${vid}"
    echo ""
  done

  echo "──────────────────────────────────────"
  echo -e "${BOLD}Remediation advice:${RESET}"
  echo ""
  echo "  1. Run ${CYAN}npm audit fix${RESET} to auto-fix where possible."
  echo "  2. For breaking changes, run ${CYAN}npm audit fix --force${RESET} (review changes!)."
  echo "  3. If a vulnerability cannot be fixed yet, add it to the allowlist:"
  echo ""
  echo "     ${CYAN}${ALLOWLIST_FILE}${RESET}"
  echo ""
  echo '     { "id": "<package-name-or-advisory-id>", "reason": "...", "expires": "YYYY-MM-DD" }'
  echo ""
  echo "  4. Allowlist entries expire automatically — revisit before the expiry date."
  echo ""
  echo -e "${RED}${BOLD}AUDIT FAILED${RESET}"
  exit 1
else
  echo -e "${GREEN}${BOLD}AUDIT PASSED${RESET} — no unresolved critical/high vulnerabilities."
  exit 0
fi
