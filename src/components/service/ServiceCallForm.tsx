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
import { Upload, Plus, Trash2, Clock, MapPin, User, DollarSign, Camera, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ServiceCallFormProps {
  callId?: string;
  onSave?: (data: any) => void;
  onCancel?: () => void;
}

export default function ServiceCallForm({ callId, onSave, onCancel }: ServiceCallFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_address: "",
    customer_contact_person: "",
    customer_company: "",
    service_type: "",
    priority: "standard",
    trade_required: "",
    requested_date: "",
    requested_time_start: "",
    requested_time_end: "",
    scheduled_date: "",
    scheduled_time_start: "",
    scheduled_time_end: "",
    estimated_duration_minutes: "60",
    estimated_cost: "",
    assigned_technician_id: "",
    backup_technician_id: "",
    access_instructions: "",
    special_requirements: "",
    safety_notes: "",
    equipment_needed: [] as string[],
    tools_required: [] as string[],
    is_billable: true,
    is_warranty_work: false,
    is_recurring: false,
    recurring_frequency: "",
    notes: ""
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addEquipment = () => {
    setFormData(prev => ({
      ...prev,
      equipment_needed: [...prev.equipment_needed, ""]
    }));
  };

  const removeEquipment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      equipment_needed: prev.equipment_needed.filter((_, i) => i !== index)
    }));
  };

  const updateEquipment = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      equipment_needed: prev.equipment_needed.map((item, i) =>
        i === index ? value : item
      )
    }));
  };

  const addTool = () => {
    setFormData(prev => ({
      ...prev,
      tools_required: [...prev.tools_required, ""]
    }));
  };

  const removeTool = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tools_required: prev.tools_required.filter((_, i) => i !== index)
    }));
  };

  const updateTool = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      tools_required: prev.tools_required.map((item, i) =>
        i === index ? value : item
      )
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSave?.(formData);
    toast({
      title: "Service Call Saved",
      description: callId ? "Service call updated successfully" : "New service call created successfully",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          {callId ? "Edit Service Call" : "Create Service Call"}
        </h1>
        <p className="text-muted-foreground mt-2">
          Complete service call information and assignment details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Customer Information
            </CardTitle>
            <CardDescription>
              Customer details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_name">Customer Name *</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => handleInputChange("customer_name", e.target.value)}
                  placeholder="John Smith"
                  required
                />
              </div>
              <div>
                <Label htmlFor="customer_company">Company (Optional)</Label>
                <Input
                  id="customer_company"
                  value={formData.customer_company}
                  onChange={(e) => handleInputChange("customer_company", e.target.value)}
                  placeholder="ABC Corp"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_phone">Phone Number *</Label>
                <Input
                  id="customer_phone"
                  value={formData.customer_phone}
                  onChange={(e) => handleInputChange("customer_phone", e.target.value)}
                  placeholder="(555) 123-4567"
                  required
                />
              </div>
              <div>
                <Label htmlFor="customer_email">Email Address</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => handleInputChange("customer_email", e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="customer_address">Service Address *</Label>
              <Textarea
                id="customer_address"
                value={formData.customer_address}
                onChange={(e) => handleInputChange("customer_address", e.target.value)}
                placeholder="123 Main Street, Springfield, IL 62701"
                rows={2}
                required
              />
            </div>

            <div>
              <Label htmlFor="customer_contact_person">On-Site Contact Person</Label>
              <Input
                id="customer_contact_person"
                value={formData.customer_contact_person}
                onChange={(e) => handleInputChange("customer_contact_person", e.target.value)}
                placeholder="Building manager, tenant, etc."
              />
            </div>
          </CardContent>
        </Card>

        {/* Service Details */}
        <Card>
          <CardHeader>
            <CardTitle>Service Details</CardTitle>
            <CardDescription>
              Description of the service to be performed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Issue Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="HVAC system not heating properly"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Detailed Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Provide detailed description of the issue or service needed..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="service_type">Service Type *</Label>
                <Select value={formData.service_type} onValueChange={(value) => handleInputChange("service_type", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="installation">Installation</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="warranty_work">Warranty Work</SelectItem>
                    <SelectItem value="preventive_maintenance">Preventive Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority *</Label>
                <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="trade_required">Trade Required</Label>
                <Select value={formData.trade_required} onValueChange={(value) => handleInputChange("trade_required", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="plumbing">Plumbing</SelectItem>
                    <SelectItem value="hvac">HVAC</SelectItem>
                    <SelectItem value="roofing">Roofing</SelectItem>
                    <SelectItem value="flooring">Flooring</SelectItem>
                    <SelectItem value="painting">Painting</SelectItem>
                    <SelectItem value="landscaping">Landscaping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scheduling */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Scheduling & Assignment
            </CardTitle>
            <CardDescription>
              Schedule the service call and assign technicians
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="requested_date">Customer Requested Date</Label>
                <Input
                  id="requested_date"
                  type="date"
                  value={formData.requested_date}
                  onChange={(e) => handleInputChange("requested_date", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="requested_time_start">Requested Time</Label>
                <Input
                  id="requested_time_start"
                  type="time"
                  value={formData.requested_time_start}
                  onChange={(e) => handleInputChange("requested_time_start", e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="scheduled_date">Scheduled Date</Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => handleInputChange("scheduled_date", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="scheduled_time_start">Start Time</Label>
                <Input
                  id="scheduled_time_start"
                  type="time"
                  value={formData.scheduled_time_start}
                  onChange={(e) => handleInputChange("scheduled_time_start", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="estimated_duration_minutes">Duration (Minutes)</Label>
                <Input
                  id="estimated_duration_minutes"
                  type="number"
                  value={formData.estimated_duration_minutes}
                  onChange={(e) => handleInputChange("estimated_duration_minutes", e.target.value)}
                  placeholder="60"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assigned_technician_id">Assigned Technician</Label>
                <Select value={formData.assigned_technician_id} onValueChange={(value) => handleInputChange("assigned_technician_id", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select technician" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mike">Mike Johnson</SelectItem>
                    <SelectItem value="dave">Dave Miller</SelectItem>
                    <SelectItem value="tom">Tom Brown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="backup_technician_id">Backup Technician</Label>
                <Select value={formData.backup_technician_id} onValueChange={(value) => handleInputChange("backup_technician_id", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select backup" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mike">Mike Johnson</SelectItem>
                    <SelectItem value="dave">Dave Miller</SelectItem>
                    <SelectItem value="tom">Tom Brown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial & Billing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Financial Information
            </CardTitle>
            <CardDescription>
              Cost estimates and billing information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="estimated_cost">Estimated Cost</Label>
              <Input
                id="estimated_cost"
                type="number"
                step="0.01"
                value={formData.estimated_cost}
                onChange={(e) => handleInputChange("estimated_cost", e.target.value)}
                placeholder="250.00"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_billable"
                    checked={formData.is_billable}
                    onCheckedChange={(checked) => handleInputChange("is_billable", checked)}
                  />
                  <Label htmlFor="is_billable">Billable Service</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_warranty_work"
                    checked={formData.is_warranty_work}
                    onCheckedChange={(checked) => handleInputChange("is_warranty_work", checked)}
                  />
                  <Label htmlFor="is_warranty_work">Warranty Work</Label>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_recurring"
                    checked={formData.is_recurring}
                    onCheckedChange={(checked) => handleInputChange("is_recurring", checked)}
                  />
                  <Label htmlFor="is_recurring">Recurring Service</Label>
                </div>
                {formData.is_recurring && (
                  <div>
                    <Label htmlFor="recurring_frequency">Frequency</Label>
                    <Select value={formData.recurring_frequency} onValueChange={(value) => handleInputChange("recurring_frequency", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="semi_annually">Semi-Annually</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Access & Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Access & Requirements
            </CardTitle>
            <CardDescription>
              Special instructions, safety notes, and equipment requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="access_instructions">Access Instructions</Label>
              <Textarea
                id="access_instructions"
                value={formData.access_instructions}
                onChange={(e) => handleInputChange("access_instructions", e.target.value)}
                placeholder="Key location, entry procedures, parking instructions..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="special_requirements">Special Requirements</Label>
              <Textarea
                id="special_requirements"
                value={formData.special_requirements}
                onChange={(e) => handleInputChange("special_requirements", e.target.value)}
                placeholder="Special tools, permits, customer preferences..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="safety_notes">Safety Notes</Label>
              <Textarea
                id="safety_notes"
                value={formData.safety_notes}
                onChange={(e) => handleInputChange("safety_notes", e.target.value)}
                placeholder="Safety hazards, PPE requirements, special precautions..."
                rows={2}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <Label>Equipment Needed</Label>
                <Button type="button" variant="outline" size="sm" onClick={addEquipment}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Equipment
                </Button>
              </div>
              <div className="space-y-2">
                {formData.equipment_needed.map((equipment, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Equipment name"
                      value={equipment}
                      onChange={(e) => updateEquipment(index, e.target.value)}
                    />
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
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <Label>Tools Required</Label>
                <Button type="button" variant="outline" size="sm" onClick={addTool}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tool
                </Button>
              </div>
              <div className="space-y-2">
                {formData.tools_required.map((tool, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Tool name"
                      value={tool}
                      onChange={(e) => updateTool(index, e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTool(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
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
            {callId ? "Update Service Call" : "Create Service Call"}
          </Button>
        </div>
      </form>
    </div>
  );
}