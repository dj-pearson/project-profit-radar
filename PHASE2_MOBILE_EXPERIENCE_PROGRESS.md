# Phase 2: Mobile Experience - In Progress

**Date:** November 14, 2025
**Status:** 🚧 In Progress (10% complete)
**Branch:** `claude/builddesk-ux-improvements-01QryFMW3fkWBRY6wa1v4BAn`

## Overview

Phase 2 focuses on creating a mobile-first experience for field workers with GPS tracking, offline capabilities, and touch-optimized interfaces.

## Progress Summary

### ✅ Completed

#### 1. Research & Analysis
- Analyzed existing time tracking implementation (src/pages/TimeTracking.tsx)
- Found GPS geofencing database migration (20251110000002_crew_gps_checkin.sql)
- Identified database schema with geofence support already in place
- Reviewed `verify_crew_gps_checkin` SQL function (Haversine formula)

#### 2. GPS Geofencing Service ✅
**File:** `/src/services/geofencingService.ts` (415 lines)

**Features Implemented:**
- ✅ Browser Geolocation API integration
- ✅ Permission checking and request handling
- ✅ Continuous location watching
- ✅ Haversine distance calculation (meters)
- ✅ Geofence entry/exit detection
- ✅ Multiple geofence monitoring
- ✅ Location accuracy tracking
- ✅ Bearing calculation for directions
- ✅ Cardinal direction conversion (N, NE, E, SE, etc.)
- ✅ Distance formatting (meters/kilometers)
- ✅ Cleanup and memory management

**API Methods:**
```typescript
// Permission & availability
checkAvailability(): Promise<boolean>
requestPermission(): Promise<boolean>

// Location tracking
getCurrentPosition(): Promise<GeofenceLocation>
startWatchingLocation(callback, options)
stopWatchingLocation()
getLastKnownLocation(): GeofenceLocation | null

// Distance calculations
calculateDistance(lat1, lon1, lat2, lon2): number
isInsideGeofence(location, geofence): boolean
getDistanceFromGeofence(location, geofence): number

// Geofence management
addGeofence(geofence: GeofenceBoundary)
removeGeofence(geofenceId: string)
getCurrentGeofences(): GeofenceBoundary[]

// Event callbacks
onGeofenceEnter(callback)
onGeofenceExit(callback)

// Utilities
formatDistance(meters): string
calculateBearing(lat1, lon1, lat2, lon2): number
getBearingDirection(bearing): string
cleanup()
```

---

## 🚧 In Progress

### Mobile Time Clock Component
Building large, touch-friendly time clock interface with GPS verification

**Planned Features:**
- Large clock in/out buttons (minimum 60px touch target)
- Real-time GPS location display
- Distance from job site indicator
- Auto-verify within geofence
- Offline queue support
- Photo verification on clock-in
- Break time tracking
- Job code quick-select

### Components To Build

#### High Priority (Week 5-6)
1. **MobileTimeClock.tsx** - Main time clock interface
2. **GeofenceTimeTracking.tsx** - Auto clock-in/out with geofencing
3. **OfflineTimeEntryManager.tsx** - Offline support with IndexedDB
4. **LocationStatusIndicator.tsx** - GPS status and distance display

#### Medium Priority (Week 7)
5. **MobileDailyWorkflow.tsx** - Complete daily report workflow
6. **QuickPhotoCapture.tsx** - Camera integration for progress photos
7. **VoiceNoteCapture.tsx** - Voice-to-text for hands-free notes

#### Lower Priority (Week 8)
8. **MobileQuickActions.tsx** - Bottom navigation with FAB
9. **OfflineIndicator.tsx** - Network status banner
10. **MobileGeofenceMap.tsx** - Visual map of job site boundaries

---

## Database Schema (Already Exists)

### Time Entries GPS Fields
```sql
ALTER TABLE time_entries
ADD COLUMN geofence_id UUID REFERENCES geofences(id),
ADD COLUMN is_geofence_verified BOOLEAN DEFAULT false,
ADD COLUMN geofence_distance_meters DOUBLE PRECISION,
ADD COLUMN geofence_breach_detected BOOLEAN DEFAULT false;
```

### Crew Assignments GPS Fields
```sql
ALTER TABLE crew_assignments
ADD COLUMN geofence_id UUID REFERENCES geofences(id),
ADD COLUMN gps_checkin_timestamp TIMESTAMPTZ,
ADD COLUMN gps_checkin_lat DOUBLE PRECISION,
ADD COLUMN gps_checkin_lng DOUBLE PRECISION,
ADD COLUMN gps_checkin_accuracy DOUBLE PRECISION,
ADD COLUMN gps_checkin_verified BOOLEAN DEFAULT false,
ADD COLUMN is_onsite BOOLEAN DEFAULT false,
ADD COLUMN gps_checkout_timestamp TIMESTAMPTZ,
ADD COLUMN distance_from_site DOUBLE PRECISION;
```

### SQL Functions Available
- `verify_crew_gps_checkin(assignment_id, lat, lng, accuracy)` - Returns JSON
- `crew_presence_dashboard` - View of who's on site
- `crew_assignments_pending_checkin` - View of pending check-ins

---

## Design Specifications

### Mobile UI Guidelines

#### Touch Targets
- **Minimum size:** 48px × 48px (iOS/Android standard)
- **Recommended:** 60px × 60px for primary actions
- **Spacing:** 8px minimum between targets

