import fs from 'fs';
import path from 'path';

export const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

export const copyBundleDirectory = ({ sourceDir, targetDir, transformFile = null }) => {
  ensureDir(targetDir);

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyBundleDirectory({ sourceDir: sourcePath, targetDir: targetPath, transformFile });
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
