// 토큰 사용량 측정: 같은 질문을 get-to-it 끔·켬 조건으로 실행해 usage 를 비교한다.
// 실행: node bench/token-usage.mjs [--base <git-ref>]  → bench/results.json
//   --base: 한국어에 "기존 규칙" 조건을 추가한다. 그 ref 의 훅·규칙 파일로 주입 글을 만든다(축약 전후 비교용).
// 조건: 빈 임시 폴더, 사용자 설정·CLAUDE.md·MCP 없음, 읽기 전용 도구만. 켬 조건만 훅이 주입하는 규칙 글을 시스템 프롬프트 뒤에 붙인다.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const work = fs.mkdtempSync(path.join(os.tmpdir(), "gti-bench-"));
const baseRef = process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : null;

const prompts = {
  ko: [
    "Express 서버에서 JWT 로그인하면 401이 나와. 어떻게 고쳐?",
    "git에서 마지막 커밋 메시지만 바꾸고 싶어.",
    "npm install 하면 ERESOLVE 오류가 나. 어떻게 해?",
    "Python 리스트에서 순서를 유지하면서 중복을 지우는 방법은?",
    "Docker 컨테이너가 시작하자마자 종료돼. 원인을 어떻게 찾아?",
    "React useEffect가 두 번 실행돼. 왜 그래?",
    "PostgreSQL 쿼리가 느려. 어디부터 봐야 해?",
    "오래된 git 브랜치를 정리하고 싶어.",
    "브라우저에서 CORS 오류가 나. 해결 방법 알려줘.",
    "TypeScript에서 'Object is possibly undefined' 오류는 어떻게 고쳐?",
  ],
  en: [
    "I get a 401 when logging in with JWT on my Express server. How do I fix it?",
    "I want to change only the message of my last git commit.",
    "npm install fails with an ERESOLVE error. What should I do?",
    "How do I remove duplicates from a Python list while keeping the order?",
    "My Docker container exits right after it starts. How do I find the cause?",
    "My React useEffect runs twice. Why?",
    "My PostgreSQL query is slow. Where should I start?",
    "I want to clean up old git branches.",
    "I get a CORS error in the browser. How do I fix it?",
    "How do I fix 'Object is possibly undefined' in TypeScript?",
  ],
};

// 보고서 요청: 한국어 규칙은 보고서 기준을 report.md 로 분리했으므로 실제로 읽는지 확인한다.
const reportPrompts = [
  "이번 주 로그인 오류 대응 결과를 팀장님께 올릴 주간 보고서로 써 줘. 원인은 토큰 만료 검사 누락, 수정은 완료, 배포는 다음 주 화요일 예정.",
  "결제 모듈 리팩터링 검토 결과 보고서 작성해 줘. A안은 기존 코드 수정, B안은 새로 작성. 일정과 담당자는 아직 미정.",
];

// 훅을 임시 설정 폴더로 실행해 실제 주입 글을 얻는다(사용자 설정 파일은 건드리지 않음).
// ref 를 주면 그 커밋의 훅·규칙 파일을 임시 폴더에 풀어 같은 방식으로 실행한다.
function rulesFile(lang, ref = null) {
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), "gti-cfg-"));
  fs.writeFileSync(path.join(cfg, ".get-to-it-always"), "");
  if (lang === "ko") fs.writeFileSync(path.join(cfg, ".get-to-it-lang"), "ko");
  let pluginRoot = root;
  if (ref) {
    pluginRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gti-ref-"));
    for (const f of ["hooks/always-on.mjs", "skills/get-to-it/SKILL.md", "skills/get-to-it/references/ko/rules.md"]) {
      const text = spawnSync("git", ["show", `${ref}:${f}`], { cwd: root, encoding: "utf8" }).stdout;
      fs.mkdirSync(path.dirname(path.join(pluginRoot, f)), { recursive: true });
      fs.writeFileSync(path.join(pluginRoot, f), text);
    }
  }
  const out = spawnSync("node", [path.join(pluginRoot, "hooks", "always-on.mjs")], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: cfg },
    encoding: "utf8",
  }).stdout;
  if (!out) throw new Error(`hook produced no text for ${lang} ${ref ?? ""}`);
  const file = path.join(cfg, "rules.txt");
  fs.writeFileSync(file, out);
  return file;
}

