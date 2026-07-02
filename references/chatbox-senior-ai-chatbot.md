# Chatbox Senior AI Chatbot / LLM App Interview Case

> Use this case when the candidate is preparing for senior backend, AI
> application engineer, LLM platform engineer, solution architect, or full-stack
> product engineer interviews. The project focus is not "a generic ChatGPT
> wrapper"; it is a production-style customer support and operations chatbot.

## 1. Project Summary

Chatbox is an MDM operations assistant for customer support and IT operations.
It helps authenticated customers ask real-time device-status questions and
support-document questions through one chat interface.

The system has two controlled tracks:

- **NL-to-SQL track**: answers real-time operational questions over
  tenant-scoped device data.
- **Doc-RAG track**: answers product-support and runbook questions from a
  knowledge base with visibility and clearance filtering.

The senior-level interview framing:

> I built this as a controlled operational assistant, not an open-ended chatbot.
> The difficult parts were tenant isolation, current-status accuracy,
> prompt-injection resistance, PII control, same-session memory, RAG grounding,
> observability, and deployment gates.

## 2. Online Interview Pattern Scan / 網路面試題型掃描

This project drill is based on both our local project evidence and online
interview patterns for chatbot, RAG, LLM app, and AI system design interviews.

| Online pattern / 網路常見題型 | What interviewers ask / 面試官會問 | How it maps to Chatbox / 對應到我們專案 |
|---|---|---|
| Chatbot system design | EN: Design an AI chatbot or ChatGPT-like conversational system. CN: 設計一個 AI chatbot / 類 ChatGPT 對話系統。 | Architecture, conversation state, latency, security, scalability, and failure handling. / 架構、對話狀態、延遲、安全、擴展、失敗處理。 |
| RAG chatbot | EN: Build a RAG chatbot over company documents. CN: 用公司文件建 RAG chatbot。 | Doc-RAG retrieval, citations, no-context behavior, KB indexing, clearance filtering. / Doc-RAG 檢索、引用、no-context、KB indexing、權限過濾。 |
| RAG evaluation | EN: How do you measure accuracy or quality for RAG/agent outputs? CN: RAG/agent 輸出怎麼算準確或品質？ | Clearance probes, recall@k, MRR, nDCG, faithfulness, trace-to-dataset loop. / clearance probes、recall@k、MRR、nDCG、faithfulness、trace-to-dataset。 |
| Sensitive data | EN: If data is sensitive, how do you secure the RAG pipeline? CN: 如果資料敏感，RAG pipeline 怎麼保護？ | Tenant scoping, RLS, PII column blocks, trace redaction, auth-derived principal. / tenant scoping、RLS、PII 欄位阻擋、trace 脫敏、auth principal。 |
| Prompt injection | EN: What is direct vs indirect prompt injection, and how do you guard it? CN: 直接/間接 prompt injection 是什麼？怎麼防？ | User input guard, chunk safety, untrusted retrieved context, deterministic SQL/PII policy. / input guard、chunk safety、不信 retrieved context、deterministic SQL/PII policy。 |
| Multi-turn state | EN: How do you maintain conversation memory? CN: 如何維持多輪對話記憶？ | Same-session memory only, scoped history, no long-term memory by default. / 同一 session 記憶、scoped history、預設不做長期記憶。 |
| Scale and latency | EN: Can this support real users under latency/cost limits? CN: 可以支援真實使用者並控制延遲/成本嗎？ | Intent routing, short-circuiting, rate limits, DB timeout, cache, p95/p99 monitoring. / intent routing、提前拒答、rate limit、DB timeout、cache、p95/p99。 |
| Production deployment | EN: How do you deploy and operate it? CN: 如何部署與維運？ | Jenkins pipeline, Docker image, ECR/ECS or AWS runtime, health checks, rollback. / Jenkins、Docker image、ECR/ECS 或 AWS runtime、health checks、rollback。 |

Useful public references for this pattern scan:

- Educative's chatbot system design guide highlights NLU, retrieval/grounding,
  dialogue/session state, LLM orchestration, safety, real-time performance,
  scalability, observability, and feedback loops.
- Exponent and Hello Interview both frame "Design ChatGPT" as a system design
  question involving conversation storage, latency, security, and scale.
- Real interview reports on Reddit mention being asked how to evaluate RAG or
  agent accuracy and how to secure sensitive-data pipelines.
- RAG interview guides commonly ask about retrieval quality, chunking,
  embeddings/vector DBs, reranking, hallucination, and production RAG systems.
- AI engineering interview collections commonly ask about hallucinations,
  direct/indirect prompt injection, guardrails, PII, privacy, and adversarial
  attacks.

## 3. JD-Derived AI Application Engineer Competency Map / 從 JD 反推考點

This section maps current AI Application Engineer / GenAI Engineer job
descriptions to likely interview topics. Use it when asked, "How does this
project match the role?"

