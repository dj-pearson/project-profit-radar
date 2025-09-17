import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Users, 
  FolderPlus, 
  UserPlus,
  ArrowRight,
  Sparkles
} from "lucide-react";

interface EmptyDashboardProps {
  userRole: string;
  onAction: (action: string) => void;
}

export const EmptyDashboard = ({ userRole, onAction }: EmptyDashboardProps) => {
  const getWelcomeContent = () => {
    switch (userRole) {
      case 'root_admin':
        return {
          title: "Welcome to BuildDesk Platform",
          subtitle: "Set up your construction management platform",
          actions: [
            {
              key: 'setup_companies',
              title: 'Add Companies',
              description: 'Set up construction companies on the platform',
              icon: Building2,
              primary: true
            },
            {
              key: 'platform_settings',
              title: 'Platform Settings',
              description: 'Configure system-wide settings and preferences',
              icon: Sparkles,
              primary: false
            }
          ]
        };
      
      case 'admin':
        return {
          title: "Welcome to Your Construction Hub",
          subtitle: "Let's get your company set up for success",
          actions: [
            {
              key: 'create_project',
              title: 'Create Your First Project',
              description: 'Start managing construction projects efficiently',
              icon: FolderPlus,
              primary: true
            },
            {
              key: 'invite_team',
              title: 'Invite Team Members',
              description: 'Add project managers, supervisors, and field workers',
              icon: UserPlus,
              primary: true
            }
          ]
        };
        
      case 'project_manager':
        return {
          title: "Ready to Manage Projects?",
          subtitle: "Your project management dashboard is ready",
          actions: [
            {
              key: 'create_project',
              title: 'Start a New Project',
              description: 'Create and set up your construction project',
              icon: FolderPlus,
              primary: true
            },
            {
              key: 'team_setup',
              title: 'Set Up Project Team',
              description: 'Assign roles and responsibilities',
              icon: Users,
              primary: false
            }
          ]
        };
        
      case 'field_supervisor':
        return {
          title: "Field Operations Center",
          subtitle: "Manage your crew and daily operations",
          actions: [
            {
              key: 'daily_report',
              title: 'Submit Daily Report',
              description: 'Log today\'s progress and activities',
              icon: FolderPlus,
              primary: true
            },
            {
              key: 'crew_check_in',
              title: 'Crew Check-in',
              description: 'Mark attendance and assign tasks',
              icon: Users,
              primary: false
            }
          ]
        };
        
      default:
        return {
          title: "Welcome to BuildDesk",
          subtitle: "Your construction management platform",
          actions: [
            {
              key: 'explore',
              title: 'Explore Features',
              description: 'Discover what you can do with BuildDesk',
              icon: Sparkles,
              primary: true
            }
          ]
        };
    }
  };

  const content = getWelcomeContent();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">{content.title}</h1>
            <p className="text-muted-foreground text-lg">{content.subtitle}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Getting Started Section */}
          <div className="text-center mb-12">
            <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {userRole === 'root_admin' 
                ? "Configure the platform and help construction companies succeed with their projects."
                : "Follow these steps to set up your construction management workflow and start tracking projects effectively."
              }
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {content.actions.map((action, index) => (
              <Card 
                key={action.key} 
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  action.primary ? 'ring-2 ring-primary/20 border-primary/30' : ''
                }`}
                onClick={() => onAction(action.key)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${
                        action.primary ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        <action.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{action.title}</CardTitle>
                        {action.primary && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full mt-1">
                            Recommended
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{action.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Feature Highlights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                What You Can Do With BuildDesk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold mb-2">Project Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Track progress, manage timelines, and coordinate teams across multiple construction projects.
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold mb-2">Team Coordination</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage crews, assign tasks, and track attendance with mobile-first tools.
                  </p>
                </div>
                
                <div className="text-center sm:col-span-2 lg:col-span-1">
                  <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <FolderPlus className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold mb-2">Real-time Updates</h3>
                  <p className="text-sm text-muted-foreground">
                    Get instant notifications about project changes, safety issues, and budget alerts.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};