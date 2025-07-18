import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ProjectSubSidebar } from '@/components/project/ProjectSubSidebar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import InvoiceGenerator from '@/components/InvoiceGenerator';
import { PermitForm } from '@/components/permits/PermitForm';
import { WarrantyForm } from '@/components/warranty/WarrantyForm';
import RealTimeJobCosting from '@/components/financial/RealTimeJobCosting';
import ProjectProfitLoss from '@/components/project/ProjectProfitLoss';
import EnhancedProjectOverview from '@/components/project/EnhancedProjectOverview';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SimplifiedSidebar } from '@/components/navigation/SimplifiedSidebar';
import { ProjectEstimates } from '@/components/project/ProjectEstimates';
import { ContactSearchCombobox } from '@/components/contacts/ContactSearchCombobox';
import { TaskManager } from '@/components/tasks/TaskManager';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  CalendarIcon,
  DollarSign, 
  MapPin, 
  User, 
  Building2,
  Clock,
  Plus,
  Edit,
  BarChart3,
  FileText,
  Users,
  AlertTriangle,
  Package,
  Wrench,
  ExternalLink,
  Trash2,
  Mail,
  Phone,
  Pencil
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface PunchListItem {
  id: string;
  project_id: string | null;
  item_number: string;
  description: string;
  priority: string | null;
  status: string | null;
  location: string | null;
  trade: string | null;
  created_by: string | null;
  assigned_to: string | null;
  date_identified: string | null;
  date_completed: string | null;
  created_at: string;
  updated_at: string;
  company_id: string;
  projects?: { name: string; client_name: string };
  creator?: { first_name: string; last_name: string };
  assignee?: { first_name: string; last_name: string };
}

interface Project {
  id: string;
  name: string;
  description: string;
  client_name: string;
  client_email: string;
  site_address: string;
  status: string;
  completion_percentage: number;
  budget: number;
  actual_hours: number;
  estimated_hours: number;
  start_date: string;
  end_date: string;
  project_type: string;
  permit_numbers: string[];
  created_at: string;
}

interface Phase {
  id: string;
  name: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
  estimated_budget: number;
  actual_cost: number;
  order_index: number;
}

interface Task {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  completion_percentage: number;
  estimated_hours: number;
  actual_hours: number;
  due_date: string;
  assigned_to: string;
  phase_id: string;
}

interface Permit {
  id: string;
  permit_name: string;
  permit_type: string;
  permit_number: string;
  issuing_authority: string;
  application_status: string;
  application_date: string;
  approval_date: string;
  permit_expiry_date: string;
  priority: string;
}

