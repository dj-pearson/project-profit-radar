import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Building,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  parseISO,
  isToday,
} from 'date-fns';

interface DemoRequest {
  id: string;
  lead_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  phone?: string;
  demo_type: string;
  preferred_date?: string;
  preferred_time?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  status: 'requested' | 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
}

interface DemoCalendarProps {
  onDemoScheduled?: () => void;
}

export const DemoCalendar = ({ onDemoScheduled }: DemoCalendarProps) => {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [demoRequests, setDemoRequests] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDemo, setSelectedDemo] = useState<DemoRequest | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    scheduled_date: '',
    scheduled_time: '',
    notes: '',
  });

  // Load demo requests
  useEffect(() => {
    loadDemoRequests();
  }, [currentDate]);

  const loadDemoRequests = async () => {
    setLoading(true);
    try {
      // Get demos for current month and adjacent months
      const startDate = startOfMonth(subMonths(currentDate, 1));
      const endDate = endOfMonth(addMonths(currentDate, 1));

      const { data, error } = await (supabase as any)
        .from('demo_requests')
        .select('*')
        .or(`preferred_date.gte.${format(startDate, 'yyyy-MM-dd')},scheduled_date.gte.${format(startDate, 'yyyy-MM-dd')}`)
        .or(`preferred_date.lte.${format(endDate, 'yyyy-MM-dd')},scheduled_date.lte.${format(endDate, 'yyyy-MM-dd')}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDemoRequests(data || []);
    } catch (error) {
      console.error('Failed to load demo requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load demo requests.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Update demo status
  const updateDemoStatus = async (demoId: string, status: DemoRequest['status']) => {
    try {
      const { error } = await (supabase as any)
        .from('demo_requests')
        .update({ status })
        .eq('id', demoId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Demo ${status} successfully.`,
      });

      loadDemoRequests();
      setSelectedDemo(null);
      onDemoScheduled?.();
    } catch (error) {
      console.error('Failed to update demo status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update demo status.',
        variant: 'destructive',
      });
    }
  };

  // Schedule demo
  const scheduleDemo = async () => {
    if (!selectedDemo) return;

    setIsScheduling(true);
    try {
      const { error } = await (supabase as any)
        .from('demo_requests')
        .update({
          scheduled_date: scheduleForm.scheduled_date,
          scheduled_time: scheduleForm.scheduled_time,
          notes: scheduleForm.notes,
          status: 'scheduled',
        })
        .eq('id', selectedDemo.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Demo scheduled successfully.',
      });

      loadDemoRequests();
      setSelectedDemo(null);
      setScheduleForm({ scheduled_date: '', scheduled_time: '', notes: '' });
      onDemoScheduled?.();
    } catch (error) {
      console.error('Failed to schedule demo:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule demo.',
        variant: 'destructive',
      });
    } finally {
      setIsScheduling(false);
    }
  };

  // Get demos for a specific date
  const getDemosForDate = (date: Date): DemoRequest[] => {
    return demoRequests.filter((demo) => {
      const demoDate = demo.scheduled_date || demo.preferred_date;
      if (!demoDate) return false;
      return isSameDay(parseISO(demoDate), date);
    });
  };

  // Get calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Navigate months
  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Get status badge
  const getStatusBadge = (status: DemoRequest['status']) => {
    const config = {
      requested: { color: 'bg-blue-500', icon: AlertCircle, label: 'Requested' },
      scheduled: { color: 'bg-orange-500', icon: CalendarIcon, label: 'Scheduled' },
      completed: { color: 'bg-green-500', icon: CheckCircle, label: 'Completed' },
      cancelled: { color: 'bg-red-500', icon: XCircle, label: 'Cancelled' },
    };

    const { color, icon: Icon, label } = config[status];

    return (
      <Badge className={`${color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Demo Calendar</CardTitle>
              <CardDescription>
                View and schedule product demo requests
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={previousMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <CalendarIcon className="w-5 h-5 text-construction-orange" />
            <span className="text-xl font-semibold">
              {format(currentDate, 'MMMM yyyy')}
            </span>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading demos...</div>
          ) : (
            <div className="space-y-4">
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-semibold text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {calendarDays.map((day) => {
                  const demosForDay = getDemosForDate(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isCurrentDay = isToday(day);

                  return (
                    <button
                      key={day.toString()}
                      onClick={() => {
                        if (demosForDay.length > 0) {
                          setSelectedDemo(demosForDay[0]);
                        }
                      }}
                      className={`
                        min-h-24 p-2 border rounded-lg text-left transition-colors
                        ${isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 text-gray-400'}
                        ${isCurrentDay ? 'border-construction-orange border-2' : 'border-gray-200'}
                        ${demosForDay.length > 0 ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}
                      `}
                    >
                      <div className={`text-sm font-medium mb-1 ${isCurrentDay ? 'text-construction-orange' : ''}`}>
                        {format(day, 'd')}
                      </div>

                      {/* Demo indicators */}
                      {demosForDay.length > 0 && (
                        <div className="space-y-1">
                          {demosForDay.slice(0, 2).map((demo) => (
                            <div
                              key={demo.id}
                              className={`
                                text-xs px-1.5 py-0.5 rounded truncate
                                ${demo.status === 'scheduled' ? 'bg-orange-100 text-orange-800' : ''}
                                ${demo.status === 'requested' ? 'bg-blue-100 text-blue-800' : ''}
                                ${demo.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                                ${demo.status === 'cancelled' ? 'bg-gray-100 text-gray-600' : ''}
                              `}
                            >
                              <span className="font-medium">
                                {demo.scheduled_time || demo.preferred_time || 'TBD'}
                              </span>
                              {' - '}
                              {demo.company_name || demo.first_name || 'Anonymous'}
                            </div>
                          ))}
                          {demosForDay.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{demosForDay.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 pt-4 border-t">
                <span className="text-sm font-medium">Legend:</span>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-100"></div>
                  <span className="text-sm">Requested</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-orange-100"></div>
                  <span className="text-sm">Scheduled</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-100"></div>
                  <span className="text-sm">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-gray-100"></div>
                  <span className="text-sm">Cancelled</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Demo Detail Modal */}
      <Dialog open={!!selectedDemo} onOpenChange={() => setSelectedDemo(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Demo Request Details</DialogTitle>
            <DialogDescription>
              Review and manage this demo request
            </DialogDescription>
          </DialogHeader>

          {selectedDemo && (
            <div className="space-y-6">
              {/* Status */}
              <div>
                <Label>Status</Label>
                <div className="mt-2">{getStatusBadge(selectedDemo.status)}</div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="font-semibold mb-3">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Name</Label>
                    <p className="flex items-center gap-2 font-medium">
                      <User className="w-4 h-4" />
                      {selectedDemo.first_name} {selectedDemo.last_name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Email</Label>
                    <p className="flex items-center gap-2 font-medium">
                      <Mail className="w-4 h-4" />
                      {selectedDemo.email}
                    </p>
                  </div>
                  {selectedDemo.phone && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Phone</Label>
                      <p className="flex items-center gap-2 font-medium">
                        <Phone className="w-4 h-4" />
                        {selectedDemo.phone}
                      </p>
                    </div>
                  )}
                  {selectedDemo.company_name && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Company</Label>
                      <p className="flex items-center gap-2 font-medium">
                        <Building className="w-4 h-4" />
                        {selectedDemo.company_name}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Demo Details */}
              <div>
                <h4 className="font-semibold mb-3">Demo Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Demo Type</Label>
                    <p className="font-medium">
                      <Badge variant="outline">{selectedDemo.demo_type}</Badge>
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Requested Date</Label>
                    <p className="flex items-center gap-2 font-medium">
                      <CalendarIcon className="w-4 h-4" />
                      {selectedDemo.preferred_date || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Requested Time</Label>
                    <p className="flex items-center gap-2 font-medium">
                      <Clock className="w-4 h-4" />
                      {selectedDemo.preferred_time || 'Not specified'}
                    </p>
                  </div>
                  {selectedDemo.scheduled_date && (
                    <>
                      <div>
                        <Label className="text-sm text-muted-foreground">Scheduled Date</Label>
                        <p className="flex items-center gap-2 font-medium text-construction-orange">
                          <CalendarIcon className="w-4 h-4" />
                          {selectedDemo.scheduled_date}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Scheduled Time</Label>
                        <p className="flex items-center gap-2 font-medium text-construction-orange">
                          <Clock className="w-4 h-4" />
                          {selectedDemo.scheduled_time}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Schedule Form (for requested demos) */}
              {selectedDemo.status === 'requested' && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Schedule Demo</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="scheduled_date">Scheduled Date</Label>
                        <Input
                          id="scheduled_date"
                          type="date"
                          value={scheduleForm.scheduled_date}
                          onChange={(e) =>
                            setScheduleForm({ ...scheduleForm, scheduled_date: e.target.value })
                          }
                          placeholder={selectedDemo.preferred_date || ''}
                        />
                      </div>
                      <div>
                        <Label htmlFor="scheduled_time">Scheduled Time</Label>
                        <Input
                          id="scheduled_time"
                          type="time"
                          value={scheduleForm.scheduled_time}
                          onChange={(e) =>
                            setScheduleForm({ ...scheduleForm, scheduled_time: e.target.value })
                          }
                          placeholder={selectedDemo.preferred_time || ''}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={scheduleForm.notes}
                        onChange={(e) =>
                          setScheduleForm({ ...scheduleForm, notes: e.target.value })
                        }
                        placeholder="Add any notes about this demo..."
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={scheduleDemo}
                      disabled={!scheduleForm.scheduled_date || !scheduleForm.scheduled_time || isScheduling}
                      className="w-full"
                    >
                      {isScheduling ? 'Scheduling...' : 'Schedule Demo'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedDemo.notes && (
                <div>
                  <Label className="text-sm text-muted-foreground">Notes</Label>
                  <p className="mt-1 text-sm bg-gray-50 p-3 rounded">{selectedDemo.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 border-t pt-4">
                {selectedDemo.status === 'scheduled' && (
                  <>
                    <Button
                      onClick={() => updateDemoStatus(selectedDemo.id, 'completed')}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Completed
                    </Button>
                    <Button
                      onClick={() => updateDemoStatus(selectedDemo.id, 'cancelled')}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel Demo
                    </Button>
                  </>
                )}
                {selectedDemo.status === 'requested' && (
                  <Button
                    onClick={() => updateDemoStatus(selectedDemo.id, 'cancelled')}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Decline Request
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DemoCalendar;
