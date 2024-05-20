import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs";
import { sep } from "node:path";
import { mkdtempSync } from "fs";

const util = require("util");
const exec = util.promisify(require("child_process").exec);

const tmpDir = tmpdir();

function parseInput() {
  const argv = require("minimist")(process.argv.slice(2));
  delete argv["_"];

  const s3Paths = ["input-instance-folder", "output-folder"];

  for (const s3Path of s3Paths) {
    const path = argv[s3Path];
    if (!path) {
      throw new Error(`Missing required attribute ${s3Path}`);
    }
    if (!path.startsWith("s3://")) {
      throw new Error(
        `${s3Path} should point to a location in S3. Example: s3://bucket_name/key/`,
      );
    }
    if (!path.endsWith("/")) {
      throw new Error(`${s3Path} should end with a trailing slash`);
    }
  }
  return argv;
}

async function run(params: any) {
  const sourceFolder = mkdtempSync(`${tmpDir}${sep}`) + sep;
  const targetFolder = mkdtempSync(`${tmpDir}${sep}`) + sep;

  const newArgs = { ...params };
  newArgs["input-instance-folder"] = sourceFolder;
  newArgs["output-folder"] = targetFolder;

  const source = params["input-instance-folder"];
  const target = params["output-folder"];

  const args: string[] = [];

  for (const key of Object.keys(newArgs)) {
    args.push(`--${key} ${newArgs[key]}`);
  }

  console.log(`starting download ${source}`);
  await exec(`aws s3 cp ${source} ${sourceFolder} --recursive`);
  console.log(`downloaded ${source}`);

  const cmd = `Cell2Fire ${args.join(" ")}`;
  console.log({ cmd });

  const output = await exec(cmd);
  console.log({ output });

  //TODO: These files should be compressed before uploading to S3
  
  console.log(`starting upload ${targetFolder} -> ${target}`);
  const ls = await exec(`ls -la ${targetFolder}`);
  console.log({ ls });
  await exec(`aws s3 cp ${targetFolder} ${target} --recursive`);
  console.log(`uploaded to ${target}`);
}

const input = parseInput();
console.log("argv: ", input);

run(input).then(() => {
  console.log("done");
});
