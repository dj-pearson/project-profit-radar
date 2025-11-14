/**
 * Help Center
 * Comprehensive help page with searchable knowledge base, FAQs, and tutorials
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  BookOpen,
  Video,
  HelpCircle,
  MessageCircle,
  ChevronRight,
  ExternalLink,
  FileText,
  Zap,
  DollarSign,
  Users,
  Calendar,
  Settings
} from 'lucide-react';

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  description: string;
  url?: string;
}

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

export const HelpCenter: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    { id: 'getting-started', name: 'Getting Started', icon: <Zap className="h-4 w-4" />, color: 'bg-blue-100 text-blue-700' },
    { id: 'projects', name: 'Projects', icon: <FileText className="h-4 w-4" />, color: 'bg-purple-100 text-purple-700' },
    { id: 'financial', name: 'Financial', icon: <DollarSign className="h-4 w-4" />, color: 'bg-green-100 text-green-700' },
    { id: 'team', name: 'Team', icon: <Users className="h-4 w-4" />, color: 'bg-orange-100 text-orange-700' },
    { id: 'scheduling', name: 'Scheduling', icon: <Calendar className="h-4 w-4" />, color: 'bg-pink-100 text-pink-700' },
    { id: 'settings', name: 'Settings', icon: <Settings className="h-4 w-4" />, color: 'bg-gray-100 text-gray-700' }
  ];

  const articles: HelpArticle[] = [
    {
      id: '1',
      title: 'How to create your first project',
      category: 'getting-started',
      description: 'Learn how to set up a new construction project in BuildDesk'
    },
    {
      id: '2',
      title: 'Setting up project budgets',
      category: 'financial',
      description: 'Configure budget tracking and cost codes for accurate job costing'
    },
    {
      id: '3',
      title: 'Inviting team members',
      category: 'team',
      description: 'Add team members and assign roles and permissions'
    },
    {
      id: '4',
      title: 'Mobile time tracking',
      category: 'getting-started',
      description: 'How to use the mobile app for time clock and GPS tracking'
    },
    {
      id: '5',
      title: 'Creating invoices',
      category: 'financial',
      description: 'Generate and send professional invoices to clients'
    },
    {
      id: '6',
      title: 'Project scheduling and Gantt charts',
      category: 'scheduling',
      description: 'Plan and visualize project timelines'
    },
    {
      id: '7',
      title: 'Change order management',
      category: 'projects',
      description: 'Handle change orders and get client approvals'
    },
    {
      id: '8',
      title: 'Daily reports from the field',
      category: 'projects',
      description: 'Submit daily progress reports with photos and notes'
    }
  ];

  const faqs: FAQ[] = [
    {
      question: 'How do I reset my password?',
      answer: 'Click on your profile icon in the top right, go to Settings, and select "Change Password". You can also use the "Forgot Password" link on the login page.',
      category: 'settings'
    },
    {
      question: 'Can I use BuildDesk on my phone?',
      answer: 'Yes! BuildDesk is fully mobile-responsive and also available as a native app for iOS and Android. Download from the App Store or Google Play.',
      category: 'getting-started'
    },
    {
      question: 'How does GPS time tracking work?',
      answer: 'When team members clock in from the mobile app, their GPS location is recorded. You can set up geofences around job sites for automatic verification.',
      category: 'team'
    },
    {
      question: 'Can I integrate with QuickBooks?',
      answer: 'Yes, BuildDesk offers 2-way sync with QuickBooks Online. You can sync invoices, expenses, and financial data automatically.',
      category: 'financial'
    },
    {
      question: 'How do I add a new project?',
      answer: 'Click the "+ New Project" button on your dashboard or go to Projects > Create New. Fill in the project details, budget, and timeline.',
      category: 'projects'
    },
    {
      question: 'What file types can I upload?',
      answer: 'BuildDesk supports all common file types including PDF, DOCX, XLSX, images (JPG, PNG), and CAD files (DWG, DXF).',
      category: 'projects'
    }
  ];

  const filteredArticles = articles.filter(article => {
    const matchesSearch = searchQuery === '' ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === null || article.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-4xl font-bold">How can we help?</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Search our knowledge base or browse by category
        </p>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search for help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Documentation</h3>
                <p className="text-sm text-muted-foreground">Detailed guides and tutorials</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Video className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Video Tutorials</h3>
                <p className="text-sm text-muted-foreground">Watch step-by-step videos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <MessageCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Contact Support</h3>
                <p className="text-sm text-muted-foreground">Get help from our team</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Browse by Category</h2>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedCategory === null ? "default" : "outline"}
            className="cursor-pointer px-4 py-2"
            onClick={() => setSelectedCategory(null)}
          >
            All Topics
          </Badge>
          {categories.map(cat => (
            <Badge
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              className={`cursor-pointer px-4 py-2 flex items-center gap-2 ${
                selectedCategory === cat.id ? '' : cat.color
              }`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.icon}
              {cat.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Help Articles */}
      {filteredArticles.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Help Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredArticles.map(article => (
              <Card key={article.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{article.title}</h3>
                      <p className="text-sm text-muted-foreground">{article.description}</p>
                      <Badge variant="outline" className="mt-2">
                        {categories.find(c => c.id === article.category)?.name}
                      </Badge>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* FAQs */}
      {filteredFAQs.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {filteredFAQs.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <CardTitle className="text-base">{faq.question}</CardTitle>
                      <CardDescription className="mt-2">{faq.answer}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {filteredArticles.length === 0 && filteredFAQs.length === 0 && searchQuery && (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No results found</h3>
            <p className="text-muted-foreground mb-4">
              We couldn't find any help articles matching "{searchQuery}"
            </p>
            <Button>
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Contact Support CTA */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Still need help?</h3>
              <p className="text-muted-foreground">
                Our support team is here to assist you
              </p>
            </div>
            <Button>
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HelpCenter;
