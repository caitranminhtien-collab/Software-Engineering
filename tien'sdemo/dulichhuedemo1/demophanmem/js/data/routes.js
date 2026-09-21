/**
 * Tuyến Lộ Trình Đề Xuất (Route Recommendations)
 * Phù hợp với thời gian và nhu cầu thực tế của du khách theo PRD
 */
export const ROUTES_DATA = [
  {
    id: "route_half_day",
    title: "Tour Nửa Ngày (Gần Trung Tâm)",
    subtitle: "Khám phá cung đình hoa lệ & dấu ấn cận đại",
    duration: "4 tiếng",
    distance: "10.7 km",
    poiCount: 4,
    poiIds: ["POI_00", "POI_02", "POI_03", "POI_01"],
    tag: "Phù hợp gia đình & người ít thời gian",
    color: "#D4AF37",
    description: "Khởi hành từ Đại Nội, dạo bước qua lâu đài Cung An Định phong cách Âu - Á, chiêm bái Đàn Nam Giao linh thiêng và lắng đọng tại An Lăng của 3 vị vua yêu nước.",
    itineraryWaypoints: [
      [16.4699, 107.5786], // Đại Nội
      [16.4650, 107.5850], // Cầu Trường Tiền / Sông Hương
      [16.4528, 107.5969], // Cung An Định
      [16.4420, 107.5880], // Đường Ngự Bình
      [16.4358, 107.5786], // Đàn Nam Giao
      [16.4400, 107.5850], // Chuyển hướng Duy Tân
      [16.4447, 107.5922]  // Lăng Dục Đức
    ]
  },
  {
    id: "route_full_day",
    title: "Tour 1 Ngày Kinh Điển",
    subtitle: "Tuyệt tác lăng tẩm & đỉnh cao kiến trúc triều Nguyễn",
    duration: "8 tiếng",
    distance: "34.8 km",
    poiCount: 5,
    poiIds: ["POI_00", "POI_05", "POI_04", "POI_07", "POI_08"],
    tag: "Khuyên dùng - Đầy đủ nhất",
    color: "#8B1E1E",
    description: "Hành trình trọn vẹn chiêm ngưỡng sự tráng lệ của Đại Nội, nét thi ca lãng mạn Khiêm Lăng, phù điêu sành sứ lộng lẫy Lăng Khải Định và sự tôn nghiêm đối xứng Nho giáo tại Lăng Minh Mạng.",
    itineraryWaypoints: [
      [16.4699, 107.5786], // Đại Nội
      [16.4550, 107.5670], // Bờ sông Hương Tây Nam
      [16.4331, 107.5653], // Lăng Tự Đức
      [16.4350, 107.5614], // Lăng Đồng Khánh
      [16.4150, 107.5800], // Hướng núi Châu Chữ
      [16.3986, 107.5906], // Lăng Khải Định
      [16.3886, 107.5714]  // Lăng Minh Mạng
    ]
  },
  {
    id: "route_origin",
    title: "Tour Khám Phá Nguồn Cội",
    subtitle: "Chạm tới cội nguồn giang sơn vương triều",
    duration: "6 - 7 tiếng",
    distance: "22.5 km",
    poiCount: 4,
    poiIds: ["POI_00", "POI_05", "POI_08", "POI_09"],
    tag: "Dành cho người yêu thiên nhiên & lịch sử",
    color: "#1A433A",
    description: "Hành trình xuôi dòng Hương giang về tận vùng non cao Định Môn, chiêm bái Thiên Thọ Lăng của vua Gia Long và Thừa Thiên Cao Hoàng hậu giữa 42 ngọn đồi thông xanh ngát.",
    itineraryWaypoints: [
      [16.4699, 107.5786], // Đại Nội
      [16.4331, 107.5653], // Lăng Tự Đức
      [16.3886, 107.5714], // Lăng Minh Mạng
      [16.3680, 107.5800], // Thượng nguồn Tả Trạch
      [16.3494, 107.5856]  // Lăng Gia Long
    ]
  }
];
