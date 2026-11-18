// 토큰 사용량 측정: 같은 질문을 get-to-it 끔·켬 두 조건으로 실행해 usage 를 비교한다.
// 실행: node bench/token-usage.mjs  → bench/results.json
// 조건: 빈 임시 폴더, 사용자 설정·CLAUDE.md·MCP 없음, 읽기 전용 도구만. 켬 조건만 훅이 주입하는 규칙 글을 시스템 프롬프트 뒤에 붙인다.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const work = fs.mkdtempSync(path.join(os.tmpdir(), "gti-bench-"));

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

// 훅을 임시 설정 폴더로 실행해 실제 주입 글을 얻는다(사용자 설정 파일은 건드리지 않음).
function rulesFile(lang) {
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), "gti-cfg-"));
  fs.writeFileSync(path.join(cfg, ".get-to-it-always"), "");
  if (lang === "ko") fs.writeFileSync(path.join(cfg, ".get-to-it-lang"), "ko");
  const out = spawnSync("node", [path.join(root, "hooks", "always-on.mjs")], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: cfg },
    encoding: "utf8",
  }).stdout;
  if (!out) throw new Error(`hook produced no text for ${lang}`);
  const file = path.join(cfg, "rules.txt");
  fs.writeFileSync(file, out);
  return file;
}

// 도구를 모두 끄면 모델이 없는 도구를 반복 호출해 실행 1건에 10만 토큰 넘게 쓰는 일이 생긴다.
// 실제 Claude Code 처럼 읽기 전용 도구만 허용한다. API 오류 답변은 최대 2번 다시 실행한다.
function run(prompt, appendFile) {
  const args = ["-p", prompt, "--output-format", "json", "--setting-sources", "", "--strict-mcp-config", "--tools", "Read,Glob,Grep", "--no-session-persistence"];
  if (appendFile) args.push("--append-system-prompt-file", appendFile);
  let j;
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = spawnSync("claude", args, { cwd: work, encoding: "utf8", maxBuffer: 1 << 26 });
    j = JSON.parse(r.stdout);
    if (!j.is_error && !String(j.result).startsWith("API Error")) break;
  }
  if (j.is_error || String(j.result).startsWith("API Error")) throw new Error(`API error: ${prompt}`);
  const u = j.usage;
  const thinking = u.output_tokens_details?.thinking_tokens ?? 0;
  return {
    model: Object.keys(j.modelUsage ?? {})[0] ?? null,
    input: u.input_tokens + u.cache_creation_input_tokens + u.cache_read_input_tokens,
    output: u.output_tokens,
    answer: u.output_tokens - thinking,
    thinking,
    turns: j.num_turns,
    chars: j.result.length,
  };
}

const runs = [];
for (const lang of ["ko", "en"]) {
  const file = rulesFile(lang);
  prompts[lang].forEach((prompt, i) => {
    for (const mode of ["off", "on"]) {
      const r = run(prompt, mode === "on" ? file : null);
      runs.push({ lang, id: i + 1, mode, prompt, ...r });
      console.log(lang, i + 1, mode, "input", r.input, "answer", r.answer, "thinking", r.thinking);
    }
  });
}

const avg = (xs) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
const summary = {};
for (const lang of ["ko", "en"]) {
  summary[lang] = {};
  for (const mode of ["off", "on"]) {
    const xs = runs.filter((r) => r.lang === lang && r.mode === mode);
    summary[lang][mode] = {
      input: avg(xs.map((r) => r.input)),
      answer: avg(xs.map((r) => r.answer)),
      thinking: avg(xs.map((r) => r.thinking)),
      output: avg(xs.map((r) => r.output)),
      chars: avg(xs.map((r) => r.chars)),
    };
  }
}

fs.writeFileSync(
  path.join(root, "bench", "results.json"),
  JSON.stringify({ date: new Date().toISOString().slice(0, 10), model: runs[0]?.model, summary, runs }, null, 2) + "\n",
);
console.log(JSON.stringify(summary, null, 2));
