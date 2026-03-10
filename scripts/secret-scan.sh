#!/usr/bin/env bash
#
# secret-scan.sh — Scan source code for accidentally committed secrets
#
# Checks for: AWS access keys, JWT tokens, RSA private keys,
# password assignments in config files, Supabase service role keys,
# Stripe secret keys, and other common secret patterns.
#
# Exit 0 = pass (no secrets found), Exit 1 = fail (secrets detected).
#

set -euo pipefail

# ── colours (disabled when not a terminal) ──────────────────────────────────
if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BOLD='\033[1m'
  RESET='\033[0m'
else
  RED='' GREEN='' YELLOW='' BOLD='' RESET=''
fi

echo -e "${BOLD}══════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  BuildDesk Secret Scanner${RESET}"
echo -e "${BOLD}══════════════════════════════════════════════════════${RESET}"
echo ""

# ── directories to scan ─────────────────────────────────────────────────────
SCAN_DIRS="src/ supabase/functions/ scripts/ public/"

# ── directories/files to exclude ────────────────────────────────────────────
# Excluded: test files, fixtures, CI scripts, security docs, node_modules
EXCLUDE_DIRS="node_modules .git dist coverage .next .cache"
EXCLUDE_FILES="*.test.ts *.test.tsx *.spec.ts *.spec.tsx secret-scan.sh pentest.config.ts vulnerabilityManifest.ts test-fixtures.ts"

# Build grep exclude arguments
EXCLUDE_ARGS=""
for dir in $EXCLUDE_DIRS; do
  EXCLUDE_ARGS="$EXCLUDE_ARGS --exclude-dir=$dir"
done
for file in $EXCLUDE_FILES; do
  EXCLUDE_ARGS="$EXCLUDE_ARGS --exclude=$file"
done

FOUND=0
FINDINGS=""

# ── helper: scan for a pattern with optional post-filter ────────────────────
scan_pattern() {
  local label="$1"
  local pattern="$2"
  local description="$3"
  local post_filter="${4:-}"  # optional grep -v pattern to exclude false positives

  # shellcheck disable=SC2086
  local matches
  matches=$(grep -rn $EXCLUDE_ARGS -E "$pattern" $SCAN_DIRS 2>/dev/null || true)

  # Apply post-filter to remove known false positives
  if [ -n "$post_filter" ] && [ -n "$matches" ]; then
    matches=$(echo "$matches" | grep -v -E "$post_filter" || true)
  fi

  if [ -n "$matches" ]; then
    FOUND=$((FOUND + 1))
    FINDINGS="${FINDINGS}\n${YELLOW}[${label}]${RESET} ${description}\n"
    while IFS= read -r line; do
      FINDINGS="${FINDINGS}  ${RED}${line}${RESET}\n"
    done <<< "$matches"
    FINDINGS="${FINDINGS}\n"
  fi
}

# ── patterns to scan for ────────────────────────────────────────────────────

echo "Scanning for secrets..."
echo ""

# AWS Access Keys (AKIA followed by 16 alphanumeric chars)
scan_pattern "AWS" \
  "AKIA[0-9A-Z]{16}" \
  "AWS Access Key ID detected"

# JWT tokens (eyJ base64 header, at least 20 chars, commonly in string assignments)
scan_pattern "JWT" \
  "=[[:space:]]*['\"]eyJ[A-Za-z0-9_-]{20,}['\"]" \
  "Hardcoded JWT token detected"

# RSA/EC Private Keys
scan_pattern "PRIVATE_KEY" \
  "-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----" \
  "Private key detected"

# Generic password assignments in config (password = "...", password: "...")
# Excludes: filtering/masking patterns, test utilities, form testers
scan_pattern "PASSWORD" \
  "(password|passwd|pwd)[[:space:]]*[=:][[:space:]]*['\"][^'\"]{4,}['\"]" \
  "Hardcoded password assignment detected" \
  "(Filtered|filtered|masked|form-tester|testers/)"

# Supabase service role key (starts with eyJ, assigned to service_role)
scan_pattern "SUPABASE_SERVICE" \
  "service_role[_]?key[[:space:]]*[=:][[:space:]]*['\"]eyJ" \
  "Supabase service role key detected"

# Stripe secret keys (sk_live_ or sk_test_ followed by alphanumeric)
scan_pattern "STRIPE" \
  "sk_(live|test)_[0-9a-zA-Z]{10,}" \
  "Stripe secret key detected"

# Generic API key assignments with actual values (not env var references)
scan_pattern "API_KEY" \
  "(api[_-]?key|apikey|api[_-]?secret)[[:space:]]*[=:][[:space:]]*['\"][a-zA-Z0-9_-]{20,}['\"]" \
  "Hardcoded API key/secret detected"

# Slack webhooks (only real-looking tokens, not placeholder X's or 0's)
scan_pattern "SLACK" \
  "hooks\.slack\.com/services/T[A-Z0-9]{8,}/B[A-Z0-9]{8,}/[a-zA-Z0-9]{20,}" \
  "Slack webhook URL detected" \
  "(T00000|XXXXX|example|placeholder)"

# SendGrid API keys
scan_pattern "SENDGRID" \
  "SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}" \
  "SendGrid API key detected"

# GitHub tokens
scan_pattern "GITHUB" \
  "(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}" \
  "GitHub token detected"

# ── results ─────────────────────────────────────────────────────────────────

echo "──────────────────────────────────────"

if [ "$FOUND" -gt 0 ]; then
  echo -e "${RED}${BOLD}FAILED: ${FOUND} potential secret(s) found${RESET}"
  echo ""
  echo -e "$FINDINGS"
  echo -e "${BOLD}Remediation:${RESET}"
  echo "  1. Remove the secret from source code"
  echo "  2. Move it to an environment variable"
  echo "  3. If it was ever committed, rotate the credential immediately"
  echo "  4. Add the file to .gitignore if it contains secrets by design"
  echo ""
  exit 1
else
  echo -e "${GREEN}${BOLD}PASSED: No secrets detected${RESET}"
  exit 0
fi
