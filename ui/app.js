const state = {
  round: "一面",
  questions: [],
  currentIndex: 0,
  turns: [],
  engine: "local",
  parsedFiles: {
    jd: "",
    resume: "",
  },
};

const companyInput = document.querySelector("#companyInput");
const roleInput = document.querySelector("#roleInput");
const jdLink = document.querySelector("#jdLink");
const jdText = document.querySelector("#jdText");
const resumeText = document.querySelector("#resumeText");
const providerSelect = document.querySelector("#providerSelect");
const apiKeyInput = document.querySelector("#apiKeyInput");
const modelInput = document.querySelector("#modelInput");
const customModelInput = document.querySelector("#customModelInput");
const customEndpointInput = document.querySelector("#customEndpointInput");
const customModelField = document.querySelector("#customModelField");
const customEndpointField = document.querySelector("#customEndpointField");
const outputState = document.querySelector("#outputState");
const matchScore = document.querySelector("#matchScore");
const questionCount = document.querySelector("#questionCount");
const duration = document.querySelector("#duration");
const analysisList = document.querySelector("#analysisList");
const interviewStage = document.querySelector("#interviewStage");
const followupBox = document.querySelector("#followupBox");
const generateButton = document.querySelector("#generateButton");
const progressSteps = ["materials", "interview", "followup"];
const modelCatalog = {
  openai: [
    ["gpt-4.1-mini", "GPT-4.1 Mini"],
    ["gpt-4.1", "GPT-4.1"],
    ["gpt-4o-mini", "GPT-4o Mini"],
    ["gpt-4o", "GPT-4o"],
  ],
  anthropic: [
    ["claude-3-5-sonnet-latest", "Claude 3.5 Sonnet"],
    ["claude-3-5-haiku-latest", "Claude 3.5 Haiku"],
    ["claude-3-opus-latest", "Claude 3 Opus"],
  ],
  gemini: [
    ["gemini-1.5-flash", "Gemini 1.5 Flash"],
    ["gemini-1.5-pro", "Gemini 1.5 Pro"],
    ["gemini-2.0-flash", "Gemini 2.0 Flash"],
  ],
  deepseek: [
    ["deepseek-chat", "DeepSeek Chat"],
    ["deepseek-reasoner", "DeepSeek Reasoner"],
  ],
  qwen: [
    ["qwen-plus", "Qwen Plus"],
    ["qwen-max", "Qwen Max"],
    ["qwen-turbo", "Qwen Turbo"],
  ],
  kimi: [
    ["kimi-k2.6", "Kimi K2.6"],
    ["kimi-k2.5", "Kimi K2.5"],
    ["moonshot-v1-128k", "Moonshot v1 128K"],
  ],
  glm: [
    ["glm-4.5", "GLM-4.5"],
    ["glm-4.5-air", "GLM-4.5 Air"],
    ["glm-4-plus", "GLM-4 Plus"],
  ],
  minimax: [
    ["minimax-m2.7", "MiniMax M2.7"],
    ["abab6.5s-chat", "abab6.5s Chat"],
    ["abab6.5g-chat", "abab6.5g Chat"],
  ],
  mimo: [
    ["mimo-v2.5-pro", "MiMo v2.5 Pro"],
  ],
  xai: [
    ["grok-4", "Grok 4"],
    ["grok-3", "Grok 3"],
    ["grok-3-mini", "Grok 3 Mini"],
  ],
  mistral: [
    ["mistral-large-latest", "Mistral Large"],
    ["mistral-small-latest", "Mistral Small"],
    ["codestral-latest", "Codestral"],
  ],
  perplexity: [
    ["sonar-pro", "Sonar Pro"],
    ["sonar", "Sonar"],
  ],
  openrouter: [
    ["openai/gpt-4.1-mini", "OpenAI GPT-4.1 Mini"],
    ["anthropic/claude-3.5-sonnet", "Claude 3.5 Sonnet"],
    ["google/gemini-flash-1.5", "Gemini Flash 1.5"],
    ["deepseek/deepseek-chat", "DeepSeek Chat"],
  ],
  other: [
    ["custom", "自定义模型"],
  ],
};
const providerLabels = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
  deepseek: "DeepSeek",
  qwen: "Qwen",
  kimi: "Kimi",
  glm: "GLM",
  minimax: "MiniMax",
  mimo: "MiMo",
  xai: "xAI",
  mistral: "Mistral",
  perplexity: "Perplexity",
  openrouter: "OpenRouter",
  other: "自定义模型",
};
const providerConfig = {
  deepseek: { type: "openai-compatible", endpoint: "https://api.deepseek.com/chat/completions" },
  qwen: { type: "openai-compatible", endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions" },
  kimi: { type: "openai-compatible", endpoint: "https://api.moonshot.cn/v1/chat/completions" },
  glm: { type: "openai-compatible", endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions" },
  minimax: { type: "openai-compatible", endpoint: "https://api.minimax.chat/v1/chat/completions" },
  mimo: { type: "openai-compatible", needsEndpoint: true },
  xai: { type: "openai-compatible", endpoint: "https://api.x.ai/v1/chat/completions" },
  mistral: { type: "openai-compatible", endpoint: "https://api.mistral.ai/v1/chat/completions" },
  perplexity: { type: "openai-compatible", endpoint: "https://api.perplexity.ai/chat/completions" },
  openrouter: { type: "openai-compatible", endpoint: "https://openrouter.ai/api/v1/chat/completions" },
  other: { type: "openai-compatible", needsEndpoint: true, needsCustomModel: true },
};

function setProgressStep(step) {
  const activeIndex = progressSteps.indexOf(step);

  progressSteps.forEach((item, index) => {
    const dot = document.querySelector(`[data-step-dot="${item}"]`);
    const label = document.querySelector(`[data-step-label="${item}"]`);
    const line = document.querySelector(`[data-step-line="${item}"]`);
    const isActive = index === activeIndex;
    const isDone = index < activeIndex;

    [dot, label].forEach((node) => {
      if (!node) return;
      node.classList.toggle("active", isActive);
      node.classList.toggle("done", isDone);
    });

    if (line) {
      line.classList.toggle("done", index <= activeIndex);
    }
  });
}

function bindProviderModels() {
  const renderModels = () => {
    const provider = providerSelect.value;
    const config = providerConfig[provider] || {};
    modelInput.replaceChildren();
    modelCatalog[provider].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      modelInput.append(option);
    });
    customModelField.classList.toggle("hidden", !config.needsCustomModel);
    customEndpointField.classList.toggle("hidden", !config.needsEndpoint);
  };

  providerSelect.addEventListener("change", renderModels);
  renderModels();
}

