import { useEffect, useState } from 'react';
import { assessDeviceCapabilities } from '@/utils/performanceConfig';

interface DeviceCapabilities {
  connectionType: string;
  effectiveType: string;
  downlink: number;
  deviceMemory: number;
  isLowEndDevice: boolean;
  isSaveDataEnabled: boolean;
}

export const useMobileOptimizations = () => {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    connectionType: 'unknown',
    effectiveType: 'unknown',
    downlink: 0,
    deviceMemory: 0,
    isLowEndDevice: false,
    isSaveDataEnabled: false
  });

  useEffect(() => {
    const deviceCaps = assessDeviceCapabilities();
    const saveDataEnabled = 'connection' in navigator && 
      (navigator as any).connection?.saveData === true;

    setCapabilities({
      ...deviceCaps,
      isSaveDataEnabled: saveDataEnabled
    });

    // Apply optimizations based on device capabilities
    applyMobileOptimizations(deviceCaps, saveDataEnabled);
  }, []);

  return capabilities;
};

const applyMobileOptimizations = (capabilities: any, saveDataEnabled: boolean) => {
  // Reduce animations for low-end devices
  if (capabilities.isLowEndDevice || saveDataEnabled) {
    document.documentElement.style.setProperty('--animation-duration', '0s');
    document.documentElement.classList.add('reduce-motion');
    console.log('📱 Reduced animations for low-end device');
  }

  // Adjust image quality based on connection
  if (capabilities.effectiveType === 'slow-2g' || capabilities.effectiveType === '2g') {
    document.documentElement.classList.add('low-bandwidth');
    console.log('📡 Low bandwidth mode activated');
  }

  // Disable non-essential features for data saver
  if (saveDataEnabled) {
    document.documentElement.classList.add('data-saver');
    console.log('💾 Data saver mode activated');
  }

  // Optimize touch interactions
  if ('ontouchstart' in window) {
    document.documentElement.classList.add('touch-device');
    
    // Reduce touch delay
    const style = document.createElement('style');
    style.textContent = `
      .touch-device * {
        touch-action: manipulation;
      }
      .touch-device button,
      .touch-device [role="button"] {
        cursor: pointer;
        -webkit-tap-highlight-color: rgba(255, 107, 0, 0.2);
      }
    `;
    document.head.appendChild(style);
    console.log('👆 Touch optimizations applied');
  }
};

// Component for adaptive content loading
export const AdaptiveContentLoader = ({ children, fallback, lowEndFallback }: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  lowEndFallback?: React.ReactNode;
}) => {
  const capabilities = useMobileOptimizations();
  const [shouldLoadContent, setShouldLoadContent] = useState(false);

  useEffect(() => {
    // Load content based on device capabilities
    if (capabilities.isLowEndDevice || capabilities.isSaveDataEnabled) {
      // Delay loading for low-end devices
      const timer = setTimeout(() => setShouldLoadContent(true), 1000);
      return () => clearTimeout(timer);
    } else {
      setShouldLoadContent(true);
    }
  }, [capabilities]);

  if (!shouldLoadContent) {
    if (capabilities.isLowEndDevice && lowEndFallback) {
      return <>{lowEndFallback}</>;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Hook for connection-aware loading
export const useConnectionAwareLoading = () => {
  const [connectionInfo, setConnectionInfo] = useState({
    isOnline: navigator.onLine,
    effectiveType: 'unknown',
    saveData: false,
    downlink: 0
  });

  useEffect(() => {
    const updateConnectionInfo = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        setConnectionInfo({
          isOnline: navigator.onLine,
          effectiveType: connection?.effectiveType || 'unknown',
          saveData: connection?.saveData || false,
          downlink: connection?.downlink || 0
        });
      } else {
        setConnectionInfo(prev => ({ ...prev, isOnline: navigator.onLine }));
      }
    };

    // Listen for connection changes
    window.addEventListener('online', updateConnectionInfo);
    window.addEventListener('offline', updateConnectionInfo);
    
    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener('change', updateConnectionInfo);
    }

    updateConnectionInfo();

    return () => {
      window.removeEventListener('online', updateConnectionInfo);
      window.removeEventListener('offline', updateConnectionInfo);
      
      if ('connection' in navigator) {
        (navigator as any).connection.removeEventListener('change', updateConnectionInfo);
      }
    };
  }, []);

  return connectionInfo;
};

// Performance-aware image loading strategy
export const usePerformanceAwareImageLoading = () => {
  const connection = useConnectionAwareLoading();
  
  const getImageLoadingStrategy = () => {
    if (!connection.isOnline) {
      return { format: 'placeholder', quality: 0 };
    }
    
    if (connection.saveData || connection.effectiveType === 'slow-2g') {
      return { format: 'webp', quality: 50 };
    }
    
    if (connection.effectiveType === '2g' || connection.effectiveType === '3g') {
      return { format: 'webp', quality: 70 };
    }
    
    return { format: 'avif', quality: 85 };
  };

  return getImageLoadingStrategy();
};

// Mobile-specific performance optimizations
export const MobilePerformanceProvider = ({ children }: { children: React.ReactNode }) => {
  const capabilities = useMobileOptimizations();

  useEffect(() => {
    // Add CSS custom properties for dynamic optimization
    const root = document.documentElement;
    
    if (capabilities.isLowEndDevice) {
      root.style.setProperty('--animation-duration', '0.1s');
      root.style.setProperty('--transition-duration', '0.1s');
      root.style.setProperty('--blur-intensity', '2px');
    } else {
      root.style.setProperty('--animation-duration', '0.3s');
      root.style.setProperty('--transition-duration', '0.2s');
      root.style.setProperty('--blur-intensity', '8px');
    }

    // Adjust rendering based on memory
    if (capabilities.deviceMemory < 2) {
      root.classList.add('low-memory');
      console.log('🧠 Low memory optimizations applied');
    }
  }, [capabilities]);

  return <>{children}</>;
};

export default {
  useMobileOptimizations,
  AdaptiveContentLoader,
  useConnectionAwareLoading,
  usePerformanceAwareImageLoading,
  MobilePerformanceProvider
};
