/**
 * Export MD — beautiful markdown export with reference answers
 * - Follow-ups indented as sub-levels under parent Q
 * - No feedback clutter; > blockquote for reference answers
 * - Overrides window.exportSessionMarkdown so summary-page button uses this format
 * - History dialog injection unchanged
 * Non-invasive: loaded via server injection, no source modification.
 */
(function () {
  "use strict";

  function T(zh, en) { return (document.documentElement.lang || "").startsWith("en") ? en : zh; }

  // ── Shared helpers ───────────────────────────────────────

  function refKey(q) { return (q || "").replace(/\s+/g, " ").trim().slice(0, 120); }

  function getRefAnswer(question) {
    try {
      var raw = localStorage.getItem("inj-ref-answers");
      if (!raw) return "";
      return JSON.parse(raw)[refKey(question)] || "";
    } catch (e) { return ""; }
  }

  // ── Build MD from session ────────────────────────────────

  function buildMD(session) {
    var L = [];
    var isEn = T("", "en") === "en";
    var s = session.settings || {};

    // Header
    L.push(isEn ? "# Mock Interview Record" : "# 模拟面试记录", "");

    var meta = [];
    var date = (session.updatedAt || "").slice(0, 10);
    meta.push((isEn ? "**Date**：" : "**日期**：") + date);
    if (s.company) meta.push((isEn ? "**Company**：" : "**公司**：") + s.company);
    if (s.role) meta.push((isEn ? "**Role**：" : "**岗位**：") + s.role);
    meta.push((isEn ? "**Round**：" : "**轮次**：") + (session.round || "-"));
    L.push(meta.join("　"), "", "---", "");

    // Q&A
    (session.turns || []).forEach(function (turn, idx) {
      if (!turn || !turn.question) return;

      var topic = turn.question.replace(/\n/g, " ").slice(0, 50);
      if (turn.question.length > 50) topic += "…";

      L.push("### Q" + (idx + 1) + " · " + topic, "");
      L.push((isEn ? "**Q**：" : "**问**：") + turn.question, "");

      if (turn.answer) {
        L.push((isEn ? "**A**：" : "**答**：") + turn.answer, "");
      }

      // Main-question reference answer
      var mainRef = getRefAnswer(turn.question);
      if (mainRef) {
        L.push("> " + mainRef.replace(/\n/g, "\n> "), "");
      }

      // Follow-ups as indented sub-levels
      (turn.followups || []).forEach(function (fu, fi) {
        var indent = "  "; // 2-space indent for sub-level

        L.push(indent + "- **" + (isEn ? "Follow-up " : "追问 ") + (fi + 1) + "**：" + (fu.question || ""), "");

        if (fu.answer) {
          L.push(indent + "  **" + (isEn ? "A**：" : "答**：") + fu.answer, "");
        }

        // Follow-up reference answer
        var fuRef = getRefAnswer(fu.question || "");
        if (fuRef) {
          L.push(indent + "  > " + fuRef.replace(/\n/g, "\n" + indent + "  > "), "");
        }
      });

      L.push("---", "");
    });

    // Summary
    L.push(isEn ? "## Summary" : "## 总结", "");

    var rs = session.roundSummary;
    if (rs && rs.overall) {
      L.push(rs.overall, "");
    }

    if (rs && rs.strengths && rs.strengths.length) {
      L.push(isEn ? "**Strengths**" : "**优势**");
      rs.strengths.forEach(function (x) { L.push("- " + x); });
      L.push("");
    }

    if (rs && rs.improvements && rs.improvements.length) {
      L.push(isEn ? "**Improvements**" : "**待改进**");
      rs.improvements.forEach(function (x) { L.push("- " + x); });
      L.push("");
    }

    if (session.resultMeta && session.resultMeta.matchScore) {
      L.push((isEn ? "**Match**：" : "**匹配度**：") + session.resultMeta.matchScore, "");
    }

    return L.join("\n");
  }

  // ── Build MD from in-memory state (for summary page) ─────

  function buildMDFromState(state, materials) {
    var L = [];
    var isEn = T("", "en") === "en";

    // Header
    L.push(isEn ? "# Mock Interview Record" : "# 模拟面试记录", "");

    var meta = [];
    meta.push((isEn ? "**Date**：" : "**日期**：") + new Date().toISOString().slice(0, 10));
    if (materials.company) meta.push((isEn ? "**Company**：" : "**公司**：") + materials.company);
    if (materials.role) meta.push((isEn ? "**Role**：" : "**岗位**：") + materials.role);
    meta.push((isEn ? "**Round**：" : "**轮次**：") + (materials.round || "-"));
    L.push(meta.join("　"), "", "---", "");

    // Q&A
    (state.turns || []).forEach(function (turn, idx) {
      if (!turn || !turn.question) return;

      var topic = turn.question.replace(/\n/g, " ").slice(0, 50);
      if (turn.question.length > 50) topic += "…";

      L.push("### Q" + (idx + 1) + " · " + topic, "");
      L.push((isEn ? "**Q**：" : "**问**：") + turn.question, "");

      if (turn.answer) {
        L.push((isEn ? "**A**：" : "**答**：") + turn.answer, "");
      }

      var mainRef = getRefAnswer(turn.question);
      if (mainRef) {
        L.push("> " + mainRef.replace(/\n/g, "\n> "), "");
      }

      (turn.followups || []).forEach(function (fu, fi) {
        var indent = "  ";
        L.push(indent + "- **" + (isEn ? "Follow-up " : "追问 ") + (fi + 1) + "**：" + (fu.question || ""), "");
        if (fu.answer) {
          L.push(indent + "  **" + (isEn ? "A**：" : "答**：") + fu.answer, "");
        }
        var fuRef = getRefAnswer(fu.question || "");
        if (fuRef) {
          L.push(indent + "  > " + fuRef.replace(/\n/g, "\n" + indent + "  > "), "");
        }
      });

      L.push("---", "");
    });

    // Summary
    L.push(isEn ? "## Summary" : "## 总结", "");

    if (state.roundSummary && state.roundSummary.overall) {
      L.push(state.roundSummary.overall, "");
    }
    if (state.roundSummary && state.roundSummary.strengths && state.roundSummary.strengths.length) {
      L.push(isEn ? "**Strengths**" : "**优势**");
      state.roundSummary.strengths.forEach(function (x) { L.push("- " + x); });
      L.push("");
    }
    if (state.roundSummary && state.roundSummary.improvements && state.roundSummary.improvements.length) {
      L.push(isEn ? "**Improvements**" : "**待改进**");
      state.roundSummary.improvements.forEach(function (x) { L.push("- " + x); });
      L.push("");
    }

    if (state.resultMeta && state.resultMeta.matchScore) {
      L.push((isEn ? "**Match**：" : "**匹配度**：") + state.resultMeta.matchScore, "");
    }

    return L.join("\n");
  }

  // ── Download ─────────────────────────────────────────────

  function downloadMD(md, session) {
    var blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    var settings = session && session.settings ? session.settings : {};
    var iso = (session && session.updatedAt) || new Date().toISOString();
    var date = iso.slice(0, 10);
    var time = iso.slice(11, 16).replace(/:/g, "");
    var company = settings.company || T("未知公司", "unknown");
    var role = settings.role || "interview";
    var round = (session && session.round) || "session";
    a.download = company + "-" + role + "-" + round + "-" + date + "-" + time + ".md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Override summary-page export button ──────────────────

  function patchSummaryExport() {
    // Already patched successfully
    if (window.__injExportPatched) return;

    // Wait for app.js to define exportSessionMarkdown
    if (typeof window.exportSessionMarkdown !== "function") {
      if (!window.__injPatchAttempts) window.__injPatchAttempts = 0;
      if (window.__injPatchAttempts < 20) {
        window.__injPatchAttempts++;
        setTimeout(patchSummaryExport, 300);
      }
      return;
    }

    window.__injExportPatched = true;
    var originalExport = window.exportSessionMarkdown;
    window.exportSessionMarkdown = async function () {
      try {
        var activeId = localStorage.getItem("interviewSkills:activeSessionId");
        if (activeId) {
          var session = await loadSession(activeId);
          if (session && session.id && session.turns && session.turns.length) {
            downloadMD(buildMD(session), session);
            return;
          }
        }
      } catch (e) { /* fallback */ }

      if (originalExport && originalExport !== window.exportSessionMarkdown) {
        originalExport();
      }
    };
  }

  // Expose buildMD for in-memory use
  window.__injBuildMD = buildMD;

  // ── Load session ─────────────────────────────────────────

  async function loadSession(id) {
    if (window.InterviewStorage && window.InterviewStorage.loadSessionFromDB) {
      try {
        var session = await window.InterviewStorage.loadSessionFromDB(id);
        if (session && session.id) return session;
      } catch (e) { /* fall through */ }
    }
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

  // ── Export action ────────────────────────────────────────

  async function doExport(sessionMeta) {
    var session = await loadSession(sessionMeta.id);
    if (session && session.id) {
      downloadMD(buildMD(session), session);
      return;
    }
    var activeId = localStorage.getItem("interviewSkills:activeSessionId");
    if (activeId === sessionMeta.id && typeof window.exportSessionMarkdown === "function") {
      try {
        window.exportSessionMarkdown();
        return;
      } catch (e) { /* fall through */ }
    }
    alert(T(
      "会话数据未找到。该会话可能来自其他浏览器或部署环境，请打开该会话后再导出。",
      "Session data not found. It may be from another browser or deployment. Open the session first, then export."
    ));
  }

  // ── Inject buttons into history dialog ───────────────────

  function injectExportButtons() {
    var dialog = document.querySelector("#historyDialog");
    if (!dialog || !dialog.open) return;
    var list = document.querySelector("#historySessionList");
    if (!list) return;
    var items = list.querySelectorAll(".history-session-item");
    if (!items.length) return;
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

  // ── Watch for history dialog ─────────────────────────────

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

  // ── Init ─────────────────────────────────────────────────

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      watch();
      // Delay patch to ensure app.js has defined exportSessionMarkdown
      setTimeout(patchSummaryExport, 500);
    });
  } else {
    watch();
    setTimeout(patchSummaryExport, 500);
  }
})();
