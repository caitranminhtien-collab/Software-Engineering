\encoding UTF8

BEGIN;

-- =========================================================
-- KNOWLEDGE DOCUMENT 1: ĐẠI NỘI HUẾ
-- =========================================================

WITH seed_admin AS (
  SELECT staff_id
  FROM staff_accounts
  WHERE email = 'seed.admin@hue.local'
  LIMIT 1
),
target_attraction AS (
  SELECT attraction_id
  FROM attractions
  WHERE slug = 'dev-hue-imperial-city'
  LIMIT 1
)
INSERT INTO knowledge_documents (
  attraction_id,
  title,
  language_code,
  source_url,
  source_credit,
  body_text,
  version,
  status,
  created_by,
  approved_by,
  approved_at
)
SELECT
  a.attraction_id,
  'Thông tin Đại Nội Huế',
  'vi',
  NULL,
  'Hue Tourism Guide - Development Seed',
  'Đại Nội Huế là một trong những điểm tham quan tiêu biểu tại Huế. Khu vực này gắn với không gian cung đình và kiến trúc triều Nguyễn. Du khách có thể tìm hiểu về lịch sử, kiến trúc và giá trị văn hóa của cố đô Huế khi tham quan địa điểm này.',
  1,
  'approved',
  s.staff_id,
  s.staff_id,
  CURRENT_TIMESTAMP
FROM seed_admin s
CROSS JOIN target_attraction a
WHERE NOT EXISTS (
  SELECT 1
  FROM knowledge_documents
  WHERE title = 'Thông tin Đại Nội Huế'
    AND language_code = 'vi'
    AND version = 1
);

-- =========================================================
-- KNOWLEDGE DOCUMENT 2: CUNG AN ĐỊNH
-- =========================================================

WITH seed_admin AS (
  SELECT staff_id
  FROM staff_accounts
  WHERE email = 'seed.admin@hue.local'
  LIMIT 1
),
target_attraction AS (
  SELECT attraction_id
  FROM attractions
  WHERE slug = 'dev-an-dinh-palace'
  LIMIT 1
)
INSERT INTO knowledge_documents (
  attraction_id,
  title,
  language_code,
  source_url,
  source_credit,
  body_text,
  version,
  status,
  created_by,
  approved_by,
  approved_at
)
SELECT
  a.attraction_id,
  'Thông tin Cung An Định',
  'vi',
  NULL,
  'Hue Tourism Guide - Development Seed',
  'Cung An Định là một địa điểm tham quan tại Huế gắn với lịch sử triều Nguyễn. Công trình có giá trị về kiến trúc, lịch sử và văn hóa, là một trong những địa điểm giúp du khách tìm hiểu thêm về di sản của Huế.',
  1,
  'approved',
  s.staff_id,
  s.staff_id,
  CURRENT_TIMESTAMP
FROM seed_admin s
CROSS JOIN target_attraction a
WHERE NOT EXISTS (
  SELECT 1
  FROM knowledge_documents
  WHERE title = 'Thông tin Cung An Định'
    AND language_code = 'vi'
    AND version = 1
);

-- =========================================================
-- CHUNKS: ĐẠI NỘI HUẾ
-- =========================================================

INSERT INTO knowledge_chunks (
  document_id,
  document_version,
  chunk_order,
  content,
  embedding_model,
  embedding,
  indexed_at
)
SELECT
  d.document_id,
  d.version,
  1,
  'Đại Nội Huế là một trong những điểm tham quan tiêu biểu tại Huế.',
  NULL,
  NULL,
  CURRENT_TIMESTAMP
FROM knowledge_documents d
WHERE d.title = 'Thông tin Đại Nội Huế'
  AND d.language_code = 'vi'
  AND d.version = 1
  AND NOT EXISTS (
    SELECT 1
    FROM knowledge_chunks c
    WHERE c.document_id = d.document_id
      AND c.document_version = d.version
      AND c.chunk_order = 1
  );

INSERT INTO knowledge_chunks (
  document_id,
  document_version,
  chunk_order,
  content,
  embedding_model,
  embedding,
  indexed_at
)
SELECT
  d.document_id,
  d.version,
  2,
  'Đại Nội Huế gắn với không gian cung đình, kiến trúc triều Nguyễn và các giá trị lịch sử, văn hóa của cố đô Huế.',
  NULL,
  NULL,
  CURRENT_TIMESTAMP
FROM knowledge_documents d
WHERE d.title = 'Thông tin Đại Nội Huế'
  AND d.language_code = 'vi'
  AND d.version = 1
  AND NOT EXISTS (
    SELECT 1
    FROM knowledge_chunks c
    WHERE c.document_id = d.document_id
      AND c.document_version = d.version
      AND c.chunk_order = 2
  );

-- =========================================================
-- CHUNKS: CUNG AN ĐỊNH
-- =========================================================

INSERT INTO knowledge_chunks (
  document_id,
  document_version,
  chunk_order,
  content,
  embedding_model,
  embedding,
  indexed_at
)
SELECT
  d.document_id,
  d.version,
  1,
  'Cung An Định là một địa điểm tham quan tại Huế gắn với lịch sử triều Nguyễn.',
  NULL,
  NULL,
  CURRENT_TIMESTAMP
FROM knowledge_documents d
WHERE d.title = 'Thông tin Cung An Định'
  AND d.language_code = 'vi'
  AND d.version = 1
  AND NOT EXISTS (
    SELECT 1
    FROM knowledge_chunks c
    WHERE c.document_id = d.document_id
      AND c.document_version = d.version
      AND c.chunk_order = 1
  );

INSERT INTO knowledge_chunks (
  document_id,
  document_version,
  chunk_order,
  content,
  embedding_model,
  embedding,
  indexed_at
)
SELECT
  d.document_id,
  d.version,
  2,
  'Cung An Định có giá trị về kiến trúc, lịch sử và văn hóa, giúp du khách tìm hiểu thêm về di sản Huế.',
  NULL,
  NULL,
  CURRENT_TIMESTAMP
FROM knowledge_documents d
WHERE d.title = 'Thông tin Cung An Định'
  AND d.language_code = 'vi'
  AND d.version = 1
  AND NOT EXISTS (
    SELECT 1
    FROM knowledge_chunks c
    WHERE c.document_id = d.document_id
      AND c.document_version = d.version
      AND c.chunk_order = 2
  );

COMMIT;