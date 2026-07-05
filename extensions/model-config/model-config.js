/**
 * Model Config — override provider models via JSON config (no source modification)
 * Watches DOM mutations to re-apply after app.js repopulates the select.
 * Adds thinking/reasoning_effort params per DeepSeek API docs.
 */
(function () {
  "use strict";

  var CONFIG_URL = "/extensions/model-config/model-config.json";
  var modelOverrides = null;
  var applyTimer = null;

  function loadConfig() {
    return fetch(CONFIG_URL).then(function (r) { return r.json(); }).then(function (cfg) {
      modelOverrides = cfg;
    }).catch(function () { /* no config */ });
  }

  // ── Apply model overrides ──────────────────────────────────

  function applyModelOverrides() {
    if (!modelOverrides) return;
    var provider = document.querySelector("#providerSelect");
    var modelSelect = document.querySelector("#modelInput");
    if (!provider || !modelSelect) return;

    var providerKey = provider.value;
    var overrides = modelOverrides[providerKey];
    if (!overrides || !overrides.models) return;

    // Check current options — skip if already matching
    var currentOpts = Array.from(modelSelect.options).map(function (o) { return o.value + "|" + (o.dataset.thinking || "0"); });
    var targetOpts = overrides.models.map(function (m) { return m.value + "|" + (m.thinking ? "1" : "0"); });
    if (currentOpts.join(",") === targetOpts.join(",")) return;

    // Replace options
    modelSelect.innerHTML = "";
    overrides.models.forEach(function (m) {
      var opt = document.createElement("option");
      opt.value = m.value;
      opt.textContent = m.label;
      if (m.thinking) opt.dataset.thinking = "1";
      modelSelect.appendChild(opt);
    });
    // Do NOT dispatch change — would trigger persistEnginePreferences → bindProviderModelsSync → loop
    modelSelect.dataset.patchedProvider = providerKey;
  }

  // ── Debounced re-apply (app.js repopulates multiple times) ──

  function scheduleApply() {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(applyModelOverrides, 30);
  }

  // ── Fetch interceptor: inject thinking param (V4 needs explicit enabled/disabled) ──

  var _origFetch = window.fetch;
  window.fetch = function (url, options) {
    if (typeof url === "string" && url.includes("api.deepseek.com")) {
      var provider = document.querySelector("#providerSelect");
      var modelSelect = document.querySelector("#modelInput");
      if (provider && provider.value === "deepseek" && modelSelect) {
        var selectedOpt = modelSelect.options[modelSelect.selectedIndex];
        if (selectedOpt) {
          try {
            options = options || {};
            var body = JSON.parse(options.body || "{}");
            if (selectedOpt.dataset.thinking === "1") {
              body.thinking = { type: "enabled" };
              body.reasoning_effort = "high";
            } else {
              // V4 defaults thinking ON — must explicitly disable
              body.thinking = { type: "disabled" };
            }
            options.body = JSON.stringify(body);
          } catch (e) { /* ignore */ }
        }
      }
    }
    return _origFetch.call(this, url, options);
  };

  // ── Watch: provider change + model select mutations ────────

  function watch() {
    var provider = document.querySelector("#providerSelect");
    var modelSelect = document.querySelector("#modelInput");
    if (!provider || !modelSelect) return;

    // On provider change, re-apply after app.js populates
    provider.addEventListener("change", function () {
      scheduleApply();
      // Also schedule multiple retries — app.js might repopulate asynchronously via persistEnginePreferences
      setTimeout(scheduleApply, 100);
      setTimeout(scheduleApply, 300);
    });

    // MutationObserver: catch any DOM change to modelSelect's children (app.js repopulation)
    var obs = new MutationObserver(function () {
      scheduleApply();
    });
    obs.observe(modelSelect, { childList: true, subtree: true });

    // Initial apply
    scheduleApply();
  }

  // ── Init ───────────────────────────────────────────────────

  loadConfig().then(function () {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", watch);
    } else {
      watch();
    }
  });
})();