// 보고체가 아닌 문장 끝(코드 제외)이 들어간 줄 수.
const formalLines = (text) =>
  text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]*`/g, "")
    .split(/\r?\n/)
    .filter((l) => /(습니다|입니다|합니다|해요|세요)(?=[.!?)\s]|$)/.test(l)).length;

// 도구를 모두 끄면 모델이 없는 도구를 반복 호출해 실행 1건에 10만 토큰 넘게 쓰는 일이 생긴다.
// 실제 Claude Code 처럼 읽기 전용 도구만 허용한다. API 오류 답변은 최대 2번 다시 실행한다.
function run(prompt, appendFile) {
  const args = ["-p", prompt, "--output-format", "stream-json", "--verbose", "--setting-sources", "", "--strict-mcp-config", "--tools", "Read,Glob,Grep", "--no-session-persistence"];
  if (appendFile) args.push("--append-system-prompt-file", appendFile);
  let result, reads;
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = spawnSync("claude", args, { cwd: work, encoding: "utf8", maxBuffer: 1 << 27 });
    const events = r.stdout.split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return {}; } });
    result = events.find((e) => e.type === "result");
    reads = events
      .filter((e) => e.type === "assistant")
      .flatMap((e) => e.message?.content ?? [])
      .filter((c) => c.type === "tool_use" && c.name === "Read")
      .map((c) => String(c.input?.file_path ?? ""));
    if (result && !result.is_error && !String(result.result).startsWith("API Error")) break;
  }
  if (!result || result.is_error || String(result.result).startsWith("API Error")) throw new Error(`API error: ${prompt}`);
  const u = result.usage;
  const thinking = u.output_tokens_details?.thinking_tokens ?? 0;
  return {
    model: Object.keys(result.modelUsage ?? {})[0] ?? null,
    turns: result.num_turns,
    inputUncached: u.input_tokens,
    cacheWrite: u.cache_creation_input_tokens,
    cacheRead: u.cache_read_input_tokens,
    input: u.input_tokens + u.cache_creation_input_tokens + u.cache_read_input_tokens,
    output: u.output_tokens,
    answer: u.output_tokens - thinking,
    thinking,
    cost: result.total_cost_usd,
    chars: result.result.length,
    formalLines: formalLines(result.result),
    readReport: reads.some((p) => p.replaceAll("\\", "/").endsWith("references/ko/report.md")),
  };
}

const conditions = {
  ko: [["off", null], ...(baseRef ? [["base", rulesFile("ko", baseRef)]] : []), ["on", rulesFile("ko")]],
  en: [["off", null], ["on", rulesFile("en")]],
};

const runs = [];
for (const lang of ["ko", "en"]) {
  prompts[lang].forEach((prompt, i) => {
    for (const [mode, file] of conditions[lang]) {
      const r = run(prompt, file);
      runs.push({ lang, kind: "question", id: i + 1, mode, prompt, ...r });
      console.log(lang, i + 1, mode, "input", r.input, "read", r.cacheRead, "answer", r.answer, "cost", r.cost, "formal", r.formalLines);
    }
  });
}
const onKo = conditions.ko.find(([m]) => m === "on")[1];
reportPrompts.forEach((prompt, i) => {
  const r = run(prompt, onKo);
  runs.push({ lang: "ko", kind: "report", id: i + 1, mode: "on", prompt, ...r });
  console.log("report", i + 1, "readReport", r.readReport, "formal", r.formalLines, "turns", r.turns);
});

const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const keys = ["input", "inputUncached", "cacheWrite", "cacheRead", "output", "answer", "thinking", "chars", "cost"];
const summary = {};
for (const lang of ["ko", "en"]) {
  summary[lang] = {};
  for (const [mode] of conditions[lang]) {
    const xs = runs.filter((r) => r.lang === lang && r.kind === "question" && r.mode === mode);
    summary[lang][mode] = Object.fromEntries(keys.map((k) => [k, k === "cost" ? +avg(xs.map((r) => r[k])).toFixed(5) : Math.round(avg(xs.map((r) => r[k])))]));
    summary[lang][mode].formalAnswers = xs.filter((r) => r.formalLines > 0).length;
  }
}
summary.report = runs.filter((r) => r.kind === "report").map(({ id, readReport, formalLines, turns }) => ({ id, readReport, formalLines, turns }));

fs.writeFileSync(
  path.join(root, "bench", "results.json"),
  JSON.stringify({ date: new Date().toISOString().slice(0, 10), model: runs[0]?.model, base: baseRef, summary, runs }, null, 2) + "\n",
);
console.log(JSON.stringify(summary, null, 2));
