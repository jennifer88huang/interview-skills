const state = {
  round: "一面",
  questions: [],
  currentIndex: 0,
  turns: [],
  engine: "local",
};

const companyInput = document.querySelector("#companyInput");
const roleInput = document.querySelector("#roleInput");
const jdLink = document.querySelector("#jdLink");
const jdText = document.querySelector("#jdText");
const resumeText = document.querySelector("#resumeText");
const apiKeyInput = document.querySelector("#apiKeyInput");
const modelInput = document.querySelector("#modelInput");
const outputState = document.querySelector("#outputState");
const matchScore = document.querySelector("#matchScore");
const questionCount = document.querySelector("#questionCount");
const duration = document.querySelector("#duration");
const analysisList = document.querySelector("#analysisList");
const interviewStage = document.querySelector("#interviewStage");
const followupBox = document.querySelector("#followupBox");
const generateButton = document.querySelector("#generateButton");

function bindTabs() {
  document.querySelectorAll(".tabs").forEach((tabs) => {
    tabs.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-tab-target]");
      if (!button) return;

      tabs.querySelectorAll("button").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");

      const column = tabs.closest(".input-column");
      column.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
      column.querySelector(`#${button.dataset.tabTarget}`).classList.add("active");
    });
  });
}

function bindSegmented() {
  document.querySelector(".segmented").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-round]");
    if (!button) return;

    document.querySelectorAll(".segmented button").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    state.round = button.dataset.round;
  });
}

function bindFiles() {
  [
    ["#jdFile", "#jdFileMeta"],
    ["#resumeFile", "#resumeFileMeta"],
  ].forEach(([inputSelector, metaSelector]) => {
    const input = document.querySelector(inputSelector);
    const meta = document.querySelector(metaSelector);

    input.addEventListener("change", () => {
      const file = input.files[0];
      if (!file) {
        meta.textContent = "尚未选择文件";
        return;
      }

      const size = file.size < 1024 * 1024
        ? `${Math.max(1, Math.round(file.size / 1024))} KB`
        : `${(file.size / 1024 / 1024).toFixed(1)} MB`;
      meta.textContent = `${file.name} · ${size}`;
    });
  });
}

function setBusy(isBusy, label = "处理中...") {
  generateButton.disabled = isBusy;
  generateButton.textContent = isBusy ? label : "开始模拟面试";
}

function getMaterials() {
  return {
    company: companyInput.value.trim() || "目标公司",
    role: roleInput.value.trim() || "目标岗位",
    round: state.round,
    jd: jdText.value.trim() || jdLink.value.trim() || "未提供完整 JD",
    resume: resumeText.value.trim() || "未提供完整简历",
  };
}

function getMaterialLevel() {
  const jdHasContent = jdLink.value.trim() || jdText.value.trim() || document.querySelector("#jdFile").files.length;
  const resumeHasContent = resumeText.value.trim() || document.querySelector("#resumeFile").files.length;

  if (jdHasContent && resumeHasContent) return "complete";
  if (jdHasContent || resumeHasContent) return "partial";
  return "empty";
}

function buildLocalQuestions(company, role) {
  if (state.round === "HR 面") {
    return [
      "你为什么考虑这个机会？真实动机是什么？",
      "离开上一家公司或当前岗位的核心原因是什么？",
      "你如何看待职业稳定性和成长速度之间的取舍？",
      "如果薪资没有达到预期，你会基于哪些因素做决定？",
      "你过往最难合作的一类人是什么？你如何处理？",
      "你期待的管理风格是什么？哪些团队环境会影响你的发挥？",
      "请讲一次你没有拿到理想结果的经历，你复盘出了什么？",
      "如果同时拿到多个 offer，你会如何比较？",
      "你的 3 年职业规划是什么？",
      "你还有哪些风险点希望提前和公司沟通？",
    ];
  }

  return [
    `请结合最近一个项目做 2 分钟自我介绍，并说明为什么匹配 ${company} ${role}。`,
    "JD 中最核心的硬技能要求是什么？请选一个你最熟的点讲到底层原理。",
    "你简历里最有代表性的项目，最大技术或业务挑战是什么？你具体负责哪一部分？",
    "如果面试官质疑你的项目数据或影响力，你会如何证明结果真实可靠？",
    `请设计一个和 ${role} 相关的典型系统或业务方案，并说明关键权衡。`,
    "如果入职后发现 JD 里有一项能力你并不熟，你会如何在 30 天内补齐？",
    "讲一次跨团队协作中的冲突，你如何推动对方达成一致？",
    `${company} 这类公司通常重视结果和 owner 意识，请讲一个你主动补位的案例。`,
    "如果本轮面试只让你强调一个优势，你会选择哪一个？为什么？",
    "你有什么想反问面试官的问题？请围绕团队目标、岗位挑战和成长空间组织。",
  ];
}

