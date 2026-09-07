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

export function drawTimeActivity(canvas, points, tooltip) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const padding = { top: 18, right: 18, bottom: 34, left: 38 };
  const plotWidth = Math.max(1, width - padding.left - padding.right);
  const plotHeight = Math.max(1, height - padding.top - padding.bottom);
  const max = Math.max(1, ...points.flatMap((point) => [point.earned, point.spent])) * 1.15;
  const x = (index) => padding.left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
  const y = (value) => padding.top + plotHeight - (value / max) * plotHeight;

  ctx.font = "11px Plus Jakarta Sans, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = "rgba(23, 50, 77, .10)";
  ctx.fillStyle = "#718096";
  for (let index = 0; index < 4; index += 1) {
    const value = (max / 3) * (3 - index);
    const lineY = y(value);
    ctx.beginPath();
    ctx.moveTo(padding.left, lineY);
    ctx.lineTo(width - padding.right, lineY);
    ctx.stroke();
    ctx.fillText(value.toFixed(value < 10 ? 1 : 0), padding.left - 8, lineY);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  points.forEach((point, index) => ctx.fillText(point.label, x(index), height - padding.bottom + 12));

  const series = [{ key: "earned", color: "#3a9d76" }, { key: "spent", color: "#f26b4f" }];
  series.forEach(({ key, color }) => {
    ctx.beginPath();
    points.forEach((point, index) => index ? ctx.lineTo(x(index), y(point[key])) : ctx.moveTo(x(index), y(point[key])));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.stroke();
    points.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(x(index), y(point[key]), 4, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  });
  canvas._timeActivityScale = { x, y, points };
  canvas.onmousemove = (event) => {
    const rect = canvas.getBoundingClientRect();
    const position = event.clientX - rect.left;
    const index = points.reduce((closest, point, pointIndex) => Math.abs(x(pointIndex) - position) < Math.abs(x(closest) - position) ? pointIndex : closest, 0);
    const point = points[index];
    tooltip.innerHTML = `<strong>${point.label}</strong><span class="tooltip-earned">Earned: +${point.earned.toFixed(1)} hrs</span><span class="tooltip-spent">Spent: -${point.spent.toFixed(1)} hrs</span>`;
    tooltip.style.left = `${Math.min(Math.max(x(index), 62), width - 62)}px`;
    tooltip.hidden = false;
  };
  canvas.onmouseleave = () => { tooltip.hidden = true; };
}
