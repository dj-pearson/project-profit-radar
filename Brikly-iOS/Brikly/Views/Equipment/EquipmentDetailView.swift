import SwiftUI

struct EquipmentDetailView: View {
    @Environment(AuthViewModel.self) private var auth
    @State private var viewModel: EquipmentDetailViewModel
    @State private var showingMaintenance = false
    @State private var showingAssign = false
    @State private var showingScanner = false

    init(equipment: Equipment) {
        _viewModel = State(initialValue: EquipmentDetailViewModel(equipment: equipment))
    }

    private var item: Equipment { viewModel.equipment }
    private var canLogMaintenance: Bool { EquipmentPermissions.maintenanceRoles.contains(auth.userRole) }
    private var canAssign: Bool { EquipmentPermissions.assignmentRoles.contains(auth.userRole) }

    /// Names from the cached project list (Home and Projects refresh it).
    private var projectNames: [String: String] {
        let projects = OfflineStore.shared.cachedProjects(companyId: auth.companyId ?? "")
        return Dictionary(projects.map { ($0.id, $0.name) }, uniquingKeysWith: { first, _ in first })
    }

    var body: some View {
        List {
            Section {
                LabeledContent("Status") { StatusBadge(status: item.displayStatus.rawValue) }
                LabeledContent("Type", value: item.equipmentType.replacingOccurrences(of: "_", with: " ").capitalized)
                if let model = item.model, !model.isEmpty { LabeledContent("Model", value: model) }
                if let serial = item.serialNumber, !serial.isEmpty { LabeledContent("Serial", value: serial) }
                if let location = item.location, !location.isEmpty { LabeledContent("Location", value: location) }
                LabeledContent("Last service", value: DateFormatting.displayDate(item.lastMaintenanceDate))
                LabeledContent("Next service") {
                    Text(DateFormatting.displayDate(item.nextMaintenanceDate))
                        .foregroundStyle(item.isMaintenanceDue ? Color.brandWarning : .primary)
                }
            }

            Section {
                Button { showingScanner = true } label: {
                    Label(item.displayStatus == .inUse ? "Scan to Check In" : "Scan to Check Out",
                          systemImage: "qrcode.viewfinder")
                }
            } footer: {
                Text("Scan the label on the equipment. The scan records who, where and when.")
            }

            labelSection

            Section {
                if viewModel.maintenance.isEmpty {
                    Text("No maintenance logged.").foregroundStyle(.secondary)
                } else {
                    ForEach(viewModel.maintenance) { record in
                        MaintenanceRowView(record: record)
                    }
                }
            } header: {
                HStack {
                    Text("Maintenance")
                    Spacer()
                    if canLogMaintenance {
                        Button("Log") { showingMaintenance = true }
                            .font(.subheadline)
                            .textCase(nil)
                    }
                }
            }

            Section {
                if viewModel.assignments.isEmpty {
                    Text("Not booked to a project.").foregroundStyle(.secondary)
                } else {
                    ForEach(viewModel.assignments) { assignment in
                        AssignmentRowView(assignment: assignment, projectName: projectNames[assignment.projectId])
                            .swipeActions(edge: .trailing) {
                                if canAssign && assignment.isOpen {
                                    Button("Return") { Task { await viewModel.returnAssignment(assignment) } }
                                        .tint(.green)
                                }
                            }
                    }
                }
            } header: {
                HStack {
                    Text("Project Bookings")
                    Spacer()
                    if canAssign {
                        Button("Assign") { showingAssign = true }
                            .font(.subheadline)
                            .textCase(nil)
                    }
                }
            }

            if let error = viewModel.errorMessage {
                Section { Text(error).foregroundStyle(Color.brandDanger) }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle(item.name)
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await viewModel.load() }
        .task { await viewModel.load() }
        .sheet(isPresented: $showingMaintenance) {
            MaintenanceFormView(equipment: item, userId: auth.userProfile?.id) { record in
                await viewModel.logMaintenance(record)
            }
        }
        .sheet(isPresented: $showingAssign) {
            AssignmentFormView(equipment: item, userId: auth.userProfile?.id) { assignment in
                await viewModel.assign(assignment)
            }
        }
        .sheet(isPresented: $showingScanner, onDismiss: { Task { await viewModel.load() } }) {
            EquipmentScanSheet(equipment: [item], expected: item)
        }
    }

    @ViewBuilder
    private var labelSection: some View {
        Section("QR Label") {
            if let value = viewModel.qrValue, let image = QRCodeRenderer.image(for: value) {
                HStack {
                    Spacer()
                    Image(uiImage: image)
                        .interpolation(.none)
                        .resizable()
                        .frame(width: 160, height: 160)
                        .accessibilityLabel("QR label for \(item.name)")
                    Spacer()
                }
                ShareLink(
                    item: Image(uiImage: image),
                    preview: SharePreview(item.name, image: Image(uiImage: image))
                ) {
                    Label("Share or Print Label", systemImage: "printer")
                }
            } else {
                Button {
                    Task { await viewModel.generateQR() }
                } label: {
                    if viewModel.isGeneratingQR {
                        ProgressView()
                    } else {
                        Label("Create Label", systemImage: "qrcode")
                    }
                }
                .disabled(viewModel.isGeneratingQR)
            }
        }
    }
}

private struct MaintenanceRowView: View {
    let record: MaintenanceRecord

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline) {
                Text(record.taskName).font(.body.weight(.medium)).lineLimit(2)
                Spacer()
                if let cost = record.totalCost, cost > 0 {
                    Text(CurrencyFormatter.format(cost)).font(.subheadline.monospacedDigit())
                }
            }
            HStack(spacing: 8) {
                Text(MaintenanceType(rawValue: record.maintenanceType)?.label ?? record.maintenanceType.capitalized)
                Text(record.isComplete ? DateFormatting.displayDate(record.actualCompletionDate) : "Open")
                if let wo = record.workOrderNumber { Text(wo).monospacedDigit() }
                if record.followUpRequired == true {
                    Text("Follow-up").fontWeight(.semibold).foregroundStyle(Color.brandWarning)
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .combine)
    }
}

private struct AssignmentRowView: View {
    let assignment: EquipmentAssignment
    let projectName: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(projectName ?? "Project").font(.body.weight(.medium)).lineLimit(1)
                Spacer()
                StatusBadge(status: assignment.assignmentStatus ?? "planned")
            }
            Text("\(DateFormatting.displayDate(assignment.startDate)) to \(DateFormatting.displayDate(assignment.actualEndDate ?? assignment.endDate))")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .combine)
    }
}
