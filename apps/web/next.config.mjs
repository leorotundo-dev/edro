import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const resolveWorkspacePath = (workspaceRelativePath, fallbackRelativePath) => {
  const workspacePath = path.join(__dirname, workspaceRelativePath);
  if (fs.existsSync(workspacePath)) {
    return workspacePath;
  }
  return path.join(__dirname, fallbackRelativePath);
};

const workspaceAliases = {
  '@edro/theme': resolveWorkspacePath('../../packages/theme', './vendor/@edro/theme'),
  '@edro/shared': resolveWorkspacePath('../../packages/shared', './vendor/@edro/shared/src'),
  '@edro/ui': resolveWorkspacePath('../../packages/ui', './vendor/@edro/ui/src')
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    styledComponents: false
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      ...workspaceAliases
    };
    return config;
  }
};

export default nextConfig;
