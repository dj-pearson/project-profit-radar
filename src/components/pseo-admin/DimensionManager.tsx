import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Plus, Pencil, Eye, Search } from 'lucide-react';
import type { DimensionType } from '@/types/pseo';

interface DimensionItem {
  id: string;
  display_name: string;
  url_slug: string;
  is_active: boolean;
  context_object?: Record<string, unknown>;
  competitor_profile?: Record<string, unknown>;
  geo_level?: string;
  created_at: string;
}

interface DimensionManagerProps {
  dimensionType: DimensionType;
  items: DimensionItem[];
  isLoading: boolean;
  onAdd: (item: Partial<DimensionItem>) => void;
  onUpdate: (id: string, updates: Partial<DimensionItem>) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const DIMENSION_LABELS: Record<DimensionType, { title: string; description: string }> = {
  contractor_types: {
    title: 'Contractor Types',
    description: 'Manage the contractor type taxonomy (GC, Electrical, Plumbing, etc.)',
  },
  pain_points: {
    title: 'Pain Points',
    description: 'Manage pain point / intent dimensions (Job Costing, Cash Flow, etc.)',
  },
  geographies: {
    title: 'Geographies',
    description: 'Manage state and metro-level geographic dimensions',
  },
  business_sizes: {
    title: 'Business Sizes',
    description: 'Manage business size segments (Small, Growing, Mid-Size)',
  },
  competitors: {
    title: 'Competitors',
    description: 'Manage competitor comparison profiles',
  },
};

export function DimensionManager({
  dimensionType,
  items,
  isLoading,
  onAdd,
  onUpdate,
  onToggleActive,
}: DimensionManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<DimensionItem | null>(null);
  const [viewingContext, setViewingContext] = useState<DimensionItem | null>(null);

  const [formData, setFormData] = useState({
    id: '',
    display_name: '',
    url_slug: '',
    geo_level: 'state',
    context_json: '{}',
  });

  const label = DIMENSION_LABELS[dimensionType];
  const filteredItems = items.filter(
    (item) =>
      item.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ id: '', display_name: '', url_slug: '', geo_level: 'state', context_json: '{}' });
  };

  const handleOpenAdd = () => {
    resetForm();
    setEditingItem(null);
    setShowAddDialog(true);
  };

  const handleOpenEdit = (item: DimensionItem) => {
    const contextData = item.context_object || item.competitor_profile || {};
    setFormData({
      id: item.id,
      display_name: item.display_name,
      url_slug: item.url_slug,
      geo_level: item.geo_level || 'state',
      context_json: JSON.stringify(contextData, null, 2),
    });
    setEditingItem(item);
    setShowAddDialog(true);
  };

  const handleSave = () => {
    let contextParsed: Record<string, unknown>;
    try {
      contextParsed = JSON.parse(formData.context_json);
    } catch {
      return;
    }

    const payload: Partial<DimensionItem> = {
      id: formData.id,
      display_name: formData.display_name,
      url_slug: formData.url_slug,
      ...(dimensionType === 'competitors'
        ? { competitor_profile: contextParsed }
        : { context_object: contextParsed }),
      ...(dimensionType === 'geographies' ? { geo_level: formData.geo_level } : {}),
    };

    if (editingItem) {
      onUpdate(editingItem.id, payload);
    } else {
      onAdd(payload);
    }
    setShowAddDialog(false);
    resetForm();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{label.title}</CardTitle>
              <CardDescription>{label.description}</CardDescription>
            </div>
            <Button onClick={handleOpenAdd} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>URL Slug</TableHead>
                  {dimensionType === 'geographies' && <TableHead>Level</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={dimensionType === 'geographies' ? 6 : 5} className="text-center text-muted-foreground">
                      No items found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.id}</TableCell>
                      <TableCell className="font-medium">{item.display_name}</TableCell>
                      <TableCell className="text-muted-foreground">{item.url_slug}</TableCell>
                      {dimensionType === 'geographies' && (
                        <TableCell>
                          <Badge variant={item.geo_level === 'state' ? 'default' : 'secondary'}>
                            {item.geo_level}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell>
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={(checked) => onToggleActive(item.id, checked)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingContext(item)}
                            title="View context"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit' : 'Add'} {label.title.slice(0, -1)}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the dimension details.' : 'Add a new dimension to the taxonomy.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dim-id">ID</Label>
                <Input
                  id="dim-id"
                  value={formData.id}
                  onChange={(e) => setFormData((p) => ({ ...p, id: e.target.value }))}
                  disabled={!!editingItem}
                  placeholder="e.g., gc, electrical"
                />
              </div>
              <div>
                <Label htmlFor="dim-name">Display Name</Label>
                <Input
                  id="dim-name"
                  value={formData.display_name}
                  onChange={(e) => setFormData((p) => ({ ...p, display_name: e.target.value }))}
                  placeholder="e.g., General Contractor"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dim-slug">URL Slug</Label>
                <Input
                  id="dim-slug"
                  value={formData.url_slug}
                  onChange={(e) => setFormData((p) => ({ ...p, url_slug: e.target.value }))}
                  placeholder="e.g., general-contractor"
                />
              </div>
              {dimensionType === 'geographies' && (
                <div>
                  <Label htmlFor="dim-geo-level">Geo Level</Label>
                  <Select
                    value={formData.geo_level}
                    onValueChange={(val) => setFormData((p) => ({ ...p, geo_level: val }))}
                  >
                    <SelectTrigger id="dim-geo-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="state">State</SelectItem>
                      <SelectItem value="metro">Metro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="dim-context">
                {dimensionType === 'competitors' ? 'Competitor Profile' : 'Context Object'} (JSON)
              </Label>
              <Textarea
                id="dim-context"
                value={formData.context_json}
                onChange={(e) => setFormData((p) => ({ ...p, context_json: e.target.value }))}
                className="font-mono text-sm min-h-[200px]"
                placeholder="{}"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingItem ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Context Dialog */}
      <Dialog open={!!viewingContext} onOpenChange={() => setViewingContext(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingContext?.display_name} - Context</DialogTitle>
          </DialogHeader>
          <pre className="bg-muted p-4 rounded-md text-sm overflow-auto max-h-[400px]">
            {viewingContext &&
              JSON.stringify(
                viewingContext.context_object || viewingContext.competitor_profile || {},
                null,
                2
              )}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
