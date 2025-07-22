import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer } from "@/components/layout/ResponsiveContainer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { SkipLink } from "@/components/accessibility/AccessibilityUtils";
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

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  duration: string;
  phases: number;
  icon: React.ElementType;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface Task {
  id: string;
  name: string;
  duration: number;
  dependencies: string[];
  phase: string;
  critical: boolean;
}

const ScheduleBuilder = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [projectName, setProjectName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);

  const templates: ProjectTemplate[] = [
    {
      id: 'single-family',
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

  const sampleTasks: Task[] = [
    { id: '1', name: 'Site Preparation', duration: 3, dependencies: [], phase: 'Foundation', critical: true },
    { id: '2', name: 'Excavation', duration: 2, dependencies: ['1'], phase: 'Foundation', critical: true },
    { id: '3', name: 'Pour Foundation', duration: 1, dependencies: ['2'], phase: 'Foundation', critical: true },
    { id: '4', name: 'Foundation Cure', duration: 7, dependencies: ['3'], phase: 'Foundation', critical: true },
    { id: '5', name: 'Frame Walls', duration: 5, dependencies: ['4'], phase: 'Framing', critical: true },
    { id: '6', name: 'Install Roof Trusses', duration: 2, dependencies: ['5'], phase: 'Framing', critical: true },
    { id: '7', name: 'Sheathing & Roofing', duration: 3, dependencies: ['6'], phase: 'Framing', critical: true },
    { id: '8', name: 'Rough Electrical', duration: 3, dependencies: ['5'], phase: 'MEP', critical: false },
    { id: '9', name: 'Rough Plumbing', duration: 2, dependencies: ['5'], phase: 'MEP', critical: false },
    { id: '10', name: 'HVAC Installation', duration: 2, dependencies: ['5'], phase: 'MEP', critical: false }
  ];

  const testimonials = [
    {
      name: "Mike Rodriguez",
      company: "Rodriguez Construction",
      savings: "4 hours saved per project",
      quote: "This tool cut my scheduling time from 6 hours to 2 hours. The templates are spot-on for residential work."
    },
    {
      name: "Sarah Chen",
      company: "Chen Renovations",
      savings: "25% fewer delays",
      quote: "The critical path visualization helps me spot potential bottlenecks before they become problems."
    },
    {
      name: "Tom Wilson",
      company: "Wilson Commercial",
      savings: "Professional presentations",
      quote: "Clients love the professional PDF schedules. It sets us apart from competitors using handwritten timelines."
    }
  ];

  const handleStartBuilding = () => {
    if (selectedTemplate && projectName && startDate) {
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
                Trusted by contractors who've created <span className="text-construction-orange font-bold">15,000+ schedules</span>
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
                          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
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
                    <Button size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Export PDF
                    </Button>
                  </div>
                </div>

                {/* Timeline Placeholder */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Project Timeline</CardTitle>
                    <CardDescription>
                      Drag tasks to adjust dates • Red path shows critical tasks
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/30 rounded-lg p-8 text-center">
                      <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                        Interactive Gantt Chart Coming Soon
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        This will show your full project timeline with drag-and-drop functionality
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
                        {sampleTasks.slice(0, 6).map((task) => (
                          <div key={task.id} className={`p-3 rounded border ${
                            task.critical ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{task.name}</span>
                              {task.critical && (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                  Critical
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {task.duration} days • {task.phase}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Project Stats */}
                <div className="grid md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-construction-dark">45</div>
                      <div className="text-sm text-muted-foreground">Total Tasks</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-red-600">12</div>
                      <div className="text-sm text-muted-foreground">Critical Path Tasks</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-construction-orange">150</div>
                      <div className="text-sm text-muted-foreground">Project Days</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-green-600">85%</div>
                      <div className="text-sm text-muted-foreground">Schedule Efficiency</div>
                    </CardContent>
                  </Card>
                </div>
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

      <Footer />
    </div>
  );
};

export default ScheduleBuilder; 