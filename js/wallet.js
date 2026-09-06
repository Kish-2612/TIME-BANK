import { donateTime, loadTransactions, loadWallet } from "./api.js";
import { weeklyActivity } from "./data.js";
import { mountChrome } from "./app.js";
import { animateCount, formatDate, openModal, toast } from "./ui.js";
import { drawLineChart } from "./charts.js";

document.addEventListener("DOMContentLoaded", async () => {
  if (!(await mountChrome({ app: true }))) return;
  const wallet = await loadWallet();
  animateCount(document.querySelector("[data-wallet-balance]"), wallet.balance, { decimals: 1 });
  document.querySelector("[data-wallet-month]").textContent = `+${wallet.earnedThisMonth.toFixed(1)} hrs this month`;
  document.querySelector("[data-wallet-earned]").textContent = `${wallet.earned.toFixed(1)} hrs`;
  document.querySelector("[data-wallet-spent]").textContent = `${wallet.spent.toFixed(1)} hrs`;

  const ring = document.querySelector("[data-wallet-ring]");
  if (ring) {
    const pct = Math.min(100, (wallet.balance / 12) * 100);
    const c = 2 * Math.PI * 90;
    ring.style.strokeDasharray = String(c);
    ring.style.strokeDashoffset = String(c - (pct / 100) * c);
  }

  const txs = await loadTransactions();
  document.querySelector("[data-wallet-tx]").innerHTML = txs
    .slice(0, 5)
    .map((row) => {
      const sign = row.type === "earned" ? "+" : "-";
      const klass = row.type === "earned" ? "earn" : row.type === "donated" ? "donate" : "spend";
      return `<div class="tx">
        <strong class="amt ${klass} num">${sign}${row.amount.toFixed(1)} hr</strong>
        <div><div>${row.service}</div><div class="muted">${formatDate(row.date)} · ${row.person}</div></div>
        <span class="muted">${row.status}</span>
      </div>`;
    })
    .join("");

  drawLineChart(document.querySelector("[data-earn-chart]"), weeklyActivity, "#FFC857");

  document.querySelector("[data-donate]")?.addEventListener("click", () => {
    openModal({
      title: "Donate Time",
      body: "Move 1.0 Time Credit into the community pool for people who cannot give time back yet.",
      confirmText: "Donate 1 hr",
      onConfirm: async () => {
        await donateTime(1);
        toast("Time Credit transferred successfully.");
        const next = await loadWallet();
        document.querySelector("[data-wallet-balance]").textContent = next.balance.toFixed(1);
      }
    });
  });
});
