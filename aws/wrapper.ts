import { tmpdir } from 'node:os';
import { mkdtemp } from 'node:fs';
import { sep } from 'node:path';

const util = require('util');
const exec = util.promisify(require('child_process').exec);

const tmpDir = tmpdir();
const argv = require('minimist')(process.argv.slice(2));

delete argv["_"];
console.log("argv: ", argv);

const source = argv["input-instance-folder"];
if (!source) {
  throw new Error("Missing required attribute input-instance-folder");
}
if (!source.startsWith("s3://")) {
  throw new Error("Input instance folder should point to a location in s3. Example: s3://bucket_name/key/");
}
if (!source.endsWith("/")) {
  throw new Error("Input instance folder should end with a trailing slash");
}

mkdtemp(`${tmpDir}${sep}`, async (err, directory) => {
  if (err) throw err;
  console.log(directory);

  const output = await exec(`aws s3 cp ${source} ${directory} --recursive`);
  console.log({output});
});
