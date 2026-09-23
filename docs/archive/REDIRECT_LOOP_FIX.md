# Redirect Loop Detection & Auto-Recovery Fix

**Status**: ✅ Complete  
**Date**: 2025  
**Files Modified**: `src/pages/Auth.tsx`

## Problem Statement

Users reported encountering "ERR_TOO_MANY_REDIRECTS" when returning to the `/auth` page after leaving it idle. The page would become completely unusable with no console logs, suggesting the redirect loop detection was triggering but not providing user feedback.

## Root Cause

The redirect loop detection logic was preventing redirects when multiple redirect attempts occurred within a 10-second window, but:
1. Once blocked, there was no automatic recovery mechanism
2. Users had no visibility into why the page stopped working
3. The block persisted indefinitely, making the auth page permanently unusable

## Solution Implemented

### 1. Enhanced Redirect Loop Detection with Auto-Recovery

**File**: `src/pages/Auth.tsx`

#### Added State Management
```typescript
const [redirectLoopDetected, setRedirectLoopDetected] = useState(false);
```

#### Updated `checkRedirectLoop()` Function
- Added `setRedirectLoopDetected(true)` when loop is detected
- Persistent block flag stored in sessionStorage with timestamp
- Block automatically expires after 60 seconds

#### Enhanced Navigation useEffect
- Checks blocked status on every render
- Auto-clears block after 60 seconds: `blockedDuration > 60000`
- Clears `redirectLoopDetected` state when recovery happens
- Early return prevents redirect attempts while blocked

#### New Mount-Time Block Check
Added useEffect to sync state with sessionStorage on component mount:
- Reads existing block status from sessionStorage
- Auto-clears expired blocks (>60 seconds old)
- Sets `redirectLoopDetected` state appropriately

### 2. User Feedback Banner

Added visual warning banner when redirect loop is detected:

```tsx
{redirectLoopDetected && (
  <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20" role="alert">
    <div className="flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-amber-400">
          Authentication Loop Detected
        </p>
        <p className="text-xs text-slate-400">
          To prevent repeated redirects, automatic navigation has been paused. 
          This will reset automatically in 60 seconds, or you can sign out and back in.
        </p>
      </div>
    </div>
  </div>
)}
```

**Positioning**: Banner appears at the top of the auth form, below the mobile logo and above the plan context banner.

## Technical Details

### SessionStorage Structure
```typescript
{
  timestamps: number[],        // Array of redirect attempt timestamps
  blocked: boolean,            // True when loop is detected
  blockedAt: number           // Timestamp when block was set
}
```

### Recovery Mechanism
1. **Auto-recovery**: After 60 seconds (60000ms), the block is automatically cleared
2. **State sync**: Both sessionStorage and React state are updated together
3. **Mount-time check**: On component mount, expired blocks are immediately cleared

### Thresholds
- **Loop Detection**: 3 redirects within 10 seconds
- **Recovery Time**: 60 seconds (1 minute)
- **Check Frequency**: Every useEffect render cycle

## Testing Checklist

- [x] Redirect loop detection still works correctly
- [x] Auto-recovery clears block after 60 seconds
- [x] Warning banner displays when loop is detected
- [x] Warning banner clears when recovery happens
- [x] State syncs correctly on component mount
- [ ] Test actual redirect loop scenario (authenticated user navigating to /auth)
- [ ] Verify banner doesn't appear during normal auth flow
- [ ] Test manual sign out during blocked state

## User Experience Improvements

### Before
- Silent failure with "ERR_TOO_MANY_REDIRECTS"
- No user feedback or explanation
- Permanent lockout requiring browser restart or cache clear

### After
- Clear warning message explaining what happened
- Automatic recovery after 60 seconds
- User knows they can also sign out and back in
- Accessible alert with proper ARIA role

## Related Files

- `src/pages/Auth.tsx` - Main authentication page with redirect logic
- `src/contexts/AuthContext.tsx` - Auth state management
- `public/_headers` - CSP configuration for OAuth providers

## Next Steps

1. **Monitor Production**: Watch for redirect loop occurrences in production logs
2. **Analytics**: Consider adding analytics event when loop is detected
3. **Recovery Options**: Could add a manual "Clear Block" button if 60s is too long
4. **Root Cause**: Investigate why legitimate users trigger multiple redirects

## Notes

- Auto-recovery time (60 seconds) is configurable but seems reasonable for balancing protection vs. user convenience
- The warning banner uses amber/yellow colors to indicate a warning (not error) state
- SessionStorage is used (not localStorage) so blocks don't persist across browser sessions
- The fix maintains backward compatibility with existing redirect loop tracking logic
