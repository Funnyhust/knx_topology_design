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
const workspaceCssSource = fs.readFileSync(path.join(__dirname,
	'KnxWorkspace.css'), 'utf8');
const indexSource = fs.readFileSync(path.join(__dirname, '..', '..',
	'index.html'), 'utf8');
const constantsSource = fs.readFileSync(path.join(__dirname, 'core',
	'KnxConstants.js'), 'utf8');
const schemaSource = fs.readFileSync(path.join(__dirname, 'core',
	'KnxObjectSchema.js'), 'utf8');
const schema = require('./core/KnxObjectSchema.js');
const lumiLogo = fs.readFileSync(path.join(__dirname, '..', '..', 'images',
	'knx', 'logo-lumi.png'));
const knxMemberLogo = fs.readFileSync(path.join(__dirname, '..', '..', 'images',
	'knx', 'logo-knx-member.jpg'));

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
	source.includes('this.editorUi.toggleWireMode()'),
	'W and Connect Bus must arm the same source-independent wiring mode');
assert.ok(wireSource.includes('var repeatedAnchor =') &&
	wireSource.includes('if (repeatedAnchor && anchors.length > 1)') &&
	wireSource.includes('commitCurrentWire();') &&
	wireSource.includes('this.toggleWireMode = function()') &&
	wireSource.includes('return ui.cancelWireMode();') &&
	wireSource.includes('ui.toggleWireMode();'),
	'A repeated stationary left-click must finish the wire and W/toolbar must toggle Wiring Mode');
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
assert.ok(workspaceSource.includes('createEquipmentQuickActions') &&
	workspaceSource.includes("{value: 'powerSupply', label: 'Power'") &&
	workspaceSource.includes("{value: 'lc', label: 'LC'") &&
	workspaceSource.includes("{value: 'bc', label: 'BC'") &&
	workspaceSource.includes('workspace.module.addDevice(type.value)') &&
	workspaceSource.includes("setAttribute('data-knx-device-type', type.value)"),
	'Power Supply, LC and BC must have direct one-click placement actions');
assert.ok(workspaceSource.includes('createProjectDownloadControl') &&
	workspaceSource.includes("{value: 'lukatp', label: '.lukatp'}") &&
	workspaceSource.includes("{value: 'png', label: 'PNG · No grid'}") &&
	workspaceSource.includes("{value: 'png-grid', label: 'PNG · Grid'}") &&
	workspaceSource.includes("{value: 'pdf', label: 'PDF · No grid'}") &&
	workspaceSource.includes("{value: 'pdf-grid', label: 'PDF · Grid'}") &&
	workspaceSource.includes('saveProjectToDevice(select.value)') &&
	workspaceSource.includes('exportProjectPngToDevice') &&
	workspaceSource.includes('exportProjectPdfToDevice') &&
	workspaceSource.includes("null, null, 0, false, includeGrid") &&
	!workspaceSource.includes('drawTechnicalGrid') &&
	workspaceSource.includes('@page{size:') &&
	workspaceSource.includes('createTechnicalDrawingCanvas') &&
	workspaceSource.includes("this.editorUi.getFileData(true)") &&
	workspaceSource.includes("this.editorUi.doSaveLocalFile(data, filename, 'application/xml')") &&
	workspaceSource.includes('file.setModified(false)') &&
	!workspaceSource.includes("doSaveLocalFile(data, filename, 'text/xml')") &&
	workspaceSource.includes("createButton('Download'") &&
	!workspaceSource.includes("runEditorAction('save')"),
	'KNX Download must offer editable LUKA topology and framed grid/no-grid PNG/PDF without a cloud provider');
assert.ok(workspaceSource.includes('createMobileControls') &&
	workspaceSource.includes("workspace.toggleMobilePanel('project')") &&
	workspaceSource.includes("workspace.toggleMobilePanel('properties')") &&
	workspaceSource.includes("addButton('Canvas'") &&
	workspaceCssSource.includes('@media (max-width: 1179px)') &&
	workspaceCssSource.includes('.knxMobileNav') &&
	workspaceCssSource.includes('left: 0 !important;') &&
	workspaceCssSource.includes('width: min(86vw, 360px) !important;') &&
	workspaceCssSource.includes('min-height: 44px;'),
	'Mobile/iPad layout must use full-width Canvas, overlay panels and touch targets below the desktop breakpoint');
