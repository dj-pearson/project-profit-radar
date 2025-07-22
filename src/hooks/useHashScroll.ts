import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useHashScroll = () => {
  const location = useLocation();

  useEffect(() => {
    // Function to scroll to hash
    const scrollToHash = () => {
      const hash = location.hash;
      if (hash) {
        // Remove the # from the hash
        const elementId = hash.substring(1);
        const element = document.getElementById(elementId);
        
        if (element) {
          // Use a small delay to ensure DOM is fully rendered
          setTimeout(() => {
            element.scrollIntoView({ 
              behavior: 'smooth',
              block: 'start'
            });
          }, 100);
        }
      }
    };

    // Scroll immediately if hash exists
    scrollToHash();

    // Also listen for hash changes (for same-page navigation)
    const handleHashChange = () => {
      scrollToHash();
    };

    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [location.hash, location.pathname]);
}; 