import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, CalendarDays, FileText, Package } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface AdvancedFiltersProps {
  budgetMin: string;
  setBudgetMin: (value: string) => void;
  budgetMax: string;
  setBudgetMax: (value: string) => void;
  startDate: Date | undefined;
  setStartDate: (date: Date | undefined) => void;
  endDate: Date | undefined;
  setEndDate: (date: Date | undefined) => void;
  materialFilter: string;
  setMaterialFilter: (value: string) => void;
  taskFilter: string;
  setTaskFilter: (value: string) => void;
  documentFilter: string;
  setDocumentFilter: (value: string) => void;
}

/** The collapsible advanced filter card on the Projects page (budget, dates, materials, tasks, documents). */
export function AdvancedFilters({ budgetMin, setBudgetMin, budgetMax, setBudgetMax, startDate, setStartDate, endDate, setEndDate, materialFilter, setMaterialFilter, taskFilter, setTaskFilter, documentFilter, setDocumentFilter }: AdvancedFiltersProps) {
  return (
    <Card id="advanced-filters" className="p-3 sm:p-4" role="region" aria-label="Advanced filters">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Budget Range */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Budget Range</legend>
          <div className="flex gap-2">
            <Input
              placeholder="Min ($)"
              type="number"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              className="text-sm"
              aria-label="Minimum budget"
            />
            <Input
              placeholder="Max ($)"
              type="number"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              className="text-sm"
              aria-label="Maximum budget"
            />
          </div>
        </fieldset>

        {/* Start Date Range */}
        <div className="space-y-2">
          <Label id="start-date-label" className="text-sm font-medium">Start Date From</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
                aria-labelledby="start-date-label"
              >
                <CalendarDays className="mr-2 h-4 w-4" aria-hidden="true" />
                {startDate ? format(startDate, "PPP") : "Pick start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Date Range */}
        <div className="space-y-2">
          <Label id="end-date-label" className="text-sm font-medium">End Date To</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
                aria-labelledby="end-date-label"
              >
                <CalendarDays className="mr-2 h-4 w-4" aria-hidden="true" />
                {endDate ? format(endDate, "PPP") : "Pick end date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Materials Filter */}
        <div className="space-y-2">
          <Label htmlFor="materials-filter" className="text-sm font-medium">Materials</Label>
          <div className="relative">
            <Package className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="materials-filter"
              placeholder="Search materials..."
              value={materialFilter}
              onChange={(e) => setMaterialFilter(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tasks Filter */}
        <div className="space-y-2">
          <Label htmlFor="tasks-filter" className="text-sm font-medium">Tasks</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="tasks-filter"
              placeholder="Search tasks..."
              value={taskFilter}
              onChange={(e) => setTaskFilter(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Documents Filter */}
        <div className="space-y-2">
          <Label htmlFor="documents-filter" className="text-sm font-medium">Documents</Label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="documents-filter"
              placeholder="Search documents..."
              value={documentFilter}
              onChange={(e) => setDocumentFilter(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