function getProviderLabel() {
  return providerLabels[providerSelect.value] || "所选模型";
}

function getSelectedModel() {
  const config = providerConfig[providerSelect.value] || {};
  return config.needsCustomModel ? customModelInput.value.trim() : modelInput.value;
}

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

function formatFileSize(file) {
  return file.size < 1024 * 1024
    ? `${Math.max(1, Math.round(file.size / 1024))} KB`
    : `${(file.size / 1024 / 1024).toFixed(1)} MB`;
}

async function parseTextFile(file) {
  return file.text();
}

async function parsePdfFile(file) {
  if (!window.pdfjsLib) {
    throw new Error("PDF 解析库未加载完成，请刷新页面后重试。");
  }

  window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const buffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }

  return pages.join("\n\n");
}

async function parseDocxFile(file) {
  if (!window.mammoth) {
    throw new Error("Word 解析库未加载完成，请刷新页面后重试。");
  }

  const result = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
}

async function parseUpload(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".md")) return parseTextFile(file);
  if (name.endsWith(".pdf")) return parsePdfFile(file);
  if (name.endsWith(".docx")) return parseDocxFile(file);
  if (name.endsWith(".doc")) {
    throw new Error("暂不支持旧版 .doc，请另存为 .docx 或 PDF 后上传。");
  }
  if (file.type.startsWith("image/")) {
    throw new Error("图片 OCR 暂未接入，请先复制图片中的文字或上传 PDF/Word/TXT。");
  }
  throw new Error("暂不支持该文件类型，请上传 PDF、DOCX、TXT 或 Markdown。");
}

async function handleFileChange(input, meta, targetKey) {
  const file = input.files[0];
  if (!file) {
    state.parsedFiles[targetKey] = "";
    meta.textContent = "尚未选择文件";
    return;
  }

  meta.textContent = `${file.name} · ${formatFileSize(file)} · 解析中...`;
  try {
    const text = (await parseUpload(file)).trim();
    if (!text) throw new Error("没有解析到可用文本。");
    state.parsedFiles[targetKey] = text;
    meta.textContent = `${file.name} · ${formatFileSize(file)} · 已解析 ${text.length} 字`;
  } catch (error) {
    state.parsedFiles[targetKey] = "";
    meta.textContent = `${file.name} · ${formatFileSize(file)} · ${error.message}`;
  }
}

