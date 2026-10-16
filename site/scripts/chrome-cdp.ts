// Shared by the build steps that open built pages in headless Chrome
// (prerender-diagrams.ts and reader-figures.ts): serve dist/ on a free local
// port, find and start Chrome, and talk to it over the DevTools protocol with
// no extra dependency.
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, sep } from 'node:path';

export interface CdpReply { result?: { value?: unknown }; exceptionDetails?: { exception?: { description?: string }; text: string }; data?: string }
interface CdpMessage { id?: number; error?: { message: string }; result?: CdpReply; method?: string; params?: Record<string, unknown> }
export interface CdpClient { send(method: string, params?: Record<string, unknown>): Promise<CdpReply>; once(method: string): Promise<Record<string, unknown>>; evaluate<T = unknown>(expression: string): Promise<T> }
export interface ChromeInstance { page: CdpClient; close(): Promise<void> }

const CONTENT_TYPES: Readonly<Record<string, string>> = {
	'.css': 'text/css',
	'.html': 'text/html; charset=utf-8',
	'.ico': 'image/x-icon',
	'.jpg': 'image/jpeg',
	'.js': 'text/javascript',
	'.json': 'application/json',
	'.mjs': 'text/javascript',
	'.mp3': 'audio/mpeg',
	'.mp4': 'video/mp4',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.txt': 'text/plain; charset=utf-8',
	'.webp': 'image/webp',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
};

// The pages ask for files under the site's base path (/rust-game-hacking-book/),
// but the files sit at the root of dist/, so a first path segment that names
// nothing in dist/ is dropped.
function distFile(distDir: string, pathname: string) {
	const segments = pathname.split('/').filter(Boolean);
	for (const skip of [0, 1]) {
		let file = join(distDir, ...segments.slice(skip));
		if (file !== distDir && !file.startsWith(distDir + sep)) continue;
		if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
		if (existsSync(file) && statSync(file).isFile()) return file;
	}
	return null;
}

/** Serve dist/ on 127.0.0.1 at a free port. */
export function serveDist(distDir: string): Promise<Server> {
	const server = createServer((request, response) => {
		let file = null;
		try {
			file = distFile(distDir, decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname));
		} catch {}
		if (!file) {
			response.writeHead(404).end();
			return;
		}
		response.writeHead(200, { 'content-type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream' });
		createReadStream(file).pipe(response);
	});
	return new Promise<Server>((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/** The port a server from serveDist listens on. */
export function serverPort(server: Server): number {
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('Local server has no TCP address');
	return address.port;
}

export function findChrome() {
	const candidates = [
		process.env.CHROME_PATH,
		'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
		'/Applications/Chromium.app/Contents/MacOS/Chromium',
		'/usr/bin/google-chrome',
		'/usr/bin/google-chrome-stable',
		'/usr/bin/chromium',
		'/usr/bin/chromium-browser',
		'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
	];
	return candidates.find((path) => path && existsSync(path));
}

/** Start headless Chrome with a throwaway profile. `extraArgs` go before the start page. */
export async function launchChrome(executable: string, profilePrefix: string, extraArgs: readonly string[] = []): Promise<ChromeInstance> {
	const profile = mkdtempSync(join(tmpdir(), profilePrefix));
	const child = spawn(
		executable,
		['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=1440,1000', ...extraArgs, 'about:blank'],
		{ stdio: ['ignore', 'ignore', 'pipe'] },
	);
	// Chrome keeps writing to its profile while it shuts down, so wait for it
	// to exit before deleting the profile. A leftover temporary folder is not
	// worth failing the build over.
	const close = async () => {
		if (child.exitCode === null && child.signalCode === null) {
			const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
			child.kill();
			await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5_000))]);
		}
		try {
			rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
		} catch {}
	};
	try {
		const endpoint = await new Promise<string>((resolve, reject) => {
			let output = '';
			const timer = setTimeout(() => reject(new Error('Chrome did not start within 30 seconds')), 30_000);
			child.stderr.on('data', (chunk) => {
				output += chunk;
				const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
				if (match?.[1]) {
					clearTimeout(timer);
					resolve(match[1]);
				}
			});
			child.on('error', (error) => {
				clearTimeout(timer);
				reject(error);
			});
			child.on('exit', (code) => {
				clearTimeout(timer);
				reject(new Error(`Chrome exited with code ${code}`));
			});
		});
		const targets: unknown = await (await fetch(`http://127.0.0.1:${new URL(endpoint).port}/json/list`)).json();
		if (!Array.isArray(targets)) throw new Error('Chrome target list is not an array');
		const page = targets.find((target: unknown): target is { type: string; webSocketDebuggerUrl: string } => typeof target === 'object' && target !== null && 'type' in target && target.type === 'page' && 'webSocketDebuggerUrl' in target && typeof target.webSocketDebuggerUrl === 'string');
		if (!page) throw new Error('Chrome opened no page');
		return { page: await connect(page.webSocketDebuggerUrl), close };
	} catch (error) {
		await close();
		throw error;
	}
}

// A minimal DevTools protocol client: send a command, or wait for one event.
function connect(url: string): Promise<CdpClient> {
	const socket = new WebSocket(url);
	const waiting = new Map<number, { resolve(value: CdpReply): void; reject(error: Error): void }>();
	const listeners = new Set<(message: CdpMessage) => void>();
	let nextId = 0;
	socket.addEventListener('message', (event) => {
		if (typeof event.data !== 'string') return;
		const message: CdpMessage = JSON.parse(event.data);
		if (message.id !== undefined) {
			const entry = waiting.get(message.id);
			waiting.delete(message.id);
			if (message.error) entry?.reject(new Error(message.error.message));
			else entry?.resolve(message.result ?? {});
		} else {
			for (const listener of listeners) listener(message);
		}
	});
	const client: CdpClient = {
		send(method, params = {}) {
			return new Promise<CdpReply>((resolve, reject) => {
				const id = ++nextId;
				waiting.set(id, { resolve, reject });
				socket.send(JSON.stringify({ id, method, params }));
			});
		},
		once(method) {
			return new Promise<Record<string, unknown>>((resolve) => {
				const listener = (message: CdpMessage) => {
					if (message.method !== method) return;
					listeners.delete(listener);
					resolve(message.params ?? {});
				};
				listeners.add(listener);
			});
		},
		async evaluate<T = unknown>(expression: string): Promise<T> {
			const { result, exceptionDetails } = await client.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
			if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
			if (!result) throw new Error('Chrome evaluation returned no result');
			return result.value as T;
		},
	};
	return new Promise<CdpClient>((resolve, reject) => {
		socket.addEventListener('open', () => resolve(client), { once: true });
		socket.addEventListener('error', () => reject(new Error('Could not connect to Chrome')), { once: true });
	});
}

export function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error(`${what} took longer than ${ms / 1000} seconds`)), ms);
	});
	return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
