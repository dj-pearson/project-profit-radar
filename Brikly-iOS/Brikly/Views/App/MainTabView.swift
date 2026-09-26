import SwiftUI

/// Signed-in root: Home, Projects, Time Clock, Equipment, Alerts. Project-level work
/// (tasks, reports, RFIs, punch list...) lives under each project.
struct MainTabView: View {
    enum Tab: Hashable { case home, projects, clock, equipment, alerts }

    @Environment(AuthViewModel.self) private var auth
    @State private var selection: Tab = .home
    @State private var notifications = NotificationListViewModel()

    var body: some View {
        TabView(selection: $selection) {
            HomeView(openTimeClock: { selection = .clock })
                .tabItem { Label("Home", systemImage: "house.fill") }
                .tag(Tab.home)

            ProjectListView()
                .tabItem { Label("Projects", systemImage: "building.2.fill") }
                .tag(Tab.projects)

            TimeClockView()
                .tabItem { Label("Time Clock", systemImage: "clock.fill") }
                .tag(Tab.clock)

            EquipmentListView()
                .tabItem { Label("Equipment", systemImage: "wrench.and.screwdriver.fill") }
                .tag(Tab.equipment)

            NotificationListView(viewModel: notifications)
                .tabItem { Label("Alerts", systemImage: "bell.fill") }
                .badge(notifications.unreadCount)
                .tag(Tab.alerts)
        }
        .task(id: auth.userProfile?.id) { await loadAlerts() }
        .onChange(of: selection) {
            if selection == .alerts { Task { await loadAlerts() } }
        }
    }

    private func loadAlerts() async {
        guard let id = auth.userProfile?.id else { return }
        await notifications.load(recipientId: id)
    }
}
