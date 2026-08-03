const {app, BrowserWindow, Menu, session, shell} = require('electron');
const fs = require('fs');
const http = require('http');
const path = require('path');

const MIME_TYPES = {
	'.css': 'text/css; charset=utf-8',
	'.gif': 'image/gif',
	'.html': 'text/html; charset=utf-8',
	'.ico': 'image/x-icon',
	'.jpeg': 'image/jpeg',
	'.jpg': 'image/jpeg',
	'.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.map': 'application/json; charset=utf-8',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.txt': 'text/plain; charset=utf-8',
	'.wasm': 'application/wasm',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.xml': 'application/xml; charset=utf-8'
};

let staticServer = null;
let mainWindow = null;

function getWebappRoot()
{
	return app.isPackaged ? path.join(process.resourcesPath, 'webapp') :
		path.resolve(__dirname, '..', 'src', 'main', 'webapp');
}

function resolveRequestPath(root, requestUrl)
{
	let pathname = new URL(requestUrl, 'http://127.0.0.1').pathname;

	try
	{
		pathname = decodeURIComponent(pathname);
	}
	catch (e)
	{
		return null;
	}

	if (pathname == '/')
	{
		pathname = '/index.html';
	}

	const target = path.resolve(root, '.' + pathname.replace(/\//g, path.sep));
	const relative = path.relative(root, target);
	return relative == '' || (!relative.startsWith('..') && !path.isAbsolute(relative)) ?
		target : null;
}

function startStaticServer()
{
	const root = getWebappRoot();

	return new Promise((resolve, reject) =>
	{
		staticServer = http.createServer((request, response) =>
		{
			if (request.method != 'GET' && request.method != 'HEAD')
			{
				response.writeHead(405, {'Allow': 'GET, HEAD'});
				response.end();
				return;
			}

			const target = resolveRequestPath(root, request.url);

			if (target == null)
			{
				response.writeHead(403);
				response.end('Forbidden');
				return;
			}

			fs.stat(target, (error, stats) =>
			{
				if (error != null || !stats.isFile())
				{
					response.writeHead(404);
					response.end('Not found');
					return;
				}

				response.writeHead(200, {
					'Content-Type': MIME_TYPES[path.extname(target).toLowerCase()] ||
						'application/octet-stream',
					'Content-Length': stats.size,
					'Cache-Control': 'no-cache'
				});

				if (request.method == 'HEAD')
				{
					response.end();
				}
				else
				{
					const stream = fs.createReadStream(target);
					stream.on('error', () => response.destroy());
					stream.pipe(response);
				}
			});
		});

		staticServer.once('error', reject);
		staticServer.listen(0, '127.0.0.1', () =>
		{
			staticServer.removeListener('error', reject);
			resolve(staticServer.address().port);
		});
	});
}

async function createWindow(port)
{
	mainWindow = new BrowserWindow({
		width: 1600,
		height: 960,
		minWidth: 1180,
		minHeight: 720,
		show: true,
		backgroundColor: '#ffffff',
		title: 'KNX Topology',
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true
		}
	});

	mainWindow.webContents.setWindowOpenHandler(({url}) =>
	{
		if (/^https?:\/\//i.test(url))
		{
			shell.openExternal(url);
		}

		return {action: 'deny'};
	});

	mainWindow.webContents.on('will-navigate', (event, url) =>
	{
		const allowedOrigin = 'http://127.0.0.1:' + port;

		if (!url.startsWith(allowedOrigin + '/'))
		{
			event.preventDefault();
			shell.openExternal(url);
		}
	});

	await mainWindow.loadURL('http://127.0.0.1:' + port +
		'/?knx=1&offline=1&browser=1');

	if (process.argv.includes('--smoke-test'))
	{
		const deadline = Date.now() + 30000;
		let ready = false;

		while (!ready && Date.now() < deadline)
		{
			ready = await mainWindow.webContents.executeJavaScript(
				"document.querySelector('.knxEquipmentTypeSelect') != null && " +
				"document.querySelector('.geDiagramContainer') != null");

			if (!ready)
			{
				await new Promise((resolve) => setTimeout(resolve, 250));
			}
		}

		console.log(ready ? 'KNX_PORTABLE_SMOKE_TEST_OK' :
			'KNX_PORTABLE_SMOKE_TEST_FAILED');
		app.exit(ready ? 0 : 2);
	}
}

if (!app.requestSingleInstanceLock())
{
	app.quit();
}
else
{
	app.on('second-instance', () =>
	{
		if (mainWindow != null)
		{
			if (mainWindow.isMinimized())
			{
				mainWindow.restore();
			}

			mainWindow.focus();
		}
	});

	app.whenReady().then(async () =>
	{
		Menu.setApplicationMenu(null);
		session.defaultSession.setPermissionRequestHandler((webContents,
			permission, callback) => callback(false));

		try
		{
			const port = await startStaticServer();
			await createWindow(port);
		}
		catch (error)
		{
			console.error(error);
			app.exit(1);
		}
	});
}

app.on('window-all-closed', () => app.quit());
app.on('before-quit', () =>
{
	if (staticServer != null)
	{
		staticServer.close();
		staticServer = null;
	}
});
