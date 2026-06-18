const requestedLang = new URLSearchParams(window.location.search).get("lang");
const initialLang = ["zh", "en"].includes(requestedLang)
  ? requestedLang
  : localStorage.getItem("interviewSkillsLang") || (navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en");

const state = {
  lang: initialLang,
  round: "一面",
  questions: [],
  currentIndex: 0,
  turns: [],
  engine: "local",
  parsedFiles: {
    jd: "",
    resume: "",
  },
  sessionId: null,
  phase: "materials",
  roundSummary: null,
  isLoading: false,
  resultMeta: {
    matchScore: "--",
    duration: "--",
    analysis: [],
  },
};

let persistTimer = null;
let enginePrefsTimer = null;

const companyInput = document.querySelector("#companyInput");
const roleInput = document.querySelector("#roleInput");
const jdLink = document.querySelector("#jdLink");
const jdText = document.querySelector("#jdText");
const resumeText = document.querySelector("#resumeText");
const providerSelect = document.querySelector("#providerSelect");
const apiKeyInput = document.querySelector("#apiKeyInput");
const rememberApiKeyInput = document.querySelector("#rememberApiKey");
const clearStoredCredentialsBtn = document.querySelector("#clearStoredCredentials");
const modelInput = document.querySelector("#modelInput");
const customModelInput = document.querySelector("#customModelInput");
const customEndpointInput = document.querySelector("#customEndpointInput");
const customModelField = document.querySelector("#customModelField");
const customEndpointField = document.querySelector("#customEndpointField");
const outputState = document.querySelector("#outputState");
const analysisList = document.querySelector("#analysisList");
const workspace = document.querySelector(".workspace");
const interviewStage = document.querySelector("#interviewStage");
const generateButton = document.querySelector("#generateButton");
const languageToggle = document.querySelector("#languageToggle");
const historyToggle = document.querySelector("#historyToggle");
const historyDialog = document.querySelector("#historyDialog");
const historySessionList = document.querySelector("#historySessionList");
const historyDialogClose = document.querySelector("#historyDialogClose");
const newSessionBtn = document.querySelector("#newSessionBtn");
const questionNavList = document.querySelector("#questionNavList");
const interviewLayout = document.querySelector("#interviewLayout");
const summaryLayout = document.querySelector("#summaryLayout");
const roundSummaryPanel = document.querySelector("#roundSummaryPanel");
const roundSummaryEl = document.querySelector("#roundSummary");
const contextBar = document.querySelector("#contextBar");
const contextBarInfo = document.querySelector("#contextBarInfo");
const contextBarInsight = document.querySelector("#contextBarInsight");
const contextBarAnalysisPreview = document.querySelector("#contextBarAnalysisPreview");
const editMaterialsBtn = document.querySelector("#editMaterialsBtn");
const openMaterialsDrawerBtn = document.querySelector("#openMaterialsDrawerBtn");
const sessionBanner = document.querySelector("#sessionBanner");
const sessionBannerTitle = document.querySelector("#sessionBannerTitle");
const sessionBannerMeta = document.querySelector("#sessionBannerMeta");
const sessionBannerBtn = document.querySelector("#sessionBannerBtn");
const materialsSidePanel = document.querySelector("#materialsSidePanel");
const sidePanelTitle = document.querySelector("#sidePanelTitle");
const prepOverviewBlock = document.querySelector("#prepOverviewBlock");
const sessionSummaryBlock = document.querySelector("#sessionSummaryBlock");
const prepJdStatus = document.querySelector("#prepJdStatus");
const prepResumeStatus = document.querySelector("#prepResumeStatus");
const prepNote = document.querySelector("#prepNote");
const materialsMetricGrid = document.querySelector("#materialsMetricGrid");
const enterInterviewBtn = document.querySelector("#enterInterviewBtn");
const regenerateBtn = document.querySelector("#regenerateBtn");
const interviewInsight = document.querySelector("#interviewInsight");
const summaryInsight = document.querySelector("#summaryInsight");
const materialsDrawer = document.querySelector("#materialsDrawer");
const materialsDrawerClose = document.querySelector("#materialsDrawerClose");
const drawerOverview = document.querySelector("#drawerOverview");
const drawerJd = document.querySelector("#drawerJd");
const drawerResume = document.querySelector("#drawerResume");
const drawerSettings = document.querySelector("#drawerSettings");
const drawerEditMaterialsBtn = document.querySelector("#drawerEditMaterialsBtn");
const regenerateConfirm = document.querySelector("#regenerateConfirm");
const regenerateConfirmText = document.querySelector("#regenerateConfirmText");
const regenerateCancelBtn = document.querySelector("#regenerateCancelBtn");
const regenerateConfirmBtn = document.querySelector("#regenerateConfirmBtn");
const toast = document.querySelector("#toast");
const restoreBanner = document.querySelector("#restoreBanner");
const restoreBannerText = document.querySelector("#restoreBannerText");
const restoreBannerBtn = document.querySelector("#restoreBannerBtn");
const restoreBannerDismiss = document.querySelector("#restoreBannerDismiss");
const railProgressLabel = document.querySelector("#railProgressLabel");
const railProgressCount = document.querySelector("#railProgressCount");
const interviewState = document.querySelector("#interviewState");
const progressSteps = ["materials", "interview", "followup"];
const insightHosts = () => [materialsSidePanel, interviewInsight, summaryInsight].filter(Boolean);
let toastTimer = null;
let lastPersistAt = null;
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
    ["custom", "Custom Model"],
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
  other: "Custom Model",
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
const staticText = {
  "AI 模拟面试官": "AI Mock Interviewer",
  "输入材料": "Input Materials",
  "生成面试": "Generate Interview",
  "追问演练": "Follow-up Practice",
  "面试设置": "Interview Setup",
  "目标公司": "Target Company",
  "目标岗位": "Target Role",
  "面试轮次": "Interview Round",
  "一面": "Round 1",
  "二面": "Round 2",
  "三面": "Round 3",
  "HR 面": "HR Round",
  "训练模式": "Training Mode",
  "生成 10 问": "Generate 10 Questions",
  "自动追问": "Auto Follow-up",
  "谈薪话术": "Salary Practice",
  "AI 引擎": "AI Engine",
  "模型供应商": "Model Provider",
  "模型": "Model",
  "自定义模型名": "Custom Model Name",
  "API 地址": "API Endpoint",
  "API Key": "API Key",
  "开始模拟面试": "Start Mock Interview",
  "未填写 API Key 时使用本地模拟；填写后直接调用所选模型供应商，Key 仅保存在当前浏览器会话。": "Without an API key, the page uses local simulation. With a key, it calls the selected model provider directly. The key stays only in this browser session.",
  "未填写 API Key 时使用本地模拟。模型设置会自动保存在本机；API Key 仅在勾选「在本机记住」后加密存储，不会写入面试历史。": "Without an API key, local simulation is used. Model settings are saved on this device. API keys are encrypted locally only when you opt in and are never written to session history.",
  "在本机记住 API Key（加密存储，请勿在公共电脑勾选）": "Remember API key on this device (encrypted; do not use on shared computers)",
  "清除本机已保存的 Key": "Clear saved key on this device",
  "已本机加密保存": "Saved encrypted on device",
  "仅当前会话": "Current session only",
  "已填写（不存储）": "Provided (not stored)",
  "本机已清除 API Key": "Saved API key cleared on this device",
  "当前浏览器不支持加密存储 API Key": "This browser does not support encrypted API key storage",
  "模型设置会自动保存在本机；API Key 仅在勾选「在本机记住」后加密存储。": "Model settings are saved on this device. API keys are encrypted locally only when you opt in.",
  "JD 内容": "JD Content",
  "链接 / 文本 / 图片 / Word / PDF": "Link / Text / Image / Word / PDF",
  "链接": "Link",
  "文本": "Text",
  "文件": "File",
  "JD 链接": "JD Link",
  "粘贴 JD 原文": "Paste JD Text",
  "上传 JD 文件": "Upload JD File",
  "支持 PDF、Word、图片、TXT、Markdown": "Supports PDF, Word, images, TXT, Markdown",
  "支持 PDF、Word、图片、TXT、Markdown · 可拖拽文件到此处": "Supports PDF, Word, images, TXT, Markdown · Drag and drop files here",
  "松开以上传文件": "Release to upload",
  "尚未选择文件": "No file selected",
  "简历内容": "Resume Content",
  "文本 / 图片 / Word / PDF": "Text / Image / Word / PDF",
  "粘贴简历内容": "Paste Resume Text",
  "上传简历文件": "Upload Resume File",
  "模拟结果": "Results",
  "等待输入": "Waiting",
  "JD 匹配度": "JD Match",
  "题目数量": "Questions",
  "预计时长": "Duration",
  "匹配度分析": "Fit Analysis",
  "输入 JD 和简历后生成强匹配、需补强和简历弱点。": "Enter a JD and resume to generate strengths, gaps, and resume risks.",
  "模拟面试": "Mock Interview",
  "点击「开始模拟面试」后，这里会展示按公司风格生成的问题。": "Click Start Mock Interview to generate company-style questions here.",
  "面试记录": "Interview Log",
  "回答任意问题后，AI 面试官会基于你的回答继续深挖。": "After you answer, the AI interviewer will dig deeper based on your response.",
  "Others / 自定义": "Others / Custom",
  "自定义模型": "Custom Model",
  "历史": "History",
  "历史会话": "Session History",
  "会话自动保存在浏览器本地，API Key 不会被存储。": "Sessions are saved locally in your browser. API keys are never stored.",
  "会话自动保存在浏览器本地。勾选「在本机记住」后，API Key 会加密保存在本机，不会写入历史会话记录。": "Sessions are saved locally. When you opt in, API keys are encrypted on this device and are not stored in session history.",
  "新建会话": "New Session",
  "展开材料": "Show Materials",
  "收起材料": "Hide Materials",
  "准备概览": "Prep Overview",
  "会话摘要": "Session Summary",
  "备战洞察": "Interview Fit Analysis",
  "面试匹配分析": "Interview Fit Analysis",
  "编辑材料": "Edit Materials",
  "材料▾": "Materials",
  "材料查阅": "View Materials",
  "概览": "Overview",
  "JD": "JD",
  "简历": "Resume",
  "设置": "Settings",
  "进入面试": "Enter Interview",
  "继续面试": "Continue Interview",
  "重新生成": "Regenerate",
  "重新生成面试题？": "Regenerate interview questions?",
  "当前答题进度将被覆盖，此操作不可撤销。": "Your current answers will be overwritten. This cannot be undone.",
  "取消": "Cancel",
  "确认重新生成": "Confirm Regenerate",
  "生成后将在此展示匹配度与备战建议，并进入模拟面试。": "After generation, match score and prep insights will appear here before you enter the mock interview.",
  "JD 材料": "JD Materials",
  "简历材料": "Resume Materials",
  "备战要点": "Fit Summary",
  "匹配度与分析": "Match Metrics",
  "匹配指标": "Match Metrics",
  "匹配摘要": "Fit Summary",
  "待补充": "Pending",
  "已分析": "Analyzed",
  "未填写 API Key，当前使用本地模拟问题。": "No API key provided. Using local simulated questions.",
  "填写所选供应商 API Key 后，会基于 JD、简历和回答实时生成问题与追问。": "After entering the selected provider API key, questions and follow-ups are generated live from the JD, resume, and answers.",
  "建议提供完整 JD 和简历文本，以获得更贴近目标岗位的模拟面试。": "Provide a complete JD and resume for a more targeted mock interview.",
  "已基于 JD 和简历生成定制面试问题。": "Custom interview questions were generated from the JD and resume.",
  "未提供完整 JD": "No complete JD provided",
  "未提供完整简历": "No complete resume provided",
  "完成本轮后可查看总结": "Complete the round to view the summary",
  "请先生成面试题": "Generate interview questions first",
  "查看全文": "View Full Text",
  "收起全文": "Collapse",
  "引擎": "Engine",
  "本地模拟": "Local Simulation",
  "实时生成": "Live Generation",
  "进行中的面试": "Interview in progress",
  "上次保存": "Last saved",
  "刚刚": "Just now",
  "分钟前": "min ago",
  "轮次": "Round",
  "字": "chars",
  "暂无内容": "No content",
  "已填写（不存储）": "Provided (not stored)",
  "未填写": "Not provided",
  "如需修改设置，请返回材料编辑。": "Return to materials editing to change settings.",
  "题目进度": "Progress",
  "进行中": "In Progress",
  "检测到未完成的面试会话": "An unfinished interview session was found",
  "恢复会话": "Restore Session",
  "本轮总结": "Round Summary",
  "答题完成度": "Completion",
  "追问深度": "Follow-ups",
  "整体评价": "Overall Review",
  "最强回答": "Strongest Answer",
  "待改进": "Needs Improvement",
  "改进建议": "Improvement Tips",
  "逐题摘要": "Question Summary",
  "返回修改": "Back to Edit",
  "导出 Markdown": "Export Markdown",
  "开始新一轮": "Start New Round",
  "暂无历史会话": "No saved sessions yet",
  "删除": "Delete",
  "继续": "Continue",
  "生成追问中...": "Generating follow-up...",
  "继续追问中...": "Continuing follow-up...",
  "生成复盘中...": "Generating review...",
  "会话恢复失败，请从历史记录重试。": "Failed to restore session. Try again from history.",
};
const placeholderText = {
  companyInput: ["例如：腾讯 / 阿里 / 字节", "e.g. Google / Meta / Microsoft"],
  roleInput: ["例如：后端工程师 / 产品经理 / 数据分析师", "e.g. Backend Engineer / Product Manager / Data Analyst"],
  apiKeyInput: ["sk-", "sk-"],
  customModelInput: ["例如：provider/model-name", "e.g. provider/model-name"],
  customEndpointInput: ["https://.../v1/chat/completions", "https://.../v1/chat/completions"],
  jdLink: ["https://...", "https://..."],
  jdText: ["粘贴岗位职责、任职要求、加分项等内容", "Paste responsibilities, requirements, nice-to-haves, and context"],
  resumeText: ["粘贴教育背景、工作经历、项目经历、技术栈等内容", "Paste education, work experience, projects, skills, and achievements"],
};
const reverseStaticText = Object.fromEntries(Object.entries(staticText).map(([zh, en]) => [en, zh]));

const systemLocalizedPairs = [
  ["待补充", "Pending"],
  ["已分析", "Analyzed"],
  ["未填写 API Key，当前使用本地模拟问题。", "No API key provided. Using local simulated questions."],
  ["填写所选供应商 API Key 后，会基于 JD、简历和回答实时生成问题与追问。", "After entering the selected provider API key, questions and follow-ups are generated live from the JD, resume, and answers."],
  ["建议提供完整 JD 和简历文本，以获得更贴近目标岗位的模拟面试。", "Provide a complete JD and resume for a more targeted mock interview."],
  ["已基于 JD 和简历生成定制面试问题。", "Custom interview questions were generated from the JD and resume."],
  ["输入 JD 和简历后生成强匹配、需补强和简历弱点。", "Enter a JD and resume to generate strengths, gaps, and resume risks."],
  ["未提供完整 JD", "No complete JD provided"],
  ["未提供完整简历", "No complete resume provided"],
  ["目标公司", "target company"],
  ["目标岗位", "target role"],
];

function localize(zh, en) {
  return state.lang === "zh" ? zh : en;
}

function localizeStoredString(text) {
  if (!text || typeof text !== "string") return text;
  for (const [zh, en] of systemLocalizedPairs) {
    if (state.lang === "en" && text === zh) return en;
    if (state.lang === "zh" && text === en) return zh;
  }
  if (staticText[text] && state.lang === "en") return staticText[text];
  if (reverseStaticText[text] && state.lang === "zh") return reverseStaticText[text];
  return text;
}

function createSessionId() {
  return crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setLoading(isLoading) {
  state.isLoading = isLoading;
}

async function withLoading(button, asyncFn, labels) {
  if (state.isLoading) return null;
  const defaultLabel = button ? button.textContent : "";
  setLoading(true);
  if (button) {
    button.disabled = true;
    button.dataset.loading = "true";
    button.replaceChildren();
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    button.append(spinner, document.createTextNode(` ${labels.loading}`));
  }

  try {
    return await asyncFn();
  } finally {
    setLoading(false);
    if (button) {
      button.disabled = false;
      button.dataset.loading = "false";
      button.textContent = labels.default || defaultLabel;
    }
    if (state.phase === "interview" && state.questions.length) {
      renderInterviewStage();
      renderQuestionRail();
    }
  }
}

function deriveTurnStatus(turn) {
  if (!turn) return "pending";
  const hasAnswer = Boolean(turn.answer && turn.answer.trim());
  const followups = turn.followups || [];
  if (followups.length) return "followed-up";
  if (hasAnswer) return "answered";
  return "pending";
}

function getTurnStatusIcon(status) {
  if (status === "followed-up") return "◐";
  if (status === "answered") return "●";
  if (status === "completed") return "✓";
  return "○";
}

function getSessionTitle() {
  const company = companyInput.value.trim() || localize("目标公司", "Target Company");
  const role = roleInput.value.trim() || localize("目标岗位", "Target Role");
  return `${company} · ${role} · ${getRoundLabel()}`;
}

function getMatchScoreTier(score) {
  const num = parseInt(String(score || "").replace(/[^\d]/g, ""), 10);
  if (Number.isNaN(num)) return "neutral";
  if (num >= 80) return "high";
  if (num >= 60) return "medium";
  return "low";
}

function getDefaultAnalysisItems() {
  return [localize("输入 JD 和简历后生成强匹配、需补强和简历弱点。", "Enter a JD and resume to generate strengths, gaps, and resume risks.")];
}

function getInsightData() {
  const rawAnalysis = state.resultMeta.analysis?.length ? state.resultMeta.analysis : getDefaultAnalysisItems();
  return {
    matchScore: localizeStoredString(state.resultMeta.matchScore || "--"),
    questionCount: String(state.questions.length || 0),
    duration: state.resultMeta.duration || "--",
    analysis: rawAnalysis.map((item) => localizeStoredString(item)),
  };
}

function renderInsightLabels(root) {
  if (!root) return;

  const title = root.querySelector(".panel-head h2");
  if (title) title.textContent = localize("面试匹配分析", "Interview Fit Analysis");

  root.querySelectorAll(".insight-collapse-trigger").forEach((node) => {
    node.textContent = localize("匹配指标", "Match Metrics");
  });

  const metricLabels = [
    localize("JD 匹配度", "JD Match"),
    localize("题目数量", "Questions"),
    localize("预计时长", "Duration"),
  ];
  root.querySelectorAll(".insight-metrics .metric").forEach((metric, index) => {
    const label = metric.querySelector("span");
    if (label && metricLabels[index]) label.textContent = metricLabels[index];
  });

  root.querySelectorAll(".result-block h3").forEach((heading) => {
    heading.textContent = localize("匹配度分析", "Fit Analysis");
  });
}

function renderInsight(root, options = {}) {
  if (!root) return;
  renderInsightLabels(root);
  const data = getInsightData();
  const maxBullets = options.maxBullets || data.analysis.length;

  root.querySelectorAll("[data-insight-match]").forEach((node) => {
    node.textContent = data.matchScore;
    node.classList.remove("match-high", "match-medium", "match-low", "match-neutral");
    node.classList.add(`match-${getMatchScoreTier(data.matchScore)}`);
  });
  root.querySelectorAll("[data-insight-count]").forEach((node) => {
    node.textContent = data.questionCount;
  });
  root.querySelectorAll("[data-insight-duration]").forEach((node) => {
    node.textContent = data.duration;
  });

  root.querySelectorAll(".insight-analysis").forEach((list) => {
    list.replaceChildren();
    data.analysis.slice(0, maxBullets).forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.append(li);
    });
  });
}

