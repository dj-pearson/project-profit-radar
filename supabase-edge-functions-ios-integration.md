# Supabase Edge Functions + iOS Integration Guide

Lessons learned from debugging data display failures across the Printyx iOS app. This document captures the architecture, common pitfalls, and fix patterns so future projects avoid multi-day debugging sessions.

---

## Architecture Overview

```
iOS App (Swift/SwiftUI)
    │
    ▼
Supabase Edge Functions (Deno/TypeScript)
    │  ← server.ts acts as a local router + response interceptor
    │
    ▼
PostgREST (Supabase auto-generated REST API)
    │
    ▼
PostgreSQL (self-hosted Supabase)
```

Key insight: **the iOS app never talks directly to PostgreSQL**. Data flows through multiple serialization layers, and each layer can transform date formats, enum values, and JSON structure in ways that break downstream consumers.

---

## The Date Format Problem

### PostgreSQL Timestamp Formats

PostgreSQL has two timestamp types that produce **different JSON output** through PostgREST:

| Drizzle Schema | PostgreSQL Type | PostgREST JSON Output |
|---|---|---|
| `timestamp('col')` | `timestamp without time zone` | `"2024-01-15T10:30:00"` or `"2024-01-15T10:30:00.123456"` |
| `timestamp('col', { withTimezone: true })` | `timestamp with time zone` | `"2024-01-15T10:30:00+00:00"` or `"2024-01-15T10:30:00.123456+00:00"` |
| `date('col')` | `date` | `"2024-01-15"` |

### What iOS Can Parse

Swift's `ISO8601DateFormatter` with default `.withInternetDateTime` options **requires** a timezone:

```swift
// PARSES:     "2024-01-15T10:30:00Z"
// PARSES:     "2024-01-15T10:30:00+00:00"
// FAILS:      "2024-01-15T10:30:00"           ← no timezone!
// FAILS:      "2024-01-15T10:30:00.123456"    ← fractional seconds + no timezone!
// FAILS:      "2024-01-15T10:30:00.123+00:00" ← fractional seconds!
```

`ISO8601DateFormatter` with `.withFractionalSeconds` added:

```swift
// PARSES:     "2024-01-15T10:30:00.123Z"
// PARSES:     "2024-01-15T10:30:00.123+00:00"
// FAILS:      "2024-01-15T10:30:00.123456+00:00" ← 6-digit fractional seconds!
// FAILS:      "2024-01-15T10:30:00.123456"        ← no timezone!
```

### The Fix: Server-Side Normalization

Rather than fighting every format on the client, **normalize all dates in `server.ts`** before they reach the iOS app:

```typescript
// Match timestamps with OR without timezone
const PG_TIMESTAMP_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;

function normalizeDates(value: unknown): unknown {
  if (typeof value === 'string' && PG_TIMESTAMP_RE.test(value)) {
    // No-timezone timestamps are UTC — append Z so Date() treats them as UTC
    const withTz = /[Z+\-]\d/.test(value.slice(-6)) ? value : value + 'Z';
    const d = new Date(withTz);
    // Output: "2024-01-15T10:30:00Z" — always parseable by iOS
    if (!isNaN(d.getTime())) return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
  }
  if (Array.isArray(value)) return value.map(normalizeDates);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, normalizeDates(v)])
    );
  }
  return value;
}
```

This interceptor runs in `server.ts` on every JSON response, converting all date strings to the one format iOS always understands: `"2024-01-15T10:30:00Z"`.

### The iOS Decoder (Belt and Suspenders)

Even with server normalization, the iOS decoder should handle all formats as a fallback:

```swift
decoder.dateDecodingStrategy = .custom { decoder in
    let container = try decoder.singleValueContainer()
    let dateString = try container.decode(String.self)

    // 1. ISO8601 with fractional seconds
    let isoFractional = ISO8601DateFormatter()
    isoFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = isoFractional.date(from: dateString) { return date }

    // 2. ISO8601 standard (handles "2024-01-15T10:30:00Z")
    let isoBasic = ISO8601DateFormatter()
    isoBasic.formatOptions = [.withInternetDateTime]
    if let date = isoBasic.date(from: dateString) { return date }

    // 3. DateFormatter fallbacks for edge cases
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = TimeZone(secondsFromGMT: 0)
    for fmt in [
        "yyyy-MM-dd'T'HH:mm:ss.SSSSSSxxx",  // 6-digit frac + colon tz
        "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",      // 3-digit frac + colon tz
        "yyyy-MM-dd'T'HH:mm:ssxxx",           // no frac + colon tz
        "yyyy-MM-dd'T'HH:mm:ss.SSSSSSZ",      // 6-digit frac + RFC822 tz
        "yyyy-MM-dd'T'HH:mm:ss.SSSZ",         // 3-digit frac + RFC822 tz
        "yyyy-MM-dd'T'HH:mm:ssZ",             // no frac + RFC822 tz
        "yyyy-MM-dd'T'HH:mm:ss.SSSSSS",       // 6-digit frac, NO timezone
        "yyyy-MM-dd'T'HH:mm:ss.SSS",          // 3-digit frac, NO timezone
        "yyyy-MM-dd'T'HH:mm:ss",              // NO frac, NO timezone
        "yyyy-MM-dd",                          // date only
    ] {
        formatter.dateFormat = fmt
        if let date = formatter.date(from: dateString) { return date }
    }

    throw DecodingError.dataCorruptedError(
        in: container,
        debugDescription: "Cannot decode date: \(dateString)"
    )
}
```

