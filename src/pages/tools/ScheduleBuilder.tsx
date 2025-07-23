import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from "@/components/Header";
import ToolsFooter from "@/components/ToolsFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer } from "@/components/layout/ResponsiveContainer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { SkipLink } from "@/components/accessibility/AccessibilityUtils";
import GanttChart from "@/components/schedule/GanttChart";
import { PDFExportDialog } from "@/components/schedule/PDFExportDialog";
import { createSampleProject, updateTaskDates } from "@/utils/scheduleUtils";
import { Project, Task, TemplateType } from "@/types/schedule";
import { 
  Calendar, 
  ArrowLeft, 
  Download, 
  Play, 
  CheckCircle, 
  Clock,
  Users,
  Building2,
  Home,
  Wrench,
  ChevronRight,
  Star,
  Share
} from 'lucide-react';

interface ProjectTemplateDisplay {
  id: TemplateType;
  name: string;
  description: string;
  duration: string;
  phases: number;
  icon: React.ElementType;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

const ScheduleBuilder = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | ''>('');
  const [projectName, setProjectName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [showPDFDialog, setShowPDFDialog] = useState(false);

  const templates: ProjectTemplateDisplay[] = [
    {
      id: 'single-family-home',
      name: 'Single-Family Home Construction',
      description: 'Complete new home construction from foundation to finish',
      duration: '120-180 days',
      phases: 14,
      icon: Home,
      difficulty: 'advanced'
    },
    {
      id: 'home-renovation',
      name: 'Home Renovation/Remodel',
      description: 'Major home renovation and remodeling project',
      duration: '30-60 days',
      phases: 8,
      icon: Wrench,
      difficulty: 'intermediate'
    },
    {
      id: 'commercial-buildout',
      name: 'Commercial Build-Out',
      description: 'Commercial space tenant improvement project',
      duration: '90-150 days',
      phases: 12,
      icon: Building2,
      difficulty: 'advanced'
    },
    {
      id: 'kitchen-remodel',
      name: 'Kitchen Remodel',
      description: 'Complete kitchen renovation and upgrade',
      duration: '15-30 days',
      phases: 6,
      icon: Home,
      difficulty: 'beginner'
    },
    {
      id: 'bathroom-remodel',
      name: 'Bathroom Remodel',
      description: 'Full bathroom renovation project',
      duration: '10-20 days',
      phases: 5,
      icon: Home,
      difficulty: 'beginner'
    },
    {
      id: 'deck-construction',
      name: 'Deck/Outdoor Construction',
      description: 'Outdoor deck and patio construction',
      duration: '7-14 days',
      phases: 4,
      icon: Home,
      difficulty: 'beginner'
    }
  ];

  // Handle task updates
  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    if (!currentProject) return;
    
    const updatedTasks = currentProject.tasks.map(task => {
      if (task.id === taskId) {
        const updatedTask = { ...task, ...updates };
        if (updates.startDate && !updates.endDate) {
          // Auto-calculate end date if only start date is provided
          return updateTaskDates(updatedTask, updates.startDate, currentProject.tasks);
        }
        return updatedTask;
      }
      return task;
    });
    
    setCurrentProject({
      ...currentProject,
      tasks: updatedTasks
    });
  };

  // Handle adding new tasks
  const handleAddTask = () => {
    if (!currentProject) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      name: 'New Task',
      duration: 3,
      startDate: new Date(),
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      dependencies: [],
      resourceId: 'general-crew',
      status: 'not-started' as const,
      isOnCriticalPath: false,
      phase: 'planning'
    };