function getQuestionCategory(index) {
  if (index < 4) return "专业/基础";
  if (index < 7) return "项目深挖";
  return "行为/收尾";
}

function buildLocalFollowup(question, answer, index) {
  const { company, role } = getMaterials();
  const cleanAnswer = answer.trim();
  const category = getQuestionCategory(index);

  if (!cleanAnswer) {
    return "请先输入你的回答，再继续追问。我会重点看你的职责边界、关键动作、结果证据和复盘深度。";
  }

  if (cleanAnswer.length < 40) {
    return `你的回答还比较短。请继续补充：你具体负责什么、为什么这么做、结果如何量化，以及它和 ${company} ${role} 的要求有什么对应关系？`;
  }

  if (/我们|团队|大家/.test(cleanAnswer) && !/我/.test(cleanAnswer)) {
    return "你用了较多团队视角。请切到个人贡献：哪一部分是你独立负责的？关键决策是谁做的？如果没有你，结果会有什么差异？";
  }

  if (!/[0-9一二三四五六七八九十百千万%]/.test(cleanAnswer)) {
    return "你的回答缺少结果证据。请补充 1-2 个可验证指标，例如规模、周期、转化率、成本、效率、错误率或业务影响。";
  }

  if (category === "项目深挖") {
    return `继续深挖这个项目：当时最大的约束是什么？你放弃过哪些方案？如果在 ${company} ${role} 的场景重做一次，你会改哪一个关键决策？`;
  }

  if (category === "行为/收尾") {
    return "我追问一个行为细节：这个选择背后的真实动机是什么？当时有没有利益冲突或压力？你现在复盘，最想修正的一个动作是什么？";
  }

  return "请进一步讲清楚底层逻辑：这个结论依赖哪些前提？如果面试官挑战其中一个前提，你会用什么事实或案例支撑？";
}

function extractResponseText(data) {
  if (typeof data.output_text === "string") return data.output_text;

  const chunks = [];
  (data.output || []).forEach((item) => {
    (item.content || []).forEach((content) => {
      if (content.text) chunks.push(content.text);
    });
  });
  return chunks.join("\n").trim();
}

function parseJsonText(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("模型返回内容不是有效 JSON。");
    return JSON.parse(match[0]);
  }
}

