/**
 * KNX topology prototype for draw.io.
 *
 * Keeps KNX device data in the mxCell XML value so it is persisted with the
 * diagram. The canvas card, topology tree and property inspector are views of
 * the same object.
 */
(function()
{
	if (window.KnxTopologyModule != null)
	{
		return;
	}

	function KnxTopologyModule(editorUi)
	{
		this.editorUi = editorUi;
		this.graph = editorUi.editor.graph;
		this.graph.knxTopologyModule = this;
		this.sidebarContent = null;
		this.installListeners();
		this.installStyles();
		this.installBusConnectionHandler();
		this.installDevicePlacementHandler();
		this.installBusDisconnectHandler();
	}

	KnxTopologyModule.get = function(editorUi)
	{
		if (editorUi.knxTopology == null)
		{
			editorUi.knxTopology = new KnxTopologyModule(editorUi);
		}

		return editorUi.knxTopology;
	};

	KnxTopologyModule.BUS_WIDTH = KnxConstants.BUS_WIDTH;
	KnxTopologyModule.DEVICE_WIDTH = KnxConstants.EQUIPMENT_CARD_WIDTH;
	KnxTopologyModule.DEVICE_HEIGHT = KnxConstants.EQUIPMENT_CARD_HEIGHT;
	KnxTopologyModule.EQUIPMENT_CARD_STYLE =
		'rounded=0;whiteSpace=wrap;html=1;overflow=fill;align=left;' +
		'verticalAlign=top;spacing=0;fillColor=#ffffff;strokeColor=#667085;' +
		'strokeWidth=1;shadow=0;connectable=1;selectable=1;pointerEvents=1;';

	KnxTopologyModule.createObjectId = function()
	{
		if (window.crypto != null && typeof window.crypto.randomUUID == 'function')
		{
			return window.crypto.randomUUID();
		}

		return 'knx-' + Date.now().toString(36) + '-' +
			Math.random().toString(36).substring(2, 10) + '-' +
			Math.random().toString(36).substring(2, 10);
	};

	KnxTopologyModule.prototype.installStyles = function()
	{
		if (document.getElementById('knx-topology-styles') != null)
		{
			return;
		}

		var style = document.createElement('style');
		style.id = 'knx-topology-styles';
		style.textContent =
			'.knxTopologyPanel{padding:10px;font-family:Arial,sans-serif;color:#30343b}' +
			'.knxTopologyActions{display:flex;gap:6px;margin-bottom:10px}' +
			'.knxTopologyButton{flex:1;border:1px solid #b8c1cc;border-radius:5px;' +
			'background:#fff;padding:7px 6px;cursor:pointer;font-size:12px}' +
			'.knxTopologyButtonPrimary{background:#0875e1;color:#fff;border-color:#0875e1}' +
			'.knxTreeRow{display:flex;align-items:center;gap:6px;min-height:25px;' +
			'padding:2px 5px;border-radius:4px;font-size:12px;cursor:default;user-select:none}' +
			'.knxTreeRow:hover{background:#eef3f8}' +
			'.knxTreeRowSelected{background:#dcecff!important}' +
			'.knxTreeDevice{cursor:pointer;margin-left:32px}' +
			'.knxTreeDevice:hover{background:#eaf3ff}' +
			'.knxTreeIcon{width:8px;height:8px;border-radius:50%;background:#00b96b;flex:none}' +
			'.knxTreeHint{padding:8px 5px;color:#6f7882;font-size:11px;line-height:1.4}' +
			'.knxPropertyPanel{padding:14px;font-family:Arial,sans-serif;color:#30343b}' +
			'.knxPropertyTitle{font-size:16px;font-weight:600;margin-bottom:3px}' +
			'.knxPropertySubtitle{font-size:11px;color:#6f7882;margin-bottom:16px}' +
			'.knxPropertyField{margin-bottom:12px}' +
			'.knxPropertyField label{display:block;font-size:11px;font-weight:600;' +
			'color:#59636f;margin-bottom:5px}' +
			'.knxPropertyField input,.knxPropertyField select{box-sizing:border-box;width:100%;height:32px;' +
			'border:1px solid #c9d0d8;border-radius:4px;padding:5px 8px;font-size:13px}' +
			'.knxPropertyField input:focus,.knxPropertyField select:focus{outline:none;border-color:#0875e1;' +
			'box-shadow:0 0 0 1px #0875e1}' +
			'.knxPropertySection{border-top:1px solid #e0e4e8;margin-top:15px;padding-top:12px}' +
			'.knxPropertyReadOnly{font-size:12px;color:#59636f;line-height:1.7}' +
			'.knxContextMenu{position:fixed;z-index:10020;min-width:180px;padding:5px;' +
			'border:1px solid #b8c1cc;border-radius:5px;background:#fff;' +
			'box-shadow:0 5px 18px rgba(0,0,0,.2);font:12px Arial,sans-serif}' +
			'.knxContextItem{padding:7px 10px;border-radius:3px;cursor:pointer}' +
			'.knxContextItem:hover{background:#eaf3ff;color:#0875e1}' +
			'.knxContextSeparator{height:1px;background:#e1e5e9;margin:4px 2px}';
		document.head.appendChild(style);
	};

	KnxTopologyModule.prototype.installListeners = function()
	{
		var module = this;

		this.graph.getModel().addListener(mxEvent.CHANGE, function(sender, evt)
		{
			var foundation = module.graph.knxLayoutFoundation;

			if (foundation != null)
			{
				foundation.handleModelChange(evt);
			}

			module.refreshTopologyTree();

			var edit = evt != null && evt.getProperty != null ?
				evt.getProperty('edit') : null;
			var changes = edit != null ? (edit.changes || []) : [];
			var labelsChanged = false;

			for (var changeIndex = 0; changeIndex < changes.length; changeIndex++)
			{
				var changedCell = changes[changeIndex].cell || null;

				// mxCellAttributeChange mutates the XML value directly. mxGraph does
				// not automatically invalidate its cached HTML label, so Properties
				// appeared to save while the Device card stayed unchanged.
				if (changedCell != null && module.isTopologyCell(changedCell))
				{
					module.graph.view.invalidate(changedCell, false, false);
					labelsChanged = true;
				}
			}

			if (labelsChanged)
			{
				module.graph.view.validate();
			}

			var hierarchyChanged = changes.some(function(change)
			{
				var cell = change.child || change.cell || null;
				var type = cell != null ?
					(module.getAttribute(cell, 'knxType') ||
					module.getAttribute(cell, 'knxObjectType')) : '';
				return cell != null && (type == 'area' || type == 'line' ||
					type == 'coupler' || type == 'device');
			});

			if (hierarchyChanged)
			{
				module.refreshAreaLabels();
			}
		});

		this.graph.getSelectionModel().addListener(mxEvent.CHANGE, function()
		{
			var cell = module.graph.getSelectionCell();

			if (module.isTopologyCell(cell) && !module.editorUi.isFormatPanelVisible())
			{
				module.editorUi.toggleFormatPanel(true);
			}

			module.refreshTopologyTree();
		});
	};

	KnxTopologyModule.prototype.installBusConnectionHandler = function()
	{
		var module = this;
		var handler = this.graph.connectionHandler;

		if (handler == null || handler.knxBusConnectionInstalled)
		{
			return;
		}

		handler.knxBusConnectionInstalled = true;
		var connectionHandlerConnect = handler.connect;

		handler.addListener(mxEvent.CONNECT, function(sender, evt)
		{
			var edge = evt.getProperty('cell');

			var isBusWire = edge != null && module.isKnxWireEdge(edge);
			var isManualWire = edge != null && mxUtils.getValue(
				module.graph.getCellStyle(edge), 'wireMode', '0') == '1';

			if (isBusWire || isManualWire)
			{
				module.setEdgeStyleValue(edge, 'edgeStyle', 'orthogonalEdgeStyle');
				module.setEdgeStyleValue(edge, 'rounded', '0');
				module.setEdgeStyleValue(edge, 'startArrow', 'none');
				module.setEdgeStyleValue(edge, 'endArrow', 'none');
				module.setEdgeStyleValue(edge, 'strokeColor', '#00b96b');
				module.setEdgeStyleValue(edge, 'strokeWidth', KnxTopologyModule.BUS_WIDTH);
				module.setEdgeStyleValue(edge, 'wireMode', '1');

				if (isBusWire)
				{
					module.handleManualBusConnection(edge);
				}
			}
		});

		handler.connect = function(source, target, evt, dropTarget)
		{
			if (target != null && (module.isBus(target) || module.isBackbone(target)))
			{
				var point = module.graph.getPointForEvent(evt);
				target = module.getOrCreateManualJunction(target, point);
				dropTarget = target;
			}

			return connectionHandlerConnect.call(this, source, target, evt, dropTarget);
		};
	};

	KnxTopologyModule.prototype.getDeviceFromWireEdge = function(edge)
	{
		if (edge == null)
		{
			return null;
		}

		return this.isDevice(edge.source) ? edge.source :
			(this.isDevice(edge.target) ? edge.target : null);
	};

	KnxTopologyModule.prototype.getBusFromWireEdge = function(edge)
	{
		if (edge == null)
		{
			return null;
		}

		var source = this.getWireOwner(edge.source);
		var target = this.getWireOwner(edge.target);
		return source != null ? source : target;
	};

	KnxTopologyModule.prototype.getDeviceConnectionState = function(device)
	{
		if (!this.isDevice(device))
		{
			return '';
		}

		var parent = this.findByTopologyId(this.getAttribute(device, 'parentTopologyId'));
		var edges = this.graph.getEdges(device) || [];
		var busEdges = [];
		var invalidVisualEdges = 0;
		var valid = 0;

		for (var i = 0; i < edges.length; i++)
		{
			var bus = this.getBusFromWireEdge(edges[i]);

			if (bus != null)
			{
				busEdges.push(edges[i]);
				valid += bus == parent ? 1 : 0;
			}
			else if (mxUtils.getValue(this.graph.getCellStyle(edges[i]),
				'wireMode', '0') == '1')
			{
				invalidVisualEdges++;
			}
		}

		if (busEdges.length == 0 && invalidVisualEdges == 0)
		{
			return 'PlacedUnconnected';
		}

		return busEdges.length == 1 && valid == 1 && invalidVisualEdges == 0 ?
			'Connected' : 'ConnectionInvalid';
	};

	KnxTopologyModule.prototype.validateDeviceConnections = function()
	{
		var devices = this.getCells('device');
		var result = {warnings: [], errors: []};

		for (var i = 0; i < devices.length; i++)
		{
			var state = this.getDeviceConnectionState(devices[i]);

			if (state == 'PlacedUnconnected')
			{
				result.warnings.push({objectId: this.getObjectId(devices[i]),
					code: 'DEVICE_BUS_UNCONNECTED'});
			}
			else if (state == 'ConnectionInvalid')
			{
				result.errors.push({objectId: this.getObjectId(devices[i]),
					code: 'DEVICE_BUS_INVALID'});
			}
		}

		var edges = [];
		var modelCells = this.graph.getModel().cells;

		for (var cellId in modelCells)
		{
			if (modelCells[cellId] != null && modelCells[cellId].edge)
			{
				edges.push(modelCells[cellId]);
			}
		}

		var hasRelation = mxUtils.bind(this, function(prefix, source, target)
		{
			var key = prefix + '-' + this.getAttribute(source, 'topologyId') + '-' +
				this.getAttribute(target, 'topologyId');
			return edges.some(mxUtils.bind(this, function(edge)
			{
				return mxUtils.getValue(this.graph.getCellStyle(edge),
					'knxRelationKey', '') == key;
			}));
		});
		var backbone = this.getCells('backbone')[0] || null;
		var areas = this.getCells('area');

		for (var areaIndex = 0; areaIndex < areas.length; areaIndex++)
		{
			var areaCoupler = this.getCoupler(areas[areaIndex], 'area');
			var areaLines = this.getChildren(areas[areaIndex], 'line');
			var mainLine = areaLines.filter(this.isMainLine.bind(this))[0] || null;

			if (backbone == null || areaCoupler == null || mainLine == null ||
				!hasRelation('area-input', backbone, areaCoupler) ||
				!hasRelation('area-output', areaCoupler, mainLine))
			{
				result.errors.push({objectId: this.getObjectId(areas[areaIndex]),
					code: 'AREA_STRUCTURAL_CONNECTION_MISSING'});
			}

			for (var lineIndex = 0; lineIndex < areaLines.length; lineIndex++)
			{
				if (!this.isMainLine(areaLines[lineIndex]))
				{
					var coupler = this.getCoupler(areaLines[lineIndex], 'line');

					if (coupler == null || !hasRelation('line-input', mainLine, coupler) ||
						!hasRelation('line-output', coupler, areaLines[lineIndex]))
					{
						result.errors.push({objectId: this.getObjectId(areaLines[lineIndex]),
							code: 'LINE_STRUCTURAL_CONNECTION_MISSING'});
					}
				}
			}
		}

		return result;
	};

	KnxTopologyModule.prototype.runConnectionValidation = function()
	{
		var module = this;
		var equipmentFirst = this.getCells('device').some(function(device)
		{
			return module.getAttribute(device, 'deviceType') != '';
		});
		var structuralProject = !equipmentFirst &&
			(this.getCells('area').length > 0 || this.getCells('line').length > 0);
		var result = structuralProject ? this.validateDeviceConnections() :
			this.validateEquipmentAddresses();
		this.editorUi.editor.setStatus(structuralProject ?
			(result.errors.length + ' bus error(s), ' + result.warnings.length +
			' unconnected Device warning(s).') :
			(result.errors.length + ' address error(s), ' + result.warnings.length +
			' topology warning(s).'));
		this.refreshTopologyTree();
		return result;
	};

	KnxTopologyModule.prototype.validateEquipmentAddresses = function()
	{
		var result = {warnings: [], errors: []};
		var equipment = this.getEquipmentCells();
		var byAddress = {};

		for (var i = 0; i < equipment.length; i++)
		{
			var objectId = this.getObjectId(equipment[i]);
			var equipmentType = this.getEquipmentType(equipment[i]);
			var parsed = KnxObjectSchema.parseEquipmentAddress(
				this.getAttribute(equipment[i], 'individualAddress'), equipmentType);

			if (parsed == null)
			{
				result.errors.push({objectId: objectId, code: 'INDIVIDUAL_ADDRESS_INVALID'});
				continue;
			}

			// A Power Supply belongs to a Line but has no individual Device
			// address. Multiple supplies may therefore share the same Line address.
			if (equipmentType != 'powerSupply')
			{
				byAddress[parsed.individualAddress] =
					byAddress[parsed.individualAddress] || [];
				byAddress[parsed.individualAddress].push(objectId);
			}
		}

		for (var address in byAddress)
		{
			if (byAddress[address].length > 1)
			{
				for (var duplicateIndex = 0;
					duplicateIndex < byAddress[address].length; duplicateIndex++)
				{
					result.errors.push({objectId: byAddress[address][duplicateIndex],
						code: 'INDIVIDUAL_ADDRESS_DUPLICATE', address: address});
				}
			}
		}

		return result;
	};

	KnxTopologyModule.prototype.handleManualBusConnection = function(edge)
	{
		var device = this.getDeviceFromWireEdge(edge);
		var bus = this.getBusFromWireEdge(edge);

		if (device == null || bus == null)
		{
			return;
		}

		var parent = this.findByTopologyId(this.getAttribute(device, 'parentTopologyId'));

		if (parent != bus)
		{
			this.graph.getModel().remove(edge);
			this.editorUi.editor.setStatus('Device belongs to ' +
				this.getAttribute(parent, 'address') + ', not ' +
				this.getAttribute(bus, 'address') + '. Connection cancelled.');
			return;
		}

		this.setEdgeStyleValue(edge, 'knxConnectionKind', 'device-bus');
		this.setEdgeStyleValue(edge, 'knxDeviceObjectId', this.getObjectId(device));
		this.setEdgeStyleValue(edge, 'knxBusObjectId', this.getObjectId(bus));
		this.setEdgeStyleValue(edge, 'entryX', edge.target == device ? '0' : '0.5');
		this.setEdgeStyleValue(edge, 'exitX', edge.source == device ? '0' : '0.5');
		this.graph.getModel().execute(new mxCellAttributeChange(device,
			'connectionState', 'Connected'));
	};

	KnxTopologyModule.prototype.installBusDisconnectHandler = function()
	{
		var module = this;
		var graph = this.graph;
		var original = graph.removeCells;

		if (graph.knxBusDisconnectInstalled)
		{
			return;
		}

		graph.knxBusDisconnectInstalled = true;
		graph.removeCells = function(cells, includeEdges)
		{
			if (graph.knxWireModeInputGuard)
			{
				return [];
			}

			// All draw.io Delete/Cut commands pass an explicit cell list. Treat a
			// missing list as internal cleanup, never as permission to delete the
			// current KNX selection.
			if (cells == null)
			{
				return [];
			}

			var disconnected = [];

			for (var i = 0; i < cells.length; i++)
			{
				var device = cells[i] != null && cells[i].edge ?
					module.getDeviceFromWireEdge(cells[i]) : null;

				if (device != null && disconnected.indexOf(device) < 0)
				{
					disconnected.push(device);
				}
			}

			if (disconnected.length == 0)
			{
				return original.apply(this, arguments);
			}

			graph.getModel().beginUpdate();
			try
			{
				var result = original.call(graph, cells, includeEdges);

				for (var index = 0; index < disconnected.length; index++)
				{
					graph.getModel().execute(new mxCellAttributeChange(disconnected[index],
						'connectionState', 'PlacedUnconnected'));
				}

				return result;
			}
			finally
			{
				graph.getModel().endUpdate();
			}
		};
	};

	KnxTopologyModule.prototype.installDevicePlacementHandler = function()
	{
		var module = this;
		this.graph.addMouseListener({
			mouseDown: function(sender, me)
			{
				if (module.devicePlacement == null)
				{
					return;
				}

				var evt = me.getEvent();

				if (mxEvent.isRightMouseButton(evt))
				{
					module.cancelDevicePlacement();
					me.consume();
					return;
				}

				if (!module.devicePlacement.valid)
				{
					module.editorUi.editor.setStatus(
						'Choose a free position on the canvas.');
					me.consume();
					return;
				}

				module.commitDevicePlacement(module.devicePlacement.point);
				me.consume();
			},
			mouseMove: function(sender, me)
			{
				if (module.devicePlacement != null)
				{
					module.updateDevicePlacementPreview(
						module.graph.getPointForEvent(me.getEvent()), me.getEvent());
					me.consume();
				}
			},
			mouseUp: function() {}
		});

		mxEvent.addListener(document, 'keydown', function(evt)
		{
			if (module.devicePlacement == null)
			{
				return;
			}

			if (evt.keyCode == 27)
			{
				module.cancelDevicePlacement();
				mxEvent.consume(evt);
			}
			else if (evt.keyCode == 13 && module.devicePlacement.valid)
			{
				module.commitDevicePlacement(module.devicePlacement.point);
				mxEvent.consume(evt);
			}
		});
	};

	KnxTopologyModule.prototype.getAttribute = function(cell, name, defaultValue)
	{
		return (cell != null && cell.value != null && typeof cell.value == 'object' &&
			cell.value.getAttribute(name) != null) ? cell.value.getAttribute(name) :
			(defaultValue || '');
	};

	KnxTopologyModule.prototype.isDevice = function(cell)
	{
		return this.getAttribute(cell, 'knxType') == 'device';
	};

	KnxTopologyModule.prototype.isBus = function(cell)
	{
		return this.getAttribute(cell, 'knxType') == 'line';
	};

	KnxTopologyModule.prototype.isBackbone = function(cell)
	{
		return this.getAttribute(cell, 'knxType') == 'backbone';
	};

	KnxTopologyModule.prototype.isCoupler = function(cell)
	{
		return this.getAttribute(cell, 'knxType') == 'coupler';
	};

	KnxTopologyModule.prototype.isEquipment = function(cell)
	{
		return this.isDevice(cell) || this.isCoupler(cell);
	};

	KnxTopologyModule.prototype.getEquipmentType = function(cell)
	{
		if (this.isCoupler(cell))
		{
			return this.getAttribute(cell, 'couplerType') == 'area' ? 'bc' : 'lc';
		}

		return this.getAttribute(cell, 'deviceType', 'device');
	};

	KnxTopologyModule.prototype.getEquipmentCells = function()
	{
		return this.getCells('device').concat(this.getCells('coupler'));
	};

	KnxTopologyModule.prototype.getWireOwner = function(cell)
	{
		if (this.isBus(cell) || this.isBackbone(cell))
		{
			return cell;
		}

		return (this.getAttribute(cell, 'knxType') == 'junction') ?
			this.findByTopologyId(this.getAttribute(cell, 'parentTopologyId')) : null;
	};

	KnxTopologyModule.prototype.isKnxWireEdge = function(edge)
	{
		return edge != null && edge.edge &&
			(this.getWireOwner(edge.source) != null || this.getWireOwner(edge.target) != null);
	};

	KnxTopologyModule.prototype.isMainLine = function(cell)
	{
		if (!this.isBus(cell))
		{
			return false;
		}

		var role = this.getAttribute(cell, 'lineRole');
		var localAddress = this.getAttribute(cell, 'localAddress');
		var address = this.getAttribute(cell, 'address');

		// Legacy projects can predate lineRole. KNX Main Lines always use local
		// line number 0, so structured address metadata is a safe fallback and
		// does not infer topology from Canvas geometry.
		return role == 'main' || (role == '' && (localAddress == '0' ||
			/(^|\.)0$/.test(address)));
	};

	KnxTopologyModule.prototype.isArea = function(cell)
	{
		return this.getAttribute(cell, 'knxType') == 'area';
	};

	KnxTopologyModule.prototype.isTopologyCell = function(cell)
	{
		var type = this.getAttribute(cell, 'knxType');

		return type == 'area' || type == 'line' || type == 'device' ||
			type == 'coupler' || type == 'backbone';
	};

	KnxTopologyModule.prototype.findByTopologyId = function(topologyId)
	{
		var foundation = this.graph.knxLayoutFoundation;

		if (foundation != null)
		{
			return foundation.index.getCell(topologyId);
		}

		var cells = this.graph.getModel().cells;

		for (var id in cells)
		{
			if (this.getAttribute(cells[id], 'topologyId') == topologyId)
			{
				return cells[id];
			}
		}

		return null;
	};

	KnxTopologyModule.prototype.getChildren = function(parent, type)
	{
		var foundation = this.graph.knxLayoutFoundation;

		if (foundation != null)
		{
			return foundation.index.getChildrenCells(this.getObjectId(parent), type);
		}

		var result = [];
		var parentId = this.getAttribute(parent, 'topologyId');
		var cells = this.getCells(type);

		for (var i = 0; i < cells.length; i++)
		{
			if (this.getAttribute(cells[i], 'parentTopologyId') == parentId)
			{
				result.push(cells[i]);
			}
		}

		return result;
	};

	KnxTopologyModule.prototype.getCells = function(type)
	{
		var foundation = this.graph.knxLayoutFoundation;

		if (foundation != null)
		{
			return foundation.index.getCellsByType(type);
		}

		var result = [];
		var cells = this.graph.getModel().cells;

		for (var id in cells)
		{
			if (this.getAttribute(cells[id], 'knxType') == type)
			{
				result.push(cells[id]);
			}
		}

		return result;
	};

	KnxTopologyModule.prototype.createValue = function(attributes)
	{
		attributes.knxObjectType = attributes.knxObjectType || attributes.knxType;
		attributes.knxObjectId = attributes.knxObjectId || KnxTopologyModule.createObjectId();

		if (attributes.parentTopologyId != null && attributes.parentKnxObjectId == null)
		{
			var parent = this.findByTopologyId(attributes.parentTopologyId);
			attributes.parentKnxObjectId = parent != null ? this.getObjectId(parent) :
				attributes.parentTopologyId;
		}

		var doc = mxUtils.createXmlDocument();
		var value = doc.createElement('object');

		for (var name in attributes)
		{
			value.setAttribute(name, attributes[name]);
		}

		return value;
	};

	KnxTopologyModule.prototype.getObjectId = function(cell)
	{
		return this.getAttribute(cell, 'knxObjectId',
			this.getAttribute(cell, 'topologyId'));
	};

	KnxTopologyModule.prototype.updateObjectAttribute = function(cell, name, value)
	{
		var model = this.graph.getModel();
		model.beginUpdate();

		try
		{
			model.execute(new mxCellAttributeChange(cell, name, value));

			if (this.isDevice(cell) || this.isCoupler(cell))
			{
				this.ensureDeviceCardSize(cell);
			}

			if (name == 'parentTopologyId')
			{
				var parent = this.findByTopologyId(value);
				model.execute(new mxCellAttributeChange(cell, 'parentKnxObjectId',
					parent != null ? this.getObjectId(parent) : value));
			}
		}
		finally
		{
			model.endUpdate();
		}
	};

	KnxTopologyModule.prototype.updateEquipmentType = function(cell, equipmentType)
	{
		var previousType = this.getEquipmentType(cell);
		var address = this.getAttribute(cell, 'individualAddress');
		var normalizedAddress = address;

		if (equipmentType == 'powerSupply')
		{
			var parsed = KnxObjectSchema.parseIndividualAddress(address) ||
				KnxObjectSchema.parsePowerSupplyAddress(address);
			normalizedAddress = parsed != null ?
				parsed.area + '.' + parsed.line + '.' : '1.1.';
		}
		else if (previousType == 'powerSupply')
		{
			normalizedAddress = this.nextEquipmentAddress(equipmentType);
		}

		var model = this.graph.getModel();
		model.beginUpdate();

		try
		{
			model.execute(new mxCellAttributeChange(cell, 'deviceType', equipmentType));

			if (normalizedAddress != address)
			{
				model.execute(new mxCellAttributeChange(cell, 'individualAddress',
					normalizedAddress));
			}
		}
		finally
		{
			model.endUpdate();
		}

		this.editorUi.refresh(true);
	};

	KnxTopologyModule.prototype.normalizePowerSupplyAddresses = function()
	{
		var equipment = this.getEquipmentCells();
		var model = this.graph.getModel();
		model.beginUpdate();

		try
		{
			for (var i = 0; i < equipment.length; i++)
			{
				if (this.getEquipmentType(equipment[i]) != 'powerSupply')
				{
					continue;
				}

				var value = this.getAttribute(equipment[i], 'individualAddress');
				var parsed = KnxObjectSchema.parsePowerSupplyAddress(value) ||
					KnxObjectSchema.parseIndividualAddress(value);
				var normalized = parsed != null ?
					parsed.area + '.' + parsed.line + '.' : value;

				if (normalized != value)
				{
					model.execute(new mxCellAttributeChange(equipment[i],
						'individualAddress', normalized));
				}
			}
		}
		finally
		{
			model.endUpdate();
		}
	};

	KnxTopologyModule.prototype.ensureDeviceCardSize = function(cell)
	{
		if ((!this.isDevice(cell) && !this.isCoupler(cell)) || cell.geometry == null)
		{
			return false;
		}

		var geometry = cell.geometry;
		var width = KnxTopologyModule.DEVICE_WIDTH;
		var height = KnxTopologyModule.DEVICE_HEIGHT;

		if (width == geometry.width && height == geometry.height)
		{
			return false;
		}

		var resized = geometry.clone();
		resized.width = width;
		resized.height = height;
		this.graph.getModel().setGeometry(cell, resized);
		return true;
	};

	KnxTopologyModule.prototype.ensureEquipmentCardSizes = function()
	{
		var cells = this.getCells('device').concat(this.getCells('coupler'));
		var model = this.graph.getModel();
		model.beginUpdate();

		try
		{
			for (var i = 0; i < cells.length; i++)
			{
				model.setStyle(cells[i], KnxTopologyModule.EQUIPMENT_CARD_STYLE);
				this.ensureDeviceCardSize(cells[i]);
			}
		}
		finally
		{
			model.endUpdate();
		}
	};

	KnxTopologyModule.prototype.insertTopologyEdge = function(source, target)
	{
		var edge = this.graph.insertEdge(this.graph.getDefaultParent(), null, '', source, target,
			'edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;startArrow=none;' +
			'endArrow=none;strokeColor=#00b96b;strokeWidth=' +
			KnxTopologyModule.BUS_WIDTH + ';wireMode=1;' +
			'knxTopologyEdge=1;');
		this.configureTopologyEdge(edge, source, target);

		return edge;
	};

	KnxTopologyModule.prototype.setEdgeStyleValue = function(edge, key, value)
	{
		var style = mxUtils.setStyle(edge.style || '', key, value);
		this.graph.getModel().setStyle(edge, style);
	};

	KnxTopologyModule.prototype.configureBusWire = function(cell, color, horizontal)
	{
		var style = cell.style || '';
		style = mxUtils.setStyle(style, 'fillColor', color);
		style = mxUtils.setStyle(style, 'strokeColor', color);
		style = mxUtils.setStyle(style, 'strokeWidth', '0');
		style = mxUtils.setStyle(style, 'movable', '1');
		style = mxUtils.setStyle(style, 'resizable', '0');
		style = mxUtils.setStyle(style, 'rotatable', '0');
		style = mxUtils.setStyle(style, 'editable', '0');
		style = mxUtils.setStyle(style, 'connectable', '1');
		style = mxUtils.setStyle(style, 'selectable', '1');
		style = mxUtils.setStyle(style, 'pointerEvents', '1');
		style = mxUtils.setStyle(style, 'horizontal', horizontal ? '1' : '0');
		style = mxUtils.setStyle(style, 'verticalLabelPosition', horizontal ? 'top' : 'middle');
		style = mxUtils.setStyle(style, 'labelPosition', horizontal ? 'center' : 'left');
		style = mxUtils.setStyle(style, 'align', 'center');
		style = mxUtils.setStyle(style, 'verticalAlign', horizontal ? 'bottom' : 'middle');
		style = mxUtils.setStyle(style, 'spacingBottom', horizontal ? '7' : '0');
		style = mxUtils.setStyle(style, 'spacingRight', horizontal ? '0' : '8');
		this.graph.getModel().setStyle(cell, style);
	};

	KnxTopologyModule.prototype.configureCouplerCard = function(cell)
	{
		// Replace the legacy compact-coupler style completely. Keeping old
		// html=0 tokens can make mxGraph draw the card markup as plain text.
		this.graph.getModel().setStyle(cell,
			KnxTopologyModule.EQUIPMENT_CARD_STYLE);
		this.ensureDeviceCardSize(cell);
	};

	KnxTopologyModule.prototype.configureTopologyEdge = function(edge, source, target)
	{
		if (edge == null)
		{
			return;
		}

		if (this.isCoupler(target) && this.getAttribute(target, 'couplerType') == 'area')
		{
			this.setEdgeStyleValue(edge, 'entryX', '0');
			this.setEdgeStyleValue(edge, 'entryY', '0.5');
		}
		else if (this.isCoupler(target))
		{
			this.setEdgeStyleValue(edge, 'entryX', '0.5');
			this.setEdgeStyleValue(edge, 'entryY', '0');
		}
		else if (this.isMainLine(target))
		{
			this.setEdgeStyleValue(edge, 'entryX', '0');
			this.setEdgeStyleValue(edge, 'entryY', '0.5');
		}
		else if (this.isBus(target))
		{
			this.setEdgeStyleValue(edge, 'entryX', '0.5');
			this.setEdgeStyleValue(edge, 'entryY', '0');
		}
	};

	KnxTopologyModule.prototype.configureDeviceConnection = function(line, device, mainLine)
	{
		var cells = this.graph.getModel().cells;

		for (var id in cells)
		{
			var edge = cells[id];

			if (edge != null && edge.edge && edge.source == line && edge.target == device)
			{
				this.setEdgeStyleValue(edge, 'entryX', mainLine ? '0.5' : '0');
				this.setEdgeStyleValue(edge, 'entryY', mainLine ? '1' : '0.5');
			}
		}
	};

	KnxTopologyModule.prototype.ensureTopologyConnection = function(source, target)
	{
		var cells = this.graph.getModel().cells;
		var sourceId = this.getAttribute(source, 'topologyId');
		var targetId = this.getAttribute(target, 'topologyId');
		var relationKey = 'topology-' + sourceId + '-' + targetId;
		var relationSuffix = '-' + sourceId + '-' + targetId;

		for (var id in cells)
		{
			var style = (cells[id] != null && cells[id].edge) ?
				this.graph.getCellStyle(cells[id]) : null;
			var existingKey = style != null ?
				mxUtils.getValue(style, 'knxRelationKey', '') : '';

			// A routed relation uses hidden junction terminals, so its physical
			// terminals are not source/target. It still represents the same
			// logical pair. Reuse it instead of creating a second direct edge.
			if (style != null && existingKey != relationKey &&
				existingKey.length >= relationSuffix.length &&
				existingKey.substring(existingKey.length - relationSuffix.length) ==
					relationSuffix && mxUtils.getValue(style, 'knxTopologyEdge', '0') == '1')
			{
				return cells[id];
			}

			if (style != null && (existingKey == relationKey ||
				(cells[id].source == source && cells[id].target == target &&
				mxUtils.getValue(style, 'knxTopologyEdge', '0') == '1')))
			{
				this.setEdgeStyleValue(cells[id], 'knxRelationKey', relationKey);
				this.configureTopologyEdge(cells[id], source, target);
				return cells[id];
			}
		}

		var edge = this.insertTopologyEdge(source, target);
		this.setEdgeStyleValue(edge, 'knxRelationKey', relationKey);

		return edge;
	};

	KnxTopologyModule.prototype.getJunction = function(owner, junctionKey)
	{
		var junctions = this.getCells('junction');
		var ownerId = this.getAttribute(owner, 'topologyId');

		for (var i = 0; i < junctions.length; i++)
		{
			if (this.getAttribute(junctions[i], 'parentTopologyId') == ownerId &&
				this.getAttribute(junctions[i], 'junctionKey') == junctionKey)
			{
				return junctions[i];
			}
		}

		return null;
	};

	KnxTopologyModule.prototype.ensureJunction = function(owner, junctionKey, x, y)
	{
		var junction = this.getJunction(owner, junctionKey);

		if (junction == null)
		{
			var value = this.createValue({
				knxType: 'junction',
				topologyId: 'knx-junction-' +
					this.getAttribute(owner, 'topologyId') + '-' + junctionKey,
				parentTopologyId: this.getAttribute(owner, 'topologyId'),
				junctionKey: junctionKey,
				label: ''
			});
			junction = this.graph.insertVertex(this.graph.getDefaultParent(), null, value,
				x - 3, y - 3, 6, 6,
				'ellipse;opacity=0;fillOpacity=0;strokeOpacity=0;movable=0;' +
				'resizable=0;editable=0;connectable=1;selectable=0;');
		}
		else
		{
			var geometry = junction.geometry.clone();
			geometry.x = x - 3;
			geometry.y = y - 3;
			this.graph.getModel().setGeometry(junction, geometry);
		}

		return junction;
	};

	KnxTopologyModule.prototype.getOrCreateManualJunction = function(owner, point)
	{
		var geometry = owner.geometry;
		var horizontal = geometry.width >= geometry.height;
		var x = horizontal ? Math.max(geometry.x, Math.min(point.x,
			geometry.x + geometry.width)) : geometry.x + geometry.width / 2;
		var y = horizontal ? geometry.y + geometry.height / 2 :
			Math.max(geometry.y, Math.min(point.y, geometry.y + geometry.height));
		var key = 'manual-' + Math.round(x) + '-' + Math.round(y);

		return this.ensureJunction(owner, key, x, y);
	};

	KnxTopologyModule.prototype.ensureRoutedConnection = function(logicalSource,
		logicalTarget, actualSource, actualTarget, relationPrefix)
	{
		var relationKey = relationPrefix + '-' +
			this.getAttribute(logicalSource, 'topologyId') + '-' +
			this.getAttribute(logicalTarget, 'topologyId');
		var cells = this.graph.getModel().cells;
		var edge = null;

		for (var id in cells)
		{
			if (cells[id] != null && cells[id].edge)
			{
				var style = this.graph.getCellStyle(cells[id]);

				if (mxUtils.getValue(style, 'knxRelationKey', '') == relationKey ||
					(cells[id].source == logicalSource && cells[id].target == logicalTarget) ||
					(relationPrefix == 'device' && cells[id].target == logicalTarget &&
						mxUtils.getValue(style, 'knxTopologyEdge', '0') == '1'))
				{
					edge = cells[id];
					break;
				}
			}
		}

		if (edge == null)
		{
			edge = this.insertTopologyEdge(actualSource, actualTarget);
		}

		this.graph.getModel().setTerminal(edge, actualSource, true);
		this.graph.getModel().setTerminal(edge, actualTarget, false);
		this.setEdgeStyleValue(edge, 'knxRelationKey', relationKey);
		this.setEdgeStyleValue(edge, 'knxTopologyEdge', '1');
		this.setEdgeStyleValue(edge, 'knxConnectionKind',
			relationPrefix == 'device' ? 'device-bus' : 'structural');
		this.setEdgeStyleValue(edge, 'strokeColor', '#00b96b');
		this.setEdgeStyleValue(edge, 'strokeWidth', KnxTopologyModule.BUS_WIDTH);
		var entryX = '0.5';
		var entryY = '0.5';
		var exitX = '0.5';
		var exitY = '0.5';

		if (relationPrefix == 'area-input')
		{
			entryX = '0';
		}
		else if (relationPrefix == 'area-output')
		{
			exitX = '1';
		}
		else if (relationPrefix == 'line-input')
		{
			entryY = '0';
		}
		else if (relationPrefix == 'line-output')
		{
			exitY = '1';
		}
		else if (relationPrefix == 'device')
		{
			if (this.isMainLine(logicalSource))
			{
				entryY = '1';
			}
			else
			{
				entryX = '0';
			}
		}

		this.setEdgeStyleValue(edge, 'entryX', entryX);
		this.setEdgeStyleValue(edge, 'entryY', entryY);
		this.setEdgeStyleValue(edge, 'exitX', exitX);
		this.setEdgeStyleValue(edge, 'exitY', exitY);

		return edge;
	};

	KnxTopologyModule.prototype.ensureBackbone = function()
	{
		var backbones = this.getCells('backbone');

		if (backbones.length > 0)
		{
			return backbones[0];
		}

		var value = this.createValue({
			knxType: 'backbone',
			topologyId: 'knx-backbone',
			name: 'Backbone',
			address: '0.0',
			label: 'Backbone · 0.0'
		});

		return this.graph.insertVertex(this.graph.getDefaultParent(), null, value,
			60 - KnxTopologyModule.BUS_WIDTH / 2, 50,
			KnxTopologyModule.BUS_WIDTH, 500,
			'rounded=0;fillColor=#168bd2;strokeColor=#168bd2;strokeWidth=0;' +
			'movable=1;resizable=0;rotatable=0;editable=0;connectable=1;selectable=1;pointerEvents=1;' +
			'labelPosition=left;verticalLabelPosition=top;align=left;verticalAlign=bottom;' +
			'fontColor=#168bd2;fontStyle=1;');
	};

	KnxTopologyModule.prototype.getCoupler = function(parent, couplerType)
	{
		var couplers = this.getCells('coupler');
		var parentId = this.getAttribute(parent, 'topologyId');

		for (var i = 0; i < couplers.length; i++)
		{
			if (this.getAttribute(couplers[i], 'parentTopologyId') == parentId &&
				this.getAttribute(couplers[i], 'couplerType') == couplerType)
			{
				return couplers[i];
			}
		}

		return null;
	};

	KnxTopologyModule.prototype.ensureCoupler = function(parent, couplerType, upperLine)
	{
		var coupler = this.getCoupler(parent, couplerType);

		if (coupler != null)
		{
			var existingAddress = this.getAttribute(coupler, 'individualAddress');
			var couplerDefaults = KnxObjectSchema.createEquipmentDefaults('coupler');
			var defaults = {
				orderNumber: 'COUPLER-' + existingAddress,
				manufacturer: couplerDefaults.manufacturer,
				applicationName: couplerDefaults.applicationName,
				room: couplerDefaults.room
			};

			for (var attribute in defaults)
			{
				if (this.getAttribute(coupler, attribute) == '')
				{
					this.graph.getModel().execute(new mxCellAttributeChange(
						coupler, attribute, defaults[attribute]));
				}
			}

			return coupler;
		}

		var isAreaCoupler = couplerType == 'area';
		var address = isAreaCoupler ?
			(this.getAttribute(parent, 'address') + '.0.0') :
			(this.getAttribute(parent, 'address') + '.0');
		var shortName = isAreaCoupler ? 'BC' : 'LC';
		var newCouplerDefaults = KnxObjectSchema.createEquipmentDefaults('coupler');
		var value = this.createValue({
			knxType: 'coupler',
			couplerType: couplerType,
			topologyId: 'knx-' + couplerType + '-coupler-' + Date.now() + '-' + address,
			parentTopologyId: this.getAttribute(parent, 'topologyId'),
			name: isAreaCoupler ? 'Area Coupler' : 'Line Coupler',
			shortName: shortName,
			individualAddress: address,
			orderNumber: 'COUPLER-' + address,
			manufacturer: newCouplerDefaults.manufacturer,
			applicationName: newCouplerDefaults.applicationName,
			room: newCouplerDefaults.room,
			label: shortName + '\n' + address
		});
		coupler = this.graph.insertVertex(this.graph.getDefaultParent(), null, value,
			0, 0, KnxTopologyModule.DEVICE_WIDTH,
			KnxTopologyModule.DEVICE_HEIGHT,
			KnxTopologyModule.EQUIPMENT_CARD_STYLE);

		if (upperLine != null)
		{
			this.ensureTopologyConnection(upperLine, coupler);
		}

		if (!isAreaCoupler)
		{
			this.ensureTopologyConnection(coupler, parent);
		}

		return coupler;
	};

	KnxTopologyModule.prototype.normalizeHierarchy = function()
	{
		if (this.normalizingHierarchy || this.hierarchyNormalized)
		{
			return;
		}

		var lines = this.getCells('line');

		if (lines.length == 0)
		{
			return;
		}

		this.normalizingHierarchy = true;
		var graph = this.graph;
		graph.getModel().beginUpdate();

		try
		{
			var area = this.ensureDefaultArea();
			var areaId = this.getAttribute(area, 'topologyId');
			var backbone = this.ensureBackbone();

			for (var i = 0; i < lines.length; i++)
			{
				if (this.getAttribute(lines[i], 'parentTopologyId') == '')
				{
					graph.getModel().execute(new mxCellAttributeChange(
						lines[i], 'parentTopologyId', areaId));
				}

				if (this.getAttribute(lines[i], 'localAddress') == '')
				{
					var address = this.getAttribute(lines[i], 'address');
					graph.getModel().execute(new mxCellAttributeChange(lines[i],
						'localAddress', address.substring(address.lastIndexOf('.') + 1)));
				}
			}

			var areas = this.getCells('area');

			for (var areaIndex = 0; areaIndex < areas.length; areaIndex++)
			{
				var areaLines = this.getChildren(areas[areaIndex], 'line');
				var mainLine = null;

				for (var lineIndex = 0; lineIndex < areaLines.length; lineIndex++)
				{
					if (this.isMainLine(areaLines[lineIndex]))
					{
						mainLine = areaLines[lineIndex];
						break;
					}
				}

				if (mainLine == null && areaLines.length > 0)
				{
					mainLine = areaLines[0];
					graph.getModel().execute(new mxCellAttributeChange(
						mainLine, 'lineRole', 'main'));
					graph.getModel().execute(new mxCellAttributeChange(
						mainLine, 'name', 'Main line'));
				}
				else if (mainLine == null)
				{
					mainLine = this.addLine(areas[areaIndex], true, 'main');
					areaLines = this.getChildren(areas[areaIndex], 'line');
				}

				var areaCoupler = this.ensureCoupler(areas[areaIndex], 'area', backbone);
				this.ensureTopologyConnection(areaCoupler, mainLine);

				for (var branchIndex = 0; branchIndex < areaLines.length; branchIndex++)
				{
					if (areaLines[branchIndex] != mainLine)
					{
						if (this.getAttribute(areaLines[branchIndex], 'lineRole') == '')
						{
							graph.getModel().execute(new mxCellAttributeChange(
								areaLines[branchIndex], 'lineRole', 'line'));
						}

						this.ensureCoupler(areaLines[branchIndex], 'line', mainLine);
					}
				}
			}
		}
		finally
		{
			graph.getModel().endUpdate();
			this.normalizingHierarchy = false;
			this.hierarchyNormalized = true;
		}

	};

	KnxTopologyModule.prototype.getCellCenterX = function(cell)
	{
		return cell.geometry.x + cell.geometry.width / 2;
	};

	KnxTopologyModule.prototype.getCellCenterY = function(cell)
	{
		return cell.geometry.y + cell.geometry.height / 2;
	};

	KnxTopologyModule.prototype.layoutAddedArea = function(area, mainLine, areaCoupler, backbone)
	{
		if (this.areaLayoutEngine != null)
		{
			// The Layout Store owns the final Area origin and all relative node
			// coordinates. Only create the structural projection here. In
			// particular, do not scan unrelated mxCells to derive a temporary Y
			// coordinate: that caused a second source of placement and intermediate
			// geometry inside Add Area.
			this.configureCouplerCard(areaCoupler);
			this.configureBusWire(mainLine, '#00b96b', true);
			var initialMainY = this.getCellCenterY(mainLine);
			var backboneJunction = this.ensureJunction(backbone,
				'area-' + this.getAttribute(area, 'topologyId'),
				this.getCellCenterX(backbone), initialMainY);
			var mainStartJunction = this.ensureJunction(mainLine, 'start',
				mainLine.geometry.x, initialMainY);
			this.ensureRoutedConnection(backbone, areaCoupler, backboneJunction,
				areaCoupler, 'area-input');
			this.ensureRoutedConnection(areaCoupler, mainLine, areaCoupler,
				mainStartJunction, 'area-output');
			return;
		}

		var cells = this.graph.getModel().cells;
		var bottom = 40;

		for (var id in cells)
		{
			var candidate = cells[id];

			if (candidate != null && candidate != mainLine && candidate != areaCoupler &&
				!this.isBackbone(candidate) && candidate.geometry != null && !candidate.edge)
			{
				bottom = Math.max(bottom, candidate.geometry.y + candidate.geometry.height);
			}
		}

		var mainY = Math.max(180, bottom + 140);
		var backboneX = this.getCellCenterX(backbone);
		var couplerGeometry = areaCoupler.geometry.clone();
		couplerGeometry.x = backboneX + 45;
		couplerGeometry.y = mainY - 46;
		couplerGeometry.width = KnxTopologyModule.DEVICE_WIDTH;
		couplerGeometry.height = KnxTopologyModule.DEVICE_HEIGHT;
		this.graph.getModel().setGeometry(areaCoupler, couplerGeometry);
		this.configureCouplerCard(areaCoupler);

		var mainGeometry = mainLine.geometry.clone();
		mainGeometry.x = couplerGeometry.x + couplerGeometry.width + 45;
		mainGeometry.y = mainY - KnxTopologyModule.BUS_WIDTH / 2;
		mainGeometry.width = 760;
		mainGeometry.height = KnxTopologyModule.BUS_WIDTH;
		this.graph.getModel().setGeometry(mainLine, mainGeometry);
		this.configureBusWire(mainLine, '#00b96b', true);

		var backboneJunction = this.ensureJunction(backbone,
			'area-' + this.getAttribute(area, 'topologyId'), backboneX, mainY);
		var mainStartJunction = this.ensureJunction(mainLine, 'start',
			mainGeometry.x, mainY);
		this.ensureRoutedConnection(backbone, areaCoupler, backboneJunction,
			areaCoupler, 'area-input');
		this.ensureRoutedConnection(areaCoupler, mainLine, areaCoupler,
			mainStartJunction, 'area-output');

		var backboneGeometry = backbone.geometry.clone();
		backboneGeometry.height = Math.max(backboneGeometry.height,
			mainY + 350 - backboneGeometry.y);
		this.graph.getModel().setGeometry(backbone, backboneGeometry);
		this.configureBusWire(backbone, '#168bd2', false);
	};

	KnxTopologyModule.prototype.layoutAddedLine = function(area, line, mainLine, coupler)
	{
		var siblings = this.getChildren(area, 'line');
		var mainY = this.getCellCenterY(mainLine);
		var lineX = mainLine.geometry.x + 110;

		for (var i = 0; i < siblings.length; i++)
		{
			if (siblings[i] != line && !this.isMainLine(siblings[i]) &&
				siblings[i].geometry != null)
			{
				lineX = Math.max(lineX, this.getCellCenterX(siblings[i]) + 420);
			}
		}

		if (this.areaLayoutEngine != null)
		{
			// The Area Layout Engine owns final geometry. Recording the legacy
			// vertical placement here as an intermediate mxGeometryChange makes
			// Redo restore that intermediate state after the horizontal snapshot.
			// Create only the topology projection; reconcile places it once.
			this.configureCouplerCard(coupler);
			this.configureBusWire(line, '#00b96b', true);
			var autoTapX = this.getCellCenterX(coupler);
			var autoMainTap = this.ensureJunction(mainLine,
				'line-' + this.getAttribute(line, 'topologyId'), autoTapX, mainY);
			var autoBranchStart = this.ensureJunction(line, 'start',
				line.geometry.x, this.getCellCenterY(line));
			this.ensureRoutedConnection(mainLine, coupler, autoMainTap, coupler,
				'line-input');
			this.ensureRoutedConnection(coupler, line, coupler, autoBranchStart,
				'line-output');
			return;
		}

		var couplerGeometry = coupler.geometry.clone();
		couplerGeometry.x = lineX - 95;
		couplerGeometry.y = mainY + 42;
			couplerGeometry.width = KnxTopologyModule.DEVICE_WIDTH;
			couplerGeometry.height = KnxTopologyModule.DEVICE_HEIGHT;
		this.graph.getModel().setGeometry(coupler, couplerGeometry);
		this.configureCouplerCard(coupler);

		var lineGeometry = line.geometry.clone();
		lineGeometry.x = lineX - KnxTopologyModule.BUS_WIDTH / 2;
		lineGeometry.y = mainY + 160;
		lineGeometry.width = KnxTopologyModule.BUS_WIDTH;
		lineGeometry.height = 170;
		this.graph.getModel().setGeometry(line, lineGeometry);
		this.configureBusWire(line, '#00b96b', false);

		var mainGeometry = mainLine.geometry.clone();
		mainGeometry.width = Math.max(mainGeometry.width,
			lineX - mainGeometry.x + 170);
		this.graph.getModel().setGeometry(mainLine, mainGeometry);
		var mainTap = this.ensureJunction(mainLine,
			'line-' + this.getAttribute(line, 'topologyId'), lineX, mainY);
		var branchStart = this.ensureJunction(line, 'start', lineX, lineGeometry.y);
		this.ensureRoutedConnection(mainLine, coupler, mainTap, coupler, 'line-input');
		this.ensureRoutedConnection(coupler, line, coupler, branchStart, 'line-output');
	};

	KnxTopologyModule.prototype.layoutAddedDevice = function(line, cell)
	{
		var devices = this.getChildren(line, 'device');
		var mainLine = this.isMainLine(line);
		var lineCenterX = this.getCellCenterX(line);
		var lineCenterY = this.getCellCenterY(line);
		var geometry = cell.geometry.clone();

		if (this.areaLayoutEngine != null)
		{
			// Do not stretch the Line with the legacy vertical algorithm. The
			// adaptive reconcile computes the Device slot and bus bounds in the
			// same outer transaction, leaving one geometry state for Undo/Redo.
			var autoTapX = geometry.x + geometry.width / 2;
			var autoTapY = lineCenterY;
			var autoJunction = this.ensureJunction(line,
				'device-' + this.getAttribute(cell, 'topologyId'), autoTapX, autoTapY);
			this.ensureRoutedConnection(line, cell, autoJunction, cell, 'device');
			this.configureBusWire(line, '#00b96b', true);
			return;
		}

		if (mainLine)
		{
			geometry.x = line.geometry.x + 55;
			geometry.y = lineCenterY - 112;

			for (var i = 0; i < devices.length; i++)
			{
				if (devices[i] != cell && devices[i].geometry != null)
				{
					geometry.x = Math.max(geometry.x, devices[i].geometry.x + 225);
				}
			}
		}
		else
		{
			geometry.x = lineCenterX + 62;
			geometry.y = line.geometry.y + 10;

			for (var deviceIndex = 0; deviceIndex < devices.length; deviceIndex++)
			{
				if (devices[deviceIndex] != cell && devices[deviceIndex].geometry != null)
				{
					geometry.y = Math.max(geometry.y,
						devices[deviceIndex].geometry.y + devices[deviceIndex].geometry.height + 33);
				}
			}
		}

		this.graph.getModel().setGeometry(cell, geometry);
		var tapX = mainLine ? geometry.x + geometry.width / 2 : lineCenterX;
		var tapY = mainLine ? lineCenterY : geometry.y + geometry.height / 2;
		var junction = this.ensureJunction(line,
			'device-' + this.getAttribute(cell, 'topologyId'), tapX, tapY);
		this.ensureRoutedConnection(line, cell, junction, cell, 'device');

		var lineGeometry = line.geometry.clone();

		if (mainLine)
		{
			lineGeometry.width = Math.max(lineGeometry.width,
				geometry.x + geometry.width + 55 - lineGeometry.x);
		}
		else
		{
			lineGeometry.height = Math.max(lineGeometry.height,
				geometry.y + geometry.height + 40 - lineGeometry.y);
		}

		this.graph.getModel().setGeometry(line, lineGeometry);
		this.configureBusWire(line, '#00b96b', mainLine);
	};

	KnxTopologyModule.prototype.ensureDefaultArea = function()
	{
		var areas = this.getCells('area');

		if (areas.length > 0)
		{
			return areas[0];
		}

		return this.addArea(true, this.getCells('line').length > 0);
	};

	KnxTopologyModule.prototype.addArea = function(silent, skipMainLine)
	{
		return this.addAreaStructure({
			silent: silent === true,
			skipMainLine: skipMainLine === true
		});
	};

	/**
	 * Creates the minimum KNX Area structure as one topology mutation:
	 * Area, Main Line, Area Coupler and both structural connections.
	 * skipMainLine is retained only for the legacy migration path.
	 */
	KnxTopologyModule.prototype.addAreaStructure = function(options)
	{
		options = options || {};
		var silent = options.silent === true;
		var skipMainLine = options.skipMainLine === true;

		if (this.areaLayoutEngine != null &&
			this.areaLayoutEngine.activeMutation == null)
		{
			var module = this;
			return this.areaLayoutEngine.runTopologyMutation('add-area', function()
			{
				return module.addAreaStructure(options);
			}, []);
		}

		var areas = this.getCells('area');
		var number = 1;
		var used = {};

		for (var i = 0; i < areas.length; i++)
		{
			used[this.getAttribute(areas[i], 'address')] = true;
		}

		while (used[String(number)])
		{
			number++;
		}

		var value = this.createValue({
			knxType: 'area',
			topologyId: 'knx-area-' + Date.now() + '-' + number,
			name: 'Area ' + number,
			address: String(number),
			medium: 'IP',
			label: 'Area ' + number
		});
		var area = new mxCell(value);
		this.graph.getModel().add(this.graph.getDefaultParent(), area);
		var backbone = this.ensureBackbone();

		if (!skipMainLine)
		{
			var mainLine = this.addLine(area, true, 'main');
			var areaCoupler = this.ensureCoupler(area, 'area', backbone);
			this.layoutAddedArea(area, mainLine, areaCoupler, backbone);
		}

		if (!silent)
		{
			this.selectTopologyCell(area);
		}

		this.refreshTopologyTree();

		if (this.areaLayoutEngine != null)
		{
			this.areaLayoutEngine.handleTopologyAdded(area);
		}

		return area;
	};

	KnxTopologyModule.prototype.addLine = function(area, silent, lineRole)
	{
		if (this.areaLayoutEngine != null &&
			this.areaLayoutEngine.activeMutation == null)
		{
			var module = this;
			return this.areaLayoutEngine.runTopologyMutation('add-line', function()
			{
				return module.addLine(area, silent, lineRole);
			}, area != null ? [area] : []);
		}

		area = (area != null && this.isArea(area)) ? area : this.ensureDefaultArea();
		var lines = this.getChildren(area, 'line');
		lineRole = lineRole || 'line';
		var localNumber = (lineRole == 'main') ? 0 : 1;
		var used = {};

		for (var i = 0; i < lines.length; i++)
		{
			used[this.getAttribute(lines[i], 'localAddress')] = true;
		}

		while (used[String(localNumber)])
		{
			localNumber++;
		}

		var address = this.getAttribute(area, 'address') + '.' + localNumber;
		var allLines = this.getCells('line');
		var x = 80 + allLines.length * 340;
		var value = this.createValue({
			knxType: 'line',
			topologyId: 'knx-line-' + Date.now() + '-' + address.replace('.', '-'),
			parentTopologyId: this.getAttribute(area, 'topologyId'),
			name: (lineRole == 'main') ? 'Main line' : ('Line ' + address),
			address: address,
			localAddress: String(localNumber),
			lineRole: lineRole,
			medium: 'TP',
			label: ((lineRole == 'main') ? 'Main line' : 'Line') + ' ' + address
		});
		var line = this.graph.insertVertex(this.graph.getDefaultParent(), null, value,
			x, 50, 4, 150,
			'rounded=0;fillColor=#00b96b;strokeColor=#00b96b;strokeWidth=0;' +
			'movable=1;resizable=0;rotatable=0;editable=0;connectable=1;selectable=1;pointerEvents=1;');

		if (lineRole != 'main')
		{
			var mainLines = this.getChildren(area, 'line');
			var mainLine = null;

			for (var lineIndex = 0; lineIndex < mainLines.length; lineIndex++)
			{
				if (this.isMainLine(mainLines[lineIndex]))
				{
					mainLine = mainLines[lineIndex];
					break;
				}
			}

			if (mainLine == null)
			{
				mainLine = this.addLine(area, true, 'main');
			}

			var coupler = this.ensureCoupler(line, 'line', mainLine);
			this.layoutAddedLine(area, line, mainLine, coupler);
		}

		if (!silent)
		{
			this.selectTopologyCell(line);
		}

		this.refreshTopologyTree();

		if (this.areaLayoutEngine != null)
		{
			this.areaLayoutEngine.handleTopologyAdded(line);
		}

		return line;
	};

	KnxTopologyModule.prototype.addSecondaryLineStructure = function(area)
	{
		if (area == null || !this.isArea(area))
		{
			this.editorUi.editor.setStatus(
				'Select an Area or Main Line before adding a Secondary Line.');
			return null;
		}

		return this.addLine(area, false, 'line');
	};

	KnxTopologyModule.prototype.ensureMainLine = function()
	{
		var lines = this.getCells('line');

		for (var i = 0; i < lines.length; i++)
		{
			if (!this.isMainLine(lines[i]))
			{
				continue;
			}

			var line = lines[i];

			if (this.getAttribute(line, 'parentTopologyId') == '')
			{
				this.graph.getModel().execute(new mxCellAttributeChange(line,
					'parentTopologyId', this.getAttribute(this.ensureDefaultArea(), 'topologyId')));
			}

			return line;
		}

		return this.addLine(this.ensureDefaultArea(), true, 'main');
	};

	KnxTopologyModule.prototype.nextIndividualAddress = function(line)
	{
		var prefix = this.getAttribute(line, 'address', '1.1');
		var used = {};
		var devices = this.getChildren(line, 'device');

		for (var i = 0; i < devices.length; i++)
		{
			used[this.getAttribute(devices[i], 'individualAddress')] = true;
		}

		var number = 1;

		while (used[prefix + '.' + number])
		{
			number++;
		}

		return prefix + '.' + number;
	};

	KnxTopologyModule.prototype.nextEquipmentAddress = function(deviceType)
	{
		if (deviceType == 'powerSupply')
		{
			return '1.1.';
		}

		var used = {};
		var equipment = this.getEquipmentCells();

		for (var i = 0; i < equipment.length; i++)
		{
			var parsed = KnxObjectSchema.parseIndividualAddress(
				this.getAttribute(equipment[i], 'individualAddress'));

			if (parsed != null)
			{
				used[parsed.individualAddress] = true;
			}
		}

		if (deviceType == 'bc')
		{
			for (var area = 1; area <= 15; area++)
			{
				if (!used[area + '.0.0'])
				{
					return area + '.0.0';
				}
			}
		}
		else if (deviceType == 'lc')
		{
			for (var line = 1; line <= 15; line++)
			{
				if (!used['1.' + line + '.0'])
				{
					return '1.' + line + '.0';
				}
			}
		}

		var number = 1;

		while (used['1.1.' + number] && number < 255)
		{
			number++;
		}

		return '1.1.' + number;
	};

	KnxTopologyModule.prototype.addDevice = function(deviceType)
	{
		// A legacy caller may still pass a Line cell. The new equipment-first flow
		// deliberately does not retain that Line as topology truth.
		if (deviceType != null && typeof deviceType == 'object')
		{
			deviceType = 'device';
		}

		deviceType = KnxObjectSchema.getEquipmentType(deviceType).value;
		return this.startDevicePlacement(deviceType);
	};

	KnxTopologyModule.prototype.startDevicePlacement = function(deviceType)
	{
		var type = KnxObjectSchema.getEquipmentType(deviceType);

		if (typeof this.editorUi.cancelWireMode == 'function')
		{
			this.editorUi.cancelWireMode();
		}

		this.cancelDevicePlacement();
		var preview = document.createElement('div');
		preview.className = 'knxDevicePlacementPreview';
		var individualAddress = this.nextEquipmentAddress(type.value);
		preview.innerHTML = '<b>' + mxUtils.htmlEntities(type.defaultName) + '</b><span>' +
			mxUtils.htmlEntities(individualAddress) + '</span>';
		this.graph.container.appendChild(preview);
		this.devicePlacement = {
			deviceType: type.value,
			individualAddress: individualAddress,
			preview: preview,
			point: null,
			geometry: null,
			valid: false
		};
		this.graph.container.style.cursor = 'crosshair';
		this.editorUi.editor.setStatus(
			'Place ' + type.label + ': click a free canvas position; Esc or right-click cancels.');
		return this.devicePlacement;
	};

	KnxTopologyModule.prototype.cancelDevicePlacement = function()
	{
		if (this.devicePlacement != null && this.devicePlacement.preview != null &&
			this.devicePlacement.preview.parentNode != null)
		{
			this.devicePlacement.preview.parentNode.removeChild(
				this.devicePlacement.preview);
		}

		this.devicePlacement = null;

		if (this.graph.container != null)
		{
			this.graph.container.style.cursor = '';
		}
	};

	KnxTopologyModule.prototype.getDevicePlacementGeometry = function(point, evt)
	{
		var x = point.x - KnxTopologyModule.DEVICE_WIDTH / 2;
		var y = point.y - KnxTopologyModule.DEVICE_HEIGHT / 2;

		if (evt == null || !mxEvent.isShiftDown(evt))
		{
			x = this.graph.snap(x);
			y = this.graph.snap(y);
		}

		return new mxGeometry(x, y, KnxTopologyModule.DEVICE_WIDTH,
			KnxTopologyModule.DEVICE_HEIGHT);
	};

	KnxTopologyModule.prototype.isDevicePlacementValid = function(geometry)
	{
		if (geometry == null)
		{
			return false;
		}

		var cells = this.getEquipmentCells();

		for (var i = 0; i < cells.length; i++)
		{
			var existing = cells[i].geometry;

			if (existing != null && geometry.x < existing.x + existing.width + 8 &&
				geometry.x + geometry.width + 8 > existing.x &&
				geometry.y < existing.y + existing.height + 8 &&
				geometry.y + geometry.height + 8 > existing.y)
			{
				return false;
			}
		}

		return true;
	};

	KnxTopologyModule.prototype.updateDevicePlacementPreview = function(point, evt)
	{
		if (this.devicePlacement == null)
		{
			return;
		}

		var geometry = this.getDevicePlacementGeometry(point, evt);
		var valid = this.isDevicePlacementValid(geometry);
		var scale = this.graph.view.scale;
		var translate = this.graph.view.translate;
		var preview = this.devicePlacement.preview;
		preview.style.left = ((geometry.x + translate.x) * scale) + 'px';
		preview.style.top = ((geometry.y + translate.y) * scale) + 'px';
		preview.style.width = (geometry.width * scale) + 'px';
		preview.style.height = (geometry.height * scale) + 'px';
		preview.className = 'knxDevicePlacementPreview ' +
			(valid ? 'knxDevicePlacementValid' : 'knxDevicePlacementInvalid');
		this.devicePlacement.point = point;
		this.devicePlacement.geometry = geometry;
		this.devicePlacement.valid = valid;
	};

	KnxTopologyModule.prototype.commitDevicePlacement = function(point)
	{
		if (this.devicePlacement == null)
		{
			return null;
		}

		var placement = this.devicePlacement;
		var geometry = placement.geometry || this.getDevicePlacementGeometry(point, null);
		var graph = this.graph;
		var index = this.getEquipmentCells().length + 1;
		var equipmentType = KnxObjectSchema.getEquipmentType(placement.deviceType);
		var individualAddress = placement.individualAddress;
		var module = this;
		var operation = function()
		{
			var deviceDefaults = KnxObjectSchema.createEquipmentDefaults(equipmentType.value);
			var value = this.createValue({
				knxType: 'device',
				deviceType: equipmentType.value,
				topologyId: 'knx-device-' + Date.now() + '-' + index,
				name: equipmentType.defaultName + ' ' + index,
				shortName: equipmentType.shortName,
				orderNumber: 'ORDER-' + ('000' + index).slice(-3),
				manufacturer: deviceDefaults.manufacturer,
				applicationName: deviceDefaults.applicationName,
				room: deviceDefaults.room,
				individualAddress: individualAddress,
				connectionState: 'PlacedUnconnected',
				layoutMode: 'manual',
				label: equipmentType.defaultName + ' ' + index
			});

			var cell = graph.insertVertex(graph.getDefaultParent(), null, value,
				geometry.x, geometry.y, geometry.width, geometry.height,
				KnxTopologyModule.EQUIPMENT_CARD_STYLE);
			module.selectTopologyCell(cell);
			module.refreshTopologyTree();
			return cell;
		}.bind(this);
		var result;

		if (this.areaLayoutEngine != null)
		{
			result = this.areaLayoutEngine.runTopologyMutation('add-device-manual',
				operation, []);
		}
		else
		{
			graph.getModel().beginUpdate();
			try
			{
				result = operation();
			}
			finally
			{
				graph.getModel().endUpdate();
			}
		}

		this.cancelDevicePlacement();
		this.editorUi.editor.setStatus(equipmentType.label +
			' placed. Set its IA in Properties to update the topology tree.');
		return result;
	};

	KnxTopologyModule.prototype.startConnectBus = function()
	{
		this.cancelDevicePlacement();
		return typeof this.editorUi.toggleWireMode == 'function' ?
			this.editorUi.toggleWireMode() :
			(typeof this.editorUi.enterWireMode == 'function' ?
				this.editorUi.enterWireMode() : false);
	};

	KnxTopologyModule.prototype.selectTopologyCell = function(cell)
	{
		if (this.areaLayoutEngine != null &&
			this.areaLayoutEngine.activeMutation != null)
		{
			this.areaLayoutEngine.activeMutation.pendingSelectionId =
				cell != null ? this.getObjectId(cell) : null;
			return;
		}

		this.graph.setSelectionCell(cell);

		if (cell != null && cell.geometry != null)
		{
			this.graph.scrollCellToVisible(cell);
		}

		this.editorUi.toggleFormatPanel(true);
		this.refreshTopologyTree();
	};

	KnxTopologyModule.prototype.autoLayout = function()
	{
		var graph = this.graph;
		var areas = this.getCells('area');
		var backbone = this.ensureBackbone();
		var backboneX = 60;
		var mainStartX = 340;
		var mainY = 180;
		var lineColumnWidth = 420;
		var areaGap = 140;
		var lastAreaBottom = mainY + 300;

		graph.getModel().beginUpdate();
		try
		{
			for (var areaIndex = 0; areaIndex < areas.length; areaIndex++)
			{
				var areaLines = this.getChildren(areas[areaIndex], 'line');
				var mainLine = null;
				var branchLines = [];

				for (var lineIndex = 0; lineIndex < areaLines.length; lineIndex++)
				{
					if (this.isMainLine(areaLines[lineIndex]))
					{
						mainLine = areaLines[lineIndex];
					}
					else
					{
						branchLines.push(areaLines[lineIndex]);
					}
				}

				if (mainLine == null)
				{
					continue;
				}

				var mainDevices = this.getChildren(mainLine, 'device');
				var mainDevicesWidth = Math.max(0, mainDevices.length * 225 + 80);
				var branchesWidth = Math.max(0, branchLines.length * lineColumnWidth);
				var areaWidth = Math.max(760, mainDevicesWidth, branchesWidth + 170);
				var areaCoupler = this.ensureCoupler(areas[areaIndex], 'area', backbone);

				var areaCouplerGeometry = areaCoupler.geometry.clone();
				areaCouplerGeometry.x = 105;
				areaCouplerGeometry.y = mainY - 46;
				areaCouplerGeometry.width = KnxTopologyModule.DEVICE_WIDTH;
				areaCouplerGeometry.height = KnxTopologyModule.DEVICE_HEIGHT;
				graph.getModel().setGeometry(areaCoupler, areaCouplerGeometry);
				this.configureCouplerCard(areaCoupler);

				var mainGeometry = mainLine.geometry.clone();
				mainGeometry.x = mainStartX;
				mainGeometry.y = mainY - KnxTopologyModule.BUS_WIDTH / 2;
				mainGeometry.width = areaWidth;
				mainGeometry.height = 4;
				graph.getModel().setGeometry(mainLine, mainGeometry);
				this.configureBusWire(mainLine, '#00b96b', true);
				var backboneJunction = this.ensureJunction(backbone,
					'area-' + this.getAttribute(areas[areaIndex], 'topologyId'),
					backboneX, mainY);
				var mainStartJunction = this.ensureJunction(mainLine, 'start',
					mainStartX, mainY);
				this.ensureRoutedConnection(backbone, areaCoupler, backboneJunction,
					areaCoupler, 'area-input');
				this.ensureRoutedConnection(areaCoupler, mainLine, areaCoupler,
					mainStartJunction, 'area-output');

				for (var mainDeviceIndex = 0; mainDeviceIndex < mainDevices.length; mainDeviceIndex++)
				{
					var mainDeviceGeometry = mainDevices[mainDeviceIndex].geometry.clone();
					mainDeviceGeometry.x = mainStartX + 55 + mainDeviceIndex * 225;
					mainDeviceGeometry.y = mainY - 112;
					graph.getModel().setGeometry(mainDevices[mainDeviceIndex], mainDeviceGeometry);
					var mainDeviceJunction = this.ensureJunction(mainLine,
						'device-' + this.getAttribute(mainDevices[mainDeviceIndex], 'topologyId'),
						mainDeviceGeometry.x + mainDeviceGeometry.width / 2, mainY);
					this.ensureRoutedConnection(mainLine, mainDevices[mainDeviceIndex],
						mainDeviceJunction, mainDevices[mainDeviceIndex], 'device');
				}

				var maxBranchDevices = 0;

				for (var branchIndex = 0; branchIndex < branchLines.length; branchIndex++)
				{
					var lineX = mainStartX + 110 + branchIndex * lineColumnWidth;
					var branchDevices = this.getChildren(branchLines[branchIndex], 'device');
					maxBranchDevices = Math.max(maxBranchDevices, branchDevices.length);
					var lineCoupler = this.ensureCoupler(branchLines[branchIndex], 'line', mainLine);
					var lineCouplerGeometry = lineCoupler.geometry.clone();
					lineCouplerGeometry.x = lineX - 95;
					lineCouplerGeometry.y = mainY + 42;
					lineCouplerGeometry.width = KnxTopologyModule.DEVICE_WIDTH;
					lineCouplerGeometry.height = KnxTopologyModule.DEVICE_HEIGHT;
					graph.getModel().setGeometry(lineCoupler, lineCouplerGeometry);
					this.configureCouplerCard(lineCoupler);

					var branchGeometry = branchLines[branchIndex].geometry.clone();
					branchGeometry.x = lineX - KnxTopologyModule.BUS_WIDTH / 2;
					branchGeometry.y = mainY + 160;
					branchGeometry.width = 4;
					branchGeometry.height = Math.max(170, branchDevices.length * 125);
					graph.getModel().setGeometry(branchLines[branchIndex], branchGeometry);
					this.configureBusWire(branchLines[branchIndex], '#00b96b', false);
					var mainTapJunction = this.ensureJunction(mainLine,
						'line-' + this.getAttribute(branchLines[branchIndex], 'topologyId'),
						lineX, mainY);
					var branchStartJunction = this.ensureJunction(branchLines[branchIndex],
						'start', lineX, branchGeometry.y);
					this.ensureRoutedConnection(mainLine, lineCoupler, mainTapJunction,
						lineCoupler, 'line-input');
					this.ensureRoutedConnection(lineCoupler, branchLines[branchIndex],
						lineCoupler, branchStartJunction, 'line-output');

					for (var deviceIndex = 0; deviceIndex < branchDevices.length; deviceIndex++)
					{
						var deviceGeometry = branchDevices[deviceIndex].geometry.clone();
						deviceGeometry.x = lineX + 62;
						deviceGeometry.y = mainY + 170 + deviceIndex * 125;
						graph.getModel().setGeometry(branchDevices[deviceIndex], deviceGeometry);
						var deviceJunction = this.ensureJunction(branchLines[branchIndex],
							'device-' + this.getAttribute(branchDevices[deviceIndex], 'topologyId'),
							lineX, deviceGeometry.y + deviceGeometry.height / 2);
						this.ensureRoutedConnection(branchLines[branchIndex],
							branchDevices[deviceIndex], deviceJunction,
							branchDevices[deviceIndex], 'device');
					}
				}

				var areaHeight = Math.max(430, 300 + maxBranchDevices * 125);
				lastAreaBottom = mainY + areaHeight;
				mainY = lastAreaBottom + areaGap;
			}

			var backboneGeometry = backbone.geometry.clone();
			backboneGeometry.x = backboneX - KnxTopologyModule.BUS_WIDTH / 2;
			backboneGeometry.y = 50;
			backboneGeometry.width = 4;
			backboneGeometry.height = Math.max(500, lastAreaBottom - 10);
			graph.getModel().setGeometry(backbone, backboneGeometry);
			this.configureBusWire(backbone, '#168bd2', false);
		}
		finally
		{
			graph.getModel().endUpdate();
		}
	};

	KnxTopologyModule.prototype.renderDeviceLabel = function(cell)
	{
		var esc = function(value)
		{
			return mxUtils.htmlEntities(value || '', false);
		};
		var equipmentType = KnxObjectSchema.getEquipmentType(
			this.getEquipmentType(cell));
		var role = equipmentType.shortName;
		var stripColor = equipmentType.stripColor;

		var detailFields = KnxObjectSchema.getCardDetailFields();
		var detailValues = {};
		var fullDetails = [this.getAttribute(cell, 'name'),
			this.getAttribute(cell, 'individualAddress')];

		for (var detailIndex = 0; detailIndex < detailFields.length; detailIndex++)
		{
			detailValues[detailFields[detailIndex].name] = this.getAttribute(cell,
				detailFields[detailIndex].name);
			fullDetails.push(detailValues[detailFields[detailIndex].name]);
		}

		var displayValue = function(value)
		{
			return esc(value != '' ? value : '—');
		};
		var detailRow = function(label, value)
		{
			return '<div style="display:flex;gap:7px;min-width:0;font-size:10px;' +
				'line-height:12px;white-space:nowrap"><b style="width:70px;flex:none;' +
				'color:#475467;font-weight:600">' + label + '</b><span style="min-width:0;overflow:hidden;' +
				'text-overflow:ellipsis">' + displayValue(value) + '</span></div>';
		};
		var detailHtml = '';

		for (var rowIndex = 0; rowIndex < detailFields.length; rowIndex++)
		{
			detailHtml += detailRow(detailFields[rowIndex].label,
				detailValues[detailFields[rowIndex].name]);
		}

		return '<div style="box-sizing:border-box;width:100%;height:100%;display:flex;' +
			'font-family:&quot;Segoe UI&quot;,Arial,sans-serif;color:#30343b;background:#fff;' +
			'overflow:hidden" title="' +
			esc(fullDetails.join(' | ')) + '">' +
			'<div style="width:12px;flex:none;background:' + stripColor + '"></div>' +
			'<div style="box-sizing:border-box;flex:1;padding:6px 8px;overflow:hidden">' +
			'<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;' +
			'margin-bottom:2px;line-height:15px"><span style="font-size:10px;font-weight:700;' +
			'letter-spacing:.2px;color:#475467">' + esc(role) +
			'</span><span style="font-size:14px;font-weight:700;color:#0875e1;' +
			'white-space:nowrap">' + esc(this.getAttribute(cell, 'individualAddress')) + '</span></div>' +
			'<div style="font-size:15px;line-height:17px;font-weight:700;white-space:nowrap;' +
			'overflow:hidden;text-overflow:ellipsis;margin-bottom:3px">' +
			esc(this.getAttribute(cell, 'name')) + '</div>' +
			detailHtml + '</div></div>';
	};

	KnxTopologyModule.prototype.renderAreaLabel = function(cell)
	{
		var areaId = this.getObjectId(cell);
		var foundation = this.graph.knxLayoutFoundation;
		var lines = this.getChildren(cell, 'line');
		var secondaryLineCount = 0;
		var mainLineAddress = this.getAttribute(cell, 'address') + '.0';
		var deviceCount = 0;

		for (var lineIndex = 0; lineIndex < lines.length; lineIndex++)
		{
			if (this.isMainLine(lines[lineIndex]))
			{
				mainLineAddress = this.getAttribute(lines[lineIndex], 'address') ||
					mainLineAddress;
			}
			else
			{
				secondaryLineCount++;
			}
		}

		if (foundation != null)
		{
			var memberIds = foundation.index.getAreaMemberIds(areaId);

			for (var i = 0; i < memberIds.length; i++)
			{
				var meta = foundation.index.metaByObjectId[memberIds[i]];
				deviceCount += meta != null && meta.type == 'device' ? 1 : 0;
			}
		}

		// Area containers deliberately use a non-HTML label. The previous HTML
		// label could be escaped by a stale mxCellState while the Area was being
		// converted from metadata to a vertex, exposing the complete <div> text.
		return this.getAttribute(cell, 'name') + '  [' +
			this.getAttribute(cell, 'address') + ']\nMain Line ' + mainLineAddress +
			' \u00b7 ' + secondaryLineCount +
			(secondaryLineCount == 1 ? ' Line' : ' Lines') + ' \u00b7 ' +
			deviceCount + (deviceCount == 1 ? ' Device' : ' Devices');
	};

	KnxTopologyModule.prototype.refreshAreaLabels = function()
	{
		var areas = this.getCells('area');

		for (var i = 0; i < areas.length; i++)
		{
			this.graph.view.invalidate(areas[i], false, false);
		}

		this.graph.view.validate();
	};

	KnxTopologyModule.prototype.compareLineCells = function(a, b)
	{
		var aMain = this.isMainLine(a);
		var bMain = this.isMainLine(b);

		if (aMain != bMain)
		{
			return aMain ? -1 : 1;
		}

		return (parseInt(this.getAttribute(a, 'localAddress'), 10) || 0) -
			(parseInt(this.getAttribute(b, 'localAddress'), 10) || 0);
	};

	KnxTopologyModule.prototype.compareDeviceCells = function(a, b)
	{
		var getNumber = mxUtils.bind(this, function(cell)
		{
			var address = this.getAttribute(cell, 'individualAddress');
			return parseInt(address.substring(address.lastIndexOf('.') + 1), 10) || 0;
		});

		return getNumber(a) - getNumber(b);
	};

	KnxTopologyModule.prototype.installSidebar = function(sidebar)
	{
		var module = this;
		this.sidebar = sidebar;

		sidebar.addPalette('knxTopology', 'KNX Topology', true, function(content)
		{
			module.sidebarContent = content;
			module.refreshTopologyTree();
		}, true);
	};

	KnxTopologyModule.prototype.closeContextMenu = function()
	{
		var menu = document.getElementById('knx-topology-context-menu');

		if (menu != null && menu.parentNode != null)
		{
			menu.parentNode.removeChild(menu);
		}
	};

	KnxTopologyModule.prototype.showContextMenu = function(evt, items)
	{
		this.closeContextMenu();
		var module = this;
		var menu = document.createElement('div');
		menu.id = 'knx-topology-context-menu';
		menu.className = 'knxContextMenu';
		menu.style.left = Math.min(mxEvent.getClientX(evt), window.innerWidth - 210) + 'px';
		menu.style.top = Math.min(mxEvent.getClientY(evt), window.innerHeight - 160) + 'px';

		for (var i = 0; i < items.length; i++)
		{
			if (items[i] == null)
			{
				var separator = document.createElement('div');
				separator.className = 'knxContextSeparator';
				menu.appendChild(separator);
			}
			else
			{
				(function(item)
				{
					var row = document.createElement('div');
					row.className = 'knxContextItem';
					row.innerText = item.label;
					row.onclick = function(clickEvent)
					{
						module.closeContextMenu();
						item.action();
						mxEvent.consume(clickEvent);
					};
					menu.appendChild(row);
				})(items[i]);
			}
		}

		document.body.appendChild(menu);
		window.setTimeout(function()
		{
			var close = function(closeEvent)
			{
				if (!menu.contains(mxEvent.getSource(closeEvent)))
				{
					module.closeContextMenu();
					document.removeEventListener('mousedown', close, true);
				}
			};
			document.addEventListener('mousedown', close, true);
		}, 0);
		mxEvent.consume(evt);
	};

	KnxTopologyModule.prototype.configureTreeRow = function(row, cell, level, menuItems)
	{
		var module = this;
		row.style.marginLeft = (level * 12) + 'px';
		row.setAttribute('title', 'Right-click for topology actions');

		if (cell != null && this.graph.getSelectionCell() == cell)
		{
			row.className += ' knxTreeRowSelected';
		}

		row.onclick = function(evt)
		{
			if (cell != null)
			{
				module.selectTopologyCell(cell);
			}
			mxEvent.consume(evt);
		};
		row.oncontextmenu = function(evt)
		{
			if (cell != null)
			{
				module.graph.setSelectionCell(cell);
				module.refreshTopologyTree();
			}
			module.showContextMenu(evt, menuItems());
			return false;
		};
	};

	KnxTopologyModule.prototype.refreshTopologyTree = function(force)
	{
		if (force !== true && this.areaLayoutEngine != null &&
			this.areaLayoutEngine.activeMutation != null)
		{
			this.areaLayoutEngine.activeMutation.treeRefreshPending = true;
			return;
		}

		if (this.sidebarContent == null)
		{
			return;
		}

		var module = this;
		var content = this.sidebarContent;
		content.innerText = '';
		var panel = document.createElement('div');
		panel.className = 'knxTopologyPanel';
		var project = document.createElement('div');
		project.className = 'knxTreeRow';
		project.innerHTML = '<b>▾ KNX Project</b>';
		panel.appendChild(project);
		var areas = {};
		var invalid = [];
		var equipment = this.getEquipmentCells();

		for (var equipmentIndex = 0; equipmentIndex < equipment.length; equipmentIndex++)
		{
			var cell = equipment[equipmentIndex];
			var address = KnxObjectSchema.parseEquipmentAddress(
				this.getAttribute(cell, 'individualAddress'), this.getEquipmentType(cell));

			if (address == null)
			{
				invalid.push(cell);
				continue;
			}

			var area = areas[address.areaAddress] || {
				address: address.areaAddress,
				couplers: [],
				lines: {}
			};
			areas[address.areaAddress] = area;

			if (this.getEquipmentType(cell) == 'bc')
			{
				area.couplers.push(cell);
			}
			else
			{
				area.lines[address.lineAddress] = area.lines[address.lineAddress] || [];
				area.lines[address.lineAddress].push(cell);
			}
		}

		var compareEquipment = function(a, b)
		{
			var aAddress = KnxObjectSchema.parseEquipmentAddress(
				module.getAttribute(a, 'individualAddress'), module.getEquipmentType(a));
			var bAddress = KnxObjectSchema.parseEquipmentAddress(
				module.getAttribute(b, 'individualAddress'), module.getEquipmentType(b));
			return (aAddress != null ? aAddress.device : 0) -
				(bAddress != null ? bAddress.device : 0);
		};
		var appendEquipment = function(cell, level)
		{
			var row = document.createElement('div');
			row.className = 'knxTreeRow knxTreeDevice';
			row.style.marginLeft = '0';
			var icon = document.createElement('span');
			icon.className = 'knxTreeIcon';
			var text = document.createElement('span');
			var type = KnxObjectSchema.getEquipmentType(module.getEquipmentType(cell));
			icon.style.background = type.stripColor;
			text.innerText = type.shortName + '  ' +
				module.getAttribute(cell, 'name', type.defaultName) + ' · ' +
				module.getAttribute(cell, 'individualAddress', 'No IA');
			row.appendChild(icon);
			row.appendChild(text);
			module.configureTreeRow(row, cell, level, function()
			{
				var items = [];

				if (module.isDevice(cell))
				{
					items.push({label: 'Start Wiring', action: function()
						{ module.startConnectBus(cell); }});
				}

				items.push({label: 'Properties', action: function()
					{ module.selectTopologyCell(cell); }});
				return items;
			});
			panel.appendChild(row);
		};
		var areaKeys = Object.keys(areas).sort(function(a, b)
		{
			return parseInt(a, 10) - parseInt(b, 10);
		});

		for (var areaIndex = 0; areaIndex < areaKeys.length; areaIndex++)
		{
			var areaData = areas[areaKeys[areaIndex]];
			var areaRow = document.createElement('div');
			areaRow.className = 'knxTreeRow knxTreeDerived';
			areaRow.style.marginLeft = '12px';
			areaRow.innerHTML = '▾ <b>Area ' +
				mxUtils.htmlEntities(areaData.address) + '</b>';
			panel.appendChild(areaRow);
			areaData.couplers.sort(compareEquipment);

			for (var couplerIndex = 0; couplerIndex < areaData.couplers.length;
				couplerIndex++)
			{
				appendEquipment(areaData.couplers[couplerIndex], 2);
			}

			var lineKeys = Object.keys(areaData.lines).sort(function(a, b)
			{
				var aLine = parseInt(a.substring(a.indexOf('.') + 1), 10);
				var bLine = parseInt(b.substring(b.indexOf('.') + 1), 10);
				return aLine - bLine;
			});

			for (var lineIndex = 0; lineIndex < lineKeys.length; lineIndex++)
			{
				var lineAddress = lineKeys[lineIndex];
				var lineRow = document.createElement('div');
				lineRow.className = 'knxTreeRow knxTreeDerived';
				lineRow.style.marginLeft = '24px';
				lineRow.innerHTML = '▾ Line <span style="color:#0875e1">' +
					mxUtils.htmlEntities(lineAddress) + '</span>';
				panel.appendChild(lineRow);
				areaData.lines[lineAddress].sort(compareEquipment);

				for (var deviceIndex = 0;
					deviceIndex < areaData.lines[lineAddress].length; deviceIndex++)
				{
					appendEquipment(areaData.lines[lineAddress][deviceIndex], 3);
				}
			}
		}

		if (invalid.length > 0)
		{
			var invalidRow = document.createElement('div');
			invalidRow.className = 'knxTreeRow knxTreeDerived knxTreeInvalid';
			invalidRow.style.marginLeft = '12px';
			invalidRow.innerHTML = '▾ <b>Invalid or unassigned address</b>';
			panel.appendChild(invalidRow);

			for (var invalidIndex = 0; invalidIndex < invalid.length; invalidIndex++)
			{
				appendEquipment(invalid[invalidIndex], 2);
			}
		}

		if (equipment.length == 0)
		{
			var hint = document.createElement('div');
			hint.className = 'knxTreeHint';
			hint.innerText = 'Use Add Device above, choose a type, then place it on the canvas.';
			panel.appendChild(hint);
		}

		content.appendChild(panel);
	};

	// Retained for loading and diagnosing diagrams produced by the earlier
	// structural prototype. The active Project Tree is address-derived above.
	KnxTopologyModule.prototype.refreshLegacyTopologyTree = function(force)
	{
		if (force !== true && this.areaLayoutEngine != null &&
			this.areaLayoutEngine.activeMutation != null)
		{
			this.areaLayoutEngine.activeMutation.treeRefreshPending = true;
			return;
		}

		if (this.sidebarContent == null)
		{
			return;
		}

		this.normalizeHierarchy();
		var module = this;
		var content = this.sidebarContent;
		content.innerText = '';
		var panel = document.createElement('div');
		panel.className = 'knxTopologyPanel';
		var actions = document.createElement('div');
		actions.className = 'knxTopologyActions';
		var addAreaButton = document.createElement('button');
		addAreaButton.className = 'knxTopologyButton knxTopologyButtonPrimary';
		addAreaButton.innerText = '+ Add area';
		addAreaButton.onclick = function()
		{
			module.addArea();
		};
		actions.appendChild(addAreaButton);
		var layoutButton = document.createElement('button');
		layoutButton.className = 'knxTopologyButton';
		layoutButton.innerText = 'Auto layout';
		layoutButton.onclick = function()
		{
			if (module.areaLayoutEngine != null)
			{
				module.areaLayoutEngine.layoutProjectAreas();
				module.areaLayoutEngine.fitProject();
			}
		};
		actions.appendChild(layoutButton);
		panel.appendChild(actions);

		var project = document.createElement('div');
		project.className = 'knxTreeRow';
		project.innerHTML = '<b>▾ KNX Project</b>';
		this.configureTreeRow(project, null, 0, function()
		{
			return [{label: 'Add Area', action: function()
				{ module.addArea(); }}];
		});
		panel.appendChild(project);
		var backbones = this.getCells('backbone');

		if (backbones.length > 0)
		{
			var backboneRow = document.createElement('div');
			backboneRow.className = 'knxTreeRow';
			backboneRow.innerHTML = 'Backbone <span style="color:#0875e1">' +
				mxUtils.htmlEntities(this.getAttribute(backbones[0], 'address')) + '</span>';
			this.configureTreeRow(backboneRow, backbones[0], 1, function()
			{
				return [{label: 'Properties', action: function()
					{ module.selectTopologyCell(backbones[0]); }}];
			});
			panel.appendChild(backboneRow);
		}

		var areas = this.getCells('area');
		areas.sort(function(a, b)
		{
			return (parseInt(module.getAttribute(a, 'address'), 10) || 0) -
				(parseInt(module.getAttribute(b, 'address'), 10) || 0);
		});

		for (var areaIndex = 0; areaIndex < areas.length; areaIndex++)
		{
			(function(areaCell)
			{
				var areaRow = document.createElement('div');
				areaRow.className = 'knxTreeRow';
				areaRow.innerHTML = '▾ ' + mxUtils.htmlEntities(module.getAttribute(areaCell, 'name')) +
					' <span style="color:#0875e1">' +
					mxUtils.htmlEntities(module.getAttribute(areaCell, 'address')) + '</span>';
				module.configureTreeRow(areaRow, areaCell, 1, function()
				{
					return [{label: 'Add Line', action: function()
						{ module.addSecondaryLineStructure(areaCell); }},
						{label: 'Properties', action: function()
						{ module.selectTopologyCell(areaCell); }}];
				});
				panel.appendChild(areaRow);
				var areaCoupler = module.getCoupler(areaCell, 'area');

				if (areaCoupler != null)
				{
					var areaCouplerRow = document.createElement('div');
					areaCouplerRow.className = 'knxTreeRow';
					areaCouplerRow.innerHTML = '<b>BC</b> Area Coupler ' +
						'<span style="color:#0875e1">' + mxUtils.htmlEntities(
							module.getAttribute(areaCoupler, 'individualAddress')) + '</span>';
					module.configureTreeRow(areaCouplerRow, areaCoupler, 2, function()
					{
						return [{label: 'Properties', action: function()
							{ module.selectTopologyCell(areaCoupler); }}];
					});
					panel.appendChild(areaCouplerRow);
				}

				var lines = module.getChildren(areaCell, 'line').slice();
				lines.sort(module.compareLineCells.bind(module));

				for (var lineIndex = 0; lineIndex < lines.length; lineIndex++)
				{
					(function(lineCell)
					{
						var mainLine = module.isMainLine(lineCell);
						var lineLevel = mainLine ? 2 : 3;
						var childLevel = lineLevel + 1;
						var lineRow = document.createElement('div');
						lineRow.className = 'knxTreeRow';
						lineRow.innerHTML = '▾ ' + mxUtils.htmlEntities(module.getAttribute(lineCell, 'name')) +
							' <span style="color:#0875e1">' +
							mxUtils.htmlEntities(module.getAttribute(lineCell, 'address')) + '</span>';
						module.configureTreeRow(lineRow, lineCell, lineLevel, function()
						{
							return [{label: 'Add Device', action: function()
								{ module.addDevice(lineCell); }},
								{label: 'Properties', action: function()
								{ module.selectTopologyCell(lineCell); }}];
						});
						panel.appendChild(lineRow);

						if (!mainLine)
						{
							var lineCoupler = module.getCoupler(lineCell, 'line');

							if (lineCoupler != null)
							{
								var lineCouplerRow = document.createElement('div');
								lineCouplerRow.className = 'knxTreeRow';
								lineCouplerRow.innerHTML = '<b>LC</b> Line Coupler ' +
									'<span style="color:#0875e1">' + mxUtils.htmlEntities(
										module.getAttribute(lineCoupler, 'individualAddress')) + '</span>';
								module.configureTreeRow(lineCouplerRow, lineCoupler, childLevel, function()
								{
									return [{label: 'Properties', action: function()
										{ module.selectTopologyCell(lineCoupler); }}];
								});
								panel.appendChild(lineCouplerRow);
							}
						}

						var devices = module.getChildren(lineCell, 'device').slice();
						devices.sort(module.compareDeviceCells.bind(module));

						for (var deviceIndex = 0; deviceIndex < devices.length; deviceIndex++)
						{
							(function(deviceCell)
							{
								var deviceRow = document.createElement('div');
								deviceRow.className = 'knxTreeRow knxTreeDevice';
								deviceRow.style.marginLeft = '0';
								var icon = document.createElement('span');
								icon.className = 'knxTreeIcon';
								icon.style.background = KnxObjectSchema.getEquipmentType(
									module.getEquipmentType(deviceCell)).stripColor;
								var text = document.createElement('span');
								var connectionState = module.getDeviceConnectionState(deviceCell);
								text.innerText = (connectionState == 'Connected' ? '' : '⚠ ') +
									module.getAttribute(deviceCell, 'name') + ' · ' +
									module.getAttribute(deviceCell, 'individualAddress') +
									(connectionState == 'Connected' ? '' : ' · Not connected');
								deviceRow.appendChild(icon);
								deviceRow.appendChild(text);
								module.configureTreeRow(deviceRow, deviceCell, childLevel, function()
								{
									return [{label: 'Connect to Bus', action: function()
										{ module.startConnectBus(deviceCell); }},
										{label: 'Properties', action: function()
										{ module.selectTopologyCell(deviceCell); }}];
								});
								panel.appendChild(deviceRow);
							})(devices[deviceIndex]);
						}
					})(lines[lineIndex]);
				}
			})(areas[areaIndex]);
		}

		if (areas.length == 0)
		{
			var hint = document.createElement('div');
			hint.className = 'knxTreeHint';
			hint.innerText = 'Right-click KNX Project or use Add area to create the first Area.';
			panel.appendChild(hint);
		}

		content.appendChild(panel);
	};

	KnxTopologyModule.prototype.renderPropertyPanel = function(format, cell, focusState)
	{
		var module = this;
		var type = this.getAttribute(cell, 'knxType');

		if (type == 'device' || type == 'coupler')
		{
			this.ensureDeviceCardSize(cell);
		}

		format.clear();
		var panel = document.createElement('div');
		panel.className = 'knxPropertyPanel';
		var header = document.createElement('div');
		header.className = 'knxPropertiesHeader';
		header.innerText = 'Properties';
		panel.appendChild(header);
		var title = document.createElement('div');
		title.className = 'knxPropertyTitle';
		var equipmentType = this.isEquipment(cell) ?
			KnxObjectSchema.getEquipmentType(this.getEquipmentType(cell)) : null;
		title.innerText = (type == 'area') ? 'KNX Area' :
			((type == 'line') ? 'KNX Line' :
				((equipmentType != null) ? equipmentType.label :
					((type == 'backbone') ? 'KNX Backbone' : 'KNX Device')));
		panel.appendChild(title);
		var subtitle = document.createElement('div');
		subtitle.className = 'knxPropertySubtitle';
		subtitle.innerText = this.getAttribute(cell, 'topologyId');
		panel.appendChild(subtitle);

		if (type == 'device')
		{
			var typeField = document.createElement('div');
			typeField.className = 'knxPropertyField';
			var typeLabel = document.createElement('label');
			typeLabel.innerText = 'Device Type';
			var typeSelect = document.createElement('select');
			typeSelect.setAttribute('data-knx-property', 'deviceType');
			var equipmentTypes = KnxObjectSchema.getEquipmentTypes();

			for (var typeIndex = 0; typeIndex < equipmentTypes.length; typeIndex++)
			{
				var typeOption = document.createElement('option');
				typeOption.value = equipmentTypes[typeIndex].value;
				typeOption.innerText = equipmentTypes[typeIndex].label;
				typeOption.selected = equipmentTypes[typeIndex].value ==
					this.getEquipmentType(cell);
				typeSelect.appendChild(typeOption);
			}

			mxEvent.addListener(typeSelect, 'change', function()
			{
				module.updateEquipmentType(cell, typeSelect.value);
			});
			typeField.appendChild(typeLabel);
			typeField.appendChild(typeSelect);
			panel.appendChild(typeField);
		}

		var fields = KnxObjectSchema.getPropertyFields(type);

		for (var i = 0; i < fields.length; i++)
		{
			(function(field)
			{
				var wrapper = document.createElement('div');
				wrapper.className = 'knxPropertyField';
				var label = document.createElement('label');
				label.innerText = field.name == 'individualAddress' &&
					equipmentType != null && equipmentType.value == 'powerSupply' ?
					'Line Address (Area.Line.)' : field.label;
				var input = document.createElement('input');
				input.type = 'text';
				input.value = module.getAttribute(cell, field.name);
				input.setAttribute('data-knx-property', field.name);
				mxEvent.addListener(input, 'input', function()
				{
					module.updateObjectAttribute(cell, field.name, input.value);
				});
				wrapper.appendChild(label);
				wrapper.appendChild(input);
				panel.appendChild(wrapper);
			})(fields[i]);
		}

		if (type == 'device')
		{
			var topology = document.createElement('div');
			topology.className = 'knxPropertySection knxPropertyReadOnly';
			var address = KnxObjectSchema.parseEquipmentAddress(
				this.getAttribute(cell, 'individualAddress'), this.getEquipmentType(cell));
			topology.innerHTML = address != null ?
				('<b>Topology from address</b><br>Area: Area ' +
				mxUtils.htmlEntities(address.areaAddress) + '<br>Line: Line ' +
				mxUtils.htmlEntities(address.lineAddress)) :
				(equipmentType != null && equipmentType.value == 'powerSupply' ?
					'<b>Topology from address</b><br>Enter a valid Line address (Area.Line.).' :
					'<b>Topology from address</b><br>Enter a valid IA (Area.Line.Device).');
			panel.appendChild(topology);
		}
		format.container.appendChild(panel);
		format.restoreFocus(focusState);
	};

	KnxTopologyModule.prototype.renderEmptyPropertyPanel = function(format, focusState)
	{
		format.clear();
		var panel = document.createElement('div');
		panel.className = 'knxPropertyPanel';
		var header = document.createElement('div');
		header.className = 'knxPropertiesHeader';
		header.innerText = 'Properties';
		panel.appendChild(header);
		var empty = document.createElement('div');
		empty.className = 'knxPropertyEmpty';
		empty.innerHTML = '<div class="knxPropertyEmptyIcon">&#9633;</div>' +
			'<b>Select a KNX device</b><span>Choose a Device, LC, BC or Line Repeater ' +
			'on the tree or canvas to view its properties.</span>';
		panel.appendChild(empty);
		format.container.appendChild(panel);
		format.restoreFocus(focusState);
	};

	// Adds the topology palette before the stock shape libraries.
	var sidebarInit = Sidebar.prototype.init;
	Sidebar.prototype.init = function()
	{
		KnxTopologyModule.get(this.editorUi).installSidebar(this);
		sidebarInit.apply(this, arguments);
	};

	// Shows the KNX inspector instead of the generic format tabs.
	var formatImmediateRefresh = Format.prototype.immediateRefresh;
	Format.prototype.immediateRefresh = function()
	{
		var module = KnxTopologyModule.get(this.editorUi);
		var graph = this.editorUi.editor.graph;
		var cell = graph.getSelectionCell();

		if (graph.getSelectionCount() == 1 && module.isTopologyCell(cell) &&
			this.container.offsetWidth != 0)
		{
			module.renderPropertyPanel(this, cell, this.captureFocus());
			return;
		}

		if (this.editorUi.knxWorkspaceMode && this.container.offsetWidth != 0)
		{
			module.renderEmptyPropertyPanel(this, this.captureFocus());
			return;
		}

		formatImmediateRefresh.apply(this, arguments);
	};

	// Renders KNX cards from object properties and prevents inline text editing.
	var graphConvertValueToString = Graph.prototype.convertValueToString;
	Graph.prototype.convertValueToString = function(cell)
	{
		var module = this.knxTopologyModule;

		if (module != null && (module.isDevice(cell) || module.isCoupler(cell)))
		{
			return module.renderDeviceLabel(cell);
		}
		else if (module != null && module.isArea(cell))
		{
			return module.renderAreaLabel(cell);
		}
		else if (module != null && module.isBus(cell))
		{
			return module.getAttribute(cell, 'name') + ' · ' +
				module.getAttribute(cell, 'address');
		}
		else if (module != null && module.isBackbone(cell))
		{
			return module.getAttribute(cell, 'name') + ' · ' +
				module.getAttribute(cell, 'address');
		}

		return graphConvertValueToString.apply(this, arguments);
	};

	var graphIsCellEditable = Graph.prototype.isCellEditable;
	Graph.prototype.isCellEditable = function(cell)
	{
		if (cell != null && cell.value != null && typeof cell.value == 'object' &&
			cell.value.getAttribute('knxType') != null)
		{
			return false;
		}

		return graphIsCellEditable.apply(this, arguments);
	};

	// A bus is drawn as a thin wire-shaped cell so it can carry Line metadata.
	// When the user drags it, its invisible tap junctions must follow the wire;
	// otherwise the visible device connections would remain at the old position.
	var graphMoveKnxCells = Graph.prototype.moveCells;
	Graph.prototype.moveCells = function(cells, dx, dy, clone, target, evt, mapping)
	{
		var module = this.knxTopologyModule;
		var junctionsToMove = [];

		if (module != null && !clone && cells != null && (dx != 0 || dy != 0))
		{
			var ownerIds = {};

			for (var i = 0; i < cells.length; i++)
			{
				if (module.isBus(cells[i]) || module.isBackbone(cells[i]))
				{
					ownerIds[module.getAttribute(cells[i], 'topologyId')] = true;
				}
			}

			var junctions = module.getCells('junction');

			for (var junctionIndex = 0; junctionIndex < junctions.length; junctionIndex++)
			{
				if (ownerIds[module.getAttribute(junctions[junctionIndex],
					'parentTopologyId')])
				{
					junctionsToMove.push(junctions[junctionIndex]);
				}
			}
		}

		this.model.beginUpdate();

		try
		{
			var result = graphMoveKnxCells.apply(this, arguments);

			for (var moveIndex = 0; moveIndex < junctionsToMove.length; moveIndex++)
			{
				var geometry = this.getCellGeometry(junctionsToMove[moveIndex]);

				if (geometry != null)
				{
					geometry = geometry.clone();
					geometry.translate(dx, dy);
					this.model.setGeometry(junctionsToMove[moveIndex], geometry);
				}
			}

			return result;
		}
		finally
		{
			this.model.endUpdate();
		}
	};

	// Couplers created by older prototype versions used html=0. Force KNX
	// cards through the HTML label renderer while those cells are upgraded.
	var graphIsHtmlLabel = Graph.prototype.isHtmlLabel;
	Graph.prototype.isHtmlLabel = function(cell)
	{
		var module = this.knxTopologyModule;

		if (module != null && (module.isDevice(cell) || module.isCoupler(cell)))
		{
			return true;
		}

		return graphIsHtmlLabel.apply(this, arguments);
	};

	window.KnxTopologyModule = KnxTopologyModule;
})();
