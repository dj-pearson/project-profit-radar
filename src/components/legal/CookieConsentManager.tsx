import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Cookie, 
  Settings, 
  Shield, 
  BarChart3, 
  Target,
  CheckCircle2,
  XCircle,
  Eye
} from 'lucide-react';

interface CookieCategory {
  id: string;
  name: string;
  description: string;
  essential: boolean;
  enabled: boolean;
  cookies: CookieInfo[];
}

interface CookieInfo {
  name: string;
  purpose: string;
  duration: string;
  provider: string;
}

interface ConsentRecord {
  id: string;
  user_id?: string;
  session_id: string;
  consent_given: Record<string, boolean>;
  consent_date: string;
  ip_address: string;
  user_agent: string;
  consent_method: 'banner' | 'preferences' | 'api';
}

const CookieConsentManager = () => {
  const [cookieCategories, setCookieCategories] = useState<CookieCategory[]>([]);
  const [consentRecords, setConsentRecords] = useState<ConsentRecord[]>([]);
  const [showBanner, setShowBanner] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [currentConsent, setCurrentConsent] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCookieCategories();
    loadConsentRecords();
    checkConsentStatus();
  }, []);

  const loadCookieCategories = () => {
    const categories: CookieCategory[] = [
      {
        id: 'essential',
        name: 'Essential Cookies',
        description: 'These cookies are necessary for the website to function and cannot be switched off.',
        essential: true,
        enabled: true,
        cookies: [
          {
            name: '_session',
            purpose: 'Maintains user session and authentication state',
            duration: 'Session',
            provider: 'BuildDesk'
          },
          {
            name: '_csrf',
            purpose: 'Security token to prevent cross-site request forgery',
            duration: 'Session',
            provider: 'BuildDesk'
          }
        ]
      },
      {
        id: 'analytics',
        name: 'Analytics Cookies',
        description: 'These cookies help us understand how visitors interact with our website.',
        essential: false,
        enabled: false,
        cookies: [
          {
            name: '_ga',
            purpose: 'Google Analytics tracking cookie',
            duration: '2 years',
            provider: 'Google'
          },
          {
            name: '_ga_*',
            purpose: 'Google Analytics 4 measurement ID specific cookie',
            duration: '2 years',
            provider: 'Google'
          }
        ]
      },
      {
        id: 'marketing',
        name: 'Marketing Cookies',
        description: 'These cookies are used to track visitors across websites for marketing purposes.',
        essential: false,
        enabled: false,
        cookies: [
          {
            name: '_fbp',
            purpose: 'Facebook Pixel tracking cookie',
            duration: '3 months',
            provider: 'Facebook'
          },
          {
            name: 'ads_*',
            purpose: 'Advertising tracking and remarketing',
            duration: '1 year',
            provider: 'Various'
          }
        ]
      },
      {
        id: 'preferences',
        name: 'Preference Cookies',
        description: 'These cookies remember your choices and personalize your experience.',
        essential: false,
        enabled: false,
        cookies: [
          {
            name: 'theme',
            purpose: 'Remembers your preferred theme (light/dark)',
            duration: '1 year',
            provider: 'BuildDesk'
          },
          {
            name: 'language',
            purpose: 'Stores your language preference',
            duration: '1 year',
            provider: 'BuildDesk'
          }
        ]
      }
    ];

    setCookieCategories(categories);
    
    // Set initial consent state
    const initialConsent: Record<string, boolean> = {};
    categories.forEach(category => {
      initialConsent[category.id] = category.essential || category.enabled;
    });
    setCurrentConsent(initialConsent);
  };

  const loadConsentRecords = () => {
    // Mock consent records
    const records: ConsentRecord[] = [
      {
        id: '1',
        session_id: 'sess_abc123',
        consent_given: {
          essential: true,
          analytics: true,
          marketing: false,
          preferences: true
        },
        consent_date: new Date().toISOString(),
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        consent_method: 'banner'
      }
    ];
    setConsentRecords(records);
  };

  const checkConsentStatus = () => {
    // Check if user has already given consent
    const savedConsent = localStorage.getItem('cookie_consent');
    if (!savedConsent) {
      setShowBanner(true);
    } else {
      const consent = JSON.parse(savedConsent);
      setCurrentConsent(consent.preferences);
    }
  };

  const saveConsent = (method: 'banner' | 'preferences') => {
    const consentRecord: ConsentRecord = {
      id: Date.now().toString(),
      session_id: 'sess_' + Math.random().toString(36).substr(2, 9),
      consent_given: currentConsent,
      consent_date: new Date().toISOString(),
      ip_address: '192.168.1.100', // Would be actual IP in real implementation
      user_agent: navigator.userAgent,
      consent_method: method
    };

    // Save to localStorage (in real app, would send to backend)
    localStorage.setItem('cookie_consent', JSON.stringify({
      preferences: currentConsent,
      timestamp: new Date().toISOString()
    }));

    setConsentRecords(prev => [consentRecord, ...prev]);
    setShowBanner(false);
    setPreferencesOpen(false);

    // Apply cookie settings
    applyCookieSettings();
  };

  const applyCookieSettings = () => {
    // In real implementation, this would:
    // - Load/unload analytics scripts based on consent
    // - Set/remove marketing cookies
    // - Configure tracking tools
  };

  const acceptAll = () => {
    const allAccepted: Record<string, boolean> = {};
    cookieCategories.forEach(category => {
      allAccepted[category.id] = true;
    });
    setCurrentConsent(allAccepted);
    saveConsent('banner');
  };

  const acceptEssentialOnly = () => {
    const essentialOnly: Record<string, boolean> = {};
    cookieCategories.forEach(category => {
      essentialOnly[category.id] = category.essential;
    });
    setCurrentConsent(essentialOnly);
    saveConsent('banner');
  };

  const updateCategoryConsent = (categoryId: string, enabled: boolean) => {
    setCurrentConsent(prev => ({
      ...prev,
      [categoryId]: enabled
    }));
  };

  const getCategoryIcon = (categoryId: string) => {
    const icons = {
      essential: Shield,
      analytics: BarChart3,
      marketing: Target,
      preferences: Settings
    };
    return icons[categoryId as keyof typeof icons] || Cookie;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Cookie className="h-5 w-5" />
          <h2 className="text-2xl font-semibold">Cookie Consent Management</h2>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setPreferencesOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Cookie Preferences
          </Button>
          <Button onClick={() => setShowBanner(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview Banner
          </Button>
        </div>
      </div>

      {/* Cookie Categories Overview */}
      <div className="grid gap-4">
        {cookieCategories.map((category) => {
          const CategoryIcon = getCategoryIcon(category.id);
          const isEnabled = currentConsent[category.id];
          
          return (
            <Card key={category.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CategoryIcon className="h-5 w-5" />
                    <div>
                      <h4 className="font-medium flex items-center space-x-2">
                        <span>{category.name}</span>
                        {category.essential && (
                          <Badge variant="outline" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </h4>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {category.cookies.length} cookies
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isEnabled ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => updateCategoryConsent(category.id, checked)}
                      disabled={category.essential}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Consent Records */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Consent Records</CardTitle>
          <CardDescription>User consent history and preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {consentRecords.map((record) => (
              <div key={record.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{record.consent_method}</Badge>
                    <span className="text-sm font-medium">
                      {new Date(record.consent_date).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {record.session_id}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {Object.entries(record.consent_given).map(([category, granted]) => (
                    <div key={category} className="flex items-center space-x-1">
                      {granted ? (
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-600" />
                      )}
                      <span className="capitalize">{category}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cookie Banner */}
      {showBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-50 max-w-4xl mx-auto">
          <Card className="border-2 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-start space-x-4">
                <Cookie className="h-6 w-6 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">We use cookies</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    We use cookies to enhance your browsing experience, serve personalized content, 
                    and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={acceptAll}>
                      Accept All
                    </Button>
                    <Button variant="outline" onClick={acceptEssentialOnly}>
                      Essential Only
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setPreferencesOpen(true);
                      setShowBanner(false);
                    }}>
                      <Settings className="h-4 w-4 mr-2" />
                      Customize
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cookie Preferences Dialog */}
      <Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cookie Preferences</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Manage your cookie preferences. Essential cookies cannot be disabled as they are 
              required for the website to function properly.
            </p>
            
            {cookieCategories.map((category) => {
              const CategoryIcon = getCategoryIcon(category.id);
              const isEnabled = currentConsent[category.id];
              
              return (
                <div key={category.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CategoryIcon className="h-5 w-5" />
                      <div>
                        <h4 className="font-medium">{category.name}</h4>
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => updateCategoryConsent(category.id, checked)}
                      disabled={category.essential}
                    />
                  </div>
                  
                  <div className="ml-8 space-y-2">
                    {category.cookies.map((cookie, index) => (
                      <div key={index} className="p-2 bg-muted rounded text-xs">
                        <div className="font-medium">{cookie.name}</div>
                        <div className="text-muted-foreground">{cookie.purpose}</div>
                        <div className="flex justify-between mt-1">
                          <span>Duration: {cookie.duration}</span>
                          <span>Provider: {cookie.provider}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setPreferencesOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => saveConsent('preferences')}>
                Save Preferences
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CookieConsentManager;