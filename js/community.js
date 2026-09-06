import { donateTime, loadCommunity } from "./api.js";
import { mountChrome, renderFooter } from "./app.js";
import { animateCount, openModal, toast } from "./ui.js";

document.addEventListener("DOMContentLoaded", async () => {
  await mountChrome();
  renderFooter();
  const pool = await loadCommunity();
  animateCount(document.querySelector("[data-pool-hours]"), pool.hours);
  document.querySelector("[data-pool-donors]").textContent = String(pool.donors);
  document.querySelector("[data-pool-helped]").textContent = String(pool.helped);
  document.querySelector("[data-donate]")?.addEventListener("click", () => {
    openModal({
      title: "Donate Time",
      body: "Give 1 unused Time Credit to people who cannot yet give time back.",
      confirmText: "Donate 1 hr",
      onConfirm: async () => {
        const next = await donateTime(1);
        document.querySelector("[data-pool-hours]").textContent = String(next.pool.hours);
        document.querySelector("[data-pool-donors]").textContent = String(next.pool.donors);
        toast("Time Credit transferred successfully.");
      }
    });
  });
});
