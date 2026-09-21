/**
 * Kho Dữ Liệu Lịch Sử & Phong Thủy Triều Nguyễn (RAG Knowledge Base)
 * Đáp ứng yêu cầu Section 6.3 PRD:
 * - Trả lời dưới 150 từ
 * - Văn phong cung đình, nhã nhặn, chuẩn xác
 * - Hỗ trợ đa ngôn ngữ
 */
export const RAG_KNOWLEDGE = [
  {
    topic: "Lăng Khải Định - Kiến trúc phương Tây",
    keywords: ["khải định", "phương tây", "tây phương", "pháp", "gothic", "tân thời", "xi măng", "sành sứ", "why western", "western architecture"],
    response: {
      vi: "Dạ thưa quý khách, vua Khải Định trị vì trong bối cảnh văn hóa phương Tây du nhập mạnh mẽ vào đầu thế kỷ 20. Bản thân nhà vua có niềm say mê đặc biệt với lối sống hiện đại và mỹ thuật Pháp sau chuyến công du sang Pháp năm 1922. Vì vậy, Ứng Lăng được kiến thiết bằng bê tông cốt thép nhập khẩu từ Pháp kết hợp nghệ thuật ghép sành sứ bản địa, tạo nên sự dung hợp táo bạo giữa Gothic, Roman và truyền thống triều Nguyễn.",
      en: "Emperor Khai Dinh reigned during intense French influence and traveled to France in 1922. Captivated by modern Western arts, he daringly fused European neoclassical and Gothic styles with indigenous ceramic mosaic craftsmanship, using modern materials like reinforced concrete alongside imperial Vietnamese dragon motifs.",
      fr: "L'empereur Khai Dinh, séduit par la modernité lors de son voyage en France en 1922, a osé marier le béton armé, les lignes néogothiques et l'art virtuose de la mosaïque de porcelaine asiatique, reflétant le tournant du début du XXe siècle.",
      zh: "启定帝深受20世纪初法国现代文明与艺术熏陶。他在应陵营建中大胆引进法国钢筋水泥、彩色玻璃，与东方精湛的碎瓷镶嵌工艺完美融合，造就了这座东西合璧的建筑奇迹。"
    }
  },
  {
    topic: "Lăng Tự Đức - Quy tắc phong thủy Khiêm Lăng",
    keywords: ["tự đức", "phong thủy", "khiêm lăng", "lưu khiêm", "xung khiêm", "vạn niên", "chữ khiêm", "feng shui", "tu duc"],
    response: {
      vi: "Dạ thưa quý khách, Khiêm Lăng tuân thủ nghiêm ngặt nguyên lý 'tọa sơn nghinh thủy' và phong thủy cảnh quan. Đồi Vạn Niên tĩnh mịch đóng vai trò Hậu Chẩm vững chãi, phía trước hồ Lưu Khiêm đóng vai trò Minh Đường tụ thủy tàng phong. Gần 50 công trình đều mang chữ 'Khiêm' (khiêm nhường), hài hòa tuyệt đối với đồi thông và dòng suối, phản ánh trọn vẹn triết lý an hòa giữa con người với vũ trụ.",
      en: "Khiem Lang meticulously follows the sacred principle of 'Backing Mountains, Facing Waters'. The Van Nien hill acts as the protective rear mountain, while the idyllic Luu Khiem Lake serves as the luminous water court gathering vital cosmic energy (Qi). All 50 structures bear the word 'Khiem' (Modesty), harmonizing nature and imperial soul.",
      fr: "Khiem Lang obéit à la règle sacrée 'adosser la montagne et contempler l'eau'. Le mont Van Nien protège l'arrière, tandis que le lac Luu Khiem retient les énergies bienfaisantes. Les 50 pavillons célèbrent l'humilité et la communion avec la nature.",
      zh: "谦陵严格秉承‘负阴抱阳、依山傍水’的风水法则。以万年山为厚重后枕，前以流谦湖聚水生财聚灵气。所有建筑皆名‘谦’，达到了人与自然天人合一的高峰。"
    }
  },
  {
    topic: "Đàn Nam Giao - Triết lý tế trời",
    keywords: ["nam giao", "tế trời", "trời đất", "viên đàn", "phương đàn", "tam tài", "thiên địa"],
    response: {
      vi: "Dạ thưa quý khách, Đàn Nam Giao là thánh địa tế giao quan trọng bậc nhất vương triều, nơi Thiên Tử kết nối với Thượng Đế. Ba tầng tế tự tượng trưng cho 'Tam Tài': Tầng trên tròn (Viên Đàn) màu thanh thiên tượng trưng Trời; tầng giữa vuông (Phương Đàn) màu hoàng thổ tượng trưng Đất; tầng dưới vuông màu chu sa tượng trưng Nhân gian. Đây là biểu tượng của tinh thần thuận theo đạo Trời để trị vì muôn dân.",
      en: "The Nam Giao Esplanade embodies the Eastern cosmology of 'Three Powers' (Heaven, Earth, Humanity). The circular blue top terrace represents Heaven; the square yellow terrace represents Earth; and the lowest red square represents Man. Here, the Emperor prayed as Son of Heaven for national prosperity.",
      fr: "L'autel Nam Giao symbolise l'harmonie cosmique : la terrasse supérieure ronde représente le Ciel, la terrasse médiane carrée la Terre, et le niveau inférieur l'Homme, où l'empereur officiait pour la paix du royaume.",
      zh: "南郊坛体现了‘天圆地方、三才并立’的古代宇宙观。上层为圆形青砖天坛，中层为方形黄土台地，下层为红台代表人界。天子亲临告天祈福。"
    }
  },
  {
    topic: "Cung An Định - Ý nghĩa & Hoàng hậu Nam Phương",
    keywords: ["an định", "khải tường", "nam phương", "bảo đại", "bích họa", "hoàng hậu", "an dinh"],
    response: {
      vi: "Dạ thưa quý khách, Cung An Định được xây dựng năm 1917, là tư dinh nơi Thái tử Vĩnh Thụy (sau là vua Bảo Đại) sống cùng mẹ là Đức Từ Cung và sau này là Hoàng hậu Nam Phương cùng các hoàng tử, công chúa. Điểm đặc sắc nhất là Lâu đài Khải Tường với lối trang trí Phục Hưng Pháp phối hợp hoạ tiết hoa sen, rồng phượng truyền thống và 6 bức tranh bích họa khổ lớn nguyên bản.",
      en: "An Dinh Palace was the private modern residence of Emperor Bao Dai and the graceful Empress Nam Phuong. Blending Roman-Baroque motifs with Vietnamese royal aesthetics, the three-story Khai Tuong castle houses remarkable original wall murals depicting imperial heritage.",
      fr: "Construit en 1917, le palais An Dinh fut la résidence privée de l'empereur Bao Dai et de l'impératrice Nam Phuong. Le pavillon Khai Tuong mêle style Renaissance et symboles royaux annamites.",
      zh: "安定宫建于1917年，是末代皇帝保大与南芳皇后的现代生活府邸。启祥楼融汇欧洲巴洛克与阮朝龙凤雕饰，留存有精美绝伦的宫廷壁画。"
    }
  },
  {
    topic: "Lăng Gia Long - Ngôi mộ song táng",
    keywords: ["gia long", "thiên thọ", "thừa thiên", "song táng", "hai ngôi mộ", "vua đầu tiên", "nguyễn ánh"],
    response: {
      vi: "Dạ thưa quý khách, vua Gia Long (Nguyễn Ánh) sau bao năm bôn tẩu đã thống nhất dải non sông và định đô ở Huế. Tại Thiên Thọ Lăng, hai ngôi mộ đá nguyên khối của vua và Thừa Thiên Cao Hoàng hậu được đặt song song cách nhau chỉ một gang tay, thể hiện tình phu thê keo sơn son sắt hoạn nạn có nhau từ thuở áo vải gian truân cho đến ngàn thu vĩnh hằng.",
      en: "Emperor Gia Long, who unified Vietnam in 1802, chose a serene resting place surrounded by 42 mountain peaks. The twin stone tombs of the Emperor and Empress Thua Thien stand side by side, symbolizing steadfast devotion through decades of war and triumph.",
      fr: "Fondateur de la dynastie en 1802, Gia Long repose dans un écrin sauvage de 42 collines. Les tombes jumelles de l'empereur et de sa première épouse Thua Thien témoignent d'un amour inaltérable à travers les épreuves.",
      zh: "嘉隆帝于1802年一统天下。天授陵中，嘉隆帝与承天高皇后的两座并排石墓紧紧相依，象征着患难与共、生死不渝的夫妻深情。"
    }
  },
  {
    topic: "Lăng Minh Mạng - Trục Dũng Đạo và triết lý Nho giáo",
    keywords: ["minh mạng", "hiếu lăng", "đối xứng", "dũng đạo", "nho giáo", "tân nguyệt", "trừng minh"],
    response: {
      vi: "Dạ thưa quý khách, Hiếu Lăng của vua Minh Mạng là đỉnh cao của trật tự kiến trúc Nho giáo phương Đông. Toàn bộ lăng nằm trên một trục Dũng Đạo thẳng tắp dài 700 mét từ Đại Hồng Môn đến chân Bửu Thành. Sự kết hợp giữa hồ Trừng Minh vuông vức tĩnh lặng và hồ Tân Nguyệt hình vầng trăng khuyết khéo léo thể hiện tinh thần 'Âm Dương giao thái, Càn Khôn nhật nguyệt'.",
      en: "Minh Mang's tomb epitomizes Confucian architectural symmetry along a rigorous 700m axis. The harmony between the geometric lakes and the crescent-shaped Tan Nguyet Lake around the circular mound visualizes the perpetual cosmic balance of Yin and Yang.",
      fr: "Le tombeau de Minh Mang illustre la perfection confucéenne le long d'un axe rectiligne de 700 m. Le lac du Croissant de Lune entourant le tumulus circulaire matérialise l'harmonie universelle du Yin et du Yang.",
      zh: "孝陵是儒家礼制建筑的巅峰。长达700米的中轴线上，宫殿与楼阁端庄肃穆。三日月形新月湖环抱圆形宝顶，尽显乾坤阴阳相生之妙。"
    }
  },
  {
    topic: "Quy định trang phục và văn hóa tham quan",
    keywords: ["trang phục", "quần áo", "vé", "giờ mở cửa", "chụp ảnh", "lưu ý", "dress code", "rules"],
    response: {
      vi: "Dạ thưa quý khách, khi tham quan các điện thờ và lăng tẩm hoàng gia Huế, quý khách vui lòng mặc trang phục lịch sự, áo có tay và quần hoặc váy dài qua gối. Không đội mũ nón và không chụp ảnh tại khu vực nội điện thờ vua và hoàng hậu. Giờ mở cửa thông thường từ 7h00 đến 17h30 hàng ngày.",
      en: "Respectful dress code is required when visiting imperial temples: shoulders and knees must be covered. Hats should be removed inside shrines, and photography is prohibited inside inner sanctums. Sites open daily from 7:00 AM to 5:30 PM.",
      fr: "Une tenue décente est exigée dans les temples et sanctuaires : épaules et genoux couverts. Les chapeaux doivent être retirés et les photos sont interdites à l'intérieur des autels royaux.",
      zh: "参观皇家殿宇与陵寝请着庄重服饰（上衣有袖、裤裙过膝）。进入正殿祭拜区域请脱帽，殿内严禁拍照。开放时间通常为每日7:00至17:30。"
    }
  }
];

