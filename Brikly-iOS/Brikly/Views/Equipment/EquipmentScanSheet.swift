import SwiftUI

/// Scan a label, choose what's happening (check out, check in, inspection,
/// location), and record it through `process_equipment_qr_scan`.
struct EquipmentScanSheet: View {
    /// Known equipment, to show the current status once a label is read.
    let equipment: [Equipment]
    /// When opened from a detail screen, the label must be this item's.
    var expected: Equipment?

    @Environment(AuthViewModel.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = EquipmentScanViewModel()
    @State private var cameraUnavailable = false
    @State private var projects: [Project] = []

    private var scannedItem: Equipment? {
        guard let id = viewModel.label?.equipmentId else { return nil }
        return equipment.first { $0.id == id }
    }

    var body: some View {
        NavigationStack {
            Group {
                if let result = viewModel.result {
                    resultView(result)
                } else if viewModel.label != nil {
                    actionForm
                } else if cameraUnavailable {
                    ContentUnavailableView(
                        "Camera Unavailable",
                        systemImage: "camera.fill",
                        description: Text("Allow camera access for Brikly in Settings to scan labels.")
                    )
                } else {
                    scanner
                }
            }
            .navigationTitle("Scan Equipment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } }
            }
            .task {
                projects = OfflineStore.shared.cachedProjects(companyId: auth.companyId ?? "")
                    .filter { $0.status == "active" || $0.status == "in_progress" }
                    .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            }
        }
    }

    private var scanner: some View {
        ZStack(alignment: .bottom) {
            QRScannerView(
                onCode: { code in handle(code) },
                onUnavailable: { cameraUnavailable = true }
            )
            .ignoresSafeArea(edges: .bottom)

            VStack(spacing: 8) {
                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.white)
                        .padding(8)
                        .background(Color.brandDanger, in: RoundedRectangle(cornerRadius: 8))
                    Button("Scan Again") { viewModel.reset(); scanKey = UUID() }
                        .buttonStyle(.borderedProminent)
                } else {
                    Text("Point the camera at the equipment's QR label")
                        .font(.footnote.weight(.medium))
                        .foregroundStyle(.white)
                        .padding(8)
                        .background(Color.black.opacity(0.6), in: RoundedRectangle(cornerRadius: 8))
                }
            }
            .padding(.bottom, 32)
        }
        .id(scanKey)
    }

    /// Changing this recreates the camera view, which re-arms the one-shot reader.
    @State private var scanKey = UUID()

    private func handle(_ code: String) {
        let current = equipment.first { $0.id == EquipmentLabel.parse(code)?.equipmentId }
        guard viewModel.accept(code, companyId: auth.companyId, currentStatus: current?.displayStatus.rawValue) else { return }
        if let expected, viewModel.label?.equipmentId != expected.id {
            viewModel.reset()
            viewModel.errorMessage = "That label is for different equipment than \(expected.name)."
        }
    }

    private var actionForm: some View {
        @Bindable var vm = viewModel
        return Form {
            Section {
                VStack(alignment: .leading, spacing: 4) {
                    Text(scannedItem?.name ?? viewModel.label?.name ?? "Equipment")
                        .font(.headline)
                    if let item = scannedItem {
                        HStack {
                            StatusBadge(status: item.displayStatus.rawValue)
                            if let location = item.location, !location.isEmpty {
                                Text(location).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            Section("Action") {
                Picker("Action", selection: $vm.scanType) {
                    ForEach(EquipmentScanType.allCases, id: \.self) { Text($0.label).tag($0) }
                }
                if vm.scanType == .checkOut || vm.scanType == .locationUpdate {
                    Picker("Project", selection: $vm.projectId) {
                        Text("None").tag("")
                        ForEach(projects) { Text($0.name).tag($0.id) }
                    }
                }
                TextField("Where is it (e.g. north laydown yard)", text: $vm.locationDescription)
            }
            Section("Condition") {
                Picker("Condition", selection: $vm.condition) {
                    Text("Not rated").tag("")
                    ForEach(ScanCondition.allCases, id: \.rawValue) { Text($0.label).tag($0.rawValue) }
                }
                TextField("Hour meter", text: $vm.hours).keyboardType(.decimalPad)
                TextField("Fuel %", text: $vm.fuel).keyboardType(.numberPad)
                TextField("Notes", text: $vm.notes, axis: .vertical).lineLimit(1...4)
            }
            if let error = viewModel.errorMessage {
                Section { Text(error).foregroundStyle(Color.brandDanger) }
            }
            Section {
                Button("Scan a Different Label") {
                    viewModel.reset()
                    scanKey = UUID()
                }
                .disabled(viewModel.isSubmitting)
            }
            Section {
                Button {
                    Task { await viewModel.submit() }
                } label: {
                    HStack {
                        Spacer()
                        if viewModel.isSubmitting { ProgressView() } else { Text("Record \(vm.scanType.label)").fontWeight(.semibold) }
                        Spacer()
                    }
                }
                .disabled(viewModel.isSubmitting)
            }
        }
    }

    private func resultView(_ result: EquipmentScanResult) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 56))
                .foregroundStyle(Color.brandSuccess)
                .accessibilityHidden(true)
            Text(result.message ?? "Recorded.")
                .font(.headline)
                .multilineTextAlignment(.center)
            if let status = result.newStatus {
                StatusBadge(status: status)
            }
            HStack {
                Button("Scan Another") {
                    viewModel.reset()
                    scanKey = UUID()
                }
                .buttonStyle(.bordered)
                Button("Done") { dismiss() }
                    .buttonStyle(.borderedProminent)
            }
        }
        .padding()
    }
}
