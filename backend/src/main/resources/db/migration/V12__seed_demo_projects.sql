-- Seed demo projects with phases and milestones for the demo tenant

DO $$
DECLARE
    v_tenant UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    v_proj1  UUID := uuid_generate_v4();
    v_proj2  UUID := uuid_generate_v4();
    v_ph1    UUID := uuid_generate_v4();
    v_ph2    UUID := uuid_generate_v4();
    v_ph3    UUID := uuid_generate_v4();
    v_ph4    UUID := uuid_generate_v4();
    v_ph5    UUID := uuid_generate_v4();
BEGIN

-- Project 1: Residential villa
INSERT INTO projects (id, tenant_id, name, type, location, site_address, start_date, target_end_date, value, status)
VALUES (v_proj1, v_tenant, 'Sharma Residence', 'Residential', 'Bangalore',
        '42, 3rd Cross, Indiranagar, Bangalore 560038',
        '2026-01-15', '2026-12-31', 8500000, 'active');

-- Phase 1: Concept Design
INSERT INTO project_phases (id, tenant_id, project_id, name, display_order, start_date, end_date)
VALUES (v_ph1, v_tenant, v_proj1, 'Concept Design', 1, '2026-01-15', '2026-03-15');

INSERT INTO milestones (tenant_id, phase_id, name, target_date, status, deliverables)
VALUES
    (v_tenant, v_ph1, 'Client brief finalized', '2026-01-25', 'completed', 'Design brief document signed off'),
    (v_tenant, v_ph1, 'Concept sketches presented', '2026-02-10', 'completed', 'Mood boards, concept sketches, space planning options'),
    (v_tenant, v_ph1, 'Concept approval', '2026-03-01', 'completed', 'Client sign-off on final concept direction');

-- Phase 2: Schematic Design
INSERT INTO project_phases (id, tenant_id, project_id, name, display_order, start_date, end_date)
VALUES (v_ph2, v_tenant, v_proj1, 'Schematic Design', 2, '2026-03-16', '2026-05-15');

INSERT INTO milestones (tenant_id, phase_id, name, target_date, status, deliverables)
VALUES
    (v_tenant, v_ph2, 'Floor plans finalized', '2026-04-01', 'in_progress', 'Detailed floor plans for all levels'),
    (v_tenant, v_ph2, 'Elevation design', '2026-04-20', 'pending', 'Front, rear, and side elevations'),
    (v_tenant, v_ph2, 'Structural coordination', '2026-05-10', 'pending', 'Structural engineer review and sign-off');

-- Phase 3: Construction Documentation
INSERT INTO project_phases (id, tenant_id, project_id, name, display_order, start_date, end_date)
VALUES (v_ph3, v_tenant, v_proj1, 'Construction Documentation', 3, '2026-05-16', '2026-08-31');

INSERT INTO milestones (tenant_id, phase_id, name, target_date, status, deliverables)
VALUES
    (v_tenant, v_ph3, 'Working drawings complete', '2026-07-15', 'pending', 'Full set of construction drawings'),
    (v_tenant, v_ph3, 'BOQ prepared', '2026-08-01', 'pending', 'Bill of quantities for tendering'),
    (v_tenant, v_ph3, 'Municipal approval', '2026-08-31', 'pending', 'Building permit and approvals');

-- Project 2: Commercial office
INSERT INTO projects (id, tenant_id, name, type, location, site_address, start_date, target_end_date, value, status)
VALUES (v_proj2, v_tenant, 'TechPark Office Interiors', 'Commercial', 'Mumbai',
        'Level 12, Tower B, TechPark One, Andheri East, Mumbai 400069',
        '2026-02-01', '2026-07-31', 4200000, 'active');

-- Phase 1: Space Planning
INSERT INTO project_phases (id, tenant_id, project_id, name, display_order, start_date, end_date)
VALUES (v_ph4, v_tenant, v_proj2, 'Space Planning', 1, '2026-02-01', '2026-03-15');

