/**
 * Video Tutorial Library
 * Organized library of video tutorials for learning BuildDesk features
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Video,
  Search,
  Play,
  Clock,
  CheckCircle,
  Bookmark
} from 'lucide-react';

interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  duration: string; // in format "5:30"
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  thumbnailUrl?: string;
  videoUrl?: string;
  watched?: boolean;
  bookmarked?: boolean;
}

export const VideoTutorialLibrary: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoTutorial | null>(null);

  const categories = [
    'Getting Started',
    'Projects',
    'Financial',
    'Team Management',
    'Mobile App',
    'Integrations'
  ];

  const tutorials: VideoTutorial[] = [
    {
      id: '1',
      title: 'BuildDesk Overview - Getting Started',
      description: 'A comprehensive introduction to BuildDesk and its main features',
      duration: '8:45',
      category: 'Getting Started',
      difficulty: 'beginner',
      watched: true
    },
    {
      id: '2',
      title: 'Creating Your First Project',
      description: 'Step-by-step guide to setting up a new construction project',
      duration: '5:30',
      category: 'Projects',
      difficulty: 'beginner'
    },
    {
      id: '3',
      title: 'Budget Tracking and Job Costing',
      description: 'Learn how to track budgets and analyze job costs in real-time',
      duration: '12:15',
      category: 'Financial',
      difficulty: 'intermediate'
    },
    {
      id: '4',
      title: 'Mobile Time Clock with GPS',
      description: 'How to use the mobile app for time tracking and GPS verification',
      duration: '6:20',
      category: 'Mobile App',
      difficulty: 'beginner',
      bookmarked: true
    },
    {
      id: '5',
      title: 'Invoice Generation and Billing',
      description: 'Create professional invoices and manage client billing',
      duration: '9:40',
      category: 'Financial',
      difficulty: 'beginner'
    },
    {
      id: '6',
      title: 'Team Roles and Permissions',
      description: 'Setting up team members with appropriate access levels',
      duration: '7:10',
      category: 'Team Management',
      difficulty: 'intermediate'
    },
    {
      id: '7',
      title: 'QuickBooks Integration Setup',
      description: 'Connect BuildDesk with QuickBooks for automated sync',
      duration: '10:30',
      category: 'Integrations',
      difficulty: 'advanced'
    },
    {
      id: '8',
      title: 'Daily Reports from the Field',
      description: 'Submit daily progress reports with photos and notes',
      duration: '5:50',
      category: 'Mobile App',
      difficulty: 'beginner',
      watched: true
    },
    {
      id: '9',
      title: 'Change Order Management',
      description: 'Handle change orders and get client approvals efficiently',
      duration: '8:20',
      category: 'Projects',
      difficulty: 'intermediate'
    },
    {
      id: '10',
      title: 'Advanced Reporting and Analytics',
      description: 'Generate custom reports and analyze business metrics',
      duration: '14:25',
      category: 'Financial',
      difficulty: 'advanced',
      bookmarked: true
    }
  ];

  const filteredTutorials = tutorials.filter(tutorial => {
    const matchesSearch = searchQuery === '' ||
      tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tutorial.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === null || tutorial.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-700';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-700';
      case 'advanced':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Video Tutorials</h1>
        <p className="text-muted-foreground">
          Learn how to use BuildDesk with our step-by-step video guides
        </p>
      </div>

      {/* Search and Filter */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search tutorials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedCategory === null ? "default" : "outline"}
            className="cursor-pointer px-4 py-2"
            onClick={() => setSelectedCategory(null)}
          >
            All Categories
          </Badge>
          {categories.map(cat => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              className="cursor-pointer px-4 py-2"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Video className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{tutorials.length}</p>
                <p className="text-sm text-muted-foreground">Total Tutorials</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {tutorials.filter(t => t.watched).length}
                </p>
                <p className="text-sm text-muted-foreground">Watched</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Bookmark className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">
                  {tutorials.filter(t => t.bookmarked).length}
                </p>
                <p className="text-sm text-muted-foreground">Bookmarked</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tutorial Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTutorials.map(tutorial => (
          <Card
            key={tutorial.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedVideo(tutorial)}
          >
            <div className="relative">
              {/* Video Thumbnail Placeholder */}
              <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Play className="h-12 w-12 text-white opacity-75" />
              </div>

              {/* Duration Badge */}
              <Badge className="absolute bottom-2 right-2 bg-black/75 text-white">
                <Clock className="h-3 w-3 mr-1" />
                {tutorial.duration}
              </Badge>

              {/* Watched/Bookmarked Indicators */}
              <div className="absolute top-2 right-2 flex gap-2">
                {tutorial.watched && (
                  <div className="bg-green-500 rounded-full p-1">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                )}
                {tutorial.bookmarked && (
                  <div className="bg-purple-500 rounded-full p-1">
                    <Bookmark className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </div>

            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base line-clamp-2">{tutorial.title}</CardTitle>
              </div>
              <CardDescription className="line-clamp-2">
                {tutorial.description}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{tutorial.category}</Badge>
                <Badge className={getDifficultyColor(tutorial.difficulty)}>
                  {tutorial.difficulty}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {filteredTutorials.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No tutorials found</h3>
            <p className="text-muted-foreground">
              Try a different search term or category
            </p>
          </CardContent>
        </Card>
      )}

      {/* Video Player Modal (Placeholder) */}
      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <Card
            className="max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{selectedVideo.title}</CardTitle>
                  <CardDescription>{selectedVideo.description}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedVideo(null)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Video Player Placeholder */}
              <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                <div className="text-center text-white">
                  <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Video Player</p>
                  <p className="text-sm opacity-75">Duration: {selectedVideo.duration}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <Badge variant="outline">{selectedVideo.category}</Badge>
                <Badge className={getDifficultyColor(selectedVideo.difficulty)}>
                  {selectedVideo.difficulty}
                </Badge>
                <Button variant="outline" size="sm">
                  <Bookmark className="h-4 w-4 mr-2" />
                  {selectedVideo.bookmarked ? 'Bookmarked' : 'Bookmark'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default VideoTutorialLibrary;