| JD requirement / JD 常見要求 | Likely interview topic / 可能被問 | Chatbox answer anchor / Chatbox 對應回答 |
|---|---|---|
| User-facing AI products / 使用者面向 AI 產品 | EN: How did you turn AI capability into a real product feature? CN: 你怎麼把 AI 能力做成真實產品功能？ | EN: Chatbox turns device-status SQL and support-doc RAG into a customer-facing assistant with scoped session memory and safe fallbacks. CN: Chatbox 把設備狀態 SQL 與 support-doc RAG 做成客戶可用助理，包含 session memory 與安全 fallback。 |
| Backend APIs and microservices / Backend API 與微服務 | EN: How is the AI app integrated with backend services? CN: AI app 如何和 backend service 整合？ | EN: Flask API, auth principal, dispatcher, SQL path, Doc-RAG path, trace/history stores, and deployment gates. CN: Flask API、auth principal、dispatcher、SQL path、Doc-RAG path、trace/history stores 與部署 gate。 |
| RAG and vector databases / RAG 與向量資料庫 | EN: How do you design retrieval and vector search? CN: 你怎麼設計 retrieval 和 vector search？ | EN: pgvector retrieval, indexed KB chunks, clearance filters, golden retrieval eval, recall/MRR/nDCG. CN: pgvector retrieval、indexed KB chunks、clearance filters、golden retrieval eval、recall/MRR/nDCG。 |
| Data ingestion and chunking / 資料匯入與切 chunk | EN: How do you prepare enterprise docs for RAG? CN: 企業文件怎麼整理給 RAG 用？ | EN: Ingest docs with metadata, classify visibility, screen chunks for injection, index with retrieval tests. CN: 匯入文件與 metadata、分類 visibility、掃描 chunk injection、index 後用 retrieval tests 驗證。 |
| Prompt and context engineering / Prompt 與 context engineering | EN: How do you make LLM outputs reliable? CN: 你怎麼讓 LLM 輸出可靠？ | EN: Separate system instructions from untrusted context, route intent first, validate outputs, and return no-context when evidence is insufficient. CN: 區分 system instruction 與不可信 context，先 routing，再 validation，不足證據就 no-context。 |
| Evaluation pipelines / 評估管線 | EN: How do you define correctness for an AI app? CN: AI app 的 correctness 怎麼定義？ | EN: Use task-specific evals: SQL safety 10/10, execution accuracy 28/28, Doc-RAG clearance 6/6, retrieval MRR 1.000. CN: 用 task-specific evals：SQL safety 10/10、execution accuracy 28/28、Doc-RAG clearance 6/6、retrieval MRR 1.000。 |
| LLM-as-judge and trace mining / LLM-as-judge 與 trace mining | EN: How do traces improve the system? CN: trace 如何改善系統？ | EN: Record route, retrieved chunks, SQL/result preview, guard decisions, latency, and feedback; convert failures into regression datasets. CN: 記錄 route、retrieved chunks、SQL/result preview、guard decisions、latency、feedback，把失敗轉 regression dataset。 |
| Guardrails and responsible AI / Guardrails 與 responsible AI | EN: How do you prevent unsafe or non-compliant outputs? CN: 如何避免不安全或不合規輸出？ | EN: Prompt-injection guard, chunk safety, SQL read-only validation, PII redaction, tenant isolation, safe fallback. CN: prompt-injection guard、chunk safety、SQL read-only validation、PII redaction、tenant isolation、safe fallback。 |
| Cloud deployment and DevOps / 雲端部署與 DevOps | EN: How would you ship this to production? CN: 你怎麼把它推到 production？ | EN: Jenkins runs lint/security/tests, builds Docker image, pushes to ECR, deploys AWS runtime, runs health checks, and rolls back on failure. CN: Jenkins 跑 lint/security/tests、build Docker image、push ECR、deploy AWS runtime、health checks、失敗 rollback。 |
| Observability, SLOs, and incident response / 可觀測性、SLO、事故處理 | EN: What do you monitor after launch? CN: 上線後你監控什麼？ | EN: p95/p99 latency, fallback rate, no-context rate, retrieval miss rate, PII blocks, prompt-injection blocks, tenant denials, cost, errors. CN: p95/p99 latency、fallback rate、no-context rate、retrieval miss rate、PII blocks、prompt-injection blocks、tenant denials、cost、errors。 |
| Latency and cost optimization / 延遲與成本優化 | EN: How do you keep the app fast and affordable? CN: 怎麼讓 AI app 又快又省？ | EN: Intent routing, short-circuit refusals, deterministic guards, caching, DB timeouts, result limits, model/provider tiering. CN: intent routing、提前拒答、deterministic guards、cache、DB timeouts、result limits、model/provider tiering。 |
| Agent/tool orchestration / Agent 與工具編排 | EN: Would you let the bot take actions? CN: 你會讓 bot 執行動作嗎？ | EN: Read-only by default. Any high-risk action needs tool permission, parameter validation, audit trail, and human approval. CN: 預設 read-only；高風險動作需要 tool permission、parameter validation、audit trail、人工確認。 |
| Enterprise security and governance / 企業安全與治理 | EN: How do you handle enterprise data boundaries? CN: 你怎麼處理企業資料邊界？ | EN: Auth-derived principal, company/user/session scoping, RLS, clearance filters, redacted traces, no secrets in git. CN: auth-derived principal、company/user/session scope、RLS、clearance filters、redacted traces、secrets 不進 git。 |
| Customer/product collaboration / 客戶與產品協作 | EN: How did you decide what the chatbot should answer? CN: 你怎麼決定 chatbot 該回答什麼？ | EN: Align scope to real customer support workflows: device status, support docs, internal runbooks, and explicit refusal boundaries. CN: 對齊真實客服流程：設備狀態、support docs、internal runbooks，以及明確 refusal boundaries。 |

JD-derived questions that are especially likely for this project:

1. EN: How did you build an end-to-end AI application, not just a demo? CN: 你怎麼做出 end-to-end AI application，而不是 demo？
2. EN: How do you evaluate RAG and LLM outputs in production? CN: 你怎麼在 production 評估 RAG 與 LLM output？
3. EN: How do you handle guardrails, PII, and tenant isolation? CN: 你怎麼處理 guardrails、PII、多租戶隔離？
4. EN: How do you deploy, monitor, and roll back AI services? CN: 你怎麼部署、監控和 rollback AI services？
5. EN: How do you optimize for latency, cost, and reliability? CN: 你怎麼優化 latency、cost、reliability？
6. EN: How do you convert traces and failures into better evals? CN: 你怎麼把 traces 和 failures 轉成更好的 eval？
7. EN: How do you safely integrate enterprise data sources? CN: 你怎麼安全整合企業資料來源？
8. EN: How would you extend the chatbot from read-only support to agentic workflows? CN: 你怎麼把 chatbot 從 read-only support 擴展到 agentic workflows？

## 4. What Was Actually Tested

Do not claim every possible input in the universe was tested. A strong senior
answer is precise:

- Local automated test inventory: **400 passed** with Docker/Postgres/pgvector
  available.
- Focused common-chatbot regression tests: **7 passed**.
- Doc-RAG integration: **7 passed** against indexed pgvector knowledge base.
- Doc-RAG eval: clearance **6/6**, recall@5 **1.000**, MRR **1.000**,
  nDCG@5 **1.000**.
- Static gates: `flake8` passed, `git diff --check` passed.
- Local HTTP smoke tests and Docker image smoke tests cover composed API/UI
  behavior.

What remains outside local proof:

- Real Jenkins controller execution.
- Real AWS ECR/ECS deployment.
- Real production UIS/JWT provider behavior.
- Real LLM provider drift under live traffic.
- Long-running load tests and full browser/device matrix tests.

Good interview sentence:

> I would not say "all possible functions are exhaustively tested." I would say
> the local release gate is green across unit, integration, UI contract, RAG
> eval, security, smoke, and deployment-helper tests. The remaining risks are
> explicitly external: real Jenkins, AWS, provider drift, and production load.

## 5. Failure Lessons / 失敗經驗與復盤

Use this section when the interviewer asks: "Tell me about a bug you found,"
"What failed during development?", "How did testing change your design?", or
"What would you do differently?"

