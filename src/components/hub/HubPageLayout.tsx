import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { NavigationItem, NavigationSection } from "@/components/navigation/HierarchicalNavigationConfig";

interface HubPageLayoutProps {
  title: string;
  description: string;
  sections: NavigationSection[];
  icon?: LucideIcon;
}

export const HubPageLayout: React.FC<HubPageLayoutProps> = ({
  title,
  description,
  sections,
  icon: Icon,
}) => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { canAccessRoute } = usePermissions();

  const handleNavigate = (url: string) => {
    navigate(url);
  };

  // Filter sections and items based on user role and permissions
  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // Root admin items should only be visible to root_admin
        if (item.roles.length === 1 && item.roles[0] === "root_admin") {
          return userProfile?.role === "root_admin";
        }
        // Check if user has permission
        return (
          userProfile?.role === "root_admin" ||
          item.roles.includes(userProfile?.role || "") ||
          canAccessRoute(item.url)
        );
      }),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="space-y-6">
      {/* Hub Header */}
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="hidden sm:flex items-center justify-center w-16 h-16 rounded-lg bg-primary/10 flex-shrink-0">
            <Icon className="w-8 h-8 text-primary" />
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-2">{description}</p>
        </div>
      </div>

      {/* Hub Sections */}
      {visibleSections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No Access</p>
            <p className="text-sm text-muted-foreground">
              You don't have permission to access any features in this hub.
            </p>
          </CardContent>
        </Card>
      ) : (
        visibleSections.map((section) => (
          <div key={section.id} className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{section.label}</h2>
              <p className="text-sm text-muted-foreground">
                {section.items.length} {section.items.length === 1 ? "feature" : "features"} available
              </p>
            </div>

            {/* Navigation Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.items.map((item) => {
                const ItemIcon = item.icon;
                const hasAccess = item.hasAccess !== false;

                return (
                  <Card
                    key={item.url}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      !hasAccess && "opacity-60 cursor-not-allowed"
                    )}
                    onClick={() => hasAccess && handleNavigate(item.url)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                            <ItemIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{item.title}</CardTitle>
                            {item.description && (
                              <CardDescription className="mt-1 text-xs">
                                {item.description}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        {item.badge && (
                          <Badge variant="destructive" className="text-xs">
                            {item.badge}
                          </Badge>
                        )}
                        {!hasAccess && <Lock className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
