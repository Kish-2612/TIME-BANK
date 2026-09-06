import { login, register } from "./api.js";
import { mountChrome, renderFooter } from "./app.js";
import { setButtonBusy, toast } from "./ui.js";

function strengthScore(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) || /[^\w\s]/.test(password)) score += 1;
  return score;
}

function setError(form, name, message) {
  const field = form.querySelector(`[data-error="${name}"]`);
  if (field) field.textContent = message || "";
}

document.addEventListener("DOMContentLoaded", async () => {
  await mountChrome();
  renderFooter();

  const loginForm = document.querySelector("[data-login-form]");
  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.email.value.trim();
    const password = form.password.value;
    setError(form, "email", email.includes("@") ? "" : "Enter a valid email.");
    setError(form, "password", password ? "" : "Password is required.");
    if (!email.includes("@") || !password) return;
    const button = form.querySelector("button[type=submit]");
    setButtonBusy(button, true);
    try {
      await login(email, password);
      toast("Welcome back. Your time ledger is ready.");
      window.location.href = "dashboard.html";
    } catch (error) {
      toast(error.message || "Something went wrong. Please try again.", "error");
    } finally {
      setButtonBusy(button, false);
    }
  });

  const registerForm = document.querySelector("[data-register-form]");
  const meter = document.querySelector("[data-strength]");
  registerForm?.password?.addEventListener("input", () => {
    const score = strengthScore(registerForm.password.value);
    meter.className = `strength ${score === 2 ? "ok" : score >= 3 ? "strong" : ""}`;
    meter.querySelector("span").style.width = `${(score / 3) * 100}%`;
  });

  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fullName = form.fullName.value.trim();
    const username = form.username.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirm = form.confirm.value;
    let valid = true;
    const fail = (name, message) => {
      setError(form, name, message);
      valid = false;
    };
    if (fullName.length < 2) fail("fullName", "Enter your full name.");
    else setError(form, "fullName");
    if (!/^[a-z0-9_]{3,}$/i.test(username)) fail("username", "Use at least 3 letters or numbers.");
    else setError(form, "username");
    if (!email.includes("@")) fail("email", "Enter a valid email.");
    else setError(form, "email");
    if (strengthScore(password) < 2) fail("password", "Use 8+ characters with mixed case.");
    else setError(form, "password");
    if (password !== confirm) fail("confirm", "Passwords do not match.");
    else setError(form, "confirm");
    if (!valid) return;
    const button = form.querySelector("button[type=submit]");
    setButtonBusy(button, true);
    try {
      const result = await register({
        fullName,
        username,
        email,
        password,
        skills: form.skills.value,
        location: form.location.value
      });
      if (result.session) {
        toast("Your TimeBank is open.");
        window.location.href = "dashboard.html";
      } else {
        toast("Account created. Check your email to confirm it before logging in.");
        window.location.href = "login.html";
      }
    } catch (error) {
      toast(error.message || "Something went wrong. Please try again.", "error");
    } finally {
      setButtonBusy(button, false);
    }
  });
});
