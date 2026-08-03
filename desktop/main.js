const {app, BrowserWindow, Menu, session, shell} = require('electron');
const fs = require('fs');
const http = require('http');
const path = require('path');

const APP_ID = 'vn.knx.topology';
const APP_ICON = path.join(__dirname, 'assets', 'icon.ico');

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
		icon: APP_ICON,
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
				"document.querySelector('.geDiagramContainer') != null && " +
				"document.querySelector('.knxFileMenuButton') != null");

			if (!ready)
			{
				await new Promise((resolve) => setTimeout(resolve, 250));
			}
		}

		if (ready)
		{
			ready = await mainWindow.webContents.executeJavaScript(
				"(function(){var b=document.querySelector('.knxFileMenuButton');" +
				"b.click();var t=Array.from(document.querySelectorAll(" +
				"'.knxFileMenuItem span:last-child'))" +
				".map(function(x){return x.textContent.trim()});var ok=" +
				"['New Project','Open Project...','Import Drawing...'," +
				"'Save Project (.lukatp)','Export PNG · No grid','Export PNG · Grid'," +
				"'Export PDF · No grid','Export PDF · Grid']" +
				".every(function(x){return t.indexOf(x)>=0});b.click();return ok})()");
		}

		if (ready)
		{
			ready = await mainWindow.webContents.executeJavaScript(
				"(function(){var d=document.querySelector('.geDiagramContainer');" +
				"var n=document.querySelector('.knxMobileNav');var r=d.getBoundingClientRect();" +
				"var o=Array.from(document.querySelector('.knxProjectDownloadFormat').options)" +
				".map(function(x){return x.value});" +
				"return r.left>0&&r.right<window.innerWidth&&" +
				"getComputedStyle(n).display==='none'&&o.indexOf('png-grid')>=0&&" +
				"o.indexOf('pdf-grid')>=0})()");
		}

		if (ready)
		{
			const panelResult = await mainWindow.webContents.executeJavaScript(
				"(function(){try{var root=document.querySelector('.knxWorkspace');" +
				"var w=root.knxWorkspace;var left=w.leftPanelWidth,right=w.rightPanelWidth;" +
				"var diagram=document.querySelector('.geDiagramContainer');" +
				"var sl=diagram.scrollLeft,st=diagram.scrollTop;" +
				"w.setPanelWidth('left',9999,false);" +
				"w.setPanelWidth('right',9999,false);var d=document.querySelector(" +
				"'.geDiagramContainer').getBoundingClientRect();var handles=" +
				"Array.from(document.querySelectorAll('.knxPanelResizeHandle'))" +
				".every(function(x){return getComputedStyle(x).display==='block'});" +
				"var ok=w.leftPanelWidth>=220&&w.leftPanelWidth<=480&&" +
				"w.rightPanelWidth>=260&&w.rightPanelWidth<=520&&d.width>=420&&handles&&" +
				"diagram.scrollLeft===sl&&diagram.scrollTop===st;" +
				"w.setPanelWidth('left',left,false);" +
				"w.setPanelWidth('right',right,false);return {ok:ok}}catch(e){return " +
				"{ok:false,error:String(e.stack||e)}}})()");
			ready = panelResult.ok;
			console.log('KNX_PANEL_RESIZE_SMOKE', ready ? 'OK' : 'FAILED');

			if (!ready)
			{
				console.error('KNX_PANEL_RESIZE_DETAILS', panelResult.error);
			}
		}

		if (ready)
		{
			ready = await mainWindow.webContents.executeJavaScript(
				"(function(){var root=document.querySelector('.knxWorkspace');" +
				"var w=root.knxWorkspace,u=w.editorUi,g=u.editor.graph,m=g.getModel();" +
				"function count(){var n=0;for(var id in m.cells){var c=m.cells[id];" +
				"if(c&&m.isEdge(c)&&String(c.style).indexOf('wireMode=1')>=0)n++}return n}" +
				"var canvas=document.querySelector('.geDiagramContainer');" +
				"function fire(type,x,y){canvas.dispatchEvent(new MouseEvent(type," +
				"{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0}))}" +
				"var r=canvas.getBoundingClientRect(),x=r.left+r.width/2," +
				"y=r.top+r.height/2,before=count();w.wiringModeButton.click();" +
				"fire('mousedown',x,y);fire('mousedown',x+100,y);" +
				"fire('mousedown',x+100,y);var repeated=count()===before+1&&" +
				"u.wireModeActive;w.wiringModeButton.click();var toolbarExit=!u.wireModeActive;" +
				"window.dispatchEvent(new KeyboardEvent('keydown',{key:'w',keyCode:87," +
				"bubbles:true,cancelable:true}));var wEnter=u.wireModeActive;" +
				"window.dispatchEvent(new KeyboardEvent('keydown',{key:'w',keyCode:87," +
				"bubbles:true,cancelable:true}));var wExit=!u.wireModeActive;" +
				"w.wiringModeButton.click();fire('mousedown',x,y+60);" +
				"fire('mousedown',x+80,y+60);fire('mousemove',x+130,y+60);" +
				"window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',keyCode:27," +
				"bubbles:true,cancelable:true}));var esc=count()===before+2&&!u.wireModeActive;" +
				"return repeated&&toolbarExit&&wEnter&&wExit&&esc})()");
			console.log('KNX_WIRING_TOGGLE_SMOKE', ready ? 'OK' : 'FAILED');
		}

		if (ready)
		{
			ready = await mainWindow.webContents.executeJavaScript(
				"new Promise(function(done){var w=document.querySelector('.knxWorkspace')" +
				".knxWorkspace;function fail(){done(false)}function render(grid,next){" +
				"w.exportTechnicalDrawing(next,fail,grid)}render(false,function(plain){" +
				"render(true,function(gridded){if(plain.width!==gridded.width||" +
				"plain.height!==gridded.height){done(false);return}var a=plain.getContext('2d')" +
				".getImageData(0,0,plain.width,plain.height).data;var b=gridded" +
				".getContext('2d').getImageData(0,0,gridded.width,gridded.height).data;" +
				"var diff=0;for(var i=0;i<a.length&&diff<400;i+=4){if(a[i]!==b[i]||" +
				"a[i+1]!==b[i+1]||a[i+2]!==b[i+2])diff++}done(diff>=100)})})})");
			console.log('KNX_EXPORT_GRID_SMOKE', ready ? 'OK' : 'FAILED');
		}

		if (ready)
		{
			mainWindow.setMinimumSize(320, 600);
			mainWindow.setSize(820, 900);
			await new Promise((resolve) => setTimeout(resolve, 350));
			const mobileResult = await mainWindow.webContents.executeJavaScript(
				"new Promise(function(done){var d=document.querySelector('.geDiagramContainer');" +
				"var n=document.querySelector('.knxMobileNav');var p=document.querySelector(" +
				"'.knxMobileNavButton');var f=document.querySelector('.knxFileMenuButton');" +
				"f.click();var menu=document.querySelector('.knxFileMenu');" +
				"var r=d.getBoundingClientRect();var state={width:window.innerWidth,left:r.left," +
				"right:r.right,nav:getComputedStyle(n).display,menu:getComputedStyle(menu).display," +
				"menuTop:menu.getBoundingClientRect().top,handles:Array.from(document.querySelectorAll(" +
				"'.knxPanelResizeHandle')).every(function(x){return getComputedStyle(x).display==='none'})};" +
				"f.click();p.click();" +
				"setTimeout(function(){state.project=document.querySelector('.knxWorkspace')" +
				".classList.contains('knxMobileProjectOpen');state.expanded=" +
				"p.getAttribute('aria-expanded');done(state)},250)})");
			ready = mobileResult.left <= 1 && mobileResult.right >= mobileResult.width - 1 &&
				mobileResult.nav === 'grid' && mobileResult.menu === 'block' &&
				mobileResult.menuTop >= 60 && mobileResult.handles && mobileResult.project &&
				mobileResult.expanded === 'true';

			if (!ready)
			{
				console.error('KNX_MOBILE_SMOKE_DETAILS', JSON.stringify(mobileResult));
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
		app.setAppUserModelId(APP_ID);
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
