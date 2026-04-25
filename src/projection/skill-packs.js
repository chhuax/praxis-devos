import {
  collectConfiguredPackEntries,
  collectPackResourceSources,
  inspectPack,
} from './pack-resources.js';

export const inspectSkillPack = ({ projectDir, skillPackPath, refreshGit = true }) => (
  inspectPack({ projectDir, packPath: skillPackPath, refreshGit })
);

export const collectSkillPackSourcesFromEntries = ({ projectDir, entries = [], refreshGit = true }) => (
  collectPackResourceSources({
    projectDir,
    entries,
    resourceType: 'skills',
    refreshGit,
  })
);

export const collectConfiguredSkillPackSources = ({ projectDir, refreshGit = true }) => (
  collectPackResourceSources({
    projectDir,
    entries: collectConfiguredPackEntries({ projectDir }),
    resourceType: 'skills',
    refreshGit,
  })
);