#### Typography (Mobile)
- **Hero numbers:** 48-72px (time display, hours)
- **Primary text:** 16-18px (readable at arm's length)
- **Secondary text:** 14px
- **Captions:** 12px

#### Color System
- **Success (Clocked In):** Green #22c55e
- **Warning (GPS Weak):** Yellow #f59e0b
- **Error (Out of Range):** Red #ef4444
- **Neutral (Clocked Out):** Gray #6b7280

#### Loading States
- **Skeleton screens** for initial load
- **Pulse animations** for GPS searching
- **Progress indicators** for uploads

---

## User Flows

### Flow 1: Clock In with GPS
```
1. Open mobile time clock
2. GPS automatically requests location
3. Distance from site displayed
4. If within geofence:
   → "Clock In" button enabled (green)
   → Tap to clock in
   → Optional: Take selfie verification
   → Success confirmation
5. If outside geofence:
   → "Move Closer" message
   → Show distance and direction
   → Refresh location button
```

### Flow 2: Offline Clock In
```
1. No internet connection detected
2. "Working Offline" banner shown
3. Clock in still works locally
4. Entry saved to IndexedDB
5. When online again:
   → Auto-sync queued entries
   → Show sync status
   → Confirm upload success
```

### Flow 3: Daily Report Submission
```
1. End of day → "Submit Report" prompt
2. Voice note: Describe work done
3. Camera: Take progress photos (3-5)
4. Select: Hours worked, crew count
5. Submit: Queue for upload
6. Offline OK: Syncs when online
```

---

## Technology Stack

### Frontend
- **React 18** + TypeScript
- **Geolocation API** (browser native)
- **IndexedDB** (via Dexie.js) for offline storage
- **MediaDevices API** for camera access
- **Web Speech API** for voice notes
- **Service Workers** for offline mode

### Backend
- **Supabase** for data sync
- **PostgreSQL** with PostGIS for geospatial
- **Supabase Realtime** for live updates
- **Supabase Storage** for photo uploads

---

## Offline Strategy

### Data to Cache
1. **User profile** (name, role, avatar)
2. **Active project assignments** (today + tomorrow)
3. **Job codes** and cost codes
4. **Geofence boundaries** for projects
5. **Pending time entries** (not yet synced)

### IndexedDB Schema
```typescript
// Time entries queue
interface OfflineTimeEntry {
  id: string; // UUID
  userId: string;
  projectId: string;
  startTime: Date;
  endTime: Date | null;
  location: GeofenceLocation;
  photos: Blob[];
  notes: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  createdAt: Date;
}
```

### Sync Strategy
1. **On connect:** Auto-sync all pending entries
2. **Conflict resolution:** Server wins (no local edits after sync)
3. **Retry logic:** 3 attempts with exponential backoff
4. **Error handling:** Show sync failures, allow manual retry

---

## Performance Targets

### GPS Accuracy
- **Target:** <50 meters for clock-in
- **Acceptable:** 50-100 meters with warning
- **Reject:** >100 meters outside geofence

### Location Update Frequency
- **Active tracking:** Every 5 seconds
- **Background:** Every 30 seconds
- **Battery consideration:** Stop after 8 hours

### Offline Data Limits
- **Max pending entries:** 100
- **Max photo storage:** 50MB (auto-compress)
- **Cache expiry:** 7 days for old entries

---

## Security & Privacy

### Location Data
- ✅ Request permission before tracking
- ✅ Clear privacy notice in UI
- ✅ User can disable GPS (manual entry allowed)
- ✅ Location data encrypted in transit
- ✅ No location tracking outside work hours

### Photo Verification
- ✅ Optional (not required for all clock-ins)
- ✅ Face detection to verify person (not just photo of photo)
- ✅ Stored securely in Supabase Storage
- ✅ Auto-delete after 90 days (retention policy)

---

## Next Steps (Immediate)

1. **Build MobileTimeClock.tsx** (2 hours)
   - Large clock in/out buttons
   - GPS status indicator
   - Distance from site display
   - Integration with geofencingService

2. **Build GeofenceTimeTracking.tsx** (1 hour)
   - Auto clock-in when entering geofence
   - Auto clock-out when leaving
   - Breach detection and alerts

3. **Build OfflineTimeEntryManager.tsx** (2 hours)
   - IndexedDB setup with Dexie
   - Queue management
   - Sync engine
   - Conflict resolution

4. **Testing** (1 hour)
   - Test with mock GPS coordinates
   - Test offline mode
   - Test sync after reconnect

---

## Success Criteria

### Phase 2 Complete When:
- [ ] Field workers can clock in/out with GPS from mobile
- [ ] Auto clock-in works within 50m of job site
- [ ] Offline mode queues entries and syncs when online
- [ ] Daily reports can be submitted with voice + photos
- [ ] Mobile UI is touch-friendly (60px+ targets)
- [ ] Battery drain is acceptable (<10% per 8-hour day)
- [ ] GPS accuracy is within 50m for 95% of clock-ins

---

## Files Created So Far

```
src/services/
└── geofencingService.ts (415 lines) ✅
```

## Files To Create

```
src/components/mobile/
├── MobileTimeClock.tsx
├── GeofenceTimeTracking.tsx
├── LocationStatusIndicator.tsx
├── OfflineTimeEntryManager.tsx
├── MobileDailyWorkflow.tsx
├── QuickPhotoCapture.tsx
├── VoiceNoteCapture.tsx
├── MobileQuickActions.tsx
├── OfflineIndicator.tsx
├── MobileGeofenceMap.tsx
└── index.ts
```

---

**Status:** 10% complete (1 of 10 components)
**Next Session:** Continue building MobileTimeClock.tsx and GeofenceTimeTracking.tsx
