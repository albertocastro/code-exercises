#!/usr/bin/env node
// Fake EXERCISE_AGENT_CMD for the LOCAL spawn path (rollback + parity tests).
// The local runAgent path invokes `<cmd> -`, pipes the prompt to stdin, and
// reads the agent's final message from stdout (the --output-last-message file
// is codex-specific and absent for a custom command, so runAgent falls back to
// stdout when it isn't a codex transcript). This reads the prompt from stdin
// and prints a JSON answer to stdout that the same normalizers accept —
// returning the SAME score (82) as the gateway fake so a local-vs-gateway
// parity assertion lands in the same band.
let prompt = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (prompt += c));
process.stdin.on("end", () => {
  let answer;
  if (/You are scoring the code quality/.test(prompt)) {
    answer = JSON.stringify({
      score: 82,
      summary: "Solid solution with minor clarity gaps.",
      strengths: ["Correct core logic"],
      improvements: ["Extract the duplicated branch"],
      studyPlan: [{ topic: "Time complexity", why: "Reason about the loop cost." }],
      actionItems: [{ text: "De-duplicate the branch", status: "open", note: "", claimed: false }],
    });
  } else {
    answer = "Local review: consider the empty-input case.";
  }
  process.stdout.write(answer);
});