function bindFiles() {
  [
    ["#jdFile", "#jdFileMeta", "jd"],
    ["#resumeFile", "#resumeFileMeta", "resume"],
  ].forEach(([inputSelector, metaSelector, targetKey]) => {
    const input = document.querySelector(inputSelector);
    const meta = document.querySelector(metaSelector);

    input.addEventListener("change", () => handleFileChange(input, meta, targetKey));
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
    jd: jdText.value.trim() || state.parsedFiles.jd || jdLink.value.trim() || "未提供完整 JD",
    resume: resumeText.value.trim() || state.parsedFiles.resume || "未提供完整简历",
  };
}

function getMaterialLevel() {
  const jdHasContent = jdLink.value.trim() || jdText.value.trim() || state.parsedFiles.jd;
  const resumeHasContent = resumeText.value.trim() || state.parsedFiles.resume;

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

function buildLocalFollowup(question, answer, index, previousFollowup = "") {
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
    return previousFollowup
      ? `继续追问：你刚才补充的内容里，哪一个判断最容易被数据或事实挑战？如果面试官要求你现场证明，你会拿出什么证据？`
      : `继续深挖这个项目：当时最大的约束是什么？你放弃过哪些方案？如果在 ${company} ${role} 的场景重做一次，你会改哪一个关键决策？`;
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

function extractChatChoice(data) {
  return data.choices?.[0]?.message?.content?.trim() || "";
}

function extractAnthropicText(data) {
  return (data.content || []).map((item) => item.text || "").join("\n").trim();
}

function extractGeminiText(data) {
  return (data.candidates?.[0]?.content?.parts || []).map((part) => part.text || "").join("\n").trim();
}

async function callOpenAICompatible(prompt, endpoint, apiKey, model, extraHeaders = {}) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`模型请求失败：${response.status} ${message}`);
  }

  return extractChatChoice(await response.json());
}

async function callModel(prompt) {
  const provider = providerSelect.value;
  const config = providerConfig[provider] || {};
  const apiKey = apiKeyInput.value.trim();
  const model = getSelectedModel();
  if (!apiKey) throw new Error("请先填写所选供应商的 API Key。");
  if (!model) throw new Error("请先选择或输入模型名。");

  if (config.type === "openai-compatible") {
    const endpoint = config.needsEndpoint ? customEndpointInput.value.trim() : config.endpoint;
    if (!endpoint) throw new Error("请填写 OpenAI-compatible API 地址。");
    const headers = provider === "openrouter" ? {
      "HTTP-Referer": window.location.href,
      "X-Title": "interview-skills mock interview",
    } : {};
    return callOpenAICompatible(prompt, endpoint, apiKey, model, headers);
  }

  if (provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1800,
        temperature: 0.4,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Anthropic 请求失败：${response.status} ${message}`);
    }

    return extractAnthropicText(await response.json());
  }

  if (provider === "gemini") {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4 },
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Gemini 请求失败：${response.status} ${message}`);
    }

    return extractGeminiText(await response.json());
  }

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

