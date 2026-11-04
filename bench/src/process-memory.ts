import { execFileSync } from 'node:child_process';

export interface ProcessRow {
  pid: number;
  ppid: number;
  rssKb: number;
  command: string;
}

export function parsePs(output: string): ProcessRow[] {
  return output
    .split('\n')
    .map((line) => line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/))
    .filter((match) => match !== null)
    .map(([, pid, ppid, rss, command]) => ({
      pid: Number(pid),
      ppid: Number(ppid),
      rssKb: Number(rss),
      command: command!,
    }));
}

/** Chromium names each child process with --type; the main browser process has none. */
const chromiumProcessType = (command: string) =>
  command.match(/--type=([\w-]+)/)?.[1] ?? 'browser';

const isChromium = (command: string) => /chrom|headless_shell/i.test(command);

/** Resident memory of all Chromium processes below a root process, in bytes, by process type. */
export function summarizeChromiumMemory(rows: ProcessRow[], rootPid: number) {
  const children = new Map<number, ProcessRow[]>();
  for (const row of rows) children.set(row.ppid, [...(children.get(row.ppid) ?? []), row]);

  const byType: Record<string, number> = {};
  let totalBytes = 0;
  const visit = (pid: number) => {
    for (const child of children.get(pid) ?? []) {
      if (isChromium(child.command)) {
        const bytes = child.rssKb * 1024;
        const type = chromiumProcessType(child.command);
        byType[type] = (byType[type] ?? 0) + bytes;
        totalBytes += bytes;
      }
      visit(child.pid);
    }
  };
  visit(rootPid);
  return { totalBytes, byType };
}

export function readChromiumMemory(rootPid = process.pid) {
  const output = execFileSync('ps', ['-A', '-o', 'pid=,ppid=,rss=,command='], { encoding: 'utf8' });
  return summarizeChromiumMemory(parsePs(output), rootPid);
}
