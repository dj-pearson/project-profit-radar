import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../src/contexts/AuthContext';
import { PlatformProvider } from '../src/contexts/PlatformContext';
import { MobileThemeProvider } from '../src/mobile/contexts/MobileThemeContext';
import { MobileNavigationProvider } from '../src/mobile/contexts/MobileNavigationContext';
import GlobalErrorBoundary from '../src/components/GlobalErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

export default function RootLayout() {
  return (
    <GlobalErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <PlatformProvider>
              <MobileThemeProvider>
                <MobileNavigationProvider>
              <Stack
                screenOptions={{
                  headerStyle: {
                    backgroundColor: '#4A90E2',
                  },
                  headerTintColor: '#fff',
                  headerTitleStyle: {
                    fontWeight: 'bold',
                  },
                }}
              >
                <Stack.Screen 
                  name="index" 
                  options={{ 
                    title: 'BuildDesk',
                    headerShown: false 
                  }} 
                />
                <Stack.Screen 
                  name="dashboard" 
                  options={{ 
                    title: 'Dashboard' 
                  }} 
                />
                <Stack.Screen 
                  name="projects" 
                  options={{ 
                    title: 'Projects' 
                  }} 
                />
                <Stack.Screen 
                  name="field" 
                  options={{ 
                    title: 'Field Management' 
                  }} 
                />
                <Stack.Screen 
                  name="auth" 
                  options={{ 
                    title: 'Sign In',
                    headerShown: false 
                  }} 
                />
                </Stack>
                <StatusBar style="auto" />
                </MobileNavigationProvider>
              </MobileThemeProvider>
            </PlatformProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GlobalErrorBoundary>
  );
}
