import { loadReviews, loadUserProfile } from "./api.js";
import { mountChrome, renderFooter } from "./app.js";
import { animateCount, initials, stars } from "./ui.js";

document.addEventListener("DOMContentLoaded", async () => {
  if (!(await mountChrome({ app: true }))) return;
  const profile = await loadUserProfile();
  document.querySelector("[data-profile-name]").textContent = profile.fullName;
  document.querySelector("[data-profile-meta]").textContent = `${profile.location} · @${profile.username}`;
  document.querySelector("[data-profile-bio]").textContent = profile.bio;
  document.querySelector("[data-profile-avatar]").textContent = initials(profile.fullName);
  document.querySelector("[data-verified]").textContent = profile.verified ? "Verified member" : "Member";
  document.querySelector("[data-skills]").innerHTML = (profile.skills || [])
    .map((skill) => `<span class="skill-pill">${skill}</span>`)
    .join("");
  animateCount(document.querySelector("[data-given]"), profile.hoursGiven || 0);
  animateCount(document.querySelector("[data-received]"), profile.hoursReceived || 0);
  const ratingNode = document.querySelector("[data-rating]");
  if (ratingNode) {
    if (profile.rating) animateCount(ratingNode, profile.rating, { decimals: 1 });
    else ratingNode.textContent = "No ratings yet";
  }
  animateCount(document.querySelector("[data-helped]"), profile.peopleHelped || 0);

  const ring = document.querySelector("[data-rep-ring]");
  if (ring) {
    const c = 2 * Math.PI * 54;
    const pct = profile.reputation || 80;
    ring.style.strokeDasharray = String(c);
    ring.style.strokeDashoffset = String(c - (pct / 100) * c);
  }
  document.querySelector("[data-rep-label]").textContent = `${profile.reputation || 80}`;

  const reviews = await loadReviews(profile.id);
  document.querySelector("[data-reviews]").innerHTML = reviews.length ? reviews
    .map((review) => {
      return `<article class="dark-card">
        <div class="person">
          <div class="avatar violet">${initials(review.user.fullName)}</div>
          <div><strong>${review.user.fullName}</strong><div class="stars">${stars(review.rating)}</div></div>
        </div>
        <p style="margin-top:12px;">${review.text}</p>
      </article>`;
    })
    .join("") : `<div class="empty"><p>No reviews yet.</p></div>`;
});
