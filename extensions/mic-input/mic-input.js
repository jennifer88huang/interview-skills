/**
 * Mic Input — adds 🎤 voice input button to answer textareas
 * Uses continuous recognition for low-latency real-time speech-to-text.
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
    btn.classList.add("inj-mic-recording");
    btn.title = T("录音中…点击停止", "Recording… Click to stop");
    recognition.start();
  }

  function stopMic() {
    shouldRestart = false;
    if (currentRecognition) {
      try { currentRecognition.stop(); } catch (e) { /* ignore */ }
      currentRecognition = null;
    }
    if (currentMicBtn) {
      currentMicBtn.classList.remove("inj-mic-recording");
      currentMicBtn.title = T("点击开始语音输入", "Click to start voice input");
      currentMicBtn = null;
    }
    currentTextarea = null;
    originalValue = "";
    utteranceFinal = "";
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
