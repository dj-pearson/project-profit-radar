import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Upload, Plus, Trash2, DollarSign, Calendar, User, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BidFormProps {
  opportunityId?: string;
  bidId?: string;
  onSave?: (data: any) => void;
  onCancel?: () => void;
}

export default function BidForm({ opportunityId, bidId, onSave, onCancel }: BidFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    bid_amount: "",
    bid_bond_amount: "",
    performance_bond_percentage: "100",
    payment_bond_percentage: "100",
    submission_method: "",
    base_bid_amount: "",
    proposed_start_date: "",
    proposed_completion_date: "",
    project_duration_days: "",
    project_manager_name: "",
    exceptions_taken: "",
    notes: "",
    addenda_acknowledged: [] as string[],
    key_personnel: [] as any[],
    equipment_list: [] as any[],
    alternate_amounts: [] as any[],
    substitutions_requested: [] as any[]
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addPersonnel = () => {
    setFormData(prev => ({
      ...prev,
      key_personnel: [...prev.key_personnel, { name: "", role: "", experience_years: "" }]
    }));
  };

  const removePersonnel = (index: number) => {
    setFormData(prev => ({
      ...prev,
      key_personnel: prev.key_personnel.filter((_, i) => i !== index)
    }));
  };

  const updatePersonnel = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      key_personnel: prev.key_personnel.map((person, i) =>
        i === index ? { ...person, [field]: value } : person
      )
    }));
  };

  const addEquipment = () => {
    setFormData(prev => ({
      ...prev,
      equipment_list: [...prev.equipment_list, { name: "", type: "", capacity: "" }]
    }));
  };

  const removeEquipment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      equipment_list: prev.equipment_list.filter((_, i) => i !== index)
    }));
  };

  const updateEquipment = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      equipment_list: prev.equipment_list.map((equipment, i) =>
        i === index ? { ...equipment, [field]: value } : equipment
      )
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate project duration if dates are provided
    if (formData.proposed_start_date && formData.proposed_completion_date) {
      const startDate = new Date(formData.proposed_start_date);
      const endDate = new Date(formData.proposed_completion_date);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      formData.project_duration_days = diffDays.toString();
    }

    onSave?.(formData);
    toast({
      title: "Bid Saved",
      description: bidId ? "Bid updated successfully" : "New bid created successfully",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          {bidId ? "Edit Bid Submission" : "Create Bid Submission"}
        </h1>
        <p className="text-muted-foreground mt-2">
          Complete your bid submission with all required information and documents
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Bid Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Bid Details
            </CardTitle>
            <CardDescription>
              Enter your bid amounts and bonding information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bid_amount">Total Bid Amount *</Label>
                <Input
                  id="bid_amount"
                  type="number"
                  step="0.01"
                  value={formData.bid_amount}
                  onChange={(e) => handleInputChange("bid_amount", e.target.value)}
                  placeholder="2500000.00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="base_bid_amount">Base Bid Amount</Label>
                <Input
                  id="base_bid_amount"
                  type="number"
                  step="0.01"
                  value={formData.base_bid_amount}
                  onChange={(e) => handleInputChange("base_bid_amount", e.target.value)}
                  placeholder="2400000.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="bid_bond_amount">Bid Bond Amount</Label>
                <Input
                  id="bid_bond_amount"
                  type="number"
                  step="0.01"
                  value={formData.bid_bond_amount}
                  onChange={(e) => handleInputChange("bid_bond_amount", e.target.value)}
                  placeholder="125000.00"
                />
              </div>
              <div>
                <Label htmlFor="performance_bond_percentage">Performance Bond %</Label>
                <Input
                  id="performance_bond_percentage"
                  type="number"
                  step="0.01"
                  value={formData.performance_bond_percentage}
                  onChange={(e) => handleInputChange("performance_bond_percentage", e.target.value)}
                  placeholder="100.00"
                />
              </div>
              <div>
                <Label htmlFor="payment_bond_percentage">Payment Bond %</Label>
                <Input
                  id="payment_bond_percentage"
                  type="number"
                  step="0.01"
                  value={formData.payment_bond_percentage}
                  onChange={(e) => handleInputChange("payment_bond_percentage", e.target.value)}
                  placeholder="100.00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="submission_method">Submission Method</Label>
              <Select value={formData.submission_method} onValueChange={(value) => handleInputChange("submission_method", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select submission method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="electronic">Electronic</SelectItem>
                  <SelectItem value="physical">Physical Delivery</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="portal">Online Portal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Project Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Project Timeline
            </CardTitle>
            <CardDescription>
              Proposed project schedule and duration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="proposed_start_date">Proposed Start Date</Label>
                <Input
                  id="proposed_start_date"
                  type="date"
                  value={formData.proposed_start_date}
                  onChange={(e) => handleInputChange("proposed_start_date", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="proposed_completion_date">Proposed Completion Date</Label>
                <Input
                  id="proposed_completion_date"
                  type="date"
                  value={formData.proposed_completion_date}
                  onChange={(e) => handleInputChange("proposed_completion_date", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="project_duration_days">Duration (Days)</Label>
                <Input
                  id="project_duration_days"
                  type="number"
                  value={formData.project_duration_days}
                  onChange={(e) => handleInputChange("project_duration_days", e.target.value)}
                  placeholder="365"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team & Personnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Project Team
            </CardTitle>
            <CardDescription>
              Identify key personnel and project management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="project_manager_name">Project Manager</Label>
              <Input
                id="project_manager_name"
                value={formData.project_manager_name}
                onChange={(e) => handleInputChange("project_manager_name", e.target.value)}
                placeholder="John Smith, PE"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <Label>Key Personnel</Label>
                <Button type="button" variant="outline" size="sm" onClick={addPersonnel}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Personnel
                </Button>
              </div>
              <div className="space-y-3">
                {formData.key_personnel.map((person, index) => (
                  <div key={index} className="grid grid-cols-4 gap-3 items-end">
                    <div>
                      <Input
                        placeholder="Name"
                        value={person.name}
                        onChange={(e) => updatePersonnel(index, "name", e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="Role"
                        value={person.role}
                        onChange={(e) => updatePersonnel(index, "role", e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="Years Experience"
                        type="number"
                        value={person.experience_years}
                        onChange={(e) => updatePersonnel(index, "experience_years", e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePersonnel(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Equipment List */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment & Resources</CardTitle>
            <CardDescription>
              List major equipment and resources for the project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Equipment List</Label>
              <Button type="button" variant="outline" size="sm" onClick={addEquipment}>
                <Plus className="h-4 w-4 mr-2" />
                Add Equipment
              </Button>
            </div>
            <div className="space-y-3">
              {formData.equipment_list.map((equipment, index) => (
                <div key={index} className="grid grid-cols-4 gap-3 items-end">
                  <div>
                    <Input
                      placeholder="Equipment Name"
                      value={equipment.name}
                      onChange={(e) => updateEquipment(index, "name", e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Type"
                      value={equipment.type}
                      onChange={(e) => updateEquipment(index, "type", e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Capacity"
                      value={equipment.capacity}
                      onChange={(e) => updateEquipment(index, "capacity", e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEquipment(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Compliance & Exceptions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Compliance & Exceptions
            </CardTitle>
            <CardDescription>
              Document any exceptions taken or special considerations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="exceptions_taken">Exceptions Taken</Label>
              <Textarea
                id="exceptions_taken"
                value={formData.exceptions_taken}
                onChange={(e) => handleInputChange("exceptions_taken", e.target.value)}
                placeholder="List any exceptions or clarifications to the specifications..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Any additional information or special considerations..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="outline">
            Save Draft
          </Button>
          <Button type="submit">
            {bidId ? "Update Bid" : "Submit Bid"}
          </Button>
        </div>
      </form>
    </div>
  );
}