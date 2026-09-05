/* Lessonsmith standalone learner runtime — embedded in exported packages.
   Renders course.json and reports tracking through SCORM 1.2, SCORM 2004, xAPI or cmi5. */
(function () {
  "use strict";
  var D = window.__LS_DATA__ || {};
  var course = D.course;
  var track = D.tracking || {};
  var CH = D.chrome || {};
  if (!course) { document.body.textContent = "Course data missing."; return; }

  /* ---------- state ---------- */
  var lessons = [];
  course.modules.forEach(function (m) { m.lessons.forEach(function (l) { lessons.push({ m: m, l: l }); }); });
  var state = { done: {}, answers: {}, scores: {}, idx: 0, started: Date.now() };

  /* ---------- tracking adapters ---------- */
  function findObj(win, name, depth) {
    depth = depth || 0;
    if (depth > 8 || !win) return null;
    try { if (win[name]) return win[name]; } catch (e) { return null; }
    try { if (win.opener && win.opener[name]) return win.opener[name]; } catch (e) {}
    try { if (win.parent && win.parent !== win) return findObj(win.parent, name, depth + 1); } catch (e) {}
    return null;
  }
  var log = [];
  function dbg(label, key, val) { log.push({ t: new Date().toISOString(), label: label, key: key || "", val: val == null ? "" : String(val).slice(0, 300) }); if (window.parent && window.parent.__lsDebug) { try { window.parent.__lsDebug({ label: label, key: key, val: val }); } catch (e) {} } }

  var api12 = track.mode === "scorm12" ? findObj(window, "API") : null;
  var api2004 = track.mode === "scorm2004" ? findObj(window, "API_1484_11") : null;
  var interactions = 0;

  function xapiSend(stmt) {
    window.__xapiStatements = window.__xapiStatements || [];
    window.__xapiStatements.push(stmt);
    dbg("xapi", stmt.verb, stmt.object && stmt.object.id);
    if (track.xapiEndpoint) {
      try {
        var x = new XMLHttpRequest();
        x.open("POST", track.xapiEndpoint, true);
        x.setRequestHeader("Content-Type", "application/json");
        if (track.xapiAuth) x.setRequestHeader("Authorization", track.xapiAuth);
        x.send(JSON.stringify(stmt));
      } catch (e) {}
    }
  }
  function xapi(verb, objId, extra) {
    xapiSend(Object.assign({
      actor: D.actor || { name: "Learner", account: { homePage: window.location.origin || "https://lessonsmit h.local", name: "learner" } },
      verb: { id: "http://adlnet.gov/expapi/verbs/" + verb, display: { en: verb } },
      object: { id: objId, definition: { name: { en: (course && course.title) || "Course" } } },
      timestamp: new Date().toISOString()
    }, extra || {}));
  }

  var T = {
    init: function () {
      dbg("init", "mode", track.mode);
      if (api12) { api12.LMSInitialize(""); dbg("scorm12", "LMSInitialize", ""); }
      if (api2004) { api2004.Initialize(""); dbg("scorm2004", "Initialize", ""); }
      if (track.mode === "xapi" || track.mode === "cmi5") xapi("initialized", "urn:lessonsmith:course:" + course.id);
      if (track.mode === "cmi5") T.cmi5init();
      var s = T.loadSuspend();
      if (s) { state.done = s.done || {}; state.answers = s.answers || {}; state.scores = s.scores || {}; }
    },
    cmi5init: function () {
      try {
        var q = {};
        window.location.search.slice(1).split("&").forEach(function (p) { var kv = p.split("="); if (kv[0]) q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ""); });
        if (!q.endpoint || !q.fetch) { dbg("cmi5", "standalone", "no launch parameters"); return; }
        var parts = q.fetch.split("|");
        var x = new XMLHttpRequest();
        x.open("GET", parts[0], true);
        if (parts[1]) x.setRequestHeader("Authorization", parts[1]);
        x.onload = function () {
          try {
            var tok = JSON.parse(x.responseText)["access-token"];
            track.xapiEndpoint = q.endpoint;
            track.xapiAuth = "Bearer " + tok;
            track.cmi5Context = { contextTemplate: { contextActivities: { grouping: [{ id: q.activityId || "urn:lessonsmith:course:" + course.id }] }, registration: q.registration } };
            dbg("cmi5", "token", "ok");
            xapi("initialized", q.activityId || "urn:lessonsmith:course:" + course.id, track.cmi5Context.contextTemplate);
          } catch (e) { dbg("cmi5", "token", "failed"); }
        };
        x.send();
      } catch (e) { dbg("cmi5", "init", "error"); }
    },
    set12: function (k, v) { if (api12) { api12.LMSSetValue(k, v); dbg("scorm12", k, v); } },
    set04: function (k, v) { if (api2004) { api2004.SetValue(k, v); dbg("scorm2004", k, v); } },
    status: function (completed, success, score) {
      var pct = Math.round((completedCount() / lessons.length) * 100) / 100;
      if (api12) {
        var st = success === true ? "passed" : success === false ? "failed" : completed ? "completed" : "incomplete";
        T.set12("cmi.core.lesson_status", st);
        if (score != null) { T.set12("cmi.core.score.raw", String(score)); T.set12("cmi.core.score.min", "0"); T.set12("cmi.core.score.max", "100"); }
      }
      if (api2004) {
        T.set04("cmi.completion_status", completed ? "completed" : "incomplete");
        if (success != null) T.set04("cmi.success_status", success ? "passed" : "failed");
        if (score != null) { T.set04("cmi.score.raw", String(score)); T.set04("cmi.score.min", "0"); T.set04("cmi.score.max", "100"); T.set04("cmi.score.scaled", String(Math.round(score) / 100)); }
        T.set04("cmi.progress_measure", String(pct));
      }
      if (track.mode === "xapi" || track.mode === "cmi5") {
        if (completed) xapi("completed", "urn:lessonsmith:course:" + course.id, { result: { completion: true, score: score != null ? { scaled: score / 100, raw: score, min: 0, max: 100 } : undefined, success: success == null ? undefined : success } });
        if (success === true) xapi("passed", "urn:lessonsmith:course:" + course.id, { result: { score: { scaled: (score || 0) / 100, raw: score || 0, min: 0, max: 100 }, success: true } });
        if (success === false) xapi("failed", "urn:lessonsmith:course:" + course.id, { result: { score: { scaled: (score || 0) / 100, raw: score || 0, min: 0, max: 100 }, success: false } });
      }
      dbg("status", "completed=" + completed, "success=" + success + " score=" + score);
    },
    interaction: function (qid, type, response, correct, answerText) {
      var n = interactions++;
      var res = correct ? "correct" : "incorrect";
      if (api12) {
        T.set12("cmi.interactions." + n + ".id", qid);
        T.set12("cmi.interactions." + n + ".type", type);
        T.set12("cmi.interactions." + n + ".result", res);
        T.set12("cmi.interactions." + n + ".student_response", response);
        T.set12("cmi.interactions." + n + ".correct_responses.0.pattern", answerText || "");
        T.set12("cmi.interactions." + n + ".time", new Date().toISOString());
      }
      if (api2004) {
        T.set04("cmi.interactions." + n + ".id", qid);
        T.set04("cmi.interactions." + n + ".type", type);
        T.set04("cmi.interactions." + n + ".result", res);
        T.set04("cmi.interactions." + n + ".student_response", response);
        T.set04("cmi.interactions." + n + ".correct_responses.0.pattern", answerText || "");
      }
      if (track.mode === "xapi" || track.mode === "cmi5") xapi("answered", "urn:lessonsmith:question:" + qid, { result: { response: response, success: correct, completion: true } });
    },
    saveSuspend: function () {
      var s = JSON.stringify({ done: state.done, answers: state.answers, scores: state.scores });
      if (api12) { T.set12("cmi.suspend_data", s); api12.LMSCommit(""); dbg("scorm12", "LMSCommit", ""); }
      if (api2004) { T.set04("cmi.suspend_data", s); api2004.Commit(""); dbg("scorm2004", "Commit", ""); }
    },
    loadSuspend: function () {
      var raw = "";
      if (api12) { api12.LMSInitialize(""); raw = api12.LMSGetValue("cmi.suspend_data"); dbg("scorm12", "LMSGetValue suspend_data", raw); }
      if (api2004) raw = api2004.GetValue("cmi.suspend_data");
      try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
    },
    finish: function () {
      if (api12) { api12.LMSCommit(""); api12.LMSFinish(""); dbg("scorm12", "LMSFinish", ""); }
      if (api2004) { api2004.Commit(""); api2004.Terminate(""); dbg("scorm2004", "Terminate", ""); }
    }
  };

  /* ---------- dom helpers ---------- */
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  /* ---------- grading ---------- */
  function grade(q, ans) {
    if (q.type === "fill") return String(ans || "").trim().toLowerCase() === String(q.answer || "").trim().toLowerCase();
    if (q.type === "order") return JSON.stringify(ans) === JSON.stringify(q.correct);
    var corr = (q.correct || []).slice().sort();
    var got = (ans || []).slice().sort();
    return JSON.stringify(corr) === JSON.stringify(got);
  }

  /* ---------- block renderers ---------- */
  function rHeading(b) { var h = el(b.level === 3 ? "h3" : "h2", "ls-h", b.text); return h; }
  function rText(b) { var d = el("div", "ls-text"); b.paragraphs.forEach(function (p) { d.appendChild(el("p", null, p)); }); return d; }
  function rQuote(b) { var d = el("blockquote", "ls-quote"); d.appendChild(el("p", null, b.text)); if (b.attribution) d.appendChild(el("footer", null, "— " + b.attribution)); return d; }
  function rCallout(b) {
    var d = el("aside", "ls-callout ls-" + b.tone);
    d.appendChild(el("strong", null, b.title)); d.appendChild(el("p", null, b.body));
    return d;
  }
  function rDivider() { return el("hr", "ls-divider"); }
  function rImage(b) {
    var f = el("figure", "ls-figure");
    var img = new Image(); img.src = b.src; img.alt = b.alt || ""; img.style.width = "100%"; img.style.borderRadius = "10px"; img.style.display = "block";
    f.appendChild(img);
    if (b.caption) f.appendChild(el("figcaption", null, b.caption));
    return f;
  }
  function rKeyPoints(b) {
    var d = el("div", "ls-cards");
    if (b.title) d.appendChild(el("h3", "ls-h3", b.title));
    var grid = el("div", "ls-grid");
    b.points.forEach(function (p) { var c = el("div", "ls-card"); c.appendChild(el("h4", null, p.title)); c.appendChild(el("p", null, p.body)); grid.appendChild(c); });
    d.appendChild(grid);
    return d;
  }
  function rAccordion(b) {
    var d = el("div", "ls-acc");
    b.items.forEach(function (it) {
      var det = el("details", "ls-det");
      var sum = el("summary", null, it.title);
      det.appendChild(sum); det.appendChild(el("p", null, it.body));
      d.appendChild(det);
    });
    return d;
  }
  function rTabs(b) {
    var d = el("div", "ls-tabs");
    var bar = el("div", "ls-tabbar");
    var body = el("div", "ls-tabbody");
    var btns = [];
    function show(i) {
      btns.forEach(function (x, j) { x.classList.toggle("on", i === j); x.setAttribute("aria-selected", i === j ? "true" : "false"); });
      body.textContent = b.tabs[i].body;
    }
    b.tabs.forEach(function (t, i) {
      var bt = el("button", "ls-tab", t.label);
      bt.setAttribute("role", "tab"); bt.type = "button";
      bt.onclick = function () { show(i); };
      btns.push(bt); bar.appendChild(bt);
    });
    d.appendChild(bar); d.appendChild(body); show(0);
    return d;
  }
  function rFlip(b) {
    var d = el("div", "ls-flips");
    if (b.prompt) d.appendChild(el("p", "ls-muted", b.prompt));
    var grid = el("div", "ls-grid");
    b.cards.forEach(function (c) {
      var card = el("button", "ls-flipcard"); card.type = "button";
      card.setAttribute("aria-pressed", "false");
      var inner = el("div", "ls-flip-inner");
      var f = el("div", "ls-flip-face ls-flip-front"); f.appendChild(el("span", null, c.front));
      var k = el("div", "ls-flip-face ls-flip-back"); k.appendChild(el("span", null, c.back));
      inner.appendChild(f); inner.appendChild(k); card.appendChild(inner);
      card.onclick = function () { card.classList.toggle("flipped"); card.setAttribute("aria-pressed", card.classList.contains("flipped") ? "true" : "false"); };
      grid.appendChild(card);
    });
    d.appendChild(grid);
    return d;
  }
  function rTimeline(b) {
    var d = el("div", "ls-timeline");
    if (b.title) d.appendChild(el("h3", "ls-h3", b.title));
    b.items.forEach(function (it) {
      var row = el("div", "ls-tl-item");
      row.appendChild(el("div", "ls-tl-dot"));
      var c = el("div", null); c.appendChild(el("strong", null, it.title)); c.appendChild(el("p", null, it.body));
      row.appendChild(c);
      d.appendChild(row);
    });
    return d;
  }
  function rReveal(b) {
    var d = el("div", "ls-reveal");
    var btn = el("button", "ls-btn ls-btn-ghost", b.prompt); btn.type = "button";
    var box = el("div", "ls-reveal-body"); box.style.display = "none"; box.appendChild(el("p", null, b.body));
    btn.onclick = function () { var open = box.style.display !== "none"; box.style.display = open ? "none" : "block"; btn.textContent = open ? b.prompt : "Hide"; btn.setAttribute("aria-expanded", String(!open)); };
    btn.setAttribute("aria-expanded", "false");
    d.appendChild(btn); d.appendChild(box);
    return d;
  }
  function rChecklist(b) {
    var d = el("div", "ls-check");
    if (b.title) d.appendChild(el("h3", "ls-h3", b.title));
    b.items.forEach(function (it, i) {
      var lab = el("label", "ls-check-item");
      var cb = el("input"); cb.type = "checkbox"; cb.checked = !!state.answers["chk:" + b.id + ":" + i];
      cb.onchange = function () { state.answers["chk:" + b.id + ":" + i] = cb.checked; T.saveSuspend(); };
      lab.appendChild(cb); lab.appendChild(el("span", null, it));
      d.appendChild(lab);
    });
    return d;
  }
  function rScenario(b) {
    var d = el("div", "ls-scenario");
    d.appendChild(el("h3", "ls-h3", b.title));
    if (b.intro) d.appendChild(el("p", "ls-muted", b.intro));
    var stage = el("div", null);
    d.appendChild(stage);
    var si = 0, goodCount = 0;
    function step() {
      stage.textContent = "";
      if (si >= b.steps.length) {
        stage.appendChild(el("p", "ls-scenario-end", b.summary));
        stage.appendChild(el("p", "ls-muted", "Good choices: " + goodCount + " / " + b.steps.length));
        return;
      }
      var s = b.steps[si];
      stage.appendChild(el("p", "ls-scenario-char", s.character));
      stage.appendChild(el("p", null, s.situation));
      s.choices.forEach(function (ch) {
        var btn = el("button", "ls-btn ls-btn-ghost ls-choice", ch.text); btn.type = "button";
        btn.onclick = function () {
          if (ch.good) goodCount++;
          stage.textContent = "";
          stage.appendChild(el("div", ch.good ? "ls-fb-good" : "ls-fb-bad", ch.feedback));
          var nx = el("button", "ls-btn", si + 1 >= b.steps.length ? "Finish scenario" : "Continue"); nx.type = "button";
          nx.onclick = function () { si++; step(); };
          stage.appendChild(nx);
        };
        stage.appendChild(btn);
      });
    }
    step();
    return d;
  }

  function rQuestion(b, ctx) { return rQ(b.q, ctx, b.id); }

  function rQ(q, ctx, hostId) {
    var d = el("div", "ls-question");
    d.appendChild(el("p", "ls-q-prompt", q.prompt));
    var key = hostId + ":" + q.id;
    var saved = state.answers[ctx + ":" + key];
    var wrap = el("div", null);
    d.appendChild(wrap);
    var inputEl = null;
    if (q.type === "fill") {
      inputEl = el("input", "ls-input"); inputEl.type = "text"; inputEl.placeholder = "Type your answer…";
      if (saved != null) inputEl.value = saved;
      wrap.appendChild(inputEl);
    } else if (q.type === "order") {
      var order = saved && saved.length === q.options.length ? saved.slice() : q.options.map(function (_, i) { return i; });
      inputEl = { order: order };
      var list = el("div", null);
      function paint() {
        list.textContent = "";
        order.forEach(function (oi, pos) {
          var row = el("div", "ls-order-row");
          row.appendChild(el("span", null, (pos + 1) + ". " + q.options[oi]));
          var up = el("button", "ls-mini", "↑"); up.type = "button"; up.disabled = pos === 0;
          up.onclick = function () { var t = order[pos - 1]; order[pos - 1] = order[pos]; order[pos] = t; paint(); };
          var dn = el("button", "ls-mini", "↓"); dn.type = "button"; dn.disabled = pos === order.length - 1;
          dn.onclick = function () { var t = order[pos + 1]; order[pos + 1] = order[pos]; order[pos] = t; paint(); };
          row.appendChild(up); row.appendChild(dn);
          list.appendChild(row);
        });
      }
      paint();
      wrap.appendChild(list);
    } else {
      var multi = q.type === "multi";
      inputEl = { picked: [] };
      q.options.forEach(function (opt, i) {
        var lab = el("label", "ls-opt");
        var inp = el("input"); inp.type = multi ? "checkbox" : "radio"; inp.name = key;
        if (saved && saved.indexOf(i) >= 0) { inp.checked = true; inputEl.picked.push(i); }
        inp.onchange = function () {
          if (multi) {
            inputEl.picked = [];
            wrap.querySelectorAll("input").forEach(function (x, j) { if (x.checked) inputEl.picked.push(j); });
          } else inputEl.picked = [i];
        };
        lab.appendChild(inp); lab.appendChild(el("span", null, opt));
        wrap.appendChild(lab);
      });
    }
    var fb = el("div", "ls-fb"); fb.style.display = "none";
    d.appendChild(fb);
    return { el: d, evaluate: function () {
      var ans = q.type === "fill" ? inputEl.value : q.type === "order" ? inputEl.order : inputEl.picked;
      state.answers[ctx + ":" + key] = ans;
      var ok = grade(q, ans);
      var response = q.type === "fill" ? String(ans) : q.type === "order" ? (ans || []).map(function (i) { return q.options[i]; }).join("[,]") : (ans || []).join("[,]");
      var correctTxt = q.type === "fill" ? (q.answer || "") : q.type === "order" ? (q.correct || []).map(function (i) { return q.options[i]; }).join("[,]") : (q.correct || []).join("[,]");
      var xtype = q.type === "fill" ? "fill-in" : q.type === "tf" ? "true-false" : q.type === "order" ? "sequencing" : "choice";
      T.interaction(q.id, xtype, response, ok, correctTxt);
      fb.style.display = "block";
      fb.textContent = "";
      fb.className = "ls-fb " + (ok ? "ls-fb-good" : "ls-fb-bad");
      fb.appendChild(el("strong", null, ok ? (CH.correct || "Correct") : (CH.incorrect || "Not quite")));
      if (q.explanation) fb.appendChild(el("p", null, q.explanation));
      return ok;
    }, answered: function () {
      var a = state.answers[ctx + ":" + key];
      return a != null && (q.type !== "fill" || String(a).trim() !== "");
    } };
  }

  function rQuiz(b, ctx) {
    var d = el("div", "ls-quiz");
    var graded = b.mode === "graded";
    var head = el("div", "ls-quiz-head");
    head.appendChild(el("h3", "ls-h3", b.title));
    if (graded) head.appendChild(el("span", "ls-chip", (CH.pass || "Pass mark") + ": " + b.passMark + "%"));
    d.appendChild(head);
    var runners = [];
    var list = b.questions.slice();
    if (b.shuffle) list = list.map(function (q) { return [Math.random(), q]; }).sort(function (a, c) { return a[0] - c[0]; }).map(function (x) { return x[1]; });
    list.forEach(function (q, i) {
      d.appendChild(el("p", "ls-q-num", (CH.questions || "Question") + " " + (i + 1) + " / " + list.length));
      var r = rQ(q, ctx, b.id);
      runners.push(r);
      d.appendChild(r.el);
    });
    var res = el("div", "ls-quiz-result"); res.style.display = "none";
    var submit = el("button", "ls-btn ls-btn-primary", CH.submit || "Check answers"); submit.type = "button";
    submit.onclick = function () {
      var correct = 0;
      runners.forEach(function (r) { if (r.evaluate()) correct++; });
      var pct = Math.round((correct / runners.length) * 100);
      state.scores[b.id] = pct;
      res.style.display = "block";
      res.textContent = "";
      if (graded) {
        var passed = pct >= b.passMark;
        res.appendChild(el("strong", null, (CH.score || "Score") + ": " + pct + "% — " + (passed ? (CH.pass || "Passed") : (CH.fail || "Not passed yet"))));
        T.status(isCourseComplete(pct, passed), passed, pct);
      } else {
        res.appendChild(el("strong", null, correct + " / " + runners.length + " correct"));
      }
      T.saveSuspend();
      res.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };
    d.appendChild(submit);
    d.appendChild(res);
    if (state.scores[b.id] != null && graded) {
      res.style.display = "block";
      var p = state.scores[b.id];
      res.appendChild(el("strong", null, (CH.score || "Score") + ": " + p + "% — " + (p >= b.passMark ? (CH.pass || "Passed") : (CH.fail || "Not passed yet")) + " (previous attempt)"));
    }
    return d;
  }

  function renderBlock(b, ctx) {
    switch (b.kind) {
      case "heading": return rHeading(b);
      case "text": return rText(b);
      case "quote": return rQuote(b);
      case "callout": return rCallout(b);
      case "divider": return rDivider();
      case "image": return rImage(b);
      case "keyPoints": return rKeyPoints(b);
      case "accordion": return rAccordion(b);
      case "tabs": return rTabs(b);
      case "flipcards": return rFlip(b);
      case "timeline": return rTimeline(b);
      case "reveal": return rReveal(b);
      case "checklist": return rChecklist(b);
      case "scenario": return rScenario(b);
      case "question": return rQuestion(b, ctx).el;
      case "quiz": return rQuiz(b, ctx);
      default: return el("p", "ls-muted", "[" + b.kind + "]");
    }
  }

  /* ---------- completion rules ---------- */
  function completedCount() { return Object.keys(state.done).length; }
  function isCourseComplete(quizPct, quizPassed) {
    var rule = track.completionRule || "assessment";
    if (rule === "all-lessons") return completedCount() >= lessons.length;
    if (rule === "percent") return completedCount() / lessons.length * 100 >= (track.percentRequired || 90);
    return quizPassed === true || Object.keys(state.scores).some(function (k) { return state.scores[k] >= (track.passMark || 80); });
  }

  /* ---------- layout ---------- */
  var root = el("div", "ls-shell");
  var side = el("nav", "ls-side");
  side.setAttribute("aria-label", CH.contents || "Course contents");
  var main = el("main", "ls-main");
  root.appendChild(side); root.appendChild(main);
  document.body.appendChild(root);
  document.title = course.title;
  document.documentElement.style.setProperty("--ls-primary", course.theme && course.theme.primary || "#175943");
  document.documentElement.style.setProperty("--ls-radius", (course.theme && course.theme.radius || 10) + "px");

  var sideHead = el("div", "ls-side-head");
  sideHead.appendChild(el("div", "ls-logo", (course.title || "Course").split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join("").toUpperCase()));
  sideHead.appendChild(el("div", "ls-side-title", course.title));
  side.appendChild(sideHead);
  var progWrap = el("div", "ls-prog-wrap");
  progWrap.appendChild(el("div", "ls-prog-label", (CH.progress || "Progress") + " · " + completedCount() + "/" + lessons.length));
  var prog = el("div", "ls-prog"); var progBar = el("div", "ls-prog-bar");
  prog.appendChild(progBar); progWrap.appendChild(prog);
  side.appendChild(progWrap);
  var tree = el("div", "ls-tree");
  side.appendChild(tree);

  function paintTree() {
    tree.textContent = "";
    var flat = 0;
    course.modules.forEach(function (m) {
      tree.appendChild(el("div", "ls-mod", m.title));
      m.lessons.forEach(function (l) {
        var idx = flat++;
        var locked = track.navigation === "sequential" && idx > 0 && !state.done[lessons[idx - 1].l.id] && state.idx !== idx;
        var b = el("button", "ls-lesson" + (idx === state.idx ? " on" : "") + (state.done[l.id] ? " done" : "") + (locked ? " locked" : ""));
        b.type = "button";
        b.disabled = locked;
        b.appendChild(el("span", "ls-lesson-dot", state.done[l.id] ? "✓" : String(idx + 1)));
        b.appendChild(el("span", null, l.title));
        b.onclick = function () { state.idx = idx; paint(); };
        tree.appendChild(b);
      });
    });
    var pct = lessons.length ? Math.round(completedCount() / lessons.length * 100) : 0;
    progBar.style.width = pct + "%";
    progWrap.querySelector(".ls-prog-label").textContent = (CH.progress || "Progress") + " · " + completedCount() + "/" + lessons.length;
  }

  var doneOnce = {};
  function paint() {
    paintTree();
    main.textContent = "";
    main.scrollTop = 0;
    var entry = lessons[state.idx];
    var l = entry.l;
    main.appendChild(el("p", "ls-crumb", entry.m.title));
    main.appendChild(el("h1", "ls-lesson-title", l.title));
    var ctx = l.id;
    var quizRunnerDone = [];
    l.blocks.forEach(function (b) {
      if (b.kind === "quiz" && b.mode === "graded") {
        main.appendChild(rQuiz(b, ctx));
      } else {
        main.appendChild(renderBlock(b, ctx));
      }
    });
    if (!doneOnce[l.id]) {
      if (track.mode === "xapi" || track.mode === "cmi5") xapi("experienced", "urn:lessonsmith:lesson:" + l.id);
      doneOnce[l.id] = 1;
    }
    var footer = el("div", "ls-lesson-footer");
    var completeBtn = el("button", "ls-btn" + (state.done[l.id] ? " ls-btn-done" : " ls-btn-primary"), state.done[l.id] ? "✓ " + (CH.complete || "Completed") : (CH.complete || "Mark lesson complete"));
    completeBtn.type = "button";
    completeBtn.onclick = function () {
      state.done[l.id] = true;
      T.status(isCourseComplete(), null, lastScore());
      T.saveSuspend();
      maybeFinishScreen();
      paint();
    };
    footer.appendChild(completeBtn);
    var nav = el("div", "ls-nav");
    if (state.idx > 0) { var pv = el("button", "ls-btn ls-btn-ghost", "← " + (CH.prev || "Back")); pv.type = "button"; pv.onclick = function () { state.idx--; paint(); }; nav.appendChild(pv); }
    if (state.idx < lessons.length - 1) { var nx = el("button", "ls-btn", (CH.next || "Next") + " →"); nx.type = "button"; nx.onclick = function () { state.idx++; paint(); }; nav.appendChild(nx); }
    footer.appendChild(nav);
    main.appendChild(footer);
  }

  function lastScore() {
    var best = null;
    Object.keys(state.scores).forEach(function (k) { var s = state.scores[k]; if (best == null || s > best) best = s; });
    return best;
  }

  function maybeFinishScreen() {
    if (!isCourseComplete()) return;
    if (document.querySelector(".ls-done-screen")) return;
    var sc = lastScore();
    var wrap = el("div", "ls-done-screen");
    var card = el("div", "ls-done-card");
    card.appendChild(el("div", "ls-done-check", "✓"));
    card.appendChild(el("h2", null, CH.courseComplete || "Course complete"));
    if (sc != null) card.appendChild(el("p", "ls-done-score", (CH.score || "Score") + ": " + sc + "% · " + (sc >= (track.passMark || 80) ? (CH.pass || "Passed") : (CH.fail || "Not passed yet"))));
    var cert = el("div", "ls-cert");
    cert.appendChild(el("p", "ls-cert-label", CH.certificate || "Certificate of completion"));
    cert.appendChild(el("p", "ls-cert-name", course.title));
    card.appendChild(cert);
    var restart = el("button", "ls-btn ls-btn-ghost", CH.restart || "Restart course"); restart.type = "button";
    restart.onclick = function () {
      state.done = {}; state.answers = {}; state.scores = {}; state.idx = 0;
      T.saveSuspend(); T.status(false, null, null);
      wrap.remove(); paint();
    };
    card.appendChild(restart);
    wrap.appendChild(card);
    document.body.appendChild(wrap);
    T.status(true, sc != null ? sc >= (track.passMark || 80) : null, sc);
    T.saveSuspend();
  }

  window.addEventListener("beforeunload", function () { T.saveSuspend(); T.finish(); });

  T.init();
  T.status(false, null, null);
  paint();
})();
