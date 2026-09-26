import SwiftUI

struct TimeClockView: View {
    @Environment(AuthViewModel.self) private var auth
    @Environment(\.openURL) private var openURL
    @State private var viewModel = TimeClockViewModel()
    @State private var crew = CrewCheckInViewModel()

    var body: some View {
        @Bindable var vm = viewModel

        NavigationStack {
            Group {
                if viewModel.isLoading {
                    LoadingView(message: "Loading time clock...")
                } else if let error = viewModel.errorMessage, viewModel.projects.isEmpty {
                    ErrorView(message: error) { await reload() }
                } else {
                    Form {
                        statusSection

                        CrewCheckInSection(
                            viewModel: crew,
                            projectName: { viewModel.project(for: $0)?.name ?? "Assigned project" },
                            userId: auth.userProfile?.id ?? "",
                            onVerified: { projectId in
                                // Line the clock up with the site just checked into.
                                if !viewModel.isClockedIn, viewModel.project(for: projectId) != nil {
                                    viewModel.selectedProjectId = projectId
                                }
                            }
                        )

                        if !viewModel.isClockedIn {
                            Section("Job") {
                                Picker("Project", selection: $vm.selectedProjectId) {
                                    Text("Select...").tag("")
                                    ForEach(viewModel.projects) { project in
                                        Text(project.name).tag(project.id)
                                    }
                                }
                                Picker("Cost Code", selection: $vm.selectedCostCodeId) {
                                    Text("Select...").tag("")
                                    ForEach(viewModel.costCodes) { code in
                                        Text(code.displayName).tag(code.id)
                                    }
                                }
                                .disabled(viewModel.selectedProjectId.isEmpty)
                            }
                        }

                        actionSection

                        if let error = viewModel.errorMessage {
                            Section {
                                Label(error, systemImage: "exclamationmark.triangle.fill")
                                    .foregroundStyle(Color.brandDanger)
                                if LocationService.shared.isDenied {
                                    Button("Open Settings") {
                                        if let url = URL(string: UIApplication.openSettingsURLString) {
                                            openURL(url)
                                        }
                                    }
                                }
                            }
                        }
                        if let notice = viewModel.notice {
                            Section {
                                Label(notice, systemImage: "icloud.and.arrow.up")
                                    .foregroundStyle(.secondary)
                            }
                        }

                        recentSection
                    }
                    .refreshable { await reload() }
                }
            }
            .navigationTitle("Time Clock")
            .task { await reload() }
            .onChange(of: viewModel.selectedProjectId) {
                guard !viewModel.isRestoring else { return }
                Task { await viewModel.loadCostCodes(companyId: auth.companyId ?? "") }
            }
        }
    }

    // MARK: - Sections

    private var statusSection: some View {
        Section {
            TimelineView(.periodic(from: .now, by: 1)) { context in
                VStack(alignment: .leading, spacing: 6) {
                    if let shift = viewModel.shift {
                        Text(viewModel.isOnBreak ? "On break" : "Clocked in")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(viewModel.isOnBreak ? Color.brandWarning : Color.brandSuccess)
                        Text(Self.duration(viewModel.currentShiftHours(now: context.date)))
                            .font(.system(size: 44, weight: .semibold).monospacedDigit())
                        Text(shiftCaption(shift))
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    } else {
                        Text("Not clocked in")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.secondary)
                    }
                    Text("This week: \(Self.hours(viewModel.weekHours(now: context.date)))")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.vertical, 4)
                .accessibilityElement(children: .combine)
            }
        }
    }

    @ViewBuilder
    private var actionSection: some View {
        Section {
            if viewModel.isClockedIn {
                Button {
                    Task { await viewModel.toggleBreak() }
                } label: {
                    Label(viewModel.isOnBreak ? "End Break" : "Start Break",
                          systemImage: viewModel.isOnBreak ? "play.fill" : "cup.and.saucer.fill")
                }
                .disabled(viewModel.isWorking)

                Button(role: .destructive) {
                    Task { await viewModel.clockOut(userId: auth.userProfile?.id ?? "") }
                } label: {
                    actionLabel("Clock Out", icon: "stop.circle.fill")
                }
                .disabled(viewModel.isWorking)
            } else {
                Button {
                    Task { await viewModel.clockIn(userId: auth.userProfile?.id ?? "", fallbackSiteId: auth.siteId) }
                } label: {
                    actionLabel("Clock In", icon: "play.circle.fill")
                }
                .disabled(viewModel.isWorking
                          || viewModel.selectedProjectId.isEmpty
                          || viewModel.selectedCostCodeId.isEmpty)
            }
        } footer: {
            if !viewModel.isClockedIn {
                Text("Clocking in checks your location against the job site.")
            }
        }
    }

    private func actionLabel(_ title: String, icon: String) -> some View {
        HStack {
            if viewModel.isWorking {
                ProgressView()
            } else {
                Image(systemName: icon)
            }
            Text(title).fontWeight(.semibold)
        }
    }

    @ViewBuilder
    private var recentSection: some View {
        let closed = viewModel.recentEntries.filter { !$0.isOpen }
        if !closed.isEmpty {
            Section("Recent Entries") {
                ForEach(closed) { entry in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(viewModel.project(for: entry.projectId)?.name ?? "Project")
                                .font(.body.weight(.medium))
                                .lineLimit(1)
                            Spacer()
                            Text(Self.hours(entry.workedHours()))
                                .font(.body.monospacedDigit())
                        }
                        HStack(spacing: 8) {
                            Text(entry.startTime.formatted(date: .abbreviated, time: .shortened))
                            if let status = entry.approvalStatus {
                                StatusBadge(status: status)
                            }
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }
                    .accessibilityElement(children: .combine)
                }
            }
        }
    }

    // MARK: - Helpers

    private func shiftCaption(_ shift: TimeClockViewModel.Shift) -> String {
        var parts = [viewModel.project(for: shift.projectId)?.name ?? "Project"]
        if let code = viewModel.costCode(for: shift.costCodeId) { parts.append(code.displayName) }
        parts.append("since \(shift.start.formatted(date: .omitted, time: .shortened))")
        if viewModel.isShiftLocalOnly { parts.append("not synced yet") }
        return parts.joined(separator: " · ")
    }

    private func reload() async {
        guard let userId = auth.userProfile?.id, let companyId = auth.companyId else { return }
        async let clock: Void = viewModel.load(userId: userId, companyId: companyId)
        async let assignments: Void = crew.load(userId: userId)
        _ = await (clock, assignments)
    }

    static func duration(_ hours: Double) -> String {
        let seconds = Int(hours * 3600)
        return String(format: "%d:%02d:%02d", seconds / 3600, (seconds % 3600) / 60, seconds % 60)
    }

    static func hours(_ hours: Double) -> String {
        String(format: "%.2f h", hours)
    }
}
