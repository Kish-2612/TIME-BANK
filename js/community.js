import { donateTime, loadCommunity } from "./api.js";
import { mountChrome, renderFooter } from "./app.js";
import { animateCount, openModal, toast } from "./ui.js";

document.addEventListener("DOMContentLoaded", async () => {
  await mountChrome();
  renderFooter();
  let pool;
  try {
    pool = await loadCommunity();
  } catch (error) {
    document.querySelector("[data-pool-hours]").textContent = "Unavailable";
    document.querySelector("[data-pool-donated]").textContent = error.message;
    document.querySelector("[data-pool-distributed]").textContent = "";
    return;
  }
  animateCount(document.querySelector("[data-pool-hours]"), pool.hours);
  document.querySelector("[data-pool-donated]").textContent = `${pool.donated.toFixed(1)} hrs donated`;
  document.querySelector("[data-pool-distributed]").textContent = `${pool.distributed.toFixed(1)} hrs distributed`;
  document.querySelector("[data-donate]")?.addEventListener("click", () => {
    openModal({
      title: "Donate Time",
      body: "Give 1 unused Time Credit to people who cannot yet give time back.",
      confirmText: "Donate 1 hr",
      onConfirm: async () => {
        const next = await donateTime(1);
        document.querySelector("[data-pool-hours]").textContent = next.pool.hours.toFixed(1);
        document.querySelector("[data-pool-donated]").textContent = `${next.pool.donated.toFixed(1)} hrs donated`;
        document.querySelector("[data-pool-distributed]").textContent = `${next.pool.distributed.toFixed(1)} hrs distributed`;
        toast("Time Credit transferred successfully.");
      }
    });
  });
});
