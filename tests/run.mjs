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
const skillPath = path.join(skillDir, "references", "ko", "rules.md"); // 한국어 규칙
const longDir = path.join(root, "skills", "long-form"); // 긴 글·윤문·번역 스킬
const longSkillPath = path.join(longDir, "SKILL.md");
const longKoPath = path.join(longDir, "references", "ko.md");
const defectsPath = path.join(root, "shared", "defects.md"); // 두 스킬 공통 결함 진단표
const defectsKoPath = path.join(root, "shared", "defects.ko.md");
const koDocs = [skillPath, longKoPath, defectsKoPath];
const ruleDocs = [enSkillPath, longSkillPath, defectsPath, ...koDocs];
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
const refPaths = (stdout) => [...stdout.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]).filter((s) => path.isAbsolute(s) && s.endsWith(".md"));
// 규칙 파일 안의 `${CLAUDE_SKILL_DIR}/...md` 참조를 그 파일의 스킬 폴더 기준 실제 경로로 푼다.
const skillRefs = (file, dir) =>
  [...read(file).matchAll(/`\$\{CLAUDE_SKILL_DIR\}\/([^`\n]+\.md)`/g)].map((m) => path.join(dir, m[1]));
// 보고체가 아닌 문장 끝. 따옴표 안 예문과 코드는 제외한다.
const plainEndings = (file, { tables }) =>
  read(file)
    .split(/\r?\n/)
    .filter((l) => tables || !l.startsWith("|"))
    .map((l) => l.replace(/"[^"]*"/g, "").replace(/`[^`]*`/g, ""))
    .filter((l) => /(니다|한다|된다|는다|해요|세요|까요)[.?]?(\s|\||$)|[가-힣]다\.(\s|$)/.test(l));
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
      [null, ["references/ko/rules.md", "long-form/SKILL.md", "shared/defects.md"]],
      ["ko", ["get-to-it/SKILL.md", "long-form/SKILL.md", "long-form/references/ko.md", "shared/defects.ko.md"]],
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
    assert.match(rule, /apply the same rules in that language's own business style/);
    assert.match(rule, /\*\*Work reports\.\*\*/);
  },
  "한국어 규칙이 영어 전환을 안내한다"() {
    const { stdout } = inject({ lang: "ko" });
    for (const say of ['"English mode"', '"영어 모드"', '"get-to-it 꺼"']) assert.ok(stdout.includes(say), say);
    const en = [...stdout.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]).find((s) => s.endsWith("/get-to-it/SKILL.md"));
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
    // 새로 쓰는 긴 글도 보고체가 기본이고 다른 어체는 요청할 때만 쓴다
    assert.match(rule, /\| 새로 쓰는 문서, README, 공지, 메일 \| 회사 보고서 보고체 \|/);
    assert.match(rule, /\| 사용자가 어체를 지정한 글 \| 지정한 어체 \|/);
    assert.match(rule, /다른 어체는 사용자가 따로 요청할 때만 사용/);
    assert.doesNotMatch(read(skillPath), /장르의 격식/);
    assert.match(rule, /단어는 회사에서 실제로 쓰는 쉬운 말 사용/);
    const skill = read(skillPath);
    assert.match(skill, /\*\*명확하게\.\*\*/);
    assert.match(skill, /누가 무엇을 했는지와 요점이 보이는지 확인/);
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
    assert.match(read(longSkillPath).split("---")[1], /^name: long-form$/m);
    // 한국어 규칙과 공통 진단표는 스킬로 따로 잡히지 않도록 머리말이 없다
    for (const f of [skillPath, longKoPath, defectsPath, defectsKoPath]) assert.ok(!read(f).startsWith("---"), f);
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
    const hits = koDocs.flatMap((f) => read(f).split(/\r?\n/)).filter((l) => COMMA_AFTER_CONNECTIVE.test(l));
    assert.deepEqual(hits, []);
  },
  "세 원작의 MIT 저작권 표시를 유지한다"() {
    const license = read(path.join(root, "LICENSE"));
    assert.match(license, /Ayoub Ghriss/);
    assert.match(license, /epoko77-ai/);
    assert.match(license, /Copyright \(c\) 2026 K-Humanizer contributors/);
    assert.match(license, /github\.com\/evergreentree97\/K-Humanizer/);
  },
  "긴 글 스킬이 고칠 이유·자연스러운 글 유지·결과 반환·질문 범위를 명시한다"() {
    const rule = read(longSkillPath);
    for (const head of ["## 1. Identify the task", "## 2. Read the situation", "## 3. Write", "## 4. Protect facts and commitments", "## 5. Stop when the text works", "## 6. By genre", "## 7. Return the result", "## Final check"]) {
      assert.ok(rule.includes(head), head);
    }
    assert.match(rule, /An edit to supplied text needs a problem you can name/);
    assert.match(rule, /Text that already reads naturally goes back unchanged/);
    assert.match(rule, /changed more than 30%/);
    assert.match(rule, /Lead with the text, ready to paste/);
    assert.match(rule, /don't silently pick one/);
    assert.match(rule, /ask one question per missing fact/);
    assert.match(rule, /notes and questions in the language of the request/);
    // 업무 보고서는 get-to-it 회사어투로 넘긴다
    assert.match(rule, /Work reports and status updates follow get-to-it's company tone/);
    const checks = rule.split("## Final check")[1].match(/^\d+\./gm).map((s) => parseInt(s, 10));
    assert.deepEqual(checks, Array.from({ length: checks.length }, (_, i) => i + 1));
    const ko = read(longKoPath);
    for (const head of ["## 1. 어체", "## 2. 영어 → 한국어", "## 3. 글 종류별 기준", "## 4. 고침 예", "## 5. 추가 점검"]) assert.ok(ko.includes(head), head);
    assert.match(ko, /이미 일관된 글을 기본값 때문에 변경 금지/);
    assert.match(ko, /\| 새로 쓰는 글\(문서, README, 메일, 공지, 안내문\) \| 회사어투 보고체/);
    assert.match(ko, /새로 쓰는 글의 어체 변경은 사용자가 따로 요청할 때만/);
    assert.match(ko, /어체는 이 문서 1절이 `SKILL\.md`보다 우선/);
    // 고치지 않고 돌려주는 예시를 둔다
    assert.ok((ko.match(/\| 그대로 반환 \|/g) ?? []).length >= 3);
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
    for (const s of ["원인·대비·순서를 잇는 말은 줄일 때도 유지", "\"만·최대·약\" 같은 한정어"]) {
      const i = at(s);
      assert.ok(ch2 < i && i < ch3, s);
    }
    // 1장의 "좋음" 예시와 답변 예시도 회사어투로 쓴다
    for (const s of ["토큰 검증 수정 필요", "다음: 처음 실패한 줄 전달 요청", "이어서 처리 여부 선택 요청", "매직 링크 로그인 적용 완료", "요청에 헤더 추가 필요"]) {
      const i = at(s);
      assert.ok(i < ch2, s);
    }
  },
  "공통 결함 진단표는 조건부(고침·둘 때)이고 두 언어가 같은 결함을 다룬다"() {
    const ko = read(defectsKoPath);
    for (const head of ["## 적용 원칙", "## 1. 뜻이 달라짐", "## 2. 무슨 말인지 안 보임", "## 3. 번역한 글처럼 읽힘", "## 4. AI가 쓴 글처럼 읽힘", "## 5. 외래어·내부 용어", "## 6. 문단 흐름·문장부호"]) {
      assert.ok(ko.includes(head), head);
    }
    assert.match(ko, /금지어 없음/);
    assert.match(ko, /정확성이 다듬기보다 우선/);
    assert.match(ko, /가능성을 약속으로, 확정을 가능성으로 변경 금지/);
    assert.match(ko, /점검만 한 일을 결함 발견처럼 기재 금지/);
    assert.match(ko, /줄이면서 원인·대비·순서·지시를 잇는 말 삭제 금지/);
    // 진단표 행은 패턴·고침·둘 때 세 칸이다
    const koRows = ko.split(/\r?\n/).filter((l) => l.startsWith("|"));
    assert.ok(koRows.length >= 25);
    for (const row of koRows) assert.equal(row.split("|").length, 5, row);
    assert.equal((ko.match(/\| 둘 때 \|/g) ?? []).length, 2);
    // 탐지용 등급·임계값·원본 번호는 두지 않는다
    assert.doesNotMatch(ko, /\[S[123]\]|\*\*[A-O]-\d+\*\*|\d회\+|실측/);
    const en = read(defectsPath);
    for (const head of ["## How to apply", "## 1. Meaning changed", "## 2. Point hidden", "## 3. Machine-sounding", "## 4. Flow"]) assert.ok(en.includes(head), head);
    assert.match(en, /No word is banned/);
    assert.match(en, /Accuracy comes before polish/);
    assert.match(en, /a possibility must not become a promise, and a commitment must not become a hedge/);
    assert.equal((en.match(/\| Keep when \|/g) ?? []).length, 1);
  },
  "두 스킬이 목적별로 나뉘고 자동 호출되며 공통 진단표를 함께 쓴다"() {
    const [shortFm, longFm] = [enSkillPath, longSkillPath].map((f) => read(f).split("---")[1]);
    for (const fm of [shortFm, longFm]) assert.doesNotMatch(fm, /disable-model-invocation/);
    assert.match(shortFm, /work report, status update or other short business text/);
    assert.match(shortFm, /belong to the long-form skill/);
    assert.match(longFm, /documents, READMEs, email, notices, customer replies, product pages and UI copy/);
    assert.match(longFm, /belong to the get-to-it skill/);
    // 한 건만 쓰려고 불러온 경우 세션 전체에 번지지 않는다
    assert.match(read(enSkillPath), /Loaded for one report or short business text: that text only/);
    assert.match(read(skillPath), /보고서나 짧은 업무 글 한 건 때문에 불러온 경우 그 글에만 적용/);
    // 한국어 규칙(rules.md)의 경로는 get-to-it 스킬 폴더 기준이다
    const refs = [
      [enSkillPath, skillDir, [skillPath, longSkillPath, defectsPath]],
      [skillPath, skillDir, [enSkillPath, longSkillPath, longKoPath, defectsKoPath]],
      [longSkillPath, longDir, [enSkillPath, longKoPath, defectsPath, defectsKoPath]],
    ];
    for (const [file, dir, want] of refs) {
      const got = [...new Set(skillRefs(file, dir))];
      for (const r of got) assert.ok(fs.existsSync(r), `${file}: ${r}`);
      assert.deepEqual(got.sort(), [...want].sort(), file);
    }
  },
  "규칙 문서는 원작 링크 없이 자체 동작하고 목적을 첫머리에 밝힌다"() {
    for (const f of ruleDocs) {
      const t = read(f);
      assert.doesNotMatch(t, /https?:|K-Humanizer|im-not-ai|Zonder|i-have-adhd/i, f);
      assert.match(t.split(/^## /m)[0], /accurately and clearly|정확하고 명확하게 전달|뜻 보존이 다듬기보다 우선/, f);
    }
    assert.ok(!fs.existsSync(path.join(skillDir, "references", "writing.md")));
    assert.ok(!fs.existsSync(path.join(skillDir, "references", "ko", "korean-rules.md")));
  },
  "한국어 규칙 문서는 본문까지 보고체로 쓴다"() {
    // rules.md 의 표는 고침 전후 문장 예시라 제외한다(3장 표는 위 테스트가 본다)
    assert.deepEqual(plainEndings(skillPath, { tables: false }), []);
    assert.deepEqual(plainEndings(longKoPath, { tables: true }), []);
    assert.deepEqual(plainEndings(defectsKoPath, { tables: true }), []);
  },
  "회사어투 보고서 양식 글은 국내 회사 보고서 문체를 따르고 고친 쪽은 명사형으로 끝난다"() {
    const company = read(skillPath).split("## 3장. 회사어투")[1].split(/^## /m)[0];
    const n = company.split("**보고서 양식 글.**")[1] ?? "";
    assert.match(n, /영어 보고서식 표현·번역투 금지/);
    assert.match(n, /마크다운 `##` 제목 아래 `-` 불릿/);
    assert.match(n, /사용자가 준 양식, 이전 보고서, 사내 예시가 있으면/);
    assert.match(n, /원문이나 사용자가 준 값만 기재/);
    assert.match(n, /이미 회사 보고서 문체인 글은 그대로 반환/);
    const rows = n.split(/\r?\n/).filter((l) => /^\| /.test(l)).slice(2);
    assert.ok(rows.length >= 8);
    for (const row of rows) {
      const fixed = row.split("|")[2].trim();
      assert.doesNotMatch(fixed, /(입니다|습니다|합니다|한다|해요|에 대한|를 통해|에 의해|에 있어서|들)$/, row);
      assert.doesNotMatch(fixed, /에 대한|을 통해|를 통해|에 의해|에 있어서|우리는/, row);
    }
  },
  "README 는 소개·스킬 구성·설치·언어·회사어투·예시·켜고 끄기·라이선스만 둔다"() {
    const heads = (f) => [...read(f).matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    assert.deepEqual(heads(enReadmePath), ["Skills", "Install", "Language", "Company tone", "Examples", "Turning it on and off", "License"]);
    assert.deepEqual(heads(readmePath), ["스킬 구성", "설치", "언어", "회사어투", "적용 예시", "켜기와 끄기", "라이선스"]);
    for (const f of readmes) {
      const t = read(f);
      assert.match(t, /^# get-to-it$/m, f);
      assert.match(t, /\/plugin marketplace add evelynn\/get-to-it/, f);
      assert.match(t, /\/get-to-it:get-to-it/, f);
      assert.match(t, /\/get-to-it:long-form/, f);
      // PowerShell 언어 설정 명령은 설정 폴더 안의 파일을 가리킨다
      assert.ok(t.includes('Set-Content "$HOME\\.claude\\.get-to-it-lang" ko'), f);
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
      for (const m of read(f).matchAll(/\]\(((?:skills|shared|LICENSE)[^)#]*)\)/g)) assert.ok(fs.existsSync(path.join(root, m[1])), `${f}: ${m[1]}`);
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
    assert.match(rule, /"다음:" 줄은 사용자가 할 일이 실제로 있을 때만 작성/);
    assert.match(rule, /억지로 만들기 금지/);
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
