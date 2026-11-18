import { execFile, spawn } from 'node:child_process';
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
 * Lists Chromium processes as "pid ppid residentKb command" lines, on request.
 *
 * On macOS and Linux each listing runs `ps` and gives the resident set size. Windows has no
 * `ps`, and starting PowerShell for every sample took about 0.6 s, so one PowerShell process
 * is kept open for the whole sampling period. It reads the working set (the Windows
 * counterpart of the resident set size) from the .NET process list, and looks up the parent
 * process and command line once per new process, which avoids a WMI query per sample.
 */
export interface ProcessLister {
  list(): Promise<string>;
  close(): void;
}

const MAX_BUFFER = 64 * 1024 * 1024;

const WINDOWS_SAMPLER = `
$ProgressPreference = 'SilentlyContinue'
$cache = @{}
while ($null -ne [Console]::In.ReadLine()) {
  foreach ($p in [Diagnostics.Process]::GetProcesses()) {
    if ($p.ProcessName -notlike '*chrom*') { continue }
    try { $key = '{0}-{1}' -f $p.Id, $p.StartTime.Ticks } catch { continue }
    if (-not $cache.ContainsKey($key)) {
      $w = Get-CimInstance Win32_Process -Filter ('ProcessId = {0}' -f $p.Id)
      $cache[$key] = @($w.ParentProcessId, $w.CommandLine)
    }
    [Console]::Out.WriteLine(('{0} {1} {2} {3}' -f $p.Id, $cache[$key][0], [int64]($p.WorkingSet64 / 1024), $cache[$key][1]))
  }
  [Console]::Out.WriteLine('END')
  [Console]::Out.Flush()
}
`;

function windowsLister(): ProcessLister {
  // An encoded command keeps the multi-line script intact through Windows argument quoting.
  const encoded = Buffer.from(WINDOWS_SAMPLER, 'utf16le').toString('base64');
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
    stdio: ['pipe', 'pipe', 'inherit'],
    windowsHide: true,
  });
  child.stdout.setEncoding('utf8');
  let buffer = '';
  const waiting: ((output: string) => void)[] = [];
  child.stdout.on('data', (chunk: string) => {
    buffer += chunk;
    let end: number;
    while ((end = buffer.search(/^END\r?$/m)) !== -1) {
      const output = buffer.slice(0, end);
      buffer = buffer.slice(buffer.indexOf('\n', end) + 1);
      waiting.shift()?.(output);
    }
  });
  return {
    list: () =>
      new Promise((resolve, reject) => {
        if (child.exitCode !== null) return reject(new Error('process sampler has exited'));
        waiting.push(resolve);
        child.stdin.write('\n');
      }),
    close: () => {
      child.stdin.end();
    },
  };
}

function psLister(): ProcessLister {
  return {
    list: async () =>
      (await run('ps', ['-A', '-o', 'pid=,ppid=,rss=,command='], { encoding: 'utf8', maxBuffer: MAX_BUFFER }))
        .stdout,
    close: () => {},
  };
}

export const createProcessLister = (platform: NodeJS.Platform = process.platform): ProcessLister =>
  platform === 'win32' ? windowsLister() : psLister();

export async function readChromiumMemory(lister: ProcessLister, rootPid = process.pid) {
  return summarizeChromiumMemory(parsePs(await lister.list()), rootPid);
}

export type ChromiumMemory = Awaited<ReturnType<typeof readChromiumMemory>>;

/**
 * Samples Chromium memory at a fixed interval without blocking the event loop. A sample is
 * skipped when the previous one has not finished, and skipped samples are counted.
 */
export function sampleChromiumMemory(intervalMs: number) {
  const lister = createProcessLister();
  const samples: ChromiumMemory[] = [];
  let pending: Promise<void> | undefined;
  let skipped = 0;
  const timer = setInterval(() => {
    if (pending) {
      skipped += 1;
      return;
    }
    pending = readChromiumMemory(lister)
      .then((sample) => void samples.push(sample))
      .finally(() => (pending = undefined));
  }, intervalMs);
  return async () => {
    clearInterval(timer);
    await pending;
    lister.close();
    return { samples, skipped };
  };
}