async function callOpenAI(prompt) {
  const apiKey = apiKeyInput.value.trim();
  const model = modelInput.value.trim() || "gpt-4.1-mini";
  if (!apiKey) throw new Error("请先填写 OpenAI API Key。");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: prompt,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI 请求失败：${response.status} ${message}`);
  }

  return extractResponseText(await response.json());
}

function buildInterviewPrompt(materials) {
  return `
你是一位严格但有建设性的中文模拟面试官。请基于 JD 和简历生成一轮可直接开始的模拟面试。

目标公司：${materials.company}
目标岗位：${materials.role}
面试轮次：${materials.round}
JD：${materials.jd}
简历：${materials.resume}

只返回 JSON，不要 Markdown。格式：
{
  "matchScore": "78%",
  "duration": "45 min",
  "analysis": ["强匹配点...", "风险点...", "建议补强..."],
  "questions": ["问题1", "问题2", "...共10个问题"]
}
要求：
- questions 必须是 10 个中文问题。
- 问题要结合 JD 和简历，不要泛泛而谈。
- 至少 4 个项目深挖问题，至少 2 个行为问题，最后 1 个反问准备问题。
`.trim();
}

function buildFollowupPrompt(turn) {
  const materials = getMaterials();
  const transcript = state.turns.map((item, index) => (
    `Q${index + 1}: ${item.question}\n回答: ${item.answer || "未回答"}\n追问: ${item.followup || "无"}`
  )).join("\n\n");

  return `
你是一位中文模拟面试官。请基于候选人的回答继续追问，并给出简短反馈。

目标公司：${materials.company}
目标岗位：${materials.role}
面试轮次：${materials.round}
JD：${materials.jd}
简历：${materials.resume}

当前问题：${turn.question}
候选人回答：${turn.answer}

历史记录：
${transcript || "暂无"}

只返回 JSON，不要 Markdown。格式：
{
  "followup": "下一句追问，必须尖锐具体，围绕回答中的漏洞或可深挖点",
  "feedback": "不超过80字的反馈，指出一个优点和一个需要补强点"
}
`.trim();
}

function setAnalysis(items) {
  analysisList.replaceChildren();
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    analysisList.append(li);
  });
}

function renderInterviewStage() {
  interviewStage.replaceChildren();

  if (!state.questions.length) {
    interviewStage.innerHTML = '<p class="empty-state">点击「开始模拟面试」后，这里会展示按公司风格生成的问题。</p>';
    return;
  }

  const index = state.currentIndex;
  const question = state.questions[index];
  const existingTurn = state.turns[index] || {};
  const card = document.createElement("article");
  const meta = document.createElement("div");
  const title = document.createElement("strong");
  const body = document.createElement("p");
  const answer = document.createElement("textarea");
  const actions = document.createElement("div");
  const followupButton = document.createElement("button");
  const nextButton = document.createElement("button");

  card.className = "interview-card";
  meta.className = "interview-meta";
  title.textContent = `Q${index + 1} / ${state.questions.length} · ${getQuestionCategory(index)}`;
  meta.textContent = state.engine === "openai" ? "OpenAI 实时生成" : "本地模拟";
  body.textContent = question;
  answer.id = "currentAnswer";
  answer.className = "answer-input";
  answer.placeholder = "像真实面试一样输入你的回答，然后点击生成追问";
  answer.value = existingTurn.answer || "";
  actions.className = "question-actions";
  followupButton.type = "button";
  followupButton.textContent = "生成追问";
  followupButton.addEventListener("click", () => handleFollowup());
  nextButton.type = "button";
  nextButton.textContent = index === state.questions.length - 1 ? "完成本轮" : "下一题";
  nextButton.addEventListener("click", nextQuestion);

  actions.append(followupButton, nextButton);
  card.append(meta, title, body, answer, actions);

  if (existingTurn.followup) {
    const followup = document.createElement("div");
    followup.className = "inline-followup";
    followup.textContent = existingTurn.feedback
      ? `${existingTurn.followup} 反馈：${existingTurn.feedback}`
      : existingTurn.followup;
    card.append(followup);
  }

  interviewStage.append(card);
}

function renderHistory() {
  if (!state.turns.length) {
    followupBox.textContent = "回答当前问题后，面试官会基于你的回答继续追问。";
    return;
  }

  followupBox.replaceChildren();
  state.turns.forEach((item, index) => {
    const entry = document.createElement("article");
    const title = document.createElement("strong");
    const question = document.createElement("p");
    const answer = document.createElement("p");
    const followup = document.createElement("p");

    entry.className = "followup-entry";
    title.textContent = `Q${index + 1}`;
    question.textContent = item.question;
    answer.textContent = item.answer ? `回答：${item.answer}` : "回答：未填写";
    followup.textContent = item.followup ? `追问：${item.followup}` : "追问：待生成";

    entry.append(title, question, answer, followup);
    if (item.feedback) {
      const feedback = document.createElement("p");
      feedback.textContent = `反馈：${item.feedback}`;
      entry.append(feedback);
    }
    followupBox.append(entry);
  });
}

function saveCurrentTurn(patch = {}) {
  const question = state.questions[state.currentIndex];
  const answerNode = document.querySelector("#currentAnswer");
  const existing = state.turns[state.currentIndex] || {};
  state.turns[state.currentIndex] = {
    question,
    answer: answerNode ? answerNode.value.trim() : existing.answer || "",
    followup: existing.followup || "",
    feedback: existing.feedback || "",
    ...patch,
  };
}

async function handleFollowup() {
  if (!state.questions.length) return;

  saveCurrentTurn();
  const turn = state.turns[state.currentIndex];
  outputState.textContent = "生成追问中";

  try {
    if (apiKeyInput.value.trim()) {
      const text = await callOpenAI(buildFollowupPrompt(turn));
      const result = parseJsonText(text);
      saveCurrentTurn({
        followup: result.followup || "请继续补充关键细节。",
        feedback: result.feedback || "",
      });
      state.engine = "openai";
    } else {
      saveCurrentTurn({
        followup: buildLocalFollowup(turn.question, turn.answer, state.currentIndex),
        feedback: "本地模拟反馈：建议补充量化结果、个人贡献和复盘。",
      });
      state.engine = "local";
    }
    outputState.textContent = "已生成追问";
  } catch (error) {
    saveCurrentTurn({
      followup: buildLocalFollowup(turn.question, turn.answer, state.currentIndex),
      feedback: `API 调用失败，已使用本地模拟。${error.message}`,
    });
    outputState.textContent = "API 失败，已兜底";
  }

  renderInterviewStage();
  renderHistory();
}

function nextQuestion() {
  if (!state.questions.length) return;
  saveCurrentTurn();
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex += 1;
    outputState.textContent = `第 ${state.currentIndex + 1} 题`;
  } else {
    outputState.textContent = "本轮完成";
  }
  renderInterviewStage();
  renderHistory();
}

async function renderResult() {
  const materialLevel = getMaterialLevel();
  const materials = getMaterials();
  state.currentIndex = 0;
  state.turns = [];
  setBusy(true, "生成中...");
  outputState.textContent = apiKeyInput.value.trim() ? "调用 OpenAI 中" : "生成本地模拟";

  try {
    if (apiKeyInput.value.trim()) {
      const text = await callOpenAI(buildInterviewPrompt(materials));
      const result = parseJsonText(text);
      state.questions = Array.isArray(result.questions) && result.questions.length
        ? result.questions.slice(0, 10)
        : buildLocalQuestions(materials.company, materials.role);
      state.engine = "openai";
      matchScore.textContent = result.matchScore || "已分析";
      duration.textContent = result.duration || (state.round === "HR 面" ? "25 min" : "45 min");
      setAnalysis(Array.isArray(result.analysis) ? result.analysis : ["已基于 JD 和简历生成定制面试问题。"]);
    } else {
      state.questions = buildLocalQuestions(materials.company, materials.role);
      state.engine = "local";
      matchScore.textContent = materialLevel === "complete" ? "86%" : materialLevel === "partial" ? "62%" : "待补充";
      duration.textContent = state.round === "HR 面" ? "25 min" : "45 min";
      setAnalysis([
        "未填写 API Key，当前使用本地模拟问题。",
        "填写 OpenAI API Key 后，会基于 JD、简历和回答实时生成问题与追问。",
        "建议提供完整 JD 和简历文本，以获得更贴近目标岗位的模拟面试。",
      ]);
    }
    outputState.textContent = state.engine === "openai" ? "OpenAI 已生成" : "本地模拟已生成";
  } catch (error) {
    state.questions = buildLocalQuestions(materials.company, materials.role);
    state.engine = "local";
    outputState.textContent = "API 失败，已兜底";
    matchScore.textContent = "待补充";
    duration.textContent = state.round === "HR 面" ? "25 min" : "45 min";
    setAnalysis([
      "OpenAI API 调用失败，已切换到本地模拟。",
      error.message,
      "请检查 API Key、模型名称、账户额度和浏览器网络限制。",
    ]);
  } finally {
    questionCount.textContent = String(state.questions.length || 0);
    renderInterviewStage();
    renderHistory();
    setBusy(false);
  }
}

function resetAll() {
  companyInput.value = "";
  roleInput.value = "";
  jdLink.value = "";
  jdText.value = "";
  resumeText.value = "";
  document.querySelector("#jdFile").value = "";
  document.querySelector("#resumeFile").value = "";
  document.querySelector("#jdFileMeta").textContent = "尚未选择文件";
  document.querySelector("#resumeFileMeta").textContent = "尚未选择文件";
  outputState.textContent = "等待输入";
  matchScore.textContent = "--";
  questionCount.textContent = "--";
  duration.textContent = "--";
  analysisList.innerHTML = "<li>输入 JD 和简历后生成强匹配、需补强和简历弱点。</li>";
  state.questions = [];
  state.currentIndex = 0;
  state.turns = [];
  state.engine = "local";
  renderInterviewStage();
  renderHistory();
}

bindTabs();
bindSegmented();
bindFiles();
generateButton.addEventListener("click", renderResult);
document.querySelector("#resetButton").addEventListener("click", resetAll);
