import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProjectContactsProps {
  projectId: string;
}

export const ProjectContacts: React.FC<ProjectContactsProps> = ({ projectId }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Contacts</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Contact management functionality will be available soon.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Project ID: {projectId}
        </p>
      </CardContent>
    </Card>
  );
};

export default ProjectContacts;