function renderAllInsights(options = {}) {
  insightHosts().forEach((host) => renderInsight(host, options));
  renderContextBarInsightPreview();
}

function setAnalysis(items) {
  state.resultMeta.analysis = items;
  renderAllInsights();
  renderMaterialsSidePanel();
}

function setResultMeta(partial) {
  state.resultMeta = { ...state.resultMeta, ...partial };
  renderAllInsights();
  renderMaterialsSidePanel();
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 2800);
}

function formatRelativeSaveTime(iso) {
  if (!iso) return localize("刚刚", "Just now");
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return localize("刚刚", "Just now");
  return state.lang === "zh" ? `${mins} 分钟前` : `${mins} min ago`;
}

function renderPrepOverview() {
  const jdHas = jdLink.value.trim() || jdText.value.trim() || state.parsedFiles.jd;
  const resumeHas = resumeText.value.trim() || state.parsedFiles.resume;
  if (prepJdStatus) {
    prepJdStatus.dataset.status = jdHas ? "done" : "pending";
    prepJdStatus.textContent = localize("JD 材料", "JD Materials");
  }
  if (prepResumeStatus) {
    prepResumeStatus.dataset.status = resumeHas ? "done" : "pending";
    prepResumeStatus.textContent = localize("简历材料", "Resume Materials");
  }
  if (prepNote) {
    prepNote.textContent = localize(
      "生成后将在此展示匹配度与备战建议，并进入模拟面试。",
      "After generation, match score and prep insights will appear here before you enter the mock interview.",
    );
  }
}

function renderMaterialsSidePanel() {
  const hasQuestions = state.questions.length > 0;
  if (sidePanelTitle) {
    sidePanelTitle.textContent = hasQuestions
      ? localize("会话摘要", "Session Summary")
      : localize("准备概览", "Prep Overview");
  }
  if (materialsSidePanel) {
    materialsSidePanel.setAttribute(
      "aria-label",
      hasQuestions ? localize("会话摘要", "Session Summary") : localize("准备概览", "Prep Overview"),
    );
  }
  prepOverviewBlock?.classList.toggle("hidden", hasQuestions);
  sessionSummaryBlock?.classList.toggle("hidden", !hasQuestions);
  if (hasQuestions) {
    renderInsight(materialsSidePanel);
    materialsMetricGrid?.classList.toggle("skeleton", state.isLoading);
  } else {
    renderPrepOverview();
  }
  updatePrimaryActions();
}

