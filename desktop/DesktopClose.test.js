const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const {app, BrowserWindow} = require('electron');

// Run with Electron: electron desktop/DesktopClose.test.js.
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'knx-close-test-')));

app.whenReady().then(async () =>
{
	let window;
	let choice = 1;
	let prompts = 0;
	const electron = {
		app: {
			isPackaged: false,
			requestSingleInstanceLock: () => true,
			whenReady: () => new Promise(() => {}),
			on: () => {}
		},
		BrowserWindow: function(options)
		{
			window = new BrowserWindow({...options, show: false});
			return window;
		},
		dialog: {
			showMessageBoxSync: (parent, options) =>
			{
				assert.strictEqual(parent, window);
				assert.strictEqual(options.defaultId, 1);
				assert.strictEqual(options.cancelId, 1);
				prompts++;
				return choice;
			}
		}
	};
	const context = vm.createContext({
		require: (name) => name === 'electron' ? electron : require(name),
		__dirname, process, console, URL, setTimeout
	});
	vm.runInContext(fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8'), context);

	function waitFor(target, name)
	{
		return new Promise((resolve, reject) =>
		{
			const timeout = setTimeout(() => reject(new Error('Timed out: ' + name)), 10000);
			target.once(name, () => { clearTimeout(timeout); resolve(); });
		});
	}

	try
	{
		const port = await vm.runInContext('startStaticServer()', context);
		await vm.runInContext('createWindow(' + port + ')', context);
		await window.webContents.executeJavaScript('window.onbeforeunload = null');
		let closed = waitFor(window, 'closed');
		window.close();
		await closed;
		assert.strictEqual(prompts, 0, 'Clean closing should not ask for confirmation');

		await vm.runInContext('createWindow(' + port + ')', context);
		await window.webContents.executeJavaScript(
			"window.onbeforeunload = function() { return 'Unsaved changes'; }; void 0");
		const prevented = waitFor(window.webContents, 'will-prevent-unload');
		window.close();
		await prevented;
		// Let Electron finish the cancelled close before requesting another one.
		await new Promise((resolve) => setTimeout(resolve, 100));
		assert.strictEqual(prompts, 1);
		assert.strictEqual(window.isDestroyed(), false, 'Keep editing must retain the window');

		choice = 0;
		closed = waitFor(window, 'closed');
		window.close();
		await closed;
		assert.strictEqual(prompts, 2);
		assert.strictEqual(window.isDestroyed(), true, 'Confirmed close must destroy the window');
		console.log('KNX_DESKTOP_CLOSE_TEST_OK: clean, cancel, confirmed close');
		fs.writeFileSync(path.join(__dirname, 'dist', 'close-test.log'),
			'KNX_DESKTOP_CLOSE_TEST_OK: clean, cancel, confirmed close\n');
		app.exit(0);
	}
	catch (error)
	{
		console.error(error);
		fs.writeFileSync(path.join(__dirname, 'dist', 'close-test.log'), String(error.stack));
		app.exit(1);
	}
	finally
	{
		vm.runInContext('if (staticServer != null) staticServer.close()', context);
	}
});
