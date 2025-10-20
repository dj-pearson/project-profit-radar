import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Link, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../src/contexts/AuthContext';

export default function HomeScreen() {
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/auth');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['#4A90E2', '#357ABD', '#2E6DA4']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={{ uri: 'https://ilhzuvemiuyfuxfegtlv.supabase.co/storage/v1/object/public/site-assets/BuildDeskLogo.png' }}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>BuildDesk</Text>
          <Text style={styles.subtitle}>Construction Management Made Simple</Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>📊</Text>
            <Text style={styles.featureTitle}>Project Tracking</Text>
            <Text style={styles.featureText}>Real-time project visibility and progress tracking</Text>
          </View>
          
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>💰</Text>
            <Text style={styles.featureTitle}>Job Costing</Text>
            <Text style={styles.featureText}>Track costs and maintain profitable margins</Text>
          </View>
          
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>📱</Text>
            <Text style={styles.featureTitle}>Mobile Field Management</Text>
            <Text style={styles.featureText}>Manage projects from anywhere, anytime</Text>
          </View>
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
            <Text style={styles.buttonText}>
              {user ? 'Go to Dashboard' : 'Get Started'}
            </Text>
          </TouchableOpacity>
          
          {!user && (
            <Link href="/auth" style={styles.link}>
              <Text style={styles.linkText}>Already have an account? Sign In</Text>
            </Link>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#E8F4FD',
    textAlign: 'center',
  },
  features: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
  },
  feature: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featureText: {
    fontSize: 14,
    color: '#E8F4FD',
    textAlign: 'center',
    lineHeight: 20,
  },
  cta: {
    alignItems: 'center',
    gap: 16,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#4A90E2',
    fontSize: 18,
    fontWeight: '600',
  },
  link: {
    padding: 8,
  },
  linkText: {
    color: '#E8F4FD',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