function updatePrimaryActions() {
  const progress = getSessionProgress();
  if (!generateButton) return;

  if (!state.questions.length) {
    generateButton.textContent = localize("开始模拟面试", "Start Mock Interview");
    return;
  }

  if (progress.answered > 0) {
    generateButton.textContent = localize(`继续面试 · ${progress.label}`, `Continue Interview · ${progress.label}`);
  } else {
    generateButton.textContent = localize("进入面试", "Enter Interview");
  }

  if (enterInterviewBtn) {
    enterInterviewBtn.textContent = progress.answered > 0
      ? localize(`继续面试 · ${progress.label}`, `Continue Interview · ${progress.label}`)
      : localize("进入面试", "Enter Interview");
  }
}

function isUnfinishedSessionMeta(meta) {
  if (!meta || meta.phase === "summary") return false;
  const match = String(meta.progress || "").match(/(\d+)\/(\d+)/);
  if (!match) return meta.phase === "interview";
  return Number(match[2]) > 0;
}

function findResumableSessionMeta(sessions) {
  if (!sessions?.length) return null;
  const activeId = InterviewStorage.getActiveSessionId();
  if (activeId) {
    const activeMeta = sessions.find((item) => item.id === activeId);
    if (isUnfinishedSessionMeta(activeMeta)) return activeMeta;
  }
  return sessions.find((item) => isUnfinishedSessionMeta(item)) || null;
}

function renderSessionBanner() {
  const hasActiveSession = state.questions.length > 0 && state.phase !== "summary";
  sessionBanner?.classList.toggle("hidden", !(hasActiveSession && workspace.dataset.mode === "materials"));
  if (!hasActiveSession || workspace.dataset.mode !== "materials" || !sessionBannerTitle || !sessionBannerMeta) return;

  const progress = getSessionProgress();
  const total = progress.total || state.questions.length || 0;
  const savedLabel = formatRelativeSaveTime(lastPersistAt || state.resultMeta.updatedAt);

  sessionBannerTitle.textContent = localize("进行中的面试", "Interview in progress");
  sessionBannerMeta.textContent = localize(
    `第 ${state.currentIndex + 1}/${total} 题 · 上次保存 ${savedLabel}`,
    `Question ${state.currentIndex + 1}/${total} · Last saved ${savedLabel}`,
  );
  sessionBannerBtn.textContent = localize("继续面试 →", "Continue Interview →");
}

function canNavigateToStep(step) {
  if (step === "materials") return true;
  if (step === "interview") return state.questions.length > 0;
  if (step === "followup") return state.phase === "summary" && !!state.roundSummary;
  return false;
}

function navigateWorkspace(step) {
  if (!canNavigateToStep(step)) {
    if (step === "interview") {
      showToast(localize("请先生成面试题", "Generate interview questions first"));
    } else if (step === "followup") {
      showToast(localize("完成本轮后可查看总结", "Complete the round to view the summary"));
    }
    return;
  }

  if (state.phase === "interview" && step === "materials") {
    saveCurrentTurn();
    saveCurrentFollowupAnswer();
  }

  const mode = step === "followup" ? "summary" : step;
  setWorkspaceMode(mode);
  if (step === "followup") {
    setProgressStep("followup");
  } else {
    setProgressStep(step);
  }
  persistSession();
}

function updateStepNavAvailability() {
  document.querySelectorAll("[data-step-nav]").forEach((button) => {
    const step = button.dataset.stepNav;
    const enabled = canNavigateToStep(step);
    button.setAttribute("aria-disabled", enabled ? "false" : "true");
  });
}

function confirmRegenerate() {
  return new Promise((resolve) => {
    if (!regenerateConfirm) {
      resolve(window.confirm(localize("当前答题进度将被覆盖，此操作不可撤销。", "Your current answers will be overwritten. This cannot be undone.")));
      return;
    }

    const onCancel = () => {
      regenerateConfirm.close();
      cleanup();
      resolve(false);
    };
    const onConfirm = () => {
      regenerateConfirm.close();
      cleanup();
      resolve(true);
    };
    const cleanup = () => {
      regenerateCancelBtn?.removeEventListener("click", onCancel);
      regenerateConfirmBtn?.removeEventListener("click", onConfirm);
    };

    regenerateCancelBtn?.addEventListener("click", onCancel);
    regenerateConfirmBtn?.addEventListener("click", onConfirm);
    regenerateConfirm.showModal();
  });
}

function truncateText(text, maxLen = 200) {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen)}…`;
}

function renderMaterialsDrawer() {
  const materials = getMaterials();
  const progress = getSessionProgress();
  const engineLabel = state.engine === "api"
    ? localize(`${getProviderLabel()} 实时生成`, `${getProviderLabel()} live generation`)
    : localize("本地模拟", "Local simulation");

  if (drawerOverview) {
    drawerOverview.replaceChildren();
    const rows = [
      [localize("公司", "Company"), materials.company],
      [localize("岗位", "Role"), materials.role],
      [localize("面试轮次", "Interview Round"), materials.round],
      [localize("引擎", "Engine"), engineLabel],
      [localize("进度", "Progress"), progress.label],
      [localize("匹配度", "Match"), localizeStoredString(state.resultMeta.matchScore || "--")],
    ];
    rows.forEach(([label, value]) => {
      const row = document.createElement("p");
      row.className = "drawer-meta";
      row.innerHTML = `${label}: <strong>${value}</strong>`;
      drawerOverview.append(row);
    });
  }

  const renderReadonlyPanel = (panel, content, metaText) => {
    if (!panel) return;
    panel.replaceChildren();
    const meta = document.createElement("p");
    meta.className = "drawer-meta";
    meta.textContent = metaText;
    const pre = document.createElement("pre");
    pre.className = "drawer-readonly";
    const fullText = content || localize("暂无内容", "No content");
    pre.textContent = truncateText(fullText, panel.dataset.expanded === "true" ? fullText.length : 200);
    panel.append(meta, pre);
    if (fullText.length > 200) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "drawer-expand-btn";
      toggle.textContent = panel.dataset.expanded === "true"
        ? localize("收起全文", "Collapse")
        : localize("查看全文", "View Full Text");
      toggle.addEventListener("click", () => {
        panel.dataset.expanded = panel.dataset.expanded === "true" ? "false" : "true";
        renderMaterialsDrawer();
      });
      panel.append(toggle);
    }
  };

  renderReadonlyPanel(
    drawerJd,
    materials.jd,
    `${localize("JD", "JD")} · ${materials.jd.length} ${localize("字", "chars")}`,
  );
  renderReadonlyPanel(
    drawerResume,
    materials.resume,
    `${localize("简历", "Resume")} · ${materials.resume.length} ${localize("字", "chars")}`,
  );

  if (drawerSettings) {
    drawerSettings.replaceChildren();
    const rows = [
      [localize("模型供应商", "Model Provider"), getProviderLabel()],
      [localize("模型", "Model"), getSelectedModel() || "-"],
      ["API Key", getApiKeyStatusLabel()],
    ];
    rows.forEach(([label, value]) => {
      const row = document.createElement("p");
      row.className = "drawer-meta";
      row.innerHTML = `${label}: <strong>${value}</strong>`;
      drawerSettings.append(row);
    });
    const note = document.createElement("p");
    note.className = "drawer-meta";
    note.textContent = localize("如需修改设置，请返回材料编辑。", "Return to materials editing to change settings.");
    drawerSettings.append(note);
  }
}

function openMaterialsDrawer() {
  renderMaterialsDrawer();
  materialsDrawer?.showModal();
}

function closeMaterialsDrawer() {
  materialsDrawer?.close();
}

function bindDrawerTabs() {
  document.querySelectorAll("[data-drawer-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-drawer-tab]").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
      document.querySelectorAll(".drawer-panel").forEach((panel) => panel.classList.remove("active"));
      document.querySelector(`#drawer${button.dataset.drawerTab.charAt(0).toUpperCase()}${button.dataset.drawerTab.slice(1)}`)?.classList.add("active");
    });
  });
}

function bindStepNavigation() {
  document.querySelectorAll("[data-step-nav]").forEach((button) => {
    const activate = () => {
      if (button.getAttribute("aria-disabled") === "true") return;
      navigateWorkspace(button.dataset.stepNav);
    };
    button.addEventListener("click", activate);
    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    });
  });
}

function renderContextBarInsightPreview() {
  if (!contextBarAnalysisPreview) return;
  const data = getInsightData();
  contextBarAnalysisPreview.replaceChildren();
  data.analysis.slice(0, 2).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    contextBarAnalysisPreview.append(li);
  });
  const summaryNode = document.querySelector("#contextBarInsightSummary");
  if (summaryNode) summaryNode.textContent = localize("匹配摘要", "Fit Summary");
}

function getSessionProgress() {
  const total = state.questions.length || 0;
  const answered = state.turns.filter((turn) => turn && turn.answer && turn.answer.trim()).length;
  return { answered, total, label: total ? `${answered}/${total}` : "0/0" };
}

function setWorkspaceMode(mode) {
  if (state.phase === "interview" && mode === "materials") {
    saveCurrentTurn();
    saveCurrentFollowupAnswer();
  }

  state.phase = mode;
  workspace.dataset.mode = mode;
  const showContext = mode === "interview" || mode === "summary";
  contextBar.classList.toggle("hidden", !showContext);

  if (interviewLayout) {
    interviewLayout.hidden = mode !== "interview";
    interviewLayout.classList.toggle("is-active", mode === "interview");
  }
  if (summaryLayout) {
    summaryLayout.hidden = mode !== "summary";
  }
  if (roundSummaryPanel) {
    roundSummaryPanel.hidden = mode !== "summary";
  }

  renderContextBar();
  renderMaterialsSidePanel();
  renderSessionBanner();
  updateStepNavAvailability();

  if (mode === "interview") {
    renderAllInsights();
    renderQuestionRail();
    renderInterviewStage();
  }
  if (mode === "summary") {
    renderAllInsights();
    renderRoundSummary();
  }
  if (mode === "materials") {
    renderPrepOverview();
  }

  persistSession();
}

