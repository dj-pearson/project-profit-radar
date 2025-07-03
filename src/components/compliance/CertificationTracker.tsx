import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  Bell,
  Upload,
  Eye
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Certification {
  id: string;
  employee_name: string;
  certification_type: string;
  issue_date: string;
  expiry_date: string;
  status: 'valid' | 'expiring' | 'expired';
  file_url?: string;
}

const CertificationTracker = () => {
  const { userProfile } = useAuth();
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [alerts, setAlerts] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile?.company_id) {
      loadCertifications();
    }
  }, [userProfile?.company_id]);

  const loadCertifications = async () => {
    try {
      // Simulate loading certifications data
      const mockCertifications: Certification[] = [
        {
          id: '1',
          employee_name: 'John Smith',
          certification_type: 'OSHA 30-Hour Construction',
          issue_date: '2023-01-15',
          expiry_date: '2025-01-15',
          status: 'valid'
        },
        {
          id: '2',
          employee_name: 'Sarah Johnson',
          certification_type: 'First Aid/CPR',
          issue_date: '2023-06-01',
          expiry_date: '2024-12-31',
          status: 'expiring'
        },
        {
          id: '3',
          employee_name: 'Mike Wilson',
          certification_type: 'Crane Operator License',
          issue_date: '2022-03-10',
          expiry_date: '2024-03-10',
          status: 'expired'
        },
        {
          id: '4',
          employee_name: 'Lisa Brown',
          certification_type: 'Hazmat Handling',
          issue_date: '2023-09-15',
          expiry_date: '2025-09-15',
          status: 'valid'
        },
        {
          id: '5',
          employee_name: 'Tom Davis',
          certification_type: 'Electrical Safety',
          issue_date: '2023-11-01',
          expiry_date: '2024-11-01',
          status: 'expiring'
        }
      ];

      setCertifications(mockCertifications);
      
      // Filter alerts (expiring within 30 days or expired)
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const alertCertifications = mockCertifications.filter(cert => {
        const expiryDate = new Date(cert.expiry_date);
        return cert.status === 'expired' || 
               (cert.status === 'expiring' && expiryDate <= thirtyDaysFromNow);
      });
      
      setAlerts(alertCertifications);
    } catch (error: any) {
      console.error('Error loading certifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'default';
      case 'expiring': return 'destructive';
      case 'expired': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expiring': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'expired': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const sendRenewalReminder = async (certificationId: string) => {
    try {
      // Simulate sending reminder
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Reminder Sent",
        description: "Renewal reminder has been sent to the employee.",
      });
    } catch (error) {
      toast({
        title: "Failed to Send Reminder",
        description: "Could not send renewal reminder.",
        variant: "destructive"
      });
    }
  };

  const getComplianceScore = () => {
    const validCerts = certifications.filter(cert => cert.status === 'valid').length;
    return Math.round((validCerts / certifications.length) * 100);
  };

  if (loading) {
    return <div className="animate-pulse bg-muted h-96 rounded-lg"></div>;
  }

  return (
    <div className="space-y-6">
      {/* Compliance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Certification Compliance Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {certifications.filter(c => c.status === 'valid').length}
              </div>
              <div className="text-sm text-muted-foreground">Valid Certifications</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {certifications.filter(c => c.status === 'expiring').length}
              </div>
              <div className="text-sm text-muted-foreground">Expiring Soon</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {certifications.filter(c => c.status === 'expired').length}
              </div>
              <div className="text-sm text-muted-foreground">Expired</div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Compliance Score</span>
              <span>{getComplianceScore()}%</span>
            </div>
            <Progress value={getComplianceScore()} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-500" />
              Certification Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map(cert => (
              <Alert key={cert.id} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex justify-between items-start">
                    <div>
                      <strong>{cert.employee_name}</strong> - {cert.certification_type}
                      <br />
                      {cert.status === 'expired' ? (
                        <span className="text-red-600">
                          Expired {Math.abs(getDaysUntilExpiry(cert.expiry_date))} days ago
                        </span>
                      ) : (
                        <span className="text-orange-600">
                          Expires in {getDaysUntilExpiry(cert.expiry_date)} days
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendRenewalReminder(cert.id)}
                    >
                      Send Reminder
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Certifications List */}
      <Card>
        <CardHeader>
          <CardTitle>All Certifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {certifications.map(cert => (
              <div key={cert.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(cert.status)}
                  <div>
                    <div className="font-medium">{cert.employee_name}</div>
                    <div className="text-sm text-muted-foreground">{cert.certification_type}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <div>Expires: {new Date(cert.expiry_date).toLocaleDateString()}</div>
                    <div className="text-muted-foreground">
                      {cert.status === 'expired' ? (
                        `${Math.abs(getDaysUntilExpiry(cert.expiry_date))} days overdue`
                      ) : (
                        `${getDaysUntilExpiry(cert.expiry_date)} days remaining`
                      )}
                    </div>
                  </div>
                  
                  <Badge variant={getStatusColor(cert.status)}>
                    {cert.status}
                  </Badge>
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CertificationTracker;