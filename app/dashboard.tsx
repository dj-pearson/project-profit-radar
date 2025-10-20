import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../src/contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { user, userProfile } = useAuth();

  const dashboardItems = [
    {
      title: 'Projects',
      description: 'Manage your construction projects',
      icon: '🏗️',
      route: '/projects',
      color: '#4A90E2',
    },
    {
      title: 'Field Management',
      description: 'Mobile field operations',
      icon: '📱',
      route: '/field',
      color: '#10B981',
    },
    {
      title: 'Job Costing',
      description: 'Track project costs and profitability',
      icon: '💰',
      route: '/job-costing',
      color: '#F59E0B',
    },
    {
      title: 'Daily Reports',
      description: 'Create and manage daily reports',
      icon: '📋',
      route: '/daily-reports',
      color: '#8B5CF6',
    },
    {
      title: 'Materials',
      description: 'Manage materials and inventory',
      icon: '📦',
      route: '/materials',
      color: '#EF4444',
    },
    {
      title: 'Team',
      description: 'Manage your team and crew',
      icon: '👥',
      route: '/team',
      color: '#06B6D4',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Welcome back, {userProfile?.full_name || user?.email}!
        </Text>
        <Text style={styles.subtitle}>
          Here's what's happening with your projects today
        </Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Active Projects</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>$2.4M</Text>
          <Text style={styles.statLabel}>Total Value</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>94%</Text>
          <Text style={styles.statLabel}>On Schedule</Text>
        </View>
      </View>

      {/* Dashboard Grid */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {dashboardItems.map((item, index) => (
            <Link key={index} href={item.route} asChild>
              <TouchableOpacity style={[styles.card, { borderLeftColor: item.color }]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>{item.icon}</Text>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                </View>
                <Text style={styles.cardDescription}>{item.description}</Text>
              </TouchableOpacity>
            </Link>
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <Text style={styles.activityTitle}>Project Update</Text>
            <Text style={styles.activityDescription}>
              Downtown Office Building - Phase 2 completed
            </Text>
            <Text style={styles.activityTime}>2 hours ago</Text>
          </View>
          <View style={styles.activityCard}>
            <Text style={styles.activityTitle}>New Material Order</Text>
            <Text style={styles.activityDescription}>
              Steel beams ordered for Residential Complex
            </Text>
            <Text style={styles.activityTime}>5 hours ago</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  grid: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  activityTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
