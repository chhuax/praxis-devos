import fs from 'fs';
import path from 'path';

export const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

export const isWorkflowCommandFile = (filePath) => /^COMMAND\..+\.md$/.test(path.basename(filePath));

export const copyBundleDirectory = ({
  sourceDir,
  targetDir,
  transformFile = null,
  shouldCopyFile = null,
}) => {
  ensureDir(targetDir);

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyBundleDirectory({
        sourceDir: sourcePath,
        targetDir: targetPath,
        transformFile,
        shouldCopyFile,
      });
      continue;
    }

    if (shouldCopyFile && !shouldCopyFile({ sourcePath, targetPath })) {
      continue;
    }

    ensureDir(path.dirname(targetPath));
    if (transformFile) {
      const transformed = transformFile({ sourcePath, targetPath });
      if (typeof transformed === 'string') {
        fs.writeFileSync(targetPath, transformed, 'utf8');
        continue;
      }
    }

    fs.copyFileSync(sourcePath, targetPath);
  }
};

export const pruneTopLevelBundleFiles = ({
  sourceDir,
  targetDir,
  shouldPruneFile,
}) => {
  if (!shouldPruneFile || !fs.existsSync(targetDir)) {
    return;
  }

  for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      continue;
    }

    const targetPath = path.join(targetDir, entry.name);
    const sourcePath = sourceDir ? path.join(sourceDir, entry.name) : null;
    if (shouldPruneFile({ sourcePath, targetPath })) {
      fs.rmSync(targetPath, { force: true });
    }
  }
};
