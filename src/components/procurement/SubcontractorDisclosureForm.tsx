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
import { Upload, Plus, Trash2, Building2, Award, Shield, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SubcontractorDisclosureFormProps {
  bidSubmissionId?: string;
  disclosureId?: string;
  onSave?: (data: any) => void;
  onCancel?: () => void;
}

export default function SubcontractorDisclosureForm({ 
  bidSubmissionId, 
  disclosureId, 
  onSave, 
  onCancel 
}: SubcontractorDisclosureFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    subcontractor_name: "",
    business_address: "",
    contact_person: "",
    phone: "",
    email: "",
    license_number: "",
    license_classification: "",
    business_structure: "",
    tax_id: "",
    duns_number: "",
    work_category: "",
    work_description: "",
    subcontract_amount: "",
    percentage_of_total: "",
    proposed_start_date: "",
    proposed_completion_date: "",
    is_mbe_certified: false,
    is_wbe_certified: false,
    is_dbe_certified: false,
    is_veteran_owned: false,
    is_small_business: false,
    certification_numbers: [] as string[],
    previous_work_description: "",
    reference_contacts: [] as any[],
    has_required_insurance: false,
    insurance_carrier: "",
    insurance_policy_number: "",
    insurance_expiry_date: "",
    bonding_capacity: "",
    notes: ""
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addReference = () => {
    setFormData(prev => ({
      ...prev,
      reference_contacts: [...prev.reference_contacts, { 
        company: "", 
        contact_name: "", 
        phone: "", 
        email: "", 
        project_description: "",
        project_value: "" 
      }]
    }));
  };

  const removeReference = (index: number) => {
    setFormData(prev => ({
      ...prev,
      reference_contacts: prev.reference_contacts.filter((_, i) => i !== index)
    }));
  };

  const updateReference = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      reference_contacts: prev.reference_contacts.map((ref, i) =>
        i === index ? { ...ref, [field]: value } : ref
      )
    }));
  };

  const addCertificationNumber = () => {
    setFormData(prev => ({
      ...prev,
      certification_numbers: [...prev.certification_numbers, ""]
    }));
  };

  const removeCertificationNumber = (index: number) => {
    setFormData(prev => ({
      ...prev,
      certification_numbers: prev.certification_numbers.filter((_, i) => i !== index)
    }));
  };

  const updateCertificationNumber = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      certification_numbers: prev.certification_numbers.map((cert, i) =>
        i === index ? value : cert
      )
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate percentage if subcontract amount is provided
    if (formData.subcontract_amount) {
      // This would typically be calculated based on total bid amount
      // For now, we'll leave it to be set manually
    }

    onSave?.(formData);
    toast({
      title: "Subcontractor Disclosure Saved",
      description: disclosureId ? "Disclosure updated successfully" : "New disclosure created successfully",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          {disclosureId ? "Edit Subcontractor Disclosure" : "Add Subcontractor Disclosure"}
        </h1>
        <p className="text-muted-foreground mt-2">
          Complete subcontractor information required for public procurement bids
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Company Information
            </CardTitle>
            <CardDescription>
              Basic business information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="subcontractor_name">Company Name *</Label>
              <Input
                id="subcontractor_name"
                value={formData.subcontractor_name}
                onChange={(e) => handleInputChange("subcontractor_name", e.target.value)}
                placeholder="ABC Construction Company"
                required
              />
            </div>

            <div>
              <Label htmlFor="business_address">Business Address</Label>
              <Textarea
                id="business_address"
                value={formData.business_address}
                onChange={(e) => handleInputChange("business_address", e.target.value)}
                placeholder="123 Main Street, Springfield, IL 62701"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_person">Primary Contact</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => handleInputChange("contact_person", e.target.value)}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="contact@abcconstruction.com"
                />
              </div>
              <div>
                <Label htmlFor="business_structure">Business Structure</Label>
                <Select value={formData.business_structure} onValueChange={(value) => handleInputChange("business_structure", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select structure" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corporation">Corporation</SelectItem>
                    <SelectItem value="llc">LLC</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="tax_id">Tax ID / EIN</Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) => handleInputChange("tax_id", e.target.value)}
                  placeholder="12-3456789"
                />
              </div>
              <div>
                <Label htmlFor="duns_number">DUNS Number</Label>
                <Input
                  id="duns_number"
                  value={formData.duns_number}
                  onChange={(e) => handleInputChange("duns_number", e.target.value)}
                  placeholder="123456789"
                />
              </div>
              <div>
                <Label htmlFor="license_number">License Number</Label>
                <Input
                  id="license_number"
                  value={formData.license_number}
                  onChange={(e) => handleInputChange("license_number", e.target.value)}
                  placeholder="IL-12345"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="license_classification">License Classification</Label>
              <Input
                id="license_classification"
                value={formData.license_classification}
                onChange={(e) => handleInputChange("license_classification", e.target.value)}
                placeholder="Class A General Contractor"
              />
            </div>
          </CardContent>
        </Card>

        {/* Work Scope */}
        <Card>
          <CardHeader>
            <CardTitle>Work Scope & Contract Details</CardTitle>
            <CardDescription>
              Describe the work to be performed and contract terms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="work_category">Work Category *</Label>
                <Input
                  id="work_category"
                  value={formData.work_category}
                  onChange={(e) => handleInputChange("work_category", e.target.value)}
                  placeholder="Electrical, Plumbing, HVAC, etc."
                  required
                />
              </div>
              <div>
                <Label htmlFor="subcontract_amount">Subcontract Amount *</Label>
                <Input
                  id="subcontract_amount"
                  type="number"
                  step="0.01"
                  value={formData.subcontract_amount}
                  onChange={(e) => handleInputChange("subcontract_amount", e.target.value)}
                  placeholder="150000.00"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="work_description">Work Description *</Label>
              <Textarea
                id="work_description"
                value={formData.work_description}
                onChange={(e) => handleInputChange("work_description", e.target.value)}
                placeholder="Detailed description of the work to be performed..."
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="percentage_of_total">Percentage of Total Bid</Label>
                <Input
                  id="percentage_of_total"
                  type="number"
                  step="0.01"
                  value={formData.percentage_of_total}
                  onChange={(e) => handleInputChange("percentage_of_total", e.target.value)}
                  placeholder="6.00"
                />
              </div>
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
            </div>
          </CardContent>
        </Card>

        {/* Certifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2" />
              Certifications & Compliance
            </CardTitle>
            <CardDescription>
              Minority, women, veteran, and small business certifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_mbe_certified"
                    checked={formData.is_mbe_certified}
                    onCheckedChange={(checked) => handleInputChange("is_mbe_certified", checked)}
                  />
                  <Label htmlFor="is_mbe_certified">Minority Business Enterprise (MBE)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_wbe_certified"
                    checked={formData.is_wbe_certified}
                    onCheckedChange={(checked) => handleInputChange("is_wbe_certified", checked)}
                  />
                  <Label htmlFor="is_wbe_certified">Women Business Enterprise (WBE)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_dbe_certified"
                    checked={formData.is_dbe_certified}
                    onCheckedChange={(checked) => handleInputChange("is_dbe_certified", checked)}
                  />
                  <Label htmlFor="is_dbe_certified">Disadvantaged Business Enterprise (DBE)</Label>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_veteran_owned"
                    checked={formData.is_veteran_owned}
                    onCheckedChange={(checked) => handleInputChange("is_veteran_owned", checked)}
                  />
                  <Label htmlFor="is_veteran_owned">Veteran-Owned Small Business</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_small_business"
                    checked={formData.is_small_business}
                    onCheckedChange={(checked) => handleInputChange("is_small_business", checked)}
                  />
                  <Label htmlFor="is_small_business">Small Business</Label>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <Label>Certification Numbers</Label>
                <Button type="button" variant="outline" size="sm" onClick={addCertificationNumber}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Certification
                </Button>
              </div>
              <div className="space-y-2">
                {formData.certification_numbers.map((cert, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Certification number"
                      value={cert}
                      onChange={(e) => updateCertificationNumber(index, e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCertificationNumber(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insurance & Bonding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Insurance & Bonding
            </CardTitle>
            <CardDescription>
              Insurance coverage and bonding capacity information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has_required_insurance"
                checked={formData.has_required_insurance}
                onCheckedChange={(checked) => handleInputChange("has_required_insurance", checked)}
              />
              <Label htmlFor="has_required_insurance">Has Required Insurance Coverage</Label>
            </div>

            {formData.has_required_insurance && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="insurance_carrier">Insurance Carrier</Label>
                  <Input
                    id="insurance_carrier"
                    value={formData.insurance_carrier}
                    onChange={(e) => handleInputChange("insurance_carrier", e.target.value)}
                    placeholder="State Farm, Allstate, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="insurance_policy_number">Policy Number</Label>
                  <Input
                    id="insurance_policy_number"
                    value={formData.insurance_policy_number}
                    onChange={(e) => handleInputChange("insurance_policy_number", e.target.value)}
                    placeholder="POL-123456789"
                  />
                </div>
                <div>
                  <Label htmlFor="insurance_expiry_date">Expiry Date</Label>
                  <Input
                    id="insurance_expiry_date"
                    type="date"
                    value={formData.insurance_expiry_date}
                    onChange={(e) => handleInputChange("insurance_expiry_date", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="bonding_capacity">Bonding Capacity</Label>
                  <Input
                    id="bonding_capacity"
                    type="number"
                    step="0.01"
                    value={formData.bonding_capacity}
                    onChange={(e) => handleInputChange("bonding_capacity", e.target.value)}
                    placeholder="500000.00"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* References */}
        <Card>
          <CardHeader>
            <CardTitle>Previous Work & References</CardTitle>
            <CardDescription>
              Relevant experience and client references
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="previous_work_description">Previous Work Description</Label>
              <Textarea
                id="previous_work_description"
                value={formData.previous_work_description}
                onChange={(e) => handleInputChange("previous_work_description", e.target.value)}
                placeholder="Describe relevant previous projects and experience..."
                rows={3}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <Label>Client References</Label>
                <Button type="button" variant="outline" size="sm" onClick={addReference}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Reference
                </Button>
              </div>
              <div className="space-y-4">
                {formData.reference_contacts.map((reference, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Reference #{index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeReference(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Company Name"
                        value={reference.company}
                        onChange={(e) => updateReference(index, "company", e.target.value)}
                      />
                      <Input
                        placeholder="Contact Name"
                        value={reference.contact_name}
                        onChange={(e) => updateReference(index, "contact_name", e.target.value)}
                      />
                      <Input
                        placeholder="Phone"
                        value={reference.phone}
                        onChange={(e) => updateReference(index, "phone", e.target.value)}
                      />
                      <Input
                        placeholder="Email"
                        value={reference.email}
                        onChange={(e) => updateReference(index, "email", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Project Description"
                        value={reference.project_description}
                        onChange={(e) => updateReference(index, "project_description", e.target.value)}
                      />
                      <Input
                        placeholder="Project Value"
                        type="number"
                        value={reference.project_value}
                        onChange={(e) => updateReference(index, "project_value", e.target.value)}
                      />
                    </div>
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
                placeholder="Any additional information about this subcontractor..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {disclosureId ? "Update Disclosure" : "Save Disclosure"}
          </Button>
        </div>
      </form>
    </div>
  );
}