-- Hue Guide knowledge seed (10 di tich, tieng Viet).
-- Thong tin duoc dien giai ngan tu UNESCO, cong thong tin Hue va Cuc Du lich Quoc gia.
-- CAN CANH BAO: Day la ban seed MVP can quan tri vien kiem duyet truoc khi dua vao su dung cong khai.
-- De kiem thu chatbot, script danh dau cac tai lieu la 'approved' duoi staff ID 1.
-- Embedding NULL: truy xuat tu khoa khi EMBEDDING_PROVIDER=dev, KHONG phai semantic embedding da huan luyen.
-- Mac dinh ROLLBACK. Chi ghi DB khi chay: psql ... -v apply=1 -f file.sql
-- Khong doi schema, attractions, routes, frontend hay Gemini key.
\set ON_ERROR_STOP on
\encoding UTF8
SET client_encoding TO 'UTF8';
BEGIN;

CREATE TEMP TABLE _hue_knowledge_seed (
  slug text PRIMARY KEY,
  title text NOT NULL,
  source_url text NOT NULL,
  source_credit text NOT NULL,
  paragraph_one text NOT NULL,
  paragraph_two text NOT NULL
) ON COMMIT DROP;

INSERT INTO _hue_knowledge_seed
  (slug, title, source_url, source_credit, paragraph_one, paragraph_two)
