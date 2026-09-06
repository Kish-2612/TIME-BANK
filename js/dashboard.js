import { loadNotifications, loadRequests, loadTransactions, loadWallet } from "./api.js";
import { monthlyExchange, weeklyActivity } from "./data.js";
import { mountChrome } from "./app.js";
import { animateCount, formatDate, formatHours } from "./ui.js";
import { drawBars, drawLineChart } from "./charts.js";

function txClass(type) {
  if (type === "earned") return "earn";
  if (type === "donated") return "donate";
  return "spend";
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!(await mountChrome({ app: true }))) return;
  const wallet = await loadWallet();
  animateCount(document.querySelector("[data-balance]"), wallet.balance, { decimals: 1, suffix: " hrs" });
  document.querySelector("[data-earned]").textContent = `+${wallet.earned} hrs`;
  document.querySelector("[data-spent]").textContent = `-${wallet.spent} hrs`;
  document.querySelector("[data-community]").textContent = `+${wallet.community} hrs`;

  const txs = await loadTransactions();
  document.querySelector("[data-tx-list]").innerHTML = txs
    .slice(0, 4)
    .map(
      (row) => `
      <div class="tx">
        <strong class="amt ${txClass(row.type)} num">${row.type === "spent" || row.type === "donated" ? "-" : "+"}${row.amount.toFixed(1)} hr</strong>
        <div>
          <div>${row.service}</div>
          <div class="muted">${formatDate(row.date)}</div>
        </div>
        <span class="muted">${row.status}</span>
      </div>
    `
    )
    .join("");

  const requests = await loadRequests();
  document.querySelector("[data-request-count]").textContent = String(requests.filter((item) => item.status === "new").length);
  const notes = await loadNotifications();
  document.querySelector("[data-note-count]").textContent = String(notes.filter((item) => item.unread).length);

  drawLineChart(document.querySelector("[data-week-chart]"), weeklyActivity);
  drawBars(document.querySelector("[data-month-chart]"), monthlyExchange, "#FFC857");
  window.addEventListener("resize", () => {
    drawLineChart(document.querySelector("[data-week-chart]"), weeklyActivity);
    drawBars(document.querySelector("[data-month-chart]"), monthlyExchange, "#FFC857");
  });
});