interface Warranty {
  id: string;
  item_name: string;
  warranty_type: string;
  manufacturer: string;
  warranty_start_date: string;
  warranty_end_date: string;
  status: string;
  is_transferable: boolean;
  is_transferred_to_customer: boolean;
}

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [permits, setPermits] = useState<any[]>([]);
  const [warranties, setWarranties] = useState<any[]>([]);
  const [warrantiesLoading, setWarrantiesLoading] = useState(false);
  const [permitsLoading, setPermitsLoading] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [jobCosts, setJobCosts] = useState<any[]>([]);
  const [rfis, setRfis] = useState<any[]>([]);
  const [submittals, setSubmittals] = useState<any[]>([]);
  const [changeOrders, setChangeOrders] = useState<any[]>([]);
  const [changeOrdersLoading, setChangeOrdersLoading] = useState(false);
  const [punchListItems, setPunchListItems] = useState<PunchListItem[]>([]);
  const [punchListLoading, setPunchListLoading] = useState(false);
  const [editingRFI, setEditingRFI] = useState<any>(null);
  const [isEditRFIDialogOpen, setIsEditRFIDialogOpen] = useState(false);
  const [loadingProject, setLoadingProject] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Dialog states
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false);
  const [editTaskDialogOpen, setEditTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [createMaterialDialogOpen, setCreateMaterialDialogOpen] = useState(false);
  const [createReportDialogOpen, setCreateReportDialogOpen] = useState(false);
  const [editClientDialogOpen, setEditClientDialogOpen] = useState(false);
  const [createInvoiceDialogOpen, setCreateInvoiceDialogOpen] = useState(false);
  const [editProjectDialogOpen, setEditProjectDialogOpen] = useState(false);
  const [addContactDialogOpen, setAddContactDialogOpen] = useState(false);
  const [addTeamMemberDialogOpen, setAddTeamMemberDialogOpen] = useState(false);
  const [addPermitDialogOpen, setAddPermitDialogOpen] = useState(false);
  const [editPermitDialogOpen, setEditPermitDialogOpen] = useState(false);
  const [editingPermit, setEditingPermit] = useState<any>(null);
  const [addWarrantyDialogOpen, setAddWarrantyDialogOpen] = useState(false);
  const [editWarrantyDialogOpen, setEditWarrantyDialogOpen] = useState(false);
  const [editingWarranty, setEditingWarranty] = useState<any>(null);
  const [addDocumentDialogOpen, setAddDocumentDialogOpen] = useState(false);
  const [addJobCostDialogOpen, setAddJobCostDialogOpen] = useState(false);
  const [addRfiDialogOpen, setAddRfiDialogOpen] = useState(false);
  const [addSubmittalDialogOpen, setAddSubmittalDialogOpen] = useState(false);
  const [addChangeOrderDialogOpen, setAddChangeOrderDialogOpen] = useState(false);
  const [addPunchListDialogOpen, setAddPunchListDialogOpen] = useState(false);
  const [editPunchListDialogOpen, setEditPunchListDialogOpen] = useState(false);
  const [editingPunchListItem, setEditingPunchListItem] = useState<any>(null);
  const [addEquipmentDialogOpen, setAddEquipmentDialogOpen] = useState(false);
  
  // User and contact lists
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [projectContacts, setProjectContacts] = useState<any[]>([]);
  const [projectContactsLoading, setProjectContactsLoading] = useState(false);
  const [addExistingContactDialogOpen, setAddExistingContactDialogOpen] = useState(false);
  const [selectedContactToAdd, setSelectedContactToAdd] = useState<any>(null);
  const [contactRole, setContactRole] = useState('client');
  
  // Form states
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    estimated_hours: 0,
    due_date: '',
    completion_percentage: 0
  });
  
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    description: '',
    category: '',
    unit: '',
    unit_cost: 0,
    quantity_available: 0,
    supplier_name: ''
  });
  
  const [newReport, setNewReport] = useState({
    work_performed: '',
    crew_count: 0,
    weather_conditions: '',
    materials_delivered: '',
    equipment_used: '',
    delays_issues: '',
    safety_incidents: '',
    date: ''
  });
  
  const [editedClient, setEditedClient] = useState({
    client_name: '',
    client_email: ''
  });

  const [editedProject, setEditedProject] = useState({
    name: '',
    description: '',
    budget: 0,
    start_date: '',
    end_date: '',
    status: '',
    project_type: ''
  });

  const [newContact, setNewContact] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    contact_type: 'client'
  });

  const [selectedUserId, setSelectedUserId] = useState('');

  const [newPermit, setNewPermit] = useState({
    permit_name: '',
    permit_type: '',
    issuing_authority: '',
    application_date: '',
    permit_expiry_date: '',
    description: '',
    priority: 'medium'
  });


  const [newDocument, setNewDocument] = useState({
    document_name: '',
    document_type: '',
    description: '',
    file_path: '',
    category: ''
  });

  const [newJobCost, setNewJobCost] = useState({
    cost_code: '',
    description: '',
    estimated_cost: 0,
    actual_cost: 0,
    cost_type: 'labor',
    unit: '',
    quantity: 0,
    unit_cost: 0
  });

  const [newRfi, setNewRfi] = useState({
    rfi_number: '',
    subject: '',
    description: '',
    priority: 'medium',
    submitted_to: '',
    due_date: '',
    status: 'submitted'
  });

  const [editedRFI, setEditedRFI] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    submitted_to: '',
    due_date: '',
    status: 'submitted'
  });

  const [newSubmittal, setNewSubmittal] = useState({
    submittal_number: '',
    title: '',
    description: '',
    spec_section: '',
    priority: 'medium',
    due_date: '',
    status: 'submitted'
  });

  const [editingSubmittal, setEditingSubmittal] = useState<any>(null);
  const [isEditSubmittalDialogOpen, setIsEditSubmittalDialogOpen] = useState(false);
  const [editedSubmittal, setEditedSubmittal] = useState({
    title: '',
    description: '',
    spec_section: '',
    priority: 'medium',
    due_date: '',
    status: 'draft'
  });

  const [newChangeOrder, setNewChangeOrder] = useState({
    change_order_number: '',
    title: '',
    description: '',
    amount: 0,
    reason: '',
    status: 'pending',
    assigned_approvers: [] as string[],
    approval_due_date: '',
    approval_notes: ''
  });

  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const [approvalDueDate, setApprovalDueDate] = useState('');
  const [companyUsers, setCompanyUsers] = useState<any[]>([]);
  const [editingChangeOrder, setEditingChangeOrder] = useState<any>(null);
  const [editChangeOrderDialogOpen, setEditChangeOrderDialogOpen] = useState(false);

  const [newPunchListItem, setNewPunchListItem] = useState({
    item_number: '',
    description: '',
    priority: 'medium',
    category: 'quality',
    location: '',
    trade: '',
    assigned_to: '',
    date_identified: '',
    due_date: ''
  });

  const [newEquipment, setNewEquipment] = useState({
    equipment_name: '',
    equipment_type: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    purchase_date: '',
    status: 'active'
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && user && userProfile && !userProfile.company_id) {
      navigate('/setup');
    }
    
    if (projectId && userProfile?.company_id) {
      loadProjectData();
      loadAvailableUsers();
      loadContacts();
      loadProjectContacts();
      loadPermits();
      loadChangeOrders();
    }
  }, [projectId, user, userProfile, loading, navigate]);

  // CRUD handlers
  const handleCreateTask = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...newTask,
          project_id: projectId,
          company_id: userProfile?.company_id,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      setTasks(prev => [data, ...prev]);
      setCreateTaskDialogOpen(false);
      setNewTask({
        name: '',
        description: '',
        priority: 'medium',
        status: 'todo',
        estimated_hours: 0,
        due_date: '',
        completion_percentage: 0
      });
      toast({
        title: "Task created",
        description: "Task has been created successfully.",
      });

      toast({
        title: "Task created",
        description: "New task has been added to the project."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating task",
        description: error.message
      });
    }
  };

  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setEditTaskDialogOpen(true);
  };

  const handleUpdateTask = async () => {
    if (!editingTask || !user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          name: editingTask.name,
          description: editingTask.description,
          priority: editingTask.priority,
          status: editingTask.status,
          estimated_hours: editingTask.estimated_hours,
          actual_hours: editingTask.actual_hours,
          due_date: editingTask.due_date || null,
          completion_percentage: editingTask.completion_percentage
        })
        .eq('id', editingTask.id)
        .select()
        .single();

      if (error) throw error;

      setTasks(prev => prev.map(task => task.id === editingTask.id ? data : task));
      setEditTaskDialogOpen(false);
      setEditingTask(null);
      toast({
        title: "Task updated",
        description: "Task has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleProgressUpdate = async (taskId: string, newProgress: number) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          completion_percentage: newProgress,
          status: newProgress === 100 ? 'completed' : newProgress > 0 ? 'in_progress' : 'todo'
        })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              completion_percentage: newProgress,
              status: newProgress === 100 ? 'completed' : newProgress > 0 ? 'in_progress' : 'todo'
            }
          : task
      ));
    } catch (error) {
      console.error('Error updating progress:', error);
      toast({
        title: "Error",
        description: "Failed to update progress. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreateDailyReport = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_reports')
        .insert({
          ...newReport,
          project_id: projectId,
          created_by: user?.id,
          date: newReport.date || new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) throw error;

      // Report created successfully

      setCreateReportDialogOpen(false);
      setNewReport({
        work_performed: '',
        crew_count: 0,
        weather_conditions: '',
        materials_delivered: '',
        equipment_used: '',
        delays_issues: '',
        safety_incidents: '',
        date: ''
      });

      await loadProjectData(); // Refresh project data
      toast({
        title: "Daily report created",
        description: "Daily report has been submitted successfully."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating daily report",
        description: error.message
      });
    }
  };

  const handleUpdateClientInfo = async () => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          client_name: editedClient.client_name,
          client_email: editedClient.client_email
        })
        .eq('id', projectId);

      if (error) throw error;

      setProject(prev => prev ? {
        ...prev,
        client_name: editedClient.client_name,
        client_email: editedClient.client_email
      } : null);

      setEditClientDialogOpen(false);

      toast({
        title: "Client information updated",
        description: "Client details have been updated successfully."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating client info",
        description: error.message
      });
    }
  };

  const handleUpdateProject = async () => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: editedProject.name,
          description: editedProject.description,
          budget: editedProject.budget,
          start_date: editedProject.start_date,
          end_date: editedProject.end_date,
          status: editedProject.status,
          project_type: editedProject.project_type
        })
        .eq('id', projectId);

      if (error) throw error;

      setProject(prev => prev ? { ...prev, ...editedProject } : null);
      setEditProjectDialogOpen(false);

      toast({
        title: "Project updated",
        description: "Project details have been updated successfully."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating project",
        description: error.message
      });
    }
  };

  const handleCreateMaterial = async () => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .insert({
          ...newMaterial,
          project_id: projectId,
          company_id: userProfile?.company_id,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      setCreateMaterialDialogOpen(false);
      setNewMaterial({
        name: '',
        description: '',
        category: '',
        unit: '',
        unit_cost: 0,
        quantity_available: 0,
        supplier_name: ''
      });

      await loadProjectData(); // Refresh project data
      toast({
        title: "Material added",
        description: "Material has been added to the project."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding material",
        description: error.message
      });
    }
  };


  const handleAddTeamMember = async () => {
    try {
      const { error } = await supabase
        .from('crew_assignments')
        .insert({
          project_id: projectId,
          crew_member_id: selectedUserId,
          company_id: userProfile?.company_id,
          assigned_date: new Date().toISOString().split('T')[0],
          start_time: '08:00',
          end_time: '17:00',
          status: 'scheduled'
        });

      if (error) throw error;

      setAddTeamMemberDialogOpen(false);
      setSelectedUserId('');

      toast({
        title: "Team member added",
        description: "Team member has been assigned to the project."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding team member",
        description: error.message
      });
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('company_id', userProfile?.company_id);

      if (error) throw error;
      setAvailableUsers(data || []);
      setCompanyUsers(data || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
    }
  };

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('company_id', userProfile?.company_id);

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error('Error loading contacts:', error);
    }
  };

  const loadProjectContacts = async () => {
    if (!projectId) return;
    
    setProjectContactsLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_contacts')
        .select(`
          *,
          contact:contacts(*)
        `)
        .eq('project_id', projectId);

      if (error) throw error;
      setProjectContacts(data || []);
    } catch (error: any) {
      console.error('Error loading project contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load project contacts",
        variant: "destructive",
      });
    } finally {
      setProjectContactsLoading(false);
    }
  };

  const handleCreateContact = async () => {
    try {
      const contactData = {
        ...newContact,
        company_id: userProfile?.company_id,
        created_by: user?.id
      };

      const { data: contactResult, error: contactError } = await supabase
        .from('contacts')
        .insert(contactData)
        .select()
        .single();

      if (contactError) throw contactError;

      // Also add to project_contacts if we have a project
      if (projectId && contactResult) {
        const { error: projectContactError } = await supabase
          .from('project_contacts')
          .insert({
            project_id: projectId,
            contact_id: contactResult.id,
            role: newContact.contact_type || 'client',
            created_by: user?.id
          });

        if (projectContactError) {
          console.error('Error linking contact to project:', projectContactError);
        }
      }

      setAddContactDialogOpen(false);
      setNewContact({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company_name: '',
        contact_type: 'client'
      });
      
      loadContacts();
      loadProjectContacts();
      
      toast({
        title: "Success",
        description: "Contact added to project successfully",
      });
    } catch (error: any) {
      console.error('Error creating contact:', error);
      toast({
        title: "Error", 
        description: "Failed to create contact",
        variant: "destructive",
      });
    }
  };

  const handleAddExistingContact = async () => {
    if (!selectedContactToAdd || !projectId) return;

    try {
      const { error } = await supabase
        .from('project_contacts')
        .insert({
          project_id: projectId,
          contact_id: selectedContactToAdd.id,
          role: contactRole,
          created_by: user?.id
        });

      if (error) throw error;

      setAddExistingContactDialogOpen(false);
      setSelectedContactToAdd(null);
      setContactRole('client');
      loadProjectContacts();
      
      toast({
        title: "Success",
        description: "Contact added to project successfully",
      });
    } catch (error: any) {
      console.error('Error adding contact to project:', error);
      toast({
        title: "Error",
        description: "Failed to add contact to project. Contact may already be assigned this role.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveProjectContact = async (projectContactId: string) => {
    try {
      const { error } = await supabase
        .from('project_contacts')
        .delete()
        .eq('id', projectContactId);

      if (error) throw error;

      loadProjectContacts();
      toast({
        title: "Success",
        description: "Contact removed from project",
      });
    } catch (error: any) {
      console.error('Error removing contact from project:', error);
      toast({
        title: "Error",
        description: "Failed to remove contact from project",
        variant: "destructive",
      });
    }
  };

  const handleCreatePermit = async () => {
    try {
      const { error } = await supabase
        .from('environmental_permits')
        .insert({
          permit_name: newPermit.permit_name,
          permit_type: newPermit.permit_type,
          issuing_agency: newPermit.issuing_authority,
          application_date: newPermit.application_date,
          expiration_date: newPermit.permit_expiry_date,
          description: newPermit.description,
          priority: newPermit.priority,
          project_id: projectId,
          company_id: userProfile?.company_id,
          created_by: user?.id,
          status: 'submitted',
          permit_number: `PERM-${Date.now()}`
        });

      if (error) throw error;

      setAddPermitDialogOpen(false);
      setNewPermit({
        permit_name: '',
        permit_type: '',
        issuing_authority: '',
        application_date: '',
        permit_expiry_date: '',
        description: '',
        priority: 'medium'
      });

      toast({
        title: "Permit added",
        description: "Permit has been added to the project."
      });
      
      loadPermits();
      loadWarranties();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding permit",
        description: error.message
      });
    }
  };


  const handleCreateDocument = async () => {
    try {
      const { error } = await supabase
        .from('documents')
        .insert({
          name: newDocument.document_name,
          description: newDocument.description,
          file_path: newDocument.file_path,
          project_id: projectId,
          company_id: userProfile?.company_id,
          uploaded_by: user?.id
        });

      if (error) throw error;

      setAddDocumentDialogOpen(false);
      setNewDocument({
        document_name: '',
        document_type: '',
        description: '',
        file_path: '',
        category: ''
      });

      toast({
        title: "Document added",
        description: "Document has been added to the project."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding document",
        description: error.message
      });
    }
  };

  const handleCreateJobCost = async () => {
    try {
      const { error } = await supabase
        .from('job_costs')
        .insert({
          cost_code_id: newJobCost.cost_code || '',
          description: newJobCost.description,
          labor_cost: newJobCost.cost_type === 'labor' ? newJobCost.actual_cost : 0,
          material_cost: newJobCost.cost_type === 'material' ? newJobCost.actual_cost : 0,
          equipment_cost: newJobCost.cost_type === 'equipment' ? newJobCost.actual_cost : 0,
          other_cost: newJobCost.cost_type === 'other' ? newJobCost.actual_cost : 0,
          labor_hours: newJobCost.cost_type === 'labor' ? newJobCost.quantity : 0,
          total_cost: newJobCost.actual_cost,
          project_id: projectId,
          created_by: user?.id,
          date: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      setAddJobCostDialogOpen(false);
      setNewJobCost({
        cost_code: '',
        description: '',
        estimated_cost: 0,
        actual_cost: 0,
        cost_type: 'labor',
        unit: '',
        quantity: 0,
        unit_cost: 0
      });

      toast({
        title: "Job cost added",
        description: "Job cost has been added to the project."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding job cost",
        description: error.message
      });
    }
  };

  const handleCreateRfi = async () => {
    try {
      const { error } = await supabase
        .from('rfis')
        .insert({
          project_id: projectId,
          subject: newRfi.subject,
          description: newRfi.description,
          priority: newRfi.priority,
          submitted_to: newRfi.submitted_to || null,
          due_date: newRfi.due_date || null,
          status: newRfi.status,
          company_id: userProfile?.company_id,
          created_by: user?.id,
          rfi_number: newRfi.rfi_number || `RFI-${Date.now().toString().slice(-8)}`
        });

      if (error) throw error;

      setAddRfiDialogOpen(false);
      setNewRfi({
        rfi_number: '',
        subject: '',
        description: '',
        priority: 'medium',
        submitted_to: '',
        due_date: '',
        status: 'submitted'
      });

      toast({
        title: "RFI added",
        description: "RFI has been added to the project."
      });
      
      loadProjectData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding RFI",
        description: error.message
      });
    }
  };

  const handleEditRFI = (rfi: any) => {
    setEditingRFI(rfi);
    setEditedRFI({
      subject: rfi.subject || '',
      description: rfi.description || '',
      priority: rfi.priority || 'medium',
      submitted_to: rfi.submitted_to || '',
      due_date: rfi.due_date || '',
      status: rfi.status || 'submitted'
    });
    setIsEditRFIDialogOpen(true);
  };

  const handleUpdateRFI = async () => {
    if (!editingRFI || !editedRFI.subject || !editedRFI.description) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields."
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('rfis')
        .update({
          subject: editedRFI.subject,
          description: editedRFI.description,
          priority: editedRFI.priority,
          submitted_to: editedRFI.submitted_to || null,
          due_date: editedRFI.due_date || null,
          status: editedRFI.status
        })
        .eq('id', editingRFI.id);

      if (error) throw error;

      toast({
        title: "RFI updated",
        description: "RFI has been updated successfully."
      });

      setIsEditRFIDialogOpen(false);
      setEditingRFI(null);
      setEditedRFI({
        subject: '',
        description: '',
        priority: 'medium',
        submitted_to: '',
        due_date: '',
        status: 'submitted'
      });
      
      loadProjectData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating RFI",
        description: error.message
      });
    }
  };

  const handleCreateSubmittal = async () => {
    if (!newSubmittal.title || !newSubmittal.description) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields."
      });
      return;
    }

    try {
      // Generate submittal number
      const submittalCount = submittals.length + 1;
      const submittalNumber = `SUB-${new Date().getFullYear()}-${submittalCount.toString().padStart(3, '0')}`;

      const { error } = await supabase
        .from('submittals')
        .insert({
          company_id: userProfile?.company_id,
          project_id: projectId,
          title: newSubmittal.title,
          description: newSubmittal.description,
          spec_section: newSubmittal.spec_section,
          due_date: newSubmittal.due_date || null,
          priority: newSubmittal.priority,
          status: 'draft',
          submittal_number: submittalNumber,
          created_by: user?.id
        });

      if (error) throw error;

      setAddSubmittalDialogOpen(false);
      setNewSubmittal({
        submittal_number: '',
        title: '',
        description: '',
        spec_section: '',
        priority: 'medium',
        due_date: '',
        status: 'submitted'
      });

      toast({
        title: "Submittal added",
        description: "Submittal has been added to the project."
      });
      
      loadProjectData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding submittal",
        description: error.message
      });
    }
  };

  const handleEditSubmittal = (submittal: any) => {
    setEditingSubmittal(submittal);
    setEditedSubmittal({
      title: submittal.title || '',
      description: submittal.description || '',
      spec_section: submittal.spec_section || '',
      priority: submittal.priority || 'medium',
      due_date: submittal.due_date || '',
      status: submittal.status || 'draft'
    });
    setIsEditSubmittalDialogOpen(true);
  };

  const handleUpdateSubmittal = async () => {
    if (!editingSubmittal || !editedSubmittal.title || !editedSubmittal.description) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields."
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('submittals')
        .update({
          title: editedSubmittal.title,
          description: editedSubmittal.description,
          spec_section: editedSubmittal.spec_section || null,
          priority: editedSubmittal.priority,
          due_date: editedSubmittal.due_date || null,
          status: editedSubmittal.status
        })
        .eq('id', editingSubmittal.id);

      if (error) throw error;

      toast({
        title: "Submittal updated",
        description: "Submittal has been updated successfully."
      });

      setIsEditSubmittalDialogOpen(false);
      setEditingSubmittal(null);
      setEditedSubmittal({
        title: '',
        description: '',
        spec_section: '',
        priority: 'medium',
        due_date: '',
        status: 'draft'
      });
      
      loadProjectData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating submittal",
        description: error.message
      });
    }
  };

  const handleCreateChangeOrder = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('change-orders', {
        body: {
          action: 'create',
          project_id: projectId,
          title: newChangeOrder.title,
          description: newChangeOrder.description,
          amount: newChangeOrder.amount,
          reason: newChangeOrder.reason,
          assigned_approvers: selectedApprovers,
          approval_due_date: approvalDueDate || null,
          approval_notes: newChangeOrder.approval_notes || null
        }
      });

      if (error) throw error;

      setAddChangeOrderDialogOpen(false);
      setNewChangeOrder({
        change_order_number: '',
        title: '',
        description: '',
        amount: 0,
        reason: '',
        status: 'pending',
        assigned_approvers: [],
        approval_due_date: '',
        approval_notes: ''
      });
      setSelectedApprovers([]);
      setApprovalDueDate('');

      // Refresh change orders list
      loadChangeOrders();

      toast({
        title: "Change order added",
        description: "Change order has been added to the project."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding change order",
        description: error.message
      });
    }
  };

  const handleCreatePunchListItem = async () => {
    if (!newPunchListItem.description) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Description is required."
      });
      return;
    }

    try {
      console.log('Creating punch list item with data:', {
        item_number: newPunchListItem.item_number || `PLI-${Date.now().toString().slice(-8)}`,
        description: newPunchListItem.description,
        location: newPunchListItem.location || null,
        trade: newPunchListItem.trade || null,
        priority: newPunchListItem.priority,
        assigned_to: newPunchListItem.assigned_to || null,
        project_id: projectId,
        company_id: userProfile?.company_id,
        created_by: user?.id
      });

      const { data, error } = await supabase
        .from('punch_list_items')
        .insert({
          item_number: newPunchListItem.item_number || `PLI-${Date.now().toString().slice(-8)}`,
          description: newPunchListItem.description,
          category: newPunchListItem.category,
          location: newPunchListItem.location || null,
          trade: newPunchListItem.trade || null,
          priority: newPunchListItem.priority,
          assigned_to: newPunchListItem.assigned_to || null,
          due_date: newPunchListItem.due_date || null,
          project_id: projectId,
          company_id: userProfile?.company_id,
          created_by: user?.id
        })
        .select();

      console.log('Insert result:', { data, error });

      if (error) throw error;

      setAddPunchListDialogOpen(false);
      setNewPunchListItem({
        item_number: '',
        description: '',
        priority: 'medium',
        category: 'quality',
        location: '',
        trade: '',
        assigned_to: '',
        date_identified: '',
        due_date: ''
      });

      toast({
        title: "Punch list item added",
        description: "Punch list item has been added to the project."
      });
      
      loadPunchListItems();
    } catch (error: any) {
      console.error('Error creating punch list item:', error);
      toast({
        variant: "destructive",
        title: "Error adding punch list item",
        description: error.message
      });
    }
  };

  const handleEditPunchListItem = async () => {
    if (!editingPunchListItem || !editingPunchListItem.id) return;

    try {
      const { error } = await supabase
        .from('punch_list_items')
        .update({
          description: editingPunchListItem.description,
          category: editingPunchListItem.category,
          priority: editingPunchListItem.priority,
          location: editingPunchListItem.location,
          trade: editingPunchListItem.trade,
          due_date: editingPunchListItem.due_date || null,
          assigned_to: editingPunchListItem.assigned_to || null
        })
        .eq('id', editingPunchListItem.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Punch list item updated successfully."
      });

      setEditPunchListDialogOpen(false);
      setEditingPunchListItem(null);
      loadPunchListItems();
    } catch (error) {
      console.error('Error updating punch list item:', error);
      toast({
        variant: "destructive",
        title: "Error updating punch list item",
        description: "There was a problem updating the punch list item."
      });
    }
  };

  const handleCreateEquipment = async () => {
    try {
      const { error } = await supabase
        .from('equipment')
        .insert({
          name: newEquipment.equipment_name,
          equipment_type: newEquipment.equipment_type,
          model: newEquipment.model,
          serial_number: newEquipment.serial_number,
          purchase_date: newEquipment.purchase_date,
          status: newEquipment.status,
          description: `${newEquipment.equipment_name} - ${newEquipment.manufacturer}`,
          company_id: userProfile?.company_id,
          created_by: user?.id
        });

      if (error) throw error;

      setAddEquipmentDialogOpen(false);
      setNewEquipment({
        equipment_name: '',
        equipment_type: '',
        manufacturer: '',
        model: '',
        serial_number: '',
        purchase_date: '',
        status: 'active'
      });

      toast({
        title: "Equipment added",
        description: "Equipment has been added to the company inventory."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding equipment",
        description: error.message
      });
    }
  };

  const navigateToMaterials = () => {
    navigate('/materials', { state: { projectFilter: projectId } });
  };

  const navigateToJobCosting = () => {
    navigate('/job-costing', { state: { projectFilter: projectId } });
  };

  const navigateToDailyReports = () => {
    navigate('/daily-reports', { state: { projectFilter: projectId } });
  };

  const navigateToTeamManagement = () => {
    navigate('/team');
  };

  const navigateToRFIs = () => {
    navigate('/rfis', { state: { projectFilter: projectId } });
  };

  const loadPunchListItems = async () => {
    if (!projectId) return;
    
    setPunchListLoading(true);
    try {
      const { data, error } = await supabase
        .from('punch_list_items')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      console.log('Punch list query result:', { data, error });

      if (error) throw error;
      setPunchListItems((data || []) as any);
    } catch (error) {
      console.error('Error loading punch list items:', error);
      toast({
        variant: "destructive",
        title: "Error loading punch list items",
        description: "There was a problem loading the punch list items."
      });
    } finally {
      setPunchListLoading(false);
    }
  };

  const loadPermits = async () => {
    if (!projectId) return;
    
    setPermitsLoading(true);
    try {
      const { data, error } = await supabase
        .from('permits')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPermits((data || []) as any);
    } catch (error) {
      console.error('Error loading permits:', error);
      toast({
        variant: "destructive",
        title: "Error loading permits",
        description: "There was a problem loading the permits."
      });
    } finally {
      setPermitsLoading(false);
    }
  };

  const loadWarranties = async () => {
    if (!projectId) return;
    
    setWarrantiesLoading(true);
    try {
      const { data, error } = await supabase
        .from('warranties')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWarranties((data || []) as any);
    } catch (error) {
      console.error('Error loading warranties:', error);
      toast({
        variant: "destructive",
        title: "Error loading warranties",
        description: "There was a problem loading the warranties."
      });
    } finally {
      setWarrantiesLoading(false);
    }
  };

  const loadChangeOrders = async () => {
    if (!projectId) return;
    
    setChangeOrdersLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('change-orders', {
        body: {
          action: 'list',
          project_id: projectId
        }
      });

      if (error) throw error;
      setChangeOrders(data?.changeOrders || []);
    } catch (error: any) {
      console.error('Error loading change orders:', error);
      toast({
        variant: "destructive",
        title: "Error loading change orders",
        description: "There was a problem loading the change orders."
      });
    } finally {
      setChangeOrdersLoading(false);
    }
  };

  const loadProjectData = async () => {
    try {
      setLoadingProject(true);
      
      // Load project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);
      
      // Set form defaults
      setEditedClient({
        client_name: projectData?.client_name || '',
        client_email: projectData?.client_email || ''
      });
      
      setEditedProject({
        name: projectData?.name || '',
        description: projectData?.description || '',
        budget: projectData?.budget || 0,
        start_date: projectData?.start_date || '',
        end_date: projectData?.end_date || '',
        status: projectData?.status || '',
        project_type: projectData?.project_type || ''
      });

      // Load project phases
      const { data: phasesData, error: phasesError } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index', { ascending: true });

      if (phasesError) throw phasesError;
      setPhases(phasesData || []);

      // Load project tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // Load materials
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (materialsError) throw materialsError;
      setMaterials(materialsData || []);

      // Load daily reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('project_id', projectId)
        .order('date', { ascending: false });

      if (reportsError) throw reportsError;
      setReports(reportsData || []);

      // Load job costs
      const { data: jobCostsData, error: jobCostsError } = await supabase
        .from('job_costs')
        .select(`
          *,
          cost_codes(code, name, category)
        `)
        .eq('project_id', projectId)
        .order('date', { ascending: false });

      if (jobCostsError) throw jobCostsError;
      setJobCosts(jobCostsData || []);

      // Load RFIs
      const { data: rfisData, error: rfisError } = await supabase
        .from('rfis')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (rfisError) throw rfisError;
      setRfis(rfisData || []);

      // Load Submittals
      const { data: submittalsData, error: submittalsError } = await supabase
        .from('submittals')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (submittalsError) throw submittalsError;
      setSubmittals(submittalsData || []);

    } catch (error: any) {
      console.error('Error loading project:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load project details"
      });
    } finally {
      setLoadingProject(false);
    }
  };

  if (loading || loadingProject) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Project not found</p>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'in_progress':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'on_hold':
        return 'outline';
      case 'planning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen bg-background">
        <SimplifiedSidebar />
        <div className="flex-1">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Mobile Header */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between h-14 min-h-[3.5rem]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center px-2">
                <h1 className="text-lg font-semibold text-card-foreground truncate">{project.name}</h1>
                <p className="text-xs text-muted-foreground truncate">{project.client_name}</p>
              </div>
              <Badge variant={getStatusColor(project.status)} className="text-xs px-2 py-1">
                {project.status.replace('_', ' ')}
              </Badge>
            </div>
            {/* Mobile Edit Button Row */}
            <div className="pb-3 pt-1">
              <Dialog open={editProjectDialogOpen} onOpenChange={setEditProjectDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="w-full">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Project
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-xl font-semibold text-card-foreground">{project.name}</h1>
                <p className="text-sm text-muted-foreground">{project.client_name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={getStatusColor(project.status)}>
                {project.status.replace('_', ' ')}
              </Badge>
              <Dialog open={editProjectDialogOpen} onOpenChange={setEditProjectDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Project
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Sub-Sidebar */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Desktop Sub-Sidebar */}
        <div className="hidden lg:block">
          <ProjectSubSidebar 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
          />
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              {/* Mobile/Tablet Navigation */}
              <div className="lg:hidden mb-4">
            <div className="bg-card border rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-muted-foreground">Project Section</h2>
                <Badge variant="outline" className="text-xs">
                  {activeTab === 'overview' ? 'Overview' :
                   activeTab === 'materials' ? 'Materials' :
                   activeTab === 'progress' ? 'Progress' :
                   activeTab === 'dailyreports' ? 'Daily Reports' :
                   activeTab === 'jobcosting' ? 'Job Costing' :
                   activeTab === 'rfis' ? "RFI's" :
                   activeTab === 'submittals' ? 'Submittals' :
                   activeTab === 'changeorders' ? 'Change Orders' :
                   activeTab === 'punchlist' ? 'Punch List' :
                   activeTab === 'equipment' ? 'Equipment' :
                   activeTab === 'permits' ? 'Permits' :
                   activeTab === 'warranties' ? 'Warranties' :
                   activeTab === 'contacts' ? 'Contacts' :
                   activeTab === 'invoicing' ? 'Invoicing' :
                   activeTab === 'tasks' ? 'Tasks' :
                   activeTab === 'documents' ? 'Documents' : activeTab}
                </Badge>
              </div>
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full h-12 text-left">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent className="max-h-[70vh] overflow-y-auto">
                  <div className="p-2">
                    <div className="text-xs font-medium text-muted-foreground mb-2 px-2">MAIN SECTIONS</div>
                    <SelectItem value="overview" className="flex items-center py-3">
                      <span className="mr-3">📊</span>
                      <span>Overview</span>
                    </SelectItem>
                    <SelectItem value="progress" className="flex items-center py-3">
                      <span className="mr-3">📈</span>
                      <span>Progress</span>
                    </SelectItem>
                    <SelectItem value="tasks" className="flex items-center py-3">
                      <span className="mr-3">📋</span>
                      <span>Tasks</span>
                    </SelectItem>
                  </div>
                  
                  <div className="p-2 border-t">
                    <div className="text-xs font-medium text-muted-foreground mb-2 px-2">RESOURCES</div>
                    <SelectItem value="materials" className="flex items-center py-3">
                      <span className="mr-3">📦</span>
                      <span>Materials</span>
                    </SelectItem>
                    <SelectItem value="equipment" className="flex items-center py-3">
                      <span className="mr-3">🚜</span>
                      <span>Equipment</span>
                    </SelectItem>
                    <SelectItem value="contacts" className="flex items-center py-3">
                      <span className="mr-3">👥</span>
                      <span>Contacts</span>
                    </SelectItem>
                  </div>

                  <div className="p-2 border-t">
                    <div className="text-xs font-medium text-muted-foreground mb-2 px-2">PROJECT MANAGEMENT</div>
                    <SelectItem value="jobcosting" className="flex items-center py-3">
                      <span className="mr-3">💰</span>
                      <span>Job Costing</span>
                    </SelectItem>
                    <SelectItem value="changeorders" className="flex items-center py-3">
                      <span className="mr-3">🔄</span>
                      <span>Change Orders</span>
                    </SelectItem>
                    <SelectItem value="rfis" className="flex items-center py-3">
                      <span className="mr-3">❓</span>
                      <span>RFI's</span>
                    </SelectItem>
                    <SelectItem value="submittals" className="flex items-center py-3">
                      <span className="mr-3">📋</span>
                      <span>Submittals</span>
                    </SelectItem>
                    <SelectItem value="punchlist" className="flex items-center py-3">
                      <span className="mr-3">✅</span>
                      <span>Punch List</span>
                    </SelectItem>
                  </div>

                  <div className="p-2 border-t">
                    <div className="text-xs font-medium text-muted-foreground mb-2 px-2">REPORTS & DOCS</div>
                    <SelectItem value="dailyreports" className="flex items-center py-3">
                      <span className="mr-3">📝</span>
                      <span>Daily Reports</span>
                    </SelectItem>
                    <SelectItem value="documents" className="flex items-center py-3">
                      <span className="mr-3">📁</span>
                      <span>Documents</span>
                    </SelectItem>
                    <SelectItem value="invoicing" className="flex items-center py-3">
                      <span className="mr-3">💳</span>
                      <span>Invoicing</span>
                    </SelectItem>
                  </div>

                  <div className="p-2 border-t">
                    <div className="text-xs font-medium text-muted-foreground mb-2 px-2">COMPLIANCE</div>
                    <SelectItem value="permits" className="flex items-center py-3">
                      <span className="mr-3">📄</span>
                      <span>Permits</span>
                    </SelectItem>
                    <SelectItem value="warranties" className="flex items-center py-3">
                      <span className="mr-3">🛡️</span>
                      <span>Warranties</span>
                    </SelectItem>
                  </div>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <EnhancedProjectOverview projectId={projectId!} />
          </TabsContent>


          <TabsContent value="phases" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Project Phases</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Phase
              </Button>
            </div>
            
            {phases.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No phases created yet</p>
                  <Button variant="outline" className="mt-4">
                    Create First Phase
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {phases.map((phase, index) => (
                  <Card key={phase.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center">
                            <span className="bg-construction-blue text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">
                              {index + 1}
                            </span>
                            {phase.name}
                          </CardTitle>
                          {phase.description && (
                            <CardDescription>{phase.description}</CardDescription>
                          )}
                        </div>
                        <Badge variant={getStatusColor(phase.status)}>
                          {phase.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Start Date</Label>
                          <p className="text-sm">
                            {phase.start_date ? new Date(phase.start_date).toLocaleDateString() : 'Not set'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">End Date</Label>
                          <p className="text-sm">
                            {phase.end_date ? new Date(phase.end_date).toLocaleDateString() : 'Not set'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Budget</Label>
                          <p className="text-sm">${phase.estimated_budget?.toLocaleString() || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Actual Cost</Label>
                          <p className="text-sm">${phase.actual_cost?.toLocaleString() || '0'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <TaskManager projectId={projectId} />
          </TabsContent>

          <TabsContent value="materials" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Project Materials</h2>
              <div className="flex gap-2">
                <Dialog open={createMaterialDialogOpen} onOpenChange={setCreateMaterialDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Material
                    </Button>
                  </DialogTrigger>
                </Dialog>
                <Button variant="outline" onClick={navigateToMaterials}>
                  <Package className="h-4 w-4 mr-2" />
                  View All Materials
                </Button>
              </div>
            </div>
            
            {materials.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Track materials specific to this project</p>
                  <Dialog open={createMaterialDialogOpen} onOpenChange={setCreateMaterialDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="mt-4">
                        Add First Material
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {materials.map((material) => (
                  <Card key={material.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{material.name}</h3>
                          <p className="text-sm text-muted-foreground">{material.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{material.quantity_available} {material.unit}</p>
                          <p className="text-sm text-muted-foreground">${material.unit_cost}/unit</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Progress Tracking</h2>
              <div className="text-sm text-muted-foreground">
                Auto-calculated from task completion
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Overall Progress</CardTitle>
                  <CardDescription>
                    Automatically calculated from {tasks.length} tasks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Project Completion</span>
                        <span className="font-medium">{project.completion_percentage}%</span>
                      </div>
                      <Progress value={project.completion_percentage} />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>
                          {tasks.filter(t => t.status === 'completed').length} of {tasks.length} tasks completed
                        </span>
                        <span>
                          Avg: {tasks.length > 0 ? Math.round(tasks.reduce((sum, t) => sum + t.completion_percentage, 0) / tasks.length) : 0}%
                        </span>
                      </div>
                    </div>
                    
                    {/* Task Breakdown */}
                    <div className="border-t pt-4">
                      <div className="text-sm font-medium mb-2">Task Progress Breakdown</div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {tasks.slice(0, 5).map((task) => (
                          <div key={task.id} className="flex items-center justify-between text-xs">
                            <span className="truncate flex-1 mr-2">{task.name}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-16 h-1 bg-secondary rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary transition-all"
                                  style={{ width: `${task.completion_percentage}%` }}
                                />
                              </div>
                              <span className="w-8 text-right">{task.completion_percentage}%</span>
                            </div>
                          </div>
                        ))}
                        {tasks.length > 5 && (
                          <div className="text-xs text-muted-foreground text-center pt-1">
                            +{tasks.length - 5} more tasks
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Progress Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Completed Tasks</span>
                        <span className="text-green-600 font-medium">
                          {tasks.filter(t => t.status === 'completed').length}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>In Progress</span>
                        <span className="text-blue-600 font-medium">
                          {tasks.filter(t => t.status === 'in_progress').length}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Pending</span>
                        <span className="text-orange-600 font-medium">
                          {tasks.filter(t => t.status === 'pending' || t.status === 'todo').length}
                        </span>
                      </div>
                    </div>
                    
                    {tasks.length > 0 && (
                      <div className="border-t pt-4">
                        <div className="text-sm font-medium mb-2">Next Actions</div>
                        {tasks.filter(t => t.status !== 'completed').slice(0, 3).map((task) => (
                          <div key={task.id} className="text-xs text-muted-foreground mb-1">
                            • {task.name} ({task.completion_percentage}%)
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="dailyreports" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Daily Reports</h2>
              <Button onClick={navigateToDailyReports}>
                <FileText className="h-4 w-4 mr-2" />
                Manage Reports
              </Button>
            </div>
            
            {reports.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Daily progress reports for this project</p>
                  <Dialog open={createReportDialogOpen} onOpenChange={setCreateReportDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="mt-4">
                        Create Today's Report
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {reports.map((report) => (
                  <Card key={report.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">
                          {new Date(report.date).toLocaleDateString()}
                        </h3>
                        <Badge variant="outline">
                          {report.crew_count} crew
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {report.work_performed}
                      </p>
                      {report.weather_conditions && (
                        <p className="text-xs text-muted-foreground">
                          Weather: {report.weather_conditions}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="permits" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Project Permits</h2>
              <div className="flex space-x-2">
                <Button onClick={() => setAddPermitDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Permit
                </Button>
                <Button variant="outline" onClick={() => navigate('/permit-management')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Manage All Permits
                </Button>
              </div>
            </div>
            
            {permitsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading permits...</p>
                </div>
              </div>
            ) : permits.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No permits added to this project yet</p>
                  <Button onClick={() => setAddPermitDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Permit
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {permits.map((permit) => (
                  <Card key={permit.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline">{permit.permit_number || 'No Number'}</Badge>
                          <CardTitle className="text-lg">{permit.permit_name}</CardTitle>
                          <Badge variant={
                            permit.application_status === 'approved' ? 'default' :
                            permit.application_status === 'submitted' ? 'secondary' :
                            permit.application_status === 'under_review' ? 'default' :
                            'secondary'
                          }>
                            {permit.application_status?.replace('_', ' ') || 'not applied'}
                          </Badge>
                        </div>
                        <Badge variant={
                          permit.priority === 'urgent' ? 'destructive' : 
                          permit.priority === 'high' ? 'destructive' : 
                          permit.priority === 'medium' ? 'default' : 
                          'secondary'
                        }>
                          {permit.priority} priority
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Type</Label>
                            <p>{permit.permit_type || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Issuing Authority</Label>
                            <p>{permit.issuing_authority || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Application Date</Label>
                            <p>{permit.application_date ? new Date(permit.application_date).toLocaleDateString() : 'Not set'}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Expiry Date</Label>
                            <p>{permit.permit_expiry_date ? new Date(permit.permit_expiry_date).toLocaleDateString() : 'Not set'}</p>
                          </div>
                        </div>
                        
                        {permit.description && (
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                            <p className="text-sm">{permit.description}</p>
                          </div>
                        )}
                        
                        <div className="flex justify-end space-x-2 mt-3">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setEditingPermit(permit);
                              setEditPermitDialogOpen(true);
                            }}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate('/permit-management')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View All
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="warranties" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Project Warranties</h2>
              <div className="flex gap-2">
                <Button onClick={() => setAddWarrantyDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Warranty
                </Button>
                <Button variant="outline" onClick={() => navigate('/warranty-management')}>
                  <Wrench className="h-4 w-4 mr-2" />
                  View All Warranties
                </Button>
              </div>
            </div>
            
            {warrantiesLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading warranties...</p>
                </div>
              </div>
            ) : warranties.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No warranties added to this project yet</p>
                  <Button onClick={() => setAddWarrantyDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Warranty
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {warranties.map((warranty) => (
                  <Card key={warranty.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline">{warranty.warranty_type || 'General'}</Badge>
                          <CardTitle className="text-lg">{warranty.item_name}</CardTitle>
                          <Badge variant={
                            warranty.status === 'active' ? 'default' :
                            warranty.status === 'expired' ? 'destructive' :
                            warranty.status === 'transferred' ? 'secondary' :
                            'secondary'
                          }>
                            {warranty.status || 'active'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Manufacturer</Label>
                            <p>{warranty.manufacturer || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Start Date</Label>
                            <p>{warranty.warranty_start_date ? new Date(warranty.warranty_start_date).toLocaleDateString() : 'Not set'}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">End Date</Label>
                            <p>{warranty.warranty_end_date ? new Date(warranty.warranty_end_date).toLocaleDateString() : 'Not calculated'}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Duration</Label>
                            <p>{warranty.warranty_duration_months || 12} months</p>
                          </div>
                        </div>
                        
                        {warranty.item_description && (
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                            <p className="text-sm">{warranty.item_description}</p>
                          </div>
                        )}
                        
                        <div className="flex justify-end space-x-2 mt-3">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setEditingWarranty(warranty);
                              setEditWarrantyDialogOpen(true);
                            }}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate('/warranty-management')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View All
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="contacts" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Project Contacts</h2>
              <div className="flex gap-2">
                <Dialog open={addContactDialogOpen} onOpenChange={setAddContactDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Contact
                    </Button>
                  </DialogTrigger>
                </Dialog>
                <Dialog open={addExistingContactDialogOpen} onOpenChange={setAddExistingContactDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Users className="h-4 w-4 mr-2" />
                      Add Existing Contact
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Client Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Primary Contact</Label>
                    <p className="text-sm">{project.client_name}</p>
                  </div>
                  {project.client_email && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="text-sm">{project.client_email}</p>
                    </div>
                  )}
                  <Dialog open={editClientDialogOpen} onOpenChange={setEditClientDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Edit className="h-3 w-3 mr-1" />
                        Edit Client Info
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Project Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-construction-blue flex items-center justify-center text-white text-xs">
                        PM
                      </div>
                      <div>
                        <p className="text-sm font-medium">Project Manager</p>
                        <p className="text-xs text-muted-foreground">Not assigned</p>
                      </div>
                    </div>
                    <Dialog open={addTeamMemberDialogOpen} onOpenChange={setAddTeamMemberDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="h-3 w-3 mr-1" />
                          Add Team Member
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Project Contacts List */}
            <Card>
              <CardHeader>
                <CardTitle>Project Contacts</CardTitle>
                <CardDescription>
                  Contacts associated with this specific project
                </CardDescription>
              </CardHeader>
              <CardContent>
                {projectContactsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-construction-blue mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading project contacts...</p>
                  </div>
                ) : projectContacts.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No contacts assigned to this project yet</p>
                    <div className="flex gap-2 justify-center mt-4">
                      <Dialog open={addContactDialogOpen} onOpenChange={setAddContactDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline">
                            Create New Contact
                          </Button>
                        </DialogTrigger>
                      </Dialog>
                      <Dialog open={addExistingContactDialogOpen} onOpenChange={setAddExistingContactDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline">
                            Add Existing Contact
                          </Button>
                        </DialogTrigger>
                      </Dialog>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projectContacts.map((projectContact) => (
                      <Card key={projectContact.id} className="relative">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-construction-blue flex items-center justify-center text-white text-sm font-medium">
                                {projectContact.contact.first_name?.[0]}{projectContact.contact.last_name?.[0]}
                              </div>
                              <div>
                                <CardTitle className="text-sm">
                                  {projectContact.contact.first_name} {projectContact.contact.last_name}
                                </CardTitle>
                                <Badge variant="outline" className="text-xs">
                                  {projectContact.role}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveProjectContact(projectContact.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-2 text-xs">
                            {projectContact.contact.email && (
                              <div className="flex items-center space-x-2 text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span>{projectContact.contact.email}</span>
                              </div>
                            )}
                            {projectContact.contact.phone && (
                              <div className="flex items-center space-x-2 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span>{projectContact.contact.phone}</span>
                              </div>
                            )}
                            {projectContact.contact.company_name && (
                              <div className="flex items-center space-x-2 text-muted-foreground">
                                <Building2 className="h-3 w-3" />
                                <span>{projectContact.contact.company_name}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoicing" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Project Invoicing</h2>
              <Dialog open={createInvoiceDialogOpen} onOpenChange={setCreateInvoiceDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">$0</p>
                    <p className="text-sm text-muted-foreground">Total Invoiced</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">$0</p>
                    <p className="text-sm text-muted-foreground">Outstanding</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">${project.budget?.toLocaleString() || '0'}</p>
                    <p className="text-sm text-muted-foreground">Total Budget</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="text-center py-8">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No invoices created for this project yet</p>
                <Dialog open={createInvoiceDialogOpen} onOpenChange={setCreateInvoiceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="mt-4">
                      Create First Invoice
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Documents</h2>
              <div className="flex gap-2">
                <Dialog open={addDocumentDialogOpen} onOpenChange={setAddDocumentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Document
                    </Button>
                  </DialogTrigger>
                </Dialog>
                <Button variant="outline" onClick={() => navigate(`/project/${projectId}/documents`)}>
                  <FileText className="h-4 w-4 mr-2" />
                  View All Documents
                </Button>
              </div>
            </div>
            
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Upload and manage project documents</p>
                <Dialog open={addDocumentDialogOpen} onOpenChange={setAddDocumentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="mt-4">
                      Add First Document
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobcosting" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Job Costing</h2>
              <Button variant="outline" onClick={navigateToJobCosting}>
                <DollarSign className="h-4 w-4 mr-2" />
                Manage Job Costs
              </Button>
            </div>
            
            {jobCosts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Track labor, material, and equipment costs for this project</p>
                  <Button variant="outline" onClick={navigateToJobCosting} className="mt-4">
                    Add First Job Cost
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <RealTimeJobCosting projectId={projectId} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="rfis" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">RFI's (Request for Information)</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={navigateToRFIs}>
                  <FileText className="h-4 w-4 mr-2" />
                  View All RFIs
                </Button>
                <Dialog open={addRfiDialogOpen} onOpenChange={setAddRfiDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add RFI
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </div>
            
            {rfis.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No RFIs for this project yet</p>
                  <Button onClick={() => setAddRfiDialogOpen(true)} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First RFI
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {rfis.slice(0, 5).map((rfi) => (
                  <Card key={rfi.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{rfi.subject}</h3>
                            <Badge variant={rfi.status === 'submitted' ? 'outline' : rfi.status === 'responded' ? 'default' : 'secondary'}>
                              {rfi.status}
                            </Badge>
                            <Badge variant={rfi.priority === 'urgent' ? 'destructive' : rfi.priority === 'high' ? 'secondary' : 'outline'}>
                              {rfi.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{rfi.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Created: {new Date(rfi.created_at).toLocaleDateString()}</span>
                            {rfi.due_date && <span>Due: {new Date(rfi.due_date).toLocaleDateString()}</span>}
                            {rfi.submitted_to && <span>To: {rfi.submitted_to}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRFI(rfi)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {rfis.length > 5 && (
                  <Card>
                    <CardContent className="text-center py-4">
                      <Button variant="outline" onClick={navigateToRFIs}>
                        View All {rfis.length} RFIs
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="submittals" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Submittals</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/submittals')}>
                  <FileText className="h-4 w-4 mr-2" />
                  View All Submittals
                </Button>
                <Dialog open={addSubmittalDialogOpen} onOpenChange={setAddSubmittalDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Submittal
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </div>
            
            {submittals.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No submittals for this project yet</p>
                  <Button onClick={() => setAddSubmittalDialogOpen(true)} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Submittal
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                
                <div className="grid gap-4">
                  {submittals.slice(0, 5).map((submittal) => (
                    <Card key={submittal.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium">{submittal.title}</h3>
                              <Badge variant="outline">#{submittal.submittal_number}</Badge>
                              <Badge variant={submittal.status === 'draft' ? 'outline' : submittal.status === 'submitted' ? 'secondary' : submittal.status === 'approved' ? 'default' : 'destructive'}>
                                {submittal.status}
                              </Badge>
                              <Badge variant={submittal.priority === 'urgent' ? 'destructive' : submittal.priority === 'high' ? 'secondary' : 'outline'}>
                                {submittal.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{submittal.description}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Created: {new Date(submittal.created_at).toLocaleDateString()}</span>
                              {submittal.due_date && <span>Due: {new Date(submittal.due_date).toLocaleDateString()}</span>}
                              {submittal.spec_section && <span>Spec: {submittal.spec_section}</span>}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditSubmittal(submittal)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {submittals.length > 5 && (
                  <Card>
                    <CardContent className="text-center py-4">
                      <Button 
                        variant="outline" 
                        onClick={() => navigate('/submittals', { state: { selectedProjectId: projectId } })}
                      >
                        View All {submittals.length} Submittals
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="changeorders" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Change Orders</h2>
              <Dialog open={addChangeOrderDialogOpen} onOpenChange={setAddChangeOrderDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Change Order
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
            
            {changeOrdersLoading ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-construction-blue mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading change orders...</p>
                </CardContent>
              </Card>
            ) : changeOrders.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Edit className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No change orders yet</p>
                  <p className="text-sm text-muted-foreground mt-2">Track project changes and cost adjustments</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {changeOrders.map((order: any) => (
                  <Card key={order.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{order.title}</CardTitle>
                          <CardDescription>
                            {order.change_order_number} • ${order.amount?.toLocaleString()}
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={order.status === 'approved' ? 'default' : order.status === 'pending' ? 'secondary' : 'outline'}>
                            {order.status}
                          </Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setEditingChangeOrder(order);
                              setEditChangeOrderDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{order.description}</p>
                      {order.reason && (
                        <p className="text-sm text-muted-foreground mt-2">
                          <span className="font-medium">Reason:</span> {order.reason}
                        </p>
                      )}
                      {order.assigned_approvers && order.assigned_approvers.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          <span className="font-medium">Approvers:</span> {order.assigned_approvers.length} assigned
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="punchlist" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Punch List</h2>
              <Dialog open={addPunchListDialogOpen} onOpenChange={setAddPunchListDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Punch List Item
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
            
            {punchListLoading ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-construction-blue mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading punch list items...</p>
                </CardContent>
              </Card>
            ) : punchListItems.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No punch list items yet</p>
                  <Button variant="outline" className="mt-4" onClick={() => setAddPunchListDialogOpen(true)}>
                    Create First Punch List Item
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {punchListItems.map((item) => (
                  <Card key={item.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline">{item.item_number}</Badge>
                          <CardTitle className="text-lg">{item.description}</CardTitle>
                          <Badge variant={
                            item.priority === 'high' ? 'destructive' : 
                            item.priority === 'medium' ? 'default' : 
                            'secondary'
                          }>
                            {item.priority} priority
                          </Badge>
                        </div>
                         <Badge variant={
                           item.status === 'completed' ? 'default' :
                           item.status === 'in_progress' ? 'default' :
                           'secondary'
                         }>
                          {item.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Item #{item.item_number}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Location</Label>
                            <p>{item.location || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Trade</Label>
                            <p>{item.trade || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Identified</Label>
                            <p>{item.date_identified ? new Date(item.date_identified).toLocaleDateString() : 'Not set'}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Completed</Label>
                            <p>{item.date_completed ? new Date(item.date_completed).toLocaleDateString() : 'Not completed'}</p>
                          </div>
                        </div>

                        {item.assignee && (
                          <div className="text-sm">
                            <Label className="text-xs font-medium text-muted-foreground">Assigned to</Label>
                            <p>{item.assignee.first_name} {item.assignee.last_name}</p>
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          Created {new Date(item.created_at).toLocaleDateString()} by {item.creator?.first_name} {item.creator?.last_name}
                        </div>
                        
                        <div className="flex justify-end space-x-2 mt-3">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setEditingPunchListItem(item);
                              setEditPunchListDialogOpen(true);
                            }}
                          >
                            <User className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="estimates" className="space-y-6">
            <ProjectEstimates projectId={projectId!} />
          </TabsContent>

          <TabsContent value="equipment" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Equipment</h2>
              <Dialog open={addEquipmentDialogOpen} onOpenChange={setAddEquipmentDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Equipment
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
            
            <Card>
              <CardContent className="text-center py-8">
                <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Manage equipment and tools for this project</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Task Dialog */}
      <Dialog open={editTaskDialogOpen} onOpenChange={setEditTaskDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-task-name">Task Name</Label>
                <Input
                  id="edit-task-name"
                  value={editingTask.name}
                  onChange={(e) => setEditingTask(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter task name"
                />
              </div>
              <div>
                <Label htmlFor="edit-task-description">Description</Label>
                <Textarea
                  id="edit-task-description"
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Task description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-task-priority">Priority</Label>
                  <Select 
                    value={editingTask.priority} 
                    onValueChange={(value) => setEditingTask(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-task-status">Status</Label>
                  <Select 
                    value={editingTask.status} 
                    onValueChange={(value) => setEditingTask(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-task-estimated-hours">Estimated Hours</Label>
                  <Input
                    id="edit-task-estimated-hours"
                    type="number"
                    value={editingTask.estimated_hours || 0}
                    onChange={(e) => setEditingTask(prev => ({ ...prev, estimated_hours: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-task-actual-hours">Actual Hours</Label>
                  <Input
                    id="edit-task-actual-hours"
                    type="number"
                    value={editingTask.actual_hours || 0}
                    onChange={(e) => setEditingTask(prev => ({ ...prev, actual_hours: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-task-due-date">Due Date</Label>
                  <Input
                    id="edit-task-due-date"
                    type="date"
                    value={editingTask.due_date || ''}
                    onChange={(e) => setEditingTask(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-task-progress">Progress ({editingTask.completion_percentage}%)</Label>
                  <Slider
                    value={[editingTask.completion_percentage || 0]}
                    onValueChange={([value]) => setEditingTask(prev => ({ ...prev, completion_percentage: value }))}
                    max={100}
                    step={5}
                    className="w-full mt-2"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setEditTaskDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateTask}>
                  Update Task
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Daily Report Dialog */}
      <Dialog open={createReportDialogOpen} onOpenChange={setCreateReportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Daily Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="report-date">Report Date</Label>
              <Input
                id="report-date"
                type="date"
                value={newReport.date}
                onChange={(e) => setNewReport(prev => ({ ...prev, date: e.target.value }))}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="work-performed">Work Performed</Label>
              <Textarea
                id="work-performed"
                value={newReport.work_performed}
                onChange={(e) => setNewReport(prev => ({ ...prev, work_performed: e.target.value }))}
                placeholder="Describe the work performed today"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="crew-count">Crew Count</Label>
                        <Input
                          id="crew-count"
                          type="number"
                          placeholder="Enter crew count"
                          value={newReport.crew_count === 0 ? '' : newReport.crew_count}
                          onChange={(e) => setNewReport(prev => ({ ...prev, crew_count: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
              <div>
                <Label htmlFor="weather">Weather Conditions</Label>
                <Input
                  id="weather"
                  value={newReport.weather_conditions}
                  onChange={(e) => setNewReport(prev => ({ ...prev, weather_conditions: e.target.value }))}
                  placeholder="Weather conditions"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="materials-delivered">Materials Delivered</Label>
              <Textarea
                id="materials-delivered"
                value={newReport.materials_delivered}
                onChange={(e) => setNewReport(prev => ({ ...prev, materials_delivered: e.target.value }))}
                placeholder="Materials delivered to site"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="equipment-used">Equipment Used</Label>
              <Textarea
                id="equipment-used"
                value={newReport.equipment_used}
                onChange={(e) => setNewReport(prev => ({ ...prev, equipment_used: e.target.value }))}
                placeholder="Equipment and tools used"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="delays-issues">Delays/Issues</Label>
              <Textarea
                id="delays-issues"
                value={newReport.delays_issues}
                onChange={(e) => setNewReport(prev => ({ ...prev, delays_issues: e.target.value }))}
                placeholder="Any delays or issues encountered"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="safety-incidents">Safety Incidents</Label>
              <Textarea
                id="safety-incidents"
                value={newReport.safety_incidents}
                onChange={(e) => setNewReport(prev => ({ ...prev, safety_incidents: e.target.value }))}
                placeholder="Any safety incidents or observations"
                rows={2}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setCreateReportDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDailyReport}>
                Submit Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={editClientDialogOpen} onOpenChange={setEditClientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="client-name">Client Name</Label>
              <Input
                id="client-name"
                value={editedClient.client_name}
                onChange={(e) => setEditedClient(prev => ({ ...prev, client_name: e.target.value }))}
                placeholder="Client name"
              />
            </div>
            <div>
              <Label htmlFor="client-email">Client Email</Label>
              <Input
                id="client-email"
                type="email"
                value={editedClient.client_email}
                onChange={(e) => setEditedClient(prev => ({ ...prev, client_email: e.target.value }))}
                placeholder="Client email"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setEditClientDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateClientInfo}>
                Update Client Info
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog open={createInvoiceDialogOpen} onOpenChange={setCreateInvoiceDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          <InvoiceGenerator 
            projectId={projectId} 
            onInvoiceCreated={() => {
              setCreateInvoiceDialogOpen(false);
              toast({
                title: "Invoice created",
                description: "Invoice has been generated successfully."
              });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={editProjectDialogOpen} onOpenChange={setEditProjectDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={editedProject.name}
                onChange={(e) => setEditedProject(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Project name"
              />
            </div>
            <div>
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                value={editedProject.description}
                onChange={(e) => setEditedProject(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Project description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="project-budget">Budget</Label>
                <Input
                  id="project-budget"
                  type="number"
                  value={editedProject.budget}
                  onChange={(e) => setEditedProject(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="project-status">Status</Label>
                <Select value={editedProject.status} onValueChange={(value) => setEditedProject(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="project-start">Start Date</Label>
                <Input
                  id="project-start"
                  type="date"
                  value={editedProject.start_date}
                  onChange={(e) => setEditedProject(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="project-end">End Date</Label>
                <Input
                  id="project-end"
                  type="date"
                  value={editedProject.end_date}
                  onChange={(e) => setEditedProject(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setEditProjectDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateProject}>
                Update Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Material Dialog */}
      <Dialog open={createMaterialDialogOpen} onOpenChange={setCreateMaterialDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Material to Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="material-name">Material Name</Label>
                <Input
                  id="material-name"
                  value={newMaterial.name}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Material name"
                />
              </div>
              <div>
                <Label htmlFor="material-category">Category</Label>
                <Input
                  id="material-category"
                  value={newMaterial.category}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Category"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="material-description">Description</Label>
              <Textarea
                id="material-description"
                value={newMaterial.description}
                onChange={(e) => setNewMaterial(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Material description"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="material-unit">Unit</Label>
                <Input
                  id="material-unit"
                  value={newMaterial.unit}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="Unit (e.g., bags, tons)"
                />
              </div>
              <div>
                <Label htmlFor="material-quantity">Quantity Available</Label>
                <Input
                  id="material-quantity"
                  type="number"
                  value={newMaterial.quantity_available}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, quantity_available: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="material-cost">Unit Cost</Label>
                <Input
                  id="material-cost"
                  type="number"
                  step="0.01"
                  placeholder="Enter cost per unit"
                  value={newMaterial.unit_cost === 0 ? '' : newMaterial.unit_cost}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="material-supplier">Supplier</Label>
              <Input
                id="material-supplier"
                value={newMaterial.supplier_name}
                onChange={(e) => setNewMaterial(prev => ({ ...prev, supplier_name: e.target.value }))}
                placeholder="Supplier name"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setCreateMaterialDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateMaterial}>
                Add Material
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={addContactDialogOpen} onOpenChange={setAddContactDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact-first-name">First Name</Label>
                <Input
                  id="contact-first-name"
                  value={newContact.first_name}
                  onChange={(e) => setNewContact(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="First name"
                />
              </div>
              <div>
                <Label htmlFor="contact-last-name">Last Name</Label>
                <Input
                  id="contact-last-name"
                  value={newContact.last_name}
                  onChange={(e) => setNewContact(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Email address"
                />
              </div>
              <div>
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  value={newContact.phone}
                  onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone number"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact-company">Company</Label>
                <Input
                  id="contact-company"
                  value={newContact.company_name}
                  onChange={(e) => setNewContact(prev => ({ ...prev, company_name: e.target.value }))}
                  placeholder="Company name"
                />
              </div>
              <div>
                <Label htmlFor="contact-type">Contact Type</Label>
                <Select value={newContact.contact_type} onValueChange={(value) => setNewContact(prev => ({ ...prev, contact_type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="supplier">Supplier</SelectItem>
                    <SelectItem value="subcontractor">Subcontractor</SelectItem>
                    <SelectItem value="inspector">Inspector</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setAddContactDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateContact}>
                Add Contact
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Permit Dialog */}
      {addPermitDialogOpen && (
        <PermitForm
          projectId={projectId}
          onClose={() => setAddPermitDialogOpen(false)}
          onSave={() => {
            setAddPermitDialogOpen(false);
            loadPermits();
          }}
        />
      )}

      {/* Edit Permit Dialog */}
      {editPermitDialogOpen && (
        <PermitForm
          permit={editingPermit}
          onClose={() => {
            setEditPermitDialogOpen(false);
            setEditingPermit(null);
          }}
          onSave={() => {
            setEditPermitDialogOpen(false);
            setEditingPermit(null);
            loadPermits();
          }}
        />
      )}

      {/* Add Warranty Dialog */}
      {addWarrantyDialogOpen && (
        <WarrantyForm
          projectId={projectId}
          onClose={() => setAddWarrantyDialogOpen(false)}
          onSave={() => {
            setAddWarrantyDialogOpen(false);
            loadWarranties();
          }}
        />
      )}

      {/* Edit Warranty Dialog */}
      {editWarrantyDialogOpen && (
        <WarrantyForm
          warranty={editingWarranty}
          onClose={() => {
            setEditWarrantyDialogOpen(false);
            setEditingWarranty(null);
          }}
          onSave={() => {
            setEditWarrantyDialogOpen(false);
            setEditingWarranty(null);
            loadWarranties();
          }}
        />
      )}

      {/* Add Document Dialog */}
      <Dialog open={addDocumentDialogOpen} onOpenChange={setAddDocumentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Document to Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="document-name">Document Name</Label>
                <Input
                  id="document-name"
                  value={newDocument.document_name}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, document_name: e.target.value }))}
                  placeholder="Document name"
                />
              </div>
              <div>
                <Label htmlFor="document-type">Document Type</Label>
                <Select value={newDocument.document_type} onValueChange={(value) => setNewDocument(prev => ({ ...prev, document_type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="blueprint">Blueprint</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="permit">Permit</SelectItem>
                    <SelectItem value="inspection">Inspection Report</SelectItem>
                    <SelectItem value="photo">Photo</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="document-category">Category</Label>
              <Input
                id="document-category"
                value={newDocument.category}
                onChange={(e) => setNewDocument(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Document category"
              />
            </div>
            <div>
              <Label htmlFor="document-description">Description</Label>
              <Textarea
                id="document-description"
                value={newDocument.description}
                onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Document description"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="document-path">File Path/URL</Label>
              <Input
                id="document-path"
                value={newDocument.file_path}
                onChange={(e) => setNewDocument(prev => ({ ...prev, file_path: e.target.value }))}
                placeholder="File path or URL"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setAddDocumentDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDocument}>
                Add Document
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Team Member Dialog */}
      <Dialog open={addTeamMemberDialogOpen} onOpenChange={setAddTeamMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="team-member">Select Team Member</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a team member" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setAddTeamMemberDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTeamMember} disabled={!selectedUserId}>
                Add Team Member
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Job Cost Dialog */}
      <Dialog open={addJobCostDialogOpen} onOpenChange={setAddJobCostDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Job Cost</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cost-code">Cost Code</Label>
                <Input
                  id="cost-code"
                  value={newJobCost.cost_code}
                  onChange={(e) => setNewJobCost(prev => ({ ...prev, cost_code: e.target.value }))}
                  placeholder="Cost code"
                />
              </div>
              <div>
                <Label htmlFor="cost-type">Cost Type</Label>
                <Select value={newJobCost.cost_type} onValueChange={(value) => setNewJobCost(prev => ({ ...prev, cost_type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="labor">Labor</SelectItem>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="cost-description">Description</Label>
              <Textarea
                id="cost-description"
                value={newJobCost.description}
                onChange={(e) => setNewJobCost(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Cost description"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="cost-quantity">Quantity</Label>
                <Input
                  id="cost-quantity"
                  type="number"
                  value={newJobCost.quantity}
                  onChange={(e) => setNewJobCost(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="cost-unit-cost">Unit Cost</Label>
                <Input
                  id="cost-unit-cost"
                  type="number"
                  step="0.01"
                  value={newJobCost.unit_cost}
                  onChange={(e) => setNewJobCost(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="cost-actual">Actual Cost</Label>
                <Input
                  id="cost-actual"
                  type="number"
                  step="0.01"
                  value={newJobCost.actual_cost}
                  onChange={(e) => setNewJobCost(prev => ({ ...prev, actual_cost: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setAddJobCostDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateJobCost}>
                Add Job Cost
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add RFI Dialog */}
      <Dialog open={addRfiDialogOpen} onOpenChange={setAddRfiDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add RFI</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rfi-number">RFI Number</Label>
                <Input
                  id="rfi-number"
                  value={newRfi.rfi_number}
                  onChange={(e) => setNewRfi(prev => ({ ...prev, rfi_number: e.target.value }))}
                  placeholder="RFI-001"
                />
              </div>
              <div>
                <Label htmlFor="rfi-priority">Priority</Label>
                <Select value={newRfi.priority} onValueChange={(value) => setNewRfi(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="rfi-subject">Subject</Label>
              <Input
                id="rfi-subject"
                value={newRfi.subject}
                onChange={(e) => setNewRfi(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="RFI subject"
              />
            </div>
            <div>
              <Label htmlFor="rfi-description">Description</Label>
              <Textarea
                id="rfi-description"
                value={newRfi.description}
                onChange={(e) => setNewRfi(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed description of the request"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rfi-submitted-to">Submitted To</Label>
                <Input
                  id="rfi-submitted-to"
                  value={newRfi.submitted_to}
                  onChange={(e) => setNewRfi(prev => ({ ...prev, submitted_to: e.target.value }))}
                  placeholder="Name or company"
                />
              </div>
              <div>
                <Label htmlFor="rfi-due-date">Due Date</Label>
                <Input
                  id="rfi-due-date"
                  type="date"
                  value={newRfi.due_date}
                  onChange={(e) => setNewRfi(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setAddRfiDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRfi}>
                Add RFI
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Submittal Dialog */}
      <Dialog open={addSubmittalDialogOpen} onOpenChange={setAddSubmittalDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Submittal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="submittal-number">Submittal Number</Label>
                <Input
                  id="submittal-number"
                  value={newSubmittal.submittal_number}
                  onChange={(e) => setNewSubmittal(prev => ({ ...prev, submittal_number: e.target.value }))}
                  placeholder="SUB-001"
                />
              </div>
              <div>
                <Label htmlFor="submittal-priority">Priority</Label>
                <Select value={newSubmittal.priority} onValueChange={(value) => setNewSubmittal(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="submittal-title">Title</Label>
              <Input
                id="submittal-title"
                value={newSubmittal.title}
                onChange={(e) => setNewSubmittal(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Submittal title"
              />
            </div>
            <div>
              <Label htmlFor="submittal-description">Description</Label>
              <Textarea
                id="submittal-description"
                value={newSubmittal.description}
                onChange={(e) => setNewSubmittal(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Submittal description"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="submittal-spec">Spec Section</Label>
                <Input
                  id="submittal-spec"
                  value={newSubmittal.spec_section}
                  onChange={(e) => setNewSubmittal(prev => ({ ...prev, spec_section: e.target.value }))}
                  placeholder="03 30 00"
                />
              </div>
              <div>
                <Label htmlFor="submittal-due-date">Due Date</Label>
                <Input
                  id="submittal-due-date"
                  type="date"
                  value={newSubmittal.due_date}
                  onChange={(e) => setNewSubmittal(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setAddSubmittalDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSubmittal}>
                Add Submittal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Submittal Dialog */}
      <Dialog open={isEditSubmittalDialogOpen} onOpenChange={setIsEditSubmittalDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Submittal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-submittal-title">Title</Label>
              <Input
                id="edit-submittal-title"
                value={editedSubmittal.title}
                onChange={(e) => setEditedSubmittal(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Submittal title"
              />
            </div>
            <div>
              <Label htmlFor="edit-submittal-description">Description</Label>
              <Textarea
                id="edit-submittal-description"
                value={editedSubmittal.description}
                onChange={(e) => setEditedSubmittal(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Submittal description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-submittal-spec">Spec Section</Label>
                <Input
                  id="edit-submittal-spec"
                  value={editedSubmittal.spec_section}
                  onChange={(e) => setEditedSubmittal(prev => ({ ...prev, spec_section: e.target.value }))}
                  placeholder="03 30 00"
                />
              </div>
              <div>
                <Label htmlFor="edit-submittal-priority">Priority</Label>
                <Select value={editedSubmittal.priority} onValueChange={(value) => setEditedSubmittal(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-submittal-due-date">Due Date</Label>
                <Input
                  id="edit-submittal-due-date"
                  type="date"
                  value={editedSubmittal.due_date}
                  onChange={(e) => setEditedSubmittal(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-submittal-status">Status</Label>
                <Select value={editedSubmittal.status} onValueChange={(value) => setEditedSubmittal(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditSubmittalDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateSubmittal}>
                Update Submittal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Change Order Dialog */}
      <Dialog open={addChangeOrderDialogOpen} onOpenChange={setAddChangeOrderDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Change Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="change-order-number">Change Order Number</Label>
                <Input
                  id="change-order-number"
                  value={newChangeOrder.change_order_number}
                  onChange={(e) => setNewChangeOrder(prev => ({ ...prev, change_order_number: e.target.value }))}
                  placeholder="CO-001"
                />
              </div>
              <div>
                <Label htmlFor="change-order-amount">Amount</Label>
                <Input
                  id="change-order-amount"
                  type="number"
                  step="0.01"
                  value={newChangeOrder.amount}
                  onChange={(e) => setNewChangeOrder(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="change-order-title">Title</Label>
              <Input
                id="change-order-title"
                value={newChangeOrder.title}
                onChange={(e) => setNewChangeOrder(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Change order title"
              />
            </div>
            <div>
              <Label htmlFor="change-order-description">Description</Label>
              <Textarea
                id="change-order-description"
                value={newChangeOrder.description}
                onChange={(e) => setNewChangeOrder(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed description of changes"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="change-order-reason">Reason</Label>
              <Textarea
                id="change-order-reason"
                value={newChangeOrder.reason}
                onChange={(e) => setNewChangeOrder(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Reason for change"
                rows={2}
              />
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Assign Approvers</Label>
                <div className="max-h-40 overflow-y-auto border rounded-md p-3 space-y-2">
                  {companyUsers.filter(user => ['admin', 'project_manager', 'root_admin'].includes(user.role)).map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`approver-${user.id}`}
                        checked={selectedApprovers.includes(user.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedApprovers(prev => [...prev, user.id]);
                          } else {
                            setSelectedApprovers(prev => prev.filter(id => id !== user.id));
                          }
                        }}
                      />
                      <Label htmlFor={`approver-${user.id}`} className="text-sm">
                        {user.first_name} {user.last_name} ({user.role})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="approval-due-date">Approval Due Date</Label>
                  <Input
                    id="approval-due-date"
                    type="date"
                    value={approvalDueDate}
                    onChange={(e) => setApprovalDueDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="approval-notes">Approval Notes</Label>
                  <Textarea
                    id="approval-notes"
                    value={newChangeOrder.approval_notes}
                    onChange={(e) => setNewChangeOrder(prev => ({ ...prev, approval_notes: e.target.value }))}
                    placeholder="Notes for approvers"
                    rows={1}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setAddChangeOrderDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateChangeOrder}>
                Add Change Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Change Order Dialog */}
      <Dialog open={editChangeOrderDialogOpen} onOpenChange={setEditChangeOrderDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Change Order</DialogTitle>
          </DialogHeader>
          {editingChangeOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Change Order Number</Label>
                  <Input value={editingChangeOrder.change_order_number} disabled />
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingChangeOrder.amount}
                    onChange={(e) => setEditingChangeOrder({...editingChangeOrder, amount: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  value={editingChangeOrder.title}
                  onChange={(e) => setEditingChangeOrder({...editingChangeOrder, title: e.target.value})}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingChangeOrder.description || ''}
                  onChange={(e) => setEditingChangeOrder({...editingChangeOrder, description: e.target.value})}
                  rows={3}
                />
              </div>
              <div>
                <Label>Reason</Label>
                <Select 
                  value={editingChangeOrder.reason || ''} 
                  onValueChange={(value) => setEditingChangeOrder({...editingChangeOrder, reason: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scope_change">Scope Change</SelectItem>
                    <SelectItem value="material_upgrade">Material Upgrade</SelectItem>
                    <SelectItem value="unforeseen_conditions">Unforeseen Conditions</SelectItem>
                    <SelectItem value="client_request">Client Request</SelectItem>
                    <SelectItem value="code_requirement">Code Requirement</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Assigned Approvers</Label>
                  <Select 
                    value={editingChangeOrder.assigned_approvers?.[0] || ''} 
                    onValueChange={(value) => setEditingChangeOrder({
                      ...editingChangeOrder, 
                      assigned_approvers: value ? [value] : []
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select approver" />
                    </SelectTrigger>
                    <SelectContent>
                      {companyUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.first_name} {user.last_name} ({user.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Approval Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !editingChangeOrder.approval_due_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editingChangeOrder.approval_due_date ? format(new Date(editingChangeOrder.approval_due_date), "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={editingChangeOrder.approval_due_date ? new Date(editingChangeOrder.approval_due_date) : undefined}
                        onSelect={(date) => setEditingChangeOrder({
                          ...editingChangeOrder, 
                          approval_due_date: date ? format(date, 'yyyy-MM-dd') : ''
                        })}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div>
                <Label>Approval Notes</Label>
                <Textarea
                  placeholder="Special instructions for approvers..."
                  value={editingChangeOrder.approval_notes || ''}
                  onChange={(e) => setEditingChangeOrder({...editingChangeOrder, approval_notes: e.target.value})}
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select value={editingChangeOrder.status} onValueChange={(value) => setEditingChangeOrder({...editingChangeOrder, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setEditChangeOrderDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={async () => {
                  try {
                    const { error } = await supabase.functions.invoke('change-orders', {
                      body: { 
                        action: 'update',
                        orderId: editingChangeOrder.id,
                        title: editingChangeOrder.title,
                        description: editingChangeOrder.description,
                        amount: editingChangeOrder.amount,
                        reason: editingChangeOrder.reason,
                        assigned_approvers: editingChangeOrder.assigned_approvers || [],
                        approval_due_date: editingChangeOrder.approval_due_date,
                        approval_notes: editingChangeOrder.approval_notes,
                        status: editingChangeOrder.status
                      }
                    });

                    if (error) throw error;

                    setEditChangeOrderDialogOpen(false);
                    setEditingChangeOrder(null);
                    loadChangeOrders();

                    toast({
                      title: "Change order updated",
                      description: "The change order has been updated successfully."
                    });
                  } catch (error: any) {
                    toast({
                      variant: "destructive",
                      title: "Error updating change order",
                      description: error.message
                    });
                  }
                }}>
                  Update Change Order
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Punch List Item Dialog */}
      <Dialog open={addPunchListDialogOpen} onOpenChange={setAddPunchListDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Punch List Item</DialogTitle>
            <DialogDescription>
              Log a quality issue or incomplete work item for tracking and resolution.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="punch-description">Description *</Label>
              <Textarea
                id="punch-description"
                placeholder="Detailed description of the issue or work needed..."
                value={newPunchListItem.description}
                onChange={(e) => setNewPunchListItem(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="punch-priority">Priority</Label>
                <Select value={newPunchListItem.priority} onValueChange={(value) => setNewPunchListItem(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="punch-category">Category</Label>
                <Select value={newPunchListItem.category || 'quality'} onValueChange={(value) => setNewPunchListItem(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quality">Quality</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="cleanup">Cleanup</SelectItem>
                    <SelectItem value="deficiency">Deficiency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="punch-location">Location</Label>
                <Input
                  id="punch-location"
                  placeholder="Room, floor, area..."
                  value={newPunchListItem.location}
                  onChange={(e) => setNewPunchListItem(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="punch-trade">Trade</Label>
                <Input
                  id="punch-trade"
                  placeholder="Electrical, plumbing, etc..."
                  value={newPunchListItem.trade}
                  onChange={(e) => setNewPunchListItem(prev => ({ ...prev, trade: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="punch-due-date">Due Date</Label>
              <Input
                id="punch-due-date"
                type="date"
                value={newPunchListItem.due_date || ''}
                onChange={(e) => setNewPunchListItem(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setAddPunchListDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePunchListItem}>
                Add Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Punch List Item Dialog */}
      <Dialog open={editPunchListDialogOpen} onOpenChange={setEditPunchListDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Punch List Item</DialogTitle>
            <DialogDescription>
              Update the details of this punch list item.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-punch-description">Description *</Label>
              <Textarea
                id="edit-punch-description"
                placeholder="Detailed description of the issue or work needed..."
                value={editingPunchListItem?.description || ''}
                onChange={(e) => setEditingPunchListItem(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-punch-priority">Priority</Label>
                <Select value={editingPunchListItem?.priority || 'medium'} onValueChange={(value) => setEditingPunchListItem(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-punch-category">Category</Label>
                <Select value={editingPunchListItem?.category || 'quality'} onValueChange={(value) => setEditingPunchListItem(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quality">Quality</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="cleanup">Cleanup</SelectItem>
                    <SelectItem value="deficiency">Deficiency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-punch-location">Location</Label>
                <Input
                  id="edit-punch-location"
                  placeholder="Room, floor, area..."
                  value={editingPunchListItem?.location || ''}
                  onChange={(e) => setEditingPunchListItem(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-punch-trade">Trade</Label>
                <Input
                  id="edit-punch-trade"
                  placeholder="Electrical, plumbing, etc..."
                  value={editingPunchListItem?.trade || ''}
                  onChange={(e) => setEditingPunchListItem(prev => ({ ...prev, trade: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-punch-due-date">Due Date</Label>
              <Input
                id="edit-punch-due-date"
                type="date"
                value={editingPunchListItem?.due_date || ''}
                onChange={(e) => setEditingPunchListItem(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditPunchListDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditPunchListItem}>
                Update Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Equipment Dialog */}
      <Dialog open={addEquipmentDialogOpen} onOpenChange={setAddEquipmentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Equipment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="equipment-name">Equipment Name</Label>
                <Input
                  id="equipment-name"
                  value={newEquipment.equipment_name}
                  onChange={(e) => setNewEquipment(prev => ({ ...prev, equipment_name: e.target.value }))}
                  placeholder="Equipment name"
                />
              </div>
              <div>
                <Label htmlFor="equipment-type">Equipment Type</Label>
                <Input
                  id="equipment-type"
                  value={newEquipment.equipment_type}
                  onChange={(e) => setNewEquipment(prev => ({ ...prev, equipment_type: e.target.value }))}
                  placeholder="Type of equipment"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="equipment-manufacturer">Manufacturer</Label>
                <Input
                  id="equipment-manufacturer"
                  value={newEquipment.manufacturer}
                  onChange={(e) => setNewEquipment(prev => ({ ...prev, manufacturer: e.target.value }))}
                  placeholder="Manufacturer name"
                />
              </div>
              <div>
                <Label htmlFor="equipment-model">Model</Label>
                <Input
                  id="equipment-model"
                  value={newEquipment.model}
                  onChange={(e) => setNewEquipment(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="Model number"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="equipment-serial">Serial Number</Label>
                <Input
                  id="equipment-serial"
                  value={newEquipment.serial_number}
                  onChange={(e) => setNewEquipment(prev => ({ ...prev, serial_number: e.target.value }))}
                  placeholder="Serial number"
                />
              </div>
              <div>
                <Label htmlFor="equipment-status">Status</Label>
                <Select value={newEquipment.status} onValueChange={(value) => setNewEquipment(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="maintenance">Under Maintenance</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="equipment-purchase-date">Purchase Date</Label>
                <Input
                  id="equipment-purchase-date"
                  type="date"
                  value={newEquipment.purchase_date}
                  onChange={(e) => setNewEquipment(prev => ({ ...prev, purchase_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setAddEquipmentDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateEquipment}>
                Add Equipment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit RFI Dialog */}
      <Dialog open={isEditRFIDialogOpen} onOpenChange={setIsEditRFIDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit RFI</DialogTitle>
            <DialogDescription>
              Update the RFI details and status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-rfi-subject">Subject *</Label>
              <Input
                id="edit-rfi-subject"
                value={editedRFI.subject}
                onChange={(e) => setEditedRFI(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="RFI subject"
              />
            </div>

            <div>
              <Label htmlFor="edit-rfi-description">Description *</Label>
              <Textarea
                id="edit-rfi-description"
                value={editedRFI.description}
                onChange={(e) => setEditedRFI(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed description of the information request"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-rfi-priority">Priority</Label>
                <Select value={editedRFI.priority} onValueChange={(value) => setEditedRFI(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit-rfi-status">Status</Label>
                <Select value={editedRFI.status} onValueChange={(value) => setEditedRFI(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="responded">Responded</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-rfi-submitted-to">Submitted To</Label>
                <Input
                  id="edit-rfi-submitted-to"
                  value={editedRFI.submitted_to}
                  onChange={(e) => setEditedRFI(prev => ({ ...prev, submitted_to: e.target.value }))}
                  placeholder="Person or organization"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-rfi-due-date">Due Date</Label>
                <Input
                  id="edit-rfi-due-date"
                  type="date"
                  value={editedRFI.due_date}
                  onChange={(e) => setEditedRFI(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditRFIDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateRFI}>
                Update RFI
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Existing Contact Dialog */}
      <Dialog open={addExistingContactDialogOpen} onOpenChange={setAddExistingContactDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Existing Contact to Project</DialogTitle>
            <DialogDescription>
              Search and select an existing contact to add to this project
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="contact-search">Search Contacts</Label>
              <ContactSearchCombobox
                contacts={contacts.filter(contact => 
                  !projectContacts.some(pc => pc.contact_id === contact.id)
                )}
                selectedContact={selectedContactToAdd}
                onSelectContact={setSelectedContactToAdd}
                placeholder="Search and select a contact..."
                className="w-full"
              />
            </div>
            
            {selectedContactToAdd && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-construction-blue flex items-center justify-center text-white text-sm font-medium">
                      {selectedContactToAdd.first_name?.[0]}{selectedContactToAdd.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-medium">{selectedContactToAdd.first_name} {selectedContactToAdd.last_name}</p>
                      {selectedContactToAdd.company_name && (
                        <p className="text-sm text-muted-foreground">{selectedContactToAdd.company_name}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {selectedContactToAdd.email && (
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{selectedContactToAdd.email}</span>
                      </div>
                    )}
                    {selectedContactToAdd.phone && (
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{selectedContactToAdd.phone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div>
              <Label htmlFor="contact-role">Role in Project</Label>
              <Select value={contactRole} onValueChange={setContactRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client Contact</SelectItem>
                  <SelectItem value="project_manager">Project Manager</SelectItem>
                  <SelectItem value="architect">Architect</SelectItem>
                  <SelectItem value="engineer">Engineer</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                  <SelectItem value="subcontractor">Subcontractor</SelectItem>
                  <SelectItem value="inspector">Inspector</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => {
                setAddExistingContactDialogOpen(false);
                setSelectedContactToAdd(null);
                setContactRole('client');
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddExistingContact}
                disabled={!selectedContactToAdd}
              >
                Add to Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ProjectDetail;