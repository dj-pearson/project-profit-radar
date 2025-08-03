import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { CalendarIcon, DollarSign, Clock, AlertTriangle, CheckCircle, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, differenceInDays, isBefore, isAfter } from 'date-fns';

interface RetentionItem {
  id: string;
  project: {
    id: string;
    name: string;
    contractAmount: number;
    completionDate: string;
  };
  retentionAmount: number;
  retentionPercentage: number;
  releaseDate: string;
  status: 'held' | 'eligible' | 'requested' | 'released' | 'overdue';
  workDescription: string;
  warrantyPeriodMonths: number;
  conditions: string[];
  requestedAt?: string;
  releasedAt?: string;
  releasedAmount?: number;
  remainingAmount: number;
}

interface RetentionSchedule {
  totalHeld: number;
  eligibleForRelease: number;
  requestedForRelease: number;
  overdue: number;
  upcomingReleases: RetentionItem[];
}

export const RetentionTrackingScheduling: React.FC = () => {
  const [retentionItems, setRetentionItems] = useState<RetentionItem[]>([]);
  const [schedule, setSchedule] = useState<RetentionSchedule | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [reminderDays, setReminderDays] = useState<number>(30);
  const { toast } = useToast();

  useEffect(() => {
    loadRetentionData();
  }, []);

  useEffect(() => {
    if (retentionItems.length > 0) {
      calculateSchedule();
    }
  }, [retentionItems]);

  const loadRetentionData = () => {
    // Mock retention data
    const mockData: RetentionItem[] = [
      {
        id: '1',
        project: {
          id: 'proj1',
          name: 'Downtown Office Complex',
          contractAmount: 2500000,
          completionDate: '2024-01-15'
        },
        retentionAmount: 250000,
        retentionPercentage: 10,
        releaseDate: '2024-03-15',
        status: 'eligible',
        workDescription: 'General construction and finishes',
        warrantyPeriodMonths: 12,
        conditions: ['Punch list completion', 'Final inspection approval', 'Warranty bond submission'],
        remainingAmount: 250000
      },
      {
        id: '2',
        project: {
          id: 'proj2',
          name: 'Residential Development Phase 2',
          contractAmount: 1800000,
          completionDate: '2023-12-20'
        },
        retentionAmount: 180000,
        retentionPercentage: 10,
        releaseDate: '2024-02-20',
        status: 'overdue',
        workDescription: 'Site work and infrastructure',
        warrantyPeriodMonths: 24,
        conditions: ['Final survey completion', 'City acceptance', 'As-built drawings'],
        remainingAmount: 180000
      },
      {
        id: '3',
        project: {
          id: 'proj3',
          name: 'Manufacturing Facility Expansion',
          contractAmount: 3200000,
          completionDate: '2024-02-01'
        },
        retentionAmount: 320000,
        retentionPercentage: 10,
        releaseDate: '2024-04-01',
        status: 'held',
        workDescription: 'Structural and mechanical systems',
        warrantyPeriodMonths: 18,
        conditions: ['Performance testing', 'Equipment commissioning', 'Operations manual delivery'],
        remainingAmount: 320000
      },
      {
        id: '4',
        project: {
          id: 'proj1',
          name: 'Downtown Office Complex',
          contractAmount: 2500000,
          completionDate: '2024-01-15'
        },
        retentionAmount: 50000,
        retentionPercentage: 2,
        releaseDate: '2025-01-15',
        status: 'held',
        workDescription: 'Final warranty retention',
        warrantyPeriodMonths: 12,
        conditions: ['One year warranty period completion'],
        remainingAmount: 50000
      }
    ];

    setRetentionItems(mockData);
  };

  const calculateSchedule = () => {
    const today = new Date();
    
    const totalHeld = retentionItems.reduce((sum, item) => sum + item.remainingAmount, 0);
    const eligibleForRelease = retentionItems
      .filter(item => item.status === 'eligible')
      .reduce((sum, item) => sum + item.remainingAmount, 0);
    const requestedForRelease = retentionItems
      .filter(item => item.status === 'requested')
      .reduce((sum, item) => sum + item.remainingAmount, 0);
    const overdue = retentionItems
      .filter(item => item.status === 'overdue')
      .reduce((sum, item) => sum + item.remainingAmount, 0);

    const upcomingReleases = retentionItems
      .filter(item => {
        const releaseDate = new Date(item.releaseDate);
        const daysToRelease = differenceInDays(releaseDate, today);
        return daysToRelease <= reminderDays && daysToRelease >= 0 && item.status === 'held';
      })
      .sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime());

    setSchedule({
      totalHeld,
      eligibleForRelease,
      requestedForRelease,
      overdue,
      upcomingReleases
    });
  };

  const requestRetentionRelease = async (itemId: string) => {
    setRetentionItems(prev => prev.map(item =>
      item.id === itemId 
        ? { ...item, status: 'requested', requestedAt: new Date().toISOString() }
        : item
    ));

    toast({
      title: "Release Requested",
      description: "Retention release request has been submitted for approval.",
    });
  };

  const markAsReleased = async (itemId: string, amount: number) => {
    setRetentionItems(prev => prev.map(item =>
      item.id === itemId 
        ? { 
            ...item, 
            status: 'released', 
            releasedAt: new Date().toISOString(),
            releasedAmount: amount,
            remainingAmount: item.remainingAmount - amount
          }
        : item
    ));

    toast({
      title: "Retention Released",
      description: `$${amount.toLocaleString()} has been marked as released.`,
    });
  };

  const scheduleReminder = (item: RetentionItem) => {
    toast({
      title: "Reminder Scheduled",
      description: `Reminder set for ${format(new Date(item.releaseDate), 'PPP')}`,
    });
  };

  const getStatusBadgeVariant = (status: RetentionItem['status']) => {
    switch (status) {
      case 'held': return 'secondary';
      case 'eligible': return 'default';
      case 'requested': return 'secondary';
      case 'released': return 'default';
      case 'overdue': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: RetentionItem['status']) => {
    switch (status) {
      case 'held': return <Clock className="h-4 w-4" />;
      case 'eligible': return <CheckCircle className="h-4 w-4" />;
      case 'requested': return <Clock className="h-4 w-4" />;
      case 'released': return <CheckCircle className="h-4 w-4" />;
      case 'overdue': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getDaysToRelease = (releaseDate: string) => {
    return differenceInDays(new Date(releaseDate), new Date());
  };

  const filteredItems = retentionItems.filter(item => 
    filterStatus === 'all' || item.status === filterStatus
  );

  return (
    <div className="space-y-6">
      {/* Summary Dashboard */}
      {schedule && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Held</p>
                  <p className="text-2xl font-bold">${schedule.totalHeld.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Eligible for Release</p>
                  <p className="text-2xl font-bold">${schedule.eligibleForRelease.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Requested</p>
                  <p className="text-2xl font-bold">${schedule.requestedForRelease.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold">${schedule.overdue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming Releases Alert */}
      {schedule && schedule.upcomingReleases.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <Bell className="h-5 w-5" />
              Upcoming Retention Releases ({schedule.upcomingReleases.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {schedule.upcomingReleases.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <p className="font-medium">{item.project.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ${item.remainingAmount.toLocaleString()} • Due {format(new Date(item.releaseDate), 'PPP')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {getDaysToRelease(item.releaseDate)} days
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => scheduleReminder(item)}
                    >
                      <Bell className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Retention Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="status-filter">Filter by Status:</Label>
              <select 
                id="status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border rounded px-3 py-1"
              >
                <option value="all">All</option>
                <option value="held">Held</option>
                <option value="eligible">Eligible</option>
                <option value="requested">Requested</option>
                <option value="released">Released</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="reminder-days">Reminder Days:</Label>
              <Input
                id="reminder-days"
                type="number"
                value={reminderDays}
                onChange={(e) => setReminderDays(Number(e.target.value))}
                className="w-20"
              />
            </div>
          </div>

          {/* Retention Items List */}
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">{item.project.name}</h3>
                    <Badge variant={getStatusBadgeVariant(item.status)} className="flex items-center gap-1">
                      {getStatusIcon(item.status)}
                      {item.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {item.status === 'overdue' && (
                      <Badge variant="destructive">
                        {Math.abs(getDaysToRelease(item.releaseDate))} days overdue
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {item.status === 'eligible' && (
                      <Button 
                        size="sm" 
                        onClick={() => requestRetentionRelease(item.id)}
                      >
                        Request Release
                      </Button>
                    )}
                    {item.status === 'requested' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => markAsReleased(item.id, item.remainingAmount)}
                      >
                        Mark Released
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Retention Amount:</span>
                    <div className="font-medium">${item.retentionAmount.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.retentionPercentage}% of contract
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">Remaining:</span>
                    <div className="font-medium">${item.remainingAmount.toLocaleString()}</div>
                    {item.releasedAmount && (
                      <div className="text-sm text-green-600">
                        Released: ${item.releasedAmount.toLocaleString()}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">Release Date:</span>
                    <div className="font-medium">{format(new Date(item.releaseDate), 'PPP')}</div>
                    <div className="text-sm text-muted-foreground">
                      {getDaysToRelease(item.releaseDate) >= 0 ? 
                        `${getDaysToRelease(item.releaseDate)} days remaining` :
                        `${Math.abs(getDaysToRelease(item.releaseDate))} days overdue`
                      }
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">Warranty Period:</span>
                    <div className="font-medium">{item.warrantyPeriodMonths} months</div>
                    <div className="text-sm text-muted-foreground">
                      {item.workDescription}
                    </div>
                  </div>
                </div>

                {item.conditions.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Release Conditions:</span>
                    <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                      {item.conditions.map((condition, index) => (
                        <li key={index}>{condition}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <Progress 
                  value={((item.retentionAmount - item.remainingAmount) / item.retentionAmount) * 100} 
                  className="w-full" 
                />
              </div>
            ))}

            {filteredItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No retention items found for the selected filter.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};