// 실행: node tests/run.mjs  (의존성 없음, 전부 통과하면 exit 0)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hook = path.join(root, "hooks", "always-on.mjs");
const skillDir = path.join(root, "skills", "get-to-it");
const enSkillPath = path.join(skillDir, "SKILL.md"); // 영어 규칙(기본)
const writingPath = path.join(skillDir, "references", "writing.md");
const skillPath = path.join(skillDir, "references", "ko", "rules.md"); // 한국어 규칙
const koRulesPath = path.join(skillDir, "references", "ko", "korean-rules.md");
const enReadmePath = path.join(root, "README.md"); // 메인 = 영어
const readmePath = path.join(root, "README.ko.md"); // 한국어
const readmes = [enReadmePath, readmePath];
// Claude Code 훅 출력 주입 한도 10000자. 설치 경로가 저장소 경로보다 길어지는 만큼 300자를 남긴다.
const MAX_INJECTED_CHARS = 10000 - 300;
const ALWAYS = ".get-to-it-always";
const LANG = ".get-to-it-lang";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "get-to-it-"));
const runHook = (file, configDir) =>
  spawnSync(process.execPath, [file], {
    encoding: "utf8",
    env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
  });
// 설정 파일을 만든 설정 폴더에서 훅을 돌린다. 값이 null 이면 그 파일을 만들지 않는다.
const inject = ({ always = true, lang = null } = {}) => {
  const dir = fs.mkdtempSync(path.join(tmp, "cfg-"));
  if (always) fs.writeFileSync(path.join(dir, ALWAYS), "");
  if (lang !== null) fs.writeFileSync(path.join(dir, LANG), lang);
  return runHook(hook, dir);
};
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const read = (f) => fs.readFileSync(f, "utf8");
const trackedFiles = () =>
  spawnSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).stdout.split(/\r?\n/).filter((f) => f && fs.existsSync(path.join(root, f)));
const refPaths = (stdout) => [...stdout.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]).filter((s) => s.includes("/references/") && s.endsWith(".md"));
const commands = (t) =>
  [...new Set(t.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^(\/plugin|\/get-to-it|claude plugin|node tests|touch|rm -f|New-Item|Remove-Item|echo|Set-Content)/.test(l)))].sort();
const COMMA_AFTER_CONNECTIVE = /(하고|했고|되고|이고|않고|남기고|맞추고|녹이고|줄이고|빼고|넣고|하며|지만|면서|아서|어서|해서),\s/;
const utf16 = (s) => Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(s, "utf16le")]);

