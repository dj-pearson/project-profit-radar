import SwiftUI

@Observable
@MainActor
final class MaterialListViewModel {
    var materials: [Material] = []
    var usage: [MaterialUsage] = []
    var isLoading = false
    var errorMessage: String?
    var notice: String?
    var search = ""

    private let service = MaterialService()

    /// This project's own stock first, then company-wide stock.
    func visible(projectId: String) -> [Material] {
        let q = search.trimmingCharacters(in: .whitespaces).lowercased()
        let filtered = q.isEmpty ? materials : materials.filter {
            [$0.name, $0.materialCode, $0.category, $0.supplierName].compactMap { $0?.lowercased() }.contains { $0.contains(q) }
        }
        return filtered.filter { $0.projectId == projectId } + filtered.filter { $0.projectId != projectId }
    }

    func load(companyId: String, projectId: String) async {
        isLoading = materials.isEmpty
        errorMessage = nil
        defer { isLoading = false }
        do {
            materials = try await service.materials(companyId: companyId)
        } catch {
            errorMessage = DecodingErrorHelper.handle(error, context: "Materials")
        }
        let recent = try? await service.usage(projectId: projectId)
        if let recent { usage = recent }
    }

    func log(material: Material, projectId: String, quantity: Double, notes: String?) async -> Bool {
        guard NetworkMonitor.shared.isOnline else {
            errorMessage = "Logging usage needs a connection so stock stays right."
            return false
        }
        do {
            let result = try await service.logUsage(LogMaterialUsageParams(
                pMaterialId: material.id, pProjectId: projectId, pQuantity: quantity, pNotes: notes
            ))
            guard result.success else {
                errorMessage = result.error ?? "Usage wasn't recorded."
                return false
            }
            if let index = materials.firstIndex(where: { $0.id == material.id }) {
                materials[index].quantityAvailable = result.quantityAvailable
            }
            notice = "Logged \(Self.format(quantity)) \(material.unit) of \(material.name)."
            let recent = try? await service.usage(projectId: projectId)
            if let recent { usage = recent }
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    static func format(_ value: Double?) -> String {
        guard let value else { return "0" }
        return value.rounded() == value ? String(Int(value)) : String(format: "%.2f", value)
    }
}

struct MaterialListView: View {
    let projectId: String
    let companyId: String

    @State private var viewModel = MaterialListViewModel()
    @State private var logging: Material?

    var body: some View {
        @Bindable var vm = viewModel

        Group {
            if viewModel.isLoading {
                LoadingView(message: "Loading materials...")
            } else if let error = viewModel.errorMessage, viewModel.materials.isEmpty {
                ErrorView(message: error) { await reload() }
            } else if viewModel.materials.isEmpty {
                EmptyStateView(icon: "shippingbox", title: "No Materials", message: "Materials added on the web show up here to log usage against.")
            } else {
                List {
                    Section {
                        ForEach(viewModel.visible(projectId: projectId)) { material in
                            Button { logging = material } label: {
                                MaterialRowView(material: material, isProjectStock: material.projectId == projectId)
                            }
                            .buttonStyle(.plain)
                            .accessibilityHint("Log usage")
                        }
                    } header: {
                        Text("Stock")
                    } footer: {
                        Text("Tap a material to log what this project used. Stock drops as you log.")
                    }
                    if !viewModel.usage.isEmpty {
                        Section("Used on This Project") {
                            ForEach(viewModel.usage) { row in
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(row.materials?.name ?? "Material").font(.body.weight(.medium))
                                        Text(DateFormatting.displayDate(row.dateUsed)).font(.caption).foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    VStack(alignment: .trailing, spacing: 2) {
                                        Text(MaterialListViewModel.format(row.quantityUsed)).font(.body.monospacedDigit())
                                        Text(CurrencyFormatter.format(row.totalCost)).font(.caption.monospacedDigit()).foregroundStyle(.secondary)
                                    }
                                }
                                .accessibilityElement(children: .combine)
                            }
                        }
                    }
                }
                .listStyle(.insetGrouped)
                .searchable(text: $vm.search, prompt: "Name, code, supplier")
                .refreshable { await reload() }
            }
        }
        .safeAreaInset(edge: .bottom) {
            SaveNoticeView(notice: viewModel.notice, error: viewModel.materials.isEmpty ? nil : viewModel.errorMessage)
        }
        .navigationTitle("Materials")
        .sheet(item: $logging) { material in
            LogUsageSheet(material: material) { quantity, notes in
                await viewModel.log(material: material, projectId: projectId, quantity: quantity, notes: notes)
            }
        }
        .task { await reload() }
    }

    private func reload() async {
        await viewModel.load(companyId: companyId, projectId: projectId)
    }
}

private struct MaterialRowView: View {
    let material: Material
    let isProjectStock: Bool

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(material.name).font(.body.weight(.medium)).lineLimit(1)
                HStack(spacing: 8) {
                    if let code = material.materialCode, !code.isEmpty { Text(code).monospacedDigit() }
                    if let category = material.category, !category.isEmpty { Text(category.capitalized) }
                    if isProjectStock { Text("This project").fontWeight(.semibold) }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text("\(MaterialListViewModel.format(material.quantityAvailable)) \(material.unit)")
                    .font(.body.monospacedDigit())
                    .foregroundStyle(material.isLowStock ? Color.brandWarning : .primary)
                if material.isLowStock {
                    Text("Low stock").font(.caption.weight(.semibold)).foregroundStyle(Color.brandWarning)
                }
            }
        }
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }
}

private struct LogUsageSheet: View {
    let material: Material
    let onLog: (Double, String?) async -> Bool

    @Environment(\.dismiss) private var dismiss
    @State private var quantity = ""
    @State private var notes = ""
    @State private var isSaving = false
    @State private var failed = false

    private var value: Double? { NumberInput.double(quantity) }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    LabeledContent("In stock", value: "\(MaterialListViewModel.format(material.quantityAvailable)) \(material.unit)")
                    if let cost = material.unitCost {
                        LabeledContent("Unit cost", value: CurrencyFormatter.format(cost))
                    }
                }
                Section("Used") {
                    TextField("Quantity (\(material.unit))", text: $quantity).keyboardType(.decimalPad)
                    if let value, let cost = material.unitCost {
                        LabeledContent("Cost", value: CurrencyFormatter.format(value * cost))
                    }
                    TextField("Notes (where, what for)", text: $notes, axis: .vertical).lineLimit(1...4)
                }
                if failed {
                    Section { Text("Usage wasn't recorded. Check your connection and role.").foregroundStyle(Color.brandDanger) }
                }
            }
            .navigationTitle(material.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Log") {
                        Task {
                            guard let value else { return }
                            isSaving = true
                            let ok = await onLog(value, notes.isEmpty ? nil : notes)
                            isSaving = false
                            if ok { dismiss() } else { failed = true }
                        }
                    }
                    .disabled((value ?? 0) <= 0 || isSaving)
                }
            }
        }
    }
}
