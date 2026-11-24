import pc from 'picocolors';

export function getAsciiBanner(): string {
  const useColor = !process.env.NO_COLOR && (Boolean(process.stdout?.isTTY) || Boolean(process.env.FORCE_COLOR));
  const rawArt = [
    '    _                    _   _                     ',
    '   / \\   __ _  ___ _ __ | |_| |    ___ _ __  ___  ',
    '  / _ \\ / _` |/ _ \\ \'_ \\| __| |   / _ \\ \'_ \\/ __| ',
    ' / ___ \\ (_| |  __/ | | | |_| |__|  __/ | | \\__ \\ ',
    '/_/   \\_\\__, |\\___|_| |_|\\__|_____\\___|_| |_|___/ ',
    '        |___/                                     ',
    '  AgentLens — The Open-Source Agentic Web & GEO Engine',
  ].join('\n');

  if (!useColor) {
    return '\n' + rawArt + '\n';
  }

  const lines = rawArt.split('\n');
  const bannerArt = pc.bold(pc.cyan(lines.slice(0, 6).join('\n')));
  const subtitle = pc.gray(lines[6] || '');
  return '\n' + bannerArt + '\n' + subtitle + '\n';
}
