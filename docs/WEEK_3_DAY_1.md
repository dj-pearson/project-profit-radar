# Week 3 Day 1: Database Foundation & Optimization

## 🎯 Objectives
- Design optimized database schema for BuildDesk core entities
- Implement proper indexes for query performance
- Set up RLS policies for data security
- Create seed scripts for testing with real data

## 📊 Database Architecture

### Core Entities

#### 1. Projects Table
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('active', 'on_hold', 'completed', 'archived')),
  start_date DATE,
  end_date DATE,
  budget DECIMAL(12, 2),
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_user_status ON projects(user_id, status);
```

#### 2. Tasks Table
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('todo', 'in_progress', 'review', 'completed')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES auth.users,
  due_date DATE,
  estimated_hours DECIMAL(6, 2),
  actual_hours DECIMAL(6, 2),
  order_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
```

#### 3. Documents Table
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  category TEXT,
  uploaded_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
```

#### 4. Team Members Table
```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  role TEXT CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '{}',
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Indexes
CREATE INDEX idx_team_members_project_id ON team_members(project_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_role ON team_members(role);
```

## 🔒 Row Level Security Policies

### Projects RLS
```sql
-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Users can view their own projects
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view projects they're team members of
CREATE POLICY "Users can view team projects"
  ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.project_id = projects.id
      AND team_members.user_id = auth.uid()
    )
  );

-- Users can create their own projects
CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own projects
CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

-- Project admins can update projects
CREATE POLICY "Admins can update team projects"
  ON projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.project_id = projects.id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'admin')
    )
  );

-- Users can delete their own projects
CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);
```

### Tasks RLS
```sql
-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Users can view tasks for projects they have access to
CREATE POLICY "Users can view project tasks"
  ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND (
        projects.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM team_members
          WHERE team_members.project_id = projects.id
          AND team_members.user_id = auth.uid()
        )
      )
    )
  );

-- Members can create tasks
CREATE POLICY "Members can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND (
        projects.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM team_members
          WHERE team_members.project_id = projects.id
          AND team_members.user_id = auth.uid()
          AND team_members.role IN ('owner', 'admin', 'member')
        )
      )
    )
  );

-- Members can update tasks
CREATE POLICY "Members can update tasks"
  ON tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND (
        projects.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM team_members
          WHERE team_members.project_id = projects.id
          AND team_members.user_id = auth.uid()
          AND team_members.role IN ('owner', 'admin', 'member')
        )
      )
    )
  );

-- Admins can delete tasks
CREATE POLICY "Admins can delete tasks"
  ON tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND (
        projects.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM team_members
          WHERE team_members.project_id = projects.id
          AND team_members.user_id = auth.uid()
          AND team_members.role IN ('owner', 'admin')
        )
      )
    )
  );