/**
 * Hàm tìm kiếm câu trả lời nhanh từ RAG Knowledge Base
 */
export function queryRagKnowledge(question, lang = "vi") {
  const q = question.toLowerCase().trim();
  
  // Tìm kiếm theo keywords
  let bestMatch = null;
  let maxMatches = 0;

  for (const item of RAG_KNOWLEDGE) {
    let score = 0;
    for (const kw of item.keywords) {
      if (q.includes(kw.toLowerCase())) {
        score += 2;
      }
    }
    if (score > maxMatches) {
      maxMatches = score;
      bestMatch = item;
    }
  }

  if (bestMatch && maxMatches > 0) {
    return bestMatch.response[lang] || bestMatch.response["vi"] || bestMatch.response["en"];
  }

  // Fallback thông minh dựa trên ngôn ngữ
  const fallbacks = {
    vi: "Dạ thưa quý khách, theo ghi chép của Châu bản triều Nguyễn, các cung điện và lăng tẩm Cố đô Huế đều được các bậc tiền nhân tính toán phong thủy chi tiết để tạo nên sự hòa hợp giữa quyền uy hoàng gia và vẻ đẹp thiên nhiên hữu tình. Quý khách có thể bấm nghe thuyết minh âm thanh tại từng điểm di tích để khám phá trọn vẹn hơn!",
    en: "According to imperial annals of the Nguyen Dynasty, every palace and tomb in Hue was built following geomantic harmony between regal majesty and natural landscape. Please tap on any heritage point on the map to listen to detailed audio narration!",
    fr: "Selon les chroniques impériales, les tombeaux et palais de Hué sont conçus selon les préceptes sacrés du Feng Shui pour s'harmoniser avec la nature. N'hésitez pas à écouter le guide audio de chaque monument !",
    zh: "据阮朝大南实录记载，顺化每一座宫殿与皇陵皆顺应山川形胜与周易风水营建。您可以轻触地图上的景点聆听专属语音解说！"
  };

  return fallbacks[lang] || fallbacks["vi"];
}
