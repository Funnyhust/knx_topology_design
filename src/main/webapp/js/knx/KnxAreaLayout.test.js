const assert = require('assert');
const areaLayout = require('./KnxAreaLayout.js');

const bounds = areaLayout.unionBounds([
	{x: 20, y: 60, width: 190, height: 92},
	{x: 300, y: 90, width: 4, height: 400},
	{x: 360, y: 210, width: 190, height: 92}
]);

assert.deepStrictEqual(bounds, {x: 20, y: 60, width: 530, height: 430});

const placements = areaLayout.resolveVerticalAreaPlacement([
	{areaId: 'area-1', width: 800, height: 600},
	{areaId: 'area-2', width: 700, height: 400},
	{areaId: 'area-3', width: 680, height: 360}
], 150, 60, 80);

assert.deepStrictEqual(placements, [
	{areaId: 'area-1', x: 150, y: 60, width: 800, height: 600},
	{areaId: 'area-2', x: 150, y: 740, width: 700, height: 400},
	{areaId: 'area-3', x: 150, y: 1220, width: 680, height: 360}
]);

const reflowed = areaLayout.resolveFollowingAreaOverlap([
	{areaId: 'area-1', x: 150, y: 60, width: 800, height: 500},
	{areaId: 'area-2', x: 150, y: 640, width: 800, height: 300},
	{areaId: 'area-3', x: 150, y: 1020, width: 800, height: 300}
], 80);
assert.strictEqual(reflowed[0].y, 60,
	'reflow must not move the leading Area');
assert.strictEqual(reflowed[1].y, 640,
	'Area already respecting the gap must remain unchanged');
assert.strictEqual(reflowed[2].y, 1020,
	'non-overlapping following Area must remain unchanged');

const expandedReflow = areaLayout.resolveFollowingAreaOverlap([
	{areaId: 'area-3', x: 150, y: 60, width: 800, height: 900},
	{areaId: 'area-4', x: 150, y: 640, width: 800, height: 300},
	{areaId: 'area-5', x: 150, y: 1020, width: 800, height: 300}
], 80);
assert.strictEqual(expandedReflow[1].y, 1040,
	'expanded Area must push the immediate following Area');
assert.strictEqual(expandedReflow[2].y, 1420,
	'reflow must propagate to every later Area');

for (let i = 1; i < placements.length; i++)
{
	assert.ok(placements[i].y >= placements[i - 1].y +
		placements[i - 1].height + 80, 'Area placement must not overlap');
}

const relativeBefore = {x: 210, y: 180};
const areaBefore = {x: 150, y: 60};
const areaAfter = {x: 150, y: 360};
const canvasBefore = {
	x: areaBefore.x + relativeBefore.x,
	y: areaBefore.y + relativeBefore.y
};
const canvasAfter = {
	x: areaAfter.x + relativeBefore.x,
	y: areaAfter.y + relativeBefore.y
};

assert.deepStrictEqual(canvasBefore, {x: 360, y: 240});
assert.deepStrictEqual(canvasAfter, {x: 360, y: 540});
assert.deepStrictEqual(relativeBefore, {x: 210, y: 180});

const deviceSlots = Array.from({length: 12}, (_, index) =>
	areaLayout.calculateDeviceSlot(index, 2, 100, 200, 160, 64, 18, 12, 4, 38));
assert.deepStrictEqual(deviceSlots[0],
	{bank: 0, column: 0, row: 0, x: 100, y: 200, width: 160, height: 64});
assert.deepStrictEqual(deviceSlots[5],
	{bank: 0, column: 2, row: 1, x: 456, y: 276, width: 160, height: 64});
assert.deepStrictEqual(deviceSlots[6],
	{bank: 0, column: 3, row: 0, x: 634, y: 200, width: 160, height: 64});
assert.deepStrictEqual(deviceSlots[11],
	{bank: 1, column: 1, row: 1, x: 278, y: 454, width: 160, height: 64});

const tenDeviceMetrics = areaLayout.measureLineTile(10, 160, 64, 64,
	areaLayout.DEFAULTS);
assert.strictEqual(tenDeviceMetrics.columns, 4);
assert.strictEqual(tenDeviceMetrics.rows, 4);
assert.strictEqual(tenDeviceMetrics.banks, 2);
assert.strictEqual(tenDeviceMetrics.maxPerColumn, 2);

assert.deepStrictEqual(areaLayout.calculateDeviceGrid(2, areaLayout.DEFAULTS),
	{columns: 1, rows: 2, banks: 1, lastBankRows: 2,
		maxPerColumn: 2, maxColumns: 4, bankCapacity: 8},
	'two Devices fill the first stable column in bank zero');
assert.deepStrictEqual(areaLayout.calculateDeviceGrid(4, areaLayout.DEFAULTS),
	{columns: 2, rows: 2, banks: 1, lastBankRows: 2,
		maxPerColumn: 2, maxColumns: 4, bankCapacity: 8},
	'four Devices form the compact two-by-two goal layout');
assert.deepStrictEqual(areaLayout.calculateDeviceGrid(5, areaLayout.DEFAULTS),
	{columns: 3, rows: 2, banks: 1, lastBankRows: 2,
		maxPerColumn: 2, maxColumns: 4, bankCapacity: 8},
	'five Devices use at most three columns');
assert.deepStrictEqual(areaLayout.calculateDeviceGrid(8, areaLayout.DEFAULTS),
	{columns: 4, rows: 2, banks: 1, lastBankRows: 2,
		maxPerColumn: 2, maxColumns: 4, bankCapacity: 8},
	'eight Devices fill one bounded four-column bank');

