import { supabase } from "@/integrations/supabase/client";

export interface QualityInspection {
  inspection_id: string;
  project_id: string;
  task_id: string;
  inspector_type: "human" | "ai" | "hybrid";
  inspection_date: Date;
  photos: QualityPhoto[];
  ai_analysis: AIAnalysisResult;
  human_verification?: HumanVerification;
  overall_score: number;
  status: "pending" | "in_progress" | "completed" | "failed" | "requires_attention";
  defects_detected: QualityDefect[];
  recommendations: string[];
}

export interface QualityPhoto {
  photo_id: string;
  file_url: string;
  capture_timestamp: Date;
  camera_metadata: CameraMetadata;
  ai_analysis: PhotoAnalysis;
  annotations: QualityAnnotation[];
  comparison_photos?: ComparisonPhoto[];
}

export interface CameraMetadata {
  device_info: string;
  resolution: string;
  focal_length?: number;
  exposure_settings?: string;
  gps_coordinates?: { lat: number; lng: number };
  weather_conditions?: string;
  lighting_conditions: "excellent" | "good" | "fair" | "poor";
}

export interface PhotoAnalysis {
  confidence_score: number;
  detected_objects: DetectedObject[];
  quality_assessment: QualityAssessment;
  defects_found: DefectDetection[];
  compliance_check: ComplianceResult;
  measurements: AutoMeasurement[];
}

