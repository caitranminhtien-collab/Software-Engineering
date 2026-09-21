/**
 * 4-Tier Audio Narration Engine
 * Đáp ứng Section 6.2 PRD:
 * - Chuông cung đình mào đầu (Web Audio API Gong/Chime)
 * - Đọc thuyết minh đa ngữ (SpeechSynthesis TTS)
 * - Hỗ trợ điều khiển tua, dừng, chỉnh tốc độ
 * - Quản lý trạng thái phát & transcript phụ đề
 */

export class AudioEngine {
  constructor(options = {}) {
    this.options = Object.assign({
      onStateChange: () => {},
      onProgress: () => {},
      onPoiChange: () => {}
    }, options);

    this.currentPoi = null;
    this.currentLang = "vi";
    this.isPlaying = false;
    this.isPaused = false;
    this.playbackRate = 1.0;
    this.currentTime = 0;
    this.duration = 60; // Ước lượng giây
    this.timer = null;

    // Khởi tạo Web Audio Context cho âm chuông cung đình
    this.audioCtx = null;
    this.synth = window.speechSynthesis;
    this.utterance = null;
    this.voices = [];

    this.initVoices();
  }

  initVoices() {
    if (!this.synth) return;
    const loadVoices = () => {
      this.voices = this.synth.getVoices();
    };
    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Phát tiếng chuông khánh/chuông chùa Thiên Mụ trầm ấm mở đầu bài thuyết minh
   * Dùng Web Audio API tổng hợp âm sắc chuông đồng
   */
  playRoyalChime() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Tần số chuông đồng truyền thống (nốt Sol thăng ~ 207Hz và họa âm)
      const freqs = [207.65, 415.3, 560, 830.6];
      const gains = [0.4, 0.25, 0.15, 0.1];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = idx === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq, now);

        gainNode.gain.setValueAtTime(gains[idx], now);
        // Hiệu ứng ngân vang giảm dần sau 2.5 giây
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 2.8);
      });
    } catch (err) {
      console.warn("Không thể phát chuông cung đình:", err);
    }
  }

  /**
   * Kích hoạt phát bài thuyết minh cho một POI
   * @param {Object} poi POI object
   * @param {string} lang Mã ngôn ngữ (vi, en, fr, zh, ja, ko)
   * @param {boolean} withChime Có phát chuông mở đầu không
   */
  playPoi(poi, lang = this.currentLang, withChime = true) {
    if (!poi) return;
    this.stop();

    this.currentPoi = poi;
    this.currentLang = lang;
    this.options.onPoiChange(poi, lang);

    if (withChime) {
      this.playRoyalChime();
      // Chờ 0.8 giây cho chuông ngân rồi bắt đầu đọc lời bình
      setTimeout(() => {
        this.startNarration(poi, lang);
      }, 700);
    } else {
      this.startNarration(poi, lang);
    }
  }

  startNarration(poi, lang) {
    const text = poi.narrations[lang] || poi.narrations["vi"] || poi.narrations["en"];
    if (!text) return;

    // Tính toán độ dài ước tính (trung bình ~130 từ/phút)
    const wordCount = text.split(/\s+/).length;
    this.duration = Math.max(20, Math.round((wordCount / 2.5) / this.playbackRate));
    this.currentTime = 0;

    if (this.synth) {
      this.synth.cancel(); // Dừng câu trước đó

      this.utterance = new SpeechSynthesisUtterance(text);
      this.utterance.rate = this.playbackRate;
      this.utterance.pitch = 1.0;

      // Chọn giọng đọc phù hợp theo ngôn ngữ
      const langCodeMap = {
        vi: "vi-VN",
        en: "en-US",
        fr: "fr-FR",
        zh: "zh-CN",
        ja: "ja-JP",
        ko: "ko-KR"
      };
      const targetLang = langCodeMap[lang] || "vi-VN";
      this.utterance.lang = targetLang;

      const voice = this.voices.find(v => v.lang && v.lang.startsWith(targetLang.split("-")[0]));
      if (voice) {
        this.utterance.voice = voice;
      }

      this.utterance.onstart = () => {
        this.isPlaying = true;
        this.isPaused = false;
        this.startTimer();
        this.options.onStateChange({ isPlaying: true, isPaused: false, currentPoi: this.currentPoi });
      };

      this.utterance.onend = () => {
        this.isPlaying = false;
        this.isPaused = false;
        this.stopTimer();
        this.currentTime = this.duration;
        this.options.onProgress(this.duration, this.duration);
        this.options.onStateChange({ isPlaying: false, isPaused: false, currentPoi: this.currentPoi });
      };

      this.utterance.onerror = (e) => {
        console.warn("Lỗi SpeechSynthesis:", e);
        this.isPlaying = false;
        this.stopTimer();
        this.options.onStateChange({ isPlaying: false, isPaused: false, currentPoi: this.currentPoi });
      };

      this.synth.speak(this.utterance);
    } else {
      // Fallback timer simulation nếu trình duyệt không hỗ trợ Web Speech
      this.isPlaying = true;
      this.isPaused = false;
      this.startTimer();
      this.options.onStateChange({ isPlaying: true, isPaused: false, currentPoi: this.currentPoi });
    }
  }

  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      if (this.isPlaying && !this.isPaused) {
        this.currentTime += 0.5;
        if (this.currentTime >= this.duration) {
          this.currentTime = this.duration;
          this.stop();
        } else {
          this.options.onProgress(this.currentTime, this.duration);
        }
      }
    }, 500);
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  pause() {
    if (this.synth && this.isPlaying && !this.isPaused) {
      this.synth.pause();
      this.isPaused = true;
      this.options.onStateChange({ isPlaying: true, isPaused: true, currentPoi: this.currentPoi });
    }
  }

  resume() {
    if (this.synth && this.isPlaying && this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
      this.options.onStateChange({ isPlaying: true, isPaused: false, currentPoi: this.currentPoi });
    } else if (!this.isPlaying && this.currentPoi) {
      this.playPoi(this.currentPoi, this.currentLang, false);
    }
  }

  togglePlay() {
    if (!this.isPlaying) {
      if (this.currentPoi) {
        this.playPoi(this.currentPoi, this.currentLang, false);
      }
    } else if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    this.stopTimer();
    this.isPlaying = false;
    this.isPaused = false;
    this.currentTime = 0;
    this.options.onStateChange({ isPlaying: false, isPaused: false, currentPoi: this.currentPoi });
  }

  rewind(seconds = 10) {
    this.currentTime = Math.max(0, this.currentTime - seconds);
    this.options.onProgress(this.currentTime, this.duration);
    if (this.currentPoi) {
      // Khởi động lại câu từ đầu
      this.playPoi(this.currentPoi, this.currentLang, false);
    }
  }

  forward(seconds = 10) {
    this.currentTime = Math.min(this.duration, this.currentTime + seconds);
    this.options.onProgress(this.currentTime, this.duration);
  }

  setRate(rate) {
    this.playbackRate = rate;
    if (this.isPlaying && this.currentPoi) {
      this.playPoi(this.currentPoi, this.currentLang, false);
    }
  }

  setLanguage(lang) {
    this.currentLang = lang;
    if (this.isPlaying && this.currentPoi) {
      this.playPoi(this.currentPoi, lang, false);
    }
  }
}
