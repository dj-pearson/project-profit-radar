import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Play, RotateCcw, Trash2, Search, Plus } from 'lucide-react';
import {
  type PSEOGenerationQueueItem,
  type QueueStatus,
  type PageType,
  QUEUE_STATUS_LABELS,
  PAGE_TYPE_LABELS,
} from '@/types/pseo';

interface GenerationQueueManagerProps {
  items: PSEOGenerationQueueItem[];
  isLoading: boolean;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onBulkGenerate: (tier: number) => void;
  onSeedQueue: () => void;
}

const statusColors: Record<QueueStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  insufficient_data: 'bg-gray-100 text-gray-800',
};

export function GenerationQueueManager({
  items,
  isLoading,
  onRetry,
  onRemove,
  onBulkGenerate,
  onSeedQueue,
}: GenerationQueueManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.combination_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.dimension_1.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.dimension_2.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesTier = tierFilter === 'all' || item.tier === Number(tierFilter);
    return matchesSearch && matchesStatus && matchesTier;
  });

  const statusCounts = items.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Generation Queue</CardTitle>
            <CardDescription>
              {items.length} items in queue ({statusCounts.pending || 0} pending,{' '}
              {statusCounts.in_progress || 0} in progress)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onSeedQueue}>
              <Plus className="h-4 w-4 mr-1" />
              Seed Queue
            </Button>
            <Button size="sm" onClick={() => onBulkGenerate(1)}>
              <Play className="h-4 w-4 mr-1" />
              Generate Tier 1
            </Button>
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by combination key..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(QUEUE_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label} ({statusCounts[value] || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="1">Tier 1</SelectItem>
              <SelectItem value="2">Tier 2</SelectItem>
              <SelectItem value="3">Tier 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier</TableHead>
                  <TableHead>Page Type</TableHead>
                  <TableHead>Combination</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Retries</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No queue items found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant={item.tier === 1 ? 'default' : item.tier === 2 ? 'secondary' : 'outline'}>
                          T{item.tier}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {PAGE_TYPE_LABELS[item.page_type as PageType] || item.page_type}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.dimension_1} + {item.dimension_2}
                        {item.dimension_3 && ` + ${item.dimension_3}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.estimated_volume}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[item.status]}`}>
                          {QUEUE_STATUS_LABELS[item.status]}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{item.retry_count}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(item.status === 'failed' || item.status === 'insufficient_data') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onRetry(item.id)}
                              title="Retry"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          {item.status !== 'in_progress' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onRemove(item.id)}
                              title="Remove"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