| Failure or gap / 失敗或缺口 | What happened / 發生什麼 | Root cause / 原因 | Fix and proof / 修正與證據 | Interview framing / 面試說法 |
|---|---|---|---|---|
| NL-to-SQL eval gap / NL-to-SQL 評估缺口 | EN: Execution accuracy was only **7/28** at first. CN: 一開始 execution accuracy 只有 **7/28**。 | EN: The demo generator did not cover enough real device-status question patterns. CN: demo generator 沒覆蓋足夠多真實設備狀態問題。 | EN: Added rules and tests for average battery, charging, network breakdown, platform command tables, fleet/profile joins, and alert joins. Final eval: **28/28**. CN: 補上平均電量、充電狀態、網路分布、平台指令表、fleet/profile joins、alert joins 等規則與測試，最後 **28/28**。 | EN: "The eval caught a real product gap before I could overclaim accuracy." CN:「eval 在我誇大準確率之前先抓到真實產品缺口。」 |
| Pgvector integration gap / pgvector 整合缺口 | EN: Without a running pgvector KB store, local tests had **393 passed, 7 skipped**. CN: 沒有 pgvector KB store 時，本地是 **393 passed, 7 skipped**。 | EN: Unit tests were green, but full Doc-RAG proof needed a real vector database and indexed KB. CN: unit tests 綠了，但 Doc-RAG 完整證明需要真 vector DB 與 indexed KB。 | EN: Started disposable Docker pgvector, indexed synthetic KB, ran Doc-RAG integration and eval. Final full suite: **400 passed**. CN: 用 Docker 啟 pgvector、index synthetic KB、跑 Doc-RAG integration/eval，最後 full suite **400 passed**。 | EN: "I learned not to call RAG tested until retrieval runs against a real vector store." CN:「我學到 RAG 沒跑真 vector store 前，不能說已完整測過。」 |
| Fallback history pollution risk / fallback 污染歷史風險 | EN: Out-of-scope or not-permitted answers could become bad future context if saved. CN: out-of-scope 或 not-permitted 回答如果被存下來，可能變成之後的壞 context。 | EN: Chatbot fallback is not just UX; it affects memory quality. CN: chatbot fallback 不只是 UX 問題，也會影響記憶品質。 | EN: Added regression tests so out-of-scope and not-permitted turns do not pollute session history. CN: 補 regression tests，確保 out-of-scope/not-permitted 不污染 session history。 | EN: "I treated fallback as part of state management, not only copywriting." CN:「我把 fallback 當 state management 問題，不只是文案問題。」 |
| "All functions tested" overclaim risk / 「全部測過」誇大風險 | EN: It was tempting to say everything was tested after the local suite passed. CN: local suite 過了後，很容易想說全部都測過。 | EN: Local tests cannot prove real Jenkins, AWS, live UIS/JWT, provider drift, or long-run load. CN: local tests 無法證明真 Jenkins、AWS、live UIS/JWT、provider drift、長時間 load。 | EN: Documented the exact tested surface and the external gaps separately. CN: 把已測範圍和外部缺口分開寫清楚。 | EN: "A senior answer is precise about proof boundaries." CN:「senior 的回答要清楚說明證據邊界。」 |
| PII leakage risk / PII 洩漏風險 | EN: Device identifiers, phone, location, email, and raw SQL traces are high-risk in support chat. CN: 設備識別碼、電話、定位、email、raw SQL trace 在客服聊天裡風險很高。 | EN: LLM answers and traces can accidentally expose sensitive fields unless blocked before and after generation. CN: 如果不在 generation 前後都阻擋，LLM answer 和 trace 可能洩漏敏感欄位。 | EN: Added PII column blocking, output/trace redaction, token-mode SQL hiding, and PII eval. CN: 補 PII 欄位阻擋、輸出/trace 脫敏、token mode 隱藏 SQL、PII eval。 | EN: "I do not rely on the model to remember privacy policy; the system enforces it." CN:「我不靠模型記住隱私政策，而是讓系統強制執行。」 |
| UI looked like a dev tool risk / UI 像開發工具的風險 | EN: A support chatbot can lose trust if the UI exposes internal-looking details or unclear session behavior. CN: 如果客服 chatbot 暴露太多內部感或 session 行為不清楚，會降低信任。 | EN: Developer-friendly debug surfaces are not always customer-friendly. CN: 對開發者方便的 debug surface，不一定適合客戶。 | EN: Added static UI checks for current-session UX, safe DOM rendering, sample questions, and live-region/status behavior. CN: 補 static UI checks，涵蓋 current-session UX、安全 DOM rendering、sample questions、live-region/status。 | EN: "I treated frontend trust and accessibility as part of production readiness." CN:「我把前端信任感和 accessibility 當成 production readiness 的一部分。」 |

Strong failure-story template:

> EN: "One concrete failure was that our execution eval initially passed only
> 7/28 cases. I did not hide that behind passing unit tests. I traced it to
> missing real device-status patterns, expanded the generator and tests, and
> made the eval a regression gate. The result became 28/28. The lesson was that
> LLM apps need task-specific evals, not just endpoint tests."
>
> CN:「一個具體失敗是 execution eval 一開始只有 7/28。我沒有用 unit tests
> 綠燈掩蓋它，而是追到原因：demo generator 缺少真實設備狀態問題的 pattern。
> 我補了 generator、測試和 regression gate，最後變成 28/28。這件事讓我學到：
> LLM app 不能只靠 endpoint tests，要有 task-specific evals。」

## 6. Common Chatbot Problems And Project Answers

| Common problem | Why it matters | Chatbox answer |
|---|---|---|
| User does not know what the bot can do | Generic chatbots fail when scope is unclear. | UI explains that this bot is for real-time device status and support answers, with sample questions for device data, support docs, internal runbooks, and guardrail cases. |
| Free text only or button only | Users need both guidance and flexibility. | The UI supports typed questions plus sample chips. |
| Fallback loops pollute history | Bad fallback history makes future turns worse. | Out-of-scope and not-permitted questions return explicit statuses and are not saved into session history. |
| Blank or overlong input | Wastes compute and creates noisy UX. | API rejects blank questions and enforces a 500-character question limit; UI also blocks empty asks. |
| Long conversation confusion | Customers need active troubleshooting context, not permanent memory. | Browser uses `sessionStorage` session IDs; backend history is scoped by company, user, and session. New browser sessions do not automatically see old chat memory. |
| Cross-tenant data leakage | Highest-impact B2B SaaS risk. | Authenticated mode ignores client-claimed company IDs; SQL guard injects tenant filters; Postgres RLS is an independent isolation layer. |
| Prompt injection / indirect RAG injection | User prompts and retrieved docs can try to override instructions. | Deterministic prompt-injection guard catches direct, indirect, obfuscated, Chinese, role-marker, tool-exfiltration, and markdown-image payloads. Chunk safety blocks poisoned KB chunks. |
| PII disclosure | Device identifiers, phone numbers, coordinates, emails, and raw SQL traces can leak. | Semantic model blocks PII columns; output and trace redaction scrub sensitive values; token mode hides generated SQL. |
| Hallucinated support answers | RAG answers must be grounded. | Doc-RAG has clearance probes plus golden retrieval tests; no-context cases should not invent answers. |
| Dynamic chat is inaccessible | Chat content updates without page reload. | Answer and history regions use live-region/status semantics; static UI tests protect this contract. |
| Unsafe frontend rendering | Chatbot output may contain untrusted text. | UI uses safe DOM APIs such as `textContent` and avoids HTML insertion sinks. |
| Works in unit tests but fails over HTTP | Real bugs often appear at composed boundaries. | Local smoke tests hit health, UI, ask, trace, write guard, PII, history, and recent traces over real HTTP. |

