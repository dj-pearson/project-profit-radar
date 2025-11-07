import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

import { 
  DollarSign, 
  Clock, 
  Users, 
  TrendingUp, 
  Play, 
  Pause,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Shuffle
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  progress: number;
  budget: number;
  spent: number;
  status: 'on-track' | 'at-risk' | 'completed';
  crew: number;
}

const InteractiveDashboard = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentScenario, setCurrentScenario] = useState(0);
  const [realProjects, setRealProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, userProfile } = useAuth();

  // Fallback projects for demo when no real data
  const fallbackProjects: Project[] = [
    {
      id: '1',
      name: 'Downtown Office Complex',
      progress: 65,
      budget: 450000,
      spent: 290000,
      status: 'on-track',
      crew: 8
    },
    {
      id: '2',
      name: 'Residential Apartments',
      progress: 82,
      budget: 280000,
      spent: 235000,
      status: 'at-risk',
      crew: 6
    },
    {
      id: '3',
      name: 'Retail Strip Mall',
      progress: 100,
      budget: 320000,
      spent: 315000,
      status: 'completed',
      crew: 0
    }
  ];

  useEffect(() => {
    loadRealProjects();
  }, [userProfile?.company_id]);

  const loadRealProjects = async () => {
    try {
      setLoading(true);
      if (!userProfile?.company_id) {
        setRealProjects(fallbackProjects);
        setLoading(false);
        return;
      }

      const { data: projectsData, error } = await supabase
        .from('projects')
        .select(`
          id, 
          name, 
          budget, 
          status,
          updated_at
        `)
        .eq('company_id', userProfile.company_id)
        .limit(10);

      if (error) throw error;

      if (projectsData && projectsData.length > 0) {
        // Transform real data to dashboard format
        const transformedProjects = projectsData.map(p => ({
          id: p.id,
          name: p.name,
          progress: Math.floor(Math.random() * 80) + 10, // Simulate progress since completion_percentage doesn't exist
          budget: p.budget || 100000,
          spent: Math.floor((p.budget || 100000) * (0.4 + Math.random() * 0.4)), // Simulate spending
          status: getProjectStatus(Math.random() * 100, p.status),
          crew: Math.floor(Math.random() * 8) + 2 // Simulate crew size
        }));
        setRealProjects(transformedProjects);
      } else {
        setRealProjects(fallbackProjects);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      setRealProjects(fallbackProjects);
    } finally {
      setLoading(false);
    }
  };

  const getProjectStatus = (completion: number, status: string): 'on-track' | 'at-risk' | 'completed' => {
    if (completion >= 100 || status === 'completed') return 'completed';
    if (completion < 50 || status === 'on_hold') return 'at-risk';
    return 'on-track';
  };

  const initialProjects = realProjects.length > 0 ? realProjects : fallbackProjects;

  const scenarios = [
    {
      name: "Current Projects",
      description: "Your active projects",
      projects: initialProjects
    },
    {
      name: "Budget Overruns",
      description: "Projects facing financial challenges",
      projects: initialProjects.map(p => ({ 
        ...p, 
        spent: Math.min(p.budget * 1.15, p.spent * 1.3), 
        status: 'at-risk' as const 
      }))
    },
    {
      name: "Ahead of Schedule",
      description: "High-performing projects",
      projects: initialProjects.map(p => ({ 
        ...p, 
        progress: Math.min(100, p.progress + 15), 
        spent: p.spent * 0.85, 
        status: p.status === 'completed' ? p.status : 'on-track' as const 
      }))
    },
    {
      name: "Critical Issues",
      description: "Projects requiring immediate attention",
      projects: initialProjects.map(p => ({ 
        ...p, 
        progress: Math.max(0, p.progress - 20), 
        spent: p.budget * 0.9, 
        status: 'at-risk' as const, 
        crew: p.crew + 2 
      }))
    }
  ];

  const [projects, setProjects] = useState<Project[]>(initialProjects);

  const demoSteps = [
    "Real-time project tracking",
    "Budget monitoring alerts", 
    "Crew utilization updates",
    "Progress milestone completion"
  ];

  useEffect(() => {
    setProjects(scenarios[currentScenario].projects);
  }, [currentScenario, realProjects]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % demoSteps.length);
      
      // Simulate real-time updates
      setProjects(prev => prev.map(project => {
        if (project.status === 'completed') return project;
        
        const progressIncrement = Math.random() * 2;
        const spentIncrement = Math.random() * 5000;
        
        return {
          ...project,
          progress: Math.min(100, project.progress + progressIncrement),
          spent: Math.min(project.budget, project.spent + spentIncrement),
          status: project.spent + spentIncrement > project.budget * 0.95 ? 'at-risk' : 'on-track'
        };
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [isPlaying, demoSteps.length]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'at-risk':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-construction-blue" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'at-risk':
        return 'bg-yellow-500';
      default:
        return 'bg-construction-blue';
    }
  };


  const resetDemo = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    setProjects(scenarios[currentScenario].projects);
  };

  const cycleScenario = () => {
    const nextScenario = (currentScenario + 1) % scenarios.length;
    setCurrentScenario(nextScenario);
    setProjects(scenarios[nextScenario].projects);
    setIsPlaying(false);
    setCurrentStep(0);
  };

  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const totalSpent = projects.reduce((sum, p) => sum + p.spent, 0);
  const totalCrew = projects.reduce((sum, p) => sum + p.crew, 0);
  const avgProgress = projects.reduce((sum, p) => sum + p.progress, 0) / projects.length;

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-4 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3"></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-muted rounded"></div>
          ))}
        </div>
        <div className="h-96 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Demo Control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-construction-dark">
              Interactive Dashboard Demo
            </h3>
            <p className="text-sm text-muted-foreground">
              {isPlaying ? demoSteps[currentStep] : `Scenario: ${scenarios[currentScenario].name} - ${scenarios[currentScenario].description}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={cycleScenario}
              variant="outline"
              size="sm"
              className="text-construction-blue border-construction-blue hover:bg-construction-blue hover:text-white"
            >
              <Shuffle className="mr-2 h-4 w-4" />
              Next Scenario
            </Button>
            <Button
              onClick={resetDemo}
              variant="outline"
              size="sm"
              className="text-construction-orange border-construction-orange hover:bg-construction-orange hover:text-white"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button
              onClick={() => setIsPlaying(!isPlaying)}
              variant="outline"
              className="text-construction-blue border-construction-blue hover:bg-construction-blue hover:text-white"
            >
              {isPlaying ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Auto Play
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="hover-scale">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-construction-orange" />
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-lg font-bold">${(totalBudget / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-construction-blue" />
              <div>
                <p className="text-sm text-muted-foreground">Spent</p>
                <p className="text-lg font-bold">${(totalSpent / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-construction-orange" />
              <div>
                <p className="text-sm text-muted-foreground">Active Crew</p>
                <p className="text-lg font-bold">{totalCrew}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-construction-blue" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Progress</p>
                <p className="text-lg font-bold">{avgProgress.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Active Projects</span>
            {isPlaying && (
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-construction-orange rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-construction-blue rounded-full animate-pulse delay-100"></div>
                <div className="w-2 h-2 bg-construction-orange rounded-full animate-pulse delay-200"></div>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="p-4 rounded-lg border hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(project.status)}
                    <h4 className="font-medium">{project.name}</h4>
                  </div>
                  <Badge 
                    variant="secondary"
                    className={`text-white ${getStatusColor(project.status)}`}
                  >
                    {project.status.replace('-', ' ')}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress</span>
                    <span>{project.progress.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={project.progress} 
                    className="h-2 mb-3"
                  />
                  
                  
                  <div className="flex justify-between text-sm mt-3">
                    <div className="flex items-center space-x-4">
                      <span>Budget: ${(project.budget / 1000).toFixed(0)}K</span>
                      <span>Spent: ${(project.spent / 1000).toFixed(0)}K</span>
                    </div>
                    {project.crew > 0 && (
                      <span className="flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span>{project.crew} crew</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feature Highlights */}
      <div className="grid md:grid-cols-3 gap-4 text-center">
        <div className="p-4 rounded-lg bg-primary/5">
          <Clock className="h-8 w-8 text-construction-blue mx-auto mb-2" />
          <h4 className="font-medium mb-1">Real-Time Updates</h4>
          <p className="text-sm text-muted-foreground">Live project tracking and instant notifications</p>
        </div>
        <div className="p-4 rounded-lg bg-primary/5">
          <DollarSign className="h-8 w-8 text-construction-orange mx-auto mb-2" />
          <h4 className="font-medium mb-1">Budget Control</h4>
          <p className="text-sm text-muted-foreground">Automatic cost monitoring and alerts</p>
        </div>
        <div className="p-4 rounded-lg bg-primary/5">
          <TrendingUp className="h-8 w-8 text-construction-blue mx-auto mb-2" />
          <h4 className="font-medium mb-1">Performance Analytics</h4>
          <p className="text-sm text-muted-foreground">Data-driven insights for better decisions</p>
        </div>
      </div>
    </div>
  );
};

export default InteractiveDashboard;