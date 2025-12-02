-- Add missing foreign key relationship between documents and user_profiles
ALTER TABLE public.documents 
ADD CONSTRAINT documents_uploaded_by_fkey 
FOREIGN KEY (uploaded_by) REFERENCES public.user_profiles(id);