---

## Debugging Swift Decoding Errors

### The Problem with Default Errors

Swift's `JSONDecoder` errors are notoriously unhelpful by default:

```
// Default error:
"The data couldn't be read because it isn't in the correct format."
```

This tells you nothing about WHICH field failed or WHY.

### The Fix: Structured Error Extraction

Wrap every decode call to extract the full coding path:

```swift
func detailedDecodingError(_ error: DecodingError) -> String {
    switch error {
    case .typeMismatch(let type, let context):
        let path = context.codingPath.map { $0.stringValue }.joined(separator: ".")
        return "Type mismatch at '\(path)': expected \(type) — \(context.debugDescription)"
    case .valueNotFound(let type, let context):
        let path = context.codingPath.map { $0.stringValue }.joined(separator: ".")
        return "Missing value at '\(path)': expected \(type)"
    case .keyNotFound(let key, let context):
        let path = context.codingPath.map { $0.stringValue }.joined(separator: ".")
        return "Missing key '\(key.stringValue)' at '\(path)'"
    case .dataCorrupted(let context):
        let path = context.codingPath.map { $0.stringValue }.joined(separator: ".")
        return "Data corrupted at '\(path)': \(context.debugDescription)"
    @unknown default:
        return error.localizedDescription
    }
}
```

This produces errors like:
```
"Data corrupted at 'index 0.createdAt': Cannot decode date: 2024-01-15T10:30:00.123456"
```

Now you immediately know: field `createdAt` on the first array element, and the exact date string that failed.

---

## Enum Decoding Resilience

### The Problem

Backend adds a new enum value (e.g., `status: "archived"`), iOS app doesn't have it in its Swift enum, entire response fails to decode. One missing case breaks the whole screen.

### The Fix: Safe Enum Decoding

```swift
// Instead of a strict enum:
enum Status: String, Codable {
    case active, inactive, archived
}

// Use an enum with unknown fallback:
enum Status: String, Codable, SafeDecodable {
    case active, inactive, archived
    case unknown

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let rawValue = try container.decode(String.self)
        self = Status(rawValue: rawValue) ?? .unknown
    }
}
```

Or, make the field optional with a default:
```swift
struct Record: Codable {
    let status: String  // Use String instead of enum when backend values change frequently
}
```

---

## Checklist: New Supabase + iOS Feature

When adding a new feature that involves data flowing from PostgreSQL to iOS:

1. **Check column types in `shared/schema.ts`**
   - Is it `timestamp()` or `timestamp(..., { withTimezone: true })`?
   - Is it `date()` (date-only)?
   - This determines the JSON format PostgREST returns

2. **Verify server.ts normalization covers the format**
   - The `normalizeDates` function in `supabase/functions/server.ts` must match the format
   - Test with the actual data, not assumed formats

3. **Match Swift model properties to JSON keys**
   - `keyDecodingStrategy = .convertFromSnakeCase` converts `created_at` to `createdAt`
   - Edge function responses must use `snake_case` keys

4. **Handle nullable fields**
   - PostgreSQL `NULL` becomes JSON `null`
   - Swift property must be `Optional` (`let field: Type?`)
   - Non-optional properties cause decode failure on `null`

5. **Use String for volatile enums**
   - If the backend enum values might change, use `String` on the iOS side
   - Only use Swift enums for truly stable values

6. **Test with real data, not mocks**
   - The format differences only show up with real PostgreSQL data
   - Mocked JSON in tests often uses "nice" formats that mask issues

---

## Environment Quick Reference

| Component | Location | How to Deploy |
|---|---|---|
| Edge function code | `supabase/functions/` | Restart edge function service in Coolify |
| Edge function router | `supabase/functions/server.ts` | Same — this is the entry point |
| Shared CORS/auth | `supabase/functions/_shared/` | Same deployment |
| iOS app code | `ios/Printyx/` | Rebuild in Xcode, deploy via TestFlight |
| Drizzle schema | `shared/schema.ts` | Affects PostgREST auto-generated API |
| Database | `209.145.59.219:5433` | Migrations via `npm run db:migrate` |

### Key Files

| Purpose | File |
|---|---|
| Date normalization | `supabase/functions/server.ts` → `normalizeDates()` |
| iOS API client | `ios/Printyx/Core/Network/APIClient.swift` |
| iOS data models | `ios/Printyx/Core/Models/` |
| CORS headers | `supabase/functions/_shared/cors.ts` |
| Edge function handlers | `supabase/functions/{name}/index.ts` |

### Debugging Workflow

1. **iOS error** → Check the detailed decoding error message (field path + raw value)
2. **Identify the field** → Find the column in `shared/schema.ts`, note the type
3. **Check the format** → `curl` the edge function endpoint, look at the raw JSON
4. **Fix server-side first** → Update `normalizeDates()` in `server.ts` if the format isn't covered
5. **Fix iOS fallback** → Update date decoder patterns in `APIClient.swift`
6. **Redeploy** → Restart edge functions, rebuild iOS app
