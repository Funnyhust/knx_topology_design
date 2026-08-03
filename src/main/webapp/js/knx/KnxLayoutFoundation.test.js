const assert = require('assert');

global.mxEvent = {CHANGE: 'change'};
const foundationModule = require('./KnxLayoutFoundation.js');
const KnxLayoutStore = foundationModule.KnxLayoutStore;
const KnxTopologyIndex = foundationModule.KnxTopologyIndex;
const KnxLayoutFoundation = foundationModule.KnxLayoutFoundation;

function value(attributes)
{
	return {
		attributes: Object.assign({}, attributes),
		getAttribute(name)
		{
			return Object.prototype.hasOwnProperty.call(this.attributes, name) ?
				this.attributes[name] : null;
		},
		setAttribute(name, next)
		{
			this.attributes[name] = String(next);
		}
	};
}

function cell(attributes, geometry)
{
	return {
		value: value(attributes),
		geometry: geometry || null,
		edge: false
	};
}

function fakeGraph(cells)
{
	const model = {
		cells,
		contains(candidate)
		{
			return Object.values(this.cells).includes(candidate);
		},
		addListener() {}
	};

	return {
		getModel()
		{
			return model;
		}
	};
}

(function testStoreSnapshot()
{
	const store = new KnxLayoutStore();
	store.data.nodes.device = {
		objectId: 'device', relativeX: 10, relativeY: 20,
		width: 100, height: 50, layoutMode: 'auto', locked: false
	};
	store.data.lines.line = {
		lineId: 'line', layoutDirection: 'vertical',
		deviceGapX: 35, deviceGapY: 33
	};
	const before = store.capture(['device'], [], ['line']);
	store.data.nodes.device.relativeX = 90;
	store.data.lines.line.deviceGapY = 99;
	store.applySnapshot(before);
	assert.equal(store.data.nodes.device.relativeX, 10);
	assert.equal(store.data.lines.line.deviceGapY, 33);
	assert.equal(store.serialize().schemaVersion, KnxLayoutFoundation.SCHEMA_VERSION);
	const saved = store.serialize();
	const loaded = new KnxLayoutStore(saved);
	assert.equal(loaded.data.projectId, store.data.projectId);
})();

(function testStableIndexAndAncestors()
{
	const area = cell({knxType: 'area', topologyId: 'legacy-area'});
	const line = cell({
		knxType: 'line', topologyId: 'legacy-line',
		parentTopologyId: 'legacy-area'
	}, {x: 100, y: 100, width: 4, height: 200});
	const device = cell({
		knxType: 'device', topologyId: 'legacy-device',
		parentTopologyId: 'legacy-line'
	}, {x: 180, y: 130, width: 190, height: 92});
	const graph = fakeGraph({a: area, l: line, d: device});
	const index = new KnxTopologyIndex(graph).buildTopologyIndex();

	assert.equal(index.getCell('legacy-device'), device);
	assert.equal(index.getChildrenCells('legacy-line', 'device')[0], device);
	assert.deepEqual(index.getAncestorPath('legacy-device').map((item) => item.type),
		['area', 'line', 'device']);
	assert.equal(index.findAreaId('legacy-device'), 'legacy-area');
	assert.equal(device.value.getAttribute('knxObjectId'), 'legacy-device');
})();

(function testDuplicateIdentityIsRepaired()
{
	const first = cell({knxType: 'device', topologyId: 'one', knxObjectId: 'same'});
	const second = cell({knxType: 'device', topologyId: 'two', knxObjectId: 'same'});
	const index = new KnxTopologyIndex(fakeGraph({first, second})).buildTopologyIndex();

	assert.notEqual(first.value.getAttribute('knxObjectId'),
		second.value.getAttribute('knxObjectId'));
	assert.ok(index.warnings.some((warning) => warning.code === 'DUPLICATE_OBJECT_ID'));
})();

(function testLegacyMigrationPreservesGeometry()
{
	const area = cell({knxType: 'area', topologyId: 'area-1'});
	const line = cell({
		knxType: 'line', topologyId: 'line-1', parentTopologyId: 'area-1'
	}, {x: 300, y: 200, width: 4, height: 300});
	const device = cell({
		knxType: 'device', topologyId: 'device-1', parentTopologyId: 'line-1'
	}, {x: 362, y: 230, width: 190, height: 92});
	const graph = fakeGraph({area, line, device});
	const editor = {graph};
	const foundation = new KnxLayoutFoundation({editor});
	const areaLayout = foundation.store.data.areas['area-1'];
	const deviceLayout = foundation.store.data.nodes['device-1'];

	assert.equal(areaLayout.x, 272);
	assert.equal(areaLayout.y, 134);
	assert.equal(deviceLayout.relativeX, 90);
	assert.equal(deviceLayout.relativeY, 96);
	assert.equal(areaLayout.x + deviceLayout.relativeX, device.geometry.x);
	assert.equal(areaLayout.y + deviceLayout.relativeY, device.geometry.y);
	assert.equal(deviceLayout.layoutMode, 'manual');
	assert.equal(deviceLayout.locked, true);
	assert.deepEqual(device.geometry, {x: 362, y: 230, width: 190, height: 92});
})();

(function testOrphanDoesNotGuessArea()
{
	const orphan = cell({knxType: 'device', topologyId: 'orphan'},
		{x: 10, y: 10, width: 100, height: 60});
	const graph = fakeGraph({orphan});
	const foundation = new KnxLayoutFoundation({editor: {graph}});

	assert.equal(foundation.store.data.nodes.orphan.areaId, null);
	assert.ok(foundation.getMigrationWarnings().some((warning) =>
		warning.code === 'MISSING_TOPOLOGY_PARENT'));
})();

console.log('KnxLayoutFoundation tests passed');