export interface DetectedObject {
  object_type: string;
  confidence: number;
  bounding_box: BoundingBox;
  classification: string;
  condition_assessment: "excellent" | "good" | "acceptable" | "poor" | "critical";
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface QualityAssessment {
  overall_quality: "excellent" | "good" | "acceptable" | "poor" | "critical";
  specific_metrics: QualityMetric[];
  comparison_to_standards: StandardsComparison;
  improvement_suggestions: string[];
}

export interface QualityMetric {
  metric_name: string;
  measured_value: number;
  expected_value: number;
  tolerance_range: { min: number; max: number };
  passes_specification: boolean;
  deviation_percentage: number;
}

export interface DefectDetection {
  defect_id: string;
  defect_type: "crack" | "discoloration" | "misalignment" | "incomplete_work" | "damage" | "contamination" | "dimensional_variance";
  severity: "minor" | "moderate" | "major" | "critical";
  confidence: number;
  location: BoundingBox;
  description: string;
  remediation_required: boolean;
  estimated_cost_impact: number;
}

export interface ComplianceResult {
  building_codes_compliance: boolean;
  safety_standards_compliance: boolean;
  quality_standards_compliance: boolean;
  environmental_compliance: boolean;
  violations_detected: ComplianceViolation[];
  certification_status: "compliant" | "minor_issues" | "major_issues" | "non_compliant";
}

export interface ComplianceViolation {
  violation_type: string;
  code_reference: string;
  description: string;
  severity: "warning" | "violation" | "critical";
  required_action: string;
  deadline?: Date;
}

export interface AutoMeasurement {
  measurement_type: "length" | "width" | "height" | "angle" | "area" | "volume";
  measured_value: number;
  unit: string;
  accuracy_confidence: number;
  reference_points: { x: number; y: number }[];
  tolerance_check: boolean;
}

export interface QualityAnnotation {
  annotation_id: string;
  type: "defect" | "measurement" | "note" | "approval" | "concern";
  coordinates: { x: number; y: number };
  text: string;
  created_by: "ai" | "inspector" | "supervisor";
  timestamp: Date;
  severity?: "low" | "medium" | "high" | "critical";
}

export interface ComparisonPhoto {
  reference_photo_url: string;
  comparison_type: "before_after" | "specification" | "similar_project" | "standard_reference";
  similarity_score: number;
  differences_highlighted: DifferenceHighlight[];
}

export interface DifferenceHighlight {
  area: BoundingBox;
  difference_type: "improvement" | "degradation" | "change" | "defect";
  description: string;
}

export interface AIAnalysisResult {
  processing_time_ms: number;
  ai_model_version: string;
  analysis_timestamp: Date;
  overall_confidence: number;
  quality_score: number;
  defects_summary: DefectSummary;
  compliance_summary: ComplianceSummary;
  recommendations_summary: RecommendationSummary;
  requires_human_review: boolean;
}

export interface DefectSummary {
  total_defects: number;
  critical_defects: number;
  major_defects: number;
  minor_defects: number;
  estimated_remediation_cost: number;
  estimated_remediation_time: number;
}

export interface ComplianceSummary {
  overall_compliance_score: number;
  code_violations: number;
  safety_issues: number;
  quality_issues: number;
  environmental_issues: number;
}

export interface RecommendationSummary {
  immediate_actions: string[];
  preventive_measures: string[];
  process_improvements: string[];
  training_recommendations: string[];
}

export interface HumanVerification {
  inspector_id: string;
  verification_date: Date;
  ai_accuracy_rating: number;
  additional_findings: string[];
  override_decisions: OverrideDecision[];
  final_approval: boolean;
  notes: string;
}

export interface OverrideDecision {
  ai_finding: string;
  human_decision: "confirm" | "reject" | "modify";
  explanation: string;
  impact_on_score: number;
}

export interface QualityDefect {
  defect_id: string;
  defect_type: string;
  severity: "minor" | "moderate" | "major" | "critical";
  location: string;
  description: string;
  photo_evidence: string[];
  remediation_plan: RemediationPlan;
  status: "open" | "in_progress" | "resolved" | "deferred";
  assigned_to?: string;
  due_date?: Date;
}

export interface RemediationPlan {
  plan_id: string;
  steps: RemediationStep[];
  estimated_cost: number;
  estimated_duration_hours: number;
  required_materials: string[];
  required_skills: string[];
  priority: "low" | "medium" | "high" | "critical";
}

export interface RemediationStep {
  step_number: number;
  description: string;
  estimated_duration: number;
  required_resources: string[];
  verification_method: string;
}

export interface StandardsComparison {
  applicable_standards: ApplicableStandard[];
  compliance_level: number;
  deviations: StandardDeviation[];
  certification_requirements: CertificationRequirement[];
}

export interface ApplicableStandard {
  standard_name: string;
  standard_version: string;
  compliance_score: number;
  critical_requirements: string[];
}

export interface StandardDeviation {
  standard_reference: string;
  requirement_description: string;
  measured_value: string;
  required_value: string;
  deviation_severity: "minor" | "moderate" | "major" | "critical";
}

export interface CertificationRequirement {
  certification_type: string;
  current_status: "compliant" | "pending" | "non_compliant";
  required_actions: string[];
  deadline?: Date;
}

class AIQualityControlService {
  private readonly AI_API_ENDPOINT = process.env.VITE_AI_QUALITY_API_URL || "https://api.openai.com/v1";
  private readonly AI_MODEL = "gpt-4-vision-preview";

  /**
   * Perform AI-powered quality inspection on uploaded photos
   */
  async performQualityInspection(
    project_id: string,
    task_id: string,
    photos: File[],
    inspection_type: "routine" | "milestone" | "final" | "compliance" = "routine"
  ): Promise<QualityInspection> {
    try {
      const inspection_id = crypto.randomUUID();
      const inspection_date = new Date();

      // Upload and process photos
      const qualityPhotos: QualityPhoto[] = [];
      
      for (const photo of photos) {
        const processedPhoto = await this.processQualityPhoto(photo, project_id, inspection_type);
        qualityPhotos.push(processedPhoto);
      }

      // Aggregate AI analysis results
      const aiAnalysis = await this.aggregateAnalysisResults(qualityPhotos);

      // Detect defects across all photos
      const defectsDetected = await this.aggregateDefects(qualityPhotos);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(aiAnalysis, defectsDetected);

      // Calculate overall score
      const overallScore = this.calculateOverallQualityScore(aiAnalysis, defectsDetected);

      // Determine if human verification is needed
      const requiresHumanReview = this.requiresHumanVerification(aiAnalysis, defectsDetected);

      const inspection: QualityInspection = {
        inspection_id,
        project_id,
        task_id,
        inspector_type: requiresHumanReview ? "hybrid" : "ai",
        inspection_date,
        photos: qualityPhotos,
        ai_analysis: aiAnalysis,
        overall_score: overallScore,
        status: requiresHumanReview ? "requires_attention" : "completed",
        defects_detected: defectsDetected,
        recommendations
      };

      // Save inspection to database
      await this.saveInspectionResults(inspection);

      // Trigger notifications if critical issues found
      if (defectsDetected.some(d => d.severity === "critical")) {
        await this.triggerCriticalDefectNotifications(inspection);
      }

      return inspection;
    } catch (error) {
      console.error("Error performing quality inspection:", error);
      throw error;
    }
  }

