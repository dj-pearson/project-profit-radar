/**
 * Time Tracking Screen
 * Track work hours with GPS location support
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useAuth} from '../contexts/AuthContext';
import {supabase} from '../services/supabase';

export default function TimeTrackingScreen() {
  const {user, userProfile} = useAuth();
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [todayEntries, setTodayEntries] = useState([]);
  const [todayTotal, setTodayTotal] = useState(0);

  useEffect(() => {
    checkClockStatus();
    fetchTodayEntries();
  }, []);

  useEffect(() => {
    let interval;
    if (isClockedIn && currentEntry) {
      interval = setInterval(() => {
        const start = new Date(currentEntry.clock_in);
        const now = new Date();
        const elapsed = Math.floor((now - start) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isClockedIn, currentEntry]);

  const checkClockStatus = async () => {
    try {
      const {data, error} = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .is('clock_out', null)
        .order('clock_in', {ascending: false})
        .limit(1)
        .single();

      if (data) {
        setIsClockedIn(true);
        setCurrentEntry(data);
      }
    } catch (error) {
      // No active clock-in found
      console.log('No active time entry');
    }
  };

  const fetchTodayEntries = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const {data, error} = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', today)
        .order('clock_in', {ascending: false});

      if (error) throw error;

      setTodayEntries(data || []);
      const total = data?.reduce((sum, entry) => {
        if (entry.clock_in && entry.clock_out) {
          const duration = new Date(entry.clock_out) - new Date(entry.clock_in);
          return sum + duration / (1000 * 60 * 60); // Convert to hours
        }
        return sum;
      }, 0) || 0;
      setTodayTotal(total);
    } catch (error) {
      console.error('Error fetching today entries:', error);
    }
  };

  const handleClockIn = async () => {
    try {
      // TODO: Get GPS location
      const location = {latitude: 0, longitude: 0};

      const {data, error} = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          clock_in: new Date().toISOString(),
          date: new Date().toISOString().split('T')[0],
          location_in: JSON.stringify(location),
        })
        .select()
        .single();

      if (error) throw error;

      setIsClockedIn(true);
      setCurrentEntry(data);
      Alert.alert('Success', 'Clocked in successfully');
    } catch (error) {
      console.error('Error clocking in:', error);
      Alert.alert('Error', 'Failed to clock in');
    }
  };

  const handleClockOut = async () => {
    try {
      // TODO: Get GPS location
      const location = {latitude: 0, longitude: 0};

      const {error} = await supabase
        .from('time_entries')
        .update({
          clock_out: new Date().toISOString(),
          location_out: JSON.stringify(location),
        })
        .eq('id', currentEntry.id);

      if (error) throw error;

      setIsClockedIn(false);
      setCurrentEntry(null);
      setElapsedTime(0);
      fetchTodayEntries();
      Alert.alert('Success', 'Clocked out successfully');
    } catch (error) {
      console.error('Error clocking out:', error);
      Alert.alert('Error', 'Failed to clock out');
    }
  };

  const formatTime = seconds => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Time Tracking</Text>
        <Text style={styles.headerDate}>{new Date().toLocaleDateString()}</Text>
      </View>

      <View style={styles.clockCard}>
        <View style={styles.clockStatus}>
          <View style={[styles.statusDot, {backgroundColor: isClockedIn ? '#16a34a' : '#ef4444'}]} />
          <Text style={styles.statusText}>
            {isClockedIn ? 'Clocked In' : 'Clocked Out'}
          </Text>
        </View>

        <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>

        <TouchableOpacity
          style={[styles.clockButton, isClockedIn ? styles.clockOutButton : styles.clockInButton]}
          onPress={isClockedIn ? handleClockOut : handleClockIn}>
          <Icon name={isClockedIn ? 'alarm-off' : 'alarm-on'} size={32} color="#fff" />
          <Text style={styles.clockButtonText}>
            {isClockedIn ? 'Clock Out' : 'Clock In'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Today's Summary</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Icon name="access-time" size={32} color="#2563eb" />
            <Text style={styles.summaryValue}>{todayTotal.toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>Hours</Text>
          </View>
          <View style={styles.summaryItem}>
            <Icon name="event" size={32} color="#16a34a" />
            <Text style={styles.summaryValue}>{todayEntries.length}</Text>
            <Text style={styles.summaryLabel}>Entries</Text>
          </View>
        </View>
      </View>

      <View style={styles.entriesSection}>
        <Text style={styles.sectionTitle}>Today's Entries</Text>
        {todayEntries.map(entry => (
          <View key={entry.id} style={styles.entryCard}>
            <View style={styles.entryHeader}>
              <Icon name="access-time" size={20} color="#2563eb" />
              <Text style={styles.entryTime}>
                {new Date(entry.clock_in).toLocaleTimeString()} -{' '}
                {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString() : 'In Progress'}
              </Text>
            </View>
            {entry.clock_out && (
              <Text style={styles.entryDuration}>
                Duration: {((new Date(entry.clock_out) - new Date(entry.clock_in)) / (1000 * 60 * 60)).toFixed(2)} hours
              </Text>
            )}
            {entry.project_id && (
              <Text style={styles.entryProject}>Project: {entry.project_id}</Text>
            )}
          </View>
        ))}
        {todayEntries.length === 0 && (
          <Text style={styles.emptyText}>No entries for today</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  clockCard: {
    margin: 16,
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clockStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 16,
    fontVariant: ['tabular-nums'],
  },
  clockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  clockInButton: {
    backgroundColor: '#16a34a',
  },
  clockOutButton: {
    backgroundColor: '#ef4444',
  },
  clockButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  summaryCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  entriesSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  entryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryTime: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  entryDuration: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  entryProject: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    padding: 20,
  },
});