function truncatePreview(text, maxLen = 42) {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen)}…`;
}

function renderContextBar() {
  if (contextBar.classList.contains("hidden")) return;
  const { company, role } = getMaterials();
  contextBarInfo.replaceChildren();
  const matchTier = getMatchScoreTier(state.resultMeta.matchScore);
  [
    [localize("公司", "Company"), company],
    [localize("岗位", "Role"), role],
    [localize("轮次", "Round"), getRoundLabel()],
    [localize("引擎", "Engine"), state.engine === "api" ? getProviderLabel() : localize("本地模拟", "Local simulation")],
    [localize("匹配度", "Match"), localizeStoredString(state.resultMeta.matchScore || "--")],
    [localize("进度", "Progress"), getSessionProgress().label],
  ].forEach(([label, value]) => {
    const item = document.createElement("span");
    const isMatch = label === localize("匹配度", "Match");
    item.innerHTML = `${label} <strong${isMatch ? ` class="match-badge match-${matchTier}"` : ""}>${value}</strong>`;
    contextBarInfo.append(item);
  });
  renderContextBarInsightPreview();
}

function serializeSessionPayload() {
  return {
    id: state.sessionId,
    updatedAt: new Date().toISOString(),
    lang: state.lang,
    round: state.round,
    engine: state.engine,
    questions: state.questions,
    currentIndex: state.currentIndex,
    turns: state.turns,
    phase: state.phase,
    roundSummary: state.roundSummary,
    resultMeta: {
      matchScore: state.resultMeta.matchScore,
      duration: state.resultMeta.duration,
      analysis: state.resultMeta.analysis.length ? state.resultMeta.analysis : getDefaultAnalysisItems(),
      updatedAt: new Date().toISOString(),
    },
    settings: {
      company: companyInput.value.trim(),
      role: roleInput.value.trim(),
      round: state.round,
      provider: providerSelect.value,
      model: getSelectedModel(),
      customModel: customModelInput.value.trim(),
      customEndpoint: customEndpointInput.value.trim(),
    },
    materials: {
      jdLink: jdLink.value.trim(),
      jdText: jdText.value.trim(),
      resumeText: resumeText.value.trim(),
      parsedJd: state.parsedFiles.jd,
      parsedResume: state.parsedFiles.resume,
    },
  };
}

function persistSession() {
  if (!state.sessionId || !window.InterviewStorage) return;
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistSessionImmediate();
  }, 500);
}

async function persistSessionImmediate() {
  if (!state.sessionId || !window.InterviewStorage) return;
  clearTimeout(persistTimer);
  persistTimer = null;
  try {
    const payload = serializeSessionPayload();
    await InterviewStorage.saveSessionToDB(payload);
    lastPersistAt = payload.resultMeta.updatedAt;
    const progress = getSessionProgress();
    const sessions = InterviewStorage.readSessionIndex().filter((item) => item.id !== payload.id);
    sessions.unshift({
      id: payload.id,
      title: getSessionTitle(),
      company: payload.settings.company,
      role: payload.settings.role,
      round: state.round,
      progress: progress.label,
      phase: state.phase,
      engine: state.engine,
      updatedAt: payload.updatedAt,
    });
    InterviewStorage.writeSessionIndex(sessions.slice(0, 50));
    InterviewStorage.setActiveSessionId(payload.id);
  } catch (error) {
    console.warn("Failed to persist session", error);
  }
}

function createSession() {
  state.sessionId = createSessionId();
  state.roundSummary = null;
  InterviewStorage.setActiveSessionId(state.sessionId);
}

async function restoreSession(id) {
  try {
    const payload = await InterviewStorage.loadSessionFromDB(id);
    if (!payload) {
      console.warn("Session not found in IndexedDB:", id);
      return false;
    }

    state.sessionId = payload.id;
    state.lang = payload.lang || state.lang;
    state.round = payload.round || state.round;
    state.engine = payload.engine || "local";
    state.questions = Array.isArray(payload.questions) ? payload.questions : [];
    state.currentIndex = payload.currentIndex || 0;
    state.turns = Array.isArray(payload.turns) ? payload.turns : [];
    state.phase = payload.phase || "materials";
    state.roundSummary = payload.roundSummary || null;
    state.resultMeta = payload.resultMeta || { matchScore: "--", duration: "--", analysis: [] };
    lastPersistAt = payload.resultMeta?.updatedAt || payload.updatedAt || null;
    state.parsedFiles.jd = payload.materials?.parsedJd || "";
    state.parsedFiles.resume = payload.materials?.parsedResume || "";

    // 若 questions 丢失但 turns 中有题目，从 turns 恢复
    if (!state.questions.length && state.turns.length) {
      state.questions = state.turns.map((turn) => turn.question).filter(Boolean);
    }

    if (payload.settings) {
      companyInput.value = payload.settings.company || "";
      roleInput.value = payload.settings.role || "";
    }
    if (payload.materials) {
      jdLink.value = payload.materials.jdLink || "";
      jdText.value = payload.materials.jdText || "";
      resumeText.value = payload.materials.resumeText || "";
    }

    document.querySelectorAll(".segmented button").forEach((button) => {
      button.classList.toggle("selected", button.dataset.round === state.round);
    });

    setResultMeta({
      matchScore: state.resultMeta.matchScore || "--",
      duration: state.resultMeta.duration || "--",
      analysis: state.resultMeta.analysis.length ? state.resultMeta.analysis : getDefaultAnalysisItems(),
    });
    renderMaterialsSidePanel();

    InterviewStorage.setActiveSessionId(id);

    if (state.phase === "summary" && state.roundSummary) {
      setWorkspaceMode("summary");
    } else if (state.questions.length) {
      setWorkspaceMode("interview");
      outputState.textContent = localize(`第 ${state.currentIndex + 1} 题`, `Question ${state.currentIndex + 1}`);
      setProgressStep(state.turns.some((turn) => (turn.followups || []).length) ? "followup" : "interview");
    } else {
      setWorkspaceMode("materials");
      setProgressStep("materials");
    }

    applyLanguage(state.lang);
    return true;
  } catch (error) {
    console.warn("Failed to restore session", error);
    return false;
  }
}

async function deleteSession(id) {
  await InterviewStorage.deleteSessionFromDB(id);
  const sessions = InterviewStorage.readSessionIndex().filter((item) => item.id !== id);
  InterviewStorage.writeSessionIndex(sessions);
  if (InterviewStorage.getActiveSessionId() === id) {
    InterviewStorage.setActiveSessionId(sessions[0]?.id || null);
  }
}

function bindProviderModelsSync() {
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
}

function getApiKeyStatusLabel() {
  if (!apiKeyInput.value.trim()) return localize("未填写", "Not provided");
  if (rememberApiKeyInput?.checked) return localize("已本机加密保存", "Saved encrypted on device");
  return localize("仅当前会话", "Current session only");
}

function collectEnginePreferences() {
  return {
    company: companyInput.value.trim(),
    role: roleInput.value.trim(),
    provider: providerSelect.value,
    model: getSelectedModel(),
    customModel: customModelInput.value.trim(),
    customEndpoint: customEndpointInput.value.trim(),
    rememberApiKey: !!rememberApiKeyInput?.checked,
  };
}

function applyEnginePreferences(prefs) {
  if (!prefs) return;
  if (prefs.company !== undefined) companyInput.value = prefs.company;
  if (prefs.role !== undefined) roleInput.value = prefs.role;
  if (prefs.provider) providerSelect.value = prefs.provider;
  bindProviderModelsSync();
  const config = providerConfig[providerSelect.value] || {};
  if (config.needsCustomModel) {
    customModelInput.value = prefs.customModel || prefs.model || "";
  } else if (prefs.model) {
    const hasOption = [...modelInput.options].some((option) => option.value === prefs.model);
    if (hasOption) modelInput.value = prefs.model;
  }
  customEndpointInput.value = prefs.customEndpoint || "";
  if (rememberApiKeyInput) {
    rememberApiKeyInput.checked = !!prefs.rememberApiKey;
    rememberApiKeyInput.disabled = !window.InterviewStorage?.isCryptoAvailable?.();
  }
}

async function persistEnginePreferencesImmediate() {
  if (!window.InterviewStorage?.saveEnginePreferences) return;
  clearTimeout(enginePrefsTimer);
  enginePrefsTimer = null;
  const prefs = collectEnginePreferences();
  try {
    await InterviewStorage.saveEnginePreferences(prefs);
    if (prefs.rememberApiKey && apiKeyInput.value.trim()) {
      if (!InterviewStorage.isCryptoAvailable()) {
        showToast(localize("当前浏览器不支持加密存储 API Key", "This browser does not support encrypted API key storage"));
        if (rememberApiKeyInput) rememberApiKeyInput.checked = false;
        await InterviewStorage.saveEnginePreferences({ ...prefs, rememberApiKey: false });
        return;
      }
      await InterviewStorage.saveEncryptedApiKey(apiKeyInput.value.trim());
    } else {
      await InterviewStorage.clearEncryptedApiKey();
    }
  } catch (error) {
    console.warn("Failed to persist engine preferences", error);
  }
}

function persistEnginePreferences() {
  clearTimeout(enginePrefsTimer);
  enginePrefsTimer = setTimeout(() => {
    persistEnginePreferencesImmediate();
  }, 500);
}

async function loadEnginePreferencesOnInit() {
  if (!window.InterviewStorage?.loadEnginePreferences) {
    bindProviderModelsSync();
    return;
  }
  try {
    const prefs = await InterviewStorage.loadEnginePreferences();
    if (prefs) {
      applyEnginePreferences(prefs);
    } else {
      bindProviderModelsSync();
    }
    if (prefs?.rememberApiKey && InterviewStorage.isCryptoAvailable()) {
      const savedKey = await InterviewStorage.loadEncryptedApiKey();
      if (savedKey) apiKeyInput.value = savedKey;
    }
  } catch (error) {
    console.warn("Failed to load engine preferences", error);
    bindProviderModelsSync();
  }
}

async function clearStoredCredentials() {
  if (window.InterviewStorage?.clearEncryptedApiKey) {
    await InterviewStorage.clearEncryptedApiKey();
  }
  apiKeyInput.value = "";
  if (rememberApiKeyInput) rememberApiKeyInput.checked = false;
  await persistEnginePreferencesImmediate();
  showToast(localize("本机已清除 API Key", "Saved API key cleared on this device"));
}

function bindEnginePreferenceInputs() {
  [companyInput, roleInput, providerSelect, modelInput, customModelInput, customEndpointInput].forEach((input) => {
    input?.addEventListener("change", persistEnginePreferences);
    input?.addEventListener("input", persistEnginePreferences);
  });
  apiKeyInput?.addEventListener("blur", persistEnginePreferences);
  rememberApiKeyInput?.addEventListener("change", () => {
    if (rememberApiKeyInput.checked && !InterviewStorage.isCryptoAvailable()) {
      rememberApiKeyInput.checked = false;
      showToast(localize("当前浏览器不支持加密存储 API Key", "This browser does not support encrypted API key storage"));
      return;
    }
    persistEnginePreferencesImmediate();
  });
  clearStoredCredentialsBtn?.addEventListener("click", clearStoredCredentials);
}

function showRestoreBanner(sessionMeta) {
  restoreBannerText.textContent = `${localize("检测到未完成的面试会话", "An unfinished interview session was found")}: ${sessionMeta.title} (${sessionMeta.progress})`;
  restoreBanner.dataset.sessionId = sessionMeta.id;
  restoreBanner.classList.remove("hidden");
}

function hideRestoreBanner() {
  restoreBanner.classList.add("hidden");
  delete restoreBanner.dataset.sessionId;
}

async function tryResumeIncompleteSession() {
  if (!window.InterviewStorage) return false;
  const sessions = InterviewStorage.readSessionIndex();
  const meta = findResumableSessionMeta(sessions);
  if (!meta) return false;

  const restored = await restoreSession(meta.id);
  if (!restored) return false;

  hideRestoreBanner();
  if (state.phase !== "summary" && state.questions.length) {
    setWorkspaceMode("materials");
    if (state.turns.some((turn) => (turn.followups || []).length)) {
      setProgressStep("followup");
    } else if (state.questions.length) {
      setProgressStep("interview");
    }
    renderSessionBanner();
  }
  return true;
}

async function initRestoreFlow() {
  await tryResumeIncompleteSession();
}

function renderHistoryDialog() {
  const sessions = InterviewStorage.readSessionIndex();
  historySessionList.replaceChildren();
  if (!sessions.length) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = localize("暂无历史会话", "No saved sessions yet");
    historySessionList.append(empty);
    return;
  }

  sessions.forEach((meta) => {
    const item = document.createElement("div");
    item.className = `history-session-item${meta.id === state.sessionId ? " active" : ""}`;
    const info = document.createElement("button");
    info.type = "button";
    info.className = "history-session-info";
    info.innerHTML = `<strong>${meta.title}</strong><span>${meta.progress} · ${new Date(meta.updatedAt).toLocaleString()}</span>`;
    info.addEventListener("click", async () => {
      await restoreSession(meta.id);
      historyDialog.close();
      hideRestoreBanner();
    });
    const del = document.createElement("button");
    del.type = "button";
    del.className = "history-session-delete";
    del.textContent = localize("删除", "Delete");
    del.addEventListener("click", async (event) => {
      event.stopPropagation();
      await deleteSession(meta.id);
      if (state.sessionId === meta.id) resetAll(true);
      renderHistoryDialog();
    });
    item.append(info, del);
    historySessionList.append(item);
  });
}

function exportSessionMarkdown() {
  const materials = getMaterials();
  const lines = [
    `# ${getSessionTitle()}`,
    "",
    `- ${localize("匹配度", "Match")}: ${localizeStoredString(state.resultMeta.matchScore)}`,
    `- ${localize("预计时长", "Duration")}: ${state.resultMeta.duration}`,
    "",
    "## Analysis",
    ...(state.resultMeta.analysis || []).map((item) => `- ${item}`),
    "",
  ];

  if (state.roundSummary) {
    lines.push("## Round Summary", "", state.roundSummary.overall || "", "");
    if (state.roundSummary.strengths?.length) {
      lines.push("### Strengths", ...state.roundSummary.strengths.map((item) => `- ${item}`), "");
    }
    if (state.roundSummary.improvements?.length) {
      lines.push("### Improvements", ...state.roundSummary.improvements.map((item) => `- ${item}`), "");
    }
  }

  state.turns.forEach((turn, index) => {
    lines.push(`## Q${index + 1}`, "", turn.question, "", `${localize("回答", "Answer")}: ${turn.answer || localize("未填写", "Not filled")}`, "");
    (turn.followups || []).forEach((followup, followupIndex) => {
      lines.push(`### ${localize("追问", "Follow-up")} ${followupIndex + 1}`, followup.question, "", `${localize("回答", "Answer")}: ${followup.answer || "-"}`, followup.feedback ? `${localize("反馈", "Feedback")}: ${followup.feedback}` : "", "");
    });
  });

  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `interview-${materials.company}-${Date.now()}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function translateStaticText(targetLang) {
  const map = targetLang === "en" ? staticText : reverseStaticText;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];

  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }

  nodes.forEach((node) => {
    const text = node.nodeValue.trim();
    if (!text || !map[text]) return;
    node.nodeValue = node.nodeValue.replace(text, map[text]);
  });
}

function applyLanguage(targetLang = state.lang) {
  state.lang = targetLang;
  localStorage.setItem("interviewSkillsLang", state.lang);
  document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
  document.title = localize("AI 模拟面试官 · 轻量 UI 原型", "AI Mock Interviewer · Lightweight UI");
  languageToggle.textContent = state.lang === "zh" ? "English" : "Chinese";
  document.querySelector(".brand img").alt = localize("AI 模拟面试官", "AI Mock Interviewer");
  document.querySelector("#resetButton").title = localize("重置", "Reset");
  document.querySelector(".status-strip").setAttribute("aria-label", localize("流程状态", "Progress status"));
  document.querySelector(".setup-panel").setAttribute("aria-label", localize("面试设置", "Interview setup"));
  document.querySelector(".segmented").setAttribute("aria-label", localize("面试轮次", "Interview round"));
  document.querySelector(".input-panel").setAttribute("aria-label", localize("材料输入", "Materials input"));
  document.querySelector(".output-panel, .materials-side-panel")?.setAttribute("aria-label", localize("准备概览", "Prep Overview"));
  document.querySelector('[aria-label="JD 输入方式"], [aria-label="JD input method"]').setAttribute("aria-label", localize("JD 输入方式", "JD input method"));
  document.querySelector('[aria-label="简历输入方式"], [aria-label="Resume input method"]').setAttribute("aria-label", localize("简历输入方式", "Resume input method"));
  translateStaticText(state.lang);

  Object.entries(placeholderText).forEach(([id, values]) => {
    const node = document.querySelector(`#${id}`);
    if (node) node.placeholder = state.lang === "zh" ? values[0] : values[1];
  });

  renderInterviewStage();
  renderQuestionRail();
  renderContextBar();
  renderMaterialsSidePanel();
  renderSessionBanner();
  renderAllInsights();
  renderRoundSummary();
  renderHistoryDialog();
  updateStepNavAvailability();

  interviewInsight?.setAttribute("aria-label", localize("面试匹配分析", "Interview Fit Analysis"));
  summaryInsight?.setAttribute("aria-label", localize("面试匹配分析", "Interview Fit Analysis"));
}

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

  updateStepNavAvailability();
}

