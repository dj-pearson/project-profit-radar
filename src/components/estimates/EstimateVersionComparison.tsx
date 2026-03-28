import React, { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import {
  GitCompare,
  Clock,
  User,
  Eye,
  ArrowLeft,
  ArrowRight,
  History,
  Check,
  Plus,
  Minus,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EstimateLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface EstimateVersion {
  id: string;
  versionNumber: number;
  createdAt: string;
  createdBy: string;
  lineItems: EstimateLineItem[];
  totalAmount: number;
  notes: string;
}

type DiffStatus = "added" | "removed" | "changed" | "unchanged";

interface DiffLineItem {
  status: DiffStatus;
  left: EstimateLineItem | null;
  right: EstimateLineItem | null;
}

interface ChangeSummary {
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
  totalDifference: number;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_VERSIONS: EstimateVersion[] = [
  {
    id: "v1-abc",
    versionNumber: 1,
    createdAt: "2026-02-10T09:00:00Z",
    createdBy: "Sarah Chen",
    lineItems: [
      { id: "li-1", description: "Site Preparation", quantity: 1, unitPrice: 5000, total: 5000 },
      { id: "li-2", description: "Foundation Work", quantity: 1, unitPrice: 18000, total: 18000 },
      { id: "li-3", description: "Framing - Lumber", quantity: 2400, unitPrice: 8.5, total: 20400 },
      { id: "li-4", description: "Roofing Materials", quantity: 30, unitPrice: 250, total: 7500 },
      { id: "li-5", description: "Electrical Rough-In", quantity: 1, unitPrice: 9500, total: 9500 },
    ],
    totalAmount: 60400,
    notes: "Initial estimate based on blueprints v1.",
  },
  {
    id: "v2-def",
    versionNumber: 2,
    createdAt: "2026-02-18T14:30:00Z",
    createdBy: "Mike Torres",
    lineItems: [
      { id: "li-1", description: "Site Preparation", quantity: 1, unitPrice: 5500, total: 5500 },
      { id: "li-2", description: "Foundation Work", quantity: 1, unitPrice: 18000, total: 18000 },
      { id: "li-3", description: "Framing - Lumber", quantity: 2600, unitPrice: 8.5, total: 22100 },
      { id: "li-4", description: "Roofing Materials", quantity: 30, unitPrice: 250, total: 7500 },
      { id: "li-5", description: "Electrical Rough-In", quantity: 1, unitPrice: 9500, total: 9500 },
      { id: "li-6", description: "Plumbing Rough-In", quantity: 1, unitPrice: 7200, total: 7200 },
    ],
    totalAmount: 69800,
    notes: "Added plumbing scope. Adjusted site prep and framing quantities per revised plans.",
  },
  {
    id: "v3-ghi",
    versionNumber: 3,
    createdAt: "2026-03-05T11:15:00Z",
    createdBy: "Sarah Chen",
    lineItems: [
      { id: "li-1", description: "Site Preparation", quantity: 1, unitPrice: 5500, total: 5500 },
      { id: "li-2", description: "Foundation Work", quantity: 1, unitPrice: 19500, total: 19500 },
      { id: "li-3", description: "Framing - Lumber", quantity: 2600, unitPrice: 9.0, total: 23400 },
      { id: "li-5", description: "Electrical Rough-In", quantity: 1, unitPrice: 10200, total: 10200 },
      { id: "li-6", description: "Plumbing Rough-In", quantity: 1, unitPrice: 7200, total: 7200 },
      { id: "li-7", description: "HVAC Installation", quantity: 1, unitPrice: 12000, total: 12000 },
      { id: "li-8", description: "Insulation", quantity: 3200, unitPrice: 2.75, total: 8800 },
    ],
    totalAmount: 86600,
    notes: "Removed roofing (separate contract). Updated lumber pricing. Added HVAC and insulation.",
  },
  {
    id: "v4-jkl",
    versionNumber: 4,
    createdAt: "2026-03-22T16:45:00Z",
    createdBy: "Mike Torres",
    lineItems: [
      { id: "li-1", description: "Site Preparation", quantity: 1, unitPrice: 5500, total: 5500 },
      { id: "li-2", description: "Foundation Work", quantity: 1, unitPrice: 19500, total: 19500 },
      { id: "li-3", description: "Framing - Lumber", quantity: 2600, unitPrice: 9.0, total: 23400 },
      { id: "li-5", description: "Electrical Rough-In", quantity: 1, unitPrice: 10200, total: 10200 },
      { id: "li-6", description: "Plumbing Rough-In", quantity: 1, unitPrice: 7800, total: 7800 },
      { id: "li-7", description: "HVAC Installation", quantity: 1, unitPrice: 12000, total: 12000 },
      { id: "li-8", description: "Insulation", quantity: 3200, unitPrice: 2.75, total: 8800 },
      { id: "li-9", description: "Drywall & Finishing", quantity: 4800, unitPrice: 3.25, total: 15600 },
      { id: "li-10", description: "Permits & Inspections", quantity: 1, unitPrice: 3500, total: 3500 },
    ],
    totalAmount: 106300,
    notes: "Final scope: added drywall and permits. Adjusted plumbing for code compliance.",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getVersionsForEstimate(_estimateId: string): EstimateVersion[] {
  return MOCK_VERSIONS;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function computeDiff(left: EstimateVersion, right: EstimateVersion): DiffLineItem[] {
  const leftMap = new Map(left.lineItems.map((li) => [li.id, li]));
  const rightMap = new Map(right.lineItems.map((li) => [li.id, li]));

  const allIds = new Set([...leftMap.keys(), ...rightMap.keys()]);
  const result: DiffLineItem[] = [];

  for (const id of allIds) {
    const l = leftMap.get(id) ?? null;
    const r = rightMap.get(id) ?? null;

    if (l && !r) {
      result.push({ status: "removed", left: l, right: null });
    } else if (!l && r) {
      result.push({ status: "added", left: null, right: r });
    } else if (l && r) {
      const isChanged =
        l.description !== r.description ||
        l.quantity !== r.quantity ||
        l.unitPrice !== r.unitPrice ||
        l.total !== r.total;
      result.push({ status: isChanged ? "changed" : "unchanged", left: l, right: r });
    }
  }

  return result;
}

function computeSummary(diff: DiffLineItem[], left: EstimateVersion, right: EstimateVersion): ChangeSummary {
  const counts: ChangeSummary = {
    added: 0,
    removed: 0,
    changed: 0,
    unchanged: 0,
    totalDifference: right.totalAmount - left.totalAmount,
  };
  for (const item of diff) {
    counts[item.status] += 1;
  }
  return counts;
}

const STATUS_STYLES: Record<DiffStatus, string> = {
  added: "bg-green-50 dark:bg-green-950/40 border-l-4 border-l-green-500",
  removed: "bg-red-50 dark:bg-red-950/40 border-l-4 border-l-red-500",
  changed: "bg-yellow-50 dark:bg-yellow-950/40 border-l-4 border-l-yellow-500",
  unchanged: "",
};

const STATUS_BADGES: Record<DiffStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  added: { label: "Added", variant: "default" },
  removed: { label: "Removed", variant: "destructive" },
  changed: { label: "Changed", variant: "secondary" },
  unchanged: { label: "Unchanged", variant: "outline" },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface VersionCardProps {
  version: EstimateVersion;
  isSelected: boolean;
  compareMode: boolean;
  isCompareSelected: boolean;
  onView: (version: EstimateVersion) => void;
  onToggleCompare: (version: EstimateVersion) => void;
}

const VersionCard: React.FC<VersionCardProps> = ({
  version,
  isSelected,
  compareMode,
  isCompareSelected,
  onView,
  onToggleCompare,
}) => (
  <div
    className={cn(
      "rounded-lg border p-4 transition-colors",
      isSelected && "ring-2 ring-primary",
      isCompareSelected && "ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
    )}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            v{version.versionNumber}
          </Badge>
          {version.versionNumber === MOCK_VERSIONS.length && (
            <Badge variant="default" className="text-xs">Latest</Badge>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{format(new Date(version.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          <span>{version.createdBy}</span>
        </div>
      </div>
      <span className="text-sm font-semibold">{formatCurrency(version.totalAmount)}</span>
    </div>

    {version.notes && (
      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{version.notes}</p>
    )}

    <div className="mt-3 flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => onView(version)}>
        <Eye className="mr-1.5 h-3.5 w-3.5" />
        View
      </Button>
      {compareMode && (
        <Button
          size="sm"
          variant={isCompareSelected ? "default" : "outline"}
          onClick={() => onToggleCompare(version)}
        >
          {isCompareSelected ? (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Selected
            </>
          ) : (
            <>
              <GitCompare className="mr-1.5 h-3.5 w-3.5" />
              Select
            </>
          )}
        </Button>
      )}
    </div>
  </div>
);

interface ReadOnlyVersionDialogProps {
  version: EstimateVersion | null;
  open: boolean;
  onClose: () => void;
}

const ReadOnlyVersionDialog: React.FC<ReadOnlyVersionDialogProps> = ({ version, open, onClose }) => {
  if (!version) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Estimate v{version.versionNumber}
            <Badge variant="outline" className="ml-2 text-xs font-normal">
              Read-only
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {format(new Date(version.createdAt), "MMMM d, yyyy 'at' h:mm a")}
          </div>
          <div className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {version.createdBy}
          </div>
        </div>

        {version.notes && (
          <p className="text-sm italic text-muted-foreground">{version.notes}</p>
        )}

        <ScrollArea className="max-h-[400px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">Description</th>
                <th className="pb-2 pr-4 text-right">Qty</th>
                <th className="pb-2 pr-4 text-right">Unit Price</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {version.lineItems.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{item.description}</td>
                  <td className="py-2 pr-4 text-right">{item.quantity.toLocaleString()}</td>
                  <td className="py-2 pr-4 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-semibold">
                <td colSpan={3} className="pt-2 pr-4 text-right">
                  Total
                </td>
                <td className="pt-2 text-right">{formatCurrency(version.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// EstimateVersionHistory
// ---------------------------------------------------------------------------

interface EstimateVersionHistoryProps {
  estimateId: string;
}

export const EstimateVersionHistory: React.FC<EstimateVersionHistoryProps> = ({ estimateId }) => {
  const versions = useMemo(() => getVersionsForEstimate(estimateId), [estimateId]);

  const [viewingVersion, setViewingVersion] = useState<EstimateVersion | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<EstimateVersion[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const latestVersion = versions[versions.length - 1];

  const handleToggleCompare = useCallback(
    (version: EstimateVersion) => {
      setCompareSelection((prev) => {
        const exists = prev.find((v) => v.id === version.id);
        if (exists) return prev.filter((v) => v.id !== version.id);
        if (prev.length >= 2) return [prev[1], version];
        return [...prev, version];
      });
    },
    []
  );

  const handleStartComparison = useCallback(() => {
    if (compareSelection.length === 2) {
      setShowComparison(true);
    }
  }, [compareSelection]);

  const handleExitCompare = useCallback(() => {
    setCompareMode(false);
    setCompareSelection([]);
    setShowComparison(false);
  }, []);

  if (showComparison && compareSelection.length === 2) {
    const sorted = [...compareSelection].sort(
      (a, b) => a.versionNumber - b.versionNumber
    );
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={handleExitCompare}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Version History
        </Button>
        <EstimateVersionComparison
          estimateId={estimateId}
          leftVersion={sorted[0]}
          rightVersion={sorted[1]}
        />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5" />
              Version History
            </CardTitle>
            <div className="flex items-center gap-2">
              {latestVersion && (
                <span className="text-sm text-muted-foreground">
                  Current: <span className="font-mono font-semibold">v{latestVersion.versionNumber}</span>
                  {" \u00b7 "}
                  {format(new Date(latestVersion.createdAt), "MMM d, yyyy")}
                </span>
              )}
              <Button
                size="sm"
                variant={compareMode ? "default" : "outline"}
                onClick={() => {
                  if (compareMode) {
                    handleExitCompare();
                  } else {
                    setCompareMode(true);
                  }
                }}
              >
                <GitCompare className="mr-1.5 h-4 w-4" />
                {compareMode ? "Cancel Compare" : "Compare Versions"}
              </Button>
            </div>
          </div>

          {compareMode && (
            <div className="flex items-center gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                Select two versions to compare ({compareSelection.length}/2 selected)
              </span>
              {compareSelection.length === 2 && (
                <Button size="sm" onClick={handleStartComparison}>
                  <GitCompare className="mr-1.5 h-3.5 w-3.5" />
                  Compare v{Math.min(compareSelection[0].versionNumber, compareSelection[1].versionNumber)} &amp; v
                  {Math.max(compareSelection[0].versionNumber, compareSelection[1].versionNumber)}
                </Button>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {[...versions].reverse().map((version) => (
              <VersionCard
                key={version.id}
                version={version}
                isSelected={viewingVersion?.id === version.id}
                compareMode={compareMode}
                isCompareSelected={!!compareSelection.find((v) => v.id === version.id)}
                onView={setViewingVersion}
                onToggleCompare={handleToggleCompare}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <ReadOnlyVersionDialog
        version={viewingVersion}
        open={viewingVersion !== null}
        onClose={() => setViewingVersion(null)}
      />
    </>
  );
};

// ---------------------------------------------------------------------------
// EstimateVersionComparison
// ---------------------------------------------------------------------------

interface EstimateVersionComparisonProps {
  estimateId: string;
  leftVersion?: EstimateVersion;
  rightVersion?: EstimateVersion;
}

export const EstimateVersionComparison: React.FC<EstimateVersionComparisonProps> = ({
  estimateId,
  leftVersion: leftProp,
  rightVersion: rightProp,
}) => {
  const versions = useMemo(() => getVersionsForEstimate(estimateId), [estimateId]);

  const left = leftProp ?? versions[0];
  const right = rightProp ?? versions[versions.length - 1];

  const diff = useMemo(() => computeDiff(left, right), [left, right]);
  const summary = useMemo(() => computeSummary(diff, left, right), [diff, left, right]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <GitCompare className="h-5 w-5" />
          Comparing v{left.versionNumber} and v{right.versionNumber}
        </CardTitle>

        {/* Summary badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {summary.added > 0 && (
            <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-300">
              <Plus className="h-3 w-3" />
              {summary.added} added
            </Badge>
          )}
          {summary.removed > 0 && (
            <Badge className="gap-1 bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300">
              <Minus className="h-3 w-3" />
              {summary.removed} removed
            </Badge>
          )}
          {summary.changed > 0 && (
            <Badge className="gap-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-300">
              <RefreshCw className="h-3 w-3" />
              {summary.changed} changed
            </Badge>
          )}
          {summary.unchanged > 0 && (
            <Badge variant="outline" className="gap-1">
              {summary.unchanged} unchanged
            </Badge>
          )}
          <span className="ml-auto text-sm font-medium">
            Total difference:{" "}
            <span
              className={cn(
                summary.totalDifference > 0 && "text-red-600 dark:text-red-400",
                summary.totalDifference < 0 && "text-green-600 dark:text-green-400"
              )}
            >
              {summary.totalDifference >= 0 ? "+" : ""}
              {formatCurrency(summary.totalDifference)}
            </span>
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="side-by-side">
          <TabsList className="mb-4">
            <TabsTrigger value="side-by-side">Side-by-Side</TabsTrigger>
            <TabsTrigger value="unified">Unified</TabsTrigger>
          </TabsList>

          {/* Side-by-side view */}
          <TabsContent value="side-by-side">
            <ScrollArea className="max-h-[600px]">
              <div className="grid grid-cols-2 gap-4">
                {/* Column headers */}
                <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm font-medium">
                  <ArrowLeft className="h-4 w-4" />
                  v{left.versionNumber} &mdash; {left.createdBy}
                  <span className="ml-auto text-muted-foreground">
                    {formatCurrency(left.totalAmount)}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm font-medium">
                  <ArrowRight className="h-4 w-4" />
                  v{right.versionNumber} &mdash; {right.createdBy}
                  <span className="ml-auto text-muted-foreground">
                    {formatCurrency(right.totalAmount)}
                  </span>
                </div>

                {/* Diff rows */}
                {diff.map((item, idx) => (
                  <React.Fragment key={idx}>
                    {/* Left cell */}
                    <div
                      className={cn(
                        "rounded-md border px-3 py-2 text-sm",
                        item.status === "removed" && STATUS_STYLES.removed,
                        item.status === "changed" && STATUS_STYLES.changed,
                        item.status === "added" && "border-dashed opacity-40"
                      )}
                    >
                      {item.left ? (
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{item.left.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.left.quantity.toLocaleString()} &times; {formatCurrency(item.left.unitPrice)}
                            </p>
                          </div>
                          <span className="whitespace-nowrap font-medium">
                            {formatCurrency(item.left.total)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">Not present</span>
                      )}
                    </div>

                    {/* Right cell */}
                    <div
                      className={cn(
                        "rounded-md border px-3 py-2 text-sm",
                        item.status === "added" && STATUS_STYLES.added,
                        item.status === "changed" && STATUS_STYLES.changed,
                        item.status === "removed" && "border-dashed opacity-40"
                      )}
                    >
                      {item.right ? (
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{item.right.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.right.quantity.toLocaleString()} &times; {formatCurrency(item.right.unitPrice)}
                            </p>
                          </div>
                          <span className="whitespace-nowrap font-medium">
                            {formatCurrency(item.right.total)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">Not present</span>
                      )}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Unified view */}
          <TabsContent value="unified">
            <ScrollArea className="max-h-[600px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-2 w-24">Status</th>
                    <th className="pb-2 pr-4">Description</th>
                    <th className="pb-2 pr-4 text-right">Qty</th>
                    <th className="pb-2 pr-4 text-right">Unit Price</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {diff.map((item, idx) => {
                    const display = item.right ?? item.left;
                    if (!display) return null;

                    const badgeInfo = STATUS_BADGES[item.status];

                    return (
                      <tr
                        key={idx}
                        className={cn("border-b last:border-0", STATUS_STYLES[item.status])}
                      >
                        <td className="py-2 pr-2">
                          <Badge variant={badgeInfo.variant} className="text-xs">
                            {badgeInfo.label}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4">
                          <span className="font-medium">{display.description}</span>
                          {item.status === "changed" && item.left && item.right && (
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {item.left.quantity !== item.right.quantity && (
                                <span className="mr-3">
                                  Qty: {item.left.quantity.toLocaleString()} &rarr; {item.right.quantity.toLocaleString()}
                                </span>
                              )}
                              {item.left.unitPrice !== item.right.unitPrice && (
                                <span>
                                  Price: {formatCurrency(item.left.unitPrice)} &rarr; {formatCurrency(item.right.unitPrice)}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-right">{display.quantity.toLocaleString()}</td>
                        <td className="py-2 pr-4 text-right">{formatCurrency(display.unitPrice)}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(display.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-semibold">
                    <td colSpan={4} className="pt-2 pr-4 text-right">
                      v{left.versionNumber} Total / v{right.versionNumber} Total
                    </td>
                    <td className="pt-2 text-right">
                      {formatCurrency(left.totalAmount)} / {formatCurrency(right.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
