export interface Project {
  id: string;
  name: string;
  template: TemplateType;
  startDate: Date;
  endDate: Date;
  tasks: Task[];
  createdAt: Date;
  userId?: string;
}

export interface Task {
  id: string;
  name: string;
  duration: number;
  startDate: Date;
  endDate: Date;
  dependencies: string[];
  resourceId: string;
  status: TaskStatus;
  isOnCriticalPath: boolean;
  phase: string;
  description?: string;
}

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  capacity: number;
  costPerDay?: number;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: ProjectCategory;
  estimatedDuration: number;
  phases: ProjectPhase[];
  defaultTasks: TemplateTask[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface ProjectPhase {
  id: string;
  name: string;
  description: string;
  order: number;
  estimatedDuration: number;
  dependencies: string[];
}

export interface TemplateTask {
  id: string;
  name: string;
  duration: number;
  dependencies: string[];
  resourceType: ResourceType;
  phase: string;
  description?: string;
  isOptional?: boolean;
}

export type TemplateType = 
  | 'single-family-home'
  | 'home-renovation'
  | 'commercial-buildout'
  | 'kitchen-remodel'
  | 'bathroom-remodel'
  | 'deck-construction';

export type TaskStatus = 
  | 'not-started'
  | 'in-progress'
  | 'completed'
  | 'delayed'
  | 'on-hold';

export type ResourceType = 
  | 'general-contractor'
  | 'framing-crew'
  | 'electrical-contractor'
  | 'plumbing-contractor'
  | 'hvac-contractor'
  | 'drywall-crew'
  | 'flooring-crew'
  | 'painting-crew'
  | 'roofing-crew'
  | 'concrete-crew'
  | 'excavation-crew';

export type ProjectCategory = 
  | 'residential-new'
  | 'residential-renovation'
  | 'commercial'
  | 'specialty';

export interface CriticalPath {
  tasks: Task[];
  totalDuration: number;
  startDate: Date;
  endDate: Date;
}

export interface ScheduleConflict {
  id: string;
  type: 'resource-conflict' | 'dependency-cycle' | 'date-conflict';
  description: string;
  affectedTasks: string[];
  severity: 'low' | 'medium' | 'high';
  suggestedResolution?: string;
}

export interface ExportOptions {
  format: 'pdf' | 'csv' | 'excel';
  includeGantt: boolean;
  includeCriticalPath: boolean;
  includeResourceAllocation: boolean;
  includeTaskList: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ScheduleAnalytics {
  totalTasks: number;
  criticalPathTasks: number;
  projectDuration: number;
  resourceUtilization: number;
  scheduleEfficiency: number;
  riskFactors: string[];
  recommendations: string[];
}

// Template definitions for the 6 main project types
export const PROJECT_TEMPLATES: Record<TemplateType, ProjectTemplate> = {
  'single-family-home': {
    id: 'single-family-home',
    name: 'Single-Family Home Construction',
    description: 'Complete new home construction from foundation to finish',
    category: 'residential-new',
    estimatedDuration: 150,
    difficulty: 'advanced',
    phases: [
      { id: 'site-prep', name: 'Site Preparation', description: 'Site clearing and preparation', order: 1, estimatedDuration: 5, dependencies: [] },
      { id: 'foundation', name: 'Foundation', description: 'Foundation excavation and concrete work', order: 2, estimatedDuration: 10, dependencies: ['site-prep'] },
      { id: 'framing', name: 'Framing', description: 'Structural framing and roof', order: 3, estimatedDuration: 15, dependencies: ['foundation'] },
      { id: 'mep-rough', name: 'MEP Rough-In', description: 'Mechanical, electrical, plumbing rough-in', order: 4, estimatedDuration: 12, dependencies: ['framing'] },
      { id: 'insulation', name: 'Insulation', description: 'Insulation installation', order: 5, estimatedDuration: 3, dependencies: ['mep-rough'] },
      { id: 'drywall', name: 'Drywall', description: 'Drywall installation and finishing', order: 6, estimatedDuration: 8, dependencies: ['insulation'] },
      { id: 'flooring', name: 'Flooring', description: 'Floor installation', order: 7, estimatedDuration: 7, dependencies: ['drywall'] },
      { id: 'trim', name: 'Trim & Millwork', description: 'Interior trim and millwork', order: 8, estimatedDuration: 10, dependencies: ['flooring'] },
      { id: 'cabinets', name: 'Cabinets & Countertops', description: 'Kitchen and bathroom installations', order: 9, estimatedDuration: 8, dependencies: ['trim'] },
      { id: 'mep-finish', name: 'MEP Finish', description: 'Mechanical, electrical, plumbing finish work', order: 10, estimatedDuration: 8, dependencies: ['cabinets'] },
      { id: 'paint', name: 'Painting', description: 'Interior and exterior painting', order: 11, estimatedDuration: 10, dependencies: ['mep-finish'] },
      { id: 'final', name: 'Final Inspections', description: 'Final inspections and cleanup', order: 12, estimatedDuration: 5, dependencies: ['paint'] }
    ],
    defaultTasks: []
  },
  'home-renovation': {
    id: 'home-renovation',
    name: 'Home Renovation/Remodel',
    description: 'Major home renovation and remodeling project',
    category: 'residential-renovation',
    estimatedDuration: 45,
    difficulty: 'intermediate',
    phases: [
      { id: 'planning', name: 'Planning & Permits', description: 'Design finalization and permit acquisition', order: 1, estimatedDuration: 5, dependencies: [] },
      { id: 'demolition', name: 'Demolition', description: 'Selective demolition work', order: 2, estimatedDuration: 3, dependencies: ['planning'] },
      { id: 'structural', name: 'Structural Work', description: 'Any structural modifications', order: 3, estimatedDuration: 7, dependencies: ['demolition'] },
      { id: 'mep-rough', name: 'MEP Rough-In', description: 'Updated electrical, plumbing, HVAC', order: 4, estimatedDuration: 8, dependencies: ['structural'] },
      { id: 'drywall', name: 'Drywall', description: 'Drywall repair and installation', order: 5, estimatedDuration: 5, dependencies: ['mep-rough'] },
      { id: 'flooring', name: 'Flooring', description: 'New flooring installation', order: 6, estimatedDuration: 6, dependencies: ['drywall'] },
      { id: 'fixtures', name: 'Fixtures & Finishes', description: 'Installation of fixtures and finishes', order: 7, estimatedDuration: 8, dependencies: ['flooring'] },
      { id: 'final', name: 'Final Touches', description: 'Cleanup and final walkthrough', order: 8, estimatedDuration: 3, dependencies: ['fixtures'] }
    ],
    defaultTasks: []
  },
  'commercial-buildout': {
    id: 'commercial-buildout',
    name: 'Commercial Build-Out',
    description: 'Commercial space tenant improvement project',
    category: 'commercial',
    estimatedDuration: 120,
    difficulty: 'advanced',
    phases: [
      { id: 'design', name: 'Design Development', description: 'Architectural and engineering design', order: 1, estimatedDuration: 14, dependencies: [] },
      { id: 'permits', name: 'Permits & Approvals', description: 'Building permits and city approvals', order: 2, estimatedDuration: 10, dependencies: ['design'] },
      { id: 'demolition', name: 'Demolition', description: 'Existing space demolition', order: 3, estimatedDuration: 5, dependencies: ['permits'] },
      { id: 'mep-rough', name: 'MEP Rough-In', description: 'Mechanical, electrical, plumbing infrastructure', order: 4, estimatedDuration: 15, dependencies: ['demolition'] },
      { id: 'framing', name: 'Framing & Partitions', description: 'Interior framing and partition walls', order: 5, estimatedDuration: 10, dependencies: ['mep-rough'] },
      { id: 'drywall', name: 'Drywall & Ceilings', description: 'Drywall and ceiling systems', order: 6, estimatedDuration: 12, dependencies: ['framing'] },
      { id: 'flooring', name: 'Flooring', description: 'Commercial flooring installation', order: 7, estimatedDuration: 8, dependencies: ['drywall'] },
      { id: 'mep-finish', name: 'MEP Finish', description: 'Final electrical, plumbing, HVAC', order: 8, estimatedDuration: 10, dependencies: ['flooring'] },
      { id: 'specialties', name: 'Specialties', description: 'Custom millwork and specialties', order: 9, estimatedDuration: 12, dependencies: ['mep-finish'] },
      { id: 'paint', name: 'Painting & Finishes', description: 'Final painting and finishes', order: 10, estimatedDuration: 8, dependencies: ['specialties'] },
      { id: 'final', name: 'Final Inspections', description: 'Final inspections and certificate of occupancy', order: 11, estimatedDuration: 7, dependencies: ['paint'] }
    ],
    defaultTasks: []
  },
  'kitchen-remodel': {
    id: 'kitchen-remodel',
    name: 'Kitchen Remodel',
    description: 'Complete kitchen renovation and upgrade',
    category: 'residential-renovation',
    estimatedDuration: 22,
    difficulty: 'beginner',
    phases: [
      { id: 'planning', name: 'Planning & Design', description: 'Kitchen design and material selection', order: 1, estimatedDuration: 2, dependencies: [] },
      { id: 'demolition', name: 'Demolition', description: 'Cabinet and appliance removal', order: 2, estimatedDuration: 2, dependencies: ['planning'] },
      { id: 'mep-rough', name: 'MEP Updates', description: 'Electrical and plumbing updates', order: 3, estimatedDuration: 4, dependencies: ['demolition'] },
      { id: 'drywall', name: 'Drywall Repair', description: 'Wall repair and preparation', order: 4, estimatedDuration: 3, dependencies: ['mep-rough'] },
      { id: 'flooring', name: 'Flooring', description: 'Kitchen flooring installation', order: 5, estimatedDuration: 3, dependencies: ['drywall'] },
      { id: 'cabinets', name: 'Cabinets & Countertops', description: 'Cabinet and countertop installation', order: 6, estimatedDuration: 5, dependencies: ['flooring'] },
      { id: 'appliances', name: 'Appliances & Fixtures', description: 'Appliance installation and final fixtures', order: 7, estimatedDuration: 3, dependencies: ['cabinets'] }
    ],
    defaultTasks: []
  },
  'bathroom-remodel': {
    id: 'bathroom-remodel',
    name: 'Bathroom Remodel',
    description: 'Full bathroom renovation project',
    category: 'residential-renovation',
    estimatedDuration: 15,
    difficulty: 'beginner',
    phases: [
      { id: 'planning', name: 'Planning & Design', description: 'Bathroom design and fixture selection', order: 1, estimatedDuration: 1, dependencies: [] },
      { id: 'demolition', name: 'Demolition', description: 'Fixture and tile removal', order: 2, estimatedDuration: 2, dependencies: ['planning'] },
      { id: 'plumbing', name: 'Plumbing Updates', description: 'Plumbing rough-in and updates', order: 3, estimatedDuration: 3, dependencies: ['demolition'] },
      { id: 'waterproofing', name: 'Waterproofing', description: 'Shower and floor waterproofing', order: 4, estimatedDuration: 2, dependencies: ['plumbing'] },
      { id: 'tile', name: 'Tile Work', description: 'Floor and wall tile installation', order: 5, estimatedDuration: 4, dependencies: ['waterproofing'] },
      { id: 'fixtures', name: 'Fixtures & Finishes', description: 'Final plumbing fixtures and accessories', order: 6, estimatedDuration: 3, dependencies: ['tile'] }
    ],
    defaultTasks: []
  },
  'deck-construction': {
    id: 'deck-construction',
    name: 'Deck/Outdoor Construction',
    description: 'Outdoor deck and patio construction',
    category: 'specialty',
    estimatedDuration: 10,
    difficulty: 'beginner',
    phases: [
      { id: 'planning', name: 'Planning & Permits', description: 'Design and permit acquisition', order: 1, estimatedDuration: 1, dependencies: [] },
      { id: 'excavation', name: 'Site Preparation', description: 'Site preparation and excavation', order: 2, estimatedDuration: 1, dependencies: ['planning'] },
      { id: 'footings', name: 'Footings & Foundation', description: 'Concrete footings and foundation work', order: 3, estimatedDuration: 2, dependencies: ['excavation'] },
      { id: 'framing', name: 'Deck Framing', description: 'Deck structure and framing', order: 4, estimatedDuration: 3, dependencies: ['footings'] },
      { id: 'decking', name: 'Decking & Railings', description: 'Deck boards and railing installation', order: 5, estimatedDuration: 2, dependencies: ['framing'] },
      { id: 'finishing', name: 'Finishing & Cleanup', description: 'Staining/sealing and final cleanup', order: 6, estimatedDuration: 1, dependencies: ['decking'] }
    ],
    defaultTasks: []
  }
}; 