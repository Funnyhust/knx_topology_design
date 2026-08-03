const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, 'KnxTopologyModule.js'), 'utf8');
const wireSource = fs.readFileSync(path.join(__dirname, '..', 'diagramly',
	'WireMode.js'), 'utf8');
const areaLayoutSource = fs.readFileSync(path.join(__dirname,
	'KnxAreaLayout.js'), 'utf8');
const workspaceSource = fs.readFileSync(path.join(__dirname,
	'KnxWorkspace.js'), 'utf8');
const constantsSource = fs.readFileSync(path.join(__dirname, 'core',
	'KnxConstants.js'), 'utf8');
const schemaSource = fs.readFileSync(path.join(__dirname, 'core',
	'KnxObjectSchema.js'), 'utf8');
const schema = require('./core/KnxObjectSchema.js');

assert.ok(source.includes('KnxTopologyModule.prototype.addAreaStructure'),
	'Add Area must have one explicit structural workflow');
assert.ok(source.includes("runTopologyMutation('add-area'"),
	'Add Area structure must run in one topology mutation');
assert.ok(source.includes("'area-input'"),
	'Add Area must create the Backbone to Area Coupler structural relation');
assert.ok(source.includes("'area-output'"),
	'Add Area must create the Area Coupler to Main Line structural relation');
assert.ok(source.includes("relationPrefix == 'device' ? 'device-bus' : 'structural'"),
	'Structural connections must be distinguishable from Device bus connections');

const layoutAddedAreaStart = source.indexOf(
	'KnxTopologyModule.prototype.layoutAddedArea');
const addLineStart = source.indexOf('KnxTopologyModule.prototype.layoutAddedLine');
const layoutAddedArea = source.slice(layoutAddedAreaStart, addLineStart);
const engineBranch = layoutAddedArea.slice(0,
	layoutAddedArea.indexOf('var cells = this.graph.getModel().cells'));

assert.ok(engineBranch.includes('if (this.areaLayoutEngine != null)'),
	'Layout Store must own Area placement when the Area engine is active');
assert.ok(engineBranch.includes('return;'),
	'Area structural projection must return before the legacy global cell scan');
assert.ok(!engineBranch.includes('for (var id in cells)'),
	'New Area placement must not scan global mxCell geometry');

const addDeviceStart = source.indexOf('KnxTopologyModule.prototype.addDevice');
const selectStart = source.indexOf('KnxTopologyModule.prototype.selectTopologyCell');
const manualDeviceWorkflow = source.slice(addDeviceStart, selectStart);
assert.ok(manualDeviceWorkflow.includes('startDevicePlacement'),
	'Add Device must enter placement preview');
assert.ok(manualDeviceWorkflow.includes('deviceType: equipmentType.value'),
	'Placed equipment must persist its selected Device type');
assert.ok(manualDeviceWorkflow.includes("connectionState: 'PlacedUnconnected'"),
	'Placed Device must start without a visual bus connection');
assert.ok(manualDeviceWorkflow.includes("layoutMode: 'manual'"),
	'Placed Device must be Manual');
assert.ok(!manualDeviceWorkflow.includes('layoutAddedDevice(line, cell)'),
	'New Add Device workflow must not auto place or auto wire the Device');
assert.ok(source.includes('KnxTopologyModule.prototype.startConnectBus'),
	'Connect Bus must be an explicit workflow separate from Add Device');
assert.ok(source.includes("'connectionState', 'PlacedUnconnected'"),
	'Disconnecting a bus must preserve the Device as PlacedUnconnected');
assert.ok(wireSource.includes('DrawioWireModeLoaded'),
	'Wiring mode must be installed once');
assert.ok(wireSource.includes('startWireModeFromCell'),
	'Legacy wiring entry points must remain compatible');
assert.ok(wireSource.includes('ui.enterWireMode()') &&
	source.includes('this.editorUi.enterWireMode()'),
	'W and Connect Bus must arm the same source-independent wiring mode');
assert.ok(wireSource.includes("window.addEventListener('keydown'") &&
	wireSource.includes('document.body.contains(graph.container)'),
	'W must work from Canvas, Tree, Properties and toolbar focus');
assert.ok(!wireSource.includes('keyHandler.bindKey(87'),
	'W must have no competing mxKeyHandler path');
assert.ok(!wireSource.includes('keyHandler.getFunction = function'),
	'W must not override printable-key dispatch');
assert.ok(wireSource.includes('evt.stopImmediatePropagation()'),
	'W must reserve the physical key before downstream handlers run');
assert.ok(!wireSource.includes('connectionHandler.start(') &&
	!wireSource.includes('connectionHandler.reset()') &&
	!wireSource.includes('graph.knxWireModeSourceCell') &&
	!wireSource.includes('graph.setSelectionCell('),
	'Entering or cancelling Wiring Mode must not select, move or delete equipment');
assert.ok(wireSource.includes('createWireConstraint') &&
	wireSource.includes('graph.setConnectionConstraint(edge, source.cell, true') &&
	wireSource.includes('graph.setConnectionConstraint(edge, target.cell, false'),
	'Equipment endpoints must persist their chosen perimeter constraints');
