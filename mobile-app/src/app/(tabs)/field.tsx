import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function FieldScreen() {
  return (
    <ScrollView style={styles.container}>
      {/* Quick Capture Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Capture</Text>
        <View style={styles.captureGrid}>
          <CaptureButton icon="camera" label="Photo" color="#4A90E2" />
          <CaptureButton icon="videocam" label="Video" color="#66BB6A" />
          <CaptureButton icon="mic" label="Voice Note" color="#FFA726" />
          <CaptureButton icon="scan" label="QR Code" color="#AB47BC" />
        </View>
      </View>

      {/* Daily Report */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily Report</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <Ionicons name="document-text" size={24} color="#4A90E2" />
            <View style={styles.reportInfo}>
              <Text style={styles.reportTitle}>Today's Report</Text>
              <Text style={styles.reportSubtitle}>Not submitted</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
          <View style={styles.reportStats}>
            <ReportStat label="Workers" value="12" />
            <ReportStat label="Hours" value="96" />
            <ReportStat label="Tasks" value="8" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Equipment & Materials */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Equipment & Materials</Text>
        <TouchableOpacity style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.cardIcon}>
              <Ionicons name="construct" size={24} color="#4A90E2" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Equipment Checkout</Text>
              <Text style={styles.cardSubtitle}>Scan QR codes to track equipment</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.cardIcon}>
              <Ionicons name="cube" size={24} color="#66BB6A" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Material Request</Text>
              <Text style={styles.cardSubtitle}>Request materials for job site</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Safety & Compliance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Safety & Compliance</Text>
        <TouchableOpacity style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.cardIcon}>
              <Ionicons name="shield-checkmark" size={24} color="#FFA726" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Safety Inspection</Text>
              <Text style={styles.cardSubtitle}>Conduct site safety check</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.cardIcon}>
              <Ionicons name="warning" size={24} color="#EF5350" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Report Incident</Text>
              <Text style={styles.cardSubtitle}>Document safety incidents</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Weather & Conditions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Site Conditions</Text>
        <View style={styles.weatherCard}>
          <View style={styles.weatherMain}>
            <Ionicons name="sunny" size={48} color="#FFA726" />
            <View style={styles.weatherInfo}>
              <Text style={styles.temperature}>72°F</Text>
              <Text style={styles.weatherDesc}>Partly Cloudy</Text>
            </View>
          </View>
          <View style={styles.weatherDetails}>
            <WeatherDetail icon="water" label="Humidity" value="65%" />
            <WeatherDetail icon="speedometer" label="Wind" value="8 mph" />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function CaptureButton({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <TouchableOpacity style={styles.captureButton}>
      <View style={[styles.captureIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={32} color={color} />
      </View>
      <Text style={styles.captureLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reportStat}>
      <Text style={styles.reportStatValue}>{value}</Text>
      <Text style={styles.reportStatLabel}>{label}</Text>
    </View>
  );
}

function WeatherDetail({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.weatherDetail}>
      <Ionicons name={icon as any} size={16} color="#666" />
      <Text style={styles.weatherDetailLabel}>{label}</Text>
      <Text style={styles.weatherDetailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  section: {
    padding: 16,
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
  captureGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  captureButton: {
    alignItems: 'center',
    flex: 1,
  },
  captureIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  captureLabel: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportInfo: {
    flex: 1,
    marginLeft: 12,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  reportSubtitle: {
    fontSize: 14,
    color: '#FFA726',
  },
  reportStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  reportStat: {
    alignItems: 'center',
  },
  reportStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  reportStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  card: {
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
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  weatherCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weatherMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  weatherInfo: {
    marginLeft: 16,
  },
  temperature: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  weatherDesc: {
    fontSize: 16,
    color: '#666',
  },
  weatherDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  weatherDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherDetailLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    marginRight: 8,
  },
  weatherDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});
