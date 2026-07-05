/**
 * Storage Sync — IndexedDB first (fast), server sync (cross-client sharing)
 */
(function () {
  "use strict";

  var API = "http://localhost:3000";

  function apiGET(path) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 2000);
    return fetch(API + path, { signal: ctrl.signal })
      .then(function (r) { clearTimeout(timer); return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }
  function apiPOST(path, body) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 2000);
    return fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctrl.signal })
      .catch(function () { return null; })
      .finally(function () { clearTimeout(timer); });
  }
  function apiDELETE(path) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 2000);
    return fetch(API + path, { method: "DELETE", signal: ctrl.signal })
      .catch(function () { return null; })
      .finally(function () { clearTimeout(timer); });
  }

  // ── Patch (fast path: IndexedDB first) ─────────────────────

  function patch() {
    if (!window.InterviewStorage || window.InterviewStorage.__patched) return;
    window.InterviewStorage.__patched = true;

    var _save   = InterviewStorage.saveSessionToDB;
    var _load   = InterviewStorage.loadSessionFromDB;
    var _delete = InterviewStorage.deleteSessionFromDB;
    var _rIdx   = InterviewStorage.readSessionIndex;
    var _wIdx   = InterviewStorage.writeSessionIndex;

    // Save: IndexedDB first, server fire-and-forget
    InterviewStorage.saveSessionToDB = async function (p) {
      await _save(p);
      apiPOST("/api/sessions", p);           // no await
      apiPOST("/api/session-index", _rIdx()); // no await
    };

    // Load: IndexedDB first (instant), server fallback only if missing locally
    InterviewStorage.loadSessionFromDB = async function (id) {
      var local = await _load(id);
      if (local && local.id) return local;
      // Not in IndexedDB — maybe from another client
      var remote = await apiGET("/api/sessions/" + id);
      if (remote && remote.id) return remote;
      return null;
    };

    // Delete: IndexedDB first, server fire-and-forget
    InterviewStorage.deleteSessionFromDB = async function (id) {
      await _delete(id);
      apiDELETE("/api/sessions/" + id);       // no await
      apiPOST("/api/session-index", _rIdx()); // no await
    };

    // Index: localStorage (instant), server merged in background
    InterviewStorage.readSessionIndex = _rIdx;
    InterviewStorage.writeSessionIndex = function (s) {
      _wIdx(s);
      apiPOST("/api/session-index", s); // no await
    };
  }

  // ── Background: pull server data (non-blocking) ─────────────

  async function backgroundSync() {
    // Merge server session index into localStorage
    var serverIndex = await apiGET("/api/session-index");
    if (serverIndex && serverIndex.length) {
      try {
        var localIndex = JSON.parse(localStorage.getItem("interviewSkills:sessions") || "[]");
        var seen = {};
        localIndex.forEach(function (e) { seen[e.id] = e; });
        var changed = false;
        serverIndex.forEach(function (e) {
          if (!seen[e.id]) { seen[e.id] = e; localIndex.push(e); changed = true; }
        });
        if (changed) localStorage.setItem("interviewSkills:sessions", JSON.stringify(localIndex));
      } catch (e) { /* ignore */ }
    }

    // Merge server prefs
    var serverPrefs = await apiGET("/api/preferences");
    if (serverPrefs && serverPrefs.id) {
      try {
        var localPrefs = await InterviewStorage.loadEnginePreferences();
        if (!localPrefs || !localPrefs.id || new Date(serverPrefs.updatedAt) > new Date(localPrefs.updatedAt)) {
          await InterviewStorage.saveEnginePreferences(serverPrefs);
        }
      } catch (e) { /* ignore */ }
    }

    // Merge server credentials
    var serverCreds = await apiGET("/api/credentials");
    if (serverCreds && serverCreds.ciphertext) {
      try {
        var db = await new Promise(function (resolve, reject) {
          var req = indexedDB.open("interview-skills", 2);
          req.onsuccess = function () { resolve(req.result); };
          req.onerror = function () { reject(req.error); };
        });
        var tx = db.transaction("credentials", "readwrite");
        tx.objectStore("credentials").put(serverCreds);
      } catch (e) { /* ignore */ }
    }
  }

  // ── Save prefs/creds to server (fire-and-forget) ───────────

  function patchPrefs() {
    if (!window.InterviewStorage || window.InterviewStorage.__prefsPatched) return;
    window.InterviewStorage.__prefsPatched = true;

    var _savePrefs = InterviewStorage.saveEnginePreferences;
    var _saveKey   = InterviewStorage.saveEncryptedApiKey;
    var _clearKey  = InterviewStorage.clearEncryptedApiKey;

    InterviewStorage.saveEnginePreferences = async function (prefs) {
      await _savePrefs(prefs);
      apiPOST("/api/preferences", prefs); // no await
    };

    InterviewStorage.saveEncryptedApiKey = async function (key) {
      await _saveKey(key);
      setTimeout(async function () {
        var rec = await new Promise(function (resolve) {
          var req = indexedDB.open("interview-skills", 2);
          req.onsuccess = function () {
            var tx = req.result.transaction("credentials", "readonly");
            var r = tx.objectStore("credentials").get("apiKey");
            r.onsuccess = function () { resolve(r.result); };
          };
        });
        if (rec && rec.ciphertext) apiPOST("/api/credentials", rec);
      }, 200);
    };

    InterviewStorage.clearEncryptedApiKey = async function () {
      await _clearKey();
      apiDELETE("/api/credentials"); // no await
    };
  }

  // ── Init ───────────────────────────────────────────────────

  function init() {
    if (window.InterviewStorage) {
      patch();
      patchPrefs();
      setTimeout(backgroundSync, 500); // delayed, non-blocking
    } else {
      var check = setInterval(function () {
        if (window.InterviewStorage) {
          clearInterval(check);
          patch();
          patchPrefs();
          setTimeout(backgroundSync, 500);
        }
      }, 10);
    }
  }

  init();
})();