## 7. Interviewer Question Angles / 面試官考點角度

Use this section when the interviewer is not asking one fixed question, but is
trying to test whether the project is real, secure, measurable, and deployable.

| Angle / 角度 | Likely question / 可能問題 | What they test / 考點 | Answer anchor / 回答方向 |
|---|---|---|---|
| Product scope / 產品邊界 | EN: What exactly does your chatbox do? CN: 你的 Chatbox 到底解決什麼問題？ | Whether this is a real product, not a vague wrapper. / 是否是真實產品，不是單純套模型。 | EN: It is an MDM operations assistant for real-time device status and support docs. CN: 它是 MDM 營運助理，回答即時設備狀態與支援文件問題。 |
| Not a wrapper / 不只是 wrapper | EN: Why is this not just a ChatGPT wrapper? CN: 為什麼這不是包一層 ChatGPT？ | System ownership and production boundaries. / 是否理解系統責任邊界。 | EN: The LLM is one component; auth, routing, SQL guardrails, RLS, RAG, PII redaction, traces, tests, and deployment gates are the product. CN: 模型只是其中一層，真正價值在權限、路由、SQL 防護、RLS、RAG、PII、追蹤、測試與部署門檻。 |
| Architecture / 架構 | EN: Walk me through the request path. CN: 從使用者發問到回答產生，流程怎麼走？ | Can you explain the system end to end? / 能否完整說明資料流。 | EN: API resolves principal, dispatcher routes intent, SQL or Doc-RAG path runs, guardrails validate, answer/history/trace are saved. CN: API 解析身份，dispatcher 分流，走 SQL 或 Doc-RAG，經 guardrails 驗證後產生回答並存 history/trace。 |
| Session memory / Session 記憶 | EN: Where is the conversation stored? CN: 對話存在什麼地方？登入後會看到之前的嗎？ | Privacy and memory policy. / 隱私與記憶策略。 | EN: UI uses `sessionStorage` session ID; backend history is scoped by company/user/session. New sessions do not automatically restore old memory. CN: UI 用 `sessionStorage` 產生 session ID，後端依 company/user/session scope 存 history；新 session 預設不自動恢復舊對話。 |
| Long conversation / 長對話 | EN: What if the conversation gets too long? CN: 對話太長怎麼辦？ | Context-window and cost control. / 上下文與成本控制。 | EN: Do not stuff the full transcript into prompts; use capped recent history and add redacted summaries only if multi-turn reasoning requires it. CN: 不把完整 transcript 塞進 prompt；用近期歷史上限，必要時才做已脫敏摘要。 |
| Tenant isolation / 多租戶隔離 | EN: How do you stop customer A from seeing customer B? CN: 如何避免客戶 A 看到客戶 B 的資料？ | Highest-impact SaaS risk. / SaaS 最大風險。 | EN: Trust auth principal, ignore client-claimed company IDs, inject tenant predicates, enforce Postgres RLS, and scope history/feedback. CN: 信任 auth principal，不信 request body 的 company_id，SQL 注入 tenant 條件，Postgres RLS 做第二層，history/feedback 也依租戶隔離。 |
| NL-to-SQL safety / SQL 安全 | EN: How do you know generated SQL is safe? CN: 你怎麼知道模型產生的 SQL 安全？ | Whether you trust model output blindly. / 是否盲信模型輸出。 | EN: Parse and validate SQL, allow read-only only, block writes/PII, inject tenant filter, cap rows, and set DB timeouts. CN: 解析並驗證 SQL，只允許 read-only，阻擋 write/PII，注入 tenant filter，限制 row count 與 timeout。 |
| PII / 隱私資料 | EN: What if the user asks for IMEI, phone, location, or email? CN: 如果使用者要求 IMEI、電話、定位或 email 呢？ | Privacy enforcement. / 隱私控制。 | EN: Semantic model blocks PII columns; output and traces are redacted; token mode hides generated SQL. CN: semantic model 標記 PII 欄位，輸出與 trace 會脫敏，token mode 不暴露 generated SQL。 |
| RAG grounding / RAG 可信度 | EN: How do you know RAG answers are grounded? CN: 你怎麼知道 RAG 沒有亂編？ | Hallucination and eval maturity. / 幻覺控制與評估成熟度。 | EN: Use clearance probes, golden retrieval, recall@k, MRR, nDCG, citations, and no-context behavior. CN: 用 clearance probes、golden retrieval、recall@k、MRR、nDCG、citations 與 no-context 行為驗證。 |
| Prompt injection / 提示注入 | EN: What if malicious instructions are hidden in retrieved docs? CN: 如果惡意指令藏在 RAG 文件裡？ | Indirect prompt injection threat model. / 間接提示注入威脅模型。 | EN: Treat retrieved text as untrusted data, scan chunks, separate instruction/data, and keep deterministic policy enforcement outside the model. CN: 將 retrieved text 視為不可信資料，掃描 chunk，區分 instruction/data，真正 policy enforcement 放在模型外。 |
| Fallback / 回退機制 | EN: What happens when the bot cannot answer? CN: Bot 不知道答案時怎麼辦？ | UX and quality control. / 使用者體驗與品質控制。 | EN: Return clear fallback/no-context/not-permitted status and do not save bad fallback turns into session memory. CN: 回傳清楚的 fallback/no-context/not-permitted 狀態，且不把錯誤 fallback 污染 session history。 |
| Testing / 測試證據 | EN: Did you test all functions? CN: 你全部功能都測過了嗎？ | Honesty and evidence. / 是否誠實且有證據。 | EN: Do not claim exhaustive testing; say local gates cover unit, integration, UI contract, security, RAG eval, smoke, Docker, and deployment-helper tests. CN: 不說「所有可能輸入都測過」，而是說 local gates 覆蓋 unit、integration、UI contract、security、RAG eval、smoke、Docker 與 deployment-helper。 |
| Observability / 可觀測性 | EN: How do you debug a wrong answer in production? CN: 上線後回答錯了怎麼查？ | Production operations. / 上線維運能力。 | EN: Trace route, SQL/result preview, retrieved chunks, guard decisions, latency, errors, and feedback; convert failures into regression data. CN: 記錄 route、SQL/result preview、retrieved chunks、guard decisions、latency、errors、feedback，並把失敗案例轉成 regression data。 |
| Jenkins/AWS / 部署 | EN: How would Jenkins deploy this to AWS? CN: Jenkins 怎麼推到 AWS？ | Release engineering. / 發版能力。 | EN: Jenkinsfile runs lint/security/tests, builds Docker image, pushes ECR, deploys ECS/runtime, runs health checks, and rolls back on failure. CN: Jenkinsfile 跑 lint/security/tests，build Docker image，push ECR，deploy ECS/runtime，跑 health checks，失敗 rollback。 |
| Scale/cost / 擴展與成本 | EN: How do you reduce latency and cost? CN: 怎麼降低延遲與成本？ | Performance and unit economics. / 效能與成本意識。 | EN: Intent routing, short-circuit refusals, deterministic guards, caching, rate limits, DB timeouts, and p95/p99 monitoring. CN: intent routing、提前拒答、deterministic guards、cache、rate limit、DB timeout、p95/p99 監控。 |