assert.ok(workspaceSource.includes('showProjectInfoDialog') &&
	workspaceSource.includes('createFileMenuControl') &&
	workspaceSource.includes("{label: 'New Project'") &&
	workspaceSource.includes("{label: 'Open Project...'") &&
	workspaceSource.includes("{label: 'Import Drawing...'") &&
	workspaceSource.includes("{label: 'Save Project (.lukatp)'") &&
	workspaceSource.includes("input.accept = '.lukatp,.drawio,.xml,application/xml,text/xml'") &&
	workspaceSource.includes('ui.isCompatibleString(data)') &&
	workspaceSource.includes('ui.fileLoaded(new LocalFile') &&
	workspaceSource.includes('ui.importFiles([file]') &&
	workspaceSource.includes('var metadata = this.getProjectMetadata()') &&
	workspaceSource.includes('this.setProjectMetadata(metadata)') &&
	workspaceSource.includes('confirmDiscardChanges') &&
	workspaceSource.includes("createButton('Project Info'") &&
	workspaceSource.includes("projectName: 'knxProjectName'") &&
	workspaceSource.includes("designer: 'knxDesigner'") &&
	workspaceSource.includes("designDate: 'knxDesignDate'") &&
	workspaceSource.includes('this.module.getEquipmentCells().length') &&
	workspaceSource.includes("writeCell('Rev / Equipment'") &&
	workspaceSource.includes('file.setModified(true)'),
	'Design information must persist in the project and File import must preserve it');
assert.ok(workspaceSource.includes("lumi: 'images/knx/logo-lumi.png'") &&
	workspaceSource.includes("knxMember: 'images/knx/logo-knx-member.jpg'") &&
	workspaceSource.includes('drawContainedImage') &&
	lumiLogo.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
	knxMemberLogo[0] == 255 && knxMemberLogo[1] == 216 &&
	!workspaceSource.includes('logo-knx-partner'),
	'Lumi PNG and KNX Member JPEG must be valid assets rendered in the technical title block');
assert.ok(indexSource.includes('<title>Lumi KNX Topology</title>') &&
	indexSource.includes('rel="icon" type="image/png" href="images/knx/logo-lumi.png') &&
	indexSource.includes('class="knxStartupSplash"') &&
	indexSource.includes('LUMI KNX Topology') &&
	!indexSource.includes('Flowchart Maker and Online Diagram Software') &&
	!indexSource.includes('draw.io is free online diagram software') &&
	workspaceSource.includes('class="knxWorkspaceLumiLogo"') &&
	workspaceSource.includes('class="knxWorkspaceKnxMemberLogo"') &&
	workspaceSource.includes('alt="KNX Member"') &&
	!workspaceSource.includes('class="knxWorkspaceTitle"') &&
	workspaceSource.includes("this.editorUi.editor.appName = 'Lumi KNX Topology'") &&
	workspaceSource.includes('this.editorUi.updateDocumentTitle()'),
	'Lumi favicon and compact Lumi/KNX Member header branding must be visible in the webapp');
assert.ok(workspaceSource.includes("attributeFilter: ['data-wire-mode']") &&
	workspaceSource.includes("classList.toggle('knxWorkspaceActionActive', active)") &&
	workspaceSource.includes("setAttribute('aria-pressed', active ? 'true' : 'false')"),
	'Wiring toolbar action must visibly and accessibly reflect the armed mode state');
assert.ok(workspaceSource.includes('createPanelResizeHandles') &&
	workspaceSource.includes("window.localStorage.setItem('knxPanelWidths'") &&
	workspaceSource.includes("createHandle('left', 'Resize Project panel')") &&
	workspaceSource.includes("createHandle('right', 'Resize Properties panel')") &&
	workspaceSource.includes('handle.setPointerCapture(evt.pointerId)') &&
	workspaceSource.includes('workspace.setPanelWidth(side') &&
	workspaceSource.includes('this.graph.container || this.editorUi.diagramContainer') &&
	workspaceSource.includes("evt.key == 'ArrowLeft'") &&
	workspaceCssSource.includes('@media (min-width: 1180px)') &&
	workspaceCssSource.includes('.knxPanelResizeHandle-left') &&
	workspaceCssSource.includes('.knxPanelResizeHandle-right'),
	'Desktop Project and Properties panels must have bounded persistent mouse and keyboard resize handles');
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
	source.includes('color:#30343b;background:transparent;') &&
	source.includes('gap:7px') && source.includes('width:70px;flex:none'),
	'Equipment cards must prioritize Name and IA over secondary metadata without covering their frame');
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
