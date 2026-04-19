import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const directSkillsRoot = () => path.resolve(__dirname, '../../assets/skills');

export const collectDirectSkillSources = () =>
  (fs.existsSync(directSkillsRoot())
    ? fs.readdirSync(directSkillsRoot(), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        name: entry.name,
        sourceDir: path.join(directSkillsRoot(), entry.name),
      }))
      .filter(({ sourceDir }) => fs.existsSync(path.join(sourceDir, 'SKILL.md')))
    : []);

export const collectBundledSkillSources = () =>
  collectDirectSkillSources().sort((a, b) => a.name.localeCompare(b.name));
