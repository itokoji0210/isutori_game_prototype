const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const comboEl = document.querySelector("#combo");
const stationEl = document.querySelector("#station");
const crowdMeter = document.querySelector("#crowdMeter");
const startBtn = document.querySelector("#startBtn");
const leftBtn = document.querySelector("#leftBtn");
const rightBtn = document.querySelector("#rightBtn");
const sitBtn = document.querySelector("#sitBtn");

const W = canvas.width;
const H = canvas.height;
const seats = Array.from({ length: 8 }, (_, i) => ({
  x: 120 + i * 102,
  y: 334,
  w: 76,
  h: 58,
  occupied: true,
  timer: 0,
  passenger: null,
}));

const state = {
  running: false,
  ended: false,
  t: 0,
  last: 0,
  score: 0,
  combo: 0,
  station: 1,
  playerSeat: 3,
  playerSitting: false,
  seatUntil: 0,
  crowd: 28,
  message: "空いた席を見逃すな",
  messageT: 999,
  rivals: [],
  particles: [],
  trainShake: 0,
  nextStation: 13,
  nextOpen: 1.6,
  missT: 0,
};

const palettes = [
  ["#7fd7ff", "#293b4a"],
  ["#ff9f9f", "#563036"],
  ["#c7ff83", "#384b2d"],
  ["#d9bcff", "#3a3150"],
  ["#ffd280", "#4a3b27"],
];

function reset() {
  state.running = true;
  state.ended = false;
  state.t = 0;
  state.last = performance.now();
  state.score = 0;
  state.combo = 0;
  state.station = 1;
  state.playerSeat = 3;
  state.playerSitting = false;
  state.seatUntil = 0;
  state.crowd = 28;
  state.rivals = [];
  state.particles = [];
  state.nextStation = 13;
  state.nextOpen = 1.2;
  state.message = "次の駅、停車します";
  state.messageT = 2;
  seats.forEach((seat, i) => {
    seat.occupied = true;
    seat.timer = 0;
    seat.passenger = makePassenger(i);
  });
  updateHud();
}

function makePassenger(seed) {
  const colors = palettes[seed % palettes.length];
  return {
    body: colors[0],
    bag: colors[1],
    bob: Math.random() * 6.28,
  };
}

function updateHud() {
  scoreEl.textContent = state.score;
  comboEl.textContent = state.combo;
  stationEl.textContent = state.station;
  crowdMeter.style.width = `${Math.min(100, state.crowd)}%`;
}

function move(dir) {
  if (!state.running || state.playerSitting) return;
  state.playerSeat = Math.max(0, Math.min(seats.length - 1, state.playerSeat + dir));
}

function sit() {
  if (!state.running || state.playerSitting) return;
  const seat = seats[state.playerSeat];
  if (!seat.occupied) {
    const quick = Math.max(0, 1 - seat.timer / 2.8);
    const gain = Math.round(80 + quick * 170 + state.combo * 18);
    state.score += gain;
    state.combo += 1;
    state.playerSitting = true;
    state.seatUntil = state.t + 1.2;
    seat.occupied = true;
    seat.timer = 0;
    state.message = `着席成功 +${gain}`;
    state.messageT = 1.1;
    burst(seat.x + seat.w / 2, seat.y - 22, "#ffd24a", 18);
  } else {
    state.combo = 0;
    state.score = Math.max(0, state.score - 35);
    state.missT = 0.22;
    state.message = "そこはまだ空いてない";
    state.messageT = 0.85;
  }
  updateHud();
}

function openSeat() {
  const candidates = seats
    .map((seat, i) => ({ seat, i }))
    .filter(({ seat, i }) => seat.occupied && i !== state.playerSeat);
  if (!candidates.length) return;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  pick.seat.occupied = false;
  pick.seat.timer = 0;
  pick.seat.passenger = null;
  spawnRivals(pick.i);
  state.message = "席が空いた!";
  state.messageT = 0.8;
}

function spawnRivals(target) {
  const count = Math.min(5, 1 + Math.floor(state.station / 2) + Math.floor(state.crowd / 35));
  for (let i = 0; i < count; i += 1) {
    const fromLeft = Math.random() > 0.5;
    state.rivals.push({
      x: fromLeft ? -40 - Math.random() * 180 : W + 40 + Math.random() * 180,
      y: 270 + Math.random() * 76,
      target,
      speed: 86 + state.station * 9 + Math.random() * 42,
      color: palettes[(i + target + state.station) % palettes.length][0],
      bag: palettes[(i + target + state.station) % palettes.length][1],
      bob: Math.random() * 6.28,
    });
  }
}

