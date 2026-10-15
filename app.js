/* =========================================================
   APP BLOK 1 — INIT, PING, STATUS, CLOCK, UPTIME, NAV
   ========================================================= */
loadStats().then(() => {
  renderCounts();
  if (!localStorage.getItem("mm_counted")) {
    localStorage.setItem("mm_counted", "1");
    incStats("visitors");
  }
  tickUptime();
});
setInterval(loadStats, 5000);
setInterval(renderCounts, 1000);

const t0 = Date.now();
fetch(API_BASE, { method: "HEAD", cache: "no-store" })
  .then(() => {
    const ms = Date.now() - t0;
    $("ping").textContent = ms + "ms";
    $("latVal").innerHTML = ms + "<small>ms</small>";
  })
  .catch(() => {
    const ms = Date.now() - t0;
    $("ping").textContent = ms + "ms";
    $("latVal").innerHTML = ms + "<small>ms</small>";
  });

const setStatus = on => {
  $("statusPill").classList.toggle("off", !on);
  $("statTxt").textContent = on ? "ONLINE" : "OFFLINE";
};
addEventListener("online",  () => setStatus(1));
addEventListener("offline", () => setStatus(0));
setStatus(navigator.onLine);

const dd = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];
const mm = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

function tickClock() {
  const n = new Date();
  $("dateVal").textContent =
    `${dd[n.getDay()]}, ${n.getDate()} ${mm[n.getMonth()]} ${n.getFullYear()}`;
  $("timeVal").textContent =
    `${pad2(n.getHours())}:${pad2(n.getMinutes())}:${pad2(n.getSeconds())} WIB`;
}
tickClock();
setInterval(tickClock, 1000);

function tickUptime() {
  const fl   = globalStats.first_launch || Date.now();
  const diff = Math.max(0, Date.now() - fl);
  const dy   = Math.floor(diff / 86400000);
  const hh   = Math.floor((diff % 86400000) / 3600000);
  const mi   = Math.floor((diff % 3600000) / 60000);
  const ss   = Math.floor((diff % 60000) / 1000);
  $("uptimeVal").textContent = `${dy}d ${pad2(hh)}h ${pad2(mi)}m ${pad2(ss)}s`;
  $("qUptimeD").textContent  = dy;
  $("qUptimeH").textContent  = pad2(hh);
  $("qUptimeM").textContent  = pad2(mi);
}
setInterval(tickUptime, 1000);

const views = { dash: "vDash", act: "vAct", hist: "vHist", support: "vSupport" };
document.querySelectorAll(".nb").forEach(b => b.onclick = () => {
  const t      = b.dataset.t;
  const target = $(views[t]);
  const cur    = document.querySelector(".view.show");
  if (cur === target) return;
  document.querySelectorAll(".nb").forEach(x => x.classList.toggle("on", x === b));
  document.querySelectorAll(".view").forEach(id => id.classList.remove("show", "enter"));
  target.classList.add("show", "enter");
  if (t === "hist") renderHist();
  window.scrollTo({ top: 0, behavior: "instant" });
});

const goStep = n => [1,2,3].forEach(i => {
  const el = $("sc" + i);
  el.classList.remove("active", "done");
  if (i === n) el.classList.add("active");
  else if (i < n) el.classList.add("done");
});

const al = (m, t) => {
  const b = $("alert");
  b.className = "alert show" + (t ? " " + t : "");
  $("alertText").textContent = m;
};
const hA = () => $("alert").className = "alert";
const pErr = d => !d ? "Error" :
  (typeof d.error === "object" && d.error) ? (d.error.message || "Gagal") :
  (typeof d.error === "string") ? d.error : (d.message || "Gagal");
/* =========================================================
   APP BLOK 2 — RIWAYAT & STRUK
   ========================================================= */
