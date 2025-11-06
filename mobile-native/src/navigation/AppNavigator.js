/**
 * Main App Navigator
 * Handles routing between authenticated and unauthenticated screens
 */

import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ProjectsScreen from '../screens/ProjectsScreen';
import TimeTrackingScreen from '../screens/TimeTrackingScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Import auth hook
import {useAuth} from '../contexts/AuthContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Main app tabs (authenticated)
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = 'dashboard';
          } else if (route.name === 'Projects') {
            iconName = 'business';
          } else if (route.name === 'TimeTracking') {
            iconName = 'access-time';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
        headerStyle: {
          backgroundColor: '#2563eb',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{title: 'BuildDesk'}}
      />
      <Tab.Screen
        name="Projects"
        component={ProjectsScreen}
        options={{title: 'Projects'}}
      />
      <Tab.Screen
        name="TimeTracking"
        component={TimeTrackingScreen}
        options={{
          title: 'Time Tracking',
          tabBarLabel: 'Time',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{title: 'Profile'}}
      />
    </Tab.Navigator>
  );
}

// Root navigator
export default function AppNavigator() {
  const {session} = useAuth();

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {!session ? (
        // Auth screens
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        // Main app
        <Stack.Screen name="Main" component={MainTabs} />
      )}
    </Stack.Navigator>
  );
}
