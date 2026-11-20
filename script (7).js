(() => {
'use strict';
const $ = id => document.getElementById(id);
const LANES = [-3.2, 0, 3.2];

/* ---------- сохранение ---------- */
const store = {
  get() { try { return JSON.parse(localStorage.getItem('taxi3d')) || {}; } catch (e) { return {}; } },
  set(d) { try { localStorage.setItem('taxi3d', JSON.stringify(d)); } catch (e) {} }
};
let save = Object.assign({ money: 0, turbo: 0, hp: 0 }, store.get());

/* ---------- сцена ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06081a);
scene.fog = new THREE.Fog(0x06081a, 30, 170);
const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 400);
scene.add(new THREE.AmbientLight(0x7080c0, 0.9));
const moon = new THREE.DirectionalLight(0x99aaff, 0.5);
moon.position.set(-20, 40, 10);
scene.add(moon);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* ---------- машины ---------- */
function makeCar(color, taxi) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 4), new THREE.MeshLambertMaterial({ color }));
  body.position.y = 0.7; g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 2), new THREE.MeshLambertMaterial({ color: 0x1b2638 }));
  cab.position.set(0, 1.45, 0.2); g.add(cab);
  const wGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 12);
  const wMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  [[-1, -1.3], [1, -1.3], [-1, 1.3], [1, 1.3]].forEach(p => {
    const w = new THREE.Mesh(wGeo, wMat);
    w.rotation.z = Math.PI / 2; w.position.set(p[0], 0.4, p[1]); g.add(w);
  });
  const tail = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  [-0.7, 0.7].forEach(x => { const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), tail); t.position.set(x, 0.8, 2.02); g.add(t); });
  if (taxi) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.4), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
    sign.position.set(0, 1.95, 0.2); g.add(sign);
    const head = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
    [-0.7, 0.7].forEach(x => { const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), head); h.position.set(x, 0.8, -2.02); g.add(h); });
  }
  return g;
}

const player = makeCar(0xffc928, true);
scene.add(player);
const headlight = new THREE.PointLight(0xffeecc, 1.3, 35);
headlight.position.set(0, 1.2, -4);
player.add(headlight);

/* ---------- дорога и город ---------- */
const road = new THREE.Mesh(new THREE.PlaneGeometry(10, 600), new THREE.MeshLambertMaterial({ color: 0x1a1c2a }));
road.rotation.x = -Math.PI / 2; road.position.z = -200; scene.add(road);
[-1, 1].forEach(s => {
  const walk = new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, 600), new THREE.MeshLambertMaterial({ color: 0x2b2e44 }));
  walk.position.set(s * 7.5, 0.15, -200); scene.add(walk);
});

const dashes = [];
const dashGeo = new THREE.BoxGeometry(0.2, 0.02, 3), dashMat = new THREE.MeshBasicMaterial({ color: 0xdddde8 });
for (let i = 0; i < 24; i++) [-1.6, 1.6].forEach(x => {
  const d = new THREE.Mesh(dashGeo, dashMat);
  d.position.set(x, 0.02, 20 - i * 8); scene.add(d); dashes.push(d);
});
const DASH_SPAN = 24 * 8;

function windowTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#0c0f22'; x.fillRect(0, 0, 64, 128);
  const cols = ['#ffd36b', '#7fe9ff', '#ff6fb0', '#fff2b8'];
  for (let r = 0; r < 12; r++) for (let q = 0; q < 5; q++) {
    if (Math.random() < 0.55) { x.fillStyle = cols[(Math.random() * cols.length) | 0]; x.fillRect(4 + q * 12, 4 + r * 10, 7, 6); }
  }
  return new THREE.CanvasTexture(c);
}
const bTex = [windowTexture(), windowTexture(), windowTexture(), windowTexture()];

const buildings = [];
const B_STEP = 14, B_COUNT = 16;
for (let side = -1; side <= 1; side += 2) for (let i = 0; i < B_COUNT; i++) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ map: bTex[(Math.random() * 4) | 0] }));
  m.userData.side = side;
  placeBuilding(m);
  m.position.z = 30 - i * B_STEP;
  scene.add(m); buildings.push(m);
}
function placeBuilding(m) {
  const w = 6 + Math.random() * 5, h = 10 + Math.random() * 30, d = 10;
  m.scale.set(w, h, d);
  m.position.x = m.userData.side * (10 + w / 2 + Math.random() * 2);
  m.position.y = h / 2;
}

