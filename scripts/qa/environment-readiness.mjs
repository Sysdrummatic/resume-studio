import { pathToFileURL } from "node:url";

const HOSTED_TARGETS = new Set(["preview", "production"]);
const REQUIRED_VARIABLES = [
  "NEXT_PUBLIC_APP_ENV",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY"
];

function valueOf(environment, variable) {
  return typeof environment[variable] === "string" ? environment[variable].trim() : "";
}

function isPlaceholder(value) {
  const normalized = value.toLowerCase();
  return (
    normalized === "changeme" ||
    normalized === "change-me" ||
    normalized === "replace-me" ||
    normalized === "todo" ||
    /^<[^>]+>$/.test(value) ||
    /^your[-_]/i.test(value)
  );
}

function isHostedUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function error(variable, message) {
  return { variable, message };
}

export function validateEnvironment(target, environment) {
  if (!HOSTED_TARGETS.has(target)) {
    throw new Error('Target must be "preview" or "production".');
  }

  const errors = [];
  const appEnvironment = valueOf(environment, "NEXT_PUBLIC_APP_ENV");
  if (!appEnvironment) errors.push(error("NEXT_PUBLIC_APP_ENV", "is required"));
  else if (isPlaceholder(appEnvironment))
    errors.push(error("NEXT_PUBLIC_APP_ENV", "contains a placeholder"));
  else if (appEnvironment !== target)
    errors.push(error("NEXT_PUBLIC_APP_ENV", `must equal ${target}`));

  const supabaseUrl = valueOf(environment, "NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseUrl) errors.push(error("NEXT_PUBLIC_SUPABASE_URL", "is required"));
  else if (isPlaceholder(supabaseUrl))
    errors.push(error("NEXT_PUBLIC_SUPABASE_URL", "contains a placeholder"));
  else if (!isHostedUrl(supabaseUrl)) {
    errors.push(error("NEXT_PUBLIC_SUPABASE_URL", "must be an HTTPS URL without credentials"));
  }

  for (const variable of ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
    const value = valueOf(environment, variable);
    if (!value) errors.push(error(variable, "is required"));
    else if (isPlaceholder(value)) errors.push(error(variable, "contains a placeholder"));
  }

  const appBaseUrl = valueOf(environment, "NEXT_PUBLIC_APP_BASE_URL");
  if (appBaseUrl && !isHostedUrl(appBaseUrl)) {
    errors.push(error("NEXT_PUBLIC_APP_BASE_URL", "must be an HTTPS URL without credentials"));
  }

  const resendKey = valueOf(environment, "RESEND_API_KEY");
  const emailFrom = valueOf(environment, "EMAIL_FROM_ADDRESS");
  if (resendKey || emailFrom) {
    if (!resendKey)
      errors.push(error("RESEND_API_KEY", "is required when email delivery is configured"));
    else if (isPlaceholder(resendKey))
      errors.push(error("RESEND_API_KEY", "contains a placeholder"));

    if (!emailFrom)
      errors.push(error("EMAIL_FROM_ADDRESS", "is required when email delivery is configured"));
    else if (isPlaceholder(emailFrom))
      errors.push(error("EMAIL_FROM_ADDRESS", "contains a placeholder"));
  }

  return {
    target,
    valid: errors.length === 0,
    checkedVariables: [
      ...REQUIRED_VARIABLES,
      "NEXT_PUBLIC_APP_BASE_URL",
      "RESEND_API_KEY",
      "EMAIL_FROM_ADDRESS"
    ],
    errors
  };
}

export function formatEnvironmentReport(result) {
  const status = result.valid ? "PASS" : "FAIL";
  const lines = [`Environment readiness (${result.target}): ${status}`];

  if (result.valid) {
    lines.push(`Checked ${result.checkedVariables.length} variable contracts.`);
  } else {
    lines.push(...result.errors.map(({ variable, message }) => `- ${variable}: ${message}`));
  }

  return lines.join("\n");
}

function readTarget(args) {
  const inline = args.find((argument) => argument.startsWith("--target="));
  if (inline) return inline.slice("--target=".length);

  const targetIndex = args.indexOf("--target");
  return targetIndex === -1 ? "" : args[targetIndex + 1] || "";
}

function runCli() {
  try {
    const result = validateEnvironment(readTarget(process.argv.slice(2)), process.env);
    console.log(formatEnvironmentReport(result));
    if (!result.valid) process.exitCode = 1;
  } catch (cause) {
    console.error(`Environment readiness: FAIL\n- target: ${cause.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
