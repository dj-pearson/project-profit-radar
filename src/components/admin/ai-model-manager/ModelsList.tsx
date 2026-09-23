import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Bot, Trash2, Edit, Link, Zap } from 'lucide-react';
import type { AIModel } from './types';

interface ModelsListProps {
  models: AIModel[];
  onEdit: (model: AIModel) => void;
  onDelete: (model: AIModel) => void;
}

export const ModelsList: React.FC<ModelsListProps> = ({ models, onEdit, onDelete }) => {
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
                    {model.task_type === 'lightweight' && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        <Zap className="h-3 w-3 mr-1" />
                        Lightweight
                      </Badge>
                    )}
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
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
              <div>
                <span className="text-muted-foreground">Task Type:</span>
                <p className="font-medium capitalize">{model.task_type || 'standard'}</p>
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