const getHist = () => {
  try { return JSON.parse(localStorage.getItem("mm_hist")) || []; }
  catch { return []; }
};
const saveHist = h => localStorage.setItem("mm_hist", JSON.stringify(h));
const addHist  = e => {
  const h = getHist();
  h.unshift(e);
  if (h.length > 50) h.pop();
  saveHist(h);
};
const fmt = ts => {
  const d  = new Date(ts);
  const m2 = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][d.getMonth()];
  return `${pad2(d.getDate())} ${m2} ${d.getFullYear()} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
const fmtFull = ts => new Date(ts).toLocaleString("id-ID", {
  day: "2-digit", month: "long", year: "numeric",
  hour: "2-digit", minute: "2-digit", second: "2-digit"
});

const renderHist = () => {
  const h    = getHist();
  const list = $("histList");
  if (!h.length) {
    list.innerHTML = '<div class="hempty"><i class="fa-regular fa-folder-open"></i>Belum ada riwayat.<br>Akun aktif akan muncul di sini.</div>';
    return;
  }
  list.innerHTML = h.map((it, i) => `
    <div class="hitem ${it.status === "pending" ? "pend" : ""}" data-i="${i}">
      <span class="hdot"></span>
      <div class="hmain">
        <div class="hmail">${it.email}</div>
        <div class="hmeta">
          <span><i class="fa-regular fa-clock"></i> ${fmt(it.ts)}</span>
          <span>${it.id}</span>
        </div>
      </div>
      <div class="hstat">${it.status === "success" ? "Premium" : "Pending"}</div>
    </div>`).join("");
  list.querySelectorAll(".hitem")
    .forEach(el => el.onclick = () => openStruk(+el.dataset.i));
};

const openStruk = i => {
  const it = getHist()[i];
  if (!it) return;
  $("strukBox").innerHTML = `
    <div class="sh"><h3>MAUL MOTION</h3><p>Alight Motion Premium</p></div>
    <div class="sm">
      <div class="r"><span>Struk</span><b>${it.id}</b></div>
      <div class="r"><span>Tanggal</span><b>${fmtFull(it.ts)}</b></div>
      ${it.verifiedAt ? `<div class="r"><span>Aktif</span><b>${fmtFull(it.verifiedAt)}</b></div>` : ""}
    </div>
    <div class="sa">
      <div class="r"><span>Item</span><span>1 EA</span></div>
      <div class="r"><span>Email</span><span style="word-break:break-all;text-align:right">${it.email}</span></div>
      <div class="r"><span>Service</span><span>AM Premium</span></div>
      <div class="r"><span>Durasi</span><span>365 Hari</span></div>
      <div class="r"><span>Server</span><span>MAUL MOTION</span></div>
      <div class="r tot"><span>TOTAL</span><span>FREE</span></div>
    </div>
    <div class="sf">
      <div class="thxnote">Terima kasih telah mempercayai MAUL MOTION.</div>
      <div class="cd">Bila terjadi masalah hubungi 0831-8994-6689</div>
    </div>
    <button class="sclose" onclick="document.getElementById('strukPop').classList.remove('show')">Tutup</button>`;
  $("strukPop").classList.add("show");
};
/* =========================================================
   APP BLOK 3 — AKTIVASI, RESET, SUPPORT, INIT
   ========================================================= */
let cachedEmail = "";

$("email").oninput = () => {
  $("actBtn").disabled = !$("email").value.includes("@") || !cachedEmail;
};

$("sendBtn").onclick = async () => {
  const e = $("email").value.trim();
  if (!e.includes("@")) return al("Email tidak valid.", "err");
  const b = $("sendBtn"), tx = $("sendTx");
  b.disabled = 1; tx.textContent = "..."; hA(); cachedEmail = "";
  try {
    const r = await fetch(API_BASE + "/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Bypass-Key": BYPASS_KEY },
      body: JSON.stringify({ gmail: e })
    });
    const d = await r.json();
    if (r.ok && d.success) {
      cachedEmail = e;
      addHist({ id: "#MM" + Date.now().toString().slice(-6), email: e, status: "pending", ts: Date.now() });
      al("Magic Link terkirim! Cek inbox email.", "ok");
      $("actBtn").disabled = 0;
      tx.textContent = "Sent";
      goStep(2);
      setTimeout(() => { tx.textContent = "Send"; b.disabled = 0; }, 2500);
    } else {
      al(pErr(d), "err"); tx.textContent = "Send"; b.disabled = 0;
    }
  } catch {
    al("Koneksi gagal.", "err"); tx.textContent = "Send"; b.disabled = 0;
  }
};

$("actBtn").onclick = async () => {
  const m = $("magic").value.trim();
  if (!cachedEmail) return al("Tekan Send dulu.", "err");
  if (!m.startsWith("http")) return al("Tempel Magic Link lengkap.", "err");
  hA();
  $("load").classList.add("show");
  const b = $("actBtn"), tx = $("actText");
  b.disabled = 1; tx.textContent = "Memproses...";
  try {
    const r = await fetch(API_BASE + "/api/verif", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Bypass-Key": BYPASS_KEY },
      body: JSON.stringify({ gmail: cachedEmail, link: m })
    });
    const d = await r.json();
    $("load").classList.remove("show");
    if (r.ok && d.success) {
      goStep(3); tx.textContent = "Activated";
      const h = getHist();
      const idx = h.findIndex(x => x.email === cachedEmail && x.status === "pending");
      if (idx >= 0) { h[idx].status = "success"; h[idx].verifiedAt = Date.now(); saveHist(h); }
      else addHist({ id: "#MM" + Date.now().toString().slice(-6), email: cachedEmail, status: "success", ts: Date.now(), verifiedAt: Date.now() });
      incStats("activations");
      $("popMsg").textContent = "Akun " + cachedEmail + " aktif Premium 365 hari. Struk tersimpan di riwayat.";
      $("pop").classList.add("show");
      cachedEmail = "";
    } else {
      al(pErr(d), "err"); b.disabled = 0; tx.textContent = "Activate Premium";
    }
  } catch {
    $("load").classList.remove("show");
    al("Koneksi gagal.", "err"); b.disabled = 0; tx.textContent = "Activate Premium";
  }
};

window.resetAktivasi = function () {
  $("pop").classList.remove("show");
  $("email").value = ""; $("magic").value = ""; cachedEmail = "";
  $("actBtn").disabled = true;
  $("sendBtn").disabled = false;
  $("sendTx").textContent = "Send";
  $("actText").textContent = "Activate Premium";
  goStep(1); hA();
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => $("email").focus(), 300);
};

$("sendReport").onclick = () => {
  const n = $("repName").value.trim();
  const e = $("repEmail").value.trim();
  const c = $("repCat").value;
  const m = $("repMsg").value.trim();
  if (!n) return alert("Isi nama kamu dulu");
  if (!m) return alert("Isi laporan kamu");
  const tgl = new Date().toLocaleString("id-ID", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
  const text = `*LAPORAN — MAUL MOTION*\n${"=".repeat(28)}\n\n*Nama:* ${n}\n*Kontak:* ${e || "-"}\n*Kategori:* ${c}\n*Tanggal:* ${tgl}\n\n*Isi Laporan:*\n${m}\n\n${"=".repeat(28)}\n_Dikirim dari MAUL MOTION_`;
  open(`https://wa.me/${OWNER_WA}?text=${encodeURIComponent(text)}`, "_blank");
};

goStep(1);