let previousStableSlots = [];
for (let count = 1; count <= 35; count++)
{
	const grid = areaLayout.calculateDeviceGrid(count, areaLayout.DEFAULTS);
	const currentSlots = Array.from({length: count}, (_, index) =>
		areaLayout.calculateDeviceSlot(index, grid.maxPerColumn,
			100, 200, 160, 64, 18, 12, grid.maxColumns, 38));
	assert.deepStrictEqual(currentSlots.slice(0, previousStableSlots.length),
		previousStableSlots,
		`adding Device ${count} must preserve every existing slot`);
	previousStableSlots = currentSlots;
}

const emptyLineMetrics = areaLayout.measureLineTile(0, 160, 64, 64,
	areaLayout.DEFAULTS);
assert.strictEqual(emptyLineMetrics.rows, 0,
	'an empty Line must not reserve a fake Device row');
assert.strictEqual(emptyLineMetrics.hasDevices, false);
assert.strictEqual(emptyLineMetrics.width,
	areaLayout.DEFAULTS.emptyLineTileWidth,
	'an empty Line must not reserve Device columns');
assert.strictEqual(emptyLineMetrics.height, 64 +
	areaLayout.DEFAULTS.lineBottomPadding,
	'an empty Line must use a compact horizontal bus tile');

const lineGrid = areaLayout.packLineTiles([
	tenDeviceMetrics,
	areaLayout.measureLineTile(8, 160, 64, 64, areaLayout.DEFAULTS),
	areaLayout.measureLineTile(5, 160, 64, 64, areaLayout.DEFAULTS)
], 28, 180, Object.assign({}, areaLayout.DEFAULTS,
	{paddingRight: 28, maxAreaWidth: 2300}));
assert.strictEqual(lineGrid.placements[0].y, lineGrid.placements[1].y,
	'first two Lines must share a row');
assert.ok(lineGrid.placements[2].y > lineGrid.placements[1].y,
	'third Line must wrap to the next row');
assert.ok(lineGrid.placements.every((slot) =>
	slot.x + slot.width <= 2300),
	'Auto Line slots must respect maxAreaWidth');

const emptyLineGrid = areaLayout.packLineTiles([
	emptyLineMetrics, emptyLineMetrics, emptyLineMetrics
], 28, 180, Object.assign({}, areaLayout.DEFAULTS, {paddingRight: 28}));
assert.strictEqual(emptyLineGrid.placements[1].row, 0,
	'two empty Lines must share the first readable row');
assert.strictEqual(emptyLineGrid.placements[2].row, 1,
	'a third Line must wrap instead of creating a crowded third column');
assert.strictEqual(emptyLineGrid.placements[2].column, 0);
const wrappedGrid = areaLayout.packLineTiles([
	emptyLineMetrics, emptyLineMetrics, emptyLineMetrics, emptyLineMetrics
], 28, 180, Object.assign({}, areaLayout.DEFAULTS, {paddingRight: 28}));
assert.strictEqual(wrappedGrid.placements[2].row, 1,
	'a third empty Line wraps after the two-column first row is full');
assert.strictEqual(wrappedGrid.placements[0].x, wrappedGrid.placements[2].x,
	'visual columns must stay aligned between rows');
const wrappedBusX = wrappedGrid.placements[2].x + 95;
const wrappedFeederX = areaLayout.calculateLineFeederX(
	wrappedGrid.placements[2], wrappedBusX, areaLayout.DEFAULTS);
assert.notStrictEqual(wrappedFeederX, wrappedBusX,
	'a wrapped Line must not reuse the bus axis as its Main Line feeder');
assert.strictEqual(wrappedFeederX,
	wrappedGrid.placements[2].x -
	areaLayout.DEFAULTS.wrappedFeederGutter,
	'a wrapped feeder must use the clear gutter before its tile');
assert.strictEqual(areaLayout.calculateLineFeederX(
	emptyLineGrid.placements[0], emptyLineGrid.placements[0].x + 95,
	areaLayout.DEFAULTS), emptyLineGrid.placements[0].x -
	areaLayout.DEFAULTS.wrappedFeederGutter,
	'first and wrapped rows must share the same column gutter');

const twelveLineGrid = areaLayout.packLineTiles(Array.from({length: 12}, () =>
	emptyLineMetrics), 28, 180, Object.assign({}, areaLayout.DEFAULTS,
	{paddingRight: 28}));
assert.ok(twelveLineGrid.placements.every((slot) => slot.column < 2),
	'a large Area must never regress to the crowded three-column layout');
assert.strictEqual(twelveLineGrid.placements[0].x,
	twelveLineGrid.placements[10].x,
	'all rows in the first visual column must share one feeder axis');
assert.strictEqual(twelveLineGrid.placements[1].x,
	twelveLineGrid.placements[11].x,
	'all rows in the second visual column must share one feeder axis');

const compactArea = areaLayout.getAreaMinimumSize(false, areaLayout.DEFAULTS);
const adaptiveArea = areaLayout.getAreaMinimumSize(true, areaLayout.DEFAULTS);
assert.strictEqual(compactArea.width, areaLayout.DEFAULTS.minWidth,
	'Area with only a Main Line must use compact minimum width');
assert.strictEqual(compactArea.height, areaLayout.DEFAULTS.compactMinHeight,
	'Area with only a Main Line must not reserve a full adaptive grid');
assert.strictEqual(adaptiveArea.width, areaLayout.DEFAULTS.adaptiveMinAreaWidth,
	'Area with Secondary Lines must reserve adaptive grid width');
assert.strictEqual(adaptiveArea.height, areaLayout.DEFAULTS.minHeight,
	'Area with Secondary Lines must retain adaptive minimum height');

console.log('KnxAreaLayout tests passed');
