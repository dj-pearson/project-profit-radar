import { Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EstimateTemplateBannerProps {
  /** Name of the template applied to this estimate, if any. */
  appliedTemplate: string | null;
  onChooseTemplate: () => void;
}

export function EstimateTemplateBanner({ appliedTemplate, onChooseTemplate }: EstimateTemplateBannerProps) {
  return (
    <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-base mb-1 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Start with a Template
            </h3>
            <p className="text-sm text-muted-foreground">
              {appliedTemplate
                ? `Using template: ${appliedTemplate}`
                : 'Pre-fill estimate with template including line items and terms'}
            </p>
          </div>
          <Button
            type="button"
            variant={appliedTemplate ? "outline" : "default"}
            onClick={onChooseTemplate}
            size="sm"
            className="shrink-0"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {appliedTemplate ? 'Change Template' : 'Choose Template'}
          </Button>
        </div>
        {appliedTemplate && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Template Applied
            </Badge>
            <span className="text-muted-foreground">All fields can still be customized</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
