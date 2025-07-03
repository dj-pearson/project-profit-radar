import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Play, 
  CheckCircle2, 
  Clock, 
  Video, 
  BookOpen, 
  Users, 
  DollarSign,
  FileText,
  Settings,
  Star,
  ArrowRight
} from 'lucide-react';

interface Tutorial {
  id: string;
  title: string;
  description: string;
  video_url: string;
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  order: number;
  prerequisites?: string[];
  completed: boolean;
  transcript?: string;
}

interface LearningPath {
  id: string;
  name: string;
  description: string;
  tutorials: Tutorial[];
  estimated_time: string;
  completion_percentage: number;
}

const VideoTutorialSystem = () => {
  const { userProfile } = useAuth();
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [userProgress, setUserProgress] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTutorials();
    loadUserProgress();
  }, []);

  const loadTutorials = async () => {
    try {
      // Mock data until we create the tutorials database
      const mockPaths: LearningPath[] = [
        {
          id: '1',
          name: 'Getting Started with BuildDesk',
          description: 'Complete introduction to the platform for new users',
          estimated_time: '45 minutes',
          completion_percentage: 60,
          tutorials: [
            {
              id: '1',
              title: 'Welcome to BuildDesk',
              description: 'Overview of features and navigation',
              video_url: 'https://example.com/video1',
              duration: '5:30',
              difficulty: 'beginner',
              category: 'introduction',
              order: 1,
              completed: true
            },
            {
              id: '2',
              title: 'Setting Up Your Company Profile',
              description: 'Configure your company information and preferences',
              video_url: 'https://example.com/video2',
              duration: '8:15',
              difficulty: 'beginner',
              category: 'setup',
              order: 2,
              completed: true
            },
            {
              id: '3',
              title: 'Creating Your First Project',
              description: 'Step-by-step project creation walkthrough',
              video_url: 'https://example.com/video3',
              duration: '12:45',
              difficulty: 'beginner',
              category: 'projects',
              order: 3,
              completed: false
            }
          ]
        },
        {
          id: '2',
          name: 'Project Management Mastery',
          description: 'Advanced project management techniques and best practices',
          estimated_time: '90 minutes',
          completion_percentage: 25,
          tutorials: [
            {
              id: '4',
              title: 'Advanced Project Planning',
              description: 'Learn to create detailed project plans with dependencies',
              video_url: 'https://example.com/video4',
              duration: '18:30',
              difficulty: 'intermediate',
              category: 'planning',
              order: 1,
              prerequisites: ['3'],
              completed: false
            },
            {
              id: '5',
              title: 'Resource Management',
              description: 'Efficiently allocate and track resources',
              video_url: 'https://example.com/video5',
              duration: '15:20',
              difficulty: 'intermediate',
              category: 'resources',
              order: 2,
              completed: true
            }
          ]
        },
        {
          id: '3',
          name: 'Financial Management',
          description: 'Master job costing, budgets, and financial tracking',
          estimated_time: '75 minutes',
          completion_percentage: 0,
          tutorials: [
            {
              id: '6',
              title: 'Setting Up Job Costing',
              description: 'Configure cost codes and tracking systems',
              video_url: 'https://example.com/video6',
              duration: '20:15',
              difficulty: 'intermediate',
              category: 'financial',
              order: 1,
              completed: false
            },
            {
              id: '7',
              title: 'Budget Management',
              description: 'Create and monitor project budgets',
              video_url: 'https://example.com/video7',
              duration: '16:45',
              difficulty: 'intermediate',
              category: 'financial',
              order: 2,
              completed: false
            }
          ]
        }
      ];

      setLearningPaths(mockPaths);
    } catch (error) {
      console.error('Error loading tutorials:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProgress = async () => {
    if (!userProfile?.id) return;

    try {
      // Load from localStorage for now
      const saved = localStorage.getItem(`tutorial_progress_${userProfile.id}`);
      if (saved) {
        setUserProgress(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading user progress:', error);
    }
  };

  const markTutorialComplete = async (tutorialId: string) => {
    const newProgress = { ...userProgress, [tutorialId]: true };
    setUserProgress(newProgress);
    
    if (userProfile?.id) {
      localStorage.setItem(`tutorial_progress_${userProfile.id}`, JSON.stringify(newProgress));
    }

    // Update the tutorial in the learning paths
    setLearningPaths(paths => 
      paths.map(path => ({
        ...path,
        tutorials: path.tutorials.map(tutorial => 
          tutorial.id === tutorialId ? { ...tutorial, completed: true } : tutorial
        ),
        completion_percentage: calculatePathCompletion(path.tutorials, newProgress)
      }))
    );
  };

  const calculatePathCompletion = (tutorials: Tutorial[], progress: Record<string, boolean>) => {
    const completed = tutorials.filter(t => progress[t.id] || t.completed).length;
    return Math.round((completed / tutorials.length) * 100);
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-red-100 text-red-800'
    };
    return colors[difficulty as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      introduction: BookOpen,
      setup: Settings,
      projects: FileText,
      planning: Users,
      resources: Clock,
      financial: DollarSign
    };
    return icons[category as keyof typeof icons] || Video;
  };

  const watchTutorial = (tutorial: Tutorial) => {
    setSelectedTutorial(tutorial);
    setVideoDialogOpen(true);
  };

  const canWatchTutorial = (tutorial: Tutorial) => {
    if (!tutorial.prerequisites) return true;
    return tutorial.prerequisites.every(prereqId => userProgress[prereqId]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Video className="h-5 w-5" />
        <h2 className="text-2xl font-semibold">Video Tutorials & Onboarding</h2>
      </div>

      {/* Learning Paths */}
      <div className="grid gap-6">
        {learningPaths.map((path) => (
          <Card key={path.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <span>{path.name}</span>
                    {path.completion_percentage === 100 && (
                      <Badge variant="secondary">
                        <Star className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{path.description}</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{path.estimated_time}</p>
                  <p className="text-lg font-semibold">{path.completion_percentage}%</p>
                </div>
              </div>
              <Progress value={path.completion_percentage} className="mt-2" />
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {path.tutorials.map((tutorial) => {
                    const CategoryIcon = getCategoryIcon(tutorial.category);
                    const isCompleted = userProgress[tutorial.id] || tutorial.completed;
                    const canWatch = canWatchTutorial(tutorial);
                    
                    return (
                      <div
                        key={tutorial.id}
                        className={`p-4 border rounded-lg ${
                          isCompleted ? 'bg-green-50 border-green-200' : 
                          canWatch ? 'hover:bg-accent cursor-pointer' : 'opacity-50'
                        }`}
                        onClick={() => canWatch && watchTutorial(tutorial)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-start space-x-3">
                            <div className="flex items-center space-x-2">
                              {isCompleted ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : (
                                <Play className="h-5 w-5 text-primary" />
                              )}
                              <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium">{tutorial.title}</h4>
                              <p className="text-sm text-muted-foreground">{tutorial.description}</p>
                              <div className="flex items-center space-x-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {tutorial.duration}
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${getDifficultyColor(tutorial.difficulty)}`}
                                >
                                  {tutorial.difficulty}
                                </Badge>
                                {tutorial.prerequisites && (
                                  <Badge variant="outline" className="text-xs">
                                    Prerequisites required
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          {canWatch && !isCompleted && (
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Video Dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedTutorial?.title}</DialogTitle>
          </DialogHeader>
          {selectedTutorial && (
            <div className="space-y-4">
              {/* Video Player Placeholder */}
              <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                <div className="text-center text-white">
                  <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">{selectedTutorial.title}</p>
                  <p className="text-sm opacity-75">Duration: {selectedTutorial.duration}</p>
                  <Button 
                    className="mt-4"
                    onClick={() => markTutorialComplete(selectedTutorial.id)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Play Video
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{selectedTutorial.difficulty}</Badge>
                  <Badge variant="outline">{selectedTutorial.duration}</Badge>
                </div>
                <Button 
                  onClick={() => markTutorialComplete(selectedTutorial.id)}
                  variant="outline"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as Complete
                </Button>
              </div>
              
              <p className="text-muted-foreground">{selectedTutorial.description}</p>
              
              {selectedTutorial.transcript && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Transcript</h4>
                  <p className="text-sm">{selectedTutorial.transcript}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoTutorialSystem;