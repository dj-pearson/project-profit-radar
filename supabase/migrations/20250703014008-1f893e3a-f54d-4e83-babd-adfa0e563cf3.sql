-- Create storage buckets for document management
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('project-documents', 'project-documents', true),
  ('company-documents', 'company-documents', true);

-- Create storage policies for project documents
CREATE POLICY "Users can view company project documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'project-documents' AND 
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id::text = (storage.foldername(name))[1] 
    AND (p.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
  )
);

CREATE POLICY "Authorized users can upload project documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'project-documents' AND 
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id::text = (storage.foldername(name))[1] 
    AND p.company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
  )
);

CREATE POLICY "Authorized users can update project documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'project-documents' AND 
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id::text = (storage.foldername(name))[1] 
    AND p.company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
  )
);

CREATE POLICY "Authorized users can delete project documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'project-documents' AND 
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id::text = (storage.foldername(name))[1] 
    AND p.company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
  )
);

-- Create storage policies for company documents
CREATE POLICY "Users can view company documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'company-documents' AND 
  (storage.foldername(name))[1] = get_user_company(auth.uid())::text
);

CREATE POLICY "Authorized users can upload company documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'company-documents' AND 
  (storage.foldername(name))[1] = get_user_company(auth.uid())::text AND
  get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
);

CREATE POLICY "Authorized users can update company documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'company-documents' AND 
  (storage.foldername(name))[1] = get_user_company(auth.uid())::text AND
  get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
);

CREATE POLICY "Authorized users can delete company documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'company-documents' AND 
  (storage.foldername(name))[1] = get_user_company(auth.uid())::text AND
  get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
);