const { useState, useEffect, useMemo, createElement: h } = React;
const KEY = "catatan-keuangan-v2",
  OLD = "catatan-keuangan-v1",
  TKEY = "catatan-keuangan-tema";
const KAT = {
  keluar: [
    "Makanan",
    "Transportasi",
    "Belanja",
    "Tagihan",
    "Hiburan",
    "Kesehatan",
    "Pendidikan",
    "Lainnya",
  ],
  masuk: ["Gaji", "Bonus", "Usaha", "Investasi", "Lainnya"],
};
const rp = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
const hariIni = () => new Date().toISOString().slice(0, 10);
const tgl = (s) =>
  new Date(s + "T00:00:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const bln = (m) =>
  new Date(m + "-01T00:00:00").toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
const blnPendek = (m) =>
  new Date(m + "-01T00:00:00").toLocaleDateString("id-ID", { month: "short" });
const geser = (m, d) => {
  const [y, mo] = m.split("-").map(Number);
  const dt = new Date(y, mo - 1 + d, 1);
  return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0");
};
const kosong = () => ({
  id: null,
  jenis: "keluar",
  jumlah: "",
  kategori: "Makanan",
  catatan: "",
  tanggal: hariIni(),
});

function muat() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.tx)) return d;
    const lama = JSON.parse(localStorage.getItem(OLD));
    if (Array.isArray(lama)) return { tx: lama, budgets: {} };
  } catch (e) {}
  return { tx: [], budgets: {} };
}

function Chart({ data, bulan }) {
  const ms = [...Array(12)].map((_, i) => geser(bulan, i - 11));
  let run = data.saldoAwal || 0;
  data.tx.forEach((t) => {
    if (t.tanggal.slice(0, 7) < ms[0])
      run += t.jenis === "masuk" ? t.jumlah : -t.jumlah;
  });
  const pts = ms.map((m) => {
    data.tx.forEach((t) => {
      if (t.tanggal.startsWith(m))
        run += t.jenis === "masuk" ? t.jumlah : -t.jumlah;
    });
    return run;
  });
  const W = 600,
    H = 210,
    pl = 46,
    pt = 12,
    pb = 26;
  const mn = Math.min(0, ...pts),
    mx = Math.max(mn + 1, ...pts);
  const x = (i) => pl + (i * (W - pl - 10)) / 11;
  const y = (v) => pt + (H - pt - pb) * (1 - (v - mn) / (mx - mn));
  let d = "M" + x(0) + "," + y(pts[0]);
  for (let i = 1; i < 12; i++) {
    const cx = (x(i - 1) + x(i)) / 2;
    d +=
      " C" +
      cx +
      "," +
      y(pts[i - 1]) +
      " " +
      cx +
      "," +
      y(pts[i]) +
      " " +
      x(i) +
      "," +
      y(pts[i]);
  }
  const area =
    d + " L" + x(11) + "," + y(mn) + " L" + x(0) + "," + y(mn) + " Z";
  const fmt = (v) =>
    Math.abs(v) >= 1e6
      ? (v / 1e6).toFixed(1).replace(".0", "") + "jt"
      : Math.abs(v) >= 1e3
        ? Math.round(v / 1e3) + "rb"
        : String(Math.round(v));
  const ticks = [0, 1, 2, 3].map((k) => mn + ((mx - mn) * k) / 3);
  return h(
    "div",
    { className: "chart" },
    h(
      "svg",
      {
        viewBox: "0 0 " + W + " " + H,
        role: "img",
        "aria-label": "Tren saldo 12 bulan",
      },
      h(
        "defs",
        null,
        h(
          "linearGradient",
          { id: "ar", x1: 0, y1: 0, x2: 0, y2: 1 },
          h("stop", { offset: "0%", stopColor: "#2dd4bf", stopOpacity: 0.55 }),
          h("stop", { offset: "100%", stopColor: "#2dd4bf", stopOpacity: 0 }),
        ),
        h(
          "filter",
          { id: "gl", x: "-20%", y: "-20%", width: "140%", height: "140%" },
          h("feGaussianBlur", { stdDeviation: 3, result: "b" }),
          h(
            "feMerge",
            null,
            h("feMergeNode", { in: "b" }),
            h("feMergeNode", { in: "SourceGraphic" }),
          ),
        ),
      ),
      ticks.map((v, k) =>
        h(
          "g",
          { key: k },
          h("line", {
            x1: pl,
            x2: W - 6,
            y1: y(v),
            y2: y(v),
            stroke: "rgba(255,255,255,.07)",
          }),
          h("text", { x: pl - 6, y: y(v) + 3, textAnchor: "end" }, fmt(v)),
        ),
      ),
      h("path", { d: area, fill: "url(#ar)" }),
      h("path", {
        d,
        fill: "none",
        stroke: "#5eead4",
        strokeWidth: 2.5,
        strokeLinecap: "round",
        filter: "url(#gl)",
      }),
      h("circle", {
        cx: x(11),
        cy: y(pts[11]),
        r: 4,
        fill: "#5eead4",
        filter: "url(#gl)",
      }),
      ms.map((m, k) =>
        h(
          "text",
          { key: m, x: x(k), y: H - 8, textAnchor: "middle" },
          blnPendek(m),
        ),
      ),
    ),
  );
}

