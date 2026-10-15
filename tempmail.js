/* =========================================================
   TEMPMAIL BLOK 1 — SETUP, DOMAIN, CREATE ACCOUNT
   ========================================================= */
if (typeof $ === "undefined") {
  window.$ = id => document.getElementById(id);
}

/* Semua request lewat proxy Vercel biar lolos CORS */
const TMP_API = "/api/proxy";

let tmpAccount   = null;
let tmpToken     = null;
let tmpMessages  = [];
let tmpPollTimer = null;

const tmpEl = {
  toggle:    $("tmpToggle"),
  panel:     $("tmpPanel"),
  label:     $("tmpLabel"),
  addr:      $("tmpAddr"),
  addrLabel: $("tmpAddrLabel"),
  copy:      $("tmpCopy"),
  refresh:   $("tmpRefresh"),
  use:       $("tmpUse"),
  inbox:     $("tmpInbox"),
  count:     $("tmpCount")
};

function tmpRandom(n) {
  const c = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

async function tmpGetDomain() {
  const r = await fetch(TMP_API + "/domains?page=1");
  if (!r.ok) throw new Error("Gagal ambil domain (HTTP " + r.status + ")");
  const d = await r.json();
  const list = d["hydra:member"] || [];

  if (list.length === 0) {
    throw new Error("Tidak ada domain aktif dari mail.tm");
  }

  const act = list.find(x => x.isActive && !x.isPrivate);
  return act ? act.domain : list[0].domain;
}

async function tmpCreateAccount() {
  const dom  = await tmpGetDomain();
  const addr = tmpRandom(10) + "@" + dom;
  const pass = tmpRandom(14);

  const r = await fetch(TMP_API + "/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: addr, password: pass })
  });
  if (!r.ok) {
    const errTxt = await r.text();
    throw new Error("Gagal buat akun: " + errTxt.slice(0, 80));
  }
  const acc = await r.json();

  const lr = await fetch(TMP_API + "/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: addr, password: pass })
  });
  const lg = await lr.json();
  if (!lg.token) throw new Error("Gagal login temp mail");

  tmpAccount = { address: addr, password: pass, id: acc.id };
  tmpToken   = lg.token;
  localStorage.setItem("mm_tmp", JSON.stringify(tmpAccount));
}

async function tmpRestoreAccount() {
  try {
    const saved = JSON.parse(localStorage.getItem("mm_tmp") || "null");
    if (saved && saved.address && saved.password) {
      const lr = await fetch(TMP_API + "/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: saved.address, password: saved.password })
      });
      const lg = await lr.json();
      if (lg.token) {
        tmpAccount = saved;
        tmpToken   = lg.token;
        return true;
      }
    }
  } catch (e) {}
  return false;
}
/* =========================================================
   TEMPMAIL BLOK 2 — FETCH, RENDER INBOX, BUKA PESAN
   ========================================================= */
async function tmpRelogin() {
  try {
    const lr = await fetch(TMP_API + "/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: tmpAccount.address,
        password: tmpAccount.password
      })
    });
    const lg = await lr.json();
    if (lg.token) tmpToken = lg.token;
  } catch (e) {}
}

async function tmpFetchMessages() {
  if (!tmpToken) return;
  try {
    const r = await fetch(TMP_API + "/messages?page=1", {
      headers: { Authorization: "Bearer " + tmpToken }
    });
    if (r.status === 401) { await tmpRelogin(); return; }
    const d = await r.json();
    tmpMessages = d["hydra:member"] || [];
    tmpRenderInbox();
  } catch (e) {
    console.error("Fetch error:", e);
  }
}

function tmpRenderInbox() {
  const c = tmpMessages.length;
  tmpEl.count.textContent = c + " pesan";
  if (!c) {
    tmpEl.inbox.innerHTML =
      '<div class="tmpempty">📭 Belum ada email masuk.<br>Tunggu atau refresh.</div>';
    return;
  }
  tmpEl.inbox.innerHTML = tmpMessages.map(m => {
    const from = m.from?.address || "?";
    const sub  = m.subject || "(tanpa subjek)";
    const snip = (m.intro || "").slice(0, 80);
    const time = new Date(m.createdAt)
      .toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const unr  = !m.seen ? "unread" : "";
    return `
      <div class="tmpitem ${unr}" data-id="${m.id}">
        <div class="tmpfrom"><span>${from}</span><span>${time}</span></div>
        <div class="tmpsub">${sub}</div>
        <div class="tmpsnip">${snip}</div>
      </div>`;
  }).join("");
  tmpEl.inbox.querySelectorAll(".tmpitem")
    .forEach(el => el.onclick = () => tmpOpenMessage(el.dataset.id));
}

