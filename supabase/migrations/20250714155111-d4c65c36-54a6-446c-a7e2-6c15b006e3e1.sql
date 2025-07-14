-- Add more comprehensive knowledge base articles

DO $$
DECLARE
    admin_user_id UUID;
    getting_started_cat_id UUID;
    project_mgmt_cat_id UUID;
    financial_cat_id UUID;
    safety_cat_id UUID;
    mobile_cat_id UUID;
    integrations_cat_id UUID;
    troubleshooting_cat_id UUID;
    best_practices_cat_id UUID;
BEGIN
    -- Get first root admin user
    SELECT id INTO admin_user_id 
    FROM public.user_profiles 
    WHERE role = 'root_admin' 
    LIMIT 1;

    -- Get category IDs
    SELECT id INTO getting_started_cat_id FROM public.knowledge_base_categories WHERE slug = 'getting-started';
    SELECT id INTO project_mgmt_cat_id FROM public.knowledge_base_categories WHERE slug = 'project-management';
    SELECT id INTO financial_cat_id FROM public.knowledge_base_categories WHERE slug = 'financial-management';
    SELECT id INTO safety_cat_id FROM public.knowledge_base_categories WHERE slug = 'safety-compliance';
    SELECT id INTO mobile_cat_id FROM public.knowledge_base_categories WHERE slug = 'mobile-app';
    SELECT id INTO integrations_cat_id FROM public.knowledge_base_categories WHERE slug = 'integrations';
    SELECT id INTO troubleshooting_cat_id FROM public.knowledge_base_categories WHERE slug = 'troubleshooting';
    SELECT id INTO best_practices_cat_id FROM public.knowledge_base_categories WHERE slug = 'best-practices';

    -- Insert additional articles
    INSERT INTO public.knowledge_base_articles (
        title, slug, content, excerpt, article_type, category_id, author_id,
        difficulty_level, estimated_read_time, is_published, is_featured,
        tags, published_at, sort_order
    ) VALUES 
    -- Financial Management Articles
    (
        'Understanding Job Costing in Construction',
        'understanding-job-costing-construction',
        '# Understanding Job Costing in Construction

Job costing is the foundation of profitable construction projects. This guide explains how to implement effective job costing systems.

## What is Job Costing?

Job costing tracks all costs associated with a specific project or job. It includes:
- Direct labor costs
- Material expenses
- Equipment costs
- Subcontractor fees
- Overhead allocation

## Setting Up Cost Codes

### Standard Cost Code Structure
```
01-00-00 - General Conditions
02-00-00 - Site Preparation
03-00-00 - Concrete Work
04-00-00 - Masonry
05-00-00 - Structural Steel
06-00-00 - Carpentry
07-00-00 - Thermal & Moisture Protection
08-00-00 - Doors and Windows
09-00-00 - Finishes
10-00-00 - Specialties
```

### Best Practices for Cost Codes
1. **Keep it simple** - Don''t over-complicate the structure
2. **Be consistent** - Use the same codes across all projects
3. **Train your team** - Ensure everyone understands the system
4. **Regular review** - Update codes as needed

## Tracking Labor Costs

### Time Card Management
- Use mobile time tracking
- Require cost code for each entry
- Include break and travel time
- Capture overtime separately

### Burden Rate Calculation
```
Base Wage: $25.00/hour
+ Payroll Taxes (7.65%): $1.91
+ Workers Comp (varies): $2.50
+ Benefits (varies): $3.00
= Total Burden Rate: $32.41/hour
```

## Material Cost Tracking

### Purchase Orders
- Always use POs for materials
- Assign to specific cost codes
- Track delivery confirmations
- Monitor quantity variances

### Inventory Management
- Track material usage by project
- Monitor waste percentages
- Calculate true material costs
- Include delivery and handling

## Equipment Costing

### Owned Equipment
- Calculate hourly rates including:
  - Depreciation
  - Maintenance costs
  - Fuel and operating costs
  - Insurance and storage

### Rental Equipment
- Track actual rental costs
- Include delivery/pickup fees
- Monitor utilization rates
- Compare rent vs. buy decisions

## Subcontractor Management

### Cost Tracking
- Original contract amounts
- Change orders and additions
- Payment schedules
- Retention amounts

### Performance Metrics
- Cost per unit comparisons
- Quality ratings
- Schedule adherence
- Safety performance

## Overhead Allocation

### Direct vs. Indirect Costs
**Direct Costs:**
- Can be traced to specific project
- Labor, materials, equipment on that job

**Indirect Costs:**
- Support the overall business
- Office rent, utilities, admin staff
- Need to be allocated to projects

### Allocation Methods
1. **Percentage of Direct Costs** - Simple but may not be accurate
2. **Labor Hour Based** - Good for labor-intensive projects
3. **Activity-Based Costing** - Most accurate but complex

## Reporting and Analysis

### Weekly Cost Reports
- Costs incurred this week
- Total costs to date
- Budget vs. actual analysis
- Projected final costs
- Profit margin analysis

### Key Performance Indicators
- Cost per square foot
- Labor productivity rates
- Material waste percentages
- Equipment utilization
- Overhead recovery rates

## Common Job Costing Mistakes

1. **Delayed cost entry** - Enter costs daily, not weekly
2. **Incorrect cost codes** - Train team on proper coding
3. **Missing costs** - Track all project-related expenses
4. **Inadequate overhead allocation** - Ensure full cost recovery
5. **Poor change order tracking** - Separate original vs. change costs

## Technology Solutions

### Integration Benefits
- QuickBooks sync for accounting
- Mobile apps for real-time entry
- Automated calculations
- Real-time reporting
- Historical data analysis

### Implementation Tips
- Start with pilot project
- Train key personnel first
- Run parallel systems initially
- Refine processes based on feedback
- Scale gradually across all projects

## ROI of Good Job Costing

Companies with effective job costing see:
- 15-25% improvement in project margins
- 50% reduction in cost overruns
- Better bid accuracy on future projects
- Improved cash flow management
- Data-driven decision making

## Getting Started

1. **Week 1:** Set up cost code structure
2. **Week 2:** Train team on time tracking
3. **Week 3:** Implement material tracking
4. **Week 4:** Start weekly reporting
5. **Month 2:** Analyze first month data
6. **Month 3:** Refine processes and expand

Remember: Job costing is not just about tracking costs - it''s about managing profitability and making informed decisions for future projects.',
        'Master the fundamentals of construction job costing, from setting up cost codes to tracking labor, materials, and overhead for maximum profitability.',
        'article',
        financial_cat_id,
        admin_user_id,
        'intermediate',
        18,
        true,
        true,
        ARRAY['job-costing', 'financial-management', 'cost-codes', 'profitability'],
        now(),
        1
    ),
    -- Safety & Compliance
    (
        'OSHA Safety Compliance: Essential Checklist for Construction Sites',
        'osha-safety-compliance-checklist',
        '# OSHA Safety Compliance: Essential Checklist for Construction Sites

Maintaining OSHA compliance protects your workers and your business. Use this comprehensive checklist to ensure your construction sites meet all safety requirements.

## Daily Safety Checklist

### Personal Protective Equipment (PPE)
- [ ] Hard hats worn at all times
- [ ] Safety glasses or face shields
- [ ] High-visibility clothing when required
- [ ] Steel-toed boots
- [ ] Fall protection when working above 6 feet
- [ ] Hearing protection in high-noise areas

### Site Conditions
- [ ] Clear walkways and exits
- [ ] Proper lighting in work areas
- [ ] Secure storage of materials
- [ ] Hazardous materials properly labeled
- [ ] Fire extinguishers accessible
- [ ] First aid kits available and stocked

## Fall Protection Requirements

### When Fall Protection is Required
- Working 6 feet or more above lower level
- Working on scaffolds
- Working near unprotected sides/edges
- Working on roofs
- Working in excavations

### Fall Protection Systems
1. **Guardrail Systems**
   - Top rail height: 42 inches (±3 inches)
   - Mid rail at 21 inches
   - Posts spaced no more than 8 feet apart

2. **Personal Fall Arrest Systems**
   - Full body harness
   - Shock-absorbing lanyard
   - Secure anchor point (5,000 lbs minimum)

3. **Safety Nets**
   - Install when other methods not feasible
   - Maximum 30 feet below work surface
   - Minimum 8 feet from wall

## Excavation Safety

### Before Digging
- [ ] Call 811 (Dig Safe) 48-72 hours prior
- [ ] Obtain excavation permits
- [ ] Review utility locations
- [ ] Plan protective systems

### Daily Excavation Inspection
- [ ] Check for signs of cave-in
- [ ] Inspect protective systems
- [ ] Test air quality in deep excavations
- [ ] Ensure safe entry/exit points
- [ ] Keep spoil piles 2+ feet from edge

### Protective Systems Required for:
- Excavations 5 feet or deeper
- Any excavation with cave-in potential
- Excavations with water accumulation

## Electrical Safety

### Overhead Power Lines
- Maintain 10-foot clearance for lines up to 50kV
- Use a spotter when operating equipment near lines
- Assume all lines are energized
- Contact utility company for line de-energization

### Temporary Electrical
- [ ] GFCI protection for all 120V outlets
- [ ] Proper grounding of equipment
- [ ] Regular inspection of cords and equipment
- [ ] Avoid daisy-chaining extension cords
- [ ] Use appropriate cord ratings for load

## Scaffolding Requirements

### Scaffold Inspection
- [ ] Daily inspection before use
- [ ] Inspect after weather events
- [ ] Check platform planking
- [ ] Verify guardrail systems
- [ ] Ensure proper access

### Scaffold Components
- Platforms fully planked
- Guardrails on all open sides
- Proper footing and base plates
- Cross bracing installed
- Fall protection for workers

## Equipment and Machinery Safety

### Heavy Equipment
- [ ] Daily pre-use inspections
- [ ] Operator certification current
- [ ] Backup alarms functional
- [ ] Proper maintenance records
- [ ] Equipment isolation procedures

### Hand and Power Tools
- [ ] Tools in good working condition
- [ ] Proper guards in place
- [ ] Correct tool for the job
- [ ] PPE appropriate for tool use
- [ ] Training documentation current

## Hazard Communication

### Chemical Safety
- [ ] Safety Data Sheets (SDS) available
- [ ] Chemicals properly labeled
- [ ] Worker training documented
- [ ] Appropriate PPE provided
- [ ] Spill cleanup materials available

### Training Requirements
- Hazard communication training
- PPE training for specific equipment
- Tool-specific safety training
- Emergency response procedures
- Site-specific hazard awareness

## Record Keeping Requirements

### Required Documentation
- [ ] OSHA 300 injury/illness log
- [ ] Training records for all workers
- [ ] Equipment inspection records
- [ ] Incident investigation reports
- [ ] Safety meeting minutes

### Retention Periods
- Injury/illness records: 5 years
- Training records: Duration of employment + 1 year
- Equipment inspections: 3 years
- Environmental monitoring: 30 years

## Emergency Procedures

### Emergency Action Plan
- [ ] Evacuation procedures posted
- [ ] Emergency contact numbers available
- [ ] First aid trained personnel on site
- [ ] Communication system established
- [ ] Regular emergency drills conducted

### Incident Response
1. **Immediate Response**
   - Secure the scene
   - Provide first aid
   - Call emergency services if needed
   - Notify management

2. **Investigation**
   - Document the scene
   - Interview witnesses
   - Identify root causes
   - Implement corrective actions

## Frequent OSHA Violations in Construction

1. **Fall Protection** - #1 most cited violation
2. **Hazard Communication** - Chemical safety failures
3. **Scaffolding** - Improper construction/use
4. **Respiratory Protection** - Inadequate programs
5. **Ladders** - Improper use and positioning

## Monthly Safety Program Review

### Program Elements to Review
- [ ] Incident rates and trends
- [ ] Training completion status
- [ ] Equipment inspection compliance
- [ ] Corrective action status
- [ ] Employee feedback and suggestions

### Continuous Improvement
- Analyze near-miss reports
- Update procedures based on incidents
- Incorporate new regulations
- Enhance training programs
- Recognize safety achievements

## Getting Help with Compliance

### Resources Available
- OSHA Consultation Services (free for small businesses)
- Industry association safety programs
- Safety training organizations
- Insurance company resources
- Professional safety consultants

### Building a Safety Culture
- Management commitment visible
- Worker participation encouraged
- Regular safety communications
- Recognition programs
- Continuous training and education

Remember: Safety compliance is not just about avoiding citations - it''s about protecting your most valuable asset: your workers.',
        'Comprehensive OSHA safety compliance checklist covering daily requirements, fall protection, excavation safety, electrical safety, and record keeping for construction sites.',
        'checklist',
        safety_cat_id,
        admin_user_id,
        'beginner',
        15,
        true,
        false,
        ARRAY['osha', 'safety', 'compliance', 'construction-safety', 'checklist'],
        now(),
        1
    ),
    -- Mobile App Guide
    (
        'Mobile App Field Guide: Maximizing Productivity On-Site',
        'mobile-app-field-guide',
        '# Mobile App Field Guide: Maximizing Productivity On-Site

The Build Desk mobile app puts powerful construction management tools in your pocket. This guide shows field teams how to use every feature effectively.

## Getting Started

### Download and Setup
1. **Download the App**
   - iOS: Search "Build Desk" in App Store
   - Android: Search "Build Desk" in Google Play

2. **Login Process**
   - Use your web portal credentials
   - Enable biometric login for quick access
   - Allow location permissions for GPS features

3. **Initial Configuration**
   - Download project data for offline use
   - Set photo quality preferences
   - Configure notification settings

## Daily Time Tracking

### Clocking In/Out
- **GPS Verification**: Ensures workers are on-site
- **Project Selection**: Choose active project from list
- **Cost Code Assignment**: Required for accurate job costing
- **Break Tracking**: Separate paid vs. unpaid breaks

### Time Entry Best Practices
```
Start of Day Checklist:
□ Clock in upon arrival
□ Select correct project
□ Choose appropriate cost code
□ Take arrival photo if required

End of Day Checklist:
□ Complete all time entries
□ Submit daily report
□ Upload required photos
□ Clock out before leaving
```

## Daily Reports

### Required Information
- **Work Performed**: Detailed description of tasks completed
- **Crew Count**: Number of workers by trade
- **Weather Conditions**: Temperature, precipitation, wind
- **Materials Delivered**: Deliveries received on-site
- **Equipment Used**: Equipment operating on project
- **Safety Incidents**: Any accidents or near misses
- **Delays/Issues**: Problems affecting progress

### Photo Documentation
- **Progress Photos**: Show work completed
- **Quality Issues**: Document defects or problems
- **Safety Violations**: Capture unsafe conditions
- **Material Deliveries**: Verify quantities and condition
- **Weather Conditions**: Document weather-related delays

### Writing Effective Reports
**Good Example:**
"Framed 12 interior walls in second floor west wing. Completed electrical rough-in for units 201-204. Plumbing rough-in delayed due to late delivery of PVC fittings. Crew of 6 framers, 2 electricians. Clear weather, 72°F."

**Poor Example:**
"Worked on framing. Some electrical. Materials late."

## Photo Management

### Photo Requirements
- **Minimum Resolution**: Use high-quality setting
- **Clear Visibility**: Ensure good lighting
- **Context**: Include surrounding area for reference
- **Safety**: No workers in dangerous positions

### Organization Tips
- Use descriptive filenames
- Tag photos with location/room
- Take before/during/after shots
- Include date stamps
- Upload daily to avoid storage issues

## Offline Functionality

### What Works Offline
- Time tracking and entry
- Daily report creation
- Photo capture and storage
- Project document viewing
- Task list management

### Sync Process
- **Automatic Sync**: When internet available
- **Manual Sync**: Force sync when needed
- **Conflict Resolution**: System handles data conflicts
- **Bandwidth Management**: Optimized for cellular data

### Offline Best Practices
- Download project data nightly
- Keep device charged throughout day
- Sync at end of each day
- Check for app updates weekly

## Material Management

### Delivery Tracking
- **Scan Delivery Tickets**: Use camera to capture
- **Verify Quantities**: Count and confirm amounts
- **Note Condition**: Document any damage
- **Assign to Cost Codes**: Proper expense tracking

### Inventory Updates
- Real-time quantity adjustments
- Waste tracking and reporting
- Transfer between projects
- Return to supplier documentation

## Safety Features

### Safety Reporting
- **Incident Reports**: Immediate documentation
- **Near Miss Reporting**: Proactive safety tracking
- **Hazard Identification**: Photo and describe risks
- **Safety Meeting Attendance**: Digital sign-in

### Emergency Features
- **Emergency Contacts**: Quick access to key numbers
- **Location Sharing**: GPS coordinates for emergencies
- **Incident Photos**: Document scenes safely
- **Immediate Notifications**: Alert management instantly

## Communication Tools

### Team Messaging
- **Project Channels**: Organized by project
- **Direct Messages**: One-on-one communication
- **File Sharing**: Send photos and documents
- **Message History**: Searchable conversation archive

### Status Updates
- **Progress Notifications**: Automated project updates
- **Schedule Changes**: Real-time schedule modifications
- **Material Needs**: Request materials and supplies
- **Issue Escalation**: Notify supervisors of problems

## Document Access

### Mobile Document Viewing
- **Plans and Drawings**: Zoom and navigate blueprints
- **Specifications**: Search and highlight text
- **Photos**: Browse project photo gallery
- **Reports**: Access all project reports

### Document Organization
```
Project Structure:
├── Plans
│   ├── Architectural
│   ├── Structural
│   └── MEP
├── Specifications
├── Photos
│   ├── Progress
│   ├── Issues
│   └── Safety
└── Reports
    ├── Daily
    ├── Weekly
    └── Inspections
```

## Quality Control

### Inspection Checklists
- **Pre-built Templates**: Standard quality checks
- **Custom Checklists**: Project-specific requirements
- **Photo Evidence**: Document compliance or issues
- **Pass/Fail Tracking**: Clear quality metrics

### Punch List Management
- **Create Items**: Add punch list items with photos
- **Assign Responsibility**: Route to appropriate trade
- **Track Progress**: Monitor completion status
- **Verify Completion**: Final inspection and sign-off

## Troubleshooting Common Issues

### App Performance
**Problem**: App running slowly
**Solutions**:
- Close other apps
- Restart device
- Clear app cache
- Update to latest version

### Sync Issues
**Problem**: Data not syncing
**Solutions**:
- Check internet connection
- Force manual sync
- Restart app
- Contact IT support

### Photo Problems
**Problem**: Photos not uploading
**Solutions**:
- Check available storage
- Reduce photo quality setting
- Use Wi-Fi for large uploads
- Upload in smaller batches

## Advanced Features

### GPS Tracking
- **Geofencing**: Automatic clock in/out
- **Location History**: Track time spent at different areas
- **Mileage Tracking**: Vehicle usage for reimbursement
- **Asset Location**: Track equipment and tool locations

### Barcode Scanning
- **Material Receiving**: Scan delivery tickets
- **Equipment Tracking**: Check in/out tools
- **Inventory Management**: Quick item identification
- **Purchase Orders**: Match deliveries to POs

## Training Your Team

### Onboarding Process
1. **Initial Setup**: Help with app installation
2. **Basic Training**: Core features demonstration
3. **Hands-on Practice**: Supervised use for first week
4. **Ongoing Support**: Regular check-ins and tips
5. **Advanced Features**: Gradual introduction of complex tools

### Best Practices for Adoption
- Start with essential features only
- Provide quick reference cards
- Designate "super users" for peer support
- Regular team meetings to share tips
- Celebrate successful adoption milestones

The mobile app is your most powerful tool for staying connected and productive in the field. Take time to master these features, and you''ll see immediate improvements in efficiency and communication.',
        'Complete guide to using the Build Desk mobile app effectively in the field, covering time tracking, daily reports, photo management, and offline functionality.',
        'how_to',
        mobile_cat_id,
        admin_user_id,
        'beginner',
        20,
        true,
        false,
        ARRAY['mobile-app', 'field-management', 'time-tracking', 'productivity'],
        now(),
        1
    );

END $$;