import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar, 
  AlertTriangle, 
  Clock, 
  DollarSign,
  CreditCard,
  FileText,
  Users,
  Building
} from 'lucide-react';

interface UpcomingPayment {
  id: string;
  type: string;
  description: string;
  amount: number;
  dueDate: string;
  priority: string;
  category: string;
  icon: React.ComponentType<any>;
}

const UpcomingPayments = () => {
  const { userProfile } = useAuth();
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile?.company_id) {
      loadUpcomingPayments();
    }
  }, [userProfile?.company_id]);

  const loadUpcomingPayments = async () => {
    try {
      setLoading(true);
      
      // Get upcoming contractor payments (money going out)
      const { data: contractorPayments, error } = await supabase
        .from('contractor_payments')
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .gte('payment_date', new Date().toISOString().split('T')[0])
        .order('payment_date', { ascending: true })
        .limit(10);

      if (error) throw error;

      const categoryMap: Record<string, { icon: React.ComponentType<any>; priority: string }> = {
        'contractor': { icon: Users, priority: 'medium' },
        'supplier': { icon: DollarSign, priority: 'medium' },
        'equipment': { icon: CreditCard, priority: 'medium' },
      };

      const transformedPayments: UpcomingPayment[] = contractorPayments?.map(payment => {
        const category = 'contractor';
        const categoryInfo = categoryMap[category] || { icon: DollarSign, priority: 'medium' };
        
        return {
          id: payment.id,
          type: category,
          description: payment.description || 'Contractor Payment',
          amount: parseFloat(String(payment.amount)) || 0,
          dueDate: payment.payment_date,
          priority: categoryInfo.priority,
          category,
          icon: categoryInfo.icon
        };
      }) || [];

      setUpcomingPayments(transformedPayments);
    } catch (error) {
      console.error('Error loading upcoming payments:', error);
      // Set empty array on error to avoid showing mock data
      setUpcomingPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getTotalUpcoming = () => {
    return upcomingPayments.reduce((sum, payment) => sum + payment.amount, 0);
  };

  const getHighPriorityCount = () => {
    return upcomingPayments.filter(payment => payment.priority === 'high').length;
  };

  const sortedPayments = [...upcomingPayments].sort((a, b) => {
    const dateA = new Date(a.dueDate);
    const dateB = new Date(b.dueDate);
    return dateA.getTime() - dateB.getTime();
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading payment data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Upcoming Payments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="text-center mb-2">
            <div className="text-2xl font-bold">${getTotalUpcoming().toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Due</div>
          </div>
          {getHighPriorityCount() > 0 && (
            <Alert variant="destructive" className="mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {getHighPriorityCount()} high priority payment{getHighPriorityCount() > 1 ? 's' : ''} coming up
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Payment List */}
        <div className="space-y-3">
          {sortedPayments.map(payment => {
            const daysUntil = getDaysUntilDue(payment.dueDate);
            const Icon = payment.icon;
            const isOverdue = daysUntil < 0;
            const isDueSoon = daysUntil <= 3 && daysUntil >= 0;
            
            return (
              <div key={payment.id} className={`p-3 border rounded-lg ${isOverdue ? 'border-red-500 bg-red-50' : isDueSoon ? 'border-orange-500 bg-orange-50' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <Icon className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">{payment.description}</div>
                      <div className="text-xs text-muted-foreground">
                        Due: {new Date(payment.dueDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getPriorityColor(payment.priority)} className="text-xs">
                          {payment.priority}
                        </Badge>
                        <div className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-orange-600' : 'text-muted-foreground'}`}>
                          <Clock className="h-3 w-3" />
                          {isOverdue ? (
                            `${Math.abs(daysUntil)} days overdue`
                          ) : daysUntil === 0 ? (
                            'Due today'
                          ) : (
                            `${daysUntil} days`
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">${payment.amount.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default UpcomingPayments;