### High-Signal Practice Questions / 高命中練習題

1. EN: Explain your Chatbox architecture in two minutes. CN: 用兩分鐘說明 Chatbox 架構。
   - Follow-up 1: EN: Which parts are deterministic and which parts use the LLM? CN: 哪些部分是 deterministic，哪些部分用 LLM？
   - Follow-up 2: EN: Where do you enforce security boundaries? CN: 安全邊界在哪些地方執行？
   - Follow-up 3: EN: What fails independently if the RAG store or LLM provider is down? CN: 如果 RAG store 或 LLM provider 掛了，哪些部分可以獨立降級？

2. EN: Why is this not just a ChatGPT wrapper? CN: 為什麼這不是單純包 ChatGPT？
   - Follow-up 1: EN: What value does your backend add beyond prompt formatting? CN: 除了整理 prompt，你的 backend 提供什麼價值？
   - Follow-up 2: EN: What would still work if you changed model providers? CN: 如果換模型 provider，哪些核心能力仍然存在？
   - Follow-up 3: EN: Which production risks cannot be solved by prompting alone? CN: 哪些 production 風險不是 prompt 可以解決的？

3. EN: Why same-session memory instead of long-term memory? CN: 為什麼是同一 session 記住，而不是長期記憶？
   - Follow-up 1: EN: What user problem does same-session memory solve? CN: 同一 session 記憶解決什麼使用者問題？
   - Follow-up 2: EN: What privacy risk would long-term memory introduce? CN: 長期記憶會帶來什麼隱私風險？
   - Follow-up 3: EN: When would you decide to add persistent memory later? CN: 什麼情況下你才會之後加入 persistent memory？

4. EN: Where are conversations stored, and can a customer see old chats after login? CN: 對話存在哪裡？客戶登入後會看到舊對話嗎？
   - Follow-up 1: EN: What is stored in the browser and what is stored server-side? CN: 哪些存在瀏覽器，哪些存在 server 端？
   - Follow-up 2: EN: How do company, user, and session scope protect history? CN: company、user、session scope 如何保護 history？
   - Follow-up 3: EN: How would retention and deletion work if customers request it? CN: 如果客戶要求保留期限或刪除，retention/deletion 怎麼設計？

5. EN: What happens if the conversation becomes too long? CN: 對話太長怎麼處理？
   - Follow-up 1: EN: Why should you not send the full transcript to the model? CN: 為什麼不能把完整 transcript 都送進模型？
   - Follow-up 2: EN: What should be kept in a sliding window? CN: sliding window 應該保留哪些內容？
   - Follow-up 3: EN: How would you build a safe summary if multi-turn reasoning needs it? CN: 如果 multi-turn reasoning 需要摘要，你會怎麼做安全摘要？

6. EN: How do you prevent tenant data leakage? CN: 如何避免租戶資料外洩？
   - Follow-up 1: EN: Why is request-body company_id not trusted? CN: 為什麼不能信 request body 裡的 company_id？
   - Follow-up 2: EN: What does the SQL guard do before execution? CN: SQL guard 在執行前做什麼？
   - Follow-up 3: EN: How does Postgres RLS protect you if app logic has a bug? CN: 如果 app logic 有 bug，Postgres RLS 怎麼保護？

7. EN: Why use Postgres RLS if the app already has tenant filters? CN: App 已經有 tenant filter，為什麼還要 Postgres RLS？
   - Follow-up 1: EN: What kind of bug can RLS catch that app filters miss? CN: RLS 可以補到 app filter 漏掉的哪種 bug？
   - Follow-up 2: EN: How do you test that RLS actually blocks cross-tenant reads? CN: 你怎麼測 RLS 真的擋掉跨租戶讀取？
   - Follow-up 3: EN: What are the performance or maintenance tradeoffs of RLS? CN: RLS 在效能或維護上有什麼 tradeoff？

8. EN: How do you stop generated SQL from deleting or leaking data? CN: 如何阻止 generated SQL 刪資料或洩漏資料？
   - Follow-up 1: EN: How do you detect write statements such as DELETE or UPDATE? CN: 你怎麼偵測 DELETE 或 UPDATE 這類寫入語句？
   - Follow-up 2: EN: How do you block sensitive columns from SELECT queries? CN: 你怎麼阻擋 SELECT 查敏感欄位？
   - Follow-up 3: EN: What limits prevent expensive or unbounded SQL? CN: 哪些限制可以避免昂貴或無邊界 SQL？

9. EN: How do you handle PII such as IMEI, phone, location, or email? CN: IMEI、電話、定位、email 這類 PII 怎麼處理？
   - Follow-up 1: EN: Where is PII blocked before query execution? CN: PII 在 query execution 前哪裡被阻擋？
   - Follow-up 2: EN: How do you prevent PII from leaking into traces or logs? CN: 如何避免 PII 進入 traces 或 logs？
   - Follow-up 3: EN: What would you do if a legitimate support workflow needs sensitive data? CN: 如果合法支援流程真的需要敏感資料，你會怎麼設計？

10. EN: How do you defend against prompt injection in user input? CN: 如何防使用者輸入的 prompt injection？
   - Follow-up 1: EN: Why is input filtering not enough by itself? CN: 為什麼只有 input filtering 不夠？
   - Follow-up 2: EN: Which downstream validations still run even if the prompt looks safe? CN: 即使 prompt 看起來安全，哪些 downstream validations 還是要跑？
   - Follow-up 3: EN: How do you test English, Chinese, and obfuscated injection attempts? CN: 你怎麼測英文、中文、obfuscated injection？

11. EN: How do you defend against prompt injection hidden inside retrieved docs? CN: 如何防藏在 RAG 文件裡的 prompt injection？
   - Follow-up 1: EN: Why is retrieved text treated as untrusted data? CN: 為什麼 retrieved text 要當成不可信資料？
   - Follow-up 2: EN: What happens to a poisoned chunk before answer composition? CN: poisoned chunk 在 answer composition 前會發生什麼？
   - Follow-up 3: EN: How do you separate instructions from context in the prompt? CN: 你怎麼在 prompt 裡區分 instructions 和 context？