VALUES
  ('dai-noi', 'Thông tin di tích: Đại Nội Huế', 'https://whc.unesco.org/en/list/678', 'UNESCO World Heritage Centre',
   'Đại Nội Huế nằm trong Kinh thành Huế, gồm khu vực Hoàng thành và Tử Cấm thành; đây là không gian gắn với hoạt động triều chính và đời sống hoàng gia thời Nguyễn. Huế trở thành kinh đô của nước Việt Nam thống nhất từ năm 1802 và giữ vai trò trung tâm chính trị, văn hóa, tôn giáo dưới triều Nguyễn đến năm 1945.',
   'Điểm đặc biệt của Đại Nội Huế là quy hoạch kinh đô với thành quách, cung điện và các trục nghi lễ đặt trong cảnh quan sông Hương và núi Ngự Bình. Đại Nội thuộc Quần thể Di tích Cố đô Huế, được UNESCO ghi danh vào Danh sách Di sản Thế giới năm 1993.'),
  ('an-dinh', 'Thông tin di tích: Cung An Định', 'https://phuho.hue.gov.vn/Du-khach/Thong-tin-du-khach/Kham-pha-Hue/tb/Cung-An-dinh-An-Dinh-Cung-627332?page=1', 'Cổng thông tin điện tử Thành phố Huế',
   'Cung An Định nằm bên bờ sông An Cựu, tại số 97 Phan Đình Phùng, Huế. Ban đầu nơi đây là phủ An Định của Nguyễn Phúc Bửu Đảo, người sau này trở thành vua Khải Định. Năm 1917, vua Khải Định cho cải tạo phủ thành cung điện; công việc hoàn thành vào năm 1919.',
   'Cung An Định nổi bật với sự kết hợp giữa trang trí truyền thống và kiến trúc chịu ảnh hưởng châu Âu. Các công trình còn lại đáng chú ý gồm cổng chính, đình Trung Lập và lầu Khải Tường; đặc biệt lầu Khải Tường có tranh tường, trang trí nội thất mang giá trị nghệ thuật.'),
  ('duc-duc', 'Thông tin di tích: Lăng Dục Đức', 'https://ancuu.hue.gov.vn/Chinh-quyen/UBND-PHUONG-AN-CUU/tb/Gioi-thieu-863525', 'Cổng thông tin điện tử phường An Cựu, thành phố Huế',
   'Lăng Dục Đức, còn gọi là An Lăng, là một khu lăng tẩm của hoàng gia triều Nguyễn ở Huế. Nơi đây gắn với vua Dục Đức, một vị vua trong giai đoạn lịch sử nhiều biến động vào cuối thế kỷ XIX.',
   'Điểm đáng chú ý của Lăng Dục Đức là đây là nơi an nghỉ của ba thế hệ vua triều Nguyễn trong cùng dòng họ: vua Dục Đức, con trai là vua Thành Thái và cháu nội là vua Duy Tân. Vì vậy An Lăng có ý nghĩa khi tìm hiểu lịch sử những vị vua Nguyễn cuối thế kỷ XIX và đầu thế kỷ XX.'),
  ('nam-giao', 'Thông tin di tích: Đàn Nam Giao', 'https://sdl.hue.gov.vn/diem-den/kham-pha-dan-te-troi-dat-cua-cac-vua-nha-nguyen.html', 'Sở Du lịch thành phố Huế',
   'Đàn Nam Giao ở phía nam Kinh thành Huế là nơi triều Nguyễn tổ chức lễ tế trời đất, một nghi lễ quan trọng trong đời sống cung đình. Công trình được vua Gia Long cho khởi công xây dựng năm 1806, gắn với các kỳ tế Giao do nhà vua hoặc người được ủy nhiệm chủ trì.',
   'Điểm đặc biệt của Đàn Nam Giao là ý nghĩa nghi lễ và bố cục đàn tế theo quan niệm Thiên, Địa, Nhân. Không gian này giúp du khách tìm hiểu mối liên hệ giữa kiến trúc, tín ngưỡng và nghi lễ nhà nước dưới triều Nguyễn.'),
  ('tu-duc', 'Thông tin di tích: Lăng Tự Đức', 'https://whc.unesco.org/en/activities/320/', 'UNESCO World Heritage Centre',
   'Lăng Tự Đức là khu lăng tẩm gắn với vua Tự Đức, vị vua nhà Nguyễn trị vì từ năm 1848 đến năm 1883. Nhà vua đặc biệt quan tâm đến việc xây dựng khu an nghỉ của mình và bố trí các công trình, khu vườn xung quanh.',
   'Điểm đặc biệt của Lăng Tự Đức là sự hòa hợp giữa kiến trúc và cảnh quan: nhiều công trình nằm giữa cây xanh, hồ nước và mặt nước nhỏ. Cách tổ chức không gian mang đến cảm giác trầm tĩnh, khác với hình dung về một khu lăng chỉ có phần mộ.'),
  ('dong-khanh', 'Thông tin di tích: Lăng Đồng Khánh', 'https://vietnamtourism.vn/index.php/tourism/items/456/', 'Cục Du lịch Quốc gia Việt Nam',
   'Lăng Đồng Khánh, còn gọi là Tư Lăng, là khu lăng của vua Đồng Khánh thuộc triều Nguyễn. Việc xây dựng và hoàn thiện công trình trải qua nhiều đời vua, từ năm 1888 đến năm 1923.',
   'Điểm đặc biệt của Lăng Đồng Khánh là sự giao thoa giữa kiến trúc truyền thống và ảnh hưởng phương Tây. Khu tẩm điện với điện Ngưng Hy mang nhiều yếu tố kiến trúc cổ truyền, còn khu lăng mộ thể hiện rõ hơn các nét trang trí và vật liệu chịu ảnh hưởng Tây Âu.'),
  ('thieu-tri', 'Thông tin di tích: Lăng Thiệu Trị', 'https://hue.gov.vn/Du-dia-chi/tb/Lang-Thieu-Tri-Xuong-Lang-253632', 'Cổng thông tin điện tử Thành phố Huế',
   'Lăng Thiệu Trị, tên chữ là Xương Lăng, là khu lăng của vua Thiệu Trị, người trị vì triều Nguyễn từ năm 1841 đến năm 1847. Lăng nằm trong cảnh quan đồi núi, ruộng vườn phía ngoài trung tâm Huế.',
   'Điểm đặc biệt của Lăng Thiệu Trị là bố cục gắn với cảnh quan thiên nhiên và hướng nhìn tây bắc ít gặp trong kiến trúc lăng tẩm thời Nguyễn. Khu lăng không có La thành bao quanh theo kiểu thường thấy; đồng ruộng và cây xanh tạo thành một không gian bao bọc tự nhiên.'),
  ('khai-dinh', 'Thông tin di tích: Lăng Khải Định', 'https://vietnamtourism.vn/index.php/tourism/items/462/6', 'Cục Du lịch Quốc gia Việt Nam',
   'Lăng Khải Định, còn gọi là Ứng Lăng, là lăng mộ của vua Khải Định thuộc triều Nguyễn. Công trình khởi công năm 1920 và phải trải qua khoảng 11 năm mới hoàn thành, thể hiện một giai đoạn biến đổi của nghệ thuật kiến trúc cung đình Huế.',
   'Điểm đặc biệt của Lăng Khải Định là sự pha trộn tinh xảo giữa các yếu tố kiến trúc và trang trí Đông - Tây. Khu lăng tuy có quy mô mặt bằng nhỏ hơn một số lăng vua Nguyễn trước đó nhưng công phu về trang trí, nổi bật với những chi tiết khảm sành sứ và thủy tinh màu.'),
  ('minh-mang', 'Thông tin di tích: Lăng Minh Mạng', 'https://whc.unesco.org/en/activities/318/', 'UNESCO World Heritage Centre',
   'Lăng Minh Mạng là quần thể lăng tẩm của vua Minh Mạng thuộc triều Nguyễn tại Huế. Theo UNESCO, việc xây dựng quần thể này bắt đầu năm 1841 và hoàn thành vào năm 1843.',
   'Điểm đặc biệt của Lăng Minh Mạng là cách kết hợp nhiều công trình kiến trúc với vườn cây và hồ nước, tạo thành quần thể có cảnh quan hài hòa. Di tích là một trong các khu lăng quan trọng thuộc Quần thể Di tích Cố đô Huế.'),
  ('gia-long', 'Thông tin di tích: Lăng Gia Long', 'https://vietnamtourism.vn/index.php/tourism/items/461/3', 'Cục Du lịch Quốc gia Việt Nam',
   'Lăng Gia Long, còn gọi là Thiên Thọ Lăng, là khu lăng của vua Gia Long, vị vua mở đầu triều Nguyễn. Công trình được xây dựng từ năm 1814 đến năm 1820 và nằm giữa vùng cảnh quan đồi núi phía ngoài trung tâm Huế.',
   'Điểm đặc biệt của Lăng Gia Long là sự gắn kết rất rõ giữa lăng mộ và núi đồi bao quanh. Quần thể có khu mộ vua và hoàng hậu, khu tẩm điện với điện Minh Thành cùng các công trình phụ trợ, tạo thành một không gian rộng lớn hòa với thiên nhiên.');

