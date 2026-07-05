/**
 * Export MD — adds "导出 MD" button to history dialog
 * Format matches reference project style: date header, Q&A with 问/答, summary
 * Non-invasive: loaded via server injection, no source modification.
 */
(function () {
  "use strict";

  function T(zh, en) { return (document.documentElement.lang || "").startsWith("en") ? en : zh; }

  // ── MD generation from session object ─────────────────────

  function buildMD(session) {
    var lines = [];
    var isEn = T("", "en") === "en";
    var settings = session.settings || {};

    // Title
    lines.push(isEn ? "# Mock Interview Record" : "# 模拟面试记录");
    lines.push("");

    // Meta info in **key**：value format (matching reference style)
    var date = (session.updatedAt || session.resultMeta?.updatedAt || new Date().toISOString()).slice(0, 10);
    lines.push((isEn ? "**Date**：" : "**日期**：") + date);
    if (settings.company) {
      lines.push((isEn ? "**Company**：" : "**公司**：") + settings.company);
    }
    if (settings.role) {
      lines.push((isEn ? "**Role**：" : "**岗位**：") + settings.role);
    }
    lines.push((isEn ? "**Round**：" : "**轮次**：") + (session.round || "-"));
    lines.push("", "---", "");

    // Q&A
    var turns = session.turns || [];
    turns.forEach(function (turn, idx) {
      if (!turn || !turn.question) return;

      // Generate topic from first ~40 chars of question
      var topic = turn.question.replace(/\n/g, " ").slice(0, 40);
      if (turn.question.length > 40) topic += "…";

      lines.push((isEn ? "### Q" : "### 题") + (idx + 1) + "：" + topic);
      lines.push("");
      lines.push((isEn ? "**Q**：" : "**问**：") + turn.question);
      lines.push("");
      if (turn.answer) {
        lines.push((isEn ? "**A**：" : "**答**：") + turn.answer);
        lines.push("");
      }

      // Follow-ups
      var followups = turn.followups || [];
      followups.forEach(function (fu, fi) {
        lines.push((isEn ? "#### Follow-up " : "#### 追问 ") + (fi + 1));
        lines.push("");
        lines.push((isEn ? "**Q**：" : "**问**：") + (fu.question || ""));
        lines.push("");
        if (fu.answer) {
          lines.push((isEn ? "**A**：" : "**答**：") + fu.answer);
          lines.push("");
        }
        if (fu.feedback) {
          lines.push((isEn ? "**Feedback**：" : "**反馈**：") + fu.feedback);
          lines.push("");
        }
      });

      lines.push("---", "");
    });

    // Summary
    lines.push(isEn ? "## Summary" : "## 总结");
    lines.push("");

    var roundSummary = session.roundSummary;
    if (roundSummary?.overall) {
      lines.push(roundSummary.overall);
      lines.push("");
    }

    if (roundSummary?.strengths?.length) {
      lines.push(isEn ? "### Strengths" : "### 优势");
      roundSummary.strengths.forEach(function (s) { lines.push("- " + s); });
      lines.push("");
    }

    if (roundSummary?.improvements?.length) {
      lines.push(isEn ? "### Improvements" : "### 待改进");
      roundSummary.improvements.forEach(function (s) { lines.push("- " + s); });
      lines.push("");
    }

    // Match score in summary
    if (session.resultMeta?.matchScore) {
      lines.push((isEn ? "Match：" : "匹配度：") + session.resultMeta.matchScore);
      lines.push("");
    }

    return lines.join("\n");
  }

  function downloadMD(session) {
    var md = buildMD(session);
    var blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    var settings = session.settings || {};
    var date = (session.updatedAt || new Date().toISOString()).slice(0, 10);
    var role = settings.role || "interview";
    var round = session.round || "session";
    a.download = date + "-" + role + "-" + round + (T("", "-mock-interview") || "-模拟面试") + ".md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Load session (uses patched InterviewStorage which tries server first) ──

  async function loadSession(id) {
    // Use patched InterviewStorage — tries server API first, then IndexedDB
    if (window.InterviewStorage && window.InterviewStorage.loadSessionFromDB) {
      try {
        var session = await window.InterviewStorage.loadSessionFromDB(id);
        if (session && session.id) return session;
      } catch (e) { /* fall through */ }
    }
    // Fallback: direct IndexedDB
    try {
      var db = await new Promise(function (resolve, reject) {
        var req = indexedDB.open("interview-skills", 2);
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
      var session = await new Promise(function (resolve, reject) {
        var tx = db.transaction("sessions", "readonly");
        var req = tx.objectStore("sessions").get(id);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
      if (session && session.id) return session;
    } catch (e) { /* fall through */ }
    return null;
  }

  // ── Export action ─────────────────────────────────────────

  async function doExport(sessionMeta) {
    // 1) Try server API + IndexedDB (via patched InterviewStorage)
    var session = await loadSession(sessionMeta.id);
    if (session && session.id) {
      downloadMD(session);
      return;
    }

    // 2) If it's the current active session, try the page's in-memory export
    var activeId = localStorage.getItem("interviewSkills:activeSessionId");
    if (activeId === sessionMeta.id && typeof window.exportSessionMarkdown === "function") {
      try {
        window.exportSessionMarkdown();
        return;
      } catch (e) { /* fall through */ }
    }

    // 3) Give up
    alert(T(
      "会话数据未找到。该会话可能来自其他浏览器或部署环境，请打开该会话后再导出。",
      "Session data not found. It may be from another browser or deployment. Open the session first, then export."
    ));
  }

  // ── Inject buttons into history dialog ────────────────────

  function injectExportButtons() {
    var dialog = document.querySelector("#historyDialog");
    if (!dialog || !dialog.open) return;
    var list = document.querySelector("#historySessionList");
    if (!list) return;
    var items = list.querySelectorAll(".history-session-item");
    if (!items.length) return;

    // Already injected?
    if (items[0].querySelector(".inj-export-btn")) return;

    var sessions = [];
    try {
      sessions = JSON.parse(localStorage.getItem("interviewSkills:sessions") || "[]");
    } catch (e) { /* ignore */ }

    items.forEach(function (item, index) {
      var sessionMeta = sessions[index];
      if (!sessionMeta || !sessionMeta.id) return;

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "inj-export-btn";
      btn.textContent = T("导出 MD", "Export MD");
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        e.preventDefault();
        doExport(sessionMeta);
        return false;
      });

      var delBtn = item.querySelector(".history-session-delete");
      if (delBtn) {
        item.insertBefore(btn, delBtn);
      } else {
        item.append(btn);
      }
    });
  }

  // ── Watch for history dialog ──────────────────────────────

  function watch() {
    var dialog = document.querySelector("#historyDialog");
    if (!dialog) return;
    var observer = new MutationObserver(function () {
      if (dialog.open) {
        setTimeout(injectExportButtons, 50);
      }
    });
    observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watch);
  } else {
    watch();
  }
})();
