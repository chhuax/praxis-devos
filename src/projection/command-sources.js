import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const directCommandsRoot = () => path.resolve(__dirname, '../../assets/commands');

export const collectDirectCommandSources = () =>
  (fs.existsSync(directCommandsRoot())
    ? fs.readdirSync(directCommandsRoot(), { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => ({
        name: entry.name.slice(0, -3),
        sourcePath: path.join(directCommandsRoot(), entry.name),
        sourceDir: directCommandsRoot(),
        sourceType: 'direct',
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
    : []);