-- Chi chap nhan DB dung 10 di tich va chua co knowledge. Khong xoa tai lieu khac.
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM _hue_knowledge_seed) <> 10 THEN
    RAISE EXCEPTION 'Expected exactly 10 seed documents';
  END IF;
  IF (SELECT COUNT(*) FROM attractions) <> 10
     OR (SELECT COUNT(*) FROM attractions a JOIN _hue_knowledge_seed s ON a.slug=s.slug) <> 10
     OR (SELECT COUNT(*) FROM attractions WHERE status='published') <> 10 THEN
    RAISE EXCEPTION '10 published Hue Guide attractions not found; refusing seed';
  END IF;
  IF EXISTS (SELECT 1 FROM attraction_localizations l JOIN attractions a ON a.attraction_id=l.attraction_id
             JOIN _hue_knowledge_seed s ON s.slug=a.slug WHERE l.language_code='vi' AND l.status <> 'published') THEN
    RAISE EXCEPTION 'One or more Vietnamese attraction localizations are unpublished';
  END IF;
  IF (SELECT COUNT(*) FROM knowledge_documents) <> 0
     OR (SELECT COUNT(*) FROM knowledge_chunks) <> 0 THEN
    RAISE EXCEPTION 'Knowledge data already exists; refusing to overwrite or duplicate';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM staff_accounts WHERE staff_id = 1) THEN
    RAISE EXCEPTION 'Seed staff admin (ID 1) not found';
  END IF;
END $$;

INSERT INTO knowledge_documents
  (attraction_id, title, language_code, source_url, source_credit, body_text,
   version, status, created_by, approved_by, approved_at)
SELECT
  a.attraction_id, s.title, 'vi', s.source_url, s.source_credit,
  s.paragraph_one || E'\n\n' || s.paragraph_two,
  1, 'approved', 1, 1, CURRENT_TIMESTAMP
FROM _hue_knowledge_seed s
JOIN attractions a ON a.slug=s.slug;

-- 2 chunk / di tich, embedding NULL vi dev provider su dung lexical relevance.
-- Khi trien khai semantic retrieval, phai reindex lai bang embedding thuc te.
INSERT INTO knowledge_chunks
  (document_id, document_version, chunk_order, content, embedding_model, embedding, indexed_at)
SELECT d.document_id, d.version, p.chunk_order, p.content, NULL, NULL, NULL
FROM _hue_knowledge_seed s
JOIN attractions a ON a.slug=s.slug
JOIN knowledge_documents d
  ON d.attraction_id=a.attraction_id AND d.title=s.title AND d.language_code='vi'
CROSS JOIN LATERAL (
  VALUES (1, s.paragraph_one), (2, s.paragraph_two)
) AS p(chunk_order, content);

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM knowledge_documents WHERE status='approved' AND language_code='vi') <> 10
     OR (SELECT COUNT(*) FROM knowledge_documents) <> 10
     OR (SELECT COUNT(*) FROM knowledge_chunks) <> 20
     OR EXISTS (SELECT 1 FROM knowledge_chunks WHERE embedding IS NOT NULL OR embedding_model IS NOT NULL) THEN
    RAISE EXCEPTION 'Unexpected knowledge seed counts/embeddings. Rolling back.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM knowledge_documents d
    GROUP BY d.attraction_id HAVING COUNT(*) <> 1
  ) THEN
    RAISE EXCEPTION 'Expected one document per attraction';
  END IF;
END $$;

\echo ==== KNOWLEDGE SEED PREVIEW: 10 APPROVED DOCS, 20 CHUNKS ====
SELECT a.attraction_id, a.slug, d.document_id, d.status,
       COUNT(c.chunk_id) AS chunks, MAX(d.source_credit) AS source_credit
FROM knowledge_documents d
JOIN attractions a ON a.attraction_id=d.attraction_id
JOIN knowledge_chunks c ON c.document_id=d.document_id AND c.document_version=d.version
GROUP BY a.attraction_id,a.slug,d.document_id,d.status
ORDER BY a.attraction_id;

\if :{?apply}
  \if :apply
    \echo ==== APPLY MODE: COMMIT ====
    COMMIT;
  \else
    \echo ==== PREVIEW MODE: ROLLBACK - CHUA THAY DOI DATABASE ====
    ROLLBACK;
  \endif
\else
  \echo ==== PREVIEW MODE: ROLLBACK - CHUA THAY DOI DATABASE ====
  ROLLBACK;
\endif
