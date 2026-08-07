-- ============================================================
-- TEST DATA for OpenMem dashboard graph
-- ============================================================
-- !! Replace 36ca7891-743f-40ac-bcbc-9e73aaf4cfcf below with your actual auth.users id !!
-- Run in Supabase SQL Editor (as service_role or via the dashboard)
-- ============================================================

-- ── 1. Container ────────────────────────────────────────────
INSERT INTO public.containers (id, tag, owner_id, created_at, updated_at)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Test Graph',
  '36ca7891-743f-40ac-bcbc-9e73aaf4cfcf',                -- ← REPLACE THIS
  now(),
  now()
);

-- ── 2. Session ──────────────────────────────────────────────
INSERT INTO public.sessions (id, container_id)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001'
);

-- ── 3. Memories ─────────────────────────────────────────────
INSERT INTO public.memories (id, session_id, container_id, content, type, confidence, metadata_hints, embedding_model)
VALUES
('cccccccc-0000-0000-0000-000000000001',
 'bbbbbbbb-0000-0000-0000-000000000001',
 'aaaaaaaa-0000-0000-0000-000000000001',
 'Alice works at Acme Corp as an engineer.',
 'statement', 0.95, NULL, 'test-model'),

('cccccccc-0000-0000-0000-000000000002',
 'bbbbbbbb-0000-0000-0000-000000000001',
 'aaaaaaaa-0000-0000-0000-000000000001',
 'Bob is the CEO of Acme Corp and lives in New York.',
 'statement', 0.90, NULL, 'test-model'),

('cccccccc-0000-0000-0000-000000000003',
 'bbbbbbbb-0000-0000-0000-000000000001',
 'aaaaaaaa-0000-0000-0000-000000000001',
 'Alice is friends with Bob.',
 'statement', 0.85, NULL, 'test-model');

-- ── 4. Entities ─────────────────────────────────────────────
INSERT INTO public.entities (id, canonical_name, type, confidence, aliases, properties, embedding_model, container_id)
VALUES
('dddddddd-0000-0000-0000-000000000001',
 'Alice',    'person',      0.98, ARRAY['Alicia'],  NULL, 'test-model',
 'aaaaaaaa-0000-0000-0000-000000000001'),

('dddddddd-0000-0000-0000-000000000002',
 'Bob',      'person',      0.97, ARRAY['Robert'],  NULL, 'test-model',
 'aaaaaaaa-0000-0000-0000-000000000001'),

('dddddddd-0000-0000-0000-000000000003',
 'Acme Corp','organization',0.99, ARRAY['Acme'],     NULL, 'test-model',
 'aaaaaaaa-0000-0000-0000-000000000001'),

('dddddddd-0000-0000-0000-000000000004',
 'New York', 'location',    0.96, ARRAY['NYC','The Big Apple'], NULL, 'test-model',
 'aaaaaaaa-0000-0000-0000-000000000001');

-- ── 5. Entity mentions ──────────────────────────────────────
INSERT INTO public.entity_mentions (memory_id, entity_id, confidence, aliases, properties)
VALUES
('cccccccc-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 0.98, ARRAY['Alice'],  NULL),
('cccccccc-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000003', 0.99, ARRAY['Acme'],   NULL),
('cccccccc-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000002', 0.97, ARRAY['Bob'],    NULL),
('cccccccc-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000003', 0.99, ARRAY['Acme'],   NULL),
('cccccccc-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000004', 0.96, ARRAY['NYC'],    NULL),
('cccccccc-0000-0000-0000-000000000003', 'dddddddd-0000-0000-0000-000000000001', 0.98, ARRAY['Alice'],  NULL),
('cccccccc-0000-0000-0000-000000000003', 'dddddddd-0000-0000-0000-000000000002', 0.97, ARRAY['Bob'],    NULL);

-- ── 6. Relations ────────────────────────────────────────────
-- subject_id → object_id
INSERT INTO public.relations (id, subject_id, object_id, container_id, memory_id, superseedes, relation, confidence)
VALUES
('eeeeeeee-0000-0000-0000-000000000001',
 'dddddddd-0000-0000-0000-000000000001',   -- Alice
 'dddddddd-0000-0000-0000-000000000003',   -- Acme Corp
 'aaaaaaaa-0000-0000-0000-000000000001',
 'cccccccc-0000-0000-0000-000000000001',
 NULL, 'works_at', 0.95),

('eeeeeeee-0000-0000-0000-000000000002',
 'dddddddd-0000-0000-0000-000000000002',   -- Bob
 'dddddddd-0000-0000-0000-000000000003',   -- Acme Corp
 'aaaaaaaa-0000-0000-0000-000000000001',
 'cccccccc-0000-0000-0000-000000000002',
 NULL, 'ceo_of', 0.90),

('eeeeeeee-0000-0000-0000-000000000003',
 'dddddddd-0000-0000-0000-000000000002',   -- Bob
 'dddddddd-0000-0000-0000-000000000004',   -- New York
 'aaaaaaaa-0000-0000-0000-000000000001',
 'cccccccc-0000-0000-0000-000000000002',
 NULL, 'lives_in', 0.90),

('eeeeeeee-0000-0000-0000-000000000004',
 'dddddddd-0000-0000-0000-000000000001',   -- Alice
 'dddddddd-0000-0000-0000-000000000002',   -- Bob
 'aaaaaaaa-0000-0000-0000-000000000001',
 'cccccccc-0000-0000-0000-000000000003',
 NULL, 'friends_with', 0.85);

-- ── 7. Relation mentions ────────────────────────────────────
INSERT INTO public.relation_mentions (relation_id, memory_id, confidence)
VALUES
('eeeeeeee-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 0.95),
('eeeeeeee-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000002', 0.90),
('eeeeeeee-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000002', 0.90),
('eeeeeeee-0000-0000-0000-000000000004', 'cccccccc-0000-0000-0000-000000000003', 0.85);
