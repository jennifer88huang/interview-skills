/**
 * Mic Input — adds 🎤 voice input button to answer textareas
 * Uses continuous recognition for low-latency real-time speech-to-text.
 * After mic stops, sends transcribed text to AI for error correction
 * (同音词/断句 fix only, no content addition).
 * Includes current interview question as context for better disambiguation.
 * Non-invasive: loaded via server injection, no source modification.
 */
(function () {
  "use strict";

  function T(zh, en) { return (document.documentElement.lang || "").startsWith("en") ? en : zh; }

  var currentRecognition = null;
  var currentMicBtn = null;
  var currentTextarea = null;
  var shouldRestart = false;   // auto-restart if browser stops recognition
  var originalValue = "";      // textarea value when recording first started
  var utteranceFinal = "";     // accumulated FINAL text across all utterances

  // ── AI correction: ordering guarantee ────────────────────

  var correctionSeq = 0;       // monotonic — only latest correction is applied

  function toggleMic(btn, textarea) {
    if (currentRecognition) {
      // Manual stop — don't auto-restart
      shouldRestart = false;
      stopMic();
      return;
    }
    startListening(btn, textarea);
  }

  // ── Create a fresh SpeechRecognition instance ──────────────

  function createRecognition(btn, textarea) {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(T("浏览器不支持语音输入，请使用 Chrome 或 Edge", "Voice input not supported. Use Chrome or Edge."));
      return null;
    }

    var recognition = new SpeechRecognition();
    recognition.lang = T("zh-CN", "en-US");
    recognition.interimResults = true;
    recognition.continuous = true;   // true continuous — no gap between utterances
    recognition.maxAlternatives = 1;

    recognition.onresult = function (event) {
      var interimText = "";

      // Process only new/changed results since last event
      for (var i = event.resultIndex; i < event.results.length; i++) {
        var transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          // Accumulate final text across utterances with space separator
          utteranceFinal += (utteranceFinal ? " " : "") + transcript;
        } else {
          interimText += transcript;
        }
      }

      // Real-time display: original + all final + current interim
      var parts = [];
      if (originalValue) parts.push(originalValue);
      if (utteranceFinal) parts.push(utteranceFinal);
      if (interimText) parts.push(interimText);
      textarea.value = parts.join(" ");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    };

    recognition.onerror = function (event) {
      if (event.error === "no-speech") {
        // No speech — may auto-restart on onend
        return;
      }
      if (event.error === "aborted") {
        // Aborted by our stop() — normal
        return;
      }
      // Real error (not-allowed, network, service-not-allowed, etc.)
      console.warn("Speech recognition error:", event.error);
      shouldRestart = false;
    };

    recognition.onend = function () {
      // If shouldRestart is true (not manually stopped) and textarea still in DOM,
      // create a fresh recognition to continue (browser may impose ~60s limit)
      if (shouldRestart && currentMicBtn === btn && textarea.isConnected) {
        var next = createRecognition(btn, textarea);
        if (next) {
          currentRecognition = next;
          try { next.start(); } catch (e) { stopMic(); }
        } else {
          stopMic();
        }
      } else {
        stopMic();
      }
    };

    return recognition;
  }

  // ── Start listening ────────────────────────────────────────

  function startListening(btn, textarea) {
    var recognition = createRecognition(btn, textarea);
    if (!recognition) return;

    // Snapshot textarea value at the START of the recording session
    // (not reset between utterances — continuous mode keeps accumulating)
    originalValue = textarea.value;
    utteranceFinal = "";

    currentRecognition = recognition;
    currentMicBtn = btn;
    currentTextarea = textarea;
    shouldRestart = true;
    btn.classList.remove("inj-mic-correcting");
    btn.classList.add("inj-mic-recording");
    btn.title = T("录音中…点击停止", "Recording… Click to stop");
    recognition.start();
  }

  function stopMic() {
    shouldRestart = false;

    // Capture transcribed text BEFORE clearing state
    var textToCorrect = utteranceFinal;
    var origVal = originalValue;
    var ta = currentTextarea;
    var btn = currentMicBtn;

    if (currentRecognition) {
      try { currentRecognition.stop(); } catch (e) { /* ignore */ }
      currentRecognition = null;
    }
    if (btn) {
      btn.classList.remove("inj-mic-recording");
    }
    currentMicBtn = null;
    currentTextarea = null;
    originalValue = "";
    utteranceFinal = "";

    // ── Request AI correction for the transcribed text ──────
    if (textToCorrect && ta && btn) {
      requestCorrection(textToCorrect, ta, origVal, btn);
    } else if (btn) {
      btn.title = T("点击开始语音输入", "Click to start voice input");
    }
  }

  // ── AI Correction ─────────────────────────────────────────

  function requestCorrection(text, textarea, originalVal, btn) {
    var seq = ++correctionSeq;

    // Visual feedback: correcting state
    btn.classList.add("inj-mic-correcting");
    btn.title = T("AI 修正中…", "AI correcting…");

    callAIForCorrection(text, textarea).then(function (corrected) {
      if (correctionSeq !== seq) return; // stale — a newer correction has started
      if (corrected) {
        var parts = [];
        if (originalVal) parts.push(originalVal);
        parts.push(corrected);
        textarea.value = parts.join(" ");
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }).catch(function (e) {
      if (correctionSeq !== seq) return;
      console.warn("Mic AI correction failed:", e);
      // Leave transcribed text as-is on error
    }).finally(function () {
      if (correctionSeq !== seq) return;
      if (btn) {
        btn.classList.remove("inj-mic-correcting");
        btn.title = T("点击开始语音输入", "Click to start voice input");
      }
    });
  }

  // ── Find current question from textarea's DOM context ─────

  function findCurrentQuestion(textarea) {
    // Main answer: textarea inside .interview-card, question is in :scope > p
    var card = textarea.closest(".interview-card");
    if (card) {
      var p = card.querySelector(":scope > p");
      return p ? p.textContent.trim() : "";
    }
    // Follow-up answer: textarea inside .followup-item, question in .followup-question p
    var item = textarea.closest(".followup-item");
    if (item) {
      var fp = item.querySelector(".followup-question p");
      return fp ? fp.textContent.trim() : "";
    }
    return "";
  }

  function buildCorrectionPrompt(text, question) {
    var isEn = T("", "en") === "en";
    var ctx = "";
    if (question) {
      ctx = isEn
        ? "Interview question: " + question + "\n\n"
        : "当前面试问题：" + question + "\n\n";
    }
    if (isEn) {
      return ctx + "The following text comes from speech recognition and may contain recognition errors (e.g., homophones). Use the question context above to help disambiguate. Correct ONLY obvious misrecognitions — do NOT add, remove, or rewrite any content. Return only the corrected text, no explanation.\n\nOriginal: " + text;
    }
    return ctx + "以下文字来自语音识别，可能含有识别错误（如同音词、断句错误）。请结合上述问题上下文辅助判断，修正明显的识别错误，不要添加、删减或改写任何内容。直接返回修正后的文本，不要任何解释。\n\n原文：" + text;
  }

  function getEl(sel) { var e = document.querySelector(sel); return e ? e.value.trim() : ""; }

  async function callAIForCorrection(text, textarea) {
    var apiKey = getEl("#apiKeyInput");
    if (!apiKey) throw new Error("NO_API_KEY");
    var provider = getEl("#providerSelect") || "openai";
    var model = getEl("#modelInput") || getEl("#customModelInput") || "gpt-4.1";
    var question = textarea ? findCurrentQuestion(textarea) : "";
    var prompt = buildCorrectionPrompt(text, question);

    if (provider === "anthropic") return callAnthropicCorrect(prompt, apiKey, model);
    if (provider === "gemini") return callGeminiCorrect(prompt, apiKey, model);
    return callOpenAICompatCorrect(prompt, apiKey, model, provider);
  }

  async function callOpenAICompatCorrect(prompt, apiKey, model, provider) {
    var ep = getEndpoint(provider);
    var r = await fetch(ep, { method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ model: model, messages: [{ role: "user", content: prompt }], temperature: 0, max_tokens: 600 })
    });
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

  async function callAnthropicCorrect(prompt, apiKey, model) {
    var r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true", "Content-Type": "application/json" },
      body: JSON.stringify({ model: model, max_tokens: 600, temperature: 0, messages: [{ role: "user", content: prompt }] })
    });
    if (!r.ok) {
      var errTextA = "";
      try { errTextA = await r.text(); } catch (e) {}
      throw new Error("Anthropic API " + r.status + (errTextA ? ": " + errTextA.slice(0, 200) : ""));
    }
    var d = await r.json(); var t = "";
    (d.content || []).forEach(function (b) { if (b.type === "text") t += b.text; });
    return t.trim() || null;
  }

  async function callGeminiCorrect(prompt, apiKey, model) {
    var r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + encodeURIComponent(apiKey), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0, maxOutputTokens: 600 } })
    });
    if (!r.ok) {
      var errTextG = "";
      try { errTextG = await r.text(); } catch (e) {}
      throw new Error("Gemini API " + r.status + (errTextG ? ": " + errTextG.slice(0, 200) : ""));
    }
    var d = await r.json(); var t = "";
    (d.candidates || []).forEach(function (c) { (c.content?.parts || []).forEach(function (p) { if (p.text) t += p.text; }); });
    return t.trim() || null;
  }

  function createMicButton(textarea) {
    if (textarea.dataset.injMic) return;
    textarea.dataset.injMic = "1";

    var wrapper = document.createElement("div");
    wrapper.className = "answer-input-wrapper";
    textarea.parentNode.insertBefore(wrapper, textarea);
    wrapper.appendChild(textarea);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "inj-mic-btn";
    btn.title = T("点击开始语音输入", "Click to start voice input");
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
    btn.setAttribute("aria-label", T("语音输入", "Voice input"));
    btn.addEventListener("click", function () { toggleMic(btn, textarea); });
    wrapper.appendChild(btn);
  }

  function scan() {
    // If recognition is running on a textarea no longer in DOM, clean up
    if (currentRecognition && currentTextarea && !currentTextarea.isConnected) {
      stopMic();
    }

    var main = document.querySelector("#currentAnswer");
    var followup = document.querySelector("#currentFollowupAnswer");
    if (main) createMicButton(main);
    if (followup) createMicButton(followup);
  }

  // Watch DOM for new textareas
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      var observer = new MutationObserver(scan);
      observer.observe(document.body, { childList: true, subtree: true });
      scan();
    });
  } else {
    var observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    scan();
  }
})();
