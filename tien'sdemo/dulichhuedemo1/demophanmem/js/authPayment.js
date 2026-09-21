/**
 * Quản Lý Quyền Truy Cập & Cổng Thanh Toán (Claim Code & VNPay/Payoo Simulation)
 * Đáp ứng Section 6.1 PRD
 */

const STORAGE_KEY = "hue_tour_access_token";
const VALID_CLAIM_CODES = ["HUE2026", "ROYALTOUR", "VIPPASS", "CODO2026", "HERITAGE100"];

export class AuthPaymentService {
  constructor(options = {}) {
    this.options = Object.assign({
      onAccessStatusChange: () => {}
    }, options);

    this.token = localStorage.getItem(STORAGE_KEY) || null;
    this.tokenData = this.loadTokenData();
  }

  loadTokenData() {
    if (!this.token) return null;
    try {
      return JSON.parse(atob(this.token));
    } catch {
      return { plan: "full_access", issuedAt: Date.now() };
    }
  }

  isUnlocked() {
    return !!this.token;
  }

  canAccessPoi(poi) {
    if (!poi) return false;
    // POI_00 (Đại Nội) là mốc dùng thử miễn phí
    if (poi.isFree || poi.id === "POI_00") return true;
    return this.isUnlocked();
  }

  /**
   * Kích hoạt vé bằng Claim Code (Vé giấy / tiền mặt tại quầy)
   */
  claimWithCode(code) {
    const cleanCode = (code || "").trim().toUpperCase();
    if (VALID_CLAIM_CODES.includes(cleanCode)) {
      const payload = {
        plan: "claimed_code",
        code: cleanCode,
        activatedAt: Date.now(),
        method: "cash_counter"
      };
      this.token = btoa(JSON.stringify(payload));
      localStorage.setItem(STORAGE_KEY, this.token);
      this.tokenData = payload;
      this.options.onAccessStatusChange(true, payload);
      return { success: true, message: `Kích hoạt thành công mã ${cleanCode}! Đã mở khóa trọn bộ 10 di tích.` };
    }
    return { success: false, message: "Mã kích hoạt không đúng hoặc đã hết hạn. Hãy thử mã HUE2026 hoặc VIPPASS!" };
  }

  /**
   * Hoàn tất thanh toán trực tuyến (Mô phỏng cổng VNPay / Payoo Webhook)
   */
  completeOnlinePayment(planId, gateway = "VNPay") {
    const payload = {
      plan: planId,
      gateway: gateway,
      transactionId: "TX_" + Date.now().toString(36).toUpperCase(),
      activatedAt: Date.now(),
      amount: planId === "vip" ? 149000 : 99000
    };
    this.token = btoa(JSON.stringify(payload));
    localStorage.setItem(STORAGE_KEY, this.token);
    this.tokenData = payload;
    this.options.onAccessStatusChange(true, payload);
    return payload;
  }

  /**
   * Đặt lại trạng thái (Khóa lại để test)
   */
  resetAccess() {
    localStorage.removeItem(STORAGE_KEY);
    this.token = null;
    this.tokenData = null;
    this.options.onAccessStatusChange(false, null);
  }
}
