import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useHashScroll = () => {
  const location = useLocation();

  useEffect(() => {
    // Function to scroll to hash
    const scrollToHash = () => {
      const hash = location.hash;
      console.log('useHashScroll: Current hash:', hash);
      console.log('useHashScroll: Current pathname:', location.pathname);
      
      if (hash) {
        // Remove the # from the hash
        const elementId = hash.substring(1);
        console.log('useHashScroll: Looking for element with ID:', elementId);
        
        // Use a small delay to ensure DOM is fully rendered
        setTimeout(() => {
          const element = document.getElementById(elementId);
          console.log('useHashScroll: Element found:', element);
          
          if (element) {
            console.log('useHashScroll: Scrolling to element:', element);
            element.scrollIntoView({ 
              behavior: 'smooth',
              block: 'start'
            });
          }
        }, 100);
      }
    };

    // Scroll immediately if hash exists
    scrollToHash();

    // Also listen for hash changes (for same-page navigation)
    const handleHashChange = () => {
      console.log('useHashScroll: Hash change detected');
      scrollToHash();
    };

    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [location.hash, location.pathname]);
}; 