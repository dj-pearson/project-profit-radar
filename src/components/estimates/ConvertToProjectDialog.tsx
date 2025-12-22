import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  estimateConversionService,
  EstimateData,
  ProjectConversionData
} from '@/services/estimateToProjectConversion';
import {
  Building2,
  DollarSign,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Loader2
} from 'lucide-react';

interface ConvertToProjectDialogProps {
  estimateId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (projectId: string) => void;
}

export const ConvertToProjectDialog = ({
  estimateId,
  isOpen,
  onClose,
  onSuccess
}: ConvertToProjectDialogProps) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [estimate, setEstimate] = useState<EstimateData | null>(null);
  const [canConvert, setCanConvert] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);

  // Customization fields
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectLocation, setProjectLocation] = useState('');
  const [projectBudget, setProjectBudget] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (isOpen && estimateId) {
      loadEstimatePreview();
    } else {
      resetForm();
    }
  }, [isOpen, estimateId]);

  const loadEstimatePreview = async () => {
    if (!estimateId || !siteId) return;

    setLoading(true);
    try {
      const preview = await estimateConversionService.getConversionPreview(siteId, estimateId);

      setEstimate(preview.estimate);
      setCanConvert(preview.canConvert);
      setIssues(preview.issues);

      // Pre-fill form with estimate data
      if (preview.estimate) {
        setProjectName(preview.estimate.title);
        setProjectDescription(preview.estimate.description || '');
        setProjectLocation(preview.estimate.site_address || '');
        setProjectBudget(preview.estimate.total_amount.toString());
      }
    } catch (error) {
      console.error('Error loading estimate preview:', error);
      toast({
        title: 'Error',
        description: 'Failed to load estimate details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!estimateId || !userProfile?.company_id || !siteId || !canConvert) return;

    setConverting(true);
    try {
      const customizations: Partial<ProjectConversionData> = {
        name: projectName,
        description: projectDescription,
        location: projectLocation,
        budget: parseFloat(projectBudget),
        start_date: startDate,
        status: 'planning'
      };

      const result = await estimateConversionService.convertEstimateToProject(
        siteId,  // CRITICAL: Site isolation
        estimateId,
        userProfile.company_id,
        customizations
      );

      if (result.success && result.projectId) {
        toast({
          title: 'Success!',
          description: (
            <div className="space-y-2">
              <p>Estimate converted to project successfully!</p>
              <p className="text-sm text-muted-foreground">
                Budget and line items have been transferred.
              </p>
            </div>
          )
        });

        onSuccess?.(result.projectId);
        onClose();

        // Navigate to the new project
        navigate(`/projects/${result.projectId}`);
      } else {
        toast({
          title: 'Conversion Failed',
          description: result.error || 'Failed to convert estimate to project',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Conversion error:', error);
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setConverting(false);
    }
  };

  const resetForm = () => {
    setEstimate(null);
    setCanConvert(false);
    setIssues([]);
    setProjectName('');
    setProjectDescription('');
    setProjectLocation('');
    setProjectBudget('');
    setStartDate(new Date().toISOString().split('T')[0]);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-construction-blue" />
            Convert Estimate to Project
          </DialogTitle>
          <DialogDescription>
            Transform this estimate into an active project with automatic budget and task setup.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Issues/Warnings */}
            {issues.length > 0 && (
              <Alert variant={canConvert ? 'default' : 'destructive'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    {issues.map((issue, index) => (
                      <p key={index} className="text-sm">• {issue}</p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Success Indicator */}
            {canConvert && estimate && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  This estimate is ready to be converted to a project. Review the details below and customize as needed.
                </AlertDescription>
              </Alert>
            )}

            {/* Estimate Summary */}
            {estimate && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-3">
                    Estimate Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Client</p>
                      <p className="font-medium">{estimate.client_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Estimate Value</p>
                      <p className="font-medium">${estimate.total_amount.toLocaleString()}</p>
                    </div>
                    {estimate.line_items && (
                      <div>
                        <p className="text-muted-foreground">Line Items</p>
                        <p className="font-medium">{estimate.line_items.length} items</p>
                      </div>
                    )}
                    {estimate.valid_until && (
                      <div>
                        <p className="text-muted-foreground">Valid Until</p>
                        <p className="font-medium">
                          {new Date(estimate.valid_until).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Conversion Arrow */}
                <div className="flex items-center justify-center py-2">
                  <ArrowRight className="h-6 w-6 text-construction-orange" />
                </div>

                {/* Project Configuration */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-3">
                    Project Configuration
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="project-name">
                        Project Name *
                      </Label>
                      <Input
                        id="project-name"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Enter project name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="project-description">
                        Description
                      </Label>
                      <Textarea
                        id="project-description"
                        value={projectDescription}
                        onChange={(e) => setProjectDescription(e.target.value)}
                        placeholder="Project description and scope"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="project-location">
                          <MapPin className="h-3 w-3 inline mr-1" />
                          Location
                        </Label>
                        <Input
                          id="project-location"
                          value={projectLocation}
                          onChange={(e) => setProjectLocation(e.target.value)}
                          placeholder="Project site address"
                        />
                      </div>

                      <div>
                        <Label htmlFor="project-budget">
                          <DollarSign className="h-3 w-3 inline mr-1" />
                          Budget *
                        </Label>
                        <Input
                          id="project-budget"
                          type="number"
                          value={projectBudget}
                          onChange={(e) => setProjectBudget(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="start-date">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        Start Date
                      </Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* What will happen */}
                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 dark:text-blue-200">
                    <p className="font-semibold mb-2">What will be transferred:</p>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>✓ Client information and contact details</li>
                      <li>✓ Budget from estimate total amount</li>
                      {estimate.line_items && estimate.line_items.length > 0 && (
                        <li>✓ {estimate.line_items.length} line items → Job cost structure</li>
                      )}
                      <li>✓ Project description and notes</li>
                      <li>✓ Site location</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={converting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConvert}
            disabled={!canConvert || converting || !projectName || !projectBudget}
          >
            {converting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Building2 className="mr-2 h-4 w-4" />
                Convert to Project
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
