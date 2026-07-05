/**
 * Reference Answer — manual trigger only, one button per question
 * - Button sits inside its own .question-actions, left of 生成追问/继续追问
 * - Each button controls ONLY its own question's reference answer
 * - No auto-generation — user must click the button
 * - localStorage persistence survives re-renders & page refresh
 */
(function () {
  "use strict";

  function T(zh, en) { return (document.documentElement.lang || "").startsWith("en") ? en : zh; }

  var LS_KEY = "inj-ref-answers";
  var pending = {};
  var scanTimer = 0;

  // ── localStorage ──────────────────────────────────────

  function loadCache() { try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch (e) { return {}; } }
  function saveCache(c) { try { localStorage.setItem(LS_KEY, JSON.stringify(c)); } catch (e) {} }
  function getCached(key) { return loadCache()[key] || ""; }
  function setCached(key, text) { var c = loadCache(); c[key] = text; saveCache(c); }
  function delCached(key) { var c = loadCache(); delete c[key]; saveCache(c); }
  function questionKey(q) { return (q || "").replace(/\s+/g, " ").trim().slice(0, 120); }

  // ── Scan — process each question independently ────────

  function scan() {
    // Main card
    document.querySelectorAll(".interview-card").forEach(function (card) {
      var q = getMainQuestion(card);
      if (!q) return;
      var actions = card.querySelector(":scope > .question-actions");
      if (!actions) return;

      injectButton(card, q, actions);
      restoreOwnRefBlock(card, q);
    });

    // Follow-up items
    document.querySelectorAll(".followup-item").forEach(function (item) {
      var q = getFollowupQuestion(item);
      if (!q) return;
      var actions = item.querySelector(".question-actions");
      var fb = item.querySelector(".followup-feedback");

      if (actions) {
        injectButton(item, q, actions);
      } else if (fb) {
        // Completed: button at top of feedback block, ref after feedback
        injectButtonInFeedback(fb, item, q);
      }
      restoreOwnRefBlock(item, q);
    });
  }

  function getMainQuestion(card) {
    var p = card.querySelector(":scope > p");
    return p ? p.textContent.trim() : "";
  }

  function getFollowupQuestion(item) {
    // Note: follow-up items are leaf nodes — safe to use unscoped querySelector
    var p = item.querySelector(".followup-question p");
    return p ? p.textContent.trim() : "";
  }

  // ── Button factory ────────────────────────────────────

  function makeButton(container, question) {
    var key = questionKey(question);
    var hasAnswer = !!getCached(key);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "inj-ref-btn";
    btn.textContent = hasAnswer ? T("更新参考", "Refresh Ref") : T("💡 参考回答", "💡 Reference");
    btn.title = hasAnswer ? T("重新生成参考答案", "Regenerate") : T("生成参考答案", "Generate");

    btn.addEventListener("click", function () {
      // Re-read question from DOM (container may have been rebuilt)
      var currentQ = readOwnQuestion(container);
      if (!currentQ) return;

      btn.textContent = T("⏳ …", "⏳ …");
      btn.disabled = true;

      // Force regenerate
      delCached(questionKey(currentQ));
      generateAndShow(container, currentQ, function () {
        btn.textContent = T("更新参考", "Refresh Ref");
        btn.disabled = false;
      });
    });

    return btn;
  }

  function injectButton(container, question, actionsEl) {
    if (actionsEl.querySelector(".inj-ref-btn")) return;
    var btn = makeButton(container, question);
    actionsEl.insertBefore(btn, actionsEl.firstChild);
  }

  function injectButtonInFeedback(fb, container, question) {
    if (fb.querySelector(".inj-ref-btn")) return;
    var btn = makeButton(container, question);
    // Wrap in a right-aligned container at the bottom of the feedback block
    var wrap = document.createElement("div");
    wrap.className = "inj-ref-btn-wrap";
    wrap.appendChild(btn);
    fb.appendChild(wrap);
  }

  function readOwnQuestion(container) {
    if (container.classList.contains("interview-card")) return getMainQuestion(container);
    return getFollowupQuestion(container);
  }

  // ── Restore (scoped to this container only) ───────────

  function restoreOwnRefBlock(container, question) {
    var anchor = getAnchor(container);
    if (!anchor) return;
    var key = questionKey(question);
    var cached = getCached(key);
    if (!cached) return;

    if (hasOwnRefBlock(container)) return;
    if (anchor.nextElementSibling && anchor.nextElementSibling.classList.contains("inj-ref-block")) return;

    var block = buildRefBlock(cached, key);
    anchor.insertAdjacentElement("afterend", block);
  }

  function hasOwnRefBlock(container) {
    // Check only direct children — avoids confusing nested follow-up ref blocks
    var children = container.children;
    for (var i = 0; i < children.length; i++) {
      if (children[i].classList.contains("inj-ref-block")) return true;
    }
    return false;
  }

  // ── Get the right anchor for placing ref block ──────────
  // Ref block must be a direct child of container — never nested inside .question-actions

  function getAnchor(container) {
    var isCard = container.classList.contains("interview-card");
    var actions = isCard ? container.querySelector(":scope > .question-actions") : container.querySelector(".question-actions");
    var fb      = isCard ? container.querySelector(":scope > .followup-feedback") : container.querySelector(".followup-feedback");

    if (actions) {
      if (isCard) return actions;
      // Follow-up: .question-actions is inside .followup-answer-editor
      // Climb to the editor so ref block is a direct child of .followup-item
      var editor = actions.closest(".followup-answer-editor");
      return editor || actions;
    }

    // No actions: ref after feedback (direct child of item)
    return fb || null;
  }

  // ── Generate & show (scoped) ──────────────────────────

  function generateAndShow(container, question, onDone) {
    var key = questionKey(question);

    // Remove only this container's own ref block
    removeOwnRefBlock(container);

    var anchor = getAnchor(container);
    if (!anchor) { if (onDone) onDone(); return; }

    // Placeholder
    var block = buildRefBlock(T("生成中…", "Generating…"), key);
    anchor.insertAdjacentElement("afterend", block);
    var quote = block.querySelector("blockquote");

    // Cached?
    var cached = getCached(key);
    if (cached) {
      quote.textContent = cached;
      quote.classList.add("inj-ref-loaded");
      if (onDone) onDone();
      return;
    }

    // Dedup
    if (pending[key]) {
      pending[key].then(function (t) { finish(quote, t); if (onDone) onDone(); })
        .catch(function () { if (onDone) onDone(); });
      return;
    }

    var userAnswer = readUserAnswer(container);
    var promise;
    try { promise = callAIForRef(question, userAnswer); } catch (e) {
      quote.textContent = T("生成失败，请重试", "Failed. Retry.");
      if (onDone) onDone(); return;
    }

    pending[key] = promise;
    promise.then(function (text) {
      if (text) { setCached(key, text); finish(quote, text); }
      else { quote.textContent = T("生成失败，请重试", "Generation failed. Retry."); }
    }).catch(function (e) {
      console.warn("Ref answer failed:", e);
      if (e && e.message === "NO_API_KEY") {
        quote.textContent = T("未配置 API Key", "API Key not configured.");
      } else {
        quote.textContent = T("API 调用失败: " + (e && e.message || ""), "API error: " + (e && e.message || ""));
      }
    }).finally(function () {
      delete pending[key];
      if (onDone) onDone();
    });
  }

  function removeOwnRefBlock(container) {
    var children = container.children;
    for (var i = children.length - 1; i >= 0; i--) {
      if (children[i].classList.contains("inj-ref-block")) {
        children[i].remove();
        return; // only one ref block per container
      }
    }
  }

  function finish(quote, text) { quote.textContent = text; quote.classList.add("inj-ref-loaded"); }

  function readUserAnswer(container) {
    var ta = container.querySelector("textarea");
    if (ta && ta.value.trim()) return ta.value.trim();
    var p = container.querySelector(".followup-answer p, .followup-answer-editor .answer-input");
    if (p && (p.value || p.textContent || "").trim()) return (p.value || p.textContent).trim();
    return "";
  }

  function buildRefBlock(text, key) {
    var b = document.createElement("div");
    b.className = "followup-block inj-ref-block";
    var l = document.createElement("span");
    l.className = "followup-block-label";
    l.textContent = T("参考回答", "Reference Answer");
    b.append(l);
    var q = document.createElement("blockquote");
    q.className = "inj-ref-blockquote";
    q.textContent = text;
    q.contentEditable = "true";
    if (text !== T("生成中…", "Generating…")) q.classList.add("inj-ref-loaded");
    if (key) {
      q.addEventListener("blur", function () {
        var newText = q.textContent.trim();
        if (newText && newText !== getCached(key)) {
          setCached(key, newText);
        }
      });
    }
    b.append(q);
    return b;
  }

  // ── Prompt ────────────────────────────────────────────

  function buildRefPrompt(question, userAnswer) {
    var isEn = T("", "en") === "en";
    if (isEn) {
      var p = "You are an expert interview coach. Write ONLY the model answer in the candidate's voice — as if they are speaking it in the interview right now. Natural tone, 60-120 words. Do NOT include any preamble, introduction, or meta-commentary (no \"Here is a better answer:\", no \"As a coach, I would say:\"). Output the answer directly, starting from the first word of the answer itself.";
      if (userAnswer) p += "\n\nCandidate's answer: " + userAnswer + "\n\nProvide a stronger answer addressing gaps.";
      return p + "\n\nQuestion: " + question;
    }
    var p = "你是一位资深面试教练。请直接以求职者的口吻写出参考答案（80-150字），就像求职者在面试现场做出的真实回答。\n\n⚠️ 严格禁止：不要在答案前添加任何引导语、前缀或自我介绍（如\"好的\"、\"作为面试教练\"、\"以下是参考答案\"、\"我会这样回答\"、\"这是严格禁止的\"等），直接输出答案正文的第一个字。";
    if (userAnswer) p += "\n\n候选人的回答：" + userAnswer + "\n\n请给出更完善的参考答案，弥补其不足。";
    return p + "\n\n面试题：" + question;
  }

  // ── API ───────────────────────────────────────────────

  async function callAIForRef(question, userAnswer) {
    var apiKey = getEl("#apiKeyInput");
    if (!apiKey) throw new Error("NO_API_KEY");
    var provider = getEl("#providerSelect") || "openai";
    var model = getEl("#modelInput") || getEl("#customModelInput") || "gpt-4.1";
    var prompt = buildRefPrompt(question, userAnswer);
    if (provider === "anthropic") return callAnthropic(prompt, apiKey, model);
    if (provider === "gemini") return callGemini(prompt, apiKey, model);
    return callOpenAICompat(prompt, apiKey, model, provider);
  }

  function getEl(sel) { var e = document.querySelector(sel); return e ? e.value.trim() : ""; }

  async function callOpenAICompat(prompt, apiKey, model, provider) {
    var ep = getEndpoint(provider);
    var r = await fetch(ep, { method: "POST", headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ model: model, messages: [{ role: "user", content: prompt }], temperature: 0.4, max_tokens: 600 }) });
    if (!r.ok) {
      var errText = "";
      try { errText = await r.text(); } catch (e) {}
      throw new Error("API " + r.status + (errText ? ": " + errText.slice(0, 200) : ""));
    }
    var d = await r.json();
    return (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content || "").trim() || null;
  }

  function getEndpoint(provider) {
    var c = getEl("#customEndpointInput"); if (c) return c;
    var m = { openai: "https://api.openai.com/v1/chat/completions", deepseek: "https://api.deepseek.com/chat/completions", qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", kimi: "https://api.moonshot.cn/v1/chat/completions", glm: "https://open.bigmodel.cn/api/paas/v4/chat/completions", minimax: "https://api.minimax.chat/v1/text/chatcompletion_v2", xai: "https://api.x.ai/v1/chat/completions", mistral: "https://api.mistral.ai/v1/chat/completions", perplexity: "https://api.perplexity.ai/chat/completions", openrouter: "https://openrouter.ai/api/v1/chat/completions" };
    return m[provider] || "https://api.openai.com/v1/chat/completions";
  }

  async function callAnthropic(prompt, apiKey, model) {
    var r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true", "Content-Type": "application/json" },
      body: JSON.stringify({ model: model, max_tokens: 600, temperature: 0.4, messages: [{ role: "user", content: prompt }] }) });
    if (!r.ok) {
      var errTextA = "";
      try { errTextA = await r.text(); } catch (e) {}
      throw new Error("Anthropic API " + r.status + (errTextA ? ": " + errTextA.slice(0, 200) : ""));
    }
    var d = await r.json(); var t = "";
    (d.content || []).forEach(function (b) { if (b.type === "text") t += b.text; });
    return t.trim() || null;
  }

  async function callGemini(prompt, apiKey, model) {
    var r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + encodeURIComponent(apiKey), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, maxOutputTokens: 600 } }) });
    if (!r.ok) {
      var errTextG = "";
      try { errTextG = await r.text(); } catch (e) {}
      throw new Error("Gemini API " + r.status + (errTextG ? ": " + errTextG.slice(0, 200) : ""));
    }
    var d = await r.json(); var t = "";
    (d.candidates || []).forEach(function (c) { (c.content?.parts || []).forEach(function (p) { if (p.text) t += p.text; }); });
    return t.trim() || null;
  }

  // ── Init (no auto-generation observer) ─────────────────

  function debouncedScan() { clearTimeout(scanTimer); scanTimer = setTimeout(scan, 20); }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      var obs = new MutationObserver(function () { debouncedScan(); });
      obs.observe(document.body, { childList: true, subtree: true });
      scan();
    });
  } else {
    var obs = new MutationObserver(function () { debouncedScan(); });
    obs.observe(document.body, { childList: true, subtree: true });
    scan();
  }
})();
