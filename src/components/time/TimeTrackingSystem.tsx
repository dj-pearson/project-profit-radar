import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, Play, Pause, Square, MapPin, Calendar, 
  Users, DollarSign, BarChart3, CheckCircle, AlertTriangle
} from 'lucide-react';

interface TimeEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  projectId: string;
  projectName: string;
  taskId?: string;
  taskName?: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in minutes
  location?: string;
  coordinates?: { lat: number; lng: number };
  status: 'active' | 'paused' | 'completed';
  breakTime: number; // in minutes
  notes?: string;
  approvedBy?: string;
  approvedAt?: Date;
  payRate?: number;
  overtimeRate?: number;
  isOvertime: boolean;
}

interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  date: Date;
  clockIn: Date;
  clockOut?: Date;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  breakTime: number;
  location: string;
  status: 'present' | 'absent' | 'late' | 'partial';
  timeEntries: string[]; // Time entry IDs
  notes?: string;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  payRate: number;
  overtimeRate: number;
  department: string;
  isActive: boolean;
}

export const TimeTrackingSystem: React.FC = () => {
  const [activeEntries, setActiveEntries] = useState<TimeEntry[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([
    {
      id: '1',
      employeeId: 'emp-001',
      employeeName: 'Mike Johnson',
      projectId: 'proj-001',
      projectName: 'Downtown Office Building',
      taskId: 'task-001',
      taskName: 'Foundation Work',
      startTime: new Date('2024-01-15T08:00:00'),
      endTime: new Date('2024-01-15T17:00:00'),
      duration: 480, // 8 hours
      location: 'Downtown Construction Site',
      coordinates: { lat: 34.0522, lng: -118.2437 },
      status: 'completed',
      breakTime: 60,
      payRate: 35,
      overtimeRate: 52.5,
      isOvertime: false,
      notes: 'Completed foundation inspection and concrete pour'
    },
    {
      id: '2',
      employeeId: 'emp-002',
      employeeName: 'Sarah Chen',
      projectId: 'proj-002',
      projectName: 'Residential Renovation',
      startTime: new Date('2024-01-15T09:00:00'),
      duration: 360, // 6 hours so far
      location: 'Maple Street Residence',
      status: 'active',
      breakTime: 30,
      payRate: 40,
      overtimeRate: 60,
      isOvertime: false,
      notes: 'Working on kitchen cabinet installation'
    }
  ]);

  const [attendance, setAttendance] = useState<Attendance[]>([
    {
      id: '1',
      employeeId: 'emp-001',
      employeeName: 'Mike Johnson',
      date: new Date('2024-01-15'),
      clockIn: new Date('2024-01-15T08:00:00'),
      clockOut: new Date('2024-01-15T17:00:00'),
      totalHours: 8,
      regularHours: 8,
      overtimeHours: 0,
      breakTime: 60,
      location: 'Downtown Construction Site',
      status: 'present',
      timeEntries: ['1'],
      notes: 'On time, productive day'
    },
    {
      id: '2',
      employeeId: 'emp-002',
      employeeName: 'Sarah Chen',
      date: new Date('2024-01-15'),
      clockIn: new Date('2024-01-15T09:00:00'),
      totalHours: 6,
      regularHours: 6,
      overtimeHours: 0,
      breakTime: 30,
      location: 'Maple Street Residence',
      status: 'present',
      timeEntries: ['2'],
      notes: 'Currently working'
    }
  ]);

  const [employees] = useState<Employee[]>([
    {
      id: 'emp-001',
      name: 'Mike Johnson',
      role: 'Site Supervisor',
      payRate: 35,
      overtimeRate: 52.5,
      department: 'Construction',
      isActive: true
    },
    {
      id: 'emp-002',
      name: 'Sarah Chen',
      role: 'Carpenter',
      payRate: 40,
      overtimeRate: 60,
      department: 'Construction',
      isActive: true
    },
    {
      id: 'emp-003',
      name: 'Tom Wilson',
      role: 'Electrician',
      payRate: 45,
      overtimeRate: 67.5,
      department: 'Electrical',
      isActive: true
    }
  ]);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const calculateCurrentDuration = (entry: TimeEntry): number => {
    if (entry.status === 'completed' && entry.endTime) {
      return entry.duration;
    }
    const elapsed = (currentTime.getTime() - entry.startTime.getTime()) / (1000 * 60);
    return Math.floor(elapsed - entry.breakTime);
  };

  const getStatusColor = (status: TimeEntry['status']) => {
    switch (status) {
      case 'active': return 'default';
      case 'paused': return 'secondary';
      case 'completed': return 'outline';
      default: return 'outline';
    }
  };

  const getAttendanceColor = (status: Attendance['status']) => {
    switch (status) {
      case 'present': return 'default';
      case 'late': return 'secondary';
      case 'partial': return 'secondary';
      case 'absent': return 'destructive';
      default: return 'outline';
    }
  };

  const renderTimeEntryCard = (entry: TimeEntry) => {
    const currentDuration = calculateCurrentDuration(entry);
    const isLongShift = currentDuration > 480; // More than 8 hours

    return (
      <Card key={entry.id} className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4" />
              <h4 className="font-medium">{entry.employeeName}</h4>
            </div>
            <p className="text-sm text-muted-foreground">{entry.projectName}</p>
            {entry.taskName && (
              <p className="text-xs text-muted-foreground">{entry.taskName}</p>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <Badge variant={getStatusColor(entry.status)}>
              {entry.status}
            </Badge>
            {isLongShift && (
              <Badge variant="secondary">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Long shift
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <Play className="h-3 w-3" />
            <span>Started: {entry.startTime.toLocaleTimeString()}</span>
          </div>
          {entry.endTime && (
            <div className="flex items-center gap-2 text-sm">
              <Square className="h-3 w-3" />
              <span>Ended: {entry.endTime.toLocaleTimeString()}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-3 w-3" />
            <span>{entry.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-3 w-3" />
            <span>${entry.payRate}/hr {entry.isOvertime && `(OT: $${entry.overtimeRate}/hr)`}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Duration:</span>
            <span className="font-medium">{formatDuration(currentDuration)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Break Time:</span>
            <span className="font-medium">{formatDuration(entry.breakTime)}</span>
          </div>
          {entry.payRate && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Earnings:</span>
              <span className="font-medium">
                ${((currentDuration / 60) * entry.payRate).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          {entry.status === 'active' && (
            <>
              <Button size="sm" variant="outline">
                <Pause className="h-3 w-3 mr-1" />
                Break
              </Button>
              <Button size="sm" variant="outline">
                <Square className="h-3 w-3 mr-1" />
                Clock Out
              </Button>
            </>
          )}
          {entry.status === 'completed' && (
            <Button size="sm" variant="outline">
              <CheckCircle className="h-3 w-3 mr-1" />
              Approve
            </Button>
          )}
          <Button size="sm" variant="ghost">
            Edit
          </Button>
        </div>
      </Card>
    );
  };

  const renderAttendanceCard = (record: Attendance) => {
    return (
      <Card key={record.id} className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4" />
              <h4 className="font-medium">{record.employeeName}</h4>
            </div>
            <p className="text-sm text-muted-foreground">{record.date.toLocaleDateString()}</p>
          </div>
          
          <Badge variant={getAttendanceColor(record.status)}>
            {record.status}
          </Badge>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-3 w-3" />
            <span>In: {record.clockIn.toLocaleTimeString()}</span>
            {record.clockOut && (
              <span>Out: {record.clockOut.toLocaleTimeString()}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-3 w-3" />
            <span>{record.location}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Hours:</span>
            <p className="font-medium">{record.totalHours}h</p>
          </div>
          <div>
            <span className="text-muted-foreground">Regular:</span>
            <p className="font-medium">{record.regularHours}h</p>
          </div>
          <div>
            <span className="text-muted-foreground">Overtime:</span>
            <p className="font-medium">{record.overtimeHours}h</p>
          </div>
          <div>
            <span className="text-muted-foreground">Break:</span>
            <p className="font-medium">{formatDuration(record.breakTime)}</p>
          </div>
        </div>
      </Card>
    );
  };

  // Calculate statistics
  const totalEmployees = employees.length;
  const activeEmployees = timeEntries.filter(entry => entry.status === 'active').length;
  const todayHours = attendance.reduce((sum, record) => sum + record.totalHours, 0);
  const todayEarnings = timeEntries.reduce((sum, entry) => {
    const hours = entry.duration / 60;
    return sum + (hours * (entry.payRate || 0));
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Time Tracking & Attendance</h2>
          <p className="text-muted-foreground">
            Monitor work hours, track attendance, and manage payroll
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Reports
          </Button>
          <Button>
            <Clock className="h-4 w-4 mr-2" />
            Clock In
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold">{totalEmployees}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Currently Working</p>
                <p className="text-2xl font-bold text-green-600">{activeEmployees}</p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Hours</p>
                <p className="text-2xl font-bold">{todayHours.toFixed(1)}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Earnings</p>
                <p className="text-2xl font-bold text-green-600">${todayEarnings.toFixed(0)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center flex-wrap">
            <Button>
              <Play className="h-4 w-4 mr-2" />
              Clock In
            </Button>
            <Button variant="outline">
              <Pause className="h-4 w-4 mr-2" />
              Start Break
            </Button>
            <Button variant="outline">
              <Square className="h-4 w-4 mr-2" />
              Clock Out
            </Button>
            <Button variant="outline">
              <MapPin className="h-4 w-4 mr-2" />
              Check Location
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Time Entries</TabsTrigger>
          <TabsTrigger value="completed">Completed Entries</TabsTrigger>
          <TabsTrigger value="attendance">Daily Attendance</TabsTrigger>
          <TabsTrigger value="employees">Employee Management</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Currently Working</h3>
              <span className="text-muted-foreground">{activeEmployees} active</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {timeEntries.filter(entry => entry.status === 'active').map(renderTimeEntryCard)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="completed">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Completed Time Entries</h3>
              <Button>Approve All</Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {timeEntries.filter(entry => entry.status === 'completed').map(renderTimeEntryCard)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Daily Attendance Records</h3>
              <Button>Export Timesheet</Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {attendance.map(renderAttendanceCard)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="employees">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Employee Management</h3>
              <Button>Add Employee</Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {employees.map(employee => (
                <Card key={employee.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium">{employee.name}</h4>
                      <p className="text-sm text-muted-foreground">{employee.role}</p>
                      <p className="text-xs text-muted-foreground">{employee.department}</p>
                    </div>
                    <Badge variant={employee.isActive ? 'default' : 'outline'}>
                      {employee.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Regular Rate:</span>
                      <span className="font-medium">${employee.payRate}/hr</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Overtime Rate:</span>
                      <span className="font-medium">${employee.overtimeRate}/hr</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline">Edit</Button>
                    <Button size="sm" variant="ghost">View Details</Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};