INSERT INTO milestones (tenant_id, phase_id, name, target_date, status, deliverables)
VALUES
    (v_tenant, v_ph4, 'Site survey completed', '2026-02-10', 'completed', 'As-built drawings and site photos'),
    (v_tenant, v_ph4, 'Layout options presented', '2026-02-28', 'completed', '3 layout options with workstation counts'),
    (v_tenant, v_ph4, 'Layout finalized', '2026-03-10', 'in_progress', 'Final approved layout with furniture plan');

-- Phase 2: Design Development
INSERT INTO project_phases (id, tenant_id, project_id, name, display_order, start_date, end_date)
VALUES (v_ph5, v_tenant, v_proj2, 'Design Development', 2, '2026-03-16', '2026-05-31');

INSERT INTO milestones (tenant_id, phase_id, name, target_date, status, deliverables)
VALUES
    (v_tenant, v_ph5, 'Material and finish selection', '2026-04-15', 'pending', 'Material palette board with samples'),
    (v_tenant, v_ph5, '3D renders approved', '2026-05-01', 'pending', 'Photo-realistic renders of key areas'),
    (v_tenant, v_ph5, 'MEP coordination', '2026-05-20', 'pending', 'Electrical and HVAC layout coordination');

-- Add some tasks to Project 1
INSERT INTO tasks (tenant_id, project_id, title, description, priority, status, due_date)
VALUES
    (v_tenant, v_proj1, 'Finalize vastu compliance review', 'Client requires vastu-compliant orientation for master bedroom and puja room', 'high', 'in_progress', '2026-04-05'),
    (v_tenant, v_proj1, 'Landscape architect coordination', 'Schedule meeting with landscape architect for garden design', 'medium', 'todo', '2026-04-15'),
    (v_tenant, v_proj1, 'Prepare 3D walkthrough', 'Create 3D walkthrough animation for client presentation', 'medium', 'todo', '2026-04-20'),
    (v_tenant, v_proj1, 'Soil testing report review', 'Review geotechnical report and share with structural consultant', 'high', 'done', '2026-03-01');

-- Add some tasks to Project 2
INSERT INTO tasks (tenant_id, project_id, title, description, priority, status, due_date)
VALUES
    (v_tenant, v_proj2, 'Server room layout approval', 'Get IT team sign-off on server room dimensions and cooling requirements', 'urgent', 'in_progress', '2026-03-25'),
    (v_tenant, v_proj2, 'Fire safety compliance check', 'Verify layout meets NBC 2016 fire safety norms', 'high', 'todo', '2026-04-01'),
    (v_tenant, v_proj2, 'Acoustic treatment for meeting rooms', 'Specify acoustic panels and ceiling treatment for 4 meeting rooms', 'medium', 'todo', '2026-04-10');

-- Add budget lines for Project 1
INSERT INTO project_budget_lines (tenant_id, project_id, category, budgeted_amount, actual_amount)
VALUES
    (v_tenant, v_proj1, 'Architecture Fees', 850000, 425000),
    (v_tenant, v_proj1, 'Structural Design', 250000, 125000),
    (v_tenant, v_proj1, 'MEP Design', 180000, 0),
    (v_tenant, v_proj1, 'Interior Design', 450000, 0),
    (v_tenant, v_proj1, 'Landscape Design', 150000, 0);

-- Add budget lines for Project 2
INSERT INTO project_budget_lines (tenant_id, project_id, category, budgeted_amount, actual_amount)
VALUES
    (v_tenant, v_proj2, 'Interior Design Fees', 420000, 210000),
    (v_tenant, v_proj2, 'Furniture & Fixtures', 1800000, 0),
    (v_tenant, v_proj2, 'MEP Modifications', 350000, 175000),
    (v_tenant, v_proj2, 'Flooring & Finishes', 600000, 0);

END $$;