function App() {
  const [data, setData] = useState(muat);
  const [tab, setTab] = useState("ringkasan");
  const [bulan, setBulan] = useState(hariIni().slice(0, 7));
  const [semua, setSemua] = useState(false);
  const [f, setF] = useState(kosong);
  const [cari, setCari] = useState("");
  const [fJenis, setFJenis] = useState("semua");
  const [fKat, setFKat] = useState("semua");
  const [ok, setOk] = useState("");
  const [editSaldo, setEditSaldo] = useState(false);
  const [inputSaldo, setInputSaldo] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {}
  }, [data]);
  useEffect(() => {
    try {
      const t = localStorage.getItem(TKEY);
      if (t) document.documentElement.dataset.theme = t;
    } catch (e) {}
  }, []);
  const tema = () => {
    const el = document.documentElement;
    const gelap = el.dataset.theme
      ? el.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    el.dataset.theme = gelap ? "light" : "dark";
    try {
      localStorage.setItem(TKEY, el.dataset.theme);
    } catch (e) {}
  };

  const periode = useMemo(
    () => data.tx.filter((t) => semua || t.tanggal.startsWith(bulan)),
    [data, bulan, semua],
  );
  const s = useMemo(() => {
    let masuk = 0,
      keluar = 0;
    const per = {};
    periode.forEach((t) => {
      if (t.jenis === "masuk") masuk += t.jumlah;
      else {
        keluar += t.jumlah;
        per[t.kategori] = (per[t.kategori] || 0) + t.jumlah;
      }
    });
    let total = data.saldoAwal || 0;
    data.tx.forEach(
      (t) => (total += t.jenis === "masuk" ? t.jumlah : -t.jumlah),
    );
    return { masuk, keluar, per, total };
  }, [periode, data]);
  const katList = Object.entries(s.per).sort((a, b) => b[1] - a[1]);

  const simpan = (e) => {
    e.preventDefault();
    const n = Number(f.jumlah);
    if (!n || n <= 0) return;
    const t = {
      id: f.id || Date.now(),
      jenis: f.jenis,
      jumlah: n,
      kategori: f.kategori,
      catatan: f.catatan.trim(),
      tanggal: f.tanggal,
    };
    setData({
      ...data,
      tx: f.id ? data.tx.map((x) => (x.id === f.id ? t : x)) : [t, ...data.tx],
    });
    setF({
      ...kosong(),
      jenis: f.jenis,
      kategori: KAT[f.jenis][0],
      tanggal: f.tanggal,
    });
    setBulan(t.tanggal.slice(0, 7));
    setSemua(false);
    setOk("Tersimpan ✓");
    setTimeout(() => setOk(""), 2500);
  };
  const simpanSaldo = (e) => {
    e.preventDefault();
    const target = Number(inputSaldo);
    if (inputSaldo === "" || isNaN(target)) return;
    setData({ ...data, saldoAwal: target - (s.total - (data.saldoAwal || 0)) });
    setEditSaldo(false);
  };
  const edit = (t) => {
    setF({ ...t, jumlah: String(t.jumlah) });
    setTab("transaksi");
    window.scrollTo(0, 0);
  };
  const hapus = (id) =>
    setData({ ...data, tx: data.tx.filter((t) => t.id !== id) });

  const daftar = periode
    .filter(
      (t) =>
        (fJenis === "semua" || t.jenis === fJenis) &&
        (fKat === "semua" || t.kategori === fKat) &&
        (!cari ||
          (t.catatan + " " + t.kategori)
            .toLowerCase()
            .includes(cari.toLowerCase())),
    )
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.id - a.id);

  const kartu = (j, n, k) =>
    h(
      "div",
      { className: "card" },
      h("div", { className: "lbl" }, j),
      h("div", { className: "big " + (k || "") }, rp(n)),
    );
  const baris = (t) =>
    h(
      "div",
      { className: "row", key: t.id },
      h(
        "div",
        { className: "info" },
        h("b", null, t.catatan || t.kategori),
        h("span", { className: "lbl" }, t.kategori + " · " + tgl(t.tanggal)),
      ),
      h(
        "b",
        { className: t.jenis === "masuk" ? "in" : "out" },
        (t.jenis === "masuk" ? "+" : "−") + rp(t.jumlah),
      ),
      h(
        "button",
        { className: "ic", title: "Ubah", onClick: () => edit(t) },
        "✎",
      ),
      h(
        "button",
        { className: "ic", title: "Hapus", onClick: () => hapus(t.id) },
        "✕",
      ),
    );

  const tabBtn = (id, l) =>
    h(
      "button",
      {
        key: id,
        className: "btn" + (tab === id ? " on" : ""),
        onClick: () => setTab(id),
      },
      l,
    );
  const rasio = s.masuk
    ? Math.round(((s.masuk - s.keluar) / s.masuk) * 100)
    : 0;

  const formKartu = h(
    "form",
    { className: "card", onSubmit: simpan },
    h("h2", null, f.id ? "Ubah transaksi" : "Tambah transaksi"),
    h(
      "div",
      { className: "seg" },
      ["keluar", "masuk"].map((j) =>
        h(
          "button",
          {
            key: j,
            type: "button",
            className: "btn" + (f.jenis === j ? " on" : ""),
            onClick: () => setF({ ...f, jenis: j, kategori: KAT[j][0] }),
          },
          j === "keluar" ? "Pengeluaran" : "Pemasukan",
        ),
      ),
    ),
    h("label", null, "Jumlah (Rp)"),
    h("input", {
      type: "number",
      min: 1,
      inputMode: "numeric",
      placeholder: "50000",
      value: f.jumlah,
      onChange: (e) => setF({ ...f, jumlah: e.target.value }),
      required: true,
    }),
    h("label", null, "Kategori"),
    h(
      "select",
      {
        value: f.kategori,
        onChange: (e) => setF({ ...f, kategori: e.target.value }),
      },
      KAT[f.jenis].map((k) => h("option", { key: k }, k)),
    ),
    h("label", null, "Catatan (opsional)"),
    h("input", {
      type: "text",
      placeholder: "Mis. makan siang",
      value: f.catatan,
      onChange: (e) => setF({ ...f, catatan: e.target.value }),
    }),
    h("label", null, "Tanggal"),
    h("input", {
      type: "date",
      value: f.tanggal,
      onChange: (e) => setF({ ...f, tanggal: e.target.value }),
      required: true,
    }),
    ok && h("div", { className: "in lbl", style: { marginTop: 12 } }, ok),
    h(
      "div",
      { className: "seg", style: { marginTop: 16 } },
      h(
        "button",
        { className: "btn pri", type: "submit" },
        f.id ? "Perbarui" : "Simpan",
      ),
      f.id &&
        h(
          "button",
          { className: "btn", type: "button", onClick: () => setF(kosong()) },
          "Batal",
        ),
    ),
  );
  const WARNA = [
    "linear-gradient(90deg,#14b8a6,#5eead4)",
    "linear-gradient(90deg,#0d9488,#2dd4bf)",
    "linear-gradient(90deg,#f43f5e,#fb7185)",
    "linear-gradient(90deg,#8b5cf6,#c4b5fd)",
    "linear-gradient(90deg,#f59e0b,#fcd34d)",
  ];
  const vRingkasan = () =>
    h(
      "div",
      { className: "stack" },
      h(
        "div",
        { className: "dash" },
        h(
          "div",
          { className: "col" },
          h(
            "div",
            { className: "card" },
            h("h2", null, "Tren Keuangan · saldo 12 bulan"),
            h(Chart, { data, bulan }),
          ),
          h(
            "div",
            { className: "card trio" },
            h(
              "div",
              null,
              h("span", { className: "lbl" }, "Pemasukan"),
              h("b", { className: "in" }, rp(s.masuk)),
            ),
            h(
              "div",
              null,
              h("span", { className: "lbl" }, "Pengeluaran"),
              h("b", { className: "out" }, rp(s.keluar)),
            ),
            h(
              "div",
              null,
              h("span", { className: "lbl" }, "Rasio tabung"),
              h("b", { style: { color: "var(--vio)" } }, rasio + "%"),
            ),
          ),
        ),
        h(
          "div",
          { className: "col" },
          h(
            "div",
            { className: "card" },
            h(
              "div",
              { className: "sh" },
              h("h2", { style: { margin: 0 } }, "Saldo"),
              h(
                "button",
                {
                  className: "btn sm",
                  onClick: () => {
                    setInputSaldo(String(s.total));
                    setEditSaldo(!editSaldo);
                  },
                },
                editSaldo ? "Tutup" : "✎ Atur saldo",
              ),
            ),
            editSaldo &&
              h(
                "form",
                { className: "saldo-form", onSubmit: simpanSaldo },
                h("label", null, "Saldo saya saat ini (Rp)"),
                h("input", {
                  type: "number",
                  step: 1,
                  inputMode: "numeric",
                  value: inputSaldo,
                  onChange: (e) => setInputSaldo(e.target.value),
                  required: true,
                }),
                h(
                  "span",
                  { className: "lbl" },
                  "Isi dengan jumlah uang Anda sekarang. Transaksi berikutnya akan menambah atau mengurangi saldo ini.",
                ),
                h(
                  "button",
                  { className: "btn pri", type: "submit" },
                  "Simpan saldo",
                ),
              ),
            h(
              "div",
              {
                className: "hero",
                style: s.total < 0 ? { color: "var(--out)" } : null,
              },
              rp(s.total),
            ),
            h(
              "div",
              { className: "duo" },
              h(
                "div",
                null,
                h("span", { className: "lbl" }, "Pemasukan"),
                h("b", { className: "in" }, rp(s.masuk)),
              ),
              h(
                "div",
                null,
                h("span", { className: "lbl" }, "Pengeluaran"),
                h("b", { className: "out" }, rp(s.keluar)),
              ),
            ),
          ),
          h(
            "div",
            { className: "card" },
            h("h2", null, "Kategori"),
            katList.length === 0
              ? h("div", { className: "empty" }, "Belum ada pengeluaran.")
              : katList
                  .slice(0, 5)
                  .map(([k, v], i) =>
                    h(
                      "div",
                      { className: "cat", key: k },
                      h(
                        "div",
                        { className: "h" },
                        h("span", null, k),
                        h(
                          "span",
                          { className: "lbl" },
                          Math.round((v / s.keluar) * 100) + "%",
                        ),
                      ),
                      h(
                        "div",
                        { className: "bar" },
                        h("i", {
                          style: {
                            width: (v / s.keluar) * 100 + "%",
                            background: WARNA[i],
                          },
                        }),
                      ),
                    ),
                  ),
          ),
        ),
      ),
      h(
        "div",
        { className: "grid cols" },
        formKartu,
        h(
          "div",
          { className: "card" },
          h("h2", null, "Transaksi terbaru"),
          periode.length === 0
            ? h("div", { className: "empty" }, "Belum ada transaksi.")
            : [...periode]
                .sort(
                  (a, b) => b.tanggal.localeCompare(a.tanggal) || b.id - a.id,
                )
                .slice(0, 5)
                .map(baris),
        ),
      ),
    );

  const vTransaksi = () =>
    h(
      "div",
      { className: "grid cols" },
      formKartu,
      h(
        "div",
        { className: "card" },
        h("h2", null, "Riwayat (" + daftar.length + ")"),
        h(
          "div",
          { className: "fl" },
          h("input", {
            type: "search",
            placeholder: "Cari…",
            value: cari,
            onChange: (e) => setCari(e.target.value),
          }),
          h(
            "select",
            { value: fJenis, onChange: (e) => setFJenis(e.target.value) },
            h("option", { value: "semua" }, "Semua jenis"),
            h("option", { value: "masuk" }, "Pemasukan"),
            h("option", { value: "keluar" }, "Pengeluaran"),
          ),
          h(
            "select",
            { value: fKat, onChange: (e) => setFKat(e.target.value) },
            h("option", { value: "semua" }, "Semua kategori"),
            [...new Set([...KAT.keluar, ...KAT.masuk])].map((k) =>
              h("option", { key: k }, k),
            ),
          ),
        ),
        daftar.length === 0
          ? h("div", { className: "empty" }, "Tidak ada transaksi.")
          : daftar.map(baris),
      ),
    );

  return h(
    "div",
    { className: "wrap" },
    h(
      "div",
      { className: "top" },
      h("h1", null, "💰 Catatan Keuangan"),
      h("span", { className: "lbl" }, "Dasbor pribadi"),
    ),
    h(
      "div",
      { className: "month" },
      h(
        "button",
        {
          className: "btn",
          disabled: semua,
          onClick: () => setBulan(geser(bulan, -1)),
        },
        "‹",
      ),
      h("b", null, semua ? "Semua waktu" : bln(bulan)),
      h(
        "button",
        {
          className: "btn",
          disabled: semua,
          onClick: () => setBulan(geser(bulan, 1)),
        },
        "›",
      ),
      h(
        "button",
        {
          className: "btn" + (semua ? " on" : ""),
          onClick: () => setSemua(!semua),
        },
        "Semua waktu",
      ),
    ),
    h(
      "div",
      { className: "tabs" },
      tabBtn("ringkasan", "Ringkasan"),
      tabBtn("transaksi", "Transaksi"),
    ),
    tab === "ringkasan" ? vRingkasan() : vTransaksi(),
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(h(App));