const lamps = [];
for (let i = 0; i < 12; i++) [-1, 1].forEach(s => {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5, 6), new THREE.MeshBasicMaterial({ color: 0x444a66 }));
  pole.position.y = 2.5; g.add(pole);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
  bulb.position.y = 5; g.add(bulb);
  g.position.set(s * 5.6, 0, 20 - i * 20); scene.add(g); lamps.push(g);
});
const LAMP_SPAN = 12 * 20;

/* ---------- состояние ---------- */
let state = 'menu';
let lane = 1, px = 0, speed = 20, dist = 0, lives = 3, earned = 0, trips = 0;
let passenger = null, timeLeft = 0, destAt = 0, destOut = false, pickupOut = false;
let pickupT = 1.5, trafficT = 1, invul = 0, msgTimer = 0;
let objs = [];

function maxSpeed() { return 40 + save.turbo * 5; }

function scroll(dt, sp) {
  dashes.forEach(d => { d.position.z += sp * dt; if (d.position.z > 24) d.position.z -= DASH_SPAN; });
  lamps.forEach(l => { l.position.z += sp * dt; if (l.position.z > 24) l.position.z -= LAMP_SPAN; });
  buildings.forEach(b => {
    b.position.z += sp * dt;
    if (b.position.z > 30) { b.position.z -= B_STEP * B_COUNT; placeBuilding(b); }
  });
}

function toast(t) {
  const m = $('msg'); m.textContent = t; m.classList.add('show');
  clearTimeout(msgTimer); msgTimer = setTimeout(() => m.classList.remove('show'), 1400);
}

function spawn(type, laneIdx) {
  let mesh, v = 0;
  if (type === 'car') {
    const colors = [0x4a7bd0, 0xd04a6a, 0x4ad0a0, 0xb0b0c0, 0x8a4ad0, 0xe07a30];
    mesh = makeCar(colors[(Math.random() * colors.length) | 0], false);
    v = 12 + Math.random() * 12;
  } else {
    const col = type === 'pickup' ? 0x3dffa8 : 0xffc928;
    mesh = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.12, 8, 24), new THREE.MeshBasicMaterial({ color: col }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.2; mesh.add(ring);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 14, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.28, side: THREE.DoubleSide }));
    beam.position.y = 7; mesh.add(beam);
  }
  mesh.position.set(LANES[laneIdx], 0, -170);
  scene.add(mesh);
  objs.push({ mesh, type, v, lane: laneIdx });
}

function clearObjs() { objs.forEach(o => scene.remove(o.mesh)); objs = []; }

function setLives() { $('lives').textContent = '♥'.repeat(Math.max(lives, 0)); }

function startGame() {
  clearObjs();
  lane = 1; px = 0; speed = 20; dist = 0; earned = 0; trips = 0;
  lives = 3 + save.hp; passenger = null; destOut = false; pickupOut = false;
  pickupT = 1.5; trafficT = 1; invul = 0;
  setLives(); $('earned').textContent = '0';
  $('fare').textContent = 'Ищем пассажира'; $('fare').classList.remove('on');
  $('overlay').classList.add('hide'); $('hud').hidden = false; $('touch').hidden = false;
  state = 'play';
}

function endGame() {
  state = 'over';
  save.money += earned; store.set(save);
  $('hud').hidden = true; $('touch').hidden = true;
  $('sub').textContent = 'Смена окончена. Машина в ремонте.';
  $('result').textContent = 'Поездок: ' + trips + ' · Заработано: ' + earned + ' ₸';
  $('start').textContent = 'Ещё смена';
  refreshShop();
  $('overlay').classList.remove('hide');
}

function hit() {
  if (invul > 0) return;
  lives--; setLives(); invul = 1.5; speed *= 0.5; toast('Авария!');
  if (lives <= 0) setTimeout(endGame, 400);
}

