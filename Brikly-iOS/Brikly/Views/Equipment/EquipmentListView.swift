import SwiftUI

/// Equipment tab: the company's fleet with status, plus QR scanning for
/// check-out / check-in in the field.
struct EquipmentListView: View {
    @Environment(AuthViewModel.self) private var auth
    @State private var viewModel = EquipmentListViewModel()
    @State private var showingScanner = false

    var body: some View {
        @Bindable var vm = viewModel

        NavigationStack {
            Group {
                if viewModel.isLoading {
                    LoadingView(message: "Loading equipment...")
                } else if let error = viewModel.errorMessage, viewModel.equipment.isEmpty {
                    ErrorView(message: error) { await reload() }
                } else if viewModel.equipment.isEmpty {
                    EmptyStateView(
                        icon: "wrench.and.screwdriver",
                        title: "No Equipment",
                        message: "Equipment added on the web shows up here for check-out and maintenance."
                    )
                } else {
                    VStack(spacing: 0) {
                        ChipFilterBar(
                            options: EquipmentStatus.allCases.map {
                                FilterOption(value: $0.rawValue, label: "\($0.label) \(viewModel.count($0))")
                            },
                            selected: $vm.statusFilter
                        )
                        List(viewModel.visible) { item in
                            NavigationLink {
                                EquipmentDetailView(equipment: item)
                            } label: {
                                EquipmentRowView(equipment: item)
                            }
                        }
                        .listStyle(.plain)
                        .refreshable { await reload() }
                    }
                    .searchable(text: $vm.search, prompt: "Name, type, serial, location")
                }
            }
            .navigationTitle("Equipment")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showingScanner = true } label: {
                        Label("Scan", systemImage: "qrcode.viewfinder")
                    }
                    .accessibilityLabel("Scan equipment label")
                }
            }
            .sheet(isPresented: $showingScanner, onDismiss: { Task { await reload() } }) {
                EquipmentScanSheet(equipment: viewModel.equipment)
            }
            .task { await reload() }
        }
    }

    private func reload() async {
        guard let companyId = auth.companyId else { return }
        await viewModel.load(companyId: companyId)
    }
}

struct EquipmentRowView: View {
    let equipment: Equipment

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline) {
                Text(equipment.name)
                    .font(.body.weight(.medium))
                    .lineLimit(1)
                Spacer()
                StatusBadge(status: equipment.displayStatus.rawValue)
            }
            HStack(spacing: 8) {
                Text(equipment.equipmentType.replacingOccurrences(of: "_", with: " ").capitalized)
                if let location = equipment.location, !location.isEmpty {
                    Label(location, systemImage: "mappin").lineLimit(1)
                }
                if equipment.isMaintenanceDue {
                    Text("Service due")
                        .fontWeight(.semibold)
                        .foregroundStyle(Color.brandWarning)
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
    }
}
