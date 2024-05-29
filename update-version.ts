const appInfoFilePath = `./app-info.json`;
type AppVersion = number;
type AppInfo = {
  currentVersion: AppVersion;
};
const appInfo: AppInfo = JSON.parse(Deno.readTextFileSync(appInfoFilePath));

const htmlFilePath = `./index.html`;
const htmlContents = Deno.readTextFileSync(htmlFilePath);

const jsfilename = (version: number) => `./index-v${version}.js`;

const jsFileCurrent = jsfilename(appInfo.currentVersion);
appInfo.currentVersion += 1;
const jsFileNew = jsfilename(appInfo.currentVersion);

Deno.renameSync(jsFileCurrent, jsFileNew);

Deno.writeTextFileSync(
  htmlFilePath,
  htmlContents.replace(jsFileCurrent, jsFileNew),
);

Deno.writeTextFileSync(appInfoFilePath, JSON.stringify(appInfo, null, 2));