12. EN: How do you know your RAG answers are faithful and not hallucinated? CN: 如何證明 RAG 回答有根據、不是幻覺？
   - Follow-up 1: EN: What does faithfulness mean in this product? CN: 在這個產品裡 faithfulness 是什麼意思？
   - Follow-up 2: EN: What does the system do when evidence is insufficient? CN: 當 evidence 不足時系統怎麼做？
   - Follow-up 3: EN: How do citations help users and debugging? CN: citations 對使用者和 debugging 有什麼幫助？

13. EN: What metrics do you use for RAG evaluation? CN: RAG 評估你用哪些指標？
   - Follow-up 1: EN: Why do you separate clearance safety from retrieval quality? CN: 為什麼要把 clearance safety 和 retrieval quality 分開測？
   - Follow-up 2: EN: What do recall@k, MRR, and nDCG tell you? CN: recall@k、MRR、nDCG 分別代表什麼？
   - Follow-up 3: EN: What metric would catch internal-doc leakage? CN: 哪個 metric 或測試可以抓 internal doc leakage？

14. EN: What does the bot do when it has no context? CN: 沒有相關內容時 bot 怎麼回？
   - Follow-up 1: EN: Why is no-context better than a confident guess? CN: 為什麼 no-context 比自信亂猜好？
   - Follow-up 2: EN: How do you avoid saving bad no-context turns into useful memory? CN: 如何避免把不好的 no-context turn 存成有用 memory？
   - Follow-up 3: EN: What would you show the user next to recover the workflow? CN: 你會給使用者什麼下一步來恢復流程？

15. EN: What did you test, and what can you not honestly claim was tested? CN: 你測了什麼？哪些不能誠實宣稱已測？
   - Follow-up 1: EN: Which tests prove local behavior? CN: 哪些測試證明 local behavior？
   - Follow-up 2: EN: Which risks require real Jenkins, AWS, or provider testing? CN: 哪些風險需要真 Jenkins、AWS 或 provider 測試？
   - Follow-up 3: EN: How do you explain coverage without exaggerating? CN: 你怎麼不誇大地說明 coverage？

16. EN: What production metrics would you monitor after launch? CN: 上線後你會監控哪些 production metrics？
   - Follow-up 1: EN: Which metrics indicate answer quality is degrading? CN: 哪些 metrics 表示回答品質正在下降？
   - Follow-up 2: EN: Which metrics indicate security or privacy problems? CN: 哪些 metrics 表示安全或隱私問題？
   - Follow-up 3: EN: Which metrics indicate cost or latency problems? CN: 哪些 metrics 表示成本或延遲問題？

17. EN: How would Jenkins push this to AWS? CN: Jenkins 會怎麼推到 AWS？
   - Follow-up 1: EN: What stages should run before building the Docker image? CN: build Docker image 前應該跑哪些 stages？
   - Follow-up 2: EN: How does the image move from Jenkins to AWS runtime? CN: image 怎麼從 Jenkins 到 AWS runtime？
   - Follow-up 3: EN: Where should secrets live during deployment? CN: deployment 過程 secrets 應該放在哪？

18. EN: What would trigger rollback? CN: 什麼情況會 rollback？
   - Follow-up 1: EN: Which health checks must pass after deployment? CN: deploy 後哪些 health checks 必須通過？
   - Follow-up 2: EN: What user-visible symptoms should stop promotion? CN: 哪些使用者可見症狀應該停止 promotion？
   - Follow-up 3: EN: How do you preserve logs and traces for root-cause analysis? CN: rollback 時怎麼保留 logs/traces 做 root-cause analysis？

19. EN: How would you reduce latency and cost? CN: 你會怎麼降低延遲和成本？
   - Follow-up 1: EN: Which requests can be short-circuited before the LLM? CN: 哪些 request 可以在 LLM 前提前結束？
   - Follow-up 2: EN: What can be cached safely without leaking tenant data? CN: 什麼可以安全 cache 而不洩漏租戶資料？
   - Follow-up 3: EN: How do you choose between cheaper and stronger models? CN: 你怎麼選便宜模型和強模型的分工？

20. EN: What would you improve next if you had another sprint? CN: 如果再給一個 sprint，你會優先改善什麼？
   - Follow-up 1: EN: Which improvement has the highest production-risk reduction? CN: 哪個改善最能降低 production risk？
   - Follow-up 2: EN: Which improvement would most improve interview credibility? CN: 哪個改善最能提升面試可信度？
   - Follow-up 3: EN: What would you deliberately not do next, and why? CN: 下一步你會刻意不做什麼，為什麼？

21. EN: Tell me about a failure or bug you found in this project. CN: 請說一個你在這個專案遇到的失敗或 bug。
   - Follow-up 1: EN: How did you detect it instead of discovering it from users? CN: 你是怎麼在使用者發現前先抓到它？
   - Follow-up 2: EN: What changed in the architecture, tests, or release gate afterward? CN: 之後架構、測試或 release gate 有什麼改變？
   - Follow-up 3: EN: What did that failure teach you about production LLM apps? CN: 這個失敗讓你學到 production LLM app 的什麼事？

22. EN: How do you design and evaluate intent routing? CN: 你怎麼設計和評估 intent routing？
   - Follow-up 1: EN: What happens if a SQL question is routed to Doc-RAG, or the reverse? CN: 如果 SQL 問題被分到 Doc-RAG，或反過來，會怎麼處理？
   - Follow-up 2: EN: What labels or golden cases would you use to measure routing quality? CN: 你會用哪些 labels 或 golden cases 評估 routing 品質？
   - Follow-up 3: EN: How do you handle ambiguous questions without forcing a wrong route? CN: 遇到模糊問題時，如何避免硬分到錯誤路徑？

23. EN: How do you keep the knowledge base fresh and permission-safe? CN: 你怎麼讓知識庫保持最新且權限安全？
   - Follow-up 1: EN: What happens when a document is updated, deleted, or reclassified as internal? CN: 文件更新、刪除或改成 internal 時怎麼辦？
   - Follow-up 2: EN: How do you prevent stale chunks from being retrieved? CN: 如何避免舊 chunk 被檢索出來？
   - Follow-up 3: EN: How do you test that ACL or clearance changes are reflected in retrieval? CN: 你怎麼測 ACL 或 clearance 變更有反映到 retrieval？

24. EN: How do you choose chunking, embeddings, and reranking strategy? CN: 你怎麼選 chunking、embedding 和 reranking 策略？
   - Follow-up 1: EN: What happens if chunks are too small or too large? CN: chunk 太小或太大會發生什麼問題？
   - Follow-up 2: EN: How would you handle tables, command docs, or structured troubleshooting content? CN: 遇到表格、指令文件或結構化 troubleshooting 內容怎麼處理？
   - Follow-up 3: EN: When would you add hybrid search or reranking instead of pure vector search? CN: 什麼情況下你會加 hybrid search 或 reranking，而不是只用 vector search？

