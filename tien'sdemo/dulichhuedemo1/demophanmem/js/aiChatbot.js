/**
 * Trợ Lý Ảo AI Cố Đô (RAG Chatbot Widget)
 * Đáp ứng Section 6.3 PRD
 */

import { queryRagKnowledge } from "./data/ragKnowledge.js";

export class AiChatbot {
  constructor(options = {}) {
    this.options = Object.assign({
      onMessage: () => {},
      onTyping: () => {}
    }, options);

    this.history = [];
    this.apiKey = localStorage.getItem("gemini_custom_api_key") || "";
    this.currentLang = "vi";

    // Lời chào mở đầu nhã nhặn cung đình
    this.initGreeting();
  }

  initGreeting() {
    const greetings = {
      vi: "Kính chào Quý khách! Thần là Trợ Lý Di Sản Cố Đô. Thần sẵn lòng giải đáp mọi điển tích, phong thủy và câu chuyện lịch sử 143 năm vương triều Nguyễn. Quý khách muốn tìm hiểu điều gì hôm nay?",
      en: "Greetings, noble guest! I am your Imperial Hue Heritage Assistant. Ask me anything about the Nguyen Dynasty's 143-year history, sacred geomancy, or royal palace architecture.",
      fr: "Salutations respectueuses ! Je suis votre guide impérial virtuel de Hué. Posez-moi toutes vos questions sur l'histoire, le Feng Shui et les tombeaux de la dynastie Nguyên.",
      zh: "尊敬的贵宾，您好！我是顺化古都历史随身助手。愿为您解答阮朝143年风云变幻、皇陵风水秘辛与宫廷建筑典故。"
    };

    const text = greetings[this.currentLang] || greetings["vi"];
    this.history.push({ role: "assistant", text, timestamp: new Date() });
  }

  setLanguage(lang) {
    this.currentLang = lang;
  }

  setApiKey(key) {
    this.apiKey = (key || "").trim();
    if (this.apiKey) {
      localStorage.setItem("gemini_custom_api_key", this.apiKey);
    } else {
      localStorage.removeItem("gemini_custom_api_key");
    }
  }

  /**
   * Gửi tin nhắn câu hỏi
   */
  async sendMessage(userInput) {
    const text = (userInput || "").trim();
    if (!text) return;

    // Lưu tin nhắn người dùng
    const userMsg = { role: "user", text, timestamp: new Date() };
    this.history.push(userMsg);
    this.options.onMessage(userMsg);

    // Bật hiệu ứng đang suy nghĩ
    this.options.onTyping(true);

    try {
      let botResponse = "";

      // Nếu có Gemini API Key thực tế và mạng online -> Gọi trực tiếp Gemini Flash
      if (this.apiKey) {
        botResponse = await this.callGeminiApi(text);
      }

      // Nếu không có API Key hoặc gọi API lỗi -> Sử dụng RAG Engine nội bộ với kho tri thức triều Nguyễn
      if (!botResponse) {
        // Tạo độ trễ nhẹ mô phỏng suy nghĩ RAG (< 1s)
        await new Promise(r => setTimeout(r, 600));
        botResponse = queryRagKnowledge(text, this.currentLang);
      }

      const botMsg = { role: "assistant", text: botResponse, timestamp: new Date() };
      this.history.push(botMsg);
      this.options.onMessage(botMsg);
    } catch (err) {
      console.warn("Lỗi AI Chatbot:", err);
      const fallback = queryRagKnowledge(text, this.currentLang);
      const botMsg = { role: "assistant", text: fallback, timestamp: new Date() };
      this.history.push(botMsg);
      this.options.onMessage(botMsg);
    } finally {
      this.options.onTyping(false);
    }
  }

  async callGeminiApi(prompt) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;
      const systemInstruction = "Bạn là Trợ lý Ảo Di Sản Cố Đô Huế. Hãy trả lời câu hỏi của du khách về lịch sử triều Nguyễn, kiến trúc Đại Nội và 9 lăng tẩm hoàng gia. Quy tắc nghiêm ngặt: Trả lời ngắn gọn dưới 150 từ, văn phong cung đình lịch thiệp, nhã nhặn, tôn trọng di sản và trả lời theo ngôn ngữ của câu hỏi.";
      
      const payload = {
        contents: [{ parts: [{ text: `${systemInstruction}\n\nCâu hỏi của du khách: ${prompt}` }] }],
        generationConfig: { maxOutputTokens: 250, temperature: 0.4 }
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Gemini HTTP error ${res.status}`);
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (e) {
      console.warn("Gemini Cloud call failed, falling back to local RAG KB:", e);
      return null;
    }
  }
}