  /**
   * Process individual photo with AI analysis
   */
  private async processQualityPhoto(
    photo: File,
    project_id: string,
    inspection_type: string
  ): Promise<QualityPhoto> {
    try {
      const photo_id = crypto.randomUUID();
      
      // Upload photo to storage
      const file_url = await this.uploadPhotoToStorage(photo, project_id, photo_id);

      // Extract camera metadata
      const camera_metadata = await this.extractCameraMetadata(photo);

      // Perform AI analysis
      const ai_analysis = await this.performAIPhotoAnalysis(file_url, inspection_type);

      // Generate annotations
      const annotations = await this.generateQualityAnnotations(ai_analysis);

      // Find comparison photos if available
      const comparison_photos = await this.findComparisonPhotos(project_id, inspection_type);

      return {
        photo_id,
        file_url,
        capture_timestamp: new Date(),
        camera_metadata,
        ai_analysis,
        annotations,
        comparison_photos
      };
    } catch (error) {
      console.error("Error processing quality photo:", error);
      throw error;
    }
  }

  /**
   * Perform AI analysis on photo using computer vision
   */
  private async performAIPhotoAnalysis(
    photo_url: string,
    inspection_type: string
  ): Promise<PhotoAnalysis> {
    try {
      // This would integrate with OpenAI Vision API or similar AI service
      const analysisPrompt = this.buildAnalysisPrompt(inspection_type);
      
      // Simulate AI analysis (in production, this would call actual AI API)
      const mockAnalysis: PhotoAnalysis = {
        confidence_score: 0.92,
        detected_objects: await this.detectObjects(photo_url),
        quality_assessment: await this.assessQuality(photo_url, inspection_type),
        defects_found: await this.detectDefects(photo_url),
        compliance_check: await this.checkCompliance(photo_url, inspection_type),
        measurements: await this.performAutoMeasurements(photo_url)
      };

      return mockAnalysis;
    } catch (error) {
      console.error("Error performing AI photo analysis:", error);
      throw error;
    }
  }

  /**
   * Detect objects in construction photo
   */
  private async detectObjects(photo_url: string): Promise<DetectedObject[]> {
    // Mock implementation - would use actual computer vision API
    return [
      {
        object_type: "concrete_surface",
        confidence: 0.95,
        bounding_box: { x: 10, y: 20, width: 300, height: 200 },
        classification: "structural_element",
        condition_assessment: "good"
      },
      {
        object_type: "rebar",
        confidence: 0.88,
        bounding_box: { x: 50, y: 100, width: 150, height: 50 },
        classification: "reinforcement",
        condition_assessment: "excellent"
      }
    ];
  }