function buildFollowupPrompt(turn, followupAnswer = "") {
  const materials = getMaterials();
  const transcript = state.turns.map((item, index) => (
    `Q${index + 1}: ${item.question}
主问题回答: ${item.answer || "未回答"}
追问记录:
${(item.followups || []).map((followup, followupIndex) => `- 追问${followupIndex + 1}: ${followup.question}\n  追问回答: ${followup.answer || "未回答"}\n  反馈: ${followup.feedback || "无"}`).join("\n") || "无"}`
  )).join("\n\n");
  const latestFollowup = (turn.followups || []).at(-1);

  return `
你是一位中文模拟面试官。请基于候选人的回答继续追问，并给出简短反馈。

目标公司：${materials.company}
目标岗位：${materials.role}
面试轮次：${materials.round}
JD：${materials.jd}
简历：${materials.resume}

当前问题：${turn.question}
候选人回答：${turn.answer}
上一轮追问：${latestFollowup ? latestFollowup.question : "无"}
候选人对上一轮追问的回答：${followupAnswer || "无"}

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
  const latestFollowup = (existingTurn.followups || []).at(-1);
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
  meta.textContent = state.engine === "api" ? `${getProviderLabel()} 实时生成` : "本地模拟";
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

  if (latestFollowup) {
    const followup = document.createElement("div");
    const followupTitle = document.createElement("strong");
    const followupQuestion = document.createElement("p");
    const followupAnswer = document.createElement("textarea");
    const followupActions = document.createElement("div");
    const continueButton = document.createElement("button");

    followup.className = "inline-followup";
    followupTitle.textContent = `追问 ${existingTurn.followups.length}`;
    followupQuestion.textContent = latestFollowup.question;
    followupAnswer.id = "currentFollowupAnswer";
    followupAnswer.className = "answer-input";
    followupAnswer.placeholder = "输入你对追问的回答，然后点击继续追问";
    followupAnswer.value = latestFollowup.answer || "";
    followupActions.className = "question-actions";
    continueButton.type = "button";
    continueButton.textContent = "继续追问";
    continueButton.addEventListener("click", () => handleFollowup(true));
    followupActions.append(continueButton);
    followup.append(followupTitle, followupQuestion, followupAnswer, followupActions);

    if (latestFollowup.feedback) {
      const feedback = document.createElement("p");
      feedback.textContent = `反馈：${latestFollowup.feedback}`;
      followup.append(feedback);
    }
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
    const followups = document.createElement("div");

    entry.className = "followup-entry";
    title.textContent = `Q${index + 1}`;
    question.textContent = item.question;
    answer.textContent = item.answer ? `回答：${item.answer}` : "回答：未填写";
    followups.className = "followup-stack";
    (item.followups || []).forEach((followup, followupIndex) => {
      const node = document.createElement("p");
      node.textContent = `追问${followupIndex + 1}：${followup.question}${followup.answer ? ` / 回答：${followup.answer}` : ""}${followup.feedback ? ` / 反馈：${followup.feedback}` : ""}`;
      followups.append(node);
    });
    if (!(item.followups || []).length) {
      const node = document.createElement("p");
      node.textContent = "追问：待生成";
      followups.append(node);
    }

    entry.append(title, question, answer, followups);
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
    followups: existing.followups || [],
    ...patch,
  };
}

function saveCurrentFollowupAnswer() {
  const answerNode = document.querySelector("#currentFollowupAnswer");
  if (!answerNode) return "";

  const turn = state.turns[state.currentIndex];
  const latestFollowup = (turn.followups || []).at(-1);
  if (!latestFollowup) return "";

  latestFollowup.answer = answerNode.value.trim();
  return latestFollowup.answer;
}

async function handleFollowup(fromFollowupAnswer = false) {
  if (!state.questions.length) return;

  saveCurrentTurn();
  const turn = state.turns[state.currentIndex];
  const followupAnswer = fromFollowupAnswer ? saveCurrentFollowupAnswer() : "";
  outputState.textContent = "生成追问中";
  setProgressStep("followup");

  try {
    if (apiKeyInput.value.trim()) {
      const text = await callModel(buildFollowupPrompt(turn, followupAnswer));
      const result = parseJsonText(text);
      turn.followups = turn.followups || [];
      turn.followups.push({
        question: result.followup || "请继续补充关键细节。",
        answer: "",
        feedback: result.feedback || "",
      });
      state.engine = "api";
    } else {
      turn.followups = turn.followups || [];
      turn.followups.push({
        question: buildLocalFollowup(turn.question, fromFollowupAnswer ? followupAnswer : turn.answer, state.currentIndex, fromFollowupAnswer ? turn.followups.at(-1)?.question : ""),
        answer: "",
        feedback: "本地模拟反馈：建议补充量化结果、个人贡献和复盘。",
      });
      state.engine = "local";
    }
    outputState.textContent = "已生成追问";
  } catch (error) {
    turn.followups = turn.followups || [];
    turn.followups.push({
      question: buildLocalFollowup(turn.question, fromFollowupAnswer ? followupAnswer : turn.answer, state.currentIndex, fromFollowupAnswer ? turn.followups.at(-1)?.question : ""),
      answer: "",
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
  saveCurrentFollowupAnswer();
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex += 1;
    outputState.textContent = `第 ${state.currentIndex + 1} 题`;
    setProgressStep("interview");
  } else {
    outputState.textContent = "本轮完成";
    setProgressStep("followup");
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
  outputState.textContent = apiKeyInput.value.trim() ? `调用 ${getProviderLabel()} 中` : "生成本地模拟";
  setProgressStep("interview");

  try {
    if (apiKeyInput.value.trim()) {
      const text = await callModel(buildInterviewPrompt(materials));
      const result = parseJsonText(text);
      state.questions = Array.isArray(result.questions) && result.questions.length
        ? result.questions.slice(0, 10)
        : buildLocalQuestions(materials.company, materials.role);
      state.engine = "api";
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
        "填写所选供应商 API Key 后，会基于 JD、简历和回答实时生成问题与追问。",
        "建议提供完整 JD 和简历文本，以获得更贴近目标岗位的模拟面试。",
      ]);
    }
    outputState.textContent = state.engine === "api" ? `${getProviderLabel()} 已生成` : "本地模拟已生成";
  } catch (error) {
    state.questions = buildLocalQuestions(materials.company, materials.role);
    state.engine = "local";
    outputState.textContent = "API 失败，已兜底";
    matchScore.textContent = "待补充";
    duration.textContent = state.round === "HR 面" ? "25 min" : "45 min";
    setAnalysis([
      `${getProviderLabel()} API 调用失败，已切换到本地模拟。`,
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
  state.parsedFiles.jd = "";
  state.parsedFiles.resume = "";
  outputState.textContent = "等待输入";
  setProgressStep("materials");
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
bindProviderModels();
setProgressStep("materials");
generateButton.addEventListener("click", renderResult);
document.querySelector("#resetButton").addEventListener("click", resetAll);