/* ---------- игровой цикл ---------- */
function update(dt) {
  if (state !== 'play') { scroll(dt, 18); return; }

  speed = Math.min(speed + 10 * dt, maxSpeed());
  dist += speed * dt;
  scroll(dt, speed);

  px += (LANES[lane] - px) * Math.min(1, dt * 10);
  player.position.x = px;
  player.rotation.y = (px - LANES[lane]) * 0.15;
  if (invul > 0) { invul -= dt; player.visible = Math.floor(invul * 10) % 2 === 0; } else player.visible = true;

  // трафик
  trafficT -= dt;
  if (trafficT <= 0) {
    trafficT = Math.max(0.45, 1.3 - speed / 60) * (0.7 + Math.random() * 0.7);
    const l = (Math.random() * 3) | 0;
    const busy = objs.filter(o => o.mesh.position.z < -120 && o.lane !== l).length;
    if (busy < 2) spawn('car', l);
  }

  // пассажир: метка посадки
  if (!passenger && !pickupOut) {
    pickupT -= dt;
    if (pickupT <= 0) { spawn('pickup', (Math.random() * 3) | 0); pickupOut = true; }
  }
  if (passenger) {
    timeLeft -= dt;
    $('fare').textContent = 'Довези: ' + Math.ceil(Math.max(timeLeft, 0)) + ' с';
    if (!destOut && dist >= destAt) { spawn('dest', (Math.random() * 3) | 0); destOut = true; }
    if (timeLeft <= 0) {
      passenger = null; destOut = false; pickupT = 3;
      objs.filter(o => o.type === 'dest').forEach(o => scene.remove(o.mesh));
      objs = objs.filter(o => o.type !== 'dest');
      $('fare').textContent = 'Ищем пассажира'; $('fare').classList.remove('on');
      toast('Пассажир ушёл');
    }
  }

  // объекты
  for (let i = objs.length - 1; i >= 0; i--) {
    const o = objs[i], m = o.mesh;
    m.position.z += (speed - o.v) * dt;
    if (o.type !== 'car') m.rotation.y += dt * 2;
    const near = Math.abs(m.position.z) < (o.type === 'car' ? 3.8 : 3);
    const dx = Math.abs(m.position.x - px);
    if (near && o.type === 'car' && dx < 2) { hit(); }
    if (near && o.type === 'pickup' && dx < 2.2) {
      scene.remove(m); objs.splice(i, 1);
      passenger = true; pickupOut = false; timeLeft = 35; destAt = dist + 500; destOut = false;
      $('fare').classList.add('on'); toast('Пассажир в машине!'); continue;
    }
    if (near && o.type === 'dest' && dx < 2.2) {
      scene.remove(m); objs.splice(i, 1);
      const reward = 50 + Math.ceil(Math.max(timeLeft, 0)) * 3;
      earned += reward; trips++; passenger = null; destOut = false; pickupT = 2;
      $('earned').textContent = earned;
      $('fare').textContent = 'Ищем пассажира'; $('fare').classList.remove('on');
      toast('+' + reward + ' ₸'); continue;
    }
    if (m.position.z > 14) {
      scene.remove(m); objs.splice(i, 1);
      if (o.type === 'pickup') { pickupOut = false; pickupT = 1; }
      if (o.type === 'dest') { destOut = false; destAt = dist + 150; }
    }
  }

  $('spd').textContent = Math.round(speed * 3);
}

function frame(t) {
  const dt = Math.min(0.05, (t - (frame.last || t)) / 1000);
  frame.last = t;
  update(dt);
  const cx = px * 0.6;
  camera.position.set(cx, 4.6, 9);
  camera.lookAt(cx, 1.5, -12);
  camera.fov = 62 + (speed / 60) * 14; camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

/* ---------- магазин ---------- */
function turboCost() { return 150 * (save.turbo + 1); }
function hpCost() { return 250 * (save.hp + 1); }
function refreshShop() {
  $('money').textContent = save.money;
  const bt = $('buyTurbo'), bh = $('buyHp');
  bt.textContent = save.turbo >= 5 ? 'Турбо: максимум' : 'Турбо ' + save.turbo + '/5 — ' + turboCost() + ' ₸';
  bh.textContent = save.hp >= 3 ? 'Броня: максимум' : 'Броня +1 жизнь ' + save.hp + '/3 — ' + hpCost() + ' ₸';
  bt.disabled = save.turbo >= 5 || save.money < turboCost();
  bh.disabled = save.hp >= 3 || save.money < hpCost();
}
$('buyTurbo').onclick = () => { if (save.turbo < 5 && save.money >= turboCost()) { save.money -= turboCost(); save.turbo++; store.set(save); refreshShop(); } };
$('buyHp').onclick = () => { if (save.hp < 3 && save.money >= hpCost()) { save.money -= hpCost(); save.hp++; store.set(save); refreshShop(); } };
$('start').onclick = startGame;

/* ---------- управление ---------- */
function move(d) { if (state === 'play') lane = Math.max(0, Math.min(2, lane + d)); }
window.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') move(-1);
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') move(1);
});
$('bl').addEventListener('pointerdown', () => move(-1));
$('br').addEventListener('pointerdown', () => move(1));
let sx = null;
window.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
window.addEventListener('touchend', e => {
  if (sx === null) return;
  const dx = e.changedTouches[0].clientX - sx;
  if (Math.abs(dx) > 40) move(dx > 0 ? 1 : -1);
  sx = null;
}, { passive: true });

refreshShop();
requestAnimationFrame(frame);
})();
