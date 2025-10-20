import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Camera from 'expo-camera';
import * as Location from 'expo-location';
import { useAuth } from '../src/contexts/AuthContext';

export default function FieldScreen() {
  const { userProfile } = useAuth();
  const [hasPermissions, setHasPermissions] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);

  useEffect(() => {
    requestPermissions();
    getCurrentLocation();
  }, []);

  const requestPermissions = async () => {
    const cameraPermission = await Camera.requestCameraPermissionsAsync();
    const locationPermission = await Location.requestForegroundPermissionsAsync();
    
    if (cameraPermission.status === 'granted' && locationPermission.status === 'granted') {
      setHasPermissions(true);
    } else {
      Alert.alert(
        'Permissions Required',
        'Camera and location permissions are required for field management features.'
      );
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const takePhoto = async () => {
    if (!hasPermissions) {
      Alert.alert('Error', 'Camera permission not granted');
      return;
    }
    setShowCamera(true);
  };

  const addNote = () => {
    setShowNoteModal(true);
  };

  const saveNote = () => {
    if (notes.trim()) {
      Alert.alert('Note Saved', 'Your field note has been saved successfully.');
      setNotes('');
      setShowNoteModal(false);
    }
  };

  const quickActions = [
    {
      title: 'Take Photo',
      icon: '📷',
      action: takePhoto,
      color: '#4A90E2',
    },
    {
      title: 'Add Note',
      icon: '📝',
      action: addNote,
      color: '#10B981',
    },
    {
      title: 'Check In',
      icon: '📍',
      action: getCurrentLocation,
      color: '#F59E0B',
    },
    {
      title: 'Safety Report',
      icon: '⚠️',
      action: () => Alert.alert('Coming Soon', 'Safety reporting feature coming soon!'),
      color: '#EF4444',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Field Management</Text>
        <Text style={styles.subtitle}>
          Welcome to the field, {userProfile?.full_name}
        </Text>
      </View>

      {/* Location Info */}
      {location && (
        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>📍 Current Location</Text>
          <Text style={styles.locationText}>
            Lat: {location.coords.latitude.toFixed(6)}
          </Text>
          <Text style={styles.locationText}>
            Lng: {location.coords.longitude.toFixed(6)}
          </Text>
          <Text style={styles.locationTime}>
            Updated: {new Date().toLocaleTimeString()}
          </Text>
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.actionCard, { borderLeftColor: action.color }]}
                onPress={action.action}
              >
                <Text style={styles.actionIcon}>{action.icon}</Text>
                <Text style={styles.actionTitle}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Photos */}
        {photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {photos.map((photo, index) => (
                <Image key={index} source={{ uri: photo }} style={styles.photoThumbnail} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Today's Tasks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Tasks</Text>
          <View style={styles.taskCard}>
            <Text style={styles.taskTitle}>Foundation Inspection</Text>
            <Text style={styles.taskDescription}>
              Inspect foundation pour for Building A
            </Text>
            <Text style={styles.taskTime}>Due: 2:00 PM</Text>
          </View>
          <View style={styles.taskCard}>
            <Text style={styles.taskTitle}>Material Delivery</Text>
            <Text style={styles.taskDescription}>
              Receive steel beam delivery
            </Text>
            <Text style={styles.taskTime}>Due: 4:00 PM</Text>
          </View>
        </View>

        {/* Weather Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weather Conditions</Text>
          <View style={styles.weatherCard}>
            <Text style={styles.weatherIcon}>☀️</Text>
            <View style={styles.weatherInfo}>
              <Text style={styles.weatherTemp}>72°F</Text>
              <Text style={styles.weatherDesc}>Sunny, Light Winds</Text>
              <Text style={styles.weatherDetail}>Perfect conditions for concrete work</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Note Modal */}
      <Modal
        visible={showNoteModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNoteModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Field Note</Text>
            <TouchableOpacity onPress={saveNote}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.noteInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Enter your field notes here..."
            multiline
            textAlignVertical="top"
          />
        </View>
      </Modal>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  locationTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    width: '47%',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    textAlign: 'center',
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  taskTime: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  weatherCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  weatherIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  weatherInfo: {
    flex: 1,
  },
  weatherTemp: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  weatherDesc: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  weatherDetail: {
    fontSize: 14,
    color: '#10B981',
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCancel: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalSave: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
  },
  noteInput: {
    flex: 1,
    padding: 20,
    fontSize: 16,
    color: '#1F2937',
  },
});
