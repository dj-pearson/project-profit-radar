/** Punch list item shape and the fixed pick-lists the add/edit forms offer. */
export interface PunchListItem {
  id: string;
  project_id: string;
  item_number: string;
  title: string;
  description: string;
  location?: string;
  category: 'deficiency' | 'incomplete_work' | 'cleanup' | 'touch_up' | 'safety' | 'code_compliance' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  trade?: string;
  status: 'open' | 'in_progress' | 'completed' | 'verified' | 'closed';
  assigned_to?: string;
  assigned_company?: string;
  date_identified: string;
  target_completion_date?: string;
  date_completed?: string;
  date_verified?: string;
  photo_before_url?: string;
  photo_after_url?: string;
  estimated_cost?: number;
  actual_cost?: number;
  notes?: string;
  completion_notes?: string;
  created_by?: string;
  created_at: string;
}

export const categories = [
  { value: 'deficiency', label: 'Deficiency', color: 'text-red-600' },
  { value: 'incomplete_work', label: 'Incomplete Work', color: 'text-orange-600' },
  { value: 'cleanup', label: 'Cleanup', color: 'text-yellow-600' },
  { value: 'touch_up', label: 'Touch Up', color: 'text-blue-600' },
  { value: 'safety', label: 'Safety', color: 'text-red-700' },
  { value: 'code_compliance', label: 'Code Compliance', color: 'text-purple-600' },
  { value: 'other', label: 'Other', color: 'text-gray-600' }
];

export const priorities = [
  { value: 'low', label: 'Low', color: 'text-green-600' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
  { value: 'high', label: 'High', color: 'text-orange-600' },
  { value: 'critical', label: 'Critical', color: 'text-red-600' }
];

export const trades = [
  'general',
  'electrical',
  'plumbing',
  'hvac',
  'flooring',
  'painting',
  'drywall',
  'roofing',
  'concrete',
  'landscaping',
  'other'
];
