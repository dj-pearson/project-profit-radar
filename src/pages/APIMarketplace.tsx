import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ThirdPartyMarketplace from '@/components/integrations/ThirdPartyMarketplace';
import { ArrowLeft } from 'lucide-react';

const APIMarketplace = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-optimized header */}
      <div className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="flex-shrink-0 h-9 px-2 sm:px-3"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">Back</span>
                <span className="hidden sm:inline text-xs sm:text-sm"> to Dashboard</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-optimized main content */}
      <div className="max-w-7xl mx-auto py-3 sm:py-6 px-3 sm:px-4 lg:px-8">
        <ThirdPartyMarketplace />
      </div>
    </div>
  );
};

export default APIMarketplace;