import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Download, 
  Send, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  DollarSign,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Form1099 {
  id: string;
  contractor_name: string;
  contractor_tax_id: string;
  contractor_address: string;
  tax_year: number;
  box1_nonemployee_compensation: number;
  status: string;
  generated_date: string;
  filed_date?: string;
}

interface ContractorSummary {
  contractor_id: string;
  contractor_name: string;
  tax_id: string;
  address: string;
  total_payments: number;
  payment_count: number;
  w9_on_file: boolean;
}

const Form1099Manager = () => {
  const [forms, setForms] = useState<Form1099[]>([]);
  const [contractors, setContractors] = useState<ContractorSummary[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1);
  const [loading, setLoading] = useState(false);
  const [generationInProgress, setGenerationInProgress] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);
  const [includeZeroAmounts, setIncludeZeroAmounts] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadForms();
  }, [selectedYear]);

  const loadForms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('forms_1099')
        .select(`
          *,
          contractors!inner(
            business_name,
            tax_id,
            address
          )
        `)
        .eq('tax_year', selectedYear)
        .order('generated_date', { ascending: false });

      if (error) throw error;
      setForms(data || []);
    } catch (error) {
      console.error('Error loading 1099 forms:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load 1099 forms"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadContractors = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-1099s', {
        body: {
          tax_year: selectedYear,
          include_zero_amounts: true,
          preview_only: true
        }
      });

      if (error) throw error;
      if (data.success) {
        setContractors(data.contractor_summaries || []);
      }
    } catch (error) {
      console.error('Error loading contractor summaries:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load contractor summaries"
      });
    }
  };

  const generate1099Forms = async () => {
    try {
      setGenerationInProgress(true);
      const { data, error } = await supabase.functions.invoke('generate-1099s', {
        body: {
          tax_year: selectedYear,
          contractor_ids: selectedContractors.length > 0 ? selectedContractors : undefined,
          include_zero_amounts: includeZeroAmounts
        }
      });

      if (error) throw error;
      
      if (data.success) {
        toast({
          title: "1099 Forms Generated",
          description: `Successfully generated ${data.forms_generated} forms for tax year ${selectedYear}`
        });
        
        if (data.warnings?.length > 0) {
          toast({
            title: "Generation Warnings",
            description: data.warnings.join(', '),
            variant: "destructive"
          });
        }
        
        setShowGenerateDialog(false);
        loadForms();
      }
    } catch (error) {
      console.error('Error generating 1099 forms:', error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error.message || "Failed to generate 1099 forms"
      });
    } finally {
      setGenerationInProgress(false);
    }
  };

  const markAsFiled = async (formId: string) => {
    try {
      const { error } = await supabase
        .from('forms_1099')
        .update({ 
          status: 'filed',
          filed_date: new Date().toISOString(),
          filed_by: user?.id
        })
        .eq('id', formId);

      if (error) throw error;
      
      toast({
        title: "Form Filed",
        description: "1099 form marked as filed with IRS"
      });
      
      loadForms();
    } catch (error) {
      console.error('Error filing form:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark form as filed"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'generated':
        return <Badge variant="secondary"><FileText className="h-3 w-3 mr-1" />Generated</Badge>;
      case 'filed':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Filed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - 1 - i);
  const filingDeadline = `${selectedYear + 1}-01-31`;
  const isOverdue = new Date() > new Date(filingDeadline);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-construction-orange" />
                1099-NEC Management
              </CardTitle>
              <CardDescription>
                Generate and manage 1099-NEC forms for contractor payments
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <Label htmlFor="tax-year">Tax Year</Label>
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-construction-orange hover:bg-construction-orange/90" onClick={loadContractors}>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate 1099s
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Generate 1099-NEC Forms for {selectedYear}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="include-zero"
                        checked={includeZeroAmounts}
                        onChange={(e) => setIncludeZeroAmounts(e.target.checked)}
                      />
                      <Label htmlFor="include-zero">Include contractors with less than $600</Label>
                    </div>
                    
                    {contractors.length > 0 && (
                      <div>
                        <Label>Contractors Eligible for 1099 ({contractors.length})</Label>
                        <div className="max-h-64 overflow-y-auto space-y-2 mt-2">
                          {contractors.map(contractor => (
                            <div key={contractor.contractor_id} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <div className="font-medium">{contractor.contractor_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {contractor.payment_count} payments • ${contractor.total_payments.toLocaleString()}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {!contractor.w9_on_file && (
                                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                )}
                                <input
                                  type="checkbox"
                                  checked={selectedContractors.includes(contractor.contractor_id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedContractors([...selectedContractors, contractor.contractor_id]);
                                    } else {
                                      setSelectedContractors(selectedContractors.filter(id => id !== contractor.contractor_id));
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center mt-4">
                          <Button 
                            variant="outline" 
                            onClick={() => setSelectedContractors(contractors.map(c => c.contractor_id))}
                          >
                            Select All
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setSelectedContractors([])}
                          >
                            Clear All
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <Separator />
                    
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={generate1099Forms}
                        disabled={generationInProgress}
                        className="bg-construction-orange hover:bg-construction-orange/90"
                      >
                        {generationInProgress ? 'Generating...' : 'Generate Forms'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filing Deadline Warning */}
      {isOverdue && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Filing Deadline Passed</span>
            </div>
            <p className="text-sm text-red-600 mt-1">
              The IRS filing deadline for {selectedYear} was {filingDeadline}. Late filings may incur penalties.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Forms</p>
                <p className="text-2xl font-bold">{forms.length}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Filed</p>
                <p className="text-2xl font-bold text-green-600">
                  {forms.filter(f => f.status === 'filed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-600">
                  {forms.filter(f => f.status !== 'filed').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Payments</p>
                <p className="text-2xl font-bold">
                  ${forms.reduce((sum, f) => sum + f.box1_nonemployee_compensation, 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forms List */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Forms</CardTitle>
          <CardDescription>
            1099-NEC forms for tax year {selectedYear}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading forms...</p>
            </div>
          ) : forms.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No 1099 Forms Generated</h3>
              <p className="text-muted-foreground mb-4">
                Generate 1099-NEC forms for contractors who received $600 or more in {selectedYear}
              </p>
              <Button onClick={() => setShowGenerateDialog(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Generate Forms
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {forms.map(form => (
                <div key={form.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{form.contractor_name}</h3>
                      {getStatusBadge(form.status)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Tax ID: {form.contractor_tax_id}</p>
                      <p>Payment Amount: ${form.box1_nonemployee_compensation.toLocaleString()}</p>
                      <p>Generated: {new Date(form.generated_date).toLocaleDateString()}</p>
                      {form.filed_date && (
                        <p>Filed: {new Date(form.filed_date).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                    {form.status !== 'filed' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => markAsFiled(form.id)}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Mark Filed
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Form1099Manager;