const tests = {
  "플래그가 없으면 아무것도 주입하지 않는다"() {
    for (const opts of [{ always: false }, { always: false, lang: "ko" }]) {
      const r = inject(opts);
      assert.equal(r.status, 0);
      assert.equal(r.stdout, "");
    }
  },
  "언어 설정이 없으면 머리말 없이 영어 규칙을 주입한다"() {
    for (const lang of [null, "en\n", "모름"]) {
      const r = inject({ lang });
      assert.equal(r.status, 0);
      assert.match(r.stdout, /^GET-TO-IT on \(always\)/, String(lang));
      assert.match(r.stdout, /Language: English \(default\)/);
      assert.match(r.stdout, /## Before you send/);
      assert.ok(!r.stdout.includes("## 보내기 전 점검"), String(lang));
      assert.doesNotMatch(r.stdout, /disable-model-invocation/);
    }
  },
  "언어 설정이 ko 면 한국어 규칙을 주입한다(PowerShell 5 의 UTF-16·BOM 포함)"() {
    for (const lang of ["ko\n", "﻿KO\r\n", utf16("ko\r\n")]) {
      const { stdout } = inject({ lang });
      assert.match(stdout, /^GET-TO-IT 켜짐\(상시\)/, String(lang));
      assert.match(stdout, /한국어 설정\(/);
      assert.match(stdout, /## 보내기 전 점검/);
      assert.ok(!stdout.includes("## Before you send"), String(lang));
    }
  },
  "주입문은 언어마다 훅 출력 한도 안에 들어간다"() {
    for (const lang of [null, "ko"]) {
      const { stdout } = inject({ lang });
      assert.ok(stdout.length < MAX_INJECTED_CHARS, `${lang}: ${stdout.length}자`);
    }
  },
  "주입문의 참조 경로는 실제 파일을 가리킨다"() {
    for (const [lang, want] of [
      [null, ["references/ko/rules.md", "references/writing.md"]],
      ["ko", ["references/ko/korean-rules.md"]],
    ]) {
      const { stdout } = inject({ lang });
      assert.doesNotMatch(stdout, /\$\{CLAUDE_SKILL_DIR\}/);
      const refs = refPaths(stdout);
      for (const w of want) assert.ok(refs.some((r) => r.endsWith(w)), `${lang}: ${w}`);
      for (const r of refs) assert.ok(fs.existsSync(r), r);
    }
  },
  "회사어투가 유일한 어투이고 옛 어투 설정 파일은 무시한다"() {
    const dir = fs.mkdtempSync(path.join(tmp, "cfg-"));
    fs.writeFileSync(path.join(dir, ALWAYS), "");
    fs.writeFileSync(path.join(dir, ".get-to-it-tone"), "plain");
    const en = runHook(hook, dir).stdout;
    assert.match(en, /^## 3\. Company tone$/m);
    fs.writeFileSync(path.join(dir, LANG), "ko");
    const ko = runHook(hook, dir).stdout;
    assert.match(ko, /^## 3장\. 회사어투$/m);
    for (const s of [en, ko]) assert.doesNotMatch(s, /일반어투|plain tone|Plain tone|company-tone\.md|get-to-it-tone/);
  },
  "규칙 파일이 없어도 세션 시작을 막지 않는다"() {
    const plugin = fs.mkdtempSync(path.join(tmp, "broken-"));
    fs.mkdirSync(path.join(plugin, "hooks"));
    const copy = path.join(plugin, "hooks", "always-on.mjs");
    fs.copyFileSync(hook, copy);
    for (const lang of [null, "ko"]) {
      const dir = fs.mkdtempSync(path.join(tmp, "cfg-"));
      fs.writeFileSync(path.join(dir, ALWAYS), "");
      if (lang) fs.writeFileSync(path.join(dir, LANG), lang);
      const r = runHook(copy, dir);
      assert.equal(r.status, 0);
      assert.equal(r.stdout, "");
    }
  },
  "영어 규칙이 언어 전환과 한국어 규칙 파일을 안내한다"() {
    const rule = read(enSkillPath);
    for (const say of ['"Korean mode"', '"한국어 모드"', '"normal mode"', '"stop get-to-it"']) assert.ok(rule.includes(say), say);
    assert.match(rule, /English is the default/);
    assert.match(rule, /`\$\{CLAUDE_SKILL_DIR\}\/references\/ko\/rules\.md`/);
    // 한국어 규칙 파일 안의 ${CLAUDE_SKILL_DIR} 을 읽는 법을 알려 준다(슬래시 명령으로 켰을 때)
    assert.match(rule, /the placeholder CLAUDE_SKILL_DIR means `\$\{CLAUDE_SKILL_DIR\}`/);
    for (const head of ["## 1. Reply shape", "## 2. Plain words", "## 3. Company tone", "## 4. When to break the rules", "## Before you send"]) {
      assert.ok(rule.includes(head), head);
    }
    assert.match(rule, /Write a "Next:" line only when the user has something to do/);
    assert.match(rule, /Never invent one/);
    assert.match(rule, /Keep words that link cause, contrast and order/);
    assert.match(rule, /qualifiers like "only", "at most" and "about"/);
    assert.match(read(writingPath), /Return natural text as it is/);
    assert.match(read(writingPath), /Lead with the text to paste/);
  },
  "한국어 규칙이 영어 전환을 안내한다"() {
    const { stdout } = inject({ lang: "ko" });
    for (const say of ['"English mode"', '"영어 모드"', '"get-to-it 꺼"']) assert.ok(stdout.includes(say), say);
    const en = [...stdout.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]).find((s) => s.endsWith("/SKILL.md"));
    assert.ok(en, "영어 규칙 경로 없음");
    assert.ok(fs.existsSync(en), en);
  },
  "영어 회사어투 규칙은 상태 문구·표 정리·상태 구분을 명시하고 고친 쪽은 대화체가 아니다"() {
    const rule = read(enSkillPath).split("## 3. Company tone")[1].split(/^## /m)[0];
    assert.match(rule, /"X done", "X needed", "X scheduled", "X requested"/);
    assert.match(rule, /Comparisons in tables/);
    assert.match(rule, /Keep done, in progress and under review apart/);
    assert.match(rule, /never mark unverified work "done"/);
    assert.match(rule, /"Reason:" holds only confirmed causes/);
    assert.match(rule, /Words stay the plain ones people use at work/);
    const rows = rule.split(/\r?\n/).filter((l) => /^\| /.test(l)).slice(1);
    assert.ok(rows.length >= 5);
    for (const row of rows) assert.doesNotMatch(row.split("|")[2].trim(), /^(I|We|You|Could|Should|Would)\b|[.?]$/, row);
  },
  "회사어투 규칙은 금지 어미·표 정리·상태 구분·적용 범위를 명시한다"() {
    const rule = read(skillPath).split("## 3장. 회사어투")[1].split(/^## /m)[0];
    assert.match(rule, /"~입니다", "~습니다", "~합니다", "~한다", "~할 수 있습니다"/);
    assert.match(rule, /"~함".*"~완료".*"~적용".*"~확인 필요"/);
    assert.match(rule, /항목별 비교는 표로 정리/);
    assert.match(rule, /적용 완료, 진행 중, 검토 중/);
    assert.match(rule, /확인되지 않은 내용 추측 금지/);
    assert.match(rule, /"사유:"에는 확인된 원인만 기재/);
    assert.match(rule, /점검만 한 일을 결함 발견처럼 표기 금지/);
    assert.match(rule, /기술 용어, 수치, 검증 결과는 원문 의미 유지/);
    assert.match(rule, /1·2·4·5장과 보내기 전 점검도 그대로 적용/);
    assert.match(rule, /사용자의 반말·존댓말과 무관하게 보고체 유지/);
    assert.match(rule, /\| 커밋 메시지, 코드 주석 \| 저장소 관례 \|/);
    assert.match(rule, /\| 메일, 공지, README, 문서 \| 장르의 격식 \|/);
    assert.match(rule, /단어는 회사에서 실제로 쓰는 쉬운 말 사용/);
    const skill = read(skillPath);
    assert.match(skill, /\*\*명확하게 쓴다\.\*\*/);
    assert.match(skill, /누가 무엇을 했는지와 요점이 보이는지 확인한다/);
    assert.match(rule, /명사 4개 이상 연속 금지/);
  },
  "회사어투 예시의 고친 쪽은 금지한 어미로 끝나지 않는다"() {
    const rows = read(skillPath).split("## 3장. 회사어투")[1].split(/^## /m)[0].split(/\r?\n/).filter((l) => /^\| /.test(l) && !/^\| (대상|쓰지 않음|낯선 말|---)/.test(l));
    assert.ok(rows.length >= 10);
    for (const row of rows) assert.doesNotMatch(row.split("|")[2].trim(), /(입니다|습니다|합니다|한다|해요|까요\?)$/, row);
  },
  "매니페스트와 스킬 이름이 일치하고 마켓플레이스 규칙을 지킨다"() {
    const plugin = readJson(".claude-plugin/plugin.json");
    const market = readJson(".claude-plugin/marketplace.json");
    assert.equal(plugin.name, "get-to-it");
    assert.match(plugin.name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.equal(market.name, plugin.name);
    assert.equal(market.plugins[0].name, plugin.name);
    assert.equal(plugin.repository, "https://github.com/evelynn/get-to-it");
    const frontmatter = read(enSkillPath).split("---")[1];
    assert.match(frontmatter, new RegExp(`^name: ${plugin.name}$`, "m"));
    // 한국어 규칙은 스킬로 따로 잡히지 않도록 머리말이 없다
    assert.ok(!read(skillPath).startsWith("---"));
  },
  "SKILL.md 설명이 플러그인 스킬 호출명을 쓴다"() {
    const frontmatter = read(enSkillPath).split("---")[1];
    assert.match(frontmatter, /\/get-to-it:get-to-it/);
    assert.doesNotMatch(frontmatter, /\/get-to-it(?!:)/);
  },
  "LICENSE 밖에는 ADHD·i-have-adhd 언급이 없다"() {
    for (const file of trackedFiles().filter((f) => f !== "LICENSE" && !f.startsWith("tests/") && !f.endsWith(".png"))) {
      assert.doesNotMatch(read(path.join(root, file)), /adhd/i, file);
    }
  },
  "옛 이름(korean-adhd)이 공개 파일에 남지 않는다"() {
    for (const file of trackedFiles().filter((f) => !f.startsWith("tests/"))) {
      assert.doesNotMatch(read(path.join(root, file)), /korean-adhd|Korean-Adhd|KOREAN-ADHD/, file);
    }
  },
  "한국어 규칙 문서가 스스로 연결어미 뒤 쉼표를 쓰지 않는다"() {
    const lines = [skillPath, koRulesPath].flatMap((f) => read(f).split(/\r?\n/));
    const hits = lines.filter((l) => COMMA_AFTER_CONNECTIVE.test(l) && !l.includes("찍지 않는다"));
    assert.deepEqual(hits, []);
  },
  "세 원작의 MIT 저작권 표시를 유지한다"() {
    const license = read(path.join(root, "LICENSE"));
    assert.match(license, /Ayoub Ghriss/);
    assert.match(license, /epoko77-ai/);
    assert.match(license, /Copyright \(c\) 2026 K-Humanizer contributors/);
    assert.match(license, /github\.com\/evergreentree97\/K-Humanizer/);
  },
  "윤문 규칙이 고칠 이유·자연스러운 글 유지·결과 반환·연결 보존을 명시한다"() {
    const rule = read(skillPath);
    assert.match(rule, /윤문은 다섯 가지를 지킨다/);
    assert.match(rule, /고칠 이유를 댈 수 있는 곳만 고친다/);
    assert.match(rule, /이미 자연스러운 글은 그대로 돌려준다/);
    assert.match(rule, /결과는 붙여 넣을 글부터 쓴다/);
    assert.match(rule, /원인·대비·순서를 잇는 말은 줄일 때도 남긴다/);
    assert.match(rule, /"만·최대·약" 같은 한정어/);
    assert.match(rule, /영어를 한국어로 옮기거나 번역을 원문과 대조/);
  },
  "일반어투 없이 회사어투 한 가지로 쓰고 사실·연결 보존은 2장에 둔다"() {
    const rule = read(skillPath);
    const at = (s) => {
      const i = rule.indexOf(s);
      assert.ok(i >= 0, s);
      return i;
    };
    const ch2 = at("## 2장. 한국어 문장");
    const ch3 = at("## 3장. 회사어투");
    const ch4 = at("## 4장.");
    assert.ok(ch2 < ch3 && ch3 < ch4);
    assert.doesNotMatch(rule, /일반어투|회사어투 꺼|회사어투 켜/);
    const toneFree = at("사용자의 반말·존댓말과 무관하게 보고체 유지");
    assert.ok(ch3 < toneFree && toneFree < ch4);
    for (const s of ["원인·대비·순서를 잇는 말은 줄일 때도 남긴다", "\"만·최대·약\" 같은 한정어"]) {
      const i = at(s);
      assert.ok(ch2 < i && i < ch3, s);
    }
    // 1장의 "좋음" 예시와 답변 예시도 회사어투로 쓴다
    for (const s of ["토큰 검증 수정 필요", "다음: 처음 실패한 줄 전달 요청", "이어서 처리 여부 선택 요청", "매직 링크 로그인 적용 완료", "요청에 헤더 추가 필요"]) {
      const i = at(s);
      assert.ok(i < ch2, s);
    }
  },
  "긴 글 규칙이 번역·읽는 사람 기준·연결 관계를 담고 출처를 밝힌다"() {
    const rules = read(koRulesPath);
    assert.match(rules, /\[K-Humanizer\]\(https:\/\/github\.com\/evergreentree97\/K-Humanizer\)/);
    assert.match(rules, /커밋 `c24b2c5`/);
    // 회사어투 보고서와 부딪히는 산문 리듬 규칙은 회사어투로 넘긴다
    const note = rules.split(/\r?\n/).find((l) => l.startsWith("**업무 보고서.**")) ?? "";
    for (const id of ["C-2", "C-9", "E-1", "E-2", "F-4", "rules.md` 3장"]) assert.ok(note.includes(id), id);
    assert.ok(rules.indexOf(note) < rules.indexOf("## A. 번역투"));
    for (const head of ["고칠지 판단하기", "## K. 번역·현지화", "## L. 읽는 사람 기준", "## M. 연결 관계", "## 장르별 기준", "## 결과 돌려주기"]) {
      assert.ok(rules.includes(head), head);
    }
    const ids = (p, n) => Array.from({ length: n }, (_, i) => `**${p}-${i + 1}**`);
    for (const id of [...ids("K", 8), ...ids("L", 9), ...ids("M", 5), ...ids("N", 9), ...ids("O", 5)]) assert.ok(rules.includes(id), id);
    // 점검 목록은 번호가 끊기지 않는다
    const checks = rules.split("## 다 쓴 뒤 점검")[1].match(/^\d+\./gm).map((s) => parseInt(s, 10));
    assert.deepEqual(checks, Array.from({ length: checks.length }, (_, i) => i + 1));
    assert.ok(checks.length >= 10);
  },
  "회사어투 보고서 양식 글은 N절(회사 보고서)을 따르고 고친 쪽은 명사형으로 끝난다"() {
    const rules = read(koRulesPath);
    const company = read(skillPath).split("## 3장. 회사어투")[1].split(/^## /m)[0];
    assert.match(company, /`korean-rules\.md` N절\(회사 보고서\) 추가 적용/);
    assert.match(company, /영어 보고서식 표현·번역투 금지/);
    const n = rules.split("## N. 회사 보고서 (회사어투)")[1]?.split(/^## /m)[0] ?? "";
    assert.doesNotMatch(n, /일반어투/);
    assert.match(n, /마크다운 `##` 제목 아래 `-` 불릿/);
    assert.match(n, /사용자가 준 양식, 이전 보고서, 사내 예시가 있으면/);
    assert.match(n, /원문이나 사용자가 준 값만 쓴다/);
    const rows = n.split(/\r?\n/).filter((l) => /^\| /.test(l)).slice(1);
    assert.ok(rows.length >= 8);
    for (const row of rows) {
      const fixed = row.split("|")[2].trim();
      assert.doesNotMatch(fixed, /(입니다|습니다|합니다|한다|해요|에 대한|를 통해|에 의해|에 있어서|들)$/, row);
      assert.doesNotMatch(fixed, /에 대한|을 통해|를 통해|에 의해|에 있어서|우리는/, row);
    }
  },
  "README 는 소개·설치·언어·회사어투·예시·켜고 끄기·라이선스만 둔다"() {
    const heads = (f) => [...read(f).matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    assert.deepEqual(heads(enReadmePath), ["Install", "Language", "Company tone", "Examples", "Turning it on and off", "License"]);
    assert.deepEqual(heads(readmePath), ["설치", "언어", "회사어투", "적용 예시", "켜기와 끄기", "라이선스"]);
    for (const f of readmes) {
      const t = read(f);
      assert.match(t, /^# get-to-it$/m, f);
      assert.match(t, /\/plugin marketplace add evelynn\/get-to-it/, f);
      assert.match(t, /\/get-to-it:get-to-it/, f);
      assert.match(t, /\.get-to-it-lang/, f);
      assert.doesNotMatch(t, /get-to-it-tone|일반어투|plain tone|README\.ko-plain/i, f);
      // 원작 참조는 LICENSE 에만 둔다
      assert.doesNotMatch(t, /im-not-ai|K-Humanizer|Zonder|zonderlabs|github\.com\/ayghri/, f);
    }
  },
  "두 README 가 서로 연결되고 제목 수와 명령이 같다"() {
    const [en, ko] = readmes.map(read);
    assert.match(ko, /\[English\]\(README\.md\)/);
    assert.match(en, /\[한국어\]\(README\.ko\.md\)/);
    assert.ok(!fs.existsSync(path.join(root, "README.ko-plain.md")));
    const count = (t) => [...t.matchAll(/^##+ /gm)].length;
    assert.equal(count(en), count(ko));
    assert.deepEqual(commands(en), commands(ko));
    for (const anchor of en.matchAll(/\]\(#([^)]+)\)/g)) {
      assert.ok(new RegExp("^##+ " + anchor[1].replaceAll("-", " ") + "$", "im").test(en), anchor[1]);
    }
  },
  "README 의 규칙 파일 링크가 실제 경로를 가리킨다"() {
    for (const f of readmes) {
      for (const m of read(f).matchAll(/\]\(((?:skills|LICENSE)[^)#]*)\)/g)) assert.ok(fs.existsSync(path.join(root, m[1])), `${f}: ${m[1]}`);
    }
  },
  "한국어 README 가 연결어미 뒤 쉼표를 쓰지 않는다"() {
    const hits = [readmePath].flatMap((f) => read(f).split(/\r?\n/)).filter((l) => COMMA_AFTER_CONNECTIVE.test(l));
    assert.deepEqual(hits, []);
  },
  "회사어투 README 는 예시까지 금지 어미를 쓰지 않는다"() {
    // 비교 기준인 "이전:"·"일반 답변:" 인용과 표의 왼쪽 칸만 제외
    const body = read(readmePath)
      .replace(/```[\s\S]*?```/g, "")
      .replace(/(이전|일반 답변):(\r?\n)+(>.*(\r?\n))+/g, "");
    const hits = body
      .split(/\r?\n/)
      .map((l) => (l.startsWith("|") ? l.split("|").at(-2) ?? "" : l))
      .filter((l) => /(입니다|습니다|합니다|한다|해요|세요|까요\?)\.?(\s|$)/.test(l));
    assert.deepEqual(hits, []);
  },
  "영어 README 는 예시까지 영어로 쓴다"() {
    // 언어 전환 링크와 사용자가 그대로 입력하는 문구만 한글 허용
    const rest = read(enReadmePath)
      .replace("[한국어](README.ko.md)", "");
    const hits = rest.split(/\r?\n/).filter((l) => /[가-힣]/.test(l));
    assert.deepEqual(hits, []);
  },
  "규칙이 '다음:' 줄을 필요할 때만 쓰도록 한다"() {
    const rule = read(skillPath);
    assert.match(rule, /"다음:" 줄은 사용자가 할 일이 실제로 있을 때만 쓴다/);
    assert.match(rule, /억지로 만들지 않는다/);
    assert.doesNotMatch(rule, /끝 줄의 "다음:"은 그대로 쓴다|일이 완전히 끝났을 때만 뺀다/);
  },
  "문서가 '상투구'·'AI 관용구' 대신 'AI 특유의 표현'을 쓴다"() {
    for (const file of trackedFiles().filter((f) => !f.startsWith("tests/"))) {
      assert.doesNotMatch(read(path.join(root, file)), /상투구|AI 관용구/, file);
    }
  },
  "훅 명령은 인라인 코드 없이 플러그인 안의 파일을 실행한다(디렉터리 제출 조건)"() {
    const cmds = readJson("hooks/hooks.json").hooks.SessionStart.flatMap((m) => m.hooks.map((h) => h.command));
    assert.deepEqual(cmds, ['node "${CLAUDE_PLUGIN_ROOT}/hooks/always-on.mjs"']);
  },
  "플러그인 아이콘이 512px 이상 정사각 PNG 다"() {
    const buf = fs.readFileSync(path.join(root, ".claude-plugin", "icon.png"));
    assert.equal(buf.toString("latin1", 1, 4), "PNG");
    const [w, h] = [buf.readUInt32BE(16), buf.readUInt32BE(20)];
    assert.equal(w, h);
    assert.ok(w >= 512 && w <= 2048);
  },
  "공개되는 파일에 로컬 경로·개인 메일·사설 IP 가 없다"() {
    const files = trackedFiles();
    assert.ok(files.length > 0);
    for (const file of files) {
      if (file.endsWith(".png")) {
        // 이미지 바이트는 우연히 경로 패턴과 겹친다. 대신 텍스트 메타데이터 청크가 없는지 본다.
        const latin = fs.readFileSync(path.join(root, file)).toString("latin1");
        assert.doesNotMatch(latin, /tEXt|iTXt|zTXt|eXIf/, file);
        continue;
      }
      const text = read(path.join(root, file));
      assert.doesNotMatch(text, /[A-Za-z]:[\\/]\w/, file);
      assert.doesNotMatch(text, /@(gmail|naver|daum|hanmail)\.(com|net)/, file);
      assert.doesNotMatch(text, /\b(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)\b/, file);
    }
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}: ${e.message}`);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${Object.keys(tests).length - failed}/${Object.keys(tests).length} PASS`);
process.exit(failed ? 1 : 0);
