// --- ENGINE ALIGHT MOTION & SUPABASE AUTH ---
class AlightMotionAuth {
  constructor(config) {
    this.cfg = config;
  }

  generateCodeOrder() {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return (10000 + (array[0] % 90000)).toString();
  }

  extractOobCode(fullUrl) {
    if (!fullUrl) return null;
    try {
      let cleanUrl = fullUrl.replace(/&amp;/g, '&');
      try { cleanUrl = decodeURIComponent(cleanUrl); } catch(e) {}
      
      try {
        const urlObj = new URL(cleanUrl);
        let oobCode = urlObj.searchParams.get('oobCode');
        if (!oobCode) {
          const nestedLink = urlObj.searchParams.get('link') || urlObj.searchParams.get('q') || urlObj.searchParams.get('url');
          if (nestedLink) {
            try {
              const innerUrlObj = new URL(nestedLink);
              oobCode = innerUrlObj.searchParams.get('oobCode');
            } catch (e) {}
          }
        }
        if (oobCode) return oobCode.replace(/[^a-zA-Z0-9_-]/g, '');
      } catch (e) {}

      const match = cleanUrl.match(/[?&]oobCode=([a-zA-Z0-9_-]+)/i) || cleanUrl.match(/oobCode=([a-zA-Z0-9_-]+)/i);
      if (match) {
        return match[1];
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  async sendMagicLink(email) {
    try {
      await axios.post(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/createAuthUri?key=${this.cfg.API_KEY}`, { identifier: email, continueUri: "http://localhost" }, { headers: this.cfg.HEADERS });
      await axios.post(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/getOobConfirmationCode?key=${this.cfg.API_KEY}`, {
        requestType: 6,
        email: email,
        androidInstallApp: true,
        canHandleCodeInApp: true,
        continueUrl: "https://alightcreative.com?ui_sid=0366624874&ui_sd=0",
        iosBundleId: "com.alightcreative.motion",
        androidPackageName: "com.alightcreative.motion",
        androidMinimumVersion: "585",
        clientType: "CLIENT_TYPE_ANDROID"
      }, { headers: this.cfg.HEADERS });
      return { success: true, message: "Link berhasil dikirim." };
    } catch (error) {
      const errData = error.response?.data ? (typeof error.response.data === 'object' ? JSON.stringify(error.response.data) : error.message) : error.message;
      return { success: false, error: errData };
    }
  }

  async verifyAndFetchProfile(email, rawLink) {
    try {
      const oobCode = this.extractOobCode(rawLink);
      if (!oobCode) throw new Error("Gagal mengekstrak oobCode.");
      const signinRes = await axios.post(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/emailLinkSignin?key=${this.cfg.API_KEY}`, {
        email: email,
        oobCode: oobCode,
        clientType: "CLIENT_TYPE_ANDROID"
      }, { headers: this.cfg.HEADERS });

      const accountRes = await axios.post(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${this.cfg.API_KEY}`, { idToken: signinRes.data.idToken }, { headers: this.cfg.HEADERS });
      return { success: true, idToken: signinRes.data.idToken, user: accountRes.data.users[0] };
    } catch (error) {
      const errData = error.response?.data ? (typeof error.response.data === 'object' ? JSON.stringify(error.response.data) : error.message) : error.message;
      return { success: false, error: errData };
    }
  }

  async applyPremium(idToken, customProductId = null, customPrefix = null) {
    try {
      const codeorder = this.generateCodeOrder();
      const prefix = customPrefix ? customPrefix.trim() : this.cfg.DEFAULT_ORDER_ID;
      const prodId = customProductId ? customProductId : this.cfg.DEFAULT_PRODUCT_ID;

      const url = 'https://us-central1-alight-creative.cloudfunctions.net/verifyPurchase';
      const headers = {
        "authorization": "Bearer " + idToken,
        "firebase-instance-id-token": this.cfg.FIREBASE_INSTANCE_ID_TOKEN,
        "content-type": "application/json; charset=utf-8",
        "accept-encoding": "gzip",
        "user-agent": "okhttp/3.12.1"
      };
      const response = await axios.post(url, {
        data: {
          productId: prodId,
          token: this.cfg.TOKEN,
          skuType: this.cfg.SKU_TYPE,
          orderId: prefix + "-" + codeorder
        }
      }, { headers: headers });
      return { success: true, data: response.data, fullOrderId: prefix + "-" + codeorder };
    } catch (error) {
      const errData = error.response?.data ? (typeof error.response.data === 'object' ? JSON.stringify(error.response.data) : error.message) : error.message;
      return { success: false, error: errData };
    }
  }
}

// Inisialisasi Instance Auth menggunakan konfigurasi dari config.js
const amAuth = new AlightMotionAuth(AYAKA_CONFIG.ALIGHT_MOTION);

let supabaseClient = null;
try {
  if (AYAKA_CONFIG.SUPABASE_URL.includes("supabase.co") && !AYAKA_CONFIG.SUPABASE_URL.includes("your-project-id")) {
    supabaseClient = window.supabase.createClient(AYAKA_CONFIG.SUPABASE_URL, AYAKA_CONFIG.SUPABASE_ANON_KEY);
  }
} catch(e) {}