function bindProviderModels() {
  providerSelect.addEventListener("change", () => {
    bindProviderModelsSync();
    persistEnginePreferences();
  });
}

function getProviderLabel() {
  return providerLabels[providerSelect.value] || localize("所选模型", "Selected model");
}

function getRoundLabel() {
  const labels = {
    "一面": ["一面", "Round 1"],
    "二面": ["二面", "Round 2"],
    "三面": ["三面", "Round 3"],
    "HR 面": ["HR 面", "HR Round"],
  };
  const [zh, en] = labels[state.round] || [state.round, state.round];
  return localize(zh, en);
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

let pdfWorkerReady = null;

function getPdfWorkerUrl() {
  return new URL("./vendor/pdf.worker.min.js", window.location.href).href.split("?")[0];
}

async function ensurePdfWorker() {
  if (!window.pdfjsLib) {
    throw new Error(localize("PDF 解析库未加载完成，请刷新页面后重试。", "PDF parser is still loading. Please refresh and try again."));
  }
  if (pdfWorkerReady) return pdfWorkerReady;

  pdfWorkerReady = (async () => {
    const workerUrl = getPdfWorkerUrl();
    let workerText = "";

    try {
      const response = await fetch(workerUrl);
      if (response.ok) workerText = await response.text();
    } catch {
      // fetch may fail on file:// pages
    }

    if (!workerText) {
      workerText = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", workerUrl, true);
        xhr.onload = () => {
          if (xhr.status === 0 || xhr.status === 200) resolve(xhr.responseText);
          else reject(new Error(`Failed to load PDF worker (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error(localize("无法加载 PDF worker，请通过本地 HTTP 服务打开页面。", "Failed to load PDF worker. Open the page via a local HTTP server.")));
        xhr.send();
      });
    }

    if (!workerText.trim()) {
      throw new Error(localize("PDF worker 文件为空，请确认 ui/vendor/pdf.worker.min.js 存在。", "PDF worker file is empty. Ensure ui/vendor/pdf.worker.min.js exists."));
    }

    const blob = new Blob([workerText], { type: "text/javascript" });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
  })();

  return pdfWorkerReady;
}

async function parsePdfFile(file) {
  await ensurePdfWorker();

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
    throw new Error(localize("Word 解析库未加载完成，请刷新页面后重试。", "Word parser is still loading. Please refresh and try again."));
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
    throw new Error(localize("暂不支持旧版 .doc，请另存为 .docx 或 PDF 后上传。", "Legacy .doc is not supported. Please save it as .docx or PDF."));
  }
  if (file.type.startsWith("image/")) {
    throw new Error(localize("图片 OCR 暂未接入，请先复制图片中的文字或上传 PDF/Word/TXT。", "Image OCR is not connected yet. Please paste the text or upload PDF/Word/TXT."));
  }
  throw new Error(localize("暂不支持该文件类型，请上传 PDF、DOCX、TXT 或 Markdown。", "This file type is not supported. Please upload PDF, DOCX, TXT, or Markdown."));
}

async function handleFileChange(input, meta, targetKey, fileOverride = null) {
  const file = fileOverride || input.files[0];
  if (!file) {
    state.parsedFiles[targetKey] = "";
    meta.textContent = localize("尚未选择文件", "No file selected");
    return;
  }

  if (!fileOverride) {
    meta.textContent = `${file.name} · ${formatFileSize(file)} · ${localize("解析中...", "Parsing...")}`;
  } else {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;
    meta.textContent = `${file.name} · ${formatFileSize(file)} · ${localize("解析中...", "Parsing...")}`;
  }

  try {
    const text = (await parseUpload(file)).trim();
    if (!text) throw new Error(localize("没有解析到可用文本。", "No usable text was extracted."));
    state.parsedFiles[targetKey] = text;
    meta.textContent = `${file.name} · ${formatFileSize(file)} · ${localize(`已解析 ${text.length} 字`, `Parsed ${text.length} characters`)}`;
  } catch (error) {
    state.parsedFiles[targetKey] = "";
    meta.textContent = `${file.name} · ${formatFileSize(file)} · ${error.message}`;
  }
  renderPrepOverview();
}

function bindPrepInputs() {
  [jdLink, jdText, resumeText].forEach((input) => {
    input?.addEventListener("input", renderPrepOverview);
  });
}

function bindDropzone(input, meta, targetKey) {
  const dropzone = input.closest(".dropzone");
  if (!dropzone) return;

  let dragDepth = 0;
  const hint = dropzone.querySelector("span");
  const getDefaultHint = () => localize(
    "支持 PDF、Word、图片、TXT、Markdown · 可拖拽文件到此处",
    "Supports PDF, Word, images, TXT, Markdown · Drag and drop files here",
  );

  const setDragState = (active) => {
    dropzone.classList.toggle("dropzone-dragover", active);
    if (hint) {
      hint.textContent = active
        ? localize("松开以上传文件", "Release to upload")
        : getDefaultHint();
    }
  };

  dropzone.addEventListener("click", (event) => {
    if (event.target === input) return;
    input.click();
  });

  dropzone.addEventListener("dragenter", (event) => {
    event.preventDefault();
    dragDepth += 1;
    setDragState(true);
  });

  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDragState(true);
  });

  dropzone.addEventListener("dragleave", (event) => {
    event.preventDefault();
    dragDepth -= 1;
    if (dragDepth <= 0) {
      dragDepth = 0;
      setDragState(false);
    }
  });

  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dragDepth = 0;
    setDragState(false);
    const file = event.dataTransfer.files[0];
    if (!file) return;
    handleFileChange(input, meta, targetKey, file);
  });
}

function bindFiles() {
  [
    ["#jdFile", "#jdFileMeta", "jd"],
    ["#resumeFile", "#resumeFileMeta", "resume"],
  ].forEach(([inputSelector, metaSelector, targetKey]) => {
    const input = document.querySelector(inputSelector);
    const meta = document.querySelector(metaSelector);

    input.addEventListener("change", () => handleFileChange(input, meta, targetKey));
    bindDropzone(input, meta, targetKey);
  });
}

function setBusy(isBusy, label = "处理中...") {
  generateButton.disabled = isBusy;
  if (isBusy) {
    generateButton.textContent = label;
  } else {
    updatePrimaryActions();
  }
}

function getMaterials() {
  return {
    company: companyInput.value.trim() || localize("目标公司", "target company"),
    role: roleInput.value.trim() || localize("目标岗位", "target role"),
    round: getRoundLabel(),
    jd: jdText.value.trim() || state.parsedFiles.jd || jdLink.value.trim() || localize("未提供完整 JD", "No complete JD provided"),
    resume: resumeText.value.trim() || state.parsedFiles.resume || localize("未提供完整简历", "No complete resume provided"),
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
    return state.lang === "zh" ? [
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
    ] : [
      "Why are you considering this opportunity? What is your real motivation?",
      "What is the core reason for leaving your current or previous role?",
      "How do you think about the tradeoff between career stability and growth speed?",
      "If the compensation is below your expectation, what factors would guide your decision?",
      "What type of person has been hardest for you to work with, and how did you handle it?",
      "What management style helps you perform best? What team environment hurts your performance?",
      "Tell me about a time you did not get the result you wanted. What did you learn?",
      "If you receive multiple offers, how will you compare them?",
      "What is your three-year career plan?",
      "What risks or concerns would you like to discuss with the company upfront?",
    ];
  }

  return state.lang === "zh" ? [
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
  ] : [
    `Please give a two-minute self-introduction using a recent project, and explain why you fit ${company} ${role}.`,
    "What is the most important hard-skill requirement in the JD? Pick one you know well and explain the fundamentals.",
    "Which project on your resume is the most representative? What was the biggest technical or business challenge, and what exactly did you own?",
    "If the interviewer questions your project metrics or impact, how would you prove the result is reliable?",
    `Design a typical system, workflow, or business solution related to ${role}, and explain the key tradeoffs.`,
    "If you discover after joining that one required JD skill is weak, how would you close the gap in 30 days?",
    "Tell me about a cross-functional conflict. How did you drive alignment?",
    `${company}-style teams often value ownership and outcomes. Tell me about a time you proactively filled a gap.`,
    "If this interview allowed you to emphasize only one strength, what would you choose and why?",
    "What questions would you ask the interviewer about team goals, role challenges, and growth opportunities?",
  ];
}

function getQuestionCategory(index) {
  if (index < 4) return localize("专业/基础", "Core Skills");
  if (index < 7) return localize("项目深挖", "Project Deep Dive");
  return localize("行为/收尾", "Behavioral / Wrap-up");
}

function buildLocalFollowup(question, answer, index, previousFollowup = "") {
  const { company, role } = getMaterials();
  const cleanAnswer = answer.trim();
  const category = getQuestionCategory(index);

  if (!cleanAnswer) {
    return localize("请先输入你的回答，再继续追问。我会重点看你的职责边界、关键动作、结果证据和复盘深度。", "Please enter your answer first. I will focus on your ownership, key actions, evidence, and reflection depth.");
  }

  if (cleanAnswer.length < 40) {
    return localize(
      `你的回答还比较短。请继续补充：你具体负责什么、为什么这么做、结果如何量化，以及它和 ${company} ${role} 的要求有什么对应关系？`,
      `Your answer is still brief. Please add what you personally owned, why you chose that approach, how the result was measured, and how it maps to ${company} ${role}.`,
    );
  }

  if (/我们|团队|大家/.test(cleanAnswer) && !/我/.test(cleanAnswer)) {
    return localize("你用了较多团队视角。请切到个人贡献：哪一部分是你独立负责的？关键决策是谁做的？如果没有你，结果会有什么差异？", "You used mostly team-level language. Shift to your personal contribution: what did you own, who made the key decisions, and what would have changed without you?");
  }

  if (!/[0-9一二三四五六七八九十百千万%]/.test(cleanAnswer)) {
    return localize("你的回答缺少结果证据。请补充 1-2 个可验证指标，例如规模、周期、转化率、成本、效率、错误率或业务影响。", "Your answer lacks evidence. Add one or two verifiable metrics such as scale, timeline, conversion, cost, efficiency, error rate, or business impact.");
  }

  if (category === "项目深挖") {
    return previousFollowup
      ? localize("继续追问：你刚才补充的内容里，哪一个判断最容易被数据或事实挑战？如果面试官要求你现场证明，你会拿出什么证据？", "Follow-up: Which claim in your added answer is most vulnerable to a data or fact challenge? What evidence would you provide on the spot?")
      : localize(`继续深挖这个项目：当时最大的约束是什么？你放弃过哪些方案？如果在 ${company} ${role} 的场景重做一次，你会改哪一个关键决策？`, `Let's go deeper: what was the biggest constraint, which options did you reject, and what key decision would you change if you redid it for ${company} ${role}?`);
  }

  if (category === "行为/收尾") {
    return localize("我追问一个行为细节：这个选择背后的真实动机是什么？当时有没有利益冲突或压力？你现在复盘，最想修正的一个动作是什么？", "Behavioral follow-up: what was the real motivation behind that choice, what pressure or conflict existed, and what would you change in hindsight?");
  }

  return localize("请进一步讲清楚底层逻辑：这个结论依赖哪些前提？如果面试官挑战其中一个前提，你会用什么事实或案例支撑？", "Explain the underlying logic: what assumptions does your conclusion rely on, and what facts or examples would support it if challenged?");
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
    if (!match) throw new Error(localize("模型返回内容不是有效 JSON。", "The model response was not valid JSON."));
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
    throw new Error(localize(`模型请求失败：${response.status} ${message}`, `Model request failed: ${response.status} ${message}`));
  }

  return extractChatChoice(await response.json());
}

async function callModel(prompt) {
  const provider = providerSelect.value;
  const config = providerConfig[provider] || {};
  const apiKey = apiKeyInput.value.trim();
  const model = getSelectedModel();
  if (!apiKey) throw new Error(localize("请先填写所选供应商的 API Key。", "Enter the selected provider API key first."));
  if (!model) throw new Error(localize("请先选择或输入模型名。", "Select or enter a model name first."));

  if (config.type === "openai-compatible") {
    const endpoint = config.needsEndpoint ? customEndpointInput.value.trim() : config.endpoint;
    if (!endpoint) throw new Error(localize("请填写 OpenAI-compatible API 地址。", "Enter the OpenAI-compatible API endpoint."));
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
      throw new Error(localize(`Anthropic 请求失败：${response.status} ${message}`, `Anthropic request failed: ${response.status} ${message}`));
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
      throw new Error(localize(`Gemini 请求失败：${response.status} ${message}`, `Gemini request failed: ${response.status} ${message}`));
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
    throw new Error(localize(`OpenAI 请求失败：${response.status} ${message}`, `OpenAI request failed: ${response.status} ${message}`));
  }

  return extractResponseText(await response.json());
}

function buildInterviewPrompt(materials) {
  if (state.lang === "en") {
    return `
You are a strict but constructive mock interviewer. Generate a ready-to-run interview based on the JD and resume.

Company: ${materials.company}
Role: ${materials.role}
Round: ${materials.round}
JD: ${materials.jd}
Resume: ${materials.resume}

Return JSON only, no Markdown. Format:
{
  "matchScore": "78%",
  "duration": "45 min",
  "analysis": ["Strong fit...", "Risk...", "Improvement suggestion..."],
  "questions": ["Question 1", "Question 2", "...10 questions total"]
}
Requirements:
- questions must contain 10 English questions.
- Questions must be tailored to the JD and resume.
- Include at least 4 project deep-dive questions, at least 2 behavioral questions, and 1 final reverse-question preparation item.
`.trim();
  }

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
    state.lang === "zh"
      ? `Q${index + 1}: ${item.question}
主问题回答: ${item.answer || "未回答"}
追问记录:
${(item.followups || []).map((followup, followupIndex) => `- 追问${followupIndex + 1}: ${followup.question}\n  追问回答: ${followup.answer || "未回答"}\n  反馈: ${followup.feedback || "无"}`).join("\n") || "无"}`
      : `Q${index + 1}: ${item.question}
Main answer: ${item.answer || "Not answered"}
Follow-up history:
${(item.followups || []).map((followup, followupIndex) => `- Follow-up ${followupIndex + 1}: ${followup.question}\n  Follow-up answer: ${followup.answer || "Not answered"}\n  Feedback: ${followup.feedback || "None"}`).join("\n") || "None"}`
  )).join("\n\n");
  const latestFollowup = (turn.followups || []).at(-1);

  if (state.lang === "en") {
    return `
You are an English-speaking mock interviewer. Continue probing based on the candidate's answer and provide brief feedback.

Company: ${materials.company}
Role: ${materials.role}
Round: ${materials.round}
JD: ${materials.jd}
Resume: ${materials.resume}

Current question: ${turn.question}
Candidate answer: ${turn.answer}
Previous follow-up: ${latestFollowup ? latestFollowup.question : "None"}
Candidate answer to previous follow-up: ${followupAnswer || "None"}

Transcript:
${transcript || "None"}

Return JSON only, no Markdown. Format:
{
  "followup": "A specific, sharp follow-up question that probes a gap or detail in the answer",
  "feedback": "Feedback under 80 words, with one strength and one improvement point"
}
`.trim();
  }

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

function renderInterviewStage() {
  interviewStage.replaceChildren();

  if (!state.questions.length) {
    interviewStage.innerHTML = `<p class="empty-state">${localize("点击「开始模拟面试」后，这里会展示按公司风格生成的问题。", "Click Start Mock Interview to generate company-style questions here.")}</p>`;
    return;
  }

  const index = state.currentIndex;
  const question = state.questions[index];
  const existingTurn = state.turns[index] || {};
  const followups = existingTurn.followups || [];
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
  meta.textContent = state.engine === "api"
    ? localize(`${getProviderLabel()} 实时生成`, `${getProviderLabel()} live generation`)
    : localize("本地模拟", "Local simulation");
  body.textContent = question;
  answer.id = "currentAnswer";
  answer.className = "answer-input";
  answer.placeholder = localize("像真实面试一样输入你的回答，然后点击生成追问", "Answer as you would in a real interview, then generate a follow-up");
  answer.value = existingTurn.answer || "";
  answer.disabled = state.isLoading;
  actions.className = "question-actions";
  followupButton.type = "button";
  followupButton.id = "followupButton";
  followupButton.textContent = localize("生成追问", "Generate Follow-up");
  followupButton.disabled = state.isLoading;
  followupButton.addEventListener("click", () => handleFollowup(false, followupButton));
  nextButton.type = "button";
  nextButton.id = "nextQuestionButton";
  nextButton.textContent = index === state.questions.length - 1 ? localize("完成本轮", "Finish Round") : localize("下一题", "Next Question");
  nextButton.disabled = state.isLoading;
  nextButton.addEventListener("click", () => {
    if (index === state.questions.length - 1) {
      completeRound(nextButton);
    } else {
      nextQuestion();
    }
  });

  actions.append(followupButton, nextButton);
  card.append(meta, title, body, answer, actions);

  followups.forEach((followupItem, followupIndex) => {
    const followup = document.createElement("div");
    const followupTitle = document.createElement("strong");
    const followupQuestion = document.createElement("p");
    followup.className = "inline-followup";
    followupTitle.textContent = `${localize("追问", "Follow-up")} ${followupIndex + 1}`;
    followupQuestion.textContent = followupItem.question;
    followup.append(followupTitle, followupQuestion);

    if (followupIndex === followups.length - 1) {
      const followupAnswer = document.createElement("textarea");
      const followupActions = document.createElement("div");
      const continueButton = document.createElement("button");
      followupAnswer.id = "currentFollowupAnswer";
      followupAnswer.className = "answer-input";
      followupAnswer.placeholder = localize("输入你对追问的回答，然后点击继续追问", "Answer this follow-up, then continue probing");
      followupAnswer.value = followupItem.answer || "";
      followupAnswer.disabled = state.isLoading;
      followupActions.className = "question-actions";
      continueButton.type = "button";
      continueButton.id = "continueFollowupButton";
      continueButton.textContent = localize("继续追问", "Continue Follow-up");
      continueButton.disabled = state.isLoading;
      continueButton.addEventListener("click", () => handleFollowup(true, continueButton));
      followupActions.append(continueButton);
      followup.append(followupAnswer, followupActions);
    } else if (followupItem.answer) {
      const answered = document.createElement("p");
      answered.textContent = `${localize("回答：", "Answer: ")}${followupItem.answer}`;
      followup.append(answered);
    }

    if (followupItem.feedback) {
      const feedback = document.createElement("p");
      feedback.textContent = `${localize("反馈：", "Feedback: ")}${followupItem.feedback}`;
      followup.append(feedback);
    }
    card.append(followup);
  });

  interviewStage.append(card);
  if (interviewState) {
    interviewState.textContent = localize(`第 ${index + 1} 题`, `Question ${index + 1}`);
  }
}

function renderQuestionRail() {
  if (!questionNavList) return;
  questionNavList.replaceChildren();

  if (!state.questions.length) {
    if (railProgressCount) railProgressCount.textContent = "0/0";
    return;
  }

  const progress = getSessionProgress();
  if (railProgressLabel) railProgressLabel.textContent = localize("题目进度", "Progress");
  if (railProgressCount) railProgressCount.textContent = `${state.currentIndex + 1}/${state.questions.length}`;

  state.questions.forEach((question, index) => {
    const turn = state.turns[index] || { question, answer: "", followups: [] };
    const status = deriveTurnStatus(turn);
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = `question-nav-item${index === state.currentIndex ? " current" : ""}`;
    button.title = question;
    button.innerHTML = `
      <span class="question-nav-status ${status}">${getTurnStatusIcon(status)}</span>
      <span class="question-nav-body">
        <strong>Q${index + 1}</strong>
        <span class="question-nav-preview">${truncatePreview(question)}</span>
      </span>
    `;
    button.addEventListener("click", () => navigateToQuestion(index));
    item.append(button);
    questionNavList.append(item);
  });
}

function navigateToQuestion(index) {
  if (state.isLoading || index === state.currentIndex) return;
  saveCurrentTurn();
  saveCurrentFollowupAnswer();
  state.currentIndex = index;
  outputState.textContent = localize(`第 ${index + 1} 题`, `Question ${index + 1}`);
  renderInterviewStage();
  renderQuestionRail();
  updatePrimaryActions();
  renderSessionBanner();
  persistSession();
}

function saveCurrentTurn(patch = {}) {
  if (!state.questions.length) return;
  const question = state.questions[state.currentIndex];
  const answerNode = document.querySelector("#currentAnswer");
  const existing = state.turns[state.currentIndex] || {};
  const turn = {
    question,
    answer: answerNode ? answerNode.value.trim() : existing.answer || "",
    followups: existing.followups || [],
    ...patch,
  };
  turn.status = deriveTurnStatus(turn);
  turn.updatedAt = new Date().toISOString();
  state.turns[state.currentIndex] = turn;
  persistSession();
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

function buildRoundSummaryPrompt() {
  const materials = getMaterials();
  const transcript = state.turns.map((item, index) => (
    state.lang === "zh"
      ? `Q${index + 1}: ${item.question}
回答: ${item.answer || "未回答"}
追问:
${(item.followups || []).map((followup, followupIndex) => `- 追问${followupIndex + 1}: ${followup.question}\n  回答: ${followup.answer || "未回答"}\n  反馈: ${followup.feedback || "无"}`).join("\n") || "无"}`
      : `Q${index + 1}: ${item.question}
Answer: ${item.answer || "Not answered"}
Follow-ups:
${(item.followups || []).map((followup, followupIndex) => `- Follow-up ${followupIndex + 1}: ${followup.question}\n  Answer: ${followup.answer || "Not answered"}\n  Feedback: ${followup.feedback || "None"}`).join("\n") || "None"}`
  )).join("\n\n");

  if (state.lang === "en") {
    return `
You are an interview coach. Review this mock interview round and return JSON only.

Company: ${materials.company}
Role: ${materials.role}
Round: ${materials.round}

Transcript:
${transcript}

Format:
{
  "overall": "Overall review under 120 words",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "strongestQuestion": "Q number and why",
  "weakestQuestion": "Q number and why"
}
`.trim();
  }

  return `
你是一位面试教练。请复盘本轮模拟面试，只返回 JSON。

目标公司：${materials.company}
目标岗位：${materials.role}
面试轮次：${materials.round}

完整记录：
${transcript}

格式：
{
  "overall": "不超过120字的整体评价",
  "strengths": ["优点1", "优点2"],
  "improvements": ["改进建议1", "改进建议2"],
  "strongestQuestion": "最强的一题及原因",
  "weakestQuestion": "最弱的一题及原因"
}
`.trim();
}

function buildLocalRoundSummary() {
  const progress = getSessionProgress();
  const followupCount = state.turns.reduce((sum, turn) => sum + (turn.followups || []).length, 0);
  const answeredTurns = state.turns.filter((turn) => turn.answer && turn.answer.trim());
  const longest = answeredTurns.reduce((best, turn, index) => {
    if (!best || (turn.answer || "").length > (best.turn.answer || "").length) {
      return { index, turn };
    }
    return best;
  }, null);
  const shortest = answeredTurns.reduce((worst, turn, index) => {
    if (!worst || (turn.answer || "").length < (worst.turn.answer || "").length) {
      return { index, turn };
    }
    return worst;
  }, null);

  return {
    overall: localize(
      `本轮共完成 ${progress.answered}/${progress.total} 题，生成 ${followupCount} 条追问。建议重点复盘回答偏短或未量化结果的题目，并补充个人贡献与结果证据。`,
      `You completed ${progress.answered}/${progress.total} questions with ${followupCount} follow-ups. Review answers that were brief or lacked metrics, and add clearer ownership and evidence.`,
    ),
    strengths: [
      longest
        ? localize(`Q${longest.index + 1} 回答较完整，可继续打磨表达结构。`, `Q${longest.index + 1} was the most complete answer and is a good template.`)
        : localize("已开始建立面试回答结构。", "You started building an interview answer structure."),
      followupCount
        ? localize("已进行追问演练，有助于提升抗压表达。", "Follow-up practice helps you handle pressure and probing questions.")
        : localize("建议对关键题目继续生成追问。", "Generate follow-ups for key questions."),
    ],
    improvements: [
      localize("为每个项目回答补充量化指标与个人职责边界。", "Add metrics and personal ownership boundaries to project answers."),
      localize("对最弱题目重新组织「背景-动作-结果-复盘」结构。", "Restructure weaker answers with context-action-result-reflection."),
    ],
    strongestQuestion: longest ? `Q${longest.index + 1}` : "-",
    weakestQuestion: shortest ? `Q${shortest.index + 1}` : "-",
  };
}

function renderRoundSummary() {
  if (!roundSummaryEl || state.phase !== "summary" || !state.roundSummary) {
    if (roundSummaryEl) roundSummaryEl.replaceChildren();
    return;
  }

  const summary = state.roundSummary;
  const progress = getSessionProgress();
  const followupCount = state.turns.reduce((sum, turn) => sum + (turn.followups || []).length, 0);
  roundSummaryEl.replaceChildren();

  const grid = document.createElement("div");
  grid.className = "round-summary-grid";

  const heading = document.createElement("h2");
  heading.textContent = localize("本轮总结", "Round Summary");
  grid.append(heading);

  const stats = document.createElement("div");
  stats.className = "summary-stats";
  [
    [localize("答题完成度", "Completion"), `${progress.answered}/${progress.total}`],
    [localize("追问深度", "Follow-ups"), String(followupCount)],
    [localize("JD 匹配度", "JD Match"), localizeStoredString(state.resultMeta.matchScore || "--")],
    [localize("预计时长", "Duration"), state.resultMeta.duration || "--"],
  ].forEach(([label, value]) => {
    const stat = document.createElement("div");
    stat.className = "summary-stat";
    stat.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    stats.append(stat);
  });
  grid.append(stats);

  const review = document.createElement("section");
  review.className = "summary-block";
  review.innerHTML = `<h3>${localize("整体评价", "Overall Review")}</h3><p>${summary.overall || ""}</p>`;
  grid.append(review);

  if (summary.strengths?.length || summary.improvements?.length) {
    const detail = document.createElement("section");
    detail.className = "summary-block";
    detail.innerHTML = `<h3>${localize("改进建议", "Improvement Tips")}</h3>`;
    const list = document.createElement("ul");
    [...(summary.strengths || []).map((item) => `${localize("最强回答", "Strongest Answer")}: ${item}`), ...(summary.improvements || []).map((item) => `${localize("待改进", "Needs Improvement")}: ${item}`)].forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.append(li);
    });
    detail.append(list);
    if (summary.strongestQuestion || summary.weakestQuestion) {
      const extra = document.createElement("p");
      extra.textContent = `${localize("最强回答", "Strongest Answer")}: ${summary.strongestQuestion || "-"} · ${localize("待改进", "Needs Improvement")}: ${summary.weakestQuestion || "-"}`;
      detail.append(extra);
    }
    grid.append(detail);
  }

  const turnsBlock = document.createElement("section");
  turnsBlock.className = "summary-block";
  turnsBlock.innerHTML = `<h3>${localize("逐题摘要", "Question Summary")}</h3>`;
  const turnList = document.createElement("div");
  turnList.className = "summary-turn-list";
  state.turns.forEach((turn, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "summary-turn-item";
    item.innerHTML = `<strong>Q${index + 1}</strong><p>${turn.question}</p><p>${turn.answer ? turn.answer.slice(0, 120) : localize("未填写", "Not filled")}</p>`;
    item.addEventListener("click", () => {
      state.phase = "interview";
      navigateToQuestion(index);
      setWorkspaceMode("interview");
    });
    turnList.append(item);
  });
  turnsBlock.append(turnList);
  grid.append(turnsBlock);

  const actions = document.createElement("div");
  actions.className = "summary-actions";
  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "secondary-action";
  backBtn.textContent = localize("返回修改", "Back to Edit");
  backBtn.addEventListener("click", () => setWorkspaceMode("interview"));
  const exportBtn = document.createElement("button");
  exportBtn.type = "button";
  exportBtn.className = "secondary-action";
  exportBtn.textContent = localize("导出 Markdown", "Export Markdown");
  exportBtn.addEventListener("click", exportSessionMarkdown);
  const newBtn = document.createElement("button");
  newBtn.type = "button";
  newBtn.className = "primary-action";
  newBtn.style.width = "auto";
  newBtn.textContent = localize("开始新一轮", "Start New Round");
  newBtn.addEventListener("click", () => resetAll(true));
  actions.append(backBtn, exportBtn, newBtn);
  grid.append(actions);

  roundSummaryEl.append(grid);
  renderAllInsights();
}

async function completeRound(button) {
  if (!state.questions.length || state.isLoading) return;
  saveCurrentTurn();
  saveCurrentFollowupAnswer();

  await withLoading(button, async () => {
    outputState.textContent = localize("生成复盘中...", "Generating review...");
    try {
      if (apiKeyInput.value.trim()) {
        const text = await callModel(buildRoundSummaryPrompt());
        state.roundSummary = parseJsonText(text);
        state.engine = "api";
      } else {
        state.roundSummary = buildLocalRoundSummary();
        state.engine = "local";
      }
    } catch (error) {
      state.roundSummary = buildLocalRoundSummary();
      state.roundSummary.overall = `${state.roundSummary.overall} ${localize("（API 复盘失败，已使用本地总结）", "(API review failed, local summary used)")} ${error.message}`;
    }

    state.phase = "summary";
    outputState.textContent = localize("本轮完成", "Round complete");
    setProgressStep("followup");
    setWorkspaceMode("summary");
    persistSession();
  }, {
    loading: localize("生成复盘中...", "Generating review..."),
    default: localize("完成本轮", "Finish Round"),
  });
}

async function handleFollowup(fromFollowupAnswer = false, button = null) {
  if (!state.questions.length || state.isLoading) return;

  const activeButton = button || document.querySelector(fromFollowupAnswer ? "#continueFollowupButton" : "#followupButton");
  const labels = fromFollowupAnswer
    ? { loading: localize("继续追问中...", "Continuing follow-up..."), default: localize("继续追问", "Continue Follow-up") }
    : { loading: localize("生成追问中...", "Generating follow-up..."), default: localize("生成追问", "Generate Follow-up") };

  await withLoading(activeButton, async () => {
    saveCurrentTurn();
    const turn = state.turns[state.currentIndex];
    const followupAnswer = fromFollowupAnswer ? saveCurrentFollowupAnswer() : "";
    outputState.textContent = labels.loading;
    setProgressStep("followup");

    try {
      if (apiKeyInput.value.trim()) {
        const text = await callModel(buildFollowupPrompt(turn, followupAnswer));
        const result = parseJsonText(text);
        turn.followups = turn.followups || [];
        turn.followups.push({
          question: result.followup || localize("请继续补充关键细节。", "Please add more key details."),
          answer: "",
          feedback: result.feedback || "",
        });
        state.engine = "api";
      } else {
        turn.followups = turn.followups || [];
        turn.followups.push({
          question: buildLocalFollowup(turn.question, fromFollowupAnswer ? followupAnswer : turn.answer, state.currentIndex, fromFollowupAnswer ? turn.followups.at(-1)?.question : ""),
          answer: "",
          feedback: localize("本地模拟反馈：建议补充量化结果、个人贡献和复盘。", "Local feedback: add metrics, personal contribution, and reflection."),
        });
        state.engine = "local";
      }
      turn.status = deriveTurnStatus(turn);
      outputState.textContent = localize("已生成追问", "Follow-up generated");
    } catch (error) {
      turn.followups = turn.followups || [];
      turn.followups.push({
        question: buildLocalFollowup(turn.question, fromFollowupAnswer ? followupAnswer : turn.answer, state.currentIndex, fromFollowupAnswer ? turn.followups.at(-1)?.question : ""),
        answer: "",
        feedback: `${localize("API 调用失败，已使用本地模拟。", "API call failed. Used local simulation. ")}${error.message}`,
      });
      turn.status = deriveTurnStatus(turn);
      outputState.textContent = localize("API 失败，已兜底", "API failed, fallback used");
    }

    renderInterviewStage();
    renderQuestionRail();
    persistSession();
  }, labels);
}

function nextQuestion() {
  if (!state.questions.length || state.isLoading) return;
  saveCurrentTurn();
  saveCurrentFollowupAnswer();
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex += 1;
    outputState.textContent = localize(`第 ${state.currentIndex + 1} 题`, `Question ${state.currentIndex + 1}`);
    setProgressStep("interview");
  }
  renderInterviewStage();
  renderQuestionRail();
  persistSession();
}

async function renderResult() {
  const hasProgress = state.turns.some((turn) => turn.answer?.trim());
  if (hasProgress && !(await confirmRegenerate())) return;

  const materialLevel = getMaterialLevel();
  const materials = getMaterials();
  state.currentIndex = 0;
  state.turns = [];
  state.roundSummary = null;
  state.questions = [];
  createSession();
  setBusy(true, localize("生成中...", "Generating..."));
  materialsMetricGrid?.classList.add("skeleton");
  outputState.textContent = apiKeyInput.value.trim() ? localize(`调用 ${getProviderLabel()} 中`, `Calling ${getProviderLabel()}`) : localize("生成本地模拟", "Generating local simulation");
  setProgressStep("interview");

  try {
    if (apiKeyInput.value.trim()) {
      const text = await callModel(buildInterviewPrompt(materials));
      const result = parseJsonText(text);
      state.questions = Array.isArray(result.questions) && result.questions.length
        ? result.questions.slice(0, 10)
        : buildLocalQuestions(materials.company, materials.role);
      state.engine = "api";
      const analysis = Array.isArray(result.analysis) ? result.analysis : [localize("已基于 JD 和简历生成定制面试问题。", "Custom interview questions were generated from the JD and resume.")];
      setResultMeta({
        matchScore: result.matchScore || localize("已分析", "Analyzed"),
        duration: result.duration || (state.round === "HR 面" ? "25 min" : "45 min"),
        analysis,
      });
    } else {
      state.questions = buildLocalQuestions(materials.company, materials.role);
      state.engine = "local";
      const analysis = [
        localize("未填写 API Key，当前使用本地模拟问题。", "No API key provided. Using local simulated questions."),
        localize("填写所选供应商 API Key 后，会基于 JD、简历和回答实时生成问题与追问。", "After entering the selected provider API key, questions and follow-ups are generated live from the JD, resume, and answers."),
        localize("建议提供完整 JD 和简历文本，以获得更贴近目标岗位的模拟面试。", "Provide a complete JD and resume for a more targeted mock interview."),
      ];
      setResultMeta({
        matchScore: materialLevel === "complete" ? "86%" : materialLevel === "partial" ? "62%" : localize("待补充", "Pending"),
        duration: state.round === "HR 面" ? "25 min" : "45 min",
        analysis,
      });
    }
    outputState.textContent = state.engine === "api" ? localize(`${getProviderLabel()} 已生成`, `${getProviderLabel()} generated`) : localize("本地模拟已生成", "Local simulation generated");
    setWorkspaceMode("interview");
  } catch (error) {
    state.questions = buildLocalQuestions(materials.company, materials.role);
    state.engine = "local";
    outputState.textContent = localize("API 失败，已兜底", "API failed, fallback used");
    const analysis = [
      localize(`${getProviderLabel()} API 调用失败，已切换到本地模拟。`, `${getProviderLabel()} API failed. Switched to local simulation.`),
      error.message,
      localize("请检查 API Key、模型名称、账户额度和浏览器网络限制。", "Check your API key, model name, account quota, and browser/network restrictions."),
    ];
    setResultMeta({
      matchScore: localize("待补充", "Pending"),
      duration: state.round === "HR 面" ? "25 min" : "45 min",
      analysis,
    });
    setWorkspaceMode("interview");
  } finally {
    materialsMetricGrid?.classList.remove("skeleton");
    renderMaterialsSidePanel();
    renderInterviewStage();
    renderQuestionRail();
    await persistSessionImmediate();
    setBusy(false);
  }
}

function resetAll(clearSession = true) {
  if (clearSession && state.sessionId) {
    InterviewStorage.setActiveSessionId(null);
  }
  jdLink.value = "";
  jdText.value = "";
  resumeText.value = "";
  document.querySelector("#jdFile").value = "";
  document.querySelector("#resumeFile").value = "";
  document.querySelector("#jdFileMeta").textContent = localize("尚未选择文件", "No file selected");
  document.querySelector("#resumeFileMeta").textContent = localize("尚未选择文件", "No file selected");
  state.parsedFiles.jd = "";
  state.parsedFiles.resume = "";
  outputState.textContent = localize("等待输入", "Waiting");
  setProgressStep("materials");
  state.questions = [];
  state.currentIndex = 0;
  state.turns = [];
  state.engine = "local";
  state.sessionId = clearSession ? null : state.sessionId;
  state.roundSummary = null;
  setResultMeta({ matchScore: "--", duration: "--", analysis: getDefaultAnalysisItems() });
  setWorkspaceMode("materials");
  renderSessionBanner();
  hideRestoreBanner();
  if (historyDialog.open) historyDialog.close();
}

bindTabs();
bindSegmented();
bindFiles();
bindPrepInputs();
bindEnginePreferenceInputs();
bindProviderModels();
bindStepNavigation();
bindDrawerTabs();
languageToggle.addEventListener("click", () => {
  applyLanguage(state.lang === "zh" ? "en" : "zh");
});
historyToggle.addEventListener("click", () => {
  renderHistoryDialog();
  historyDialog.showModal();
});
historyDialogClose.addEventListener("click", () => historyDialog.close());
newSessionBtn.addEventListener("click", () => {
  resetAll(true);
  historyDialog.close();
});
editMaterialsBtn?.addEventListener("click", () => navigateWorkspace("materials"));
openMaterialsDrawerBtn?.addEventListener("click", openMaterialsDrawer);
drawerEditMaterialsBtn?.addEventListener("click", () => {
  closeMaterialsDrawer();
  navigateWorkspace("materials");
});
materialsDrawerClose?.addEventListener("click", closeMaterialsDrawer);
materialsDrawer?.addEventListener("click", (event) => {
  if (event.target === materialsDrawer) closeMaterialsDrawer();
});
sessionBannerBtn?.addEventListener("click", () => navigateWorkspace("interview"));
enterInterviewBtn?.addEventListener("click", () => navigateWorkspace("interview"));
regenerateBtn?.addEventListener("click", () => renderResult());
generateButton.addEventListener("click", () => {
  if (state.questions.length && workspace.dataset.mode === "materials") {
    navigateWorkspace("interview");
    return;
  }
  renderResult();
});
restoreBannerBtn.addEventListener("click", async () => {
  const sessionId = restoreBanner.dataset.sessionId;
  if (sessionId) {
    const restored = await restoreSession(sessionId);
    if (!restored) {
      outputState.textContent = localize("会话恢复失败，请从历史记录重试。", "Failed to restore session. Try again from history.");
      return;
    }
  }
  hideRestoreBanner();
});
restoreBannerDismiss.addEventListener("click", hideRestoreBanner);
historyDialog.addEventListener("click", (event) => {
  if (event.target === historyDialog) historyDialog.close();
});
document.querySelector("#resetButton").addEventListener("click", () => resetAll(true));

async function bootstrap() {
  await loadEnginePreferencesOnInit();
  applyLanguage(state.lang);
  setProgressStep("materials");
  setResultMeta({ matchScore: "--", duration: "--", analysis: getDefaultAnalysisItems() });
  renderMaterialsSidePanel();
  renderPrepOverview();
  updateStepNavAvailability();
  setWorkspaceMode("materials");
  await initRestoreFlow();
}

bootstrap();
