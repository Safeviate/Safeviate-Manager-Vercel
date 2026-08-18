const path = require("path");
const { BinaryType, download } = require("@prisma/fetch-engine");
const { enginesVersion } = require("@prisma/engines-version");
const { existsSync } = require("fs");

async function main() {
  const enginePath = path.join(
    process.cwd(),
    "node_modules",
    "@prisma",
    "engines",
    "schema-engine-rhel-openssl-3.0.x",
  );

  // A configured custom engine path makes Prisma skip its download even when
  // the path is not present in this clean GitHub runner.
  delete process.env.PRISMA_SCHEMA_ENGINE_BINARY;

  await download({
    binaries: {
      [BinaryType.SchemaEngineBinary]: path.join(
        process.cwd(),
        "node_modules",
        "@prisma",
        "engines",
      ),
    },
    version: enginesVersion,
    binaryTargets: ["rhel-openssl-3.0.x"],
    showProgress: true,
  });

  if (!existsSync(enginePath)) {
    throw new Error(`Prisma did not create the required EB engine: ${enginePath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
