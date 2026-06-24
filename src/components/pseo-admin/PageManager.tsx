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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Eye,
  Globe,
  GlobeLock,
  RotateCcw,
  Search,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { type PSEOPage, type GenerationStatus, GENERATION_STATUS_LABELS, PAGE_TYPE_LABELS } from '@/types/pseo';

interface PageManagerProps {
  pages: PSEOPage[];
  isLoading: boolean;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onRegenerate: (id: string) => void;
  onBulkPublish: (ids: string[]) => void;
}

const statusIcons: Record<GenerationStatus, React.ReactNode> = {
  pending: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  generated: <CheckCircle className="h-4 w-4 text-blue-500" />,
  review_needed: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
  published: <Globe className="h-4 w-4 text-green-500" />,
  stale: <RotateCcw className="h-4 w-4 text-amber-500" />,
};

export function PageManager({
  pages,
  isLoading,
  onPublish,
  onUnpublish,
  onRegenerate,
  onBulkPublish,
}: PageManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewingPage, setViewingPage] = useState<PSEOPage | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredPages = pages.filter((page) => {
    const matchesSearch =
      page.seo_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.canonical_url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.combination_key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || page.generation_status === statusFilter;
    const matchesType = typeFilter === 'all' || page.page_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const statusCounts = pages.reduce(
    (acc, page) => {
      acc[page.generation_status] = (acc[page.generation_status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPages.map((p) => p.id)));
    }
  };

  const publishableSelected = Array.from(selectedIds).filter((id) => {
    const page = pages.find((p) => p.id === id);
    return page && !page.is_published && page.generation_status === 'generated';
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Generated Pages</CardTitle>
              <CardDescription>
                {pages.length} total pages ({statusCounts.published || 0} published)
              </CardDescription>
            </div>
            {publishableSelected.length > 0 && (
              <Button size="sm" onClick={() => onBulkPublish(publishableSelected)}>
                <Globe className="h-4 w-4 mr-1" />
                Publish Selected ({publishableSelected.length})
              </Button>
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, URL, or combination..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(GENERATION_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label} ({statusCounts[value] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Page Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(PAGE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
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
                    <TableHead className="w-8">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredPages.length && filteredPages.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Conv.</TableHead>
                    <TableHead>QC</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        No pages found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPages.map((page) => (
                      <TableRow key={page.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(page.id)}
                            onChange={() => toggleSelected(page.id)}
                            className="rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {statusIcons[page.generation_status]}
                            <span className="text-xs">
                              {GENERATION_STATUS_LABELS[page.generation_status]}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {PAGE_TYPE_LABELS[page.page_type] || page.page_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate font-medium" title={page.seo_title}>
                          {page.seo_title}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-muted-foreground text-sm" title={page.canonical_url}>
                          {page.canonical_url}
                        </TableCell>
                        <TableCell className="text-right">{page.view_count}</TableCell>
                        <TableCell className="text-right">{page.conversion_count}</TableCell>
                        <TableCell>
                          {page.qc_failures && page.qc_failures.length > 0 ? (
                            <Badge variant="destructive" className="text-xs">
                              {page.qc_failures.length} fails
                            </Badge>
                          ) : page.generation_status === 'published' || page.generation_status === 'generated' ? (
                            <Badge variant="outline" className="text-xs text-green-600">
                              Passed
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewingPage(page)}
                              title="View schema"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {page.is_published ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onUnpublish(page.id)}
                                title="Unpublish"
                              >
                                <GlobeLock className="h-4 w-4" />
                              </Button>
                            ) : page.generation_status === 'generated' ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onPublish(page.id)}
                                title="Publish"
                              >
                                <Globe className="h-4 w-4" />
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onRegenerate(page.id)}
                              title="Regenerate"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
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

      {/* Page Schema Viewer */}
      <Dialog open={!!viewingPage} onOpenChange={() => setViewingPage(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingPage?.seo_title}</DialogTitle>
            <DialogDescription>
              {viewingPage?.canonical_url} — {viewingPage?.page_type}
            </DialogDescription>
          </DialogHeader>
          {viewingPage && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <Badge>{GENERATION_STATUS_LABELS[viewingPage.generation_status]}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Model:</span>{' '}
                  {viewingPage.generation_model}
                </div>
                <div>
                  <span className="text-muted-foreground">Version:</span>{' '}
                  {viewingPage.schema_version}
                </div>
              </div>

              {viewingPage.qc_failures && viewingPage.qc_failures.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <h4 className="text-sm font-medium text-red-800 mb-1">QC Failures</h4>
                  <ul className="list-disc list-inside text-sm text-red-700">
                    {viewingPage.qc_failures.map((failure, i) => (
                      <li key={i}>{failure}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium mb-2">SEO Description</h4>
                <p className="text-sm text-muted-foreground">{viewingPage.seo_description}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Full Page Schema</h4>
                <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-[400px]">
                  {JSON.stringify(viewingPage.page_schema, null, 2)}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            {viewingPage?.is_published && (
              <Button variant="outline" asChild>
                <a href={viewingPage.canonical_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Live
                </a>
              </Button>
            )}
            <Button variant="outline" onClick={() => setViewingPage(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