async function tmpOpenMessage(id) {
  tmpEl.inbox.innerHTML =
    '<div class="tmploading"><i class="fa-solid fa-spinner fa-spin"></i> Memuat pesan...</div>';
  try {
    const r = await fetch(TMP_API + "/messages/" + id, {
      headers: { Authorization: "Bearer " + tmpToken }
    });
    const m = await r.json();

    let html = (m.html && m.html.length) ? m.html.join("\n") : (m.text || "(kosong)");
    html = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/on\w+="[^"]*"/gi, "");

    const links = [];
    const re = /https?:\/\/[^\s"'<>)]+/g;
    const txt = m.text || "";
    let mt;
    while ((mt = re.exec(txt))) if (!links.includes(mt[0])) links.push(mt[0]);

    const linkHtml = links.length
      ? `<div style="margin-top:14px;padding-top:12px;border-top:1px dashed #444">
           <div style="font-family:var(--mono);font-size:9px;color:#888;margin-bottom:8px">LINK TERDETEKSI:</div>
           ${links.map(u => `<div style="margin-bottom:6px"><a href="${u}" target="_blank">${u}</a></div>`).join("")}
         </div>`
      : "";

    tmpEl.inbox.innerHTML = `
      <div class="tmpback" id="tmpBack"><i class="fa-solid fa-arrow-left"></i> Kembali ke Inbox</div>
      <div class="tmpbody">
        <div style="font-weight:700;margin-bottom:8px;color:var(--cyan)">${m.subject || "(tanpa subjek)"}</div>
        <div style="font-size:10px;color:#888;margin-bottom:12px">Dari: ${m.from?.address || "?"}</div>
        <div style="white-space:pre-wrap">${html}</div>
        ${linkHtml}
      </div>`;
    $("tmpBack").onclick = () => { tmpRenderInbox(); };

    fetch(TMP_API + "/messages/" + id, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer " + tmpToken,
        "Content-Type": "application/merge-patch+json"
      },
      body: JSON.stringify({ seen: true })
    }).catch(() => {});
  } catch (e) {
    tmpEl.inbox.innerHTML = '<div class="tmpempty">Gagal memuat pesan.</div>';
  }
}
/* =========================================================
   TEMPMAIL BLOK 3 — INIT, EVENT, AUTO RESTORE
   ========================================================= */
async function tmpInit() {
  tmpEl.addrLabel.textContent = "Memuat...";
  try {
    const restored = await tmpRestoreAccount();
    if (!restored) await tmpCreateAccount();
    tmpEl.addr.value = tmpAccount.address;
    tmpEl.addrLabel.textContent = tmpAccount.address;
    await tmpFetchMessages();
    if (tmpPollTimer) clearInterval(tmpPollTimer);
    tmpPollTimer = setInterval(tmpFetchMessages, 8000);
  } catch (e) {
    console.error("tmpInit error:", e);
    tmpEl.addrLabel.textContent = "Gagal: " + e.message;
    tmpEl.inbox.innerHTML =
      '<div class="tmpempty">❌ ' + e.message + '<br>Coba refresh.</div>';
  }
}

tmpEl.toggle.onclick = () => {
  const open = tmpEl.panel.classList.toggle("open");
  tmpEl.toggle.classList.toggle("open", open);
  tmpEl.label.textContent = open
    ? "Tutup TempMail"
    : "Buka TempMail (Email Sementara)";
  if (open && !tmpAccount) tmpInit();
};

tmpEl.copy.onclick = async () => {
  if (!tmpEl.addr.value) return;
  try {
    await navigator.clipboard.writeText(tmpEl.addr.value);
    tmpEl.copy.innerHTML =
      '<i class="fa-solid fa-check" style="color:var(--green)"></i>';
    setTimeout(() =>
      tmpEl.copy.innerHTML = '<i class="fa-regular fa-copy"></i>', 1500);
  } catch (e) {}
};

tmpEl.refresh.onclick = async () => {
  tmpEl.refresh.querySelector("i").style.animation =
    "spin .8s linear infinite";
  await tmpFetchMessages();
  setTimeout(() =>
    tmpEl.refresh.querySelector("i").style.animation = "", 800);
};

tmpEl.use.onclick = () => {
  if (!tmpEl.addr.value) return;
  $("email").value = tmpEl.addr.value;
  $("email").dispatchEvent(new Event("input"));
  al("Email temp dimasukkan. Tekan Send untuk kirim magic link.", "ok");
  const sc1 = $("sc1");
  if (sc1) window.scrollTo({ top: sc1.offsetTop - 100, behavior: "smooth" });
};

setTimeout(() => {
  tmpRestoreAccount().then(ok => {
    if (ok) {
      tmpEl.addr.value = tmpAccount.address;
      tmpEl.addrLabel.textContent = tmpAccount.address;
      tmpFetchMessages();
    }
  });
}, 2000);