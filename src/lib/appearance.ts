export const APPEARANCE_STORAGE_KEY = "campaign-hub-appearance";

// Runs in the document head before paint; contains no user-provided content.
export const APPEARANCE_INIT_SCRIPT = `(() => {
  let preference;
  try { preference = localStorage.getItem(${JSON.stringify(APPEARANCE_STORAGE_KEY)}); } catch {}
  const dark = preference === "dark" || (preference !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
})();`;
