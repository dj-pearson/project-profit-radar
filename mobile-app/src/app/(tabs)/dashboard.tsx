import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardScreen() {
  const { user } = useAuth();

  const stats = [
    { label: 'Active Projects', value: '12', icon: 'briefcase', color: '#4A90E2' },
    { label: 'Team Members', value: '24', icon: 'people', color: '#66BB6A' },
    { label: 'Hours Today', value: '156', icon: 'time', color: '#FFA726' },
    { label: 'This Month', value: '$124K', icon: 'cash', color: '#AB47BC' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back!</Text>
        <Text style={styles.userName}>{user?.email || 'User'}</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <View style={[styles.iconContainer, { backgroundColor: stat.color + '20' }]}>
              <Ionicons name={stat.icon as any} size={24} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <QuickAction icon="camera" label="Photo" color="#4A90E2" />
          <QuickAction icon="time" label="Clock In" color="#66BB6A" />
          <QuickAction icon="document-text" label="Report" color="#FFA726" />
          <QuickAction icon="add-circle" label="Expense" color="#AB47BC" />
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <ActivityItem
          title="New project created"
          subtitle="Residential Renovation - 123 Main St"
          time="2 hours ago"
          icon="briefcase"
        />
        <ActivityItem
          title="Time entry approved"
          subtitle="8 hours - Site work"
          time="5 hours ago"
          icon="checkmark-circle"
        />
        <ActivityItem
          title="Invoice sent"
          subtitle="Project #4521 - $12,500"
          time="1 day ago"
          icon="document-text"
        />
      </View>
    </ScrollView>
  );
}

function QuickAction({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <TouchableOpacity style={styles.quickAction}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={28} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function ActivityItem({ title, subtitle, time, icon }: { title: string; subtitle: string; time: string; icon: string }) {
  return (
    <View style={styles.activityItem}>
      <View style={styles.activityIcon}>
        <Ionicons name={icon as any} size={20} color="#4A90E2" />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{title}</Text>
        <Text style={styles.activitySubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.activityTime}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#4A90E2',
    padding: 24,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  activityItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#666',
  },
  activityTime: {
    fontSize: 11,
    color: '#999',
  },
});
