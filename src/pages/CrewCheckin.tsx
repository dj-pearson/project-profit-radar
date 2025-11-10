/**
 * Crew Check-in Page
 * Mobile-friendly GPS check-in for field workers
 */

import MobileCrewCheckin from '@/components/crew/MobileCrewCheckin';

const CrewCheckin = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto">
        <MobileCrewCheckin />
      </div>
    </div>
  );
};

export default CrewCheckin;
