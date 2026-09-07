import { loadTransactions } from "./api.js";
import { mountChrome } from "./app.js";
import { formatDate, formatHours } from "./ui.js";

function row(item) {
  const sign = item.incoming ? "+" : "-";
  const klass = item.type === "community_donation" ? "donate" : item.incoming ? "earn" : "spend";
  return `
    <tr>
      <td>${formatDate(item.date)}</td>
      <td>${item.person}</td>
      <td>${item.service}</td>
      <td class="amt ${klass} num">${sign}${item.amount.toFixed(1)} hr</td>
      <td>${item.status}</td>
    </tr>
  `;
}

function card(item) {
  const sign = item.incoming ? "+" : "-";
  const klass = item.type === "community_donation" ? "donate" : item.incoming ? "earn" : "spend";
  return `
    <article class="dark-card">
      <strong class="amt ${klass} num">${sign}${formatHours(item.amount)}</strong>
      <p>${item.service}</p>
      <p class="muted">${item.person} · ${formatDate(item.date)}</p>
      <p>${item.status}</p>
    </article>
  `;
}

async function render(filter) {
  const rows = await loadTransactions(filter);
  document.querySelector("[data-tx-body]").innerHTML = rows.map(row).join("");
  document.querySelector("[data-tx-mobile]").innerHTML = rows.map(card).join("");
  if (!rows.length) {
    document.querySelector("[data-tx-mobile]").innerHTML = `<div class="empty">No transactions in this filter yet.</div>`;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!(await mountChrome({ app: true }))) return;
  await render("All");
  document.querySelector("[data-tx-filters]").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    document.querySelectorAll("[data-filter]").forEach((chip) => chip.classList.toggle("is-active", chip === button));
    await render(button.dataset.filter);
  });
});
