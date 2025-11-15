import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Save,
  Star,
  Trash2,
  Share2,
  Check,
  Filter
} from 'lucide-react';

interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: any;
  is_shared: boolean;
  is_default: boolean;
  use_count: number;
  last_used_at: string | null;
}

interface FilterPresetsManagerProps {
  context: string; // 'projects', 'estimates', etc.
  currentFilters: any;
  onLoadPreset: (filters: any) => void;
  userId?: string;
  companyId?: string;
}

export function FilterPresetsManager({
  context,
  currentFilters,
  onLoadPreset,
  userId,
  companyId
}: FilterPresetsManagerProps) {
  const { toast } = useToast();
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<FilterPreset | null>(null);

  // Save preset form
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [shareWithCompany, setShareWithCompany] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);

  useEffect(() => {
    if (userId) {
      loadPresets();
    }
  }, [userId, context]);

  const loadPresets = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('saved_filter_presets')
        .select('*')
        .eq('context', context)
        .or(`user_id.eq.${userId},and(is_shared.eq.true,company_id.eq.${companyId})`)
        .order('is_default', { ascending: false })
        .order('use_count', { ascending: false });

      if (error) throw error;
      setPresets(data || []);
    } catch (error: any) {
      console.error('Error loading presets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreset = async () => {
    if (!presetName.trim() || !userId) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please enter a name for this preset'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('saved_filter_presets')
        .insert({
          user_id: userId,
          company_id: shareWithCompany ? companyId : null,
          name: presetName.trim(),
          description: presetDescription.trim() || null,
          context,
          filters: currentFilters,
          is_shared: shareWithCompany,
          is_default: setAsDefault
        });

      if (error) throw error;

      toast({
        title: 'Preset Saved',
        description: `"${presetName}" has been saved successfully`
      });

      setShowSaveDialog(false);
      setPresetName('');
      setPresetDescription('');
      setShareWithCompany(false);
      setSetAsDefault(false);
      loadPresets();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save preset'
      });
    }
  };

  const handleLoadPreset = async (preset: FilterPreset) => {
    try {
      // Increment use count
      await supabase.rpc('increment_filter_preset_use_count', { preset_id: preset.id });

      onLoadPreset(preset.filters);

      toast({
        title: 'Preset Loaded',
        description: `Filters from "${preset.name}" have been applied`
      });

      loadPresets(); // Refresh to show updated use count
    } catch (error) {
      console.error('Error loading preset:', error);
    }
  };

  const handleDeletePreset = async () => {
    if (!selectedPreset) return;

    try {
      const { error } = await supabase
        .from('saved_filter_presets')
        .delete()
        .eq('id', selectedPreset.id);

      if (error) throw error;

      toast({
        title: 'Preset Deleted',
        description: `"${selectedPreset.name}" has been deleted`
      });

      setShowDeleteDialog(false);
      setSelectedPreset(null);
      loadPresets();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete preset'
      });
    }
  };

  const handleSetDefault = async (preset: FilterPreset) => {
    try {
      const { error } = await supabase
        .from('saved_filter_presets')
        .update({ is_default: !preset.is_default })
        .eq('id', preset.id);

      if (error) throw error;

      toast({
        title: preset.is_default ? 'Default Removed' : 'Default Set',
        description: preset.is_default
          ? `"${preset.name}" is no longer the default`
          : `"${preset.name}" set as default preset`
      });

      loadPresets();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update preset'
      });
    }
  };

  const hasActiveFilters = () => {
    if (!currentFilters) return false;

    // Check if any filter values are set
    return Object.values(currentFilters).some(value => {
      if (value === null || value === undefined || value === '') return false;
      if (value === 'all') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filter Presets</span>
            <span className="sm:hidden">Presets</span>
            {presets.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {presets.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {presets.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No saved presets yet
            </div>
          ) : (
            <>
              {presets.map((preset) => (
                <DropdownMenuItem
                  key={preset.id}
                  onClick={() => handleLoadPreset(preset)}
                  className="flex items-start justify-between gap-2 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {preset.name}
                      </span>
                      {preset.is_default && (
                        <Star className="h-3 w-3 fill-primary text-primary shrink-0" />
                      )}
                      {preset.is_shared && (
                        <Share2 className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    {preset.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {preset.description}
                      </p>
                    )}
                    {preset.use_count > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Used {preset.use_count} {preset.use_count === 1 ? 'time' : 'times'}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetDefault(preset);
                      }}
                    >
                      <Star className={`h-3 w-3 ${preset.is_default ? 'fill-primary text-primary' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPreset(preset);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowSaveDialog(true)}
            disabled={!hasActiveFilters()}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Save Current Filters
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save Preset Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Filter Preset</DialogTitle>
            <DialogDescription>
              Save your current filters for quick access later
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">Preset Name *</Label>
              <Input
                id="preset-name"
                placeholder="My Active Projects"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preset-description">Description (Optional)</Label>
              <Input
                id="preset-description"
                placeholder="Projects I'm currently managing"
                value={presetDescription}
                onChange={(e) => setPresetDescription(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="set-default"
                  checked={setAsDefault}
                  onCheckedChange={(checked) => setSetAsDefault(checked as boolean)}
                />
                <label
                  htmlFor="set-default"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Set as my default preset
                </label>
              </div>

              {companyId && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="share-company"
                    checked={shareWithCompany}
                    onCheckedChange={(checked) => setShareWithCompany(checked as boolean)}
                  />
                  <label
                    htmlFor="share-company"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Share with my company
                  </label>
                </div>
              )}
            </div>

            {/* Preview current filters */}
            <div className="border rounded-lg p-3 bg-muted/50">
              <div className="text-xs font-medium mb-2">Active Filters:</div>
              <div className="text-xs text-muted-foreground space-y-1">
                {Object.entries(currentFilters || {}).map(([key, value]) => {
                  if (value && value !== 'all' && value !== '' && (!Array.isArray(value) || value.length > 0)) {
                    return (
                      <div key={key}>
                        • {key.replace(/_/g, ' ')}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </div>
                    );
                  }
                  return null;
                }).filter(Boolean)}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
              <Save className="h-4 w-4 mr-2" />
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Preset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedPreset?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedPreset(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePreset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
