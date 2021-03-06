#!/usr/bin/env node

const fs = require("fs-extra");
const path = require("path");
const prompts = require("prompts");
const DRAFTS_NAME = "playground-drafts";

main();

async function main() {
  try {
    // ask for
    const { draftsDirName, demoName, demoDescription, templatePath } =
      await prompts(
        [
          {
            type: isInDrafts() ? null : "confirm",
            name: "confirm",
            message: "Not In A Drafts, Create One?",
            validate: isValidFolderName,
          },
          {
            type: (prev) => (prev ? "text" : null),
            name: "draftsDirName",
            message: "Drafts Folder Name",
            initial: "drafts",
            validate: isValidFolderName,
          },
          {
            type: "text",
            name: "demoName",
            message: "Demo Name:",
            validate: isInDrafts()
              ? isValidFolderName && isValidPackageName
              : isValidFolderName,
          },
          {
            type: "text",
            name: "demoDescription",
            message: "Description:",
          },
          {
            type: "select",
            name: "templatePath",
            message: "Select A Template",
            choices: getTemplates(),
          },
        ],
        {
          onCancel: () => {
            throw new Error("Operation cancelled");
          },
        }
      );

    let draftsPath = path.resolve(draftsDirName || "");
    draftsDirName &&
      copyPackage(draftsPath, path.join(__dirname, "drafts"), {
        name: DRAFTS_NAME,
      });

    let draftPath = path.join(draftsPath, demoName);
    copyPackage(draftPath, templatePath, {
      name: `drafts-${demoName}`,
      description: demoDescription,
    });

    console.log("finished");
    console.log(
      `cd ${draftsDirName ? `${draftsDirName}/${demoName}` : `${demoName}`}`
    );
    console.log(`yarn`);
  } catch (error) {
    console.log(error.message);
  }
}

function isDirectoryExists(folderPath) {
  const pathExists = fs.existsSync(folderPath);
  return pathExists && fs.statSync(folderPath).isDirectory();
}

function catPackage(packagePath) {
  if (!isDirectoryExists(packagePath)) return;

  const pkgJsonPath = path.join(packagePath, "package.json");
  if (!fs.existsSync(pkgJsonPath)) return;

  const { name, desctription } = fs.readJsonSync(pkgJsonPath);
  return { name, desctription, path: packagePath };
}

function isInDrafts() {
  const { name } = catPackage(path.resolve()) || {};
  return name === DRAFTS_NAME;
}

function isValidFolderName(folderName) {
  return !isDirectoryExists(path.resolve(folderName));
}

function isValidPackageName(projectName) {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(
    projectName
  );
}

function lsPackages(folderPath) {
  if (!isDirectoryExists(folderPath)) return [];
  const dirs = fs.readdirSync(folderPath);
  return dirs.reduce((prev, curr) => {
    const currPath = path.join(folderPath, curr);
    if (fs.statSync(currPath).isDirectory()) {
      const pkgJsonInfo = catPackage(currPath);
      if (pkgJsonInfo) {
        prev.push(pkgJsonInfo);
      }
    }
    return prev;
  }, []);
}

function getTemplates() {
  const templatePath = path.join(__dirname, "templates");
  return lsPackages(templatePath).map(({ name, desctription, path }) => ({
    title: name,
    desctription,
    value: path,
  }));
}

function updatePkgJson(packagePath, info) {
  const pkgJsonPath = path.join(packagePath, "package.json");
  const pkgJson = fs.readJsonSync(pkgJsonPath);

  Object.entries(info).forEach(([key, value]) => {
    pkgJson[key] = value;
  });

  fs.writeJSONSync(pkgJsonPath, pkgJson, {
    spaces: 2,
    EOL: "\n",
  });
}

function copyPackage(targetPath, sourcePath, pkgInfo) {
  fs.ensureDirSync(targetPath);
  fs.copySync(sourcePath, targetPath);
  updatePkgJson(targetPath, pkgInfo);
}
