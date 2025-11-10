/**
 * Crew Presence Page
 * Real-time crew location dashboard for supervisors and dispatchers
 */

import CrewPresenceDashboard from '@/components/crew/CrewPresenceDashboard';

const CrewPresence = () => {
  return (
    <div className="container mx-auto py-6">
      <CrewPresenceDashboard />
    </div>
  );
};

export default CrewPresence;
