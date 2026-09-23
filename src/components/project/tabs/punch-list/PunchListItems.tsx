import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, PlusCircle, Edit, Trash2, Calendar, User, MapPin, DollarSign, AlertTriangle, CheckCircle, Clock, Play } from 'lucide-react';
import { categories, priorities, type PunchListItem } from './punchListConfig';

// Display helpers (moved from ProjectPunchList, US-267).
const getStatusColor = (status: string) => {
  switch (status) {
    case 'open': return 'destructive';
    case 'in_progress': return 'secondary';
    case 'completed': return 'outline';
    case 'verified': return 'success';
    case 'closed': return 'success';
    default: return 'outline';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'open': return <AlertTriangle className="h-4 w-4 text-red-600" />;
    case 'in_progress': return <Play className="h-4 w-4 text-blue-600" />;
    case 'completed': return <CheckCircle className="h-4 w-4 text-orange-600" />;
    case 'verified': return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'closed': return <CheckSquare className="h-4 w-4 text-green-600" />;
    default: return <Clock className="h-4 w-4 text-gray-600" />;
  }
};

const getCategoryInfo = (category: string) => {
  return categories.find(c => c.value === category) || categories[categories.length - 1];
};

const getPriorityInfo = (priority: string) => {
  return priorities.find(p => p.value === priority) || priorities[1];
};

const formatCurrency = (amount?: number) => {
  return amount ? new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount) : 'N/A';
};

interface PunchListItemsProps {
  filteredItems: PunchListItem[];
  searchTerm: string;
  filterStatus: string;
  filterPriority: string;
  setShowAddItem: (open: boolean) => void;
  handleUpdateStatus: (itemId: string, newStatus: string) => void;
  handleDeleteItem: (itemId: string) => void;
  startEdit: (item: PunchListItem) => void;
}

/** The filtered punch list, one card per item, or the empty state. */
export function PunchListItems({ filteredItems, searchTerm, filterStatus, filterPriority, setShowAddItem, handleUpdateStatus, handleDeleteItem, startEdit }: PunchListItemsProps) {
  return (
    <>
      {filteredItems.length > 0 ? (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const categoryInfo = getCategoryInfo(item.category);
            const priorityInfo = getPriorityInfo(item.priority);

            return (
              <div key={item.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(item.status)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{item.title}</span>
                        <Badge variant="outline">{item.item_number}</Badge>
                        {item.priority === 'critical' && (
                          <Badge variant="destructive">Critical</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusColor(item.status) as any}>
                      {item.status.replace('_', ' ')}
                    </Badge>
                    {item.status === 'open' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleUpdateStatus(item.id, 'in_progress')}
                      >
                        Start
                      </Button>
                    )}
                    {item.status === 'in_progress' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleUpdateStatus(item.id, 'completed')}
                      >
                        Complete
                      </Button>
                    )}
                    {item.status === 'completed' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleUpdateStatus(item.id, 'verified')}
                      >
                        Verify
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => startEdit(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {(item.photo_before_url || item.photo_after_url) && (
                  <div className="flex gap-4 mb-4">
                    {item.photo_before_url && (
                      <figure className="text-xs text-muted-foreground">
                        <img
                          src={item.photo_before_url}
                          alt={`Before: ${item.title}`}
                          className="h-24 w-32 object-cover rounded border"
                        />
                        <figcaption className="mt-1 text-center">Before</figcaption>
                      </figure>
                    )}
                    {item.photo_after_url && (
                      <figure className="text-xs text-muted-foreground">
                        <img
                          src={item.photo_after_url}
                          alt={`After: ${item.title}`}
                          className="h-24 w-32 object-cover rounded border"
                        />
                        <figcaption className="mt-1 text-center">After</figcaption>
                      </figure>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">Category:</span>
                    <Badge variant="outline" className={categoryInfo.color}>
                      {categoryInfo.label}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">Priority:</span>
                    <Badge variant="outline" className={priorityInfo.color}>
                      {priorityInfo.label}
                    </Badge>
                  </div>
                  {item.location && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{item.location}</span>
                    </div>
                  )}
                  {item.trade && (
                    <div className="flex items-center space-x-2">
                      <span className="text-muted-foreground">Trade:</span>
                      <span className="capitalize">{item.trade}</span>
                    </div>
                  )}
                </div>

                {(item.assigned_company || item.assigned_to || item.target_completion_date) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {item.assigned_company && (
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Company:</span>
                        <span>{item.assigned_company}</span>
                      </div>
                    )}
                    {item.assigned_to && (
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Assigned:</span>
                        <span>{item.assigned_to}</span>
                      </div>
                    )}
                    {item.target_completion_date && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Due:</span>
                        <span>{new Date(item.target_completion_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                )}

                {item.estimated_cost && (
                  <div className="flex items-center space-x-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Estimated Cost:</span>
                    <span>{formatCurrency(item.estimated_cost)}</span>
                  </div>
                )}

                {item.notes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Notes:</span>
                    <p className="mt-1">{item.notes}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div>
                    Created {new Date(item.created_at).toLocaleDateString()}
                    {item.created_by && (
                      <span> by {item.created_by}</span>
                    )}
                  </div>
                  {item.date_completed && (
                    <div>Completed {new Date(item.date_completed).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            {searchTerm || filterStatus !== 'all' || filterPriority !== 'all'
              ? 'No items match your search criteria'
              : 'No punch list items created yet'
            }
          </p>
          {!searchTerm && filterStatus === 'all' && filterPriority === 'all' && (
            <Button onClick={() => setShowAddItem(true)} variant="outline">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create First Item
            </Button>
          )}
        </div>
      )}
    </>
  );
}
