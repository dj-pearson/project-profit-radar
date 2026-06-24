import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calculator, ListPlus } from 'lucide-react';
import { PAGE_TYPE_LABELS, type PageType, type Tier, type SearchVolume } from '@/types/pseo';

interface CombinationPreview {
  page_type: PageType;
  combination_key: string;
  dimension_1: string;
  dimension_2: string;
  dimension_3?: string;
  tier: Tier;
  estimated_volume: SearchVolume;
  url: string;
}

interface CombinationMatrixGeneratorProps {
  contractorTypes: Array<{ id: string; display_name: string; url_slug: string }>;
  painPoints: Array<{ id: string; display_name: string; url_slug: string }>;
  geographies: Array<{ id: string; display_name: string; url_slug: string; geo_level: string }>;
  businessSizes: Array<{ id: string; display_name: string; url_slug: string }>;
  competitors: Array<{ id: string; display_name: string; url_slug: string }>;
  existingCombinationKeys: Set<string>;
  onAddToQueue: (combinations: CombinationPreview[]) => void;
}

export function CombinationMatrixGenerator({
  contractorTypes,
  painPoints,
  geographies,
  businessSizes,
  competitors,
  existingCombinationKeys,
  onAddToQueue,
}: CombinationMatrixGeneratorProps) {
  const [selectedTypes, setSelectedTypes] = useState<Set<PageType>>(new Set(['contractor_pain']));
  const [tierFilter, setTierFilter] = useState<string>('all');

  const combinations = useMemo(() => {
    const result: CombinationPreview[] = [];

    if (selectedTypes.has('contractor_pain')) {
      for (const ct of contractorTypes) {
        for (const pp of painPoints) {
          result.push({
            page_type: 'contractor_pain',
            combination_key: `contractor_pain::${ct.id}::${pp.id}`,
            dimension_1: ct.id,
            dimension_2: pp.id,
            tier: 1,
            estimated_volume: 'high',
            url: `/software/${ct.url_slug}/${pp.url_slug}`,
          });
        }
      }
    }

    if (selectedTypes.has('contractor_geo')) {
      for (const ct of contractorTypes) {
        for (const geo of geographies) {
          const tier: Tier = geo.geo_level === 'state' ? 1 : 3;
          result.push({
            page_type: 'contractor_geo',
            combination_key: `contractor_geo::${ct.id}::${geo.id}`,
            dimension_1: ct.id,
            dimension_2: geo.id,
            tier,
            estimated_volume: geo.geo_level === 'state' ? 'high' : 'long-tail',
            url: `/software/${ct.url_slug}/${geo.url_slug}`,
          });
        }
      }
    }

    if (selectedTypes.has('pain_size')) {
      for (const pp of painPoints) {
        for (const bs of businessSizes) {
          result.push({
            page_type: 'pain_size',
            combination_key: `pain_size::${pp.id}::${bs.id}`,
            dimension_1: pp.id,
            dimension_2: bs.id,
            tier: 2,
            estimated_volume: 'medium',
            url: `/software/${pp.url_slug}/${bs.url_slug}`,
          });
        }
      }
    }

    if (selectedTypes.has('pain_geo')) {
      for (const pp of painPoints) {
        for (const geo of geographies.filter((g) => g.geo_level === 'state')) {
          result.push({
            page_type: 'pain_geo',
            combination_key: `pain_geo::${pp.id}::${geo.id}`,
            dimension_1: pp.id,
            dimension_2: geo.id,
            tier: 2,
            estimated_volume: 'medium',
            url: `/software/${pp.url_slug}/${geo.url_slug}`,
          });
        }
      }
    }

    if (selectedTypes.has('comparison')) {
      for (const comp of competitors) {
        result.push({
          page_type: 'comparison',
          combination_key: `comparison::${comp.id}`,
          dimension_1: comp.id,
          dimension_2: comp.id,
          tier: 2,
          estimated_volume: 'high',
          url: `/compare/${comp.url_slug}`,
        });
      }
    }

    if (selectedTypes.has('contractor_size')) {
      for (const ct of contractorTypes) {
        for (const bs of businessSizes) {
          result.push({
            page_type: 'contractor_size',
            combination_key: `contractor_size::${ct.id}::${bs.id}`,
            dimension_1: ct.id,
            dimension_2: bs.id,
            tier: 2,
            estimated_volume: 'medium',
            url: `/software/${ct.url_slug}/${bs.url_slug}`,
          });
        }
      }
    }

    return result;
  }, [selectedTypes, contractorTypes, painPoints, geographies, businessSizes, competitors]);

  const newCombinations = combinations.filter(
    (c) => !existingCombinationKeys.has(c.combination_key)
  );

  const filteredCombinations =
    tierFilter === 'all' ? newCombinations : newCombinations.filter((c) => c.tier === Number(tierFilter));

  const toggleType = (type: PageType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const tierCounts = newCombinations.reduce(
    (acc, c) => {
      acc[c.tier] = (acc[c.tier] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Combination Matrix
            </CardTitle>
            <CardDescription>
              Preview and generate page combinations from your taxonomy dimensions.
              {combinations.length > 0 && (
                <span className="ml-1">
                  {combinations.length} total, {newCombinations.length} new
                </span>
              )}
            </CardDescription>
          </div>
          {filteredCombinations.length > 0 && (
            <Button onClick={() => onAddToQueue(filteredCombinations)}>
              <ListPlus className="h-4 w-4 mr-1" />
              Add {filteredCombinations.length} to Queue
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">Page Types to Generate</Label>
          <div className="flex flex-wrap gap-3">
            {(Object.entries(PAGE_TYPE_LABELS) as [PageType, string][]).map(([type, label]) => (
              <div key={type} className="flex items-center gap-2">
                <Checkbox
                  id={`type-${type}`}
                  checked={selectedTypes.has(type)}
                  onCheckedChange={() => toggleType(type)}
                />
                <Label htmlFor={`type-${type}`} className="text-sm cursor-pointer">
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <span className="text-sm text-muted-foreground">Filter by tier:</span>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({newCombinations.length})</SelectItem>
              <SelectItem value="1">Tier 1 ({tierCounts[1] || 0})</SelectItem>
              <SelectItem value="2">Tier 2 ({tierCounts[2] || 0})</SelectItem>
              <SelectItem value="3">Tier 3 ({tierCounts[3] || 0})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredCombinations.length > 0 && (
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto border rounded">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Tier</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Combination Key</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCombinations.slice(0, 100).map((c) => (
                  <TableRow key={c.combination_key}>
                    <TableCell>
                      <Badge variant={c.tier === 1 ? 'default' : c.tier === 2 ? 'secondary' : 'outline'}>
                        T{c.tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{PAGE_TYPE_LABELS[c.page_type]}</TableCell>
                    <TableCell className="font-mono text-xs">{c.combination_key}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.url}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.estimated_volume}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredCombinations.length > 100 && (
              <div className="p-2 text-center text-sm text-muted-foreground border-t">
                Showing first 100 of {filteredCombinations.length} combinations
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
