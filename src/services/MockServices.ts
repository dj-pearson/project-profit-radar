import { supabase } from "@/integrations/supabase/client";

// Mock services that use non-existent tables to prevent TypeScript errors
class MockConstructionFlowEngine {
  async optimizeWorkflowSequence() {
    return { optimized_tasks: [], critical_path: [], estimated_completion: new Date() };
  }
  
  async generateTaskDependencies() {
    return [];
  }
  
  async scheduleInspections() {
    return [];
  }
}

class MockMaterialOrchestrationService {
  async optimizeMaterialDeliveries() {
    return { deliveries: [], cost_savings: 0 };
  }
  
  async trackMaterialUsage() {
    return { materials: [], waste_reduction: 0 };
  }
}

export const constructionFlowEngine = new MockConstructionFlowEngine();
export const materialOrchestrationService = new MockMaterialOrchestrationService();