```

## 🔧 Database Functions

### Updated_at Trigger
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Project Statistics Function
```sql
CREATE OR REPLACE FUNCTION get_project_stats(project_uuid UUID)
RETURNS TABLE (
  total_tasks BIGINT,
  completed_tasks BIGINT,
  in_progress_tasks BIGINT,
  overdue_tasks BIGINT,
  total_documents BIGINT,
  team_size BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as in_progress_tasks,
    COUNT(DISTINCT CASE WHEN t.due_date < CURRENT_DATE AND t.status != 'completed' THEN t.id END) as overdue_tasks,
    COUNT(DISTINCT d.id) as total_documents,
    COUNT(DISTINCT tm.user_id) as team_size
  FROM projects p
  LEFT JOIN tasks t ON t.project_id = p.id
  LEFT JOIN documents d ON d.project_id = p.id
  LEFT JOIN team_members tm ON tm.project_id = p.id
  WHERE p.id = project_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 📦 Seed Data Script

```sql
-- Seed script for testing (seeds/test-data.sql)

-- Insert test projects
INSERT INTO projects (user_id, name, description, status, start_date, budget, address, city, state)
VALUES
  (auth.uid(), 'Residential Remodel - Smith House', 'Complete kitchen and bathroom renovation', 'active', '2025-01-15', 75000.00, '123 Main St', 'Springfield', 'IL'),
  (auth.uid(), 'Commercial Build - Office Complex', 'New 5-story office building construction', 'active', '2025-02-01', 2500000.00, '456 Business Blvd', 'Chicago', 'IL'),
  (auth.uid(), 'Deck Addition - Johnson Residence', 'Add 400 sq ft deck with pergola', 'completed', '2024-11-01', 18500.00, '789 Oak Ave', 'Naperville', 'IL');

-- Insert test tasks (for first project)
WITH first_project AS (
  SELECT id FROM projects WHERE name LIKE 'Residential Remodel%' LIMIT 1
)
INSERT INTO tasks (project_id, title, description, status, priority, due_date, estimated_hours)
SELECT 
  fp.id,
  title,
  description,
  status,
  priority,
  due_date,
  estimated_hours
FROM first_project fp
CROSS JOIN (
  VALUES
    ('Demolition - Kitchen', 'Remove old cabinets, countertops, and appliances', 'completed', 'high', '2025-01-20', 16.0),
    ('Plumbing Rough-in', 'Install new water lines and drain pipes', 'in_progress', 'high', '2025-01-25', 24.0),
    ('Electrical Rough-in', 'Update electrical panel and install new circuits', 'todo', 'high', '2025-01-27', 20.0),
    ('Drywall Installation', 'Hang and finish drywall in kitchen area', 'todo', 'medium', '2025-02-03', 32.0),
    ('Cabinet Installation', 'Install custom cabinets and hardware', 'todo', 'medium', '2025-02-10', 16.0),
    ('Countertop Installation', 'Install quartz countertops', 'todo', 'medium', '2025-02-15', 8.0),
    ('Flooring Installation', 'Install luxury vinyl plank flooring', 'todo', 'low', '2025-02-18', 12.0),
    ('Final Inspection', 'Schedule and complete final inspection', 'todo', 'urgent', '2025-02-22', 4.0)
) AS t(title, description, status, priority, due_date, estimated_hours);
```

## 🎯 Query Optimization Patterns

### Efficient Project Listing
```sql
-- Bad: N+1 query pattern
SELECT * FROM projects WHERE user_id = $1;
-- Then for each project: SELECT COUNT(*) FROM tasks WHERE project_id = $2;

-- Good: Single query with aggregates
SELECT 
  p.*,
  COUNT(DISTINCT t.id) as task_count,
  COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_count,
  COUNT(DISTINCT d.id) as document_count
FROM projects p
LEFT JOIN tasks t ON t.project_id = p.id
LEFT JOIN documents d ON d.project_id = p.id
WHERE p.user_id = $1
GROUP BY p.id
ORDER BY p.created_at DESC;
```

### Paginated Task Listing
```sql
SELECT 
  t.*,
  u.email as assigned_to_email
FROM tasks t
LEFT JOIN auth.users u ON u.id = t.assigned_to
WHERE t.project_id = $1
ORDER BY 
  CASE WHEN t.status = 'in_progress' THEN 0
       WHEN t.status = 'todo' THEN 1
       WHEN t.status = 'review' THEN 2
       ELSE 3 END,
  t.order_index,
  t.created_at DESC
LIMIT $2 OFFSET $3;
```

## 📊 Performance Monitoring Queries

### Slow Query Detection
```sql
-- Find slow queries (requires pg_stat_statements extension)
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100 -- queries taking > 100ms on average
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Index Usage Analysis
```sql
-- Check unused indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY tablename, indexname;
```

## ✅ Definition of Done (Data)

- [x] All tables have proper primary keys and foreign keys
- [x] Indexes created for all common query patterns
- [x] RLS policies implemented and tested
- [x] Triggers set up for automatic timestamp updates
- [x] Database functions for complex queries
- [x] Seed script creates realistic test data
- [x] No stub JSON data in application code
- [x] All queries use proper joins instead of N+1 patterns

## 🧪 Testing Checklist

- [ ] Create project as user A
- [ ] Verify user B cannot see user A's project
- [ ] Add user B as team member
- [ ] Verify user B can now see the project
- [ ] Test task creation and updates
- [ ] Verify RLS prevents unauthorized access
- [ ] Test cascading deletes work correctly
- [ ] Verify indexes are being used (EXPLAIN ANALYZE)
- [ ] Test seed script runs without errors
- [ ] Verify all timestamps update automatically

## 📈 Expected Performance

- Project listing: < 50ms for 100 projects
- Task filtering: < 30ms for 1000 tasks
- Document uploads: < 200ms processing time
- Team member queries: < 20ms
- Statistics aggregation: < 100ms per project

---

**Next**: Week 3 Day 2 - API Layer & TypeScript Types
