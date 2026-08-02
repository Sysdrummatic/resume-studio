#!/usr/bin/env node
// PreToolUse hook (matcher: Bash). Blocks git branch-creation
// commands whose name doesn't match the OpenCiVera convention
// documented in docs/guides/development/git-workflow.md.
// Exit 0 = allow. Exit 2 = block (stderr is shown to Claude as
// the reason, so it can retry with a corrected name).

let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  if (payload.tool_name !== 'Bash') process.exit(0);
  const command = payload?.tool_input?.command || '';

  const patterns = [
    /git\s+checkout\s+-b\s+(\S+)/,
    /git\s+switch\s+-c\s+(\S+)/,
    /git\s+branch\s+(\S+)/,
  ];

  let branchName = null;
  for (const pattern of patterns) {
    const match = command.match(pattern);
    if (match) { branchName = match[1]; break; }
  }

  if (!branchName) process.exit(0);

  const validPattern = /^(feat|fix|refactor|docs|chore)\/[a-z0-9]+(-[a-z0-9]+)*$/;

  if (!validPattern.test(branchName)) {
    console.error(
      `Branch name "${branchName}" does not follow the OpenCiVera convention.\n` +
      `Use: <prefix>/<area>-<change>, prefix one of feat, fix, refactor, docs, chore.\n` +
      `Examples: feat/public-resume-seo, fix/auth-session-refresh, docs/codex-git-workflow\n` +
      `Full rule: docs/guides/development/git-workflow.md`
    );
    process.exit(2);
  }

  process.exit(0);
});