  /**
   * Assess overall quality of construction work in photo
   */
  private async assessQuality(photo_url: string, inspection_type: string): Promise<QualityAssessment> {
    return {
      overall_quality: "good",
      specific_metrics: [
        {
          metric_name: "surface_finish",
          measured_value: 8.5,
          expected_value: 8.0,
          tolerance_range: { min: 7.0, max: 10.0 },
          passes_specification: true,
          deviation_percentage: 6.25
        },
        {
          metric_name: "alignment_accuracy",
          measured_value: 9.2,
          expected_value: 9.0,
          tolerance_range: { min: 8.5, max: 10.0 },
          passes_specification: true,
          deviation_percentage: 2.22
        }
      ],
      comparison_to_standards: {
        applicable_standards: [
          {
            standard_name: "ACI 301",
            standard_version: "2020",
            compliance_score: 0.92,
            critical_requirements: ["surface_tolerance", "reinforcement_placement"]
          }
        ],
        compliance_level: 0.92,
        deviations: [],
        certification_requirements: []
      },
      improvement_suggestions: [
        "Consider additional surface finishing for enhanced appearance",
        "Monitor curing conditions for optimal strength development"
      ]
    };
  }

  /**
   * Detect defects in construction photo
   */
  private async detectDefects(photo_url: string): Promise<DefectDetection[]> {
    // Mock implementation - would use defect detection AI model
    return [
      {
        defect_id: crypto.randomUUID(),
        defect_type: "crack",
        severity: "minor",
        confidence: 0.78,
        location: { x: 150, y: 200, width: 50, height: 5 },
        description: "Hairline crack detected in concrete surface",
        remediation_required: false,
        estimated_cost_impact: 250
      }
    ];
  }

  /**
   * Check compliance with building codes and standards
   */
  private async checkCompliance(photo_url: string, inspection_type: string): Promise<ComplianceResult> {
    return {
      building_codes_compliance: true,
      safety_standards_compliance: true,
      quality_standards_compliance: true,
      environmental_compliance: true,
      violations_detected: [],
      certification_status: "compliant"
    };
  }

  /**
   * Perform automatic measurements using computer vision
   */
  private async performAutoMeasurements(photo_url: string): Promise<AutoMeasurement[]> {
    return [
      {
        measurement_type: "length",
        measured_value: 12.5,
        unit: "feet",
        accuracy_confidence: 0.91,
        reference_points: [{ x: 10, y: 100 }, { x: 310, y: 100 }],
        tolerance_check: true
      }
    ];
  }

  /**
   * Generate quality annotations for photo
   */
  private async generateQualityAnnotations(analysis: PhotoAnalysis): Promise<QualityAnnotation[]> {
    const annotations: QualityAnnotation[] = [];

    // Add annotations for defects
    for (const defect of analysis.defects_found) {
      annotations.push({
        annotation_id: crypto.randomUUID(),
        type: "defect",
        coordinates: { x: defect.location.x, y: defect.location.y },
        text: `${defect.defect_type}: ${defect.description}`,
        created_by: "ai",
        timestamp: new Date(),
        severity: defect.severity === "critical" ? "critical" : 
                 defect.severity === "major" ? "high" :
                 defect.severity === "moderate" ? "medium" : "low"
      });
    }

    // Add annotations for measurements
    for (const measurement of analysis.measurements) {
      annotations.push({
        annotation_id: crypto.randomUUID(),
        type: "measurement",
        coordinates: { x: measurement.reference_points[0].x, y: measurement.reference_points[0].y },
        text: `${measurement.measurement_type}: ${measurement.measured_value} ${measurement.unit}`,
        created_by: "ai",
        timestamp: new Date()
      });
    }

    return annotations;
  }

  /**
   * Find comparison photos from previous inspections or standards
   */
  private async findComparisonPhotos(project_id: string, inspection_type: string): Promise<ComparisonPhoto[]> {
    try {
      const { data: previousPhotos } = await supabase
        .from("quality_photos")
        .select("file_url, ai_analysis")
        .eq("project_id", project_id)
        .limit(3);

      return (previousPhotos || []).map(photo => ({
        reference_photo_url: photo.file_url,
        comparison_type: "similar_project" as const,
        similarity_score: 0.85,
        differences_highlighted: []
      }));
    } catch (error) {
      console.error("Error finding comparison photos:", error);
      return [];
    }
  }

