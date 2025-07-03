import { supabase } from '@/integrations/supabase/client';

export const createRootAdmin = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('create-root-admin', {
      method: 'POST'
    });
    
    if (error) {
      console.error('Error creating root admin:', error);
      return { success: false, error };
    }
    
    console.log('Root admin created successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error };
  }
};

// Auto-invoke the function
createRootAdmin().then(result => {
  console.log('Create admin result:', result);
});