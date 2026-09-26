import Foundation
import Observation

@Observable
@MainActor
final class EquipmentListViewModel {
    var equipment: [Equipment] = []
    var isLoading = false
    var errorMessage: String?
    var search = ""
    var statusFilter: String?

    private let service = EquipmentService()

    var visible: [Equipment] {
        let q = search.trimmingCharacters(in: .whitespaces).lowercased()
        return equipment.filter { item in
            if let statusFilter, item.displayStatus.rawValue != statusFilter { return false }
            guard !q.isEmpty else { return true }
            return [item.name, item.equipmentType, item.model, item.serialNumber, item.location]
                .compactMap { $0?.lowercased() }
                .contains { $0.contains(q) }
        }
    }

    func count(_ status: EquipmentStatus) -> Int {
        equipment.filter { $0.displayStatus == status }.count
    }

    func load(companyId: String) async {
        isLoading = equipment.isEmpty
        errorMessage = nil
        defer { isLoading = false }
        do {
            equipment = try await service.list(companyId: companyId)
                .filter { $0.isActive != false }
        } catch {
            if equipment.isEmpty {
                errorMessage = DecodingErrorHelper.handle(error, context: "EquipmentList")
            }
        }
    }
}

@Observable
@MainActor
final class EquipmentDetailViewModel {
    var equipment: Equipment
    var maintenance: [MaintenanceRecord] = []
    var assignments: [EquipmentAssignment] = []
    var qrValue: String?
    var isGeneratingQR = false
    var errorMessage: String?

    private let service = EquipmentService()

    init(equipment: Equipment) {
        self.equipment = equipment
    }

    func load() async {
        errorMessage = nil
        async let fresh = service.equipment(id: equipment.id)
        async let records = service.maintenance(equipmentId: equipment.id)
        async let bookings = service.assignments(equipmentId: equipment.id)
        async let label = service.qrValue(equipmentId: equipment.id)

        do {
            let row = try await fresh
            if let row { equipment = row }
        } catch {
            errorMessage = error.localizedDescription
        }
        let freshRecords = try? await records
        if let freshRecords { maintenance = freshRecords }
        let freshBookings = try? await bookings
        if let freshBookings { assignments = freshBookings }
        let freshLabel = try? await label
        if let freshLabel { qrValue = freshLabel }
    }

    func generateQR() async {
        isGeneratingQR = true
        defer { isGeneratingQR = false }
        do {
            let result = try await service.generateQR(equipmentId: equipment.id)
            if result.success, let value = result.qrCodeValue {
                qrValue = value
            } else {
                errorMessage = result.error ?? "Couldn't create a label."
            }
        } catch {
            errorMessage = "Couldn't create a label: \(error.localizedDescription)"
        }
    }

    func logMaintenance(_ record: NewMaintenanceRecord) async -> Bool {
        do {
            let row = try await service.logMaintenance(record)
            maintenance.insert(row, at: 0)
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func assign(_ assignment: NewEquipmentAssignment) async -> Bool {
        do {
            let row = try await service.assign(assignment)
            assignments.insert(row, at: 0)
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func returnAssignment(_ assignment: EquipmentAssignment) async {
        do {
            let row = try await service.returnAssignment(id: assignment.id)
            if let index = assignments.firstIndex(where: { $0.id == assignment.id }) {
                assignments[index] = row
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

/// One QR scan: read the label, pick an action, send it to
/// `process_equipment_qr_scan` with the phone's location. Needs a
/// connection; the server records the event and moves the status.
@Observable
@MainActor
final class EquipmentScanViewModel {
    var rawCode: String?
    var label: EquipmentLabel?
    var scanType: EquipmentScanType = .checkOut
    var projectId = ""
    var condition = ""
    var hours = ""
    var fuel = ""
    var locationDescription = ""
    var notes = ""
    var isSubmitting = false
    var result: EquipmentScanResult?
    var errorMessage: String?

    private let service = EquipmentService()

    /// Accept a scanned string. Returns false (with a message) when it isn't
    /// one of this company's Brikly labels.
    @discardableResult
    func accept(_ code: String, companyId: String?, currentStatus: String? = nil) -> Bool {
        guard let parsed = EquipmentLabel.parse(code) else {
            errorMessage = "That isn't a Brikly equipment label."
            return false
        }
        guard parsed.companyId == companyId else {
            errorMessage = "That label belongs to another company."
            return false
        }
        rawCode = code
        label = parsed
        errorMessage = nil
        result = nil
        if let currentStatus {
            scanType = currentStatus == EquipmentStatus.inUse.rawValue ? .checkIn : .checkOut
        }
        return true
    }

    func submit() async {
        guard let rawCode else { return }
        guard NetworkMonitor.shared.isOnline else {
            errorMessage = "Scans need a connection so the server can record them."
            return
        }
        isSubmitting = true
        errorMessage = nil
        defer { isSubmitting = false }

        // Location is recorded when available; it doesn't block a scan.
        let location = await LocationService.shared.currentLocation()
        let params = EquipmentScanParams(
            pQrCodeValue: rawCode,
            pScanType: scanType.rawValue,
            pLatitude: location?.coordinate.latitude,
            pLongitude: location?.coordinate.longitude,
            pAccuracy: location?.horizontalAccuracy,
            pLocationDescription: locationDescription.isEmpty ? nil : locationDescription,
            pProjectId: projectId.isEmpty ? nil : projectId,
            pConditionRating: condition.isEmpty ? nil : condition,
            pHoursReading: Double(hours),
            pFuelLevel: Double(fuel),
            pNotes: notes.isEmpty ? nil : notes
        )
        do {
            let response = try await service.scan(params)
            if response.success {
                result = response
            } else {
                errorMessage = response.error ?? "The scan wasn't recorded."
            }
        } catch {
            errorMessage = "The scan wasn't recorded: \(error.localizedDescription)"
        }
    }

    func reset() {
        rawCode = nil
        label = nil
        result = nil
        errorMessage = nil
        projectId = ""
        condition = ""
        hours = ""
        fuel = ""
        locationDescription = ""
        notes = ""
    }
}
