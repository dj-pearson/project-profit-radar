import CoreLocation
import Observation

/// One-shot, when-in-use location for the time clock's geofence check.
/// There is no background tracking; the app asks for a fix only at the
/// moment a user clocks in or out.
@MainActor
@Observable
final class LocationService: NSObject, CLLocationManagerDelegate {
    static let shared = LocationService()

    private(set) var authorization: CLAuthorizationStatus = .notDetermined

    @ObservationIgnored private let manager = CLLocationManager()
    @ObservationIgnored private var locationContinuation: CheckedContinuation<CLLocation?, Never>?
    @ObservationIgnored private var authContinuation: CheckedContinuation<Void, Never>?

    private override init() {
        super.init()
        authorization = manager.authorizationStatus
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
    }

    var isDenied: Bool {
        authorization == .denied || authorization == .restricted
    }

    /// Ask for permission if needed, then return a single fix. Returns nil
    /// when permission is refused or the fix fails.
    func currentLocation() async -> CLLocation? {
        if authorization == .notDetermined {
            await withCheckedContinuation { continuation in
                authContinuation = continuation
                manager.requestWhenInUseAuthorization()
            }
        }
        guard authorization == .authorizedWhenInUse || authorization == .authorizedAlways else {
            return nil
        }
        // A second caller while a fix is in flight gets nil rather than
        // stranding the first continuation.
        locationContinuation?.resume(returning: nil)
        return await withCheckedContinuation { continuation in
            locationContinuation = continuation
            manager.requestLocation()
        }
    }

    // MARK: - CLLocationManagerDelegate

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor in
            self.authorization = status
            if status != .notDetermined {
                self.authContinuation?.resume()
                self.authContinuation = nil
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        let location = locations.last
        Task { @MainActor in self.finish(location) }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in self.finish(nil) }
    }

    private func finish(_ location: CLLocation?) {
        locationContinuation?.resume(returning: location)
        locationContinuation = nil
    }
}

extension Project {
    /// Distance in meters from the project's site pin, or nil when the
    /// project has no coordinates.
    func distance(from location: CLLocation) -> Double? {
        guard let lat = siteLatitude, let lon = siteLongitude else { return nil }
        return location.distance(from: CLLocation(latitude: lat, longitude: lon))
    }

    /// Radius the web clock uses when the project doesn't set one.
    var effectiveGeofenceRadius: Double { geofenceRadiusMeters ?? 100 }
}