  /**
   * Upload photo to storage
   */
  private async uploadPhotoToStorage(photo: File, project_id: string, photo_id: string): Promise<string> {
    try {
      const fileName = `quality_inspections/${project_id}/${photo_id}_${Date.now()}.jpg`;
      
      const { data, error } = await supabase.storage
        .from("project_photos")
        .upload(fileName, photo);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("project_photos")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading photo to storage:", error);
      throw error;
    }
  }

  /**
   * Extract camera metadata from photo
   */
  private async extractCameraMetadata(photo: File): Promise<CameraMetadata> {
    // Mock implementation - would extract actual EXIF data
    return {
      device_info: "iPhone 15 Pro",
      resolution: "4032x3024",
      focal_length: 24,
      exposure_settings: "1/120s f/1.8 ISO 100",
      lighting_conditions: "good"
    };
  }

  /**
   * Build AI analysis prompt based on inspection type
   */
  private buildAnalysisPrompt(inspection_type: string): string {
    const basePrompt = `Analyze this construction photo for quality control. Identify:
1. Structural elements and their condition
2. Any defects, cracks, or quality issues
3. Compliance with building standards
4. Measurements and dimensions
5. Safety concerns
6. Overall quality assessment`;

    const typeSpecificPrompts = {
      routine: "Focus on general workmanship and progress quality.",
      milestone: "Assess completion of major milestones and readiness for next phase.",
      final: "Conduct thorough final inspection for project completion.",
      compliance: "Verify compliance with building codes and safety regulations."
    };

    return `${basePrompt}\n\n${typeSpecificPrompts[inspection_type] || typeSpecificPrompts.routine}`;
  }

