const state = {
  round: "一面",
};

const companyInput = document.querySelector("#companyInput");
const roleInput = document.querySelector("#roleInput");
const jdLink = document.querySelector("#jdLink");
const jdText = document.querySelector("#jdText");
const resumeText = document.querySelector("#resumeText");
const outputState = document.querySelector("#outputState");
const matchScore = document.querySelector("#matchScore");
const questionCount = document.querySelector("#questionCount");
const duration = document.querySelector("#duration");
const analysisList = document.querySelector("#analysisList");
const questionList = document.querySelector("#questionList");
const followupBox = document.querySelector("#followupBox");

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

function getMaterialLevel() {
  const jdHasContent = jdLink.value.trim() || jdText.value.trim() || document.querySelector("#jdFile").files.length;
  const resumeHasContent = resumeText.value.trim() || document.querySelector("#resumeFile").files.length;

  if (jdHasContent && resumeHasContent) return "complete";
  if (jdHasContent || resumeHasContent) return "partial";
  return "empty";
}

function buildQuestions(company, role) {
  const targetCompany = company || "目标公司";
  const targetRole = role || "目标岗位";
  const base = [
    `请结合最近一个项目做 2 分钟自我介绍，并说明为什么匹配 ${targetCompany} ${targetRole}。`,
    `JD 中最核心的硬技能要求是什么？请选一个你最熟的点讲到底层原理。`,
    `你简历里最有代表性的项目，最大技术或业务挑战是什么？你具体负责哪一部分？`,
    `如果面试官质疑你的项目数据或影响力，你会如何证明结果真实可靠？`,
    `请设计一个和 ${targetRole} 相关的典型系统或业务方案，并说明关键权衡。`,
    `如果入职后发现 JD 里有一项能力你并不熟，你会如何在 30 天内补齐？`,
    `讲一次跨团队协作中的冲突，你如何推动对方达成一致？`,
    `${targetCompany} 这类公司通常重视结果和 owner 意识，请讲一个你主动补位的案例。`,
    `如果本轮面试只让你强调一个优势，你会选择哪一个？为什么？`,
    `你有什么想反问面试官的问题？请围绕团队目标、岗位挑战和成长空间组织。`,
  ];

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

  return base;
}

function renderResult() {
  const materialLevel = getMaterialLevel();
  const company = companyInput.value.trim();
  const role = roleInput.value.trim();
  const questions = buildQuestions(company, role);

  outputState.textContent = "已生成原型结果";
  matchScore.textContent = materialLevel === "complete" ? "86%" : materialLevel === "partial" ? "62%" : "待补充";
  questionCount.textContent = "10";
  duration.textContent = state.round === "HR 面" ? "25 min" : "45 min";

  const analysis = {
    complete: [
      "强匹配：已同时提供 JD 和简历，可基于岗位要求与个人经历做双向锚定。",
      "需补强：建议补充项目量化指标，例如 QPS、DAU、转化率、成本下降比例。",
      "简历弱点：若某些 JD 必备技能没有案例支撑，面试官会优先追问真实参与度。",
    ],
    partial: [
      "当前材料不完整，已按已有内容生成问题，但个性化程度有限。",
      "建议补齐 JD 和简历两类信息，才能输出强匹配、需补强和简历弱点。",
      "缺失简历时，问题会按理想候选人画像生成，难度可能偏离本人背景。",
    ],
    empty: [
      "请先提供 JD 或简历内容。",
      "最小可用输入是目标公司、岗位名称和一段 JD 文本。",
      "上传 PDF、Word 或图片后，后续可接入解析服务生成结构化素材。",
    ],
  }[materialLevel];

  analysisList.innerHTML = analysis.map((item) => `<li>${item}</li>`).join("");
  questionList.replaceChildren();
  questions.forEach((question, index) => {
    const item = document.createElement("article");
    const title = document.createElement("strong");
    const body = document.createElement("span");

    item.className = "question-item";
    title.textContent = `Q${index + 1} · ${index < 4 ? "专业/基础" : index < 7 ? "项目深挖" : "行为/收尾"}`;
    body.textContent = question;

    item.append(title, body);
    questionList.append(item);
  });

  followupBox.textContent = document.querySelector("#modeFollowup").checked
    ? "示例追问：你刚才提到自己负责核心模块，请具体说明边界、关键决策、失败方案和可量化结果。"
    : "已关闭自动追问，可在真实产品中改为手动点击「继续追问」。";
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
  questionList.innerHTML = '<p class="empty-state">点击「开始模拟面试」后，这里会展示按公司风格生成的问题。</p>';
  followupBox.textContent = "回答任意问题后，AI 面试官会基于你的回答继续深挖。";
}

bindTabs();
bindSegmented();
bindFiles();
document.querySelector("#generateButton").addEventListener("click", renderResult);
document.querySelector("#resetButton").addEventListener("click", resetAll);
