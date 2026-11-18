import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

export interface ProcessRow {
  pid: number;
  ppid: number;
  rssKb: number;
  command: string;
}

export function parsePs(output: string): ProcessRow[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)(?:\s+(.*))?$/))
    .filter((match) => match !== null)
    .map(([, pid, ppid, rss, command]) => ({
      pid: Number(pid),
      ppid: Number(ppid),
      rssKb: Number(rss),
      command: command ?? '',
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

/**
 * Lists every process as "pid ppid residentKb command" lines. On macOS and Linux this is
 * the resident set size from ps. Windows has no ps, so the same lines are built from
 * Win32_Process, where the working set is the counterpart of the resident set size.
 */
async function listProcesses(platform: NodeJS.Platform = process.platform): Promise<string> {
  if (platform === 'win32') {
    const script =
      "Get-CimInstance Win32_Process | ForEach-Object { '{0} {1} {2} {3}' -f " +
      '$_.ProcessId, $_.ParentProcessId, [int64]($_.WorkingSetSize / 1024), $_.CommandLine }';
    const { stdout } = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true,
    });
    return stdout;
  }
  const { stdout } = await run('ps', ['-A', '-o', 'pid=,ppid=,rss=,command='], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout;
}

export async function readChromiumMemory(rootPid = process.pid) {
  return summarizeChromiumMemory(parsePs(await listProcesses()), rootPid);
}

export type ChromiumMemory = Awaited<ReturnType<typeof readChromiumMemory>>;

/**
 * Samples Chromium memory at a fixed interval without blocking the event loop. A sample is
 * skipped when the previous one has not finished, which matters on Windows, where one
 * process listing takes a noticeable fraction of a second.
 */
export function sampleChromiumMemory(intervalMs: number) {
  const samples: ChromiumMemory[] = [];
  let pending: Promise<void> | undefined;
  let skipped = 0;
  const timer = setInterval(() => {
    if (pending) {
      skipped += 1;
      return;
    }
    pending = readChromiumMemory()
      .then((sample) => void samples.push(sample))
      .finally(() => (pending = undefined));
  }, intervalMs);
  return async () => {
    clearInterval(timer);
    await pending;
    return { samples, skipped };
  };
}