  /**
   * Aggregate analysis results from multiple photos
   */
  private async aggregateAnalysisResults(photos: QualityPhoto[]): Promise<AIAnalysisResult> {
    const totalConfidence = photos.reduce((sum, photo) => sum + photo.ai_analysis.confidence_score, 0);
    const avgConfidence = totalConfidence / photos.length;

    const totalDefects = photos.reduce((sum, photo) => sum + photo.ai_analysis.defects_found.length, 0);
    const criticalDefects = photos.reduce((sum, photo) => 
      sum + photo.ai_analysis.defects_found.filter(d => d.severity === "critical").length, 0);

    return {
      processing_time_ms: 2500,
      ai_model_version: "quality-control-v2.1",
      analysis_timestamp: new Date(),
      overall_confidence: avgConfidence,
      quality_score: this.calculateQualityScore(photos),
      defects_summary: {
        total_defects: totalDefects,
        critical_defects: criticalDefects,
        major_defects: photos.reduce((sum, photo) => 
          sum + photo.ai_analysis.defects_found.filter(d => d.severity === "major").length, 0),
        minor_defects: photos.reduce((sum, photo) => 
          sum + photo.ai_analysis.defects_found.filter(d => d.severity === "minor").length, 0),
        estimated_remediation_cost: photos.reduce((sum, photo) => 
          sum + photo.ai_analysis.defects_found.reduce((defectSum, defect) => 
            defectSum + defect.estimated_cost_impact, 0), 0),
        estimated_remediation_time: Math.max(1, totalDefects * 2) // 2 hours per defect
      },
      compliance_summary: {
        overall_compliance_score: 0.94,
        code_violations: 0,
        safety_issues: 0,
        quality_issues: totalDefects,
        environmental_issues: 0
      },
      recommendations_summary: {
        immediate_actions: criticalDefects > 0 ? ["Address critical defects immediately"] : [],
        preventive_measures: ["Implement regular quality checks", "Improve work procedures"],
        process_improvements: ["Enhanced training for quality standards"],
        training_recommendations: ["Quality control best practices workshop"]
      },
      requires_human_review: criticalDefects > 0 || avgConfidence < 0.8
    };
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(photos: QualityPhoto[]): number {
    let totalScore = 0;
    let weightedSum = 0;

    for (const photo of photos) {
      const photoScore = this.calculatePhotoQualityScore(photo.ai_analysis);
      const weight = photo.ai_analysis.confidence_score;
      totalScore += photoScore * weight;
      weightedSum += weight;
    }

    return weightedSum > 0 ? totalScore / weightedSum : 0;
  }

  /**
   * Calculate quality score for individual photo
   */
  private calculatePhotoQualityScore(analysis: PhotoAnalysis): number {
    let score = 100;

    // Deduct points for defects
    for (const defect of analysis.defects_found) {
      switch (defect.severity) {
        case "critical": score -= 25; break;
        case "major": score -= 15; break;
        case "moderate": score -= 10; break;
        case "minor": score -= 5; break;
      }
    }

    // Bonus for compliance
    if (analysis.compliance_check.certification_status === "compliant") {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Aggregate defects from all photos
   */
  private async aggregateDefects(photos: QualityPhoto[]): Promise<QualityDefect[]> {
    const defects: QualityDefect[] = [];

    for (const photo of photos) {
      for (const detection of photo.ai_analysis.defects_found) {
        const defect: QualityDefect = {
          defect_id: detection.defect_id,
          defect_type: detection.defect_type,
          severity: detection.severity,
          location: `Photo ${photo.photo_id}`,
          description: detection.description,
          photo_evidence: [photo.file_url],
          remediation_plan: await this.generateRemediationPlan(detection),
          status: detection.remediation_required ? "open" : "resolved"
        };

        if (detection.remediation_required) {
          defect.due_date = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days from now
        }

        defects.push(defect);
      }
    }

    return defects;
  }

  /**
   * Generate remediation plan for defect
   */
  private async generateRemediationPlan(defect: DefectDetection): Promise<RemediationPlan> {
    const remediationTemplates = {
      crack: {
        steps: [
          { step_number: 1, description: "Clean crack area", estimated_duration: 0.5, required_resources: ["cleaning_tools"], verification_method: "visual_inspection" },
          { step_number: 2, description: "Apply crack filler", estimated_duration: 1, required_resources: ["crack_filler", "tools"], verification_method: "quality_check" },
          { step_number: 3, description: "Allow curing time", estimated_duration: 24, required_resources: [], verification_method: "time_based" }
        ],
        estimated_cost: 150,
        required_materials: ["crack_filler", "cleaning_supplies"],
        required_skills: ["basic_repair"]
      },
      misalignment: {
        steps: [
          { step_number: 1, description: "Measure deviation", estimated_duration: 0.5, required_resources: ["measuring_tools"], verification_method: "measurement" },
          { step_number: 2, description: "Realign element", estimated_duration: 2, required_resources: ["adjustment_tools"], verification_method: "measurement" },
          { step_number: 3, description: "Secure in position", estimated_duration: 1, required_resources: ["fasteners"], verification_method: "stability_check" }
        ],
        estimated_cost: 300,
        required_materials: ["fasteners", "adjustment_hardware"],
        required_skills: ["precision_work"]
      }
    };

    const template = remediationTemplates[defect.defect_type as keyof typeof remediationTemplates] || remediationTemplates.crack;

    return {
      plan_id: crypto.randomUUID(),
      steps: template.steps,
      estimated_cost: template.estimated_cost,
      estimated_duration_hours: template.steps.reduce((sum, step) => sum + step.estimated_duration, 0),
      required_materials: template.required_materials,
      required_skills: template.required_skills,
      priority: defect.severity === "critical" ? "critical" : 
               defect.severity === "major" ? "high" : "medium"
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  private async generateRecommendations(analysis: AIAnalysisResult, defects: QualityDefect[]): Promise<string[]> {
    const recommendations: string[] = [];

    if (analysis.defects_summary.critical_defects > 0) {
      recommendations.push("Immediately address critical defects before proceeding");
      recommendations.push("Conduct additional safety inspection");
    }

    if (analysis.overall_confidence < 0.8) {
      recommendations.push("Schedule human inspector verification");
    }

    if (analysis.defects_summary.total_defects > 5) {
      recommendations.push("Review work procedures and quality control processes");
      recommendations.push("Consider additional training for construction crew");
    }

    if (analysis.compliance_summary.overall_compliance_score < 0.9) {
      recommendations.push("Review compliance requirements with project specifications");
    }

    // Add preventive recommendations
    recommendations.push("Implement regular progress photos for continuous monitoring");
    recommendations.push("Schedule follow-up inspection in 48 hours");

    return recommendations;
  }

  /**
   * Calculate overall quality score from analysis and defects
   */
  private calculateOverallQualityScore(analysis: AIAnalysisResult, defects: QualityDefect[]): number {
    let baseScore = analysis.quality_score;

    // Adjust based on compliance
    baseScore *= analysis.compliance_summary.overall_compliance_score;

    // Adjust based on confidence
    baseScore *= analysis.overall_confidence;

    return Math.round(baseScore * 100) / 100;
  }

  /**
   * Determine if human verification is required
   */
  private requiresHumanVerification(analysis: AIAnalysisResult, defects: QualityDefect[]): boolean {
    return (
      analysis.defects_summary.critical_defects > 0 ||
      analysis.overall_confidence < 0.8 ||
      analysis.compliance_summary.overall_compliance_score < 0.9 ||
      defects.some(d => d.severity === "critical")
    );
  }

  /**
   * Save inspection results to database
   */
  private async saveInspectionResults(inspection: QualityInspection): Promise<void> {
    try {
      const { error } = await supabase
        .from("quality_inspections")
        .insert({
          id: inspection.inspection_id,
          project_id: inspection.project_id,
          task_id: inspection.task_id,
          inspector_type: inspection.inspector_type,
          inspection_date: inspection.inspection_date.toISOString(),
          overall_score: inspection.overall_score,
          status: inspection.status,
          ai_analysis: inspection.ai_analysis,
          defects_detected: inspection.defects_detected,
          recommendations: inspection.recommendations
        });

      if (error) throw error;

      // Save individual photos
      for (const photo of inspection.photos) {
        await supabase
          .from("quality_photos")
          .insert({
            id: photo.photo_id,
            inspection_id: inspection.inspection_id,
            project_id: inspection.project_id,
            file_url: photo.file_url,
            capture_timestamp: photo.capture_timestamp.toISOString(),
            camera_metadata: photo.camera_metadata,
            ai_analysis: photo.ai_analysis,
            annotations: photo.annotations
          });
      }
    } catch (error) {
      console.error("Error saving inspection results:", error);
      throw error;
    }
  }

  /**
   * Trigger notifications for critical defects
   */
  private async triggerCriticalDefectNotifications(inspection: QualityInspection): Promise<void> {
    try {
      const criticalDefects = inspection.defects_detected.filter(d => d.severity === "critical");
      
      if (criticalDefects.length === 0) return;

      // Send notifications to project managers and supervisors
      const { error } = await supabase
        .from("notifications")
        .insert({
          type: "critical_quality_defect",
          project_id: inspection.project_id,
          title: `Critical Quality Defects Detected`,
          message: `AI inspection found ${criticalDefects.length} critical defect(s) requiring immediate attention.`,
          priority: "critical",
          data: {
            inspection_id: inspection.inspection_id,
            defects: criticalDefects
          }
        });

      if (error) throw error;
    } catch (error) {
      console.error("Error triggering critical defect notifications:", error);
    }
  }

  /**
   * Get inspection history for project
   */
  async getInspectionHistory(project_id: string, limit: number = 10): Promise<QualityInspection[]> {
    try {
      const { data, error } = await supabase
        .from("quality_inspections")
        .select(`
          *,
          quality_photos(*)
        `)
        .eq("project_id", project_id)
        .order("inspection_date", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(inspection => ({
        inspection_id: inspection.id,
        project_id: inspection.project_id,
        task_id: inspection.task_id,
        inspector_type: inspection.inspector_type,
        inspection_date: new Date(inspection.inspection_date),
        photos: inspection.quality_photos || [],
        ai_analysis: inspection.ai_analysis,
        human_verification: inspection.human_verification,
        overall_score: inspection.overall_score,
        status: inspection.status,
        defects_detected: inspection.defects_detected || [],
        recommendations: inspection.recommendations || []
      }));
    } catch (error) {
      console.error("Error getting inspection history:", error);
      throw error;
    }
  }

  /**
   * Compare quality trends over time
   */
  async analyzeQualityTrends(project_id: string, days: number = 30): Promise<QualityTrendAnalysis> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("quality_inspections")
        .select("inspection_date, overall_score, defects_detected")
        .eq("project_id", project_id)
        .gte("inspection_date", startDate.toISOString())
        .order("inspection_date");

      if (error) throw error;

      // Analyze trends
      const scores = (data || []).map(d => d.overall_score);
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      
      const trend = this.calculateTrend(scores);
      const defectTrend = this.calculateDefectTrend(data || []);

      return {
        period_days: days,
        average_score: avgScore,
        score_trend: trend,
        defect_trend: defectTrend,
        total_inspections: data?.length || 0,
        quality_improvement: trend > 0,
        recommendations: this.generateTrendRecommendations(avgScore, trend, defectTrend)
      };
    } catch (error) {
      console.error("Error analyzing quality trends:", error);
      throw error;
    }
  }

  /**
   * Calculate trend from score array
   */
  private calculateTrend(scores: number[]): number {
    if (scores.length < 2) return 0;
    
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
    
    return secondAvg - firstAvg;
  }

  /**
   * Calculate defect trend
   */
  private calculateDefectTrend(inspections: any[]): DefectTrendAnalysis {
    const totalDefects = inspections.reduce((sum, inspection) => 
      sum + (inspection.defects_detected?.length || 0), 0);
    
    const criticalDefects = inspections.reduce((sum, inspection) => 
      sum + (inspection.defects_detected?.filter((d: any) => d.severity === "critical")?.length || 0), 0);

    return {
      total_defects: totalDefects,
      critical_defects: criticalDefects,
      average_defects_per_inspection: totalDefects / Math.max(1, inspections.length),
      defect_rate_trend: this.calculateDefectRateTrend(inspections)
    };
  }

  /**
   * Calculate defect rate trend
   */
  private calculateDefectRateTrend(inspections: any[]): number {
    if (inspections.length < 2) return 0;
    
    const midpoint = Math.floor(inspections.length / 2);
    const firstHalf = inspections.slice(0, midpoint);
    const secondHalf = inspections.slice(midpoint);
    
    const firstDefectRate = firstHalf.reduce((sum, i) => sum + (i.defects_detected?.length || 0), 0) / firstHalf.length;
    const secondDefectRate = secondHalf.reduce((sum, i) => sum + (i.defects_detected?.length || 0), 0) / secondHalf.length;
    
    return secondDefectRate - firstDefectRate;
  }

  /**
   * Generate trend-based recommendations
   */
  private generateTrendRecommendations(avgScore: number, trend: number, defectTrend: DefectTrendAnalysis): string[] {
    const recommendations: string[] = [];

    if (avgScore < 70) {
      recommendations.push("Quality scores are below acceptable threshold - implement immediate quality improvement measures");
    }

    if (trend < -5) {
      recommendations.push("Quality trend is declining - review and improve quality control processes");
    } else if (trend > 5) {
      recommendations.push("Quality trend is improving - maintain current quality practices");
    }

    if (defectTrend.defect_rate_trend > 0.5) {
      recommendations.push("Defect rate is increasing - enhance preventive quality measures");
    }

    if (defectTrend.critical_defects > 0) {
      recommendations.push("Critical defects detected - implement stricter quality checkpoints");
    }

    return recommendations;
  }
}

export interface QualityTrendAnalysis {
  period_days: number;
  average_score: number;
  score_trend: number;
  defect_trend: DefectTrendAnalysis;
  total_inspections: number;
  quality_improvement: boolean;
  recommendations: string[];
}

export interface DefectTrendAnalysis {
  total_defects: number;
  critical_defects: number;
  average_defects_per_inspection: number;
  defect_rate_trend: number;
}

export const aiQualityControlService = new AIQualityControlService();
