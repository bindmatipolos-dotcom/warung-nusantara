'use client';
import { useEffect, useRef, useState } from 'react';
import { ITEMS, UPS, TYPES, SPRITES, Item } from '@/lib/data';

type Cust = { id: number; ty: number; x: number; y: number; need: Record<string, number>; total: number; cost: number; given: number; pat: number; mp: number; st: 'in' | 'wait' | 'out'; happy: boolean };
type St = { money: number; xp: number; lv: number; day: number; t: number; stock: Record<string, number>; up: Record<string, number>; spent: number; rev: number; cogs: number; loss: number; served: number; lost: number; dRev: number; dServed: number; dDrink: number; dLost: number; cl: boolean[]; seen: boolean };
type Fx = { x: number; y: number; txt: string; age: number };

const KEY = 'warung-nusantara-v2';
const DAY = 150, MAXUP = 5, W = 360, H = 300;
const IT = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<string, Item>;
const rp = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID');
const def = (): St => ({
  money: 100000, xp: 0, lv: 1, day: 1, t: 0,
  stock: Object.fromEntries(ITEMS.map((i) => [i.id, 6])),
  up: Object.fromEntries(UPS.map((u) => [u.id, 0])),
  spent: 0, rev: 0, cogs: 0, loss: 0, served: 0, lost: 0, dRev: 0, dServed: 0, dDrink: 0, dLost: 0,
  cl: [false, false, false], seen: false,
});
const mix = (a: number[], b: number[], k: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`;
const save = (s: St) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
const load = (): St | null => {
  try {
    const r = localStorage.getItem(KEY);
    if (!r) return null;
    const p = JSON.parse(r) as Partial<St>;
    const d = def();
    return { ...d, ...p, stock: { ...d.stock, ...p.stock }, up: { ...d.up, ...p.up } };
  } catch { return null; }
};
const slot = (k: number): [number, number, number] => (k < 4 ? [95 + k * 58, 262, 1] : [124 + (k - 4) * 58, 238, 0.88]);
const Img = ({ n, className = '' }: { n: string; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={`/s/${n}.png`} alt="" draggable={false} className={className} />
);
let uid = 0;
const mk = (s: St): Cust => {
  const ty = Math.floor(Math.random() * TYPES.length);
  const pool = ITEMS.filter((i) => !i.adult || TYPES[ty].adult);
  const need: Record<string, number> = {};
  let total = 0, cost = 0;
  const n = 1 + (Math.random() < 0.4 + s.lv * 0.03 ? 1 : 0) + (Math.random() < 0.15 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const it = pool[Math.floor(Math.random() * pool.length)];
    const q = it.sell < 3000 ? 1 + Math.floor(Math.random() * 3) : 1 + (Math.random() < 0.2 ? 1 : 0);
    need[it.id] = (need[it.id] || 0) + q;
    total += it.sell * q; cost += it.buy * q;
  }
  const mp = 26 + s.up.etalase * 5 + Math.random() * 10;
  return { id: ++uid, ty, x: 400, y: 262, need, total, cost, given: 0, pat: mp, mp, st: 'in', happy: false };
};

export default function Game() {
  const S = useRef<St>(def());
  const C = useRef<Cust[]>([]);
  const FX = useRef<Fx[]>([]);
  const IM = useRef<Record<string, HTMLImageElement>>({});
  const busy = useRef<Record<string, number>>({});
  const cook = useRef({ a: 0, b: 0 });
  const sp = useRef(1);
  const paused = useRef(false);
  const snd = useRef(true);
  const ac = useRef<AudioContext | null>(null);
  const tm = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cv = useRef<HTMLCanvasElement>(null);
  const [scr, setScr] = useState<'menu' | 'play'>('menu');
  const [tab, setTab] = useState<'jual' | 'pasok' | 'up' | 'misi' | 'stat'>('jual');
  const [help, setHelp] = useState(false);
  const [setm, setSetm] = useState(false);
  const [sound, setSound] = useState(true);
  const [has, setHas] = useState(false);
  const [msg, setMsg] = useState('');
  const [, force] = useState(0);

  useEffect(() => {
    setHas(!!load());
    try { if (localStorage.getItem('warung-sound') === '0') { snd.current = false; setSound(false); } } catch {}
    SPRITES.forEach((n) => { const i = new Image(); i.src = `/s/${n}.png`; IM.current[n] = i; });
  }, []);

  const say = (m: string) => { setMsg(m); clearTimeout(tm.current); tm.current = setTimeout(() => setMsg(''), 1800); };
  const beep = (f: number, d = 0.08, type: OscillatorType = 'square') => {
    if (!snd.current) return;
    try {
      if (!ac.current) ac.current = new AudioContext();
      const a = ac.current, o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.value = f; g.gain.value = 0.05;
      o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + d);
    } catch {}
  };
  const gain = (s: St, x: number) => {
    s.xp += x;
    while (s.xp >= s.lv * 60 + 40) { s.xp -= s.lv * 60 + 40; s.lv++; s.money += 25000; say(`Naik level ${s.lv}! Bonus ${rp(25000)}`); }
  };
  const pay = (c: Cust) => {
    const s = S.current;
    const tip = c.pat / c.mp > 0.5 ? Math.round((c.total * 0.1) / 500) * 500 : 0;
    const got = c.total + tip;
    s.money += got; s.rev += got; s.dRev += got; s.cogs += c.cost; s.served++; s.dServed++;
    c.st = 'out'; c.happy = true;
    FX.current.push({ x: c.x, y: c.y - 90, txt: '+' + rp(got), age: 0 });
    gain(s, 10 + Math.round(c.total / 3000));
    beep(880, 0.08); setTimeout(() => beep(1320, 0.12), 80);
    if (tip) say(`Tip ${rp(tip)} dari pelanggan puas!`);
  };
  const serve = (id: string) => {
    const s = S.current, it = IT[id];
    if (Date.now() < (busy.current[id] || 0)) return;
    if (s.stock[id] <= 0) { say(`Stok ${it.name} habis! Beli di Pemasok`); beep(160, 0.2, 'sawtooth'); return; }
    const c = C.current.find((x) => x.st === 'wait' && x.need[id] > 0);
    if (!c) { say(`Belum ada yang pesan ${it.name}`); return; }
    s.stock[id]--; c.need[id]--; c.given += it.buy;
    if (it.drink) s.dDrink++;
    const ms = it.cook * (1 - s.up.kompor * 0.12), now = Date.now();
    busy.current[id] = now + ms;
    if (ms > 0) cook.current = { a: now, b: now + ms };
    beep(520, 0.06);
    if (Object.values(c.need).every((q) => q <= 0)) pay(c);
  };
  const buy = (id: string, n: number) => {
    const s = S.current, cost = IT[id].buy * n;
    if (s.money < cost) { say('Uang tidak cukup'); beep(160, 0.2, 'sawtooth'); return; }
    s.money -= cost; s.spent += cost; s.stock[id] += n; beep(660, 0.06); save(s);
  };
  const upgrade = (id: string) => {
    const s = S.current, u = UPS.find((x) => x.id === id)!, lvl = s.up[id], cost = u.base * (lvl + 1);
    if (lvl >= MAXUP) return;
    if (s.money < cost) { say('Uang tidak cukup'); beep(160, 0.2, 'sawtooth'); return; }
    s.money -= cost; s.spent += cost; s.up[id]++; beep(990, 0.15); say(`${u.name} naik ke level ${s.up[id]}!`); save(s);
  };
  const claim = (i: number) => {
    const s = S.current;
    s.cl[i] = true; s.money += 20000; gain(s, 30); beep(1000, 0.15); say(`Misi selesai! +${rp(20000)}`); save(s);
  };

  const tick = (dt: number) => {
    if (paused.current) return;
    const s = S.current;
    s.t += dt / DAY;
    if (s.t >= 1) {
      s.t = 0; s.day++; s.dRev = 0; s.dServed = 0; s.dDrink = 0; s.dLost = 0; s.cl = [false, false, false];
      say('Hari baru dimulai'); save(s);
    }
    sp.current -= dt;
    const live = C.current.filter((c) => c.st !== 'out').length;
    if (sp.current <= 0) {
      sp.current = Math.max(2.5, 9 - s.up.spanduk - s.lv * 0.15) * (s.t > 0.75 ? 1.6 : 1) * (0.7 + Math.random() * 0.6);
      if (live < 3 + s.up.kursi) C.current.push(mk(s));
    }
    let k = 0;
    for (const c of C.current) {
      if (c.st === 'out') { c.x += 80 * dt; continue; }
      const [tx, ty] = slot(k); k++;
      const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
      if (d > 1) { const m = Math.min(d, 75 * dt); c.x += (dx / d) * m; c.y += (dy / d) * m; c.st = 'in'; }
      else { c.x = tx; c.y = ty; c.st = 'wait'; }
      if (c.st === 'wait') {
        c.pat -= dt;
        if (c.pat <= 0) { c.st = 'out'; c.happy = false; s.lost++; s.dLost++; s.loss += c.given; beep(160, 0.25, 'sawtooth'); }
      }
    }
    C.current = C.current.filter((c) => c.x < 430);
    for (const f of FX.current) f.age += dt;
    FX.current = FX.current.filter((f) => f.age < 1.4);
  };

  const draw = (ctx: CanvasRenderingContext2D, ts: number) => {
    const s = S.current, t = s.t, night = t > 0.6 ? Math.min(1, (t - 0.6) * 5) : 0;
    const im = IM.current, k = ctx.canvas.width / W;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.textAlign = 'center';
    const dr = (n: string, cx: number, by: number, w: number) => {
      const i = im[n]; if (!i || !i.naturalWidth) return 0;
      const h = (w * i.naturalHeight) / i.naturalWidth; ctx.drawImage(i, cx - w / 2, by - h, w, h); return h;
    };
    const fit = (n: string, cx: number, cy: number, box: number) => {
      const i = im[n]; if (!i || !i.naturalWidth) return;
      const r = Math.min(box / i.naturalWidth, box / i.naturalHeight), w = i.naturalWidth * r, h = i.naturalHeight * r;
      ctx.drawImage(i, cx - w / 2, cy - h / 2, w, h);
    };
    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    };
    const g = ctx.createLinearGradient(0, 0, 0, 200);
    g.addColorStop(0, mix([90, 180, 255], [12, 20, 70], night)); g.addColorStop(1, mix([200, 238, 255], [60, 74, 130], night));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const sx = 20 + t * 320, sy = 80 - Math.sin(t * Math.PI) * 50;
    ctx.fillStyle = night > 0.5 ? '#fff7c9' : '#ffd93b'; ctx.beginPath(); ctx.arc(sx, sy, night > 0.5 ? 11 : 15, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${0.9 - night * 0.7})`;
    for (let i = 0; i < 3; i++) {
      const cx = ((ts / 500 + i * 140) % 440) - 40, cy = 30 + i * 22;
      ctx.beginPath(); ctx.arc(cx, cy, 9, 0, 7); ctx.arc(cx + 11, cy - 4, 12, 0, 7); ctx.arc(cx + 24, cy, 9, 0, 7); ctx.fill();
    }
    ctx.fillStyle = mix([140, 170, 205], [36, 46, 96], night);
    [[0, 130, 34], [30, 112, 26], [60, 135, 30], [250, 118, 34], [290, 100, 28], [320, 126, 40]].forEach(([x, y, w]) => ctx.fillRect(x, y, w, 80));
    ctx.fillStyle = mix([196, 178, 146], [96, 86, 82], night * 0.8); ctx.fillRect(0, 196, W, 74);
    ctx.fillStyle = 'rgba(0,0,0,.07)';
    for (let y = 210; y < 270; y += 14) ctx.fillRect(0, y, W, 1);
    ctx.fillStyle = '#4b4f58'; ctx.fillRect(0, 270, W, 30);
    ctx.fillStyle = '#e8e8e8'; for (let x = 0; x < W; x += 50) ctx.fillRect(x, 285, 26, 2);
    ctx.fillStyle = '#8a8f98'; ctx.fillRect(0, 268, W, 3);
    dr('pole', 352, 214, 30); dr('tree', 30, 206, 92); dr('flag', 328, 208, 24);
    const wh = dr('warung', 180, 200, 300), top = 200 - wh, counter = top + wh * 0.8;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, counter + 2); ctx.clip();
    const cooking = Date.now() < cook.current.b;
    dr('seller', 190, counter + 34 + (cooking ? Math.sin(ts / 70) * 1.5 : 0), 33);
    ctx.restore();
    if (cooking) {
      const p = (Date.now() - cook.current.a) / Math.max(1, cook.current.b - cook.current.a);
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      for (let i = 0; i < 3; i++) { const q = (ts / 600 + i / 3) % 1; ctx.beginPath(); ctx.arc(205 + i * 6 - 6, counter - 30 - q * 18, 2 + q * 3, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#000'; rr(172, counter - 52, 36, 5, 2); ctx.fill();
      ctx.fillStyle = '#58d13a'; rr(173, counter - 51, 34 * Math.min(1, p), 3, 1.5); ctx.fill();
    }
    dr('gerobak', 36, 296, 62);
    const mx = 400 - ((ts / 9) % 520);
    dr('motor', mx, 300, 62);
    const list = [...C.current].sort((a, b) => a.y - b.y);
    for (const c of list) {
      const ty = TYPES[c.ty], sc = 0.62 + (c.y - 238) / 24 * 0.12 + 0.0, walk = c.st !== 'wait';
      const bob = walk ? Math.abs(Math.sin(ts / 110 + c.id)) * 3 : Math.sin(ts / 500 + c.id) * 0.6;
      const w = 36 * (c.y > 250 ? 1 : 0.88) * (sc / sc);
      const h = dr(ty.s, c.x, c.y - bob, w);
      const hy = c.y - bob - h;
      if (c.st === 'out') {
        if (c.happy) dr('heart', c.x, hy - 2, 14);
        else { ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.arc(c.x, hy - 8, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.fillText('!', c.x, hy - 4); }
        continue;
      }
      const ids = Object.keys(c.need).filter((q) => c.need[q] > 0);
      const bw = ids.length * 26 + 6, by = hy - 10;
      const r = Math.max(0, c.pat / c.mp);
      ctx.fillStyle = '#3d2210'; rr(c.x - 14, hy - 5, 28, 4, 2); ctx.fill();
      ctx.fillStyle = r > 0.5 ? '#58d13a' : r > 0.25 ? '#f5c518' : '#e53935'; rr(c.x - 13, hy - 4, 26 * r, 2, 1); ctx.fill();
      ctx.fillStyle = '#5b3a1e'; rr(c.x - bw / 2 - 1, by - 27, bw + 2, 27, 7); ctx.fill();
      ctx.fillStyle = '#fffaf0'; rr(c.x - bw / 2, by - 26, bw, 25, 6); ctx.fill();
      ids.forEach((id, i) => {
        const ix = c.x - bw / 2 + 3 + i * 26 + 11;
        fit(id, ix, by - 14, 20);
        if (c.need[id] > 1) { ctx.font = 'bold 9px sans-serif'; ctx.lineWidth = 2.5; ctx.strokeStyle = '#fffaf0'; ctx.fillStyle = '#c62828'; ctx.strokeText('x' + c.need[id], ix + 7, by - 4); ctx.fillText('x' + c.need[id], ix + 7, by - 4); }
      });
    }
    for (const f of FX.current) {
      ctx.globalAlpha = Math.max(0, 1 - f.age / 1.4); ctx.font = 'bold 13px sans-serif';
      ctx.lineWidth = 3; ctx.strokeStyle = '#5b3a00'; ctx.fillStyle = '#ffe14d';
      ctx.strokeText(f.txt, f.x, f.y - f.age * 28); ctx.fillText(f.txt, f.x, f.y - f.age * 28);
      dr('coin', f.x - ctx.measureText(f.txt).width / 2 - 9, f.y - f.age * 28 + 3, 12); ctx.globalAlpha = 1;
    }
    if (night > 0) {
      ctx.fillStyle = `rgba(12,10,60,${night * 0.42})`; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const [gx, gy, gr] of [[180, 150, 150], [70, 190, 60], [210, 250, 100]]) {
        const rg = ctx.createRadialGradient(gx, gy, 5, gx, gy, gr);
        rg.addColorStop(0, `rgba(255,170,60,${night * 0.28})`); rg.addColorStop(1, 'rgba(255,170,60,0)');
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  useEffect(() => {
    if (scr !== 'play') return;
    const el = cv.current;
    const c = el ? el.getContext('2d') : null;
    if (!el || !c) return;
    let raf = 0, last = performance.now();
    const loop = (n: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3), w = Math.round(el.clientWidth * dpr);
      if (w > 0 && el.width !== w) { el.width = w; el.height = Math.round((w * H) / W); }
      const dt = Math.min(0.1, (n - last) / 1000); last = n;
      tick(dt); draw(c, n);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const iv = setInterval(() => force((x) => x + 1), 250);
    const sv = setInterval(() => save(S.current), 5000);
    return () => { cancelAnimationFrame(raf); clearInterval(iv); clearInterval(sv); save(S.current); };
    // eslint-disable-next-line
  }, [scr]);

  const start = (cont: boolean) => {
    try { if (!ac.current) ac.current = new AudioContext(); } catch {}
    const l = cont ? load() : null;
    S.current = l || def(); C.current = []; FX.current = []; busy.current = {}; cook.current = { a: 0, b: 0 }; sp.current = 1;
    paused.current = !S.current.seen; setHelp(!S.current.seen); setScr('play');
  };
  const closeHelp = () => { S.current.seen = true; paused.current = false; setHelp(false); if (scr === 'play') save(S.current); };
  const toggleSound = () => { const v = !snd.current; snd.current = v; setSound(v); try { localStorage.setItem('warung-sound', v ? '1' : '0'); } catch {} };

  const Modal = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4">
      <div className="cream p-4 max-w-sm w-full text-sm space-y-2">
        <h2 className="text-xl font-black text-red-700">{title}</h2>
        {children}
      </div>
    </div>
  );
  const modals = (
    <>
      {help && (
        <Modal title="Cara Main">
          <p>1. Pelanggan datang dan memesan. Pesanan tampil di gelembung di atas kepala mereka.</p>
          <p>2. Ketuk menu di tab <b>Jual</b> untuk menyajikan. Menu yang sedang dipesan diberi lencana merah.</p>
          <p>3. Pesanan lengkap berarti uang masuk. Layani sebelum bar sabar habis, yang cepat dapat tip.</p>
          <p>4. Stok menipis? Belanja di <b>Pemasok</b>. Pakai laba untuk <b>Upgrade</b> warung.</p>
          <p>5. Selesaikan <b>Misi</b> harian untuk bonus uang dan XP. Progres tersimpan otomatis.</p>
          <button onClick={closeHelp} className="greenbtn w-full py-3 active:scale-95">Mengerti, buka warung!</button>
        </Modal>
      )}
      {setm && (
        <Modal title="Pengaturan">
          <button onClick={toggleSound} className="greenbtn w-full py-2.5">Suara: {sound ? 'Hidup' : 'Mati'}</button>
          {has && <button onClick={() => { try { localStorage.removeItem(KEY); } catch {} setHas(false); }} className="woodbtn w-full py-3">Hapus data simpanan</button>}
          <button onClick={() => setSetm(false)} className="woodbtn w-full py-3">Tutup</button>
        </Modal>
      )}
    </>
  );

  if (scr === 'menu') {
    return (
      <div className="relative min-h-dvh overflow-hidden flex flex-col items-center px-4 pt-4 pb-40" style={{ background: 'linear-gradient(#5ab4ff, #d4f0ff 60%, #c4b28f 60%)' }}>
        <Img n="tree" className="absolute left-[-30px] bottom-24 w-56 max-w-[55%]" />
        <Img n="lamp" className="absolute right-3 bottom-20 w-12" />
        <Img n="warung" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[115%] max-w-[600px]" />
        <Img n="seller" className="absolute bottom-1 right-[6%] w-[16%] max-w-24" />
        <Img n="logo" className="relative z-10 w-[88%] max-w-[420px] drop-shadow-lg" />
        <div className="relative z-10 mt-4 flex flex-col items-center gap-2 w-full max-w-[260px]">
          <button onClick={() => start(false)} className="w-full active:scale-95"><Img n="btn_start" className="w-full" /></button>
          {has && <button onClick={() => start(true)} className="woodbtn w-full h-[52px] text-base active:scale-95">Lanjutkan</button>}
          <button onClick={() => setHelp(true)} className="woodbtn w-full h-[52px] text-base active:scale-95">Tutorial</button>
          <button onClick={() => setSetm(true)} className="w-full active:scale-95"><Img n="btn_set" className="w-full" /></button>
        </div>
        {modals}
      </div>
    );
  }

  const s = S.current;
  const cs = C.current.filter((c) => c.st !== 'out');
  const need = (id: string) => cs.reduce((a, c) => a + (c.need[id] > 0 ? c.need[id] : 0), 0);
  const xpN = s.lv * 60 + 40;
  const phase = s.t < 0.2 ? 'Pagi' : s.t < 0.5 ? 'Siang' : s.t < 0.65 ? 'Sore' : 'Malam';
  const hr = 6 + s.t * 18, hh = Math.floor(hr) % 24, mm = Math.floor(((hr - Math.floor(hr)) * 60) / 10) * 10;
  const goals = [
    { n: `Layani ${6 + s.lv} pelanggan`, p: s.dServed, g: 6 + s.lv, f: (v: number) => String(v) },
    { n: `Raup pendapatan ${rp(60000 + s.lv * 15000)}`, p: s.dRev, g: 60000 + s.lv * 15000, f: rp },
    { n: `Jual ${4 + s.lv} minuman`, p: s.dDrink, g: 4 + s.lv, f: (v: number) => String(v) },
  ];
  const tabs: [typeof tab, string, string][] = [['jual', 'ic_box', 'Jual'], ['pasok', 'ic_cart', 'Pemasok'], ['up', 'ic_home', 'Upgrade'], ['misi', 'ic_trophy', 'Misi'], ['stat', 'ic_chart', 'Statistik']];

  return (
    <div className="min-h-dvh max-w-xl mx-auto p-2 flex flex-col gap-2" style={{ background: '#f1dfae' }}>
      {msg && <div className="fixed top-2 left-1/2 -translate-x-1/2 bg-black/85 text-white text-sm px-3 py-1.5 rounded-full z-50 whitespace-nowrap">{msg}</div>}
      {modals}
      <div className="flex items-stretch gap-1.5">
        <div className="wood flex items-center gap-1.5 p-1 flex-1 min-w-0">
          <div className="w-11 h-11 shrink-0 rounded-lg overflow-hidden bg-sky-200 border-2 border-[#3d2210]"><Img n="seller" className="w-full h-full object-cover object-top scale-[1.6] origin-top" /></div>
          <div className="flex-1 min-w-0 leading-tight">
            <div className="text-sm font-black pxt">Lv. {s.lv}</div>
            <div className="relative h-4 bg-[#2a170b] rounded-full overflow-hidden border border-black">
              <div className="h-full bg-gradient-to-b from-lime-400 to-green-600" style={{ width: `${(s.xp / xpN) * 100}%` }} />
              <span className="absolute inset-0 text-[10px] font-black text-white text-center pxt">XP {s.xp} / {xpN}</span>
            </div>
          </div>
        </div>
        <div className="wood flex items-center gap-1 px-2 font-black text-sm pxt"><Img n="coin" className="w-6 h-6" />{rp(s.money)}</div>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="wood flex-1 px-3 py-1 text-xs font-black pxt">Hari {s.day} · {phase} {String(hh).padStart(2, '0')}:{String(mm).padStart(2, '0')}</div>
        <button onClick={() => { paused.current = true; setHelp(true); }} className="woodbtn w-11 h-9 text-base">?</button>
        <button onClick={() => { save(S.current); setHas(true); setScr('menu'); }} className="woodbtn w-11 h-9 text-xs">Menu</button>
      </div>
      <canvas ref={cv} width={360} height={300} className="w-full rounded-xl border-4 border-[#5b3a1e]" style={{ aspectRatio: `${W}/${H}` }} />
      <div className="cream p-2 text-xs space-y-1 min-h-14">
        <div className="font-black text-sm text-red-700">Pesan Pelanggan</div>
        {cs.length === 0 && <div className="text-stone-500">Menunggu pelanggan datang…</div>}
        {cs.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <Img n={TYPES[c.ty].s} className="w-6 h-8 object-cover object-top shrink-0" />
            <span className="w-24 font-bold truncate">{TYPES[c.ty].n}</span>
            <span className="flex-1 flex items-center gap-1.5 min-w-0">{Object.entries(c.need).filter(([, q]) => q > 0).map(([k, q]) => (<span key={k} className="flex items-center gap-0.5 font-bold"><Img n={k} className="h-6 w-7 object-contain" />{q > 1 && <span>x{q}</span>}</span>))}</span>
            <div className="w-14 h-2 bg-stone-300 rounded-full overflow-hidden shrink-0"><div className={`h-full ${c.pat / c.mp > 0.5 ? 'bg-green-500' : c.pat / c.mp > 0.25 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.max(0, (c.pat / c.mp) * 100)}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map(([k, ic, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`woodbtn shrink-0 flex items-center gap-1 px-3 h-10 text-xs ${tab === k ? 'brightness-110 -translate-y-0.5' : 'brightness-75'}`}><Img n={ic} className="h-6 w-6 object-contain" />{l}</button>
        ))}
      </div>
      <div className="pb-4">
        {tab === 'jual' && (
          <div className="grid grid-cols-4 gap-1.5">
            {ITEMS.map((i) => {
              const n = need(i.id), b = (busy.current[i.id] || 0) > Date.now();
              return (
                <button key={i.id} onClick={() => serve(i.id)} className={`cream relative p-1 text-center active:scale-95 ${n ? 'ring-2 ring-red-500 !bg-yellow-100' : ''} ${b ? 'opacity-50' : ''}`}>
                  {n > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-black rounded-full w-5 h-5 leading-5 border-2 border-white">{n}</span>}
                  <Img n={i.id} className="h-11 w-full object-contain" />
                  <div className="text-[9px] leading-tight font-black mt-0.5">{i.name}</div>
                  <div className={`text-[10px] font-bold ${s.stock[i.id] < 3 ? 'text-red-600' : 'text-stone-600'}`}>Stok {s.stock[i.id]}</div>
                </button>
              );
            })}
          </div>
        )}
        {tab === 'pasok' && (
          <div className="space-y-1.5">
            {ITEMS.map((i) => (
              <div key={i.id} className="cream flex items-center gap-2 p-1.5">
                <Img n={i.id} className="w-11 h-9 object-contain" />
                <div className="flex-1 text-xs leading-tight">
                  <div className="font-black">{i.name} <span className="text-stone-500 font-bold">(stok {s.stock[i.id]})</span></div>
                  <div className="text-stone-700">Beli {rp(i.buy)} · Jual {rp(i.sell)} · Untung {rp(i.sell - i.buy)}</div>
                </div>
                <button onClick={() => buy(i.id, 5)} className="greenbtn text-xs px-2 py-1.5 active:scale-95">+5</button>
                <button onClick={() => buy(i.id, 20)} className="greenbtn text-xs px-2 py-1.5 active:scale-95">+20</button>
              </div>
            ))}
          </div>
        )}
        {tab === 'up' && (
          <div className="space-y-1.5">
            {UPS.map((u) => {
              const l = s.up[u.id], max = l >= MAXUP;
              return (
                <div key={u.id} className="cream flex items-center gap-2 p-1.5">
                  <Img n={u.ic} className="w-11 h-12 object-contain" />
                  <div className="flex-1 text-xs leading-tight">
                    <div className="font-black text-sm">{u.name} <span className="text-amber-700">Lv {l}/{MAXUP}</span></div>
                    <div className="text-stone-700">{u.desc}</div>
                  </div>
                  <button disabled={max} onClick={() => upgrade(u.id)} className="greenbtn text-xs px-3 py-2 active:scale-95">{max ? 'MAKS' : rp(u.base * (l + 1))}</button>
                </div>
              );
            })}
          </div>
        )}
        {tab === 'misi' && (
          <div className="space-y-1.5">
            <div className="text-xs font-bold">Misi harian · hadiah {rp(20000)} + 30 XP, reset tiap hari baru</div>
            {goals.map((g, i) => (
              <div key={i} className="cream flex items-center gap-2 p-1.5">
                <Img n="ic_trophy" className="w-10 h-11 object-contain" />
                <div className="flex-1 text-xs">
                  <div className="font-black">{g.n}</div>
                  <div className="h-2 bg-stone-300 rounded-full mt-1 overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${Math.min(100, (g.p / g.g) * 100)}%` }} /></div>
                  <div className="text-stone-600 mt-0.5">{g.f(g.p)} / {g.f(g.g)}</div>
                </div>
                <button disabled={g.p < g.g || s.cl[i]} onClick={() => claim(i)} className="greenbtn text-xs px-3 py-2 active:scale-95">{s.cl[i] ? 'Diambil' : 'Klaim'}</button>
              </div>
            ))}
          </div>
        )}
        {tab === 'stat' && (
          <div className="cream p-3 text-sm space-y-1">
            {([
              ['Pendapatan hari ini', rp(s.dRev)],
              ['Total pendapatan', rp(s.rev)],
              ['Modal barang terjual', rp(s.cogs)],
              ['Rugi (pelanggan kabur)', rp(s.loss)],
              ['Laba bersih', rp(s.rev - s.cogs - s.loss)],
              ['Belanja stok & upgrade', rp(s.spent)],
              ['Pelanggan dilayani', String(s.served)],
              ['Pelanggan kabur', String(s.lost)],
            ] as [string, string][]).map(([a, b]) => (
              <div key={a} className="flex justify-between"><span className="text-stone-700">{a}</span><b>{b}</b></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
