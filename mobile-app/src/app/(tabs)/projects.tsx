import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

export default function ProjectsScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  const projects = [
    {
      id: 1,
      name: 'Residential Renovation',
      address: '123 Main St',
      status: 'In Progress',
      progress: 65,
      statusColor: '#66BB6A',
    },
    {
      id: 2,
      name: 'Commercial Build',
      address: '456 Oak Ave',
      status: 'Planning',
      progress: 20,
      statusColor: '#FFA726',
    },
    {
      id: 3,
      name: 'Kitchen Remodel',
      address: '789 Pine Rd',
      status: 'In Progress',
      progress: 45,
      statusColor: '#66BB6A',
    },
    {
      id: 4,
      name: 'Office Expansion',
      address: '321 Elm St',
      status: 'On Hold',
      progress: 10,
      statusColor: '#EF5350',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search projects..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        <FilterChip label="All" active />
        <FilterChip label="Active" />
        <FilterChip label="Planning" />
        <FilterChip label="On Hold" />
        <FilterChip label="Completed" />
      </ScrollView>

      {/* Projects List */}
      <ScrollView style={styles.projectsList}>
        {projects.map((project) => (
          <TouchableOpacity key={project.id} style={styles.projectCard}>
            <View style={styles.projectHeader}>
              <View style={styles.projectInfo}>
                <Text style={styles.projectName}>{project.name}</Text>
                <View style={styles.addressContainer}>
                  <Ionicons name="location" size={14} color="#666" />
                  <Text style={styles.projectAddress}>{project.address}</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: project.statusColor + '20' }]}>
                <Text style={[styles.statusText, { color: project.statusColor }]}>
                  {project.status}
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${project.progress}%`, backgroundColor: project.statusColor },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{project.progress}%</Text>
            </View>

            {/* Quick Actions */}
            <View style={styles.projectActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="time" size={18} color="#4A90E2" />
                <Text style={styles.actionText}>Time</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="camera" size={18} color="#4A90E2" />
                <Text style={styles.actionText}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="document-text" size={18} color="#4A90E2" />
                <Text style={styles.actionText}>Report</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Add Project FAB */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

function FilterChip({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filters: {
    flexGrow: 0,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  projectsList: {
    flex: 1,
    padding: 16,
    paddingTop: 8,
  },
  projectCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectAddress: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  projectActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    color: '#4A90E2',
    marginLeft: 4,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