function stationStop() {
  state.station += 1;
  state.crowd = Math.min(98, state.crowd + 8 + Math.random() * 10);
  state.nextStation = state.t + Math.max(7.5, 13 - state.station * 0.42);
  state.trainShake = 0.45;
  state.message = state.station % 4 === 0 ? "急に混んできた" : "ドアが閉まります";
  state.messageT = 1.3;
  seats.forEach((seat, i) => {
    if (!seat.occupied) {
      seat.occupied = true;
      seat.passenger = makePassenger(i + state.station);
    }
  });
  if (state.station >= 12) {
    endGame();
  }
}

function endGame() {
  state.running = false;
  state.ended = true;
  const rank = state.score > 5200 ? "神座席ハンター" : state.score > 3300 ? "通勤プロ" : "まだ立てる";
  state.message = `${rank}  SCORE ${state.score}`;
  state.messageT = 999;
  startBtn.textContent = "RETRY";
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = 50 + Math.random() * 160;
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 40,
      life: 0.45 + Math.random() * 0.35,
      color,
    });
  }
}

function step(now) {
  const dt = Math.min(0.033, (now - state.last) / 1000 || 0);
  state.last = now;
  if (state.running) update(dt);
  draw();
  requestAnimationFrame(step);
}

function update(dt) {
  state.t += dt;
  state.trainShake = Math.max(0, state.trainShake - dt);
  state.missT = Math.max(0, state.missT - dt);
  state.messageT = Math.max(0, state.messageT - dt);

  if (state.t >= state.nextOpen) {
    openSeat();
    state.nextOpen = state.t + Math.max(0.72, 2.1 - state.station * 0.08 - state.crowd * 0.006) + Math.random() * 0.8;
  }

  if (state.t >= state.nextStation) {
    stationStop();
  }

  if (state.playerSitting && state.t >= state.seatUntil) {
    state.playerSitting = false;
    seats[state.playerSeat].passenger = makePassenger(state.playerSeat + state.station);
  }

  seats.forEach((seat) => {
    if (!seat.occupied) {
      seat.timer += dt;
      if (seat.timer > 2.85) {
        seat.occupied = true;
        seat.passenger = makePassenger(Math.floor(Math.random() * 99));
        state.combo = 0;
        state.message = "席を取られた";
        state.messageT = 0.85;
        updateHud();
      }
    }
  });

  for (const rival of state.rivals) {
    const target = seats[rival.target];
    const tx = target.x + target.w / 2;
    rival.x += Math.sign(tx - rival.x) * rival.speed * dt;
    rival.bob += dt * 8;
    if (Math.abs(tx - rival.x) < 10 && !target.occupied) {
      target.occupied = true;
      target.passenger = { body: rival.color, bag: rival.bag, bob: rival.bob };
      state.combo = 0;
      state.message = "ライバルに座られた";
      state.messageT = 0.9;
      burst(tx, target.y - 12, "#ff5d5d", 9);
      updateHud();
    }
  }
  state.rivals = state.rivals.filter((r) => Math.abs(seats[r.target].x + seats[r.target].w / 2 - r.x) > 12);

  for (const p of state.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 300 * dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
}

function draw() {
  const shake = state.trainShake ? Math.sin(state.t * 80) * state.trainShake * 7 : 0;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(shake, 0);
  drawTrain();
  drawSeats();
  drawRivals();
  drawPlayer();
  drawUi();
  ctx.restore();
}

function drawTrain() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#18202a");
  grad.addColorStop(0.55, "#12161d");
  grad.addColorStop(1, "#242b34");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#25303a";
  ctx.fillRect(0, 46, W, 20);
  ctx.fillRect(0, 432, W, 42);
  ctx.fillStyle = "#11161d";
  ctx.fillRect(62, 84, 214, 142);
  ctx.fillRect(342, 84, 276, 142);
  ctx.fillRect(684, 84, 214, 142);
  ctx.strokeStyle = "#465260";
  ctx.lineWidth = 5;
  [62, 342, 684].forEach((x, i) => {
    ctx.strokeRect(x, 84, i === 1 ? 276 : 214, 142);
  });

  ctx.fillStyle = "#e6edf7";
  ctx.font = "700 24px Segoe UI";
  ctx.fillText(`次は ${stationName(state.station + 1)}`, 378, 52);
  ctx.fillStyle = "#ffd24a";
  ctx.fillRect(0, 245, W, 9);

  for (let x = 40; x < W; x += 92) {
    ctx.strokeStyle = "#424a55";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, 66);
    ctx.lineTo(x, 132);
    ctx.stroke();
    ctx.strokeStyle = "#ffd24a";
    ctx.beginPath();
    ctx.arc(x, 148, 15, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function stationName(n) {
  const names = ["新宿", "代々木", "原宿", "渋谷", "恵比寿", "目黒", "品川", "東京", "秋葉原", "上野", "巣鴨", "池袋", "終点"];
  return names[Math.min(names.length - 1, n - 1)];
}

function drawSeats() {
  seats.forEach((seat, i) => {
    const hot = !seat.occupied;
    ctx.fillStyle = hot ? "#243d32" : "#303844";
    ctx.fillRect(seat.x, seat.y, seat.w, seat.h);
    ctx.fillStyle = hot ? "#4de2a0" : "#55606c";
    ctx.fillRect(seat.x + 4, seat.y + 5, seat.w - 8, 8);
    ctx.fillStyle = "#161a20";
    ctx.fillRect(seat.x + 5, seat.y + seat.h - 9, seat.w - 10, 8);

    if (hot) {
      const pulse = 0.5 + Math.sin(state.t * 12) * 0.5;
      ctx.strokeStyle = `rgba(77, 226, 160, ${0.45 + pulse * 0.35})`;
      ctx.lineWidth = 4;
      ctx.strokeRect(seat.x - 5, seat.y - 5, seat.w + 10, seat.h + 10);
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 17px Segoe UI";
      ctx.fillText("OPEN", seat.x + 13, seat.y - 12);
    }

    if (seat.occupied && seat.passenger) {
      drawPassenger(seat.x + seat.w / 2, seat.y + 4, seat.passenger, false);
    }

    if (i === state.playerSeat && !state.playerSitting) {
      ctx.strokeStyle = state.missT ? "#ff5d5d" : "#ffd24a";
      ctx.lineWidth = 5;
      ctx.strokeRect(seat.x - 9, seat.y - 9, seat.w + 18, seat.h + 18);
    }
  });
}

function drawPassenger(x, y, p, standing) {
  const bob = Math.sin(state.t * 6 + p.bob) * 3;
  ctx.fillStyle = p.body;
  ctx.beginPath();
  ctx.arc(x, y + 8 + bob, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.bag;
  ctx.fillRect(x - 19, y + 24 + bob, 38, standing ? 58 : 48);
  ctx.fillStyle = "#12161d";
  ctx.fillRect(x - 21, y + 39 + bob, 42, 6);
  ctx.strokeStyle = "#101318";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - 10, y + 76 + bob);
  ctx.lineTo(x - 18, y + 99 + bob);
  ctx.moveTo(x + 10, y + 76 + bob);
  ctx.lineTo(x + 18, y + 99 + bob);
  ctx.stroke();
}

function drawRivals() {
  state.rivals.forEach((r) => drawPassenger(r.x, r.y, r, true));
}

function drawPlayer() {
  const seat = seats[state.playerSeat];
  const x = seat.x + seat.w / 2;
  const y = state.playerSitting ? seat.y + 2 : 258;
  const bob = state.playerSitting ? 0 : Math.sin(state.t * 10) * 4;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y + bob, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1f8cff";
  ctx.fillRect(x - 22, y + 17 + bob, 44, state.playerSitting ? 49 : 66);
  ctx.fillStyle = "#ffd24a";
  ctx.fillRect(x - 25, y + 38 + bob, 50, 8);
  ctx.fillStyle = "#0f1318";
  ctx.font = "900 14px Segoe UI";
  ctx.fillText("YOU", x - 15, y + 56 + bob);
}

function drawUi() {
  const until = Math.max(0, state.nextStation - state.t);
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.fillRect(30, 24, 198, 48);
  ctx.fillStyle = "#f7f7fb";
  ctx.font = "800 18px Segoe UI";
  ctx.fillText(`駅まで ${until.toFixed(1)} 秒`, 48, 55);

  if (state.messageT > 0) {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.58)";
    ctx.fillRect(266, 266, 428, 58);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 30px Segoe UI";
    ctx.fillText(state.message, W / 2, 304);
    ctx.textAlign = "left";
  }

  if (!state.running && !state.ended) {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.56)";
    ctx.fillRect(180, 168, 600, 170);
    ctx.fillStyle = "#ffd24a";
    ctx.font = "900 44px Segoe UI";
    ctx.fillText("電車の椅子取りゲーム", W / 2, 230);
    ctx.fillStyle = "#f7f7fb";
    ctx.font = "700 22px Segoe UI";
    ctx.fillText("← → で移動 / Space で着席", W / 2, 278);
    ctx.textAlign = "left";
  }

  state.particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 6, 6);
    ctx.globalAlpha = 1;
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") move(-1);
  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") move(1);
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    sit();
  }
});

leftBtn.addEventListener("click", () => move(-1));
rightBtn.addEventListener("click", () => move(1));
sitBtn.addEventListener("click", sit);
startBtn.addEventListener("click", () => {
  startBtn.textContent = "RUNNING";
  reset();
});

draw();
requestAnimationFrame(step);
