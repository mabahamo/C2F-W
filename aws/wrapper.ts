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

  //enable all outputs
  for(let i=0;i<=8;i++) {
    newArgs["OutputOptions"] = i
  }

  /**
   * qgis_process run fire2a:cell2firesimulator --distance_units=meters 
   * --area_units=m2 
   * --ellipsoid=EPSG:7030 
   * --FuelModel=1 
   * --FuelRaster=/Users/mabahamo/Downloads/Portezuelo/fuels.asc 
   * --SetFuelLayerStyle=false 
   * --ElevationRaster=/Users/mabahamo/Downloads/Portezuelo/elevation.asc 
   * --EnableCrownFire=false 
   * --NumberOfSimulations=2 
   * --IgnitionMode=0 
   * --IgnitionRadius=0 
   * --WeatherMode=0 
   * --WeatherFile=/Users/mabahamo/Downloads/Portezuelo/Weather.csv 
   * --WeatherDirectory= 
   * --FoliarMoistureContent=66 
   * --LiveAndDeadFuelMoistureContentScenario=2 
   * --SimulationThreads=7 
   * --RandomNumberGeneratorSeed=123 
   * --OutputOptions=0 --OutputOptions=1 --OutputOptions=6 --OutputOptions=2 --OutputOptions=3 --OutputOptions=4 --OutputOptions=5 --OutputOptions=7 --OutputOptions=8 
   * --InstanceInProject=false --InstanceDirectory=TEMPORARY_OUTPUT --ResultsInInstance=true --ResultsDirectory=TEMPORARY_OUTPUT --OtherCliArgs= --DryRun=false
   * 
   * */

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

  const fireScarCmd = `qgis_process run fire2a:scar --distance_units=meters --area_units=m2 --ellipsoid=EPSG:7030 --BaseLayer=${sourceFolder}fuels.asc --SampleScarFile=${targetFolder}Grids/Grids1/ForestGrid0.csv --BurnProbability=TEMPORARY_OUTPUT --ScarPolygon=${targetFolder}scars.gpkg --ScarRaster=${targetFolder}scarRaster.tif`
  console.log({fireScarCmd});

  const fireScar = await exec(fireScarCmd);
  console.log({fireScar});

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
