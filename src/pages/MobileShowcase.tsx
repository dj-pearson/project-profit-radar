import React, { useState } from 'react';
import { MobileDashboardLayout } from '@/components/layout/MobileDashboardLayout';
import {
  MobileLayout,
  MobileSection,
  MobileGrid,
  MobileStack,
  MobileCard,
  MobileCardItem,
  MobileStatCard,
  MobileTable,
  MobileButton,
  MobileFAB,
  MobileActionSheet,
  MobileActionSheetItem,
  MobileDrawer,
  MobileInput,
  MobileButtonGroup
} from '@/components/mobile';
import { useIsMobile } from '@/hooks/useMediaQuery';
import {
  Home,
  Building2,
  DollarSign,
  TrendingUp,
  Users,
  Plus,
  Edit,
  Trash,
  Share,
  Download,
  Filter,
  Search,
  Settings
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Mobile-first showcase page demonstrating all mobile components
 */
export default function MobileShowcase() {
  const isMobile = useIsMobile();
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);

  // Sample data for demonstrations
  const stats = [
    { title: 'Active Projects', value: '12', icon: <Building2 />, trend: 'up', trendValue: '+2 this week' },
    { title: 'Total Revenue', value: '$125K', icon: <DollarSign />, trend: 'up', trendValue: '+15%' },
    { title: 'Team Members', value: '45', icon: <Users />, trend: 'neutral', trendValue: 'No change' },
    { title: 'Completion Rate', value: '94%', icon: <TrendingUp />, trend: 'up', trendValue: '+3%' },
  ];

  const projects = [
    { id: 1, name: 'Downtown Office Building', status: 'Active', budget: '$500K', completion: '75%' },
    { id: 2, name: 'Residential Complex', status: 'Planning', budget: '$1.2M', completion: '25%' },
    { id: 3, name: 'Shopping Center Renovation', status: 'Active', budget: '$750K', completion: '60%' },
  ];

  const tableColumns = [
    { key: 'name', label: 'Project', mobilePrimary: true },
    { key: 'status', label: 'Status', render: (item: any) => (
      <Badge variant={item.status === 'Active' ? 'default' : 'secondary'}>
        {item.status}
      </Badge>
    )},
    { key: 'budget', label: 'Budget' },
    { key: 'completion', label: 'Progress', mobileHidden: false },
  ];

  return (
    <MobileDashboardLayout
      title="Mobile Showcase"
      showBottomNav={true}
      actions={
        <MobileButton
          size="sm"
          variant="outline"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => {}}
        >
          Add
        </MobileButton>
      }
    >
      <MobileLayout withPadding={false} className="space-y-6">
        {/* Introduction */}
        <MobileSection
          title="Mobile-First Design"
          description={`This page showcases BuildDesk's mobile-optimized components. ${isMobile ? 'You\'re viewing on mobile!' : 'Try resizing your browser or viewing on a mobile device.'}`}
        >
          <div className="bg-primary/10 p-4 rounded-lg">
            <p className="text-sm">
              Every component adapts seamlessly between mobile and desktop, with touch-friendly targets,
              optimized layouts, and native-feeling interactions.
            </p>
          </div>
        </MobileSection>

        {/* Stats Grid */}
        <MobileSection title="Dashboard Stats" description="Mobile-optimized stat cards">
          <MobileGrid cols={2}>
            {stats.map((stat, index) => (
              <MobileStatCard
                key={index}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                trend={stat.trend as any}
                trendValue={stat.trendValue}
                onClick={() => {}}
              />
            ))}
          </MobileGrid>
        </MobileSection>

        {/* Card List */}
        <MobileSection title="Project List" description="Touch-friendly card items">
          <MobileStack spacing="sm">
            <MobileCard>
              {projects.map((project, index) => (
                <MobileCardItem
                  key={project.id}
                  title={project.name}
                  subtitle={`${project.budget} • ${project.completion} complete`}
                  value={project.status}
                  icon={<Building2 className="h-5 w-5" />}
                  onClick={() => {}}
                  className={index < projects.length - 1 ? 'border-b' : ''}
                />
              ))}
            </MobileCard>
          </MobileStack>
        </MobileSection>

        {/* Responsive Table */}
        <MobileSection title="Projects Table" description="Cards on mobile, table on desktop">
          <MobileTable
            data={projects}
            columns={tableColumns}
            onRowClick={() => {}}
            emptyMessage="No projects found"
            keyExtractor={(item) => item.id.toString()}
          />
        </MobileSection>

        {/* Buttons */}
        <MobileSection title="Touch-Friendly Buttons" description="Optimized button sizes">
          <MobileStack spacing="md">
            <MobileButtonGroup orientation="horizontal">
              <MobileButton size="md" fullWidth icon={<Edit className="h-4 w-4" />}>
                Edit
              </MobileButton>
              <MobileButton size="md" fullWidth variant="outline" icon={<Share className="h-4 w-4" />}>
                Share
              </MobileButton>
            </MobileButtonGroup>

            <MobileButtonGroup orientation="vertical">
              <MobileButton
                size="lg"
                fullWidth
                icon={<Download className="h-5 w-5" />}
                iconPosition="left"
              >
                Download Report
              </MobileButton>
              <MobileButton
                size="lg"
                fullWidth
                variant="outline"
                icon={<Filter className="h-5 w-5" />}
                onClick={() => setShowDrawer(true)}
              >
                Open Filters
              </MobileButton>
              <MobileButton
                size="lg"
                fullWidth
                variant="secondary"
                onClick={() => setShowActionSheet(true)}
              >
                Show Action Sheet
              </MobileButton>
            </MobileButtonGroup>
          </MobileStack>
        </MobileSection>

        {/* Forms */}
        <MobileSection title="Mobile Forms" description="Large input fields with proper keyboards">
          <MobileCard>
            <div className="p-4 space-y-4">
              <MobileInput
                label="Project Name"
                id="project-name"
                placeholder="Enter project name"
              />
              <MobileInput
                label="Budget"
                id="budget"
                type="number"
                placeholder="0.00"
              />
              <MobileInput
                label="Email"
                id="email"
                type="email"
                placeholder="email@example.com"
              />
              <MobileButton size="lg" fullWidth>
                Submit
              </MobileButton>
            </div>
          </MobileCard>
        </MobileSection>

        {/* Device Info */}
        <MobileSection title="Device Information">
          <MobileCard>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Device Type:</span>
                <span className="font-medium">{isMobile ? 'Mobile' : 'Desktop'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Screen Width:</span>
                <span className="font-medium">{window.innerWidth}px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Touch Support:</span>
                <span className="font-medium">
                  {'ontouchstart' in window ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </MobileCard>
        </MobileSection>
      </MobileLayout>

      {/* Floating Action Button (Mobile Only) */}
      {isMobile && (
        <MobileFAB
          icon={<Plus className="h-6 w-6" />}
          onClick={() => {}}
          label="Add new item"
          position="bottom-right"
        />
      )}

      {/* Action Sheet Example */}
      <MobileActionSheet
        isOpen={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        title="Choose an Action"
      >
        <MobileActionSheetItem
          icon={<Edit className="h-5 w-5" />}
          label="Edit Project"
          onClick={() => {}}
        />
        <MobileActionSheetItem
          icon={<Share className="h-5 w-5" />}
          label="Share Project"
          onClick={() => {}}
        />
        <MobileActionSheetItem
          icon={<Download className="h-5 w-5" />}
          label="Download Report"
          onClick={() => {}}
        />
        <MobileActionSheetItem
          icon={<Trash className="h-5 w-5" />}
          label="Delete Project"
          onClick={() => {}}
          variant="destructive"
        />
      </MobileActionSheet>

      {/* Drawer Example */}
      <MobileDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title="Filters"
        position="bottom"
        size="lg"
      >
        <div className="space-y-4">
          <MobileInput label="Search" id="search" placeholder="Search projects..." />
          <MobileInput label="Status" id="status" placeholder="Select status" />
          <MobileInput label="Budget Range" id="budget" type="number" placeholder="Min - Max" />
          <MobileButtonGroup orientation="horizontal">
            <MobileButton variant="outline" fullWidth onClick={() => setShowDrawer(false)}>
              Reset
            </MobileButton>
            <MobileButton fullWidth onClick={() => setShowDrawer(false)}>
              Apply
            </MobileButton>
          </MobileButtonGroup>
        </div>
      </MobileDrawer>
    </MobileDashboardLayout>
  );
}
