// SessionStart 훅: 사용자가 플래그 파일을 만들어 둔 경우에만 규칙 전문을 주입한다.
// 어떤 실패도 세션 시작을 막지 않는다. 항상 exit 0 으로 끝난다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

try {
  const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
  const flagPath = path.join(claudeDir, ".get-to-it-always");
  if (!fs.existsSync(flagPath)) process.exit(0);

  // 설정 파일 값을 영문자만 남겨 읽는다. PowerShell 5 가 UTF-16·BOM 으로 써도 읽힌다.
  const readSetting = (file) => {
    try {
      return fs.readFileSync(file, "utf8").replace(/[^a-z]/gi, "").toLowerCase();
    } catch {
      return "";
    }
  };
  const langFile = path.join(claudeDir, ".get-to-it-lang");
  const toneFile = path.join(claudeDir, ".get-to-it-tone");
  const ko = readSetting(langFile) === "ko"; // ko 가 아니면(파일 없음 포함) 영어
  const plainOn = readSetting(toneFile) === "plain"; // plain 이 아니면 회사어투

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const skillDir = path.join(scriptDir, "..", "skills", "get-to-it");
  const rulesPath = ko ? path.join(skillDir, "references", "ko", "rules.md") : path.join(skillDir, "SKILL.md");
  const companyPath = path.join(skillDir, "references", ...(ko ? ["ko"] : []), "company-tone.md");
  if (!fs.existsSync(rulesPath)) process.exit(0);

  // 머리말을 떼고, 훅에서는 치환되지 않는 ${CLAUDE_SKILL_DIR} 을 실제 경로로 바꾼다.
  const skillDirText = path.resolve(skillDir).replaceAll("\\", "/");
  const read = (file) =>
    fs
      .readFileSync(file, "utf8")
      .replace(/^---[^\S\r\n]*\r?\n[\s\S]*?\r?\n---[^\S\r\n]*(?:\r?\n|$)/, "")
      .replace(/(?:\r?\n)+$/, "")
      .replaceAll("${CLAUDE_SKILL_DIR}", skillDirText);
  const body = read(rulesPath);
  const companyOn = !plainOn && fs.existsSync(companyPath);
  const company = companyOn ? `\n\n${read(companyPath)}` : "";

  const head = ko
    ? "GET-TO-IT 켜짐(상시). 아래 규칙은 모든 답변에 적용한다. " +
      '"normal mode", "stop get-to-it", "get-to-it 꺼"는 이번 세션에서 끈다. ' +
      `상시 켜기를 없애려면 ${flagPath} 를 지운다.\n` +
      `한국어 설정(${langFile} = ko). 영어로 바꾸려면 파일을 지운다. 이번 세션만 바꾸려면 "English mode".\n` +
      (plainOn
        ? `일반어투 설정(${toneFile} = plain). 회사어투 옵션 장을 넣지 않았다. 회사어투로 바꾸려면 값을 company 로 바꾸거나 파일을 지운다.\n`
        : companyOn
          ? `회사어투 설정(기본). 맨 끝의 회사어투 옵션 장을 따른다. 일반어투로 바꾸려면 ${toneFile} 에 plain 을 쓴다. 이번 세션만 바꾸려면 "회사어투 꺼".\n`
          : "")
    : 'GET-TO-IT on (always) for every reply. "normal mode" or "stop get-to-it" turns it off for this session. ' +
      `Delete ${flagPath} to stop always-on.\n` +
      `Language: English (default). For Korean, write ko to ${langFile} or say "Korean mode".\n` +
      (plainOn
        ? `Plain tone is set (${toneFile} = plain), so the company tone chapter is left out.\n`
        : companyOn
          ? `Company tone (default): follow the chapter at the end. For plain tone, write plain to ${toneFile} or say "plain tone".\n`
          : "");

  process.stdout.write(`${head}\n${body}${company}\n`);
} catch {
  process.exit(0);
}
