import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TimeScreen() {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState('0:00:00');

  return (
    <ScrollView style={styles.container}>
      {/* Clock In/Out Card */}
      <View style={styles.clockCard}>
        <View style={styles.clockHeader}>
          <Ionicons name="time" size={32} color="#4A90E2" />
          <View style={styles.clockStatus}>
            <Text style={styles.statusLabel}>Status</Text>
            <Text style={[styles.statusText, isClockedIn && styles.statusActive]}>
              {isClockedIn ? 'Clocked In' : 'Clocked Out'}
            </Text>
          </View>
        </View>

        {isClockedIn && (
          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>Time Elapsed</Text>
            <Text style={styles.timerText}>{currentTime}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.clockButton, isClockedIn && styles.clockButtonActive]}
          onPress={() => setIsClockedIn(!isClockedIn)}
        >
          <Ionicons
            name={isClockedIn ? 'log-out' : 'log-in'}
            size={24}
            color="#ffffff"
          />
          <Text style={styles.clockButtonText}>
            {isClockedIn ? 'Clock Out' : 'Clock In'}
          </Text>
        </TouchableOpacity>

        {/* Location Info */}
        <View style={styles.locationInfo}>
          <Ionicons name="location" size={16} color="#666" />
          <Text style={styles.locationText}>Job Site - 123 Main St</Text>
        </View>
      </View>

      {/* Today's Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Summary</Text>
        <View style={styles.summaryCard}>
          <SummaryStat label="Hours Worked" value="7.5" icon="time" color="#4A90E2" />
          <SummaryStat label="Breaks" value="2" icon="cafe" color="#66BB6A" />
          <SummaryStat label="Projects" value="3" icon="briefcase" color="#FFA726" />
        </View>
      </View>

      {/* Recent Entries */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Entries</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        <TimeEntry
          project="Residential Renovation"
          hours="4.5"
          date="Today"
          status="pending"
        />
        <TimeEntry
          project="Commercial Build"
          hours="3.0"
          date="Today"
          status="pending"
        />
        <TimeEntry
          project="Kitchen Remodel"
          hours="8.0"
          date="Yesterday"
          status="approved"
        />
        <TimeEntry
          project="Office Expansion"
          hours="6.5"
          date="Dec 18"
          status="approved"
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <ActionCard
            icon="add-circle"
            label="Manual Entry"
            color="#4A90E2"
          />
          <ActionCard
            icon="calendar"
            label="Timesheet"
            color="#66BB6A"
          />
        </View>
      </View>
    </ScrollView>
  );
}

function SummaryStat({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <View style={styles.summaryStat}>
      <View style={[styles.summaryIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function TimeEntry({ project, hours, date, status }: { project: string; hours: string; date: string; status: string }) {
  const statusColor = status === 'approved' ? '#66BB6A' : '#FFA726';
  const statusIcon = status === 'approved' ? 'checkmark-circle' : 'time';

  return (
    <TouchableOpacity style={styles.timeEntry}>
      <View style={styles.entryMain}>
        <View style={styles.entryInfo}>
          <Text style={styles.entryProject}>{project}</Text>
          <View style={styles.entryDetails}>
            <Ionicons name="calendar" size={14} color="#666" />
            <Text style={styles.entryDate}>{date}</Text>
            <Text style={styles.entryHours}>{hours} hrs</Text>
          </View>
        </View>
        <View style={[styles.entryStatus, { backgroundColor: statusColor + '20' }]}>
          <Ionicons name={statusIcon as any} size={16} color={statusColor} />
          <Text style={[styles.entryStatusText, { color: statusColor }]}>
            {status === 'approved' ? 'Approved' : 'Pending'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ActionCard({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <TouchableOpacity style={styles.actionCard}>
      <View style={[styles.actionIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={32} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  clockCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  clockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  clockStatus: {
    marginLeft: 16,
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EF5350',
  },
  statusActive: {
    color: '#66BB6A',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  timerText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4A90E2',
    fontVariant: ['tabular-nums'],
  },
  clockButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  clockButtonActive: {
    backgroundColor: '#EF5350',
  },
  clockButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  section: {
    padding: 16,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  viewAll: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  timeEntry: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  entryMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryInfo: {
    flex: 1,
  },
  entryProject: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  entryDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryDate: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
    marginRight: 12,
  },
  entryHours: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  entryStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  entryStatusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
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
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
});
