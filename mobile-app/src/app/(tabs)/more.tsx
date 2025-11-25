import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function MoreScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.email || 'User'}</Text>
        <TouchableOpacity style={styles.editProfile}>
          <Text style={styles.editProfileText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Financial */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Financial</Text>
        <MenuItem icon="cash" label="Invoices" color="#4A90E2" />
        <MenuItem icon="card" label="Payments" color="#66BB6A" />
        <MenuItem icon="receipt" label="Expenses" color="#FFA726" />
        <MenuItem icon="stats-chart" label="Reports" color="#AB47BC" />
      </View>

      {/* Operations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Operations</Text>
        <MenuItem icon="people" label="Team" color="#4A90E2" />
        <MenuItem icon="construct" label="Equipment" color="#66BB6A" />
        <MenuItem icon="cube" label="Inventory" color="#FFA726" />
        <MenuItem icon="document-text" label="Documents" color="#AB47BC" />
      </View>

      {/* Communication */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Communication</Text>
        <MenuItem icon="chatbubbles" label="Messages" color="#4A90E2" badge="3" />
        <MenuItem icon="mail" label="Email" color="#66BB6A" />
        <MenuItem icon="notifications" label="Notifications" color="#FFA726" badge="12" />
      </View>

      {/* Tools */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tools</Text>
        <MenuItem icon="calculator" label="Calculator" color="#4A90E2" />
        <MenuItem icon="calendar" label="Schedule" color="#66BB6A" />
        <MenuItem icon="cloud" label="Weather" color="#FFA726" />
        <MenuItem icon="map" label="Maps" color="#AB47BC" />
      </View>

      {/* Compliance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compliance & Safety</Text>
        <MenuItem icon="shield-checkmark" label="Safety" color="#4A90E2" />
        <MenuItem icon="document-attach" label="Compliance" color="#66BB6A" />
        <MenuItem icon="school" label="Training" color="#FFA726" />
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <MenuItem icon="person" label="Account" color="#4A90E2" />
        <MenuItem icon="settings" label="Preferences" color="#66BB6A" />
        <MenuItem icon="lock-closed" label="Security" color="#FFA726" />
        <MenuItem icon="help-circle" label="Help & Support" color="#AB47BC" />
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out" size={20} color="#EF5350" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Version Info */}
      <View style={styles.footer}>
        <Text style={styles.versionText}>BuildDesk v1.0.0</Text>
        <Text style={styles.copyrightText}>© 2024 BuildDesk. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
}

function MenuItem({ icon, label, color, badge }: { icon: string; label: string; color: string; badge?: string }) {
  return (
    <TouchableOpacity style={styles.menuItem}>
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={22} color={color} />
        </View>
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
      <View style={styles.menuItemRight}>
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  profileSection: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  editProfile: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  editProfileText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
  },
  section: {
    marginTop: 16,
    backgroundColor: '#ffffff',
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#EF5350',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: 8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF5350',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF5350',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    padding: 24,
  },
  versionText: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 11,
    color: '#999',
  },
});
