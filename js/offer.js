import { createService } from "./api.js";
import { CATEGORIES } from "./data.js";
import { mountChrome } from "./app.js";
import { setButtonBusy, toast } from "./ui.js";

function setError(form, name, message) {
  const node = form.querySelector(`[data-error="${name}"]`);
  if (node) node.textContent = message || "";
}

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.querySelector("[data-offer-form]");
  if (!form) return;
  if (!(await mountChrome({ app: true }))) return;
  const select = form.category;
  CATEGORIES.filter((item) => item !== "All").forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    select.append(option);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = form.title.value.trim();
    const category = form.category.value;
    const description = form.description.value.trim();
    const duration = Number(form.duration.value);
    const availability = form.availability.value.trim();
    const location = form.location.value.trim();
    const mode = form.mode.value;
    const cost = Number(form.cost.value);
    let valid = true;
    const fail = (name, message) => {
      setError(form, name, message);
      valid = false;
    };
    if (title.length < 4) fail("title", "Give the service a clear title.");
    else setError(form, "title");
    if (!category) fail("category", "Choose a category.");
    else setError(form, "category");
    if (description.length < 12) fail("description", "Describe what someone will receive.");
    else setError(form, "description");
    if (!(duration > 0)) fail("duration", "Duration must be greater than 0.");
    else setError(form, "duration");
    if (!availability) fail("availability", "Add when you can help.");
    else setError(form, "availability");
    if (!location) fail("location", "Add a location or Online.");
    else setError(form, "location");
    if (!(cost > 0)) fail("cost", "Time Credit value must be greater than 0.");
    else setError(form, "cost");
    if (!valid) return;
    const button = form.querySelector("button[type=submit]");
    setButtonBusy(button, true, "Publishing...");
    try {
      await createService({ title, category, description, duration, availability, location, mode, cost });
      toast("Service published. It’s live in the marketplace.");
      form.reset();
    } catch (error) {
      toast(error.message || "Unable to publish your service.", "error");
    } finally {
      setButtonBusy(button, false);
    }
  });
});
