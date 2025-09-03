/**
 * Performance Configuration for BuildDesk
 * Centralized configuration for all performance optimizations
 */

export interface PerformanceConfig {
  // Core Web Vitals thresholds
  coreWebVitals: {
    lcp: { good: number; poor: number }; // Largest Contentful Paint
    cls: { good: number; poor: number }; // Cumulative Layout Shift  
    fid: { good: number; poor: number }; // First Input Delay
    inp: { good: number; poor: number }; // Interaction to Next Paint
    ttfb: { good: number; poor: number }; // Time to First Byte
  };
  
  // Image optimization settings
  images: {
    enableWebP: boolean;
    enableAVIF: boolean;
    quality: number;
    enableLazyLoading: boolean;
    lazyLoadMargin: string;
    enableProgressiveLoading: boolean;
  };
  
  // Caching strategies
  caching: {
    enableServiceWorker: boolean;
    staticCacheDuration: number; // in seconds
    dynamicCacheDuration: number;
    apiCacheDuration: number;
    enableOfflineMode: boolean;
  };
  
  // Bundle optimization
  bundling: {
    enableCodeSplitting: boolean;
    chunkSizeWarning: number; // in KB
    enableTreeShaking: boolean;
    enableMinification: boolean;
  };
  
  // Monitoring and analytics
  monitoring: {
    enableRealUserMetrics: boolean;
    enableConsoleLogging: boolean;
    enableAnalyticsReporting: boolean;
    performanceEndpoint?: string;
  };
  
  // Mobile optimizations
  mobile: {
    enableTouchOptimizations: boolean;
    enableReducedMotion: boolean;
    adaptToConnectionSpeed: boolean;
    enableDataSaver: boolean;
  };
}

// Production configuration
export const productionConfig: PerformanceConfig = {
  coreWebVitals: {
    lcp: { good: 2500, poor: 4000 },
    cls: { good: 0.1, poor: 0.25 },
    fid: { good: 100, poor: 300 },
    inp: { good: 200, poor: 500 },
    ttfb: { good: 800, poor: 1800 }
  },
  images: {
    enableWebP: true,
    enableAVIF: true,
    quality: 85,
    enableLazyLoading: true,
    lazyLoadMargin: '100px',
    enableProgressiveLoading: true
  },
  caching: {
    enableServiceWorker: true,
    staticCacheDuration: 31536000, // 1 year
    dynamicCacheDuration: 86400,   // 1 day
    apiCacheDuration: 300,         // 5 minutes
    enableOfflineMode: true
  },
  bundling: {
    enableCodeSplitting: true,
    chunkSizeWarning: 500,
    enableTreeShaking: true,
    enableMinification: true
  },
  monitoring: {
    enableRealUserMetrics: true,
    enableConsoleLogging: false,
    enableAnalyticsReporting: true
  },
  mobile: {
    enableTouchOptimizations: true,
    enableReducedMotion: true,
    adaptToConnectionSpeed: true,
    enableDataSaver: true
  }
};

// Development configuration
export const developmentConfig: PerformanceConfig = {
  ...productionConfig,
  monitoring: {
    enableRealUserMetrics: true,
    enableConsoleLogging: true,
    enableAnalyticsReporting: false
  },
  caching: {
    ...productionConfig.caching,
    enableServiceWorker: false,
    staticCacheDuration: 0,
    dynamicCacheDuration: 0,
    apiCacheDuration: 0
  }
};

// Get configuration based on environment
export const getPerformanceConfig = (): PerformanceConfig => {
  return process.env.NODE_ENV === 'production' ? productionConfig : developmentConfig;
};

// Performance budget thresholds
export const performanceBudget = {
  // Bundle sizes (gzipped)
  totalBundleSize: 1000, // 1MB
  vendorBundleSize: 500,  // 500KB
  appBundleSize: 300,     // 300KB
  
  // Resource counts
  maxRequests: 50,
  maxImages: 20,
  maxFonts: 3,
  
  // Load time targets
  firstContentfulPaint: 1500,
  largestContentfulPaint: 2500,
  timeToInteractive: 3000,
  
  // Network efficiency
  maxResourceSize: 500, // 500KB per resource
  compressionRatio: 0.7, // 70% compression minimum
};

// Feature detection utilities
export const detectFeatures = () => {
  const features = {
    // Modern image formats
    webp: false,
    avif: false,
    
    // Performance APIs
    performanceObserver: 'PerformanceObserver' in window,
    intersectionObserver: 'IntersectionObserver' in window,
    
    // Network information
    networkInformation: 'connection' in navigator,
    
    // Storage APIs
    serviceWorker: 'serviceWorker' in navigator,
    indexedDB: 'indexedDB' in window,
    
    // Modern JavaScript features
    es2020: true, // Assume modern browsers
    webAssembly: 'WebAssembly' in window,
    
    // Device capabilities
    deviceMemory: 'deviceMemory' in navigator,
    hardwareConcurrency: 'hardwareConcurrency' in navigator
  };

  // Test image format support
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  features.webp = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  features.avif = canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;

  return features;
};

// Device capability assessment
export const assessDeviceCapabilities = () => {
  const capabilities = {
    connectionType: 'unknown',
    effectiveType: 'unknown',
    downlink: 0,
    deviceMemory: 0,
    hardwareConcurrency: 0,
    isLowEndDevice: false
  };

  // Network information
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    capabilities.connectionType = connection.type || 'unknown';
    capabilities.effectiveType = connection.effectiveType || 'unknown';
    capabilities.downlink = connection.downlink || 0;
  }

  // Device memory
  if ('deviceMemory' in navigator) {
    capabilities.deviceMemory = (navigator as any).deviceMemory || 0;
  }

  // CPU cores
  if ('hardwareConcurrency' in navigator) {
    capabilities.hardwareConcurrency = navigator.hardwareConcurrency || 0;
  }

  // Determine if low-end device
  capabilities.isLowEndDevice = 
    capabilities.deviceMemory <= 2 || 
    capabilities.hardwareConcurrency <= 2 ||
    capabilities.effectiveType === 'slow-2g' ||
    capabilities.effectiveType === '2g';

  return capabilities;
};

export default {
  getPerformanceConfig,
  performanceBudget,
  detectFeatures,
  assessDeviceCapabilities
};
