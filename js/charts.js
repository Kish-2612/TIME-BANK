export function drawLineChart(canvas, values, color = "#35E0D0") {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const max = Math.max(...values) * 1.15;
  const stepX = width / (values.length - 1);
  const points = values.map((value, index) => [
    index * stepX,
    height - 18 - (value / max) * (height - 36)
  ]);

  ctx.strokeStyle = "rgba(248,250,252,0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    const y = 18 + ((height - 36) / 3) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, `${color}33`);
  gradient.addColorStop(1, `${color}00`);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.fillStyle = gradient;
  ctx.fill();
}

export function drawBars(canvas, values, color = "#8B7CFF") {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const max = Math.max(...values);
  const gap = 10;
  const barW = (width - gap * (values.length + 1)) / values.length;

  values.forEach((value, index) => {
    const h = (value / max) * (height - 24);
    const x = gap + index * (barW + gap);
    const y = height - 12 - h;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x, y, barW, h);
  });
  ctx.globalAlpha = 1;
}
