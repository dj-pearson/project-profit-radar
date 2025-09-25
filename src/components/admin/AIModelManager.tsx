import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, Bot, Settings, Plus, Trash2, Edit, RefreshCw, Save, Eye, EyeOff, ArrowUpDown, Link, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AIModel {
  id: string;
  provider: string;
  model_name: string;
  model_display_name: string;
  model_family: string;
  model_alias?: string;
  is_alias: boolean;
  points_to_model?: string;
  auto_update_alias: boolean;
  auth_method: 'bearer' | 'x-api-key' | 'basic';
  api_endpoint?: string;
  max_tokens?: number;
  context_window?: number;
  speed_rating?: number;
  quality_rating?: number;
  cost_rating?: number;
  is_active: boolean;
  is_default: boolean;
  priority_order: number;
  description?: string;
  deprecated_date?: string;
  deprecation_reason?: string;
  last_updated?: string;
  created_at: string;
}

const AIModelManager = () => {
  const { userProfile } = useAuth();
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);
  const [isNewModel, setIsNewModel] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const [formData, setFormData] = useState({
    provider: 'claude',
    model_name: '',
    model_display_name: '',
    model_family: '',
    model_alias: '',
    is_alias: false,
    points_to_model: '',
    auto_update_alias: false,
    auth_method: 'bearer' as 'bearer' | 'x-api-key' | 'basic',
    api_endpoint: '',
    max_tokens: 4096,
    context_window: 200000,
    speed_rating: 7,
    quality_rating: 8,
    cost_rating: 6,
    is_active: true,
    is_default: false,
    priority_order: 0,
    description: '',
    deprecated_date: '',
    deprecation_reason: ''
  });

  useEffect(() => {
    if (userProfile?.role === 'root_admin') {
      loadModels();
    }
  }, [userProfile]);

  const loadModels = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_model_configurations')
        .select('*')
        .order('priority_order', { ascending: false });

      if (error) throw error;
      setModels((data || []).map(model => ({
        ...model,
        auth_method: model.auth_method as 'bearer' | 'x-api-key' | 'basic'
      })));
    } catch (error) {
      console.error('Error loading models:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load AI models"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      provider: 'claude',
      model_name: '',
      model_display_name: '',
      model_family: '',
      model_alias: '',
      is_alias: false,
      points_to_model: '',
      auto_update_alias: false,
      auth_method: 'bearer' as 'bearer' | 'x-api-key' | 'basic',
      api_endpoint: '',
      max_tokens: 4096,
      context_window: 200000,
      speed_rating: 7,
      quality_rating: 8,
      cost_rating: 6,
      is_active: true,
      is_default: false,
      priority_order: 0,
      description: '',
      deprecated_date: '',
      deprecation_reason: ''
    });
    setEditingModel(null);
    setIsNewModel(false);
  };

  const openEditDialog = (model: AIModel) => {
    setFormData({
      provider: model.provider,
      model_name: model.model_name,
      model_display_name: model.model_display_name,
      model_family: model.model_family || '',
      model_alias: model.model_alias || '',
      is_alias: model.is_alias,
      points_to_model: model.points_to_model || '',
      auto_update_alias: model.auto_update_alias,
      auth_method: model.auth_method,
      api_endpoint: model.api_endpoint || '',
      max_tokens: model.max_tokens || 4096,
      context_window: model.context_window || 200000,
      speed_rating: model.speed_rating || 7,
      quality_rating: model.quality_rating || 8,
      cost_rating: model.cost_rating || 6,
      is_active: model.is_active,
      is_default: model.is_default,
      priority_order: model.priority_order,
      description: model.description || '',
      deprecated_date: model.deprecated_date || '',
      deprecation_reason: model.deprecation_reason || ''
    });
    setEditingModel(model);
    setIsNewModel(false);
  };

  const openNewDialog = () => {
    resetForm();
    setIsNewModel(true);
  };

  const saveModel = async () => {
    try {
      // If setting as default, remove default from others
      if (formData.is_default) {
        await supabase
          .from('ai_model_configurations')
          .update({ is_default: false })
          .eq('provider', formData.provider);
      }

      if (isNewModel) {
        const { error } = await supabase
          .from('ai_model_configurations')
          .insert([formData]);
        if (error) throw error;
        toast({
          title: "Success",
          description: "AI model added successfully"
        });
      } else if (editingModel) {
        const { error } = await supabase
          .from('ai_model_configurations')
          .update(formData)
          .eq('id', editingModel.id);
        if (error) throw error;
        toast({
          title: "Success",
          description: "AI model updated successfully"
        });
      }

      resetForm();
      loadModels();
    } catch (error) {
      console.error('Error saving model:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save AI model"
      });
    }
  };

  const deleteModel = async (model: AIModel) => {
    if (!confirm(`Are you sure you want to delete ${model.model_display_name}?`)) return;

    try {
      const { error } = await supabase
        .from('ai_model_configurations')
        .delete()
        .eq('id', model.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "AI model deleted successfully"
      });
      loadModels();
    } catch (error) {
      console.error('Error deleting model:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete AI model"
      });
    }
  };

  const updateAliases = async () => {
    try {
      // Manual alias update logic since RPC function doesn't exist yet
      const { data: aliases, error: aliasError } = await supabase
        .from('ai_model_configurations')
        .select('*')
        .eq('is_alias', true)
        .eq('auto_update_alias', true);

      if (aliasError) throw aliasError;

      for (const alias of aliases || []) {
        const { data: latestModel } = await supabase
          .from('ai_model_configurations')
          .select('model_name')
          .eq('model_family', alias.model_family)
          .eq('is_alias', false)
          .eq('is_active', true)
          .is('deprecated_date', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (latestModel && latestModel.model_name !== alias.points_to_model) {
          await supabase
            .from('ai_model_configurations')
            .update({ 
              points_to_model: latestModel.model_name,
              last_updated: new Date().toISOString()
            })
            .eq('id', alias.id);
        }
      }
      
      toast({
        title: "Success",
        description: "Model aliases updated successfully"
      });
      loadModels();
    } catch (error) {
      console.error('Error updating aliases:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update aliases"
      });
    }
  };

  const filteredModels = models.filter(model => showInactive || model.is_active);
  const aliases = models.filter(model => model.is_alias);
  const concreteModels = models.filter(model => !model.is_alias);

  if (userProfile?.role !== 'root_admin') {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="max-w-md">
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              Only root administrators can manage AI models.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Model Management</h1>
          <p className="text-muted-foreground">
            Centralized configuration for all AI models and aliases
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={updateAliases}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Update Aliases
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Model
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {isNewModel ? 'Add New AI Model' : 'Edit AI Model'}
                </DialogTitle>
                <DialogDescription>
                  Configure AI model settings, authentication, and alias behavior
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="technical">Technical</TabsTrigger>
                  <TabsTrigger value="alias">Alias Config</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="provider">Provider</Label>
                      <Select value={formData.provider} onValueChange={(value) => setFormData(prev => ({ ...prev, provider: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="claude">Claude (Anthropic)</SelectItem>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="gemini">Google Gemini</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="model_name">Model Name</Label>
                      <Input
                        id="model_name"
                        value={formData.model_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, model_name: e.target.value }))}
                        placeholder="e.g., claude-sonnet-4-20250514"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="model_display_name">Display Name</Label>
                    <Input
                      id="model_display_name"
                      value={formData.model_display_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, model_display_name: e.target.value }))}
                      placeholder="e.g., Claude Sonnet 4"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="model_family">Model Family</Label>
                    <Input
                      id="model_family"
                      value={formData.model_family}
                      onChange={(e) => setFormData(prev => ({ ...prev, model_family: e.target.value }))}
                      placeholder="e.g., claude-sonnet"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of model capabilities"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Active</Label>
                      <p className="text-sm text-muted-foreground">Enable this model for use</p>
                    </div>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Set as Default</Label>
                      <p className="text-sm text-muted-foreground">Use as default for this provider</p>
                    </div>
                    <Switch
                      checked={formData.is_default}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="technical" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="auth_method">Authentication Method</Label>
                      <Select value={formData.auth_method} onValueChange={(value: 'bearer' | 'x-api-key' | 'basic') => setFormData(prev => ({ ...prev, auth_method: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bearer">Bearer Token</SelectItem>
                          <SelectItem value="x-api-key">X-API-Key Header</SelectItem>
                          <SelectItem value="basic">Basic Auth</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="priority_order">Priority Order</Label>
                      <Input
                        id="priority_order"
                        type="number"
                        value={formData.priority_order}
                        onChange={(e) => setFormData(prev => ({ ...prev, priority_order: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="api_endpoint">API Endpoint</Label>
                    <Input
                      id="api_endpoint"
                      value={formData.api_endpoint}
                      onChange={(e) => setFormData(prev => ({ ...prev, api_endpoint: e.target.value }))}
                      placeholder="https://api.anthropic.com/v1/messages"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="max_tokens">Max Tokens</Label>
                      <Input
                        id="max_tokens"
                        type="number"
                        value={formData.max_tokens}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_tokens: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="context_window">Context Window</Label>
                      <Input
                        id="context_window"
                        type="number"
                        value={formData.context_window}
                        onChange={(e) => setFormData(prev => ({ ...prev, context_window: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="speed_rating">Speed Rating (1-10)</Label>
                      <Input
                        id="speed_rating"
                        type="number"
                        min="1"
                        max="10"
                        value={formData.speed_rating}
                        onChange={(e) => setFormData(prev => ({ ...prev, speed_rating: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quality_rating">Quality Rating (1-10)</Label>
                      <Input
                        id="quality_rating"
                        type="number"
                        min="1"
                        max="10"
                        value={formData.quality_rating}
                        onChange={(e) => setFormData(prev => ({ ...prev, quality_rating: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cost_rating">Cost Rating (1-10)</Label>
                      <Input
                        id="cost_rating"
                        type="number"
                        min="1"
                        max="10"
                        value={formData.cost_rating}
                        onChange={(e) => setFormData(prev => ({ ...prev, cost_rating: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="alias" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Is Alias</Label>
                      <p className="text-sm text-muted-foregreen">This is an alias that points to another model</p>
                    </div>
                    <Switch
                      checked={formData.is_alias}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_alias: checked }))}
                    />
                  </div>
                  
                  {formData.is_alias && (
                    <>
                      <div>
                        <Label htmlFor="model_alias">Alias Name</Label>
                        <Input
                          id="model_alias"
                          value={formData.model_alias}
                          onChange={(e) => setFormData(prev => ({ ...prev, model_alias: e.target.value }))}
                          placeholder="e.g., claude-sonnet-latest"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="points_to_model">Points to Model</Label>
                        <Select value={formData.points_to_model} onValueChange={(value) => setFormData(prev => ({ ...prev, points_to_model: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select target model" />
                          </SelectTrigger>
                          <SelectContent>
                            {concreteModels
                              .filter(m => m.model_family === formData.model_family)
                              .map(model => (
                                <SelectItem key={model.id} value={model.model_name}>
                                  {model.model_display_name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Auto-Update Alias</Label>
                          <p className="text-sm text-muted-foreground">Automatically point to latest model in family</p>
                        </div>
                        <Switch
                          checked={formData.auto_update_alias}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_update_alias: checked }))}
                        />
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button onClick={saveModel}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Model
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={setShowInactive}
          />
          <Label htmlFor="show-inactive">Show inactive models</Label>
        </div>
        <Badge variant="secondary">{filteredModels.length} models</Badge>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Models ({filteredModels.length})</TabsTrigger>
          <TabsTrigger value="aliases">Aliases ({aliases.length})</TabsTrigger>
          <TabsTrigger value="concrete">Concrete Models ({concreteModels.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <ModelsList models={filteredModels} onEdit={openEditDialog} onDelete={deleteModel} />
        </TabsContent>
        
        <TabsContent value="aliases" className="space-y-4">
          <ModelsList models={aliases.filter(m => showInactive || m.is_active)} onEdit={openEditDialog} onDelete={deleteModel} />
        </TabsContent>
        
        <TabsContent value="concrete" className="space-y-4">
          <ModelsList models={concreteModels.filter(m => showInactive || m.is_active)} onEdit={openEditDialog} onDelete={deleteModel} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface ModelsListProps {
  models: AIModel[];
  onEdit: (model: AIModel) => void;
  onDelete: (model: AIModel) => void;
}

const ModelsList: React.FC<ModelsListProps> = ({ models, onEdit, onDelete }) => {
  if (models.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No models found</h3>
          <p className="text-muted-foreground">
            Add your first AI model to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {models.map((model) => (
        <Card key={model.id} className={`transition-all ${!model.is_active ? 'opacity-60' : ''}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`h-3 w-3 rounded-full ${model.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {model.model_display_name}
                    {model.is_alias && <Link className="h-4 w-4 text-blue-500" />}
                    {model.is_default && <Badge variant="default">Default</Badge>}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{model.provider}</span>
                    <span>•</span>
                    <span>{model.model_name}</span>
                    {model.is_alias && model.points_to_model && (
                      <>
                        <span>•</span>
                        <span className="text-blue-600">→ {model.points_to_model}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(model)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => onDelete(model)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Auth:</span>
                <p className="font-medium">{model.auth_method}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Speed:</span>
                <p className="font-medium">{model.speed_rating}/10</p>
              </div>
              <div>
                <span className="text-muted-foreground">Quality:</span>
                <p className="font-medium">{model.quality_rating}/10</p>
              </div>
              <div>
                <span className="text-muted-foreground">Cost:</span>
                <p className="font-medium">{model.cost_rating}/10</p>
              </div>
            </div>
            {model.description && (
              <p className="text-sm text-muted-foreground mt-2">{model.description}</p>
            )}
            {model.deprecated_date && (
              <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Deprecated: {model.deprecation_reason}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AIModelManager;