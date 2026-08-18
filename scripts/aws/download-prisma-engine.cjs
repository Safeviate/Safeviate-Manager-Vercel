const path = require("path");
const { BinaryType, download } = require("@prisma/fetch-engine");
const { enginesVersion } = require("@prisma/engines-version");

async function main() {
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
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