25. EN: How do you handle embedding or model drift in production? CN: 你怎麼處理 production 裡的 embedding 或 model drift？
   - Follow-up 1: EN: What breaks if a new embedding model has different dimensions? CN: 如果新 embedding model 維度不同，會壞在哪裡？
   - Follow-up 2: EN: How would you compare old and new retrieval quality before rollout? CN: rollout 前你怎麼比較新舊 retrieval 品質？
   - Follow-up 3: EN: What rollback plan would you need if retrieval quality drops overnight? CN: 如果 retrieval quality 一夜下降，你需要什麼 rollback plan？

26. EN: How would you design abuse prevention and rate limiting? CN: 你會怎麼設計濫用防護與 rate limiting？
   - Follow-up 1: EN: What limits protect LLM cost, DB load, and vector search load separately? CN: 哪些限制分別保護 LLM 成本、DB load 和 vector search load？
   - Follow-up 2: EN: How do you avoid blocking legitimate high-volume enterprise users? CN: 如何避免誤擋合法高流量企業客戶？
   - Follow-up 3: EN: What telemetry would tell you the system is under abuse or prompt-flooding? CN: 哪些 telemetry 會顯示系統正在被濫用或 prompt flooding？

27. EN: How do you design incident response for a bad AI answer? CN: 你怎麼設計錯誤 AI 回答的 incident response？
   - Follow-up 1: EN: What evidence do you need in the trace to debug the incident? CN: trace 裡需要哪些證據才能 debug incident？
   - Follow-up 2: EN: When is it a prompt issue, retrieval issue, SQL issue, or policy issue? CN: 你怎麼判斷是 prompt、retrieval、SQL 還是 policy 問題？
   - Follow-up 3: EN: How do you turn the incident into a regression test? CN: 你怎麼把 incident 轉成 regression test？

28. EN: How would you support human handoff or escalation? CN: 你會怎麼支援人工接手或升級處理？
   - Follow-up 1: EN: Which cases should be escalated instead of answered automatically? CN: 哪些情況應該升級人工，而不是自動回答？
   - Follow-up 2: EN: What context should be passed to support without leaking PII? CN: 要傳給客服哪些 context，同時避免 PII 外洩？
   - Follow-up 3: EN: How do feedback and handoff outcomes improve future evals? CN: feedback 和 handoff 結果如何改善之後的 eval？

29. EN: How do you design multi-tenant vector search safely? CN: 你怎麼安全設計 multi-tenant vector search？
   - Follow-up 1: EN: Do you use separate indexes, metadata filters, or both? Why? CN: 你會用 separate indexes、metadata filters，還是兩者都用？為什麼？
   - Follow-up 2: EN: What failure mode could leak another tenant's documents? CN: 什麼 failure mode 可能洩漏其他租戶文件？
   - Follow-up 3: EN: How do you test tenant isolation in retrieval, not only SQL? CN: 你怎麼測 retrieval 的 tenant isolation，而不只測 SQL？

30. EN: How would you explain the business impact of this Chatbox? CN: 你會怎麼說明這個 Chatbox 的 business impact？
   - Follow-up 1: EN: What metrics show it improves support efficiency? CN: 哪些 metrics 可以證明它提升客服效率？
   - Follow-up 2: EN: What metrics show it is safe enough for customers? CN: 哪些 metrics 可以證明它對客戶足夠安全？
   - Follow-up 3: EN: How would you decide whether to expand it beyond read-only support? CN: 你怎麼判斷是否要把它從 read-only support 擴展到可執行動作？

### Red-Flag Answers To Avoid / 避免這樣回答

- EN: Do not say "RAG solves hallucination." Say RAG reduces hallucination only
  when retrieval, grounding, and no-context behavior are evaluated.
  CN: 不要說「RAG 解決幻覺」。要說只有在 retrieval、grounding、no-context
  行為被評估時，RAG 才能降低幻覺。
- EN: Do not say "the prompt prevents data leaks." Say prompts help, but auth,
  SQL validation, RLS, redaction, and clearance filters are the real boundaries.
  CN: 不要說「prompt 可以防資料外洩」。真正邊界是 auth、SQL validation、
  RLS、redaction、clearance filters。
- EN: Do not say "all functions are tested." Say which local gates passed and
  which external production paths remain unverified.
  CN: 不要說「全部都測過」。要說清楚哪些 local gates passed，哪些 production
  外部路徑還沒驗證。
- EN: Do not say "customers always see old chats after login" unless long-term
  memory is an explicit product feature.
  CN: 不要說「客戶登入一定看到舊對話」，除非長期記憶是明確產品功能。
- EN: Do not say "Jenkins deploys to AWS" without tests, image build, ECR/ECS
  or runtime target, health checks, rollback, and secret handling.
  CN: 不要只說「Jenkins 推 AWS」，要講 tests、image build、ECR/ECS 或 runtime
  target、health checks、rollback、secrets。

## 8. Senior Interview Q&A

### Q1. Is this just a ChatGPT wrapper?

No. The model is only one component. The product has routing, auth, tenant
isolation, SQL guardrails, Postgres RLS, Doc-RAG retrieval, clearance filtering,
PII redaction, session-scoped history, tracing, evals, local smoke tests,
Docker checks, and Jenkins/AWS deployment gates.

The value is controlled access to customer operational state, not open-ended
conversation.

Follow-up answer:

> If the model is unavailable, the app should degrade predictably. The product
> boundary is the controlled assistant workflow, not the specific model vendor.

### Q2. How is the system designed end to end?

Request flow:

1. Flask API receives `/intelligence-chat/ask`.
2. Auth resolves a trusted principal.
3. Dispatcher classifies intent.
4. SQL questions go through NL-to-SQL generation, semantic schema context,
   SQL guard validation/rewrite, tenant injection, read-only execution, answer
   composition, history save, and trace record.
5. Product-doc questions go through Doc-RAG retrieval, clearance filters,
   chunk-safety checks, answer composition, citations, and trace record.
6. Out-of-scope or not-permitted questions short-circuit before expensive or
   risky execution paths.

### Q3. How does session memory work?

The product uses **current-session memory**, not long-term personal memory.

- Browser UI creates a `session_id` in `sessionStorage`.
- Each ask sends the `session_id`.
- History lookup requires the same company, user, and session scope.
- Token/session-authenticated modes require a session ID.
- A new browser session does not automatically see old chat memory.

Why this is right:

> Customers mostly ask current device status. We want continuity during the
> active troubleshooting session, but we do not want silent long-term personal
> memory unless the product explicitly needs it and the retention policy is
> clear.

### Q4. What happens if the conversation gets too long?