assert.ok(wireSource.includes('graph.getPointForEvent(evt, false)') &&
	wireSource.includes('module.getEquipmentCells()') &&
	wireSource.includes('viewPoint.x >= state.x') &&
	wireSource.includes('geometry.setTerminalPoint(clonePoint(points[0]), true)') &&
	wireSource.includes('geometry.setTerminalPoint(clonePoint(points[points.length - 1]), false)'),
	'Wiring must support stable source and target points in free canvas space');
assert.ok(wireSource.includes('new mxPolyline') &&
	wireSource.includes('geometry.points.push(clonePoint(points[i]))') &&
	wireSource.includes('graph.insertEdge('),
	'Preview and committed wires must preserve explicit orthogonal vertices');
assert.ok(wireSource.includes('var finishCurrentWire = function()') &&
	wireSource.includes('anchors.push(cursor)') &&
	wireSource.includes('ui.wireModeCursor = resolveWirePoint(me)') &&
	wireSource.includes('evt.button == 2') && wireSource.includes('evt.which == 3') &&
	wireSource.includes("addEventListener('mousedown', pointerDown, true)") &&
	wireSource.includes("addEventListener('contextmenu'") &&
	wireSource.includes('evt.stopImmediatePropagation()'),
	'Right-click/Esc must commit the live endpoint without opening a context menu');
assert.ok(wireSource.includes("'#00b96b'") &&
	wireSource.includes('mxConstants.STYLE_STROKEWIDTH') &&
	source.includes("module.setEdgeStyleValue(edge, 'strokeColor', '#00b96b')") &&
	source.includes('if (isBusWire || isManualWire)'),
	'Preview and committed manual wiring must share the green KNX style');
assert.ok(!source.includes('cells = cells || graph.getDeletableCells(graph.getSelectionCells())') &&
	!areaLayoutSource.includes('cells = cells || graph.getDeletableCells(graph.getSelectionCells())'),
	'Internal cleanup must never fall back to deleting selected KNX equipment');
assert.ok(wireSource.includes("setAttribute('data-wire-mode', 'armed')"),
	'Active wiring mode must keep visible crosshair state');
assert.ok(source.includes('getOrCreateManualJunction = function(owner, point)') &&
	source.includes('return this.ensureJunction(owner, key, x, y);'),
	'Manual wiring must attach to a routed bus junction');
assert.ok(source.includes('KnxTopologyModule.prototype.normalizeHierarchy') &&
	!source.includes('normalizeLegacyHierarchy'),
	'Legacy projects must use the original topology normalization path');
assert.ok(workspaceSource.includes('createEquipmentAddControl') &&
	workspaceSource.includes('KnxObjectSchema.getEquipmentTypes()') &&
	workspaceSource.includes('this.module.addDevice(select.value)') &&
	!workspaceSource.includes("createButton('Add Area'") &&
	!workspaceSource.includes("createButton('Add Line'"),
	'The workspace must expose one typed Add Device flow without Add Area or Add Line');
assert.ok(workspaceSource.includes("attributeFilter: ['data-wire-mode']") &&
	workspaceSource.includes("classList.toggle('knxWorkspaceActionActive', active)") &&
	workspaceSource.includes("setAttribute('aria-pressed', active ? 'true' : 'false')"),
	'Wiring toolbar action must visibly and accessibly reflect the armed mode state');
assert.ok(schemaSource.includes("value: 'device'") &&
	schemaSource.includes("value: 'lc'") && schemaSource.includes("value: 'bc'") &&
	schemaSource.includes("value: 'lineRepeater'") &&
	schemaSource.includes("value: 'powerSupply'") &&
	schemaSource.includes("shortName: 'PS'") &&
	schemaSource.includes("stripColor: '#d92d20'"),
	'Device, LC, BC, Line Repeater and red KNX Power Supply must be selectable types');
assert.strictEqual(schema.getEquipmentType('powerSupply').defaultName,
	'KNX Power Supply', 'Power Supply must use the canonical equipment schema');
assert.strictEqual(schema.createEquipmentDefaults('powerSupply').applicationName,
	'KNX Power Supply Application', 'Power Supply must receive suitable defaults');
assert.deepStrictEqual(schema.parseIndividualAddress('2.3.42'), {
	area: 2, line: 3, device: 42, areaAddress: '2', lineAddress: '2.3',
	individualAddress: '2.3.42'
}, 'Individual Address must provide the Area and Line projection');
assert.strictEqual(schema.parseIndividualAddress('16.1.1'), null,
	'Out-of-range Individual Addresses must remain outside the derived topology');
assert.deepStrictEqual(schema.parsePowerSupplyAddress('2.3.'), {
	area: 2, line: 3, device: null, areaAddress: '2', lineAddress: '2.3',
	individualAddress: '2.3.'
}, 'Power Supply address must stop at Area.Line and retain the trailing dot');
assert.strictEqual(schema.parsePowerSupplyAddress('2.3.42'), null,
	'Power Supply must reject an Individual Address device segment');
assert.deepStrictEqual(schema.parseEquipmentAddress('2.3.', 'powerSupply'),
	schema.parsePowerSupplyAddress('2.3.'),
	'Equipment address parsing must use the Power Supply domain rule');