    setCurrentProject({
      ...currentProject,
      tasks: [...currentProject.tasks, newTask]
    });
  };

  // Handle sharing functionality
  const handleShare = (shareUrl: string) => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert(`Schedule shared! Link copied to clipboard:\n\n${shareUrl}\n\nAnyone with this link can view your project timeline.`);
    }).catch(() => {
      alert(`Share this link with your team:\n\n${shareUrl}`);
    });
  };

  // Handle PDF export
  const handleExportPDF = async () => {
    if (!currentProject) return;
    setShowPDFDialog(true);
  };

  // Handle settings
  const handleSettings = () => {
    if (!currentProject) return;

    const newProjectName = prompt('Project Name:', currentProject.name);
    if (newProjectName && newProjectName !== currentProject.name) {
      setProjectName(newProjectName);
      setCurrentProject({
        ...currentProject,
        name: newProjectName
      });
    }
  };

  const testimonials = [
    {
      name: "Mike R.",
      company: "Small Construction Co.",
      savings: "Several hours saved per project",
      quote: "This tool significantly reduced my scheduling time. The templates work well for residential projects."
    },
    {
      name: "Sarah C.",
      company: "Regional Renovation",
      savings: "Better project visibility",
      quote: "The critical path visualization helps identify potential bottlenecks before they become problems."
    },
    {
      name: "Tom W.",
      company: "Commercial Contractor",
      savings: "Professional presentations", 
      quote: "Clients appreciate the professional PDF schedules. It helps differentiate us from competitors."
    }
  ];

  const handleStartBuilding = () => {
    if (selectedTemplate && projectName && startDate) {
      const project = createSampleProject(
        selectedTemplate as TemplateType, 
        projectName, 
        new Date(startDate)
      );
      setCurrentProject(project);
      setShowSchedule(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title="Free Construction Schedule Builder | Create Professional Project Timelines | Build-Desk"
        description="Create professional construction schedules in minutes with our free drag-and-drop tool. Choose from 6 project templates, analyze critical paths, and export PDFs."
        keywords={[
          'construction schedule builder',
          'construction scheduling software',
          'project timeline template',
          'construction project planner',
          'free scheduling tool',
          'gantt chart construction',
          'critical path construction'
        ]}
        canonicalUrl="/tools/schedule-builder"
      />
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      
      <Header />
      
      <main id="main-content">
        {/* Header */}
        <section className="py-8 bg-gradient-to-b from-construction-light to-background">
          <ResponsiveContainer>
            <div className="flex items-center mb-6">
              <Button variant="ghost" asChild className="mr-4">
                <Link to="/tools" className="flex items-center">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Tools
                </Link>
              </Button>
            </div>
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex items-center justify-center mb-4">
                <Calendar className="h-10 w-10 text-construction-orange mr-3" />
                <h1 className="text-3xl lg:text-5xl font-bold text-construction-dark">
                  Construction Schedule Builder
                </h1>
              </div>
              <p className="text-lg lg:text-xl text-construction-dark/70 mb-6">
                Create professional project timelines in minutes, not hours. Used by 10,000+ contractors nationwide.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-construction-dark/70">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span>6 Project Templates</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span>Drag-and-Drop Interface</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span>Critical Path Analysis</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span>Professional PDF Export</span>
                </div>
              </div>
            </div>
          </ResponsiveContainer>
        </section>

        {/* Social Proof */}
        <section className="py-8 bg-white">
          <ResponsiveContainer>
            <div className="text-center mb-8">
              <p className="text-construction-dark/80 font-medium">
                Trusted by contractors who use <span className="text-construction-orange font-bold">professional scheduling tools</span>
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="border-l-4 border-l-construction-orange">
                  <CardContent className="pt-6">
                    <div className="flex items-center mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-sm italic mb-4">"{testimonial.quote}"</p>
                    <div className="text-sm">
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-muted-foreground">{testimonial.company}</p>
                      <p className="text-construction-orange font-medium">{testimonial.savings}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ResponsiveContainer>
        </section>

        {!showSchedule ? (
          /* Template Selection */
          <section className="py-12">
            <ResponsiveContainer>
              <div className="max-w-6xl mx-auto">
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Project Setup */}
                  <div className="lg:col-span-1">
                    <Card className="sticky top-8">
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Play className="mr-2 h-5 w-5 text-construction-orange" />
                          Start Your Project
                        </CardTitle>
                        <CardDescription>
                          Choose a template and customize your project details
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="project-name">Project Name</Label>
                          <Input
                            id="project-name"
                            placeholder="Enter project name..."
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                          />
                        </div>

                        <div>
                          <Label htmlFor="start-date">Start Date</Label>
                          <Input
                            id="start-date"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                          />
                        </div>

                        <div>
                          <Label htmlFor="template">Project Template</Label>
                          <Select value={selectedTemplate} onValueChange={(value) => setSelectedTemplate(value as TemplateType | "")}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a template..." />
                            </SelectTrigger>
                            <SelectContent>
                              {templates.map((template) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button 
                          onClick={handleStartBuilding}
                          className="w-full"
                          size="lg"
                          disabled={!selectedTemplate || !projectName || !startDate}
                        >
                          Build My Schedule
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>

                        <p className="text-xs text-muted-foreground text-center">
                          No signup required • Instant results
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Template Grid */}
                  <div className="lg:col-span-2">
                    <h2 className="text-2xl font-bold text-construction-dark mb-6">
                      Choose Your Project Template
                    </h2>
                    <div className="grid md:grid-cols-2 gap-4">
                      {templates.map((template) => {
                        const IconComponent = template.icon;
                        const isSelected = selectedTemplate === template.id;
                        
                        return (
                          <Card 
                            key={template.id} 
                            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                              isSelected 
                                ? 'ring-2 ring-construction-orange bg-construction-orange/5' 
                                : 'hover:ring-1 hover:ring-construction-orange/50'
                            }`}
                            onClick={() => setSelectedTemplate(template.id)}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center">
                                  <div className="p-2 bg-construction-orange/10 rounded-lg mr-3">
                                    <IconComponent className="h-6 w-6 text-construction-orange" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg leading-tight">{template.name}</CardTitle>
                                    <div className="flex items-center mt-1 space-x-2">
                                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                                        template.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                                        template.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                      }`}>
                                        {template.difficulty}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <p className="text-sm text-muted-foreground mb-3">
                                {template.description}
                              </p>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {template.duration}
                                </div>
                                <div className="flex items-center">
                                  <Users className="h-4 w-4 mr-1" />
                                  {template.phases} phases
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </ResponsiveContainer>
          </section>
        ) : (
          /* Schedule Interface Placeholder */
          <section className="py-12">
            <ResponsiveContainer>
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-construction-dark">{projectName}</h2>
                    <p className="text-muted-foreground">
                      {templates.find(t => t.id === selectedTemplate)?.name} • Started {startDate}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Share className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                    <Button size="sm" onClick={handleExportPDF}>
                      <Download className="mr-2 h-4 w-4" />
                      Export PDF
                    </Button>
                  </div>
                </div>

                            {/* Interactive Gantt Chart */}
            <GanttChart
              project={currentProject}
              onTaskUpdate={handleTaskUpdate}
              onAddTask={() => {
                handleAddTask();
              }}
              onShare={(shareUrl) => {
                handleShare(shareUrl);
              }}
              onExportPDF={() => {
                handleExportPDF();
              }}
              onSettings={() => {
                handleSettings();
              }}
            />
              </div>
            </ResponsiveContainer>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-16 bg-construction-orange">
          <ResponsiveContainer>
            <div className="text-center text-white max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">
                Ready for Advanced Project Management?
              </h2>
              <p className="text-lg mb-8 opacity-90">
                This free tool is just the beginning. Build-Desk offers real-time progress tracking, 
                cost management, team collaboration, and automated reporting for your entire operation.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="secondary" size="lg" asChild>
                  <Link to="/auth">
                    Start Free Trial
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="bg-transparent border-white text-white hover:bg-white hover:text-construction-orange" asChild>
                  <Link to="/#features">
                    See All Features
                  </Link>
                </Button>
              </div>
            </div>
          </ResponsiveContainer>
        </section>
      </main>

      <ToolsFooter />

      {/* PDF Export Dialog */}
      {currentProject && (
        <PDFExportDialog
          isOpen={showPDFDialog}
          onClose={() => setShowPDFDialog(false)}
          project={currentProject}
          templateName={templates.find(t => t.id === selectedTemplate)?.name}
        />
      )}
    </div>
  );
};

export default ScheduleBuilder; 