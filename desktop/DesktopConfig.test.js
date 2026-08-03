const assert = require('assert');
const fs = require('fs');
const path = require('path');

const desktopRoot = __dirname;
const packageConfig = require(path.join(desktopRoot, 'package.json'));
const mainSource = fs.readFileSync(path.join(desktopRoot, 'main.js'), 'utf8');
const iconPath = path.join(desktopRoot, 'assets', 'icon.ico');
const icon = fs.readFileSync(iconPath);

assert.strictEqual(packageConfig.build.win.icon, 'assets/icon.ico',
	'Windows executable must use the Lumi ICO');
assert.ok(packageConfig.build.files.includes('assets/icon.ico'),
	'Lumi ICO must be packaged for BrowserWindow');
assert.strictEqual(packageConfig.build.directories.buildResources, 'assets',
	'Electron builder resources must resolve from desktop/assets');
assert.ok(mainSource.includes("const APP_ICON = path.join(__dirname, 'assets', 'icon.ico')") &&
	mainSource.includes('icon: APP_ICON') &&
	mainSource.includes("app.setAppUserModelId(APP_ID)"),
	'BrowserWindow and Windows taskbar identity must use the packaged Lumi icon');

assert.strictEqual(icon.readUInt16LE(0), 0, 'ICO reserved field must be zero');
assert.strictEqual(icon.readUInt16LE(2), 1, 'ICO must contain icon images');
const count = icon.readUInt16LE(4);
const sizes = [];

for (let i = 0; i < count; i++)
{
	const offset = 6 + i * 16;
	const width = icon[offset] == 0 ? 256 : icon[offset];
	const height = icon[offset + 1] == 0 ? 256 : icon[offset + 1];
	assert.strictEqual(width, height, 'Every Lumi ICO layer must be square');
	sizes.push(width);
}

assert.deepStrictEqual(sizes.sort((a, b) => a - b),
	[16, 24, 32, 48, 64, 128, 256],
	'Lumi ICO must include all required Windows shell sizes');

console.log('Desktop icon configuration tests passed');