Current behavior:

- UI shows only recent session history.
- History API is capped and paginated.
- Real-time device-status questions do not require replaying the whole
  transcript.

Future production improvement:

> If we add deeper multi-turn reasoning, I would use a sliding window plus a
> redacted session summary. I would not blindly put the entire transcript into
> the prompt. The summary must remain tenant/user/session scoped and traceable.

### Q5. How do you prevent tenant data leakage?

Defense in depth:

- Company identity comes from trusted auth, not request body.
- SQL guard injects tenant predicates.
- Postgres RLS enforces tenant isolation even if generated SQL is wrong.
- History and feedback are scoped by company, user, and session.
- Doc-RAG applies visibility and clearance filters.
- Tests cover token-mode company spoofing, SQL guard behavior, RLS, history
  scope, and feedback ownership.

Good senior sentence:

> I do not rely on model obedience for tenant isolation. The database and query
> layer enforce it independently.

### Q6. How do you defend against prompt injection?

Prompt injection is treated as a runtime risk:

- SQL track: generated SQL is parsed, allowlisted, forced read-only, capped, and
  tenant-injected.
- Doc-RAG track: retrieved chunks are scanned before answer composition.
- Guard coverage includes direct and indirect injection, English/Chinese
  payloads, role markers, system-prompt leakage, tool exfiltration, markdown
  image exfiltration, and obfuscation.
- High-risk actions should require explicit gating or human confirmation.

Good senior sentence:

> A prompt can help, but it is not a security boundary. The real boundary is
> structured validation, least privilege, retrieval filtering, and execution
> gating.

### Q7. How do you evaluate RAG quality?

Separate access safety from retrieval quality:

- Clearance suite: client-clearance questions must retrieve zero internal
  chunks. Current result: **6/6**.
- Golden retrieval suite: known support questions must retrieve expected pages
  in top-k. Current result: all 8 golden questions rank 1, recall@5 **1.000**,
  MRR **1.000**, nDCG@5 **1.000**.
- This is stronger than only asking an LLM judge whether the answer "looks
  good."

### Q8. How do you reduce hallucinations?

- SQL answers are grounded in executed rows.
- Doc-RAG answers are grounded in retrieved chunks and citations.
- No-context cases should return a clear no-context status instead of inventing.
- Trace data and feedback can be converted into regression datasets.

Good senior sentence:

> I reduce hallucination by changing the shape of the task: retrieve or execute
> first, then compose from evidence, then evaluate failures as data.

### Q9. How do you handle PII?

- Semantic model marks blocked PII columns.
- SQL guard rejects sensitive fields such as IMEI, phone, location, and raw
  identifiers when inappropriate.
- Output and trace stores apply deterministic PII redaction.
- Token mode hides generated SQL from client responses.
- Tests and evals cover PII requests, trace redaction, and redactor behavior.

### Q10. How do you handle latency and cost?

- Route intent before expensive work.
- Short-circuit out-of-scope and not-permitted requests.
- Use deterministic guards where possible.
- Cache semantic/schema context by version.
- Apply DB statement timeouts and API rate limits.
- Use retrieval first, reranking only when needed.
- Track latency p95/p99 and fallback/no-context rates.

### Q11. How do you prepare Jenkins to deploy to AWS?

Pipeline shape:

1. Install dependencies.
2. Run lint/security/dependency gates.
3. Run unit and integration tests.
4. Build Docker image.
5. Push image to AWS ECR.
6. Deploy to ECS or the selected AWS runtime.
7. Run post-deploy health checks.
8. Roll back if health checks fail.

Interview answer:

> I would keep Jenkins as the orchestrator and AWS as the runtime. Jenkins
> should not deploy unverified images. The image must pass tests, audits, and
> smoke checks before ECR push and ECS update.

### Q12. What would you improve next?

High-value next steps:

- Run the complete Jenkins pipeline against a real controller.
- Run AWS ECR/ECS deployment in a staging account.
- Add Playwright browser tests to CI.
- Add paraphrase, typo, and multilingual intent-routing benchmarks.
- Add load testing for expected customer concurrency.
- Add dashboards for fallback rate, no-context rate, latency p95/p99,
  retrieval miss rate, tenant-scope denials, and feedback trends.

## 9. Mock Interview Questions For This Project

Use these when simulating a senior-level interview.

| # | Question | What the interviewer is checking | Strong answer direction |
|---|---|---|---|
| 1 | Walk me through the architecture of your chatbox. | Can the candidate explain boundaries and data flow? | Explain API, auth, routing, SQL track, RAG track, guardrails, tracing, tests. |
| 2 | Why did you choose same-session memory instead of long-term memory? | Product judgment and privacy thinking. | Customer needs active troubleshooting context; long-term memory adds retention and privacy risk. |
| 3 | How do you stop one customer from seeing another customer's data? | Multi-tenant security depth. | Trusted auth, tenant-injected SQL, RLS, scoped history/feedback, tests. |
| 4 | What happens if the user asks for phone numbers or IMEI values? | PII policy enforcement. | Semantic blocked fields, SQL rejection, redaction, token-mode hiding, tests. |
| 5 | How do you handle prompt injection hidden in retrieved documents? | RAG threat modeling. | Chunk scanning, clearance filtering, instruction/data separation, no model-only trust. |
| 6 | How do you know the RAG system is good enough? | Evaluation maturity. | Clearance suite, golden retrieval, recall/MRR/nDCG, no-context policy, trace-to-dataset loop. |
| 7 | What was a real bug or gap your tests found? | Honesty and engineering maturity. | Explain eval gap or common chatbot issue regression, then how the test was added. |
| 8 | How would you scale this under high traffic? | System design and cost control. | Routing, caching, rate limits, DB timeouts, pool sizing, async where appropriate, p95/p99 telemetry. |
| 9 | How would you deploy it with Jenkins and AWS? | Release engineering. | CI gates, Docker build, ECR push, ECS deploy, health checks, rollback. |
| 10 | What would you not claim in an interview? | Senior-level precision. | Do not claim exhaustive real-world testing; disclose Jenkins/AWS/provider/load gaps clearly. |
| 11 | Tell me about a real failure you found. | Ownership and learning loop. | Use the 7/28 execution eval story: detection, root cause, fix, regression gate, and lesson. |

## 10. One-Minute Pitch

I built Chatbox as a production-style MDM operations assistant. It is not a
generic chatbot: it routes between NL-to-SQL for real-time device state and
Doc-RAG for support knowledge. The hardest parts were tenant isolation, prompt
injection, PII control, current-session memory, and proving the system with
tests. The latest local gate is 400 passing tests, plus Doc-RAG clearance 6/6
and retrieval MRR 1.000. The remaining work I would call out honestly is
running the same gates on a real Jenkins/AWS staging path and adding long-run
load plus browser-matrix testing.