const addressTreeStart = source.indexOf(
	'KnxTopologyModule.prototype.refreshTopologyTree');
const legacyTreeStart = source.indexOf(
	'KnxTopologyModule.prototype.refreshLegacyTopologyTree');
const addressTree = source.slice(addressTreeStart, legacyTreeStart);
assert.ok(addressTree.includes('this.getEquipmentCells()') &&
	addressTree.includes('KnxObjectSchema.parseEquipmentAddress') &&
	addressTree.includes('Invalid or unassigned address') &&
	!addressTree.includes('module.addArea()') &&
	!addressTree.includes('module.addSecondaryLineStructure'),
	'The active Project Tree must be derived from equipment IA without structural Add actions');
assert.ok(source.includes('validateEquipmentAddresses') &&
	source.includes("equipmentType != 'powerSupply'") &&
	source.includes("code: 'INDIVIDUAL_ADDRESS_INVALID'") &&
	source.includes("code: 'INDIVIDUAL_ADDRESS_DUPLICATE'"),
	'Equipment-first validation must report invalid and duplicate IA');
assert.ok(source.includes("if (deviceType == 'powerSupply')") &&
	source.includes("return '1.1.'") &&
	source.includes("'Line Address (Area.Line.)'") &&
	source.includes('normalizePowerSupplyAddresses'),
	'Power Supply creation, migration and Properties must use a Line-only address');
assert.ok(workspaceSource.includes('KnxObjectSchema.parseEquipmentAddress'),
	'Status counts must parse Power Supply Line addresses');
assert.ok(workspaceSource.includes("'<span>Areas: ' + Object.keys(areas).length") &&
	workspaceSource.includes("'<span>Lines: ' + Object.keys(lines).length") &&
	workspaceSource.includes("'<span>Equipment: ' + equipment.length"),
	'Status counts must use the same address-derived topology projection');
assert.ok(schemaSource.includes("{name: 'orderNumber', label: 'Order Number'}") &&
	schemaSource.includes("{name: 'manufacturer', label: 'Manufacturer'}"),
	'Device identity and product metadata must remain editable');
assert.ok(source.includes('module.graph.view.invalidate(changedCell') &&
	source.includes('KnxObjectSchema.getCardDetailFields()') &&
	source.includes('detailHtml += detailRow') &&
	schemaSource.includes("{name: 'applicationName', label: 'Application'}") &&
	schemaSource.includes("{name: 'room', label: 'Room'}"),
	'Property edits must invalidate the cached card and render product details');
assert.ok(constantsSource.includes('EQUIPMENT_CARD_WIDTH: 180') &&
	constantsSource.includes('EQUIPMENT_CARD_HEIGHT: 100') &&
	source.includes('KnxConstants.EQUIPMENT_CARD_WIDTH') &&
	schemaSource.includes("{name: 'room', label: 'Room'}"),
	'Detailed Device cards and the Room property must be available');
assert.ok(source.includes('var width = KnxTopologyModule.DEVICE_WIDTH') &&
	source.includes('var height = KnxTopologyModule.DEVICE_HEIGHT') &&
	source.includes('model.setStyle(cells[i], KnxTopologyModule.EQUIPMENT_CARD_STYLE)'),
	'Existing and new equipment must use one exact normalized card presentation');
assert.ok(source.includes('font-size:15px') &&
	source.includes('font-size:14px') && source.includes('font-size:10px') &&
	source.includes('width:12px;flex:none;background:') &&
	source.includes('gap:7px') && source.includes('width:70px;flex:none'),
	'Equipment cards must prioritize Name and IA over secondary metadata');
assert.ok(source.includes("this.getCells('device').concat(this.getCells('coupler'))") &&
	areaLayoutSource.includes('deviceCardWidth: constants.EQUIPMENT_CARD_WIDTH') &&
	areaLayoutSource.includes('deviceCardHeight: constants.EQUIPMENT_CARD_HEIGHT') &&
	areaLayoutSource.includes('couplerWidth: constants.EQUIPMENT_CARD_WIDTH') &&
	areaLayoutSource.includes('couplerHeight: constants.EQUIPMENT_CARD_HEIGHT'),
	'Devices, Line Couplers and Area Couplers must use one card size');
assert.ok(areaLayoutSource.slice(
	areaLayoutSource.indexOf('prototype.handleProjectLoaded'),
	areaLayoutSource.indexOf('prototype.upgradeLegacyAutoLineProjection'))
	.includes('ensureAreaContainers'),
	'Project load must restore the original Area container projection');
assert.ok(!source.includes('graph.knxWireModeSourceCell') &&
	!areaLayoutSource.includes('graph.knxWireModeSourceCell') &&
	source.includes('if (graph.knxWireModeInputGuard)') &&
	areaLayoutSource.includes('if (graph.knxWireModeInputGuard)') &&
	source.includes('if (cells == null)') &&
	areaLayoutSource.includes('if (cells == null)'),
	'Delete bridges must reject internal cleanup without source-cell state');

console.log('KnxTopologyStructure tests passed');
