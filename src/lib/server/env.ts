import 'server-only';

type EnvRequirement = string | string[];

function isProvided(name: string) {
  return Boolean(process.env[name]?.trim());
}

function getRequirementLabel(requirement: EnvRequirement) {
  return Array.isArray(requirement) ? requirement.join(' or ') : requirement;
}

export function getMissingEnvVars(requirements: EnvRequirement[]) {
  return requirements
    .filter((requirement) =>
      Array.isArray(requirement)
        ? !requirement.some((name) => isProvided(name))
        : !isProvided(requirement)
    )
    .map(getRequirementLabel);
}

export function assertRequiredEnv(requirements: EnvRequirement[], scope = 'runtime') {
  const missing = getMissingEnvVars(requirements);
  if (missing.length === 0) {
    return;
  }

  const message = `[env] Missing required environment variables for ${scope}: ${missing.join(', ')}`;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(message);
  }

  console.warn(message);
}
