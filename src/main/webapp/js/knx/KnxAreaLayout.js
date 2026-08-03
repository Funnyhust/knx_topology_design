/**
 * Project-level KNX Area containers and placement.
 *
 * Topology metadata remains authoritative. Area cells are canvas projections,
 * never Draw.io groups and never a source for parent-child relationships.
 */
(function(root)
{
	if (root.KnxAreaLayoutEngine != null)
	{
		return;
	}

	var constants = root.KnxConstants ||
		(typeof require == 'function' ? require('./core/KnxConstants.js') : null);
	var DEFAULTS = {
		paddingTop: 18,
		paddingRight: 28,
		paddingBottom: 28,
		paddingLeft: 28,
		headerHeight: 48,
		minWidth: 680,
		minHeight: 360,
		compactMinHeight: 210,
		areaGap: 80,
		projectLeft: 150,
		projectTop: 60,
		projectPadding: 40,
		// The goal UI uses two readable Line groups per Area row. Three compact
		// columns looked acceptable with empty Lines, but produced a forest of
		// almost-parallel feeders as soon as several rows were added.
		maxLinesPerRow: 2,
		// A fixed 3 x 2 bank matches the compact goal layout. Additional
		// Devices open a new bank below instead of extending the Area forever.
		maxDevicesPerColumn: 2,
		maxDeviceColumns: 4,
		deviceBankGapY: 38,
		deviceCardWidth: constants.EQUIPMENT_CARD_WIDTH,
		deviceCardHeight: constants.EQUIPMENT_CARD_HEIGHT,
		lineGapX: 60,
		lineGapY: 70,
		deviceGapX: 18,
		deviceGapY: 12,
		// Keep the common three-Line topology directly below the Main Line.
		// Wrapping a Coupler too early creates a long feeder that looks like a
		// second bus and obscures the parent-child relationship.
		maxAreaWidth: 2300,
		adaptiveMinAreaWidth: 900,
		lineMinWidth: 420,
		couplerWidth: constants.EQUIPMENT_CARD_WIDTH,
		couplerHeight: constants.EQUIPMENT_CARD_HEIGHT,
		emptyLineTileWidth: 224,
		emptyLineBusWidth: 64,
		lineDeviceOffsetX: 20,
		lineDeviceOffsetY: 35,
		lineTopGap: 28,
		lineBottomPadding: 30,
		emptyLineBusHeight: 48,
		lineGridInset: 30,
		wrappedFeederGutter: 30,
		gridTopGap: 95
	};
	// Version 6 caps stable slots into fixed-width four-column banks. Existing auto
	// projections migrate once; manual nodes are kept.
	var DEVICE_GRID_VERSION = 6;

	function clone(value)
	{
		return value == null ? value : JSON.parse(JSON.stringify(value));
	}

	function unionBounds(items)
	{
		var minX = Infinity;
		var minY = Infinity;
		var maxX = -Infinity;
		var maxY = -Infinity;

		for (var i = 0; i < items.length; i++)
		{
			var item = items[i];
			minX = Math.min(minX, item.x);
			minY = Math.min(minY, item.y);
			maxX = Math.max(maxX, item.x + item.width);
			maxY = Math.max(maxY, item.y + item.height);
		}

		return minX == Infinity ? {x: 0, y: 0, width: 0, height: 0} : {
			x: minX,
			y: minY,
			width: Math.max(0, maxX - minX),
			height: Math.max(0, maxY - minY)
		};
	}

	function resolveVerticalAreaPlacement(areaLayouts, startX, startY, gap)
	{
		var result = [];
		var cursorY = startY;

		for (var i = 0; i < areaLayouts.length; i++)
		{
			result.push({
				areaId: areaLayouts[i].areaId,
				x: startX,
				y: cursorY,
				width: areaLayouts[i].width,
				height: areaLayouts[i].height
			});
			cursorY += areaLayouts[i].height + gap;
		}

		return result;
	}

	function resolveFollowingAreaOverlap(areaLayouts, gap)
	{
		var result = clone(areaLayouts || []);

		for (var i = 1; i < result.length; i++)
		{
			var previous = result[i - 1];
			var requiredY = previous.y + previous.height + gap;

			if (result[i].y < requiredY)
			{
				result[i].y = requiredY;
			}
		}

		return result;
	}

	function calculateDeviceSlot(index, maxPerColumn, originX, originY,
		cardWidth, cardHeight, gapX, gapY, maxColumns, bankGapY)
	{
		maxColumns = Math.max(1, maxColumns || 1);
		bankGapY = bankGapY || 0;
		var bankCapacity = maxPerColumn * maxColumns;
		var bank = Math.floor(index / bankCapacity);
		var bankIndex = index % bankCapacity;
		var column = Math.floor(bankIndex / maxPerColumn);
		var row = bankIndex % maxPerColumn;
		var bankHeight = maxPerColumn * cardHeight +
			Math.max(0, maxPerColumn - 1) * gapY;

		return {
			bank: bank,
			column: column,
			row: row,
			x: originX + column * (cardWidth + gapX),
			y: originY + bank * (bankHeight + bankGapY) +
				row * (cardHeight + gapY),
			width: cardWidth,
			height: cardHeight
		};
	}

	function calculateDeviceGrid(deviceCount, config)
	{
		var maxPerColumn = Math.max(1, config.maxDevicesPerColumn);
		var maxColumns = Math.max(1, config.maxDeviceColumns);
		var bankCapacity = maxPerColumn * maxColumns;

		if (deviceCount <= 0)
		{
			return {columns: 1, rows: 0, banks: 0,
				maxPerColumn: maxPerColumn, maxColumns: maxColumns,
				bankCapacity: bankCapacity};
		}

		var banks = Math.ceil(deviceCount / bankCapacity);
		var lastBankCount = deviceCount - (banks - 1) * bankCapacity;
		var lastBankRows = Math.min(maxPerColumn, lastBankCount);

		// Stable slot contract: bank/column/row are pure functions of the
		// sorted Device index and never depend on the final Device count.
		return {
			columns: Math.min(maxColumns,
				Math.ceil(Math.min(deviceCount, bankCapacity) / maxPerColumn)),
			rows: (banks - 1) * maxPerColumn + lastBankRows,
			banks: banks,
			lastBankRows: lastBankRows,
			maxPerColumn: maxPerColumn,
			maxColumns: maxColumns,
			bankCapacity: bankCapacity
		};
	}

	function measureLineTile(deviceCount, cardWidth, cardHeight, couplerHeight,
		config)
	{
		var hasDevices = deviceCount > 0;
		var grid = calculateDeviceGrid(deviceCount, config);
		var columns = grid.columns;
		var rows = grid.rows;
		var width = hasDevices ? Math.max(config.lineMinWidth,
			config.couplerWidth + config.lineDeviceOffsetX + columns * cardWidth +
			(columns - 1) * config.deviceGapX + config.lineBottomPadding) :
			config.emptyLineTileWidth;
		var deviceContentHeight = hasDevices ? rows * cardHeight +
			Math.max(0, rows - grid.banks) * config.deviceGapY +
			Math.max(0, grid.banks - 1) * config.deviceBankGapY : 0;
		var height = hasDevices ? Math.max(couplerHeight,
			couplerHeight / 2 + config.lineDeviceOffsetY + deviceContentHeight +
			config.lineBottomPadding) : couplerHeight + config.lineBottomPadding;

		return {width: width, height: height, columns: columns, rows: rows,
			banks: grid.banks, maxColumns: grid.maxColumns,
			maxPerColumn: grid.maxPerColumn || config.maxDevicesPerColumn,
			hasDevices: hasDevices};
	}

	function packLineTiles(metrics, startX, startY, config)
	{
		var placements = [];
		var columnCount = Math.max(1, Math.min(config.maxLinesPerRow,
			metrics.length || 1));
		var contentWidth = config.maxAreaWidth - config.paddingRight - startX;
		var columnWidths = null;

		// Use stable column widths for every row. The previous cursor-based
		// packing shifted a feeder whenever a Line in the preceding row had a
		// different Device count, which made sibling Lines look interconnected.
		while (columnCount > 0)
		{
			columnWidths = [];

			for (var columnIndex = 0; columnIndex < columnCount; columnIndex++)
			{
				columnWidths[columnIndex] = 0;
			}

			for (var metricIndex = 0; metricIndex < metrics.length; metricIndex++)
			{
				var metricColumn = metricIndex % columnCount;
				columnWidths[metricColumn] = Math.max(columnWidths[metricColumn],
					metrics[metricIndex].width);
			}

			var requiredWidth = columnWidths.reduce(function(total, width)
			{
				return total + width;
			}, 0) + Math.max(0, columnCount - 1) * config.lineGapX;

			if (columnCount == 1 || requiredWidth <= contentWidth)
			{
				break;
			}

			columnCount--;
		}

		var columnX = [];
		var nextX = startX;

		for (var xIndex = 0; xIndex < columnCount; xIndex++)
		{
			columnX[xIndex] = nextX;
			nextX += columnWidths[xIndex] + config.lineGapX;
		}

		var rowHeights = [];

		for (var heightIndex = 0; heightIndex < metrics.length; heightIndex++)
		{
			var heightRow = Math.floor(heightIndex / columnCount);
			rowHeights[heightRow] = Math.max(rowHeights[heightRow] || 0,
				metrics[heightIndex].height);
		}

		var rowY = [];
		var nextY = startY;

		for (var yIndex = 0; yIndex < rowHeights.length; yIndex++)
		{
			rowY[yIndex] = nextY;
			nextY += rowHeights[yIndex] + config.lineGapY;
		}

		var maxRight = startX;
		var maxBottom = startY;

		for (var i = 0; i < metrics.length; i++)
		{
			var rowIndex = Math.floor(i / columnCount);
			var placementColumn = i % columnCount;
			var cursorX = columnX[placementColumn];
			var cursorY = rowY[rowIndex];

			placements.push({x: cursorX, y: cursorY,
				width: metrics[i].width, height: metrics[i].height,
				row: rowIndex, column: placementColumn});
			maxRight = Math.max(maxRight, cursorX + metrics[i].width);
			maxBottom = Math.max(maxBottom, cursorY + metrics[i].height);
		}

		return {placements: placements, width: maxRight - startX,
			height: maxBottom - startY};
	}

	function calculateLineFeederX(placement, busX, config)
	{
		// Every row in a visual column shares one gutter. This deliberately
		// keeps the distribution path outside Coupler cards and prevents the
		// two near-parallel feeder axes seen when row zero used the card centre.
		return placement.x - config.wrappedFeederGutter;
	}

	function rectanglesIntersect(a, b)
	{
		return a.x < b.x + b.width && a.x + a.width > b.x &&
			a.y < b.y + b.height && a.y + a.height > b.y;
	}

	function getAreaMinimumSize(hasBranchContent, config)
	{
		return {
			width: hasBranchContent ? config.adaptiveMinAreaWidth : config.minWidth,
			height: hasBranchContent ? config.minHeight : config.compactMinHeight
		};
	}

	function KnxAreaLayoutEngine(foundation, module)
	{
		this.foundation = foundation;
		this.module = module;
		this.graph = foundation.graph;
		this.store = foundation.store;
		this.activeMutation = null;
		foundation.areaLayoutEngine = this;
		module.areaLayoutEngine = this;
		this.installInfiniteCanvas();
		this.ensureAreaContainers(false);
		this.upgradeLegacyAutoLineProjection();
		this.repairTopologyRouting(false);
		this.installDeleteBridge();
	}

	KnxAreaLayoutEngine.DEFAULTS = DEFAULTS;
	KnxAreaLayoutEngine.unionBounds = unionBounds;
	KnxAreaLayoutEngine.resolveVerticalAreaPlacement = resolveVerticalAreaPlacement;
	KnxAreaLayoutEngine.resolveFollowingAreaOverlap = resolveFollowingAreaOverlap;
	KnxAreaLayoutEngine.calculateDeviceSlot = calculateDeviceSlot;
	KnxAreaLayoutEngine.measureLineTile = measureLineTile;
	KnxAreaLayoutEngine.packLineTiles = packLineTiles;
	KnxAreaLayoutEngine.getAreaMinimumSize = getAreaMinimumSize;

	KnxAreaLayoutEngine.prototype.installInfiniteCanvas = function()
	{
		this.graph.pageVisible = false;
		this.graph.pageBreaksVisible = false;
		this.graph.preferPageSize = false;
		this.graph.minimumGraphSize = null;
		this.graph.sizeDidChange();
	};

	KnxAreaLayoutEngine.prototype.getAreaCells = function()
	{
		return this.foundation.index.getCellsByType('area').slice().sort(
			this.compareAreas.bind(this));
	};

	KnxAreaLayoutEngine.prototype.compareAreas = function(a, b)
	{
		return (parseInt(this.module.getAttribute(a, 'address'), 10) || 0) -
			(parseInt(this.module.getAttribute(b, 'address'), 10) || 0);
	};

	KnxAreaLayoutEngine.prototype.getAreaId = function(area)
	{
		return typeof area == 'string' ? this.foundation.index.resolveObjectId(area) :
			this.foundation.index.getCellObjectId(area);
	};

	KnxAreaLayoutEngine.prototype.calculateAreaContentBounds = function(areaId)
	{
		areaId = this.getAreaId(areaId);
		var memberIds = this.foundation.index.getAreaMemberIds(areaId);
		var items = [];

		for (var i = 0; i < memberIds.length; i++)
		{
			var meta = this.foundation.index.metaByObjectId[memberIds[i]];
			var node = this.store.data.nodes[memberIds[i]];

			if (meta != null && node != null &&
				(meta.type == 'coupler' || meta.type == 'line' || meta.type == 'device'))
			{
				items.push({
					x: node.relativeX,
					y: node.relativeY,
					width: node.width,
					height: node.height
				});
			}
		}

		return unionBounds(items);
	};

	KnxAreaLayoutEngine.prototype.updateAreaBounds = function(areaId)
	{
		areaId = this.getAreaId(areaId);
		var area = this.foundation.ensureAreaLayoutDefaults(
			this.store.data.areas[areaId]);

		if (area == null)
		{
			return null;
		}

		var bounds = this.calculateAreaContentBounds(areaId);
		var memberIds = this.foundation.index.getAreaMemberIds(areaId);
		var lines = this.foundation.index.getChildrenCells(areaId, 'line');
		var hasSecondaryLine = lines.some(mxUtils.bind(this, function(line)
		{
			return !this.module.isMainLine(line);
		}));
		var hasDevice = memberIds.some(mxUtils.bind(this, function(objectId)
		{
			var meta = this.foundation.index.metaByObjectId[objectId];
			return meta != null && meta.type == 'device';
		}));
		var minimum = getAreaMinimumSize(hasSecondaryLine || hasDevice, DEFAULTS);
		area.width = Math.max(minimum.width,
			bounds.x + bounds.width + area.paddingRight);
		area.height = Math.max(minimum.height,
			bounds.y + bounds.height + area.paddingBottom);

		return area;
	};

	KnxAreaLayoutEngine.prototype.getAreaStyle = function()
	{
		return 'rounded=1;arcSize=8;whiteSpace=wrap;html=0;overflow=hidden;' +
			'align=left;verticalAlign=top;spacingLeft=14;spacingTop=10;' +
			'fontFamily=Arial;fontSize=12;fontStyle=1;fontColor=#26415f;' +
			'fillColor=#f8fbff;' +
			'fillOpacity=75;strokeColor=#b9cbe3;strokeWidth=1;dashed=0;' +
			'shadow=0;movable=0;resizable=0;rotatable=0;editable=0;' +
			'connectable=0;selectable=1;pointerEvents=1;container=0;';
	};

	KnxAreaLayoutEngine.prototype.sendAreaToBack = function(cell)
	{
		var parent = this.graph.getModel().getParent(cell);

		if (parent != null && parent.children != null)
		{
			var index = parent.children.indexOf(cell);

			if (index > 0)
			{
				parent.children.splice(index, 1);
				parent.children.unshift(cell);
			}
		}
	};

	KnxAreaLayoutEngine.prototype.applyAreaContainerToCanvas = function(areaId, recordUndo)
	{
		areaId = this.getAreaId(areaId);
		var area = this.store.data.areas[areaId];
		var cell = this.foundation.index.getCell(areaId);

		if (area == null || cell == null)
		{
			return;
		}

		var geometry = cell.geometry != null ? cell.geometry.clone() : new mxGeometry();
		geometry.x = area.x;
		geometry.y = area.y;
		geometry.width = area.width;
		geometry.height = area.height;
		cell.vertex = true;
		cell.connectable = false;
		var areaStyle = this.getAreaStyle();
		this.sendAreaToBack(cell);

		if (recordUndo)
		{
			this.graph.getModel().setStyle(cell, areaStyle);
			this.graph.getModel().setGeometry(cell, geometry);
		}
		else
		{
			this.graph.getModel().styleForCellChanged(cell, areaStyle);
			this.graph.getModel().geometryForCellChanged(cell, geometry);
			this.graph.view.invalidate(cell);
		}
	};

	KnxAreaLayoutEngine.prototype.createOrUpdateAreaContainer = function(areaId, recordUndo)
	{
		this.updateAreaBounds(areaId);
		this.applyAreaContainerToCanvas(areaId, !!recordUndo);
	};

	KnxAreaLayoutEngine.prototype.ensureAreaContainers = function(recordUndo)
	{
		var areas = this.getAreaCells();

		for (var i = 0; i < areas.length; i++)
		{
			this.createOrUpdateAreaContainer(this.getAreaId(areas[i]), recordUndo);
		}

		this.graph.view.validate();
		this.graph.sizeDidChange();
	};

	KnxAreaLayoutEngine.prototype.handleProjectLoaded = function()
	{
		this.store = this.foundation.store;
		this.installInfiniteCanvas();
		this.module.normalizePowerSupplyAddresses();
		this.module.ensureEquipmentCardSizes();
		this.ensureAreaContainers(false);
		this.upgradeLegacyAutoLineProjection();
		this.repairTopologyRouting(false);
	};

	KnxAreaLayoutEngine.prototype.upgradeLegacyAutoLineProjection = function()
	{
		var areas = this.getAreaCells();
		var upgradedAreaIds = [];

		for (var areaIndex = 0; areaIndex < areas.length; areaIndex++)
		{
			var areaId = this.getAreaId(areas[areaIndex]);
			var lines = this.foundation.index.getChildrenCells(areaId, 'line');
			var hasLegacyAutoLine = false;
			var canUpgradeArea = true;

			for (var lineIndex = 0; lineIndex < lines.length; lineIndex++)
			{
				if (this.module.isMainLine(lines[lineIndex]))
				{
					continue;
				}

				var lineId = this.foundation.index.getCellObjectId(lines[lineIndex]);
				var lineNode = this.store.data.nodes[lineId];
				var lineLayout = this.store.data.lines[lineId] || {};
				var coupler = this.module.getCoupler(lines[lineIndex], 'line');
				var couplerNode = coupler != null ? this.store.data.nodes[
					this.foundation.index.getCellObjectId(coupler)] : null;

				if (lineLayout.busDirection == null ||
					(lineLayout.deviceGridVersion || 0) < DEVICE_GRID_VERSION)
				{
					hasLegacyAutoLine = true;
				}

				// A migration may replace only the old system projection. If the user
				// moved either the bus or its Coupler, preserve the complete Area.
				if ((lineNode != null && !this.isAutoNode(lineNode)) ||
					(couplerNode != null && !this.isAutoNode(couplerNode)))
				{
					canUpgradeArea = false;
					break;
				}
			}

			if (hasLegacyAutoLine && canUpgradeArea)
			{
				this.layoutAdaptiveArea(areaId);
				this.updateLineBounds(areaId);
				this.updateAreaBounds(areaId);
				upgradedAreaIds.push(areaId);
			}
		}

		if (upgradedAreaIds.length > 0)
		{
			this.resolveProjectAreaOverlap();
			this.planBackboneConnections(areas);
			this.foundation.applyLayoutToCanvas(this.getProjectObjectIds(
				areas.map(this.getAreaId.bind(this))), 'migration', false);

			for (var upgradedIndex = 0; upgradedIndex < upgradedAreaIds.length;
				upgradedIndex++)
			{
				this.applyAreaContainerToCanvas(upgradedAreaIds[upgradedIndex], false);
			}
		}

		return upgradedAreaIds;
	};

	KnxAreaLayoutEngine.prototype.handleTopologyAdded = function(cell)
	{
		if (this.activeMutation != null)
		{
			this.recordChangedCell(cell);
			return;
		}

		// Compatibility path for callers that bypass the public Add commands.
		var engine = this;
		this.runTopologyMutation(this.module.isArea(cell) ? 'add-area' :
			(this.module.isBus(cell) ? 'add-line' : 'add-device'), function()
		{
			engine.recordChangedCell(cell);
			return cell;
		});
	};

	KnxAreaLayoutEngine.prototype.getSelectionObjectIds = function()
	{
		var engine = this;

		return this.graph.getSelectionCells().map(function(cell)
		{
			return engine.foundation.index.getCellObjectId(cell);
		}).filter(function(objectId)
		{
			return objectId != '';
		});
	};

	KnxAreaLayoutEngine.prototype.restoreSelectionByIds = function(objectIds)
	{
		var engine = this;
		var cells = (objectIds || []).map(function(objectId)
		{
			return engine.foundation.index.getCell(objectId);
		}).filter(function(cell)
		{
			return cell != null && engine.graph.getModel().contains(cell);
		});
		this.graph.setSelectionCells(cells);
	};

	KnxAreaLayoutEngine.prototype.captureAllLayouts = function()
	{
		return this.store.capture(Object.keys(this.store.data.nodes),
			Object.keys(this.store.data.areas), Object.keys(this.store.data.lines));
	};

	KnxAreaLayoutEngine.prototype.completeSnapshotPair = function(before, after)
	{
		var sections = ['nodes', 'areas', 'lines'];

		for (var sectionIndex = 0; sectionIndex < sections.length; sectionIndex++)
		{
			var section = sections[sectionIndex];
			before[section] = before[section] || {};
			after[section] = after[section] || {};
			var ids = {};

			for (var beforeId in before[section])
			{
				ids[beforeId] = true;
			}

			for (var afterId in after[section])
			{
				ids[afterId] = true;
			}

			for (var id in ids)
			{
				if (!Object.prototype.hasOwnProperty.call(before[section], id))
				{
					before[section][id] = null;
				}

				if (!Object.prototype.hasOwnProperty.call(after[section], id))
				{
					after[section][id] = null;
				}
			}
		}
	};

	KnxAreaLayoutEngine.prototype.recordChangedCell = function(cell)
	{
		if (this.activeMutation == null || cell == null)
		{
			return;
		}

		if (this.activeMutation.changedCells.indexOf(cell) < 0)
		{
			this.activeMutation.changedCells.push(cell);
		}

		var objectId = this.foundation.index.getCellObjectId(cell);
		var areaId = this.module.isArea(cell) ? objectId :
			this.foundation.index.findAreaId(objectId);

		if (areaId != '')
		{
			this.activeMutation.changedAreaIds[areaId] = true;
		}
	};

	KnxAreaLayoutEngine.prototype.installDeleteBridge = function()
	{
		var engine = this;
		var graph = this.graph;

		if (graph.knxAreaDeleteBridgeInstalled)
		{
			return;
		}

		graph.knxAreaDeleteBridgeInstalled = true;
		var graphRemoveCells = graph.removeCells;
		graph.removeCells = function(cells, includeEdges)
		{
			if (graph.knxWireModeInputGuard)
			{
				return [];
			}

			// Interactive delete actions pass explicit cells. A missing list comes
			if (cells == null)
			{
				return [];
			}

			var topologyCells = cells.filter(function(cell)
			{
				return engine.module.isTopologyCell(cell);
			});

			if (topologyCells.length == 0 || engine.activeMutation != null)
			{
				return graphRemoveCells.apply(this, arguments);
			}

			return engine.runTopologyMutation('delete-object', function()
			{
				return graphRemoveCells.call(graph, cells, includeEdges);
			}, topologyCells);
		};
	};

	KnxAreaLayoutEngine.prototype.runTopologyMutation = function(reason, operation, seedCells)
	{
		if (this.activeMutation != null)
		{
			for (var nestedIndex = 0; seedCells != null &&
				nestedIndex < seedCells.length; nestedIndex++)
			{
				this.recordChangedCell(seedCells[nestedIndex]);
			}

			return operation();
		}

		// Topology mutations replace cells and selection. Any unfinished wire
		// preview still points at the previous projection and must not survive the
		// mutation, otherwise later W shortcuts are treated as already active.
		if (this.module.editorUi != null &&
			typeof this.module.editorUi.cancelWireMode == 'function')
		{
			this.module.editorUi.cancelWireMode();
		}

		var engine = this;
		var model = this.graph.getModel();
		var result = null;
		var failure = null;
		var mutation = {
			reason: reason,
			changedCells: [],
			changedAreaIds: {},
			beforeSnapshot: this.captureAllLayouts(),
			beforeSelectionIds: this.getSelectionObjectIds(),
			pendingSelectionId: null
		};

		this.activeMutation = mutation;
		for (var seedIndex = 0; seedCells != null && seedIndex < seedCells.length; seedIndex++)
		{
			this.recordChangedCell(seedCells[seedIndex]);
		}

		this.foundation.runWithSource('topologyReconcile', function()
		{
			model.beginUpdate();

			try
			{
				result = operation();

				if (result != null && engine.module.isTopologyCell(result))
				{
					engine.recordChangedCell(result);
				}

				engine.foundation.synchronizeCurrentTransaction('auto');

				for (var changedIndex = 0;
					changedIndex < mutation.changedCells.length; changedIndex++)
				{
					engine.recordChangedCell(mutation.changedCells[changedIndex]);
				}

				engine.reconcileTopologyLayout(mutation);
			}
			catch (e)
			{
				failure = e;
			}
			finally
			{
				model.endUpdate();
			}
		});

		this.activeMutation = null;

		if (failure != null)
		{
			throw failure;
		}

		// Tree and Properties are projections of the committed state. Rebuild
		// them once, after mxGraph has closed the outer transaction.
		this.module.refreshTopologyTree(true);

		if (mutation.pendingSelectionId != null)
		{
			this.module.editorUi.toggleFormatPanel(true);
		}

		return result;
	};

	KnxAreaLayoutEngine.prototype.resolveProjectAreaOverlap = function()
	{
		var areaCells = this.getAreaCells();
		var layouts = [];

		for (var i = 0; i < areaCells.length; i++)
		{
			var areaId = this.getAreaId(areaCells[i]);
			var area = this.store.data.areas[areaId];

			if (area != null)
			{
				layouts.push({areaId: areaId, x: area.x, y: area.y,
					width: area.width, height: area.height});
			}
		}

		var resolved = resolveFollowingAreaOverlap(layouts, DEFAULTS.areaGap);
		var moved = [];

		for (var resolvedIndex = 0; resolvedIndex < resolved.length; resolvedIndex++)
		{
			var target = this.store.data.areas[resolved[resolvedIndex].areaId];

			if (target != null && target.y != resolved[resolvedIndex].y)
			{
				target.y = resolved[resolvedIndex].y;
				moved.push(target.areaId);
			}
		}

		return moved;
	};

	KnxAreaLayoutEngine.prototype.reconcileTopologyLayout = function(mutation)
	{
		var areaCells = this.getAreaCells();
		var changedAreaIds = mutation.changedAreaIds;

		// Resolve Area again after new cells have been registered in the index.
		for (var changedIndex = 0; changedIndex < mutation.changedCells.length; changedIndex++)
		{
			var changedCell = mutation.changedCells[changedIndex];
			var changedId = this.foundation.index.getCellObjectId(changedCell);
			var changedAreaId = this.module.isArea(changedCell) ? changedId :
				this.foundation.index.findAreaId(changedId);

			if (changedAreaId != '')
			{
				changedAreaIds[changedAreaId] = true;
			}
		}

		// A newly-created Area is aligned with the project column before overlap
		// propagation. Its children retain the relative positions derived from
		// their initial absolute geometry.
		for (var newAreaId in changedAreaIds)
		{
			var newArea = this.store.data.areas[newAreaId];

			if (newArea != null &&
				!Object.prototype.hasOwnProperty.call(mutation.beforeSnapshot.areas, newAreaId))
			{
				newArea.x = DEFAULTS.projectLeft;
				newArea.y = DEFAULTS.projectTop;
			}
		}

		var manualDeviceMutation = mutation.reason == 'add-device-manual';

		if (manualDeviceMutation)
		{
			for (var manualIndex = 0; manualIndex < mutation.changedCells.length;
				manualIndex++)
			{
				var manualCell = mutation.changedCells[manualIndex];

				if (this.module.isDevice(manualCell))
				{
					var manualNode = this.store.data.nodes[
						this.foundation.index.getCellObjectId(manualCell)];

					if (manualNode != null)
					{
						manualNode.layoutMode = 'manual';
						manualNode.locked = false;
					}
				}
			}
		}

		for (var areaId in changedAreaIds)
		{
			if (this.store.data.areas[areaId] != null)
			{
				if (!manualDeviceMutation)
				{
					this.layoutAdaptiveArea(areaId);
					this.updateLineBounds(areaId);
				}

				this.updateAreaBounds(areaId);
			}
		}

		this.resolveProjectAreaOverlap();
		this.planBackboneConnections(areaCells);
		var afterSnapshot = this.captureAllLayouts();
		var beforeSnapshot = clone(mutation.beforeSnapshot);
		this.completeSnapshotPair(beforeSnapshot, afterSnapshot);

		var changedNodeIds = [];
		var changedContainerIds = [];
		var nodeIds = {};
		var areaIds = {};
		var id;

		for (id in beforeSnapshot.nodes) nodeIds[id] = true;
		for (id in afterSnapshot.nodes) nodeIds[id] = true;
		for (id in beforeSnapshot.areas) areaIds[id] = true;
		for (id in afterSnapshot.areas) areaIds[id] = true;

		for (id in nodeIds)
		{
			if (JSON.stringify(beforeSnapshot.nodes[id]) !=
				JSON.stringify(afterSnapshot.nodes[id]))
			{
				changedNodeIds.push(id);
			}
		}

		for (id in areaIds)
		{
			if (JSON.stringify(beforeSnapshot.areas[id]) !=
				JSON.stringify(afterSnapshot.areas[id]))
			{
				changedContainerIds.push(id);

				var members = this.foundation.index.getAreaMemberIds(id);
				for (var memberIndex = 0; memberIndex < members.length; memberIndex++)
				{
					if (changedNodeIds.indexOf(members[memberIndex]) < 0)
					{
						changedNodeIds.push(members[memberIndex]);
					}
				}
			}
		}

		var afterSelectionIds = mutation.pendingSelectionId != null ?
			[mutation.pendingSelectionId] : this.getSelectionObjectIds();
		this.store.applySnapshot(beforeSnapshot);
		this.restoreSelectionByIds(mutation.beforeSelectionIds);
		var primary = mutation.changedCells.length > 0 ?
			mutation.changedCells[mutation.changedCells.length - 1] : null;
		this.graph.getModel().execute(new KnxLayoutChange(this.foundation,
			beforeSnapshot, afterSnapshot, primary, afterSelectionIds,
			mutation.beforeSelectionIds));
		this.foundation.applyLayoutToCanvas(changedNodeIds,
			'topologyReconcile', true);

		for (var containerIndex = 0; containerIndex < changedContainerIds.length;
			containerIndex++)
		{
			this.applyAreaContainerToCanvas(changedContainerIds[containerIndex], true);
		}

		this.restoreSelectionByIds(afterSelectionIds);
	};

	KnxAreaLayoutEngine.prototype.rebaseAreaToCurrentContent = function(areaId)
	{
		areaId = this.getAreaId(areaId);
		var memberIds = this.foundation.index.getAreaMemberIds(areaId);
		var boundedIds = [];

		for (var i = 0; i < memberIds.length; i++)
		{
			var meta = this.foundation.index.metaByObjectId[memberIds[i]];

			if (meta != null && meta.type != 'junction')
			{
				boundedIds.push(memberIds[i]);
			}
		}

		var bounds = this.foundation.calculateBounds(boundedIds);
		this.store.data.areas[areaId] =
			this.foundation.createAreaLayoutFromBounds(areaId, bounds);

		for (var memberIndex = 0; memberIndex < memberIds.length; memberIndex++)
		{
			var member = this.foundation.index.getCell(memberIds[memberIndex]);

			if (member != null && member.geometry != null && !member.edge)
			{
				this.foundation.syncNodeFromGeometry(member, false, 'auto');
			}
		}
	};

	KnxAreaLayoutEngine.prototype.isAutoNode = function(node)
	{
		return node != null && node.layoutMode != 'manual' && !node.locked;
	};

	KnxAreaLayoutEngine.prototype.setAutoNodeGeometry = function(node, x, y,
		width, height)
	{
		if (!this.isAutoNode(node))
		{
			return false;
		}

		node.relativeX = x;
		node.relativeY = y;

		if (width != null)
		{
			node.width = width;
		}

		if (height != null)
		{
			node.height = height;
		}

		return true;
	};

	KnxAreaLayoutEngine.prototype.setJunctionCenter = function(junction, x, y)
	{
		if (junction == null)
		{
			return;
		}

		var junctionId = this.foundation.index.getCellObjectId(junction);
		var node = this.store.data.nodes[junctionId];

		if (node != null)
		{
			node.relativeX = x - node.width / 2;
			node.relativeY = y - node.height / 2;
			// Junctions are invisible routing projections and cannot be dragged by
			// the user. Legacy migration must not freeze them as Manual nodes.
			node.layoutMode = 'auto';
			node.locked = false;
		}
	};

	KnxAreaLayoutEngine.prototype.setManagedEdgeStyleValue = function(edge, key,
		value, recordUndo)
	{
		var style = mxUtils.setStyle(edge.style || '', key, value);

		if (style == edge.style)
		{
			return;
		}

		if (recordUndo !== false)
		{
			this.graph.getModel().setStyle(edge, style);
		}
		else
		{
			this.graph.getModel().styleForCellChanged(edge, style);
			this.graph.view.invalidate(edge);
		}
	};

	KnxAreaLayoutEngine.prototype.normalizeManagedTopologyEdge = function(edge,
		recordUndo)
	{
		if (edge == null || !edge.edge || mxUtils.getValue(
			this.graph.getCellStyle(edge), 'knxTopologyEdge', '0') != '1')
		{
			return false;
		}

		var relationKey = mxUtils.getValue(this.graph.getCellStyle(edge),
			'knxRelationKey', '');
		var duplicateAreaOutput = relationKey.indexOf('topology-') == 0 &&
			this.module.isCoupler(edge.source) &&
			this.module.getAttribute(edge.source, 'couplerType') == 'area' &&
			this.module.isMainLine(edge.target);

		this.setManagedEdgeStyleValue(edge, 'edgeStyle',
			'orthogonalEdgeStyle', recordUndo);
		this.setManagedEdgeStyleValue(edge, 'rounded', '0', recordUndo);
		this.setManagedEdgeStyleValue(edge, 'startArrow', 'none', recordUndo);
		this.setManagedEdgeStyleValue(edge, 'endArrow', 'none', recordUndo);
		this.setManagedEdgeStyleValue(edge, 'strokeColor', '#00b96b', recordUndo);
		this.setManagedEdgeStyleValue(edge, 'strokeWidth',
			String(KnxTopologyModule.BUS_WIDTH), recordUndo);
		this.setManagedEdgeStyleValue(edge, 'wireMode', '1', recordUndo);
		this.setManagedEdgeStyleValue(edge, 'strokeOpacity',
			duplicateAreaOutput ? '0' : '100', recordUndo);
		this.setManagedEdgeStyleValue(edge, 'pointerEvents',
			duplicateAreaOutput ? '0' : '1', recordUndo);

		if (edge.geometry != null && edge.geometry.points != null &&
			edge.geometry.points.length > 0)
		{
			var geometry = edge.geometry.clone();
			geometry.points = null;

			if (recordUndo !== false)
			{
				this.graph.getModel().setGeometry(edge, geometry);
			}
			else
			{
				this.graph.getModel().geometryForCellChanged(edge, geometry);
				this.graph.view.invalidate(edge);
			}
		}

		return true;
	};

	KnxAreaLayoutEngine.prototype.getSortedDevices = function(line)
	{
		var devices = this.foundation.index.getChildrenCells(
			this.foundation.index.getCellObjectId(line), 'device').slice();
		devices.sort(this.module.compareDeviceCells.bind(this.module));

		return devices;
	};

	KnxAreaLayoutEngine.prototype.getLineTileMetrics = function(line)
	{
		var devices = this.getSortedDevices(line);
		var coupler = this.module.getCoupler(line, 'line');
		var couplerNode = coupler != null ? this.store.data.nodes[
			this.foundation.index.getCellObjectId(coupler)] : null;
		var cardWidth = DEFAULTS.deviceCardWidth;
		var cardHeight = DEFAULTS.deviceCardHeight;

		for (var i = 0; i < devices.length; i++)
		{
			var node = this.store.data.nodes[
				this.foundation.index.getCellObjectId(devices[i])];

			if (node != null && !this.isAutoNode(node))
			{
				cardWidth = Math.max(cardWidth, node.width);
				cardHeight = Math.max(cardHeight, node.height);
			}
		}

		var metrics = measureLineTile(devices.length, cardWidth, cardHeight,
			couplerNode != null && !this.isAutoNode(couplerNode) ?
				couplerNode.height : DEFAULTS.couplerHeight, DEFAULTS);
		metrics.cardWidth = cardWidth;
		metrics.cardHeight = cardHeight;
		metrics.devices = devices;

		return metrics;
	};

	KnxAreaLayoutEngine.prototype.layoutAdaptiveDevices = function(line, lineNode,
		metrics)
	{
		var occupied = [];
		var autoDevices = [];
		var autoPlacements = [];
		var devices = metrics.devices;
		var maxBottom = lineNode.relativeY + lineNode.height;
		var maxRight = lineNode.relativeX + lineNode.width;
		var maxBusRight = lineNode.relativeX + DEFAULTS.emptyLineBusWidth;

		for (var i = 0; i < devices.length; i++)
		{
			var deviceId = this.foundation.index.getCellObjectId(devices[i]);
			var deviceNode = this.store.data.nodes[deviceId];

			if (deviceNode == null)
			{
				continue;
			}

			if (this.isAutoNode(deviceNode))
			{
				autoDevices.push({cell: devices[i], node: deviceNode});
			}
			else
			{
				occupied.push({x: deviceNode.relativeX, y: deviceNode.relativeY,
					width: deviceNode.width, height: deviceNode.height});
				maxBottom = Math.max(maxBottom,
					deviceNode.relativeY + deviceNode.height + DEFAULTS.lineBottomPadding);
				maxRight = Math.max(maxRight,
					deviceNode.relativeX + deviceNode.width + DEFAULTS.lineBottomPadding);
				maxBusRight = Math.max(maxBusRight,
					deviceNode.relativeX + deviceNode.width / 2);
				var manualJunction = this.module.getJunction(line, 'device-' +
					this.module.getAttribute(devices[i], 'topologyId'));
				this.setJunctionCenter(manualJunction,
					deviceNode.relativeX + deviceNode.width / 2,
					lineNode.relativeY + lineNode.height / 2);
				this.updateDeviceInputRouting(line, devices[i]);
			}
		}

		var originX = lineNode.relativeX + DEFAULTS.lineDeviceOffsetX;
		var originY = lineNode.relativeY + DEFAULTS.lineDeviceOffsetY;
		var slotIndex = 0;

		for (var autoIndex = 0; autoIndex < autoDevices.length; autoIndex++)
		{
			var slot = null;
			var attempts = 0;

			do
			{
				slot = calculateDeviceSlot(slotIndex++, metrics.maxPerColumn,
					originX, originY, metrics.cardWidth, metrics.cardHeight,
					DEFAULTS.deviceGapX, DEFAULTS.deviceGapY,
					metrics.maxColumns, DEFAULTS.deviceBankGapY);
				attempts++;
			}
			while (occupied.some(function(bounds)
			{
				return rectanglesIntersect(bounds, slot);
			}) && attempts < 1000);

			var autoDevice = autoDevices[autoIndex];
			this.setAutoNodeGeometry(autoDevice.node, slot.x, slot.y,
				metrics.cardWidth, metrics.cardHeight);
			occupied.push({x: autoDevice.node.relativeX, y: autoDevice.node.relativeY,
				width: autoDevice.node.width, height: autoDevice.node.height});
			maxBottom = Math.max(maxBottom,
				autoDevice.node.relativeY + autoDevice.node.height +
				DEFAULTS.lineBottomPadding);
			maxRight = Math.max(maxRight,
				autoDevice.node.relativeX + autoDevice.node.width +
				DEFAULTS.lineBottomPadding);
			maxBusRight = Math.max(maxBusRight,
				autoDevice.node.relativeX + autoDevice.node.width / 2);

			autoPlacements.push({cell: autoDevice.cell, node: autoDevice.node,
				slot: slot});
		}

		var previousByColumn = {};

		for (var placementIndex = 0; placementIndex < autoPlacements.length;
			placementIndex++)
		{
			var placement = autoPlacements[placementIndex];
			var previousDevice = previousByColumn[placement.slot.column] || null;
			var junction = this.module.getJunction(line, 'device-' +
				this.module.getAttribute(placement.cell, 'topologyId'));

			if (previousDevice == null)
			{
				this.setJunctionCenter(junction,
					placement.node.relativeX + placement.node.width / 2,
					lineNode.relativeY + lineNode.height / 2);
			}

			this.updateDeviceInputRouting(line, placement.cell, null,
				previousDevice);
			previousByColumn[placement.slot.column] = placement.cell;
		}

		return {maxBottom: maxBottom, maxRight: maxRight,
			maxBusRight: maxBusRight};
	};

	KnxAreaLayoutEngine.prototype.updateLineInputRouting = function(mainLine, line,
		coupler, wrapped, recordUndo)
	{
		if (mainLine == null || line == null || coupler == null)
		{
			return;
		}

		var relationKey = 'line-input-' +
			this.module.getAttribute(mainLine, 'topologyId') + '-' +
			this.module.getAttribute(coupler, 'topologyId');
		var edges = this.graph.getEdges(coupler);

		for (var edgeIndex = 0; edgeIndex < edges.length; edgeIndex++)
		{
			var style = this.graph.getCellStyle(edges[edgeIndex]);

			if (mxUtils.getValue(style, 'knxRelationKey', '') == relationKey)
			{
				this.normalizeManagedTopologyEdge(edges[edgeIndex], recordUndo);
				// A wrapped Line approaches the Coupler from its left edge. Combined
				// with the gutter source junction, this keeps the long vertical
				// feeder out of the Line tile above. First-row Lines keep the direct
				// drop into the top of their Coupler.
				this.setManagedEdgeStyleValue(edges[edgeIndex], 'entryX',
					wrapped ? '0' : '0.5', recordUndo);
				this.setManagedEdgeStyleValue(edges[edgeIndex], 'entryY',
					wrapped ? '0.5' : '0', recordUndo);
				break;
			}
		}
	};

	KnxAreaLayoutEngine.prototype.updateLineOutputRouting = function(coupler, line,
		recordUndo)
	{
		if (coupler == null || line == null)
		{
			return;
		}

		var relationKey = 'line-output-' +
			this.module.getAttribute(coupler, 'topologyId') + '-' +
			this.module.getAttribute(line, 'topologyId');
		var edges = this.graph.getEdges(coupler);

		for (var edgeIndex = 0; edgeIndex < edges.length; edgeIndex++)
		{
			if (mxUtils.getValue(this.graph.getCellStyle(edges[edgeIndex]),
				'knxRelationKey', '') == relationKey)
			{
				this.normalizeManagedTopologyEdge(edges[edgeIndex], recordUndo);
				this.setManagedEdgeStyleValue(edges[edgeIndex], 'exitX', '1', recordUndo);
				this.setManagedEdgeStyleValue(edges[edgeIndex], 'exitY', '0.5', recordUndo);
				this.setManagedEdgeStyleValue(edges[edgeIndex], 'entryX', '0', recordUndo);
				this.setManagedEdgeStyleValue(edges[edgeIndex], 'entryY', '0.5', recordUndo);
				break;
			}
		}
	};

	KnxAreaLayoutEngine.prototype.updateDeviceInputRouting = function(line, device,
		recordUndo, previousDevice)
	{
		if (line == null || device == null)
		{
			return;
		}

		var relationKey = 'device-' +
			this.module.getAttribute(line, 'topologyId') + '-' +
			this.module.getAttribute(device, 'topologyId');
		var edges = this.graph.getEdges(device);

		for (var edgeIndex = 0; edgeIndex < edges.length; edgeIndex++)
		{
			if (mxUtils.getValue(this.graph.getCellStyle(edges[edgeIndex]),
				'knxRelationKey', '') == relationKey)
			{
				this.normalizeManagedTopologyEdge(edges[edgeIndex], recordUndo);
				var source = previousDevice;

				if (source == null)
				{
					source = this.module.getJunction(line, 'device-' +
						this.module.getAttribute(device, 'topologyId'));
				}

				if (source != null && edges[edgeIndex].source != source)
				{
					if (recordUndo !== false)
					{
						this.graph.getModel().setTerminal(edges[edgeIndex], source, true);
					}
					else
					{
						this.graph.getModel().terminalForCellChanged(edges[edgeIndex],
							source, true);
					}
				}

				this.setManagedEdgeStyleValue(edges[edgeIndex], 'exitX', '0.5', recordUndo);
				this.setManagedEdgeStyleValue(edges[edgeIndex], 'exitY',
					previousDevice != null ? '1' : '0.5', recordUndo);
				this.setManagedEdgeStyleValue(edges[edgeIndex], 'entryX', '0.5', recordUndo);
				this.setManagedEdgeStyleValue(edges[edgeIndex], 'entryY', '0', recordUndo);
				break;
			}
		}
	};

	KnxAreaLayoutEngine.prototype.repairTopologyRouting = function(recordUndo)
	{
		var areaCells = this.getAreaCells();
		var normalizedEdges = [];
		var junctionIds = [];
		var engine = this;

		var rememberJunction = function(junction)
		{
			if (junction != null)
			{
				var junctionId = engine.foundation.index.getCellObjectId(junction);

				if (junctionId != '' && junctionIds.indexOf(junctionId) < 0)
				{
					junctionIds.push(junctionId);
				}
			}
		};

		var normalizeAdjacentEdges = function(cell)
		{
			var edges = cell != null ? engine.graph.getEdges(cell) : [];

			for (var edgeIndex = 0; edgeIndex < edges.length; edgeIndex++)
			{
				if (normalizedEdges.indexOf(edges[edgeIndex]) < 0 &&
					engine.normalizeManagedTopologyEdge(edges[edgeIndex], recordUndo))
				{
					normalizedEdges.push(edges[edgeIndex]);
				}
			}
		};

		for (var areaIndex = 0; areaIndex < areaCells.length; areaIndex++)
		{
			var areaId = this.getAreaId(areaCells[areaIndex]);
			var lines = this.foundation.index.getChildrenCells(areaId, 'line').slice();
			lines.sort(this.module.compareLineCells.bind(this.module));
			var mainLine = null;
			var secondary = [];

			for (var lineIndex = 0; lineIndex < lines.length; lineIndex++)
			{
				if (this.module.isMainLine(lines[lineIndex]))
				{
					mainLine = lines[lineIndex];
				}
				else
				{
					secondary.push(lines[lineIndex]);
				}
			}

			var areaCoupler = this.module.getCoupler(areaCells[areaIndex], 'area');
			normalizeAdjacentEdges(areaCoupler);

			if (mainLine == null)
			{
				continue;
			}

			var mainId = this.foundation.index.getCellObjectId(mainLine);
			var mainNode = this.store.data.nodes[mainId];
			var mainStart = this.module.getJunction(mainLine, 'start');

			if (mainNode != null)
			{
				this.setJunctionCenter(mainStart, mainNode.relativeX,
					mainNode.relativeY + mainNode.height / 2);
				rememberJunction(mainStart);
			}

			var firstCouplerY = Infinity;

			for (var secondaryIndex = 0; secondaryIndex < secondary.length;
				secondaryIndex++)
			{
				var firstCoupler = this.module.getCoupler(secondary[secondaryIndex], 'line');
				var firstCouplerNode = firstCoupler != null ? this.store.data.nodes[
					this.foundation.index.getCellObjectId(firstCoupler)] : null;

				if (firstCouplerNode != null)
				{
					firstCouplerY = Math.min(firstCouplerY, firstCouplerNode.relativeY);
				}
			}

			for (var branchIndex = 0; branchIndex < secondary.length; branchIndex++)
			{
				var line = secondary[branchIndex];
				var lineId = this.foundation.index.getCellObjectId(line);
				var lineNode = this.store.data.nodes[lineId];
				var coupler = this.module.getCoupler(line, 'line');
				var couplerNode = coupler != null ? this.store.data.nodes[
					this.foundation.index.getCellObjectId(coupler)] : null;
				var lineLayout = this.store.data.lines[lineId] || {};

				if (lineNode == null || couplerNode == null || mainNode == null)
				{
					continue;
				}

				// row is persisted for new layouts. Legacy layouts use geometry only
				// to choose a visual route; the KNX parent still comes from metadata.
				var wrapped = lineLayout.row != null ? lineLayout.row > 0 :
					(firstCouplerY != Infinity && couplerNode.relativeY > firstCouplerY + 30);
				var gutterRouted = lineLayout.feederRouting == 'column-gutter' ||
					wrapped;
				var horizontal = lineLayout.busDirection == 'horizontal';
				var busX = lineNode.relativeX + lineNode.width / 2;
				var busY = lineNode.relativeY + lineNode.height / 2;
				var feederX = lineLayout.feederX != null ? lineLayout.feederX :
					(gutterRouted ? couplerNode.relativeX -
					DEFAULTS.wrappedFeederGutter : couplerNode.relativeX +
					couplerNode.width / 2);
				var mainTap = this.module.getJunction(mainLine, 'line-' +
					this.module.getAttribute(line, 'topologyId'));
				var branchStart = this.module.getJunction(line, 'start');

				this.setJunctionCenter(mainTap, feederX,
					mainNode.relativeY + mainNode.height / 2);
				this.setJunctionCenter(branchStart,
					horizontal ? lineNode.relativeX : busX,
					horizontal ? busY : lineNode.relativeY);
				rememberJunction(mainTap);
				rememberJunction(branchStart);
				this.updateLineInputRouting(mainLine, line, coupler, gutterRouted,
					recordUndo);

				if (horizontal)
				{
					this.updateLineOutputRouting(coupler, line, recordUndo);
				}

				normalizeAdjacentEdges(coupler);

				var devices = this.foundation.index.getChildrenCells(lineId, 'device').slice();
				devices.sort(this.module.compareDeviceCells.bind(this.module));
				var maxPerColumn = lineLayout.maxDevicesPerColumn ||
					DEFAULTS.maxDevicesPerColumn;
				var maxDeviceColumns = lineLayout.maxDeviceColumns ||
					DEFAULTS.maxDeviceColumns;
				var previousByColumn = {};
				for (var deviceIndex = 0; deviceIndex < devices.length; deviceIndex++)
				{
					if (horizontal)
					{
						var deviceId = this.foundation.index.getCellObjectId(
							devices[deviceIndex]);
						var deviceNode = this.store.data.nodes[deviceId];
						var deviceJunction = this.module.getJunction(line, 'device-' +
							this.module.getAttribute(devices[deviceIndex], 'topologyId'));

						if (deviceNode != null)
						{
							var routingSlot = calculateDeviceSlot(deviceIndex,
								maxPerColumn, 0, 0, 1, 1, 0, 0,
								maxDeviceColumns, 0);
							var previousDevice = previousByColumn[routingSlot.column] || null;
							var previousNode = previousDevice != null ? this.store.data.nodes[
								this.foundation.index.getCellObjectId(previousDevice)] : null;

							if (!this.isAutoNode(deviceNode) ||
								(previousNode != null && !this.isAutoNode(previousNode)))
							{
								previousDevice = null;
							}

							if (previousDevice == null)
							{
								this.setJunctionCenter(deviceJunction,
									deviceNode.relativeX + deviceNode.width / 2, busY);
								rememberJunction(deviceJunction);
							}

							this.updateDeviceInputRouting(line, devices[deviceIndex],
								recordUndo, previousDevice);

							if (this.isAutoNode(deviceNode))
							{
								previousByColumn[routingSlot.column] = devices[deviceIndex];
							}
						}
					}

					normalizeAdjacentEdges(devices[deviceIndex]);
				}
			}

			var mainDevices = this.foundation.index.getChildrenCells(mainId, 'device').slice();
			mainDevices.sort(this.module.compareDeviceCells.bind(this.module));
			var previousMainByColumn = {};
			for (var mainDeviceIndex = 0; mainDeviceIndex < mainDevices.length;
				mainDeviceIndex++)
			{
				var mainDevice = mainDevices[mainDeviceIndex];
				var mainDeviceNode = this.store.data.nodes[
					this.foundation.index.getCellObjectId(mainDevice)];
				var mainSlot = calculateDeviceSlot(mainDeviceIndex,
					DEFAULTS.maxDevicesPerColumn, 0, 0, 1, 1, 0, 0,
					DEFAULTS.maxDeviceColumns, 0);
				var previousMainDevice = previousMainByColumn[mainSlot.column] || null;

				if (mainDeviceNode != null)
				{
					if (!this.isAutoNode(mainDeviceNode) ||
						(previousMainDevice != null && !this.isAutoNode(this.store.data.nodes[
							this.foundation.index.getCellObjectId(previousMainDevice)])))
					{
						previousMainDevice = null;
					}

					var mainDeviceJunction = this.module.getJunction(mainLine, 'device-' +
						this.module.getAttribute(mainDevice, 'topologyId'));

					if (previousMainDevice == null)
					{
						this.setJunctionCenter(mainDeviceJunction,
							mainDeviceNode.relativeX + mainDeviceNode.width / 2,
							mainNode.relativeY + mainNode.height / 2);
						rememberJunction(mainDeviceJunction);
					}

					this.updateDeviceInputRouting(mainLine, mainDevice,
						recordUndo, previousMainDevice);

					if (this.isAutoNode(mainDeviceNode))
					{
						previousMainByColumn[mainSlot.column] = mainDevice;
					}
				}

				normalizeAdjacentEdges(mainDevices[mainDeviceIndex]);
			}
		}

		if (junctionIds.length > 0)
		{
			this.foundation.applyLayoutToCanvas(junctionIds,
				recordUndo === false ? 'load' : 'topologyReconcile', recordUndo !== false);
		}

		this.graph.view.validate();
		return {edges: normalizedEdges.length, junctions: junctionIds.length};
	};

	KnxAreaLayoutEngine.prototype.layoutAdaptiveArea = function(areaId)
	{
		areaId = this.getAreaId(areaId);
		var area = this.store.data.areas[areaId];
		var areaCell = this.foundation.index.getCell(areaId);

		if (area == null || areaCell == null)
		{
			return null;
		}

		var lines = this.foundation.index.getChildrenCells(areaId, 'line').slice();
		lines.sort(this.module.compareLineCells.bind(this.module));
		var mainLine = null;
		var secondary = [];

		for (var lineIndex = 0; lineIndex < lines.length; lineIndex++)
		{
			if (this.module.isMainLine(lines[lineIndex]))
			{
				mainLine = lines[lineIndex];
			}
			else
			{
				secondary.push(lines[lineIndex]);
			}
		}

		if (mainLine == null)
		{
			return null;
		}

		var mainId = this.foundation.index.getCellObjectId(mainLine);
		var mainNode = this.store.data.nodes[mainId];
		var areaCoupler = this.module.getCoupler(areaCell, 'area');
		var areaCouplerNode = areaCoupler != null ? this.store.data.nodes[
			this.foundation.index.getCellObjectId(areaCoupler)] : null;
		var mainY = area.headerHeight + area.paddingTop + 55;
		var mainStartX = area.paddingLeft +
			(areaCouplerNode != null ? areaCouplerNode.width : 190);

		if (areaCouplerNode != null)
		{
			this.setAutoNodeGeometry(areaCouplerNode, area.paddingLeft,
				mainY - DEFAULTS.couplerHeight / 2,
				DEFAULTS.couplerWidth, DEFAULTS.couplerHeight);
		}

		this.setAutoNodeGeometry(mainNode, mainStartX, mainY - 2,
			Math.max(520, mainNode != null ? mainNode.width : 520), 4);
		this.setJunctionCenter(this.module.getJunction(mainLine, 'start'),
			mainStartX, mainY);

		var mainDeviceMetrics = this.getLineTileMetrics(mainLine);
		var mainDeviceBounds = this.layoutAdaptiveDevices(mainLine, mainNode,
			mainDeviceMetrics);
		var metrics = secondary.map(this.getLineTileMetrics.bind(this));
		var config = clone(DEFAULTS);
		config.paddingRight = area.paddingRight;
		var gridTop = Math.max(mainY + DEFAULTS.gridTopGap,
			mainDeviceBounds.maxBottom + DEFAULTS.lineGapY);
		var gridStartX = mainStartX + DEFAULTS.lineGridInset;
		var packed = packLineTiles(metrics, gridStartX, gridTop, config);
		var usedRight = Math.max(mainStartX + 520, mainDeviceBounds.maxRight);

		for (var secondaryIndex = 0; secondaryIndex < secondary.length;
			secondaryIndex++)
		{
			var line = secondary[secondaryIndex];
			var lineId = this.foundation.index.getCellObjectId(line);
			var lineNode = this.store.data.nodes[lineId];
			var coupler = this.module.getCoupler(line, 'line');
			var couplerNode = coupler != null ? this.store.data.nodes[
				this.foundation.index.getCellObjectId(coupler)] : null;
			var tile = packed.placements[secondaryIndex];
			var couplerWidth = couplerNode != null ? couplerNode.width :
				DEFAULTS.couplerWidth;
			var couplerHeight = couplerNode != null && !this.isAutoNode(couplerNode) ?
				couplerNode.height : DEFAULTS.couplerHeight;
			var couplerCenterX = tile.x + couplerWidth / 2;
			var feederX = calculateLineFeederX(tile, couplerCenterX, DEFAULTS);
			var busX = tile.x + couplerWidth;
			var busY = tile.y + couplerHeight / 2;
			var initialBusWidth = Math.max(DEFAULTS.emptyLineBusWidth,
				tile.width - couplerWidth);

			if (couplerNode != null)
			{
				this.setAutoNodeGeometry(couplerNode, tile.x, tile.y,
					DEFAULTS.couplerWidth, DEFAULTS.couplerHeight);
			}

			this.setAutoNodeGeometry(lineNode, busX, busY - 2,
				initialBusWidth, 4);

			if (lineNode != null)
			{
				if (this.isAutoNode(lineNode))
				{
					this.module.configureBusWire(line, '#00b96b', true);
				}

				var deviceBounds = this.layoutAdaptiveDevices(line, lineNode,
					metrics[secondaryIndex]);

				if (this.isAutoNode(lineNode))
				{
					lineNode.width = Math.max(DEFAULTS.emptyLineBusWidth,
						deviceBounds.maxBusRight - lineNode.relativeX);
					lineNode.height = 4;
				}

				usedRight = Math.max(usedRight, deviceBounds.maxRight,
					tile.x + tile.width);
				this.setJunctionCenter(this.module.getJunction(line, 'start'),
					lineNode.relativeX,
					lineNode.relativeY + lineNode.height / 2);
				this.updateLineOutputRouting(coupler, line);

				if (mainNode != null)
				{
					this.setJunctionCenter(this.module.getJunction(mainLine,
						'line-' + this.module.getAttribute(line, 'topologyId')),
						feederX,
						mainNode.relativeY + mainNode.height / 2);
					this.updateLineInputRouting(mainLine, line, coupler, true);
				}
			}

			var lineLayout = this.store.data.lines[lineId] || {};
			lineLayout.lineId = lineId;
			lineLayout.layoutDirection = 'grid';
			lineLayout.busDirection = 'horizontal';
			lineLayout.deviceGridVersion = DEVICE_GRID_VERSION;
			lineLayout.row = tile.row;
			lineLayout.column = tile.column;
			lineLayout.feederX = feederX;
			lineLayout.feederRouting = 'column-gutter';
			lineLayout.deviceColumns = metrics[secondaryIndex].columns;
			lineLayout.maxDevicesPerColumn = metrics[secondaryIndex].maxPerColumn;
			lineLayout.maxDeviceColumns = metrics[secondaryIndex].maxColumns;
			lineLayout.deviceBanks = metrics[secondaryIndex].banks;
			lineLayout.deviceGapX = DEFAULTS.deviceGapX;
			lineLayout.deviceGapY = DEFAULTS.deviceGapY;
			this.store.data.lines[lineId] = lineLayout;
		}

		if (mainNode != null && this.isAutoNode(mainNode))
		{
			mainNode.width = Math.max(520,
				Math.min(DEFAULTS.maxAreaWidth - mainNode.relativeX - area.paddingRight,
					usedRight - mainNode.relativeX));
			mainNode.height = 4;
		}

		return packed;
	};

	KnxAreaLayoutEngine.prototype.updateLineBounds = function(areaId)
	{
		areaId = this.getAreaId(areaId);
		var areaCell = this.foundation.index.getCell(areaId);
		var lines = this.foundation.index.getChildrenCells(areaId, 'line');
		var mainLine = null;

		for (var i = 0; i < lines.length; i++)
		{
			if (this.module.isMainLine(lines[i]))
			{
				mainLine = lines[i];
				break;
			}
		}

		if (mainLine == null || areaCell == null)
		{
			return;
		}

		var memberIds = this.foundation.index.getAreaMemberIds(areaId);
		var mainId = this.foundation.index.getCellObjectId(mainLine);
		var mainNode = this.store.data.nodes[mainId];
		var maxRight = mainNode != null ? mainNode.relativeX + 520 : 0;

		for (var memberIndex = 0; memberIndex < memberIds.length; memberIndex++)
		{
			var meta = this.foundation.index.metaByObjectId[memberIds[memberIndex]];
			var node = this.store.data.nodes[memberIds[memberIndex]];

			if (meta != null && node != null && meta.type != 'junction' &&
				memberIds[memberIndex] != mainId)
			{
				maxRight = Math.max(maxRight, node.relativeX + node.width + 50);
			}
		}

		if (mainNode != null)
		{
			mainNode.width = Math.max(520, maxRight - mainNode.relativeX);
			mainNode.height = 4;
		}

		for (var lineIndex = 0; lineIndex < lines.length; lineIndex++)
		{
			if (lines[lineIndex] == mainLine)
			{
				continue;
			}

			var lineId = this.foundation.index.getCellObjectId(lines[lineIndex]);
			var lineNode = this.store.data.nodes[lineId];
			var devices = this.foundation.index.getChildrenCells(lineId, 'device');
			var lineLayout = this.store.data.lines[lineId] || {};
			var horizontal = lineLayout.busDirection == 'horizontal';
			var maxBottom = lineNode != null ? lineNode.relativeY +
				DEFAULTS.emptyLineBusHeight : 0;
			var maxBusRight = lineNode != null ? lineNode.relativeX +
				DEFAULTS.emptyLineBusWidth : 0;

			for (var deviceIndex = 0; deviceIndex < devices.length; deviceIndex++)
			{
				var deviceId = this.foundation.index.getCellObjectId(devices[deviceIndex]);
				var deviceNode = this.store.data.nodes[deviceId];

				if (deviceNode != null)
				{
					maxBottom = Math.max(maxBottom,
						deviceNode.relativeY + deviceNode.height + 35);
					maxBusRight = Math.max(maxBusRight,
						deviceNode.relativeX + deviceNode.width / 2);
				}
			}

			if (lineNode != null && this.isAutoNode(lineNode))
			{
				if (horizontal)
				{
					lineNode.width = Math.max(DEFAULTS.emptyLineBusWidth,
						maxBusRight - lineNode.relativeX);
					lineNode.height = 4;
				}
				else
				{
					lineNode.width = 4;
					lineNode.height = Math.max(DEFAULTS.emptyLineBusHeight,
						maxBottom - lineNode.relativeY);
				}
			}
		}
	};

	KnxAreaLayoutEngine.prototype.getProjectObjectIds = function(areaIds)
	{
		var ids = [];
		var seen = {};
		var backboneCells = this.foundation.index.getCellsByType('backbone');
		var backbone = backboneCells.length > 0 ? backboneCells[0] : null;

		for (var i = 0; i < areaIds.length; i++)
		{
			var members = this.foundation.index.getAreaMemberIds(areaIds[i]);

			for (var j = 0; j < members.length; j++)
			{
				if (!seen[members[j]] && this.store.data.nodes[members[j]] != null)
				{
					seen[members[j]] = true;
					ids.push(members[j]);
				}
			}
		}

		if (backbone != null)
		{
			var backboneId = this.foundation.index.getCellObjectId(backbone);
			var backboneMembers = [backboneId].concat(
				this.foundation.index.getChildrenCells(backboneId, 'junction').map(
					this.foundation.index.getCellObjectId.bind(this.foundation.index)));

			for (var memberIndex = 0; memberIndex < backboneMembers.length; memberIndex++)
			{
				if (!seen[backboneMembers[memberIndex]] &&
					this.store.data.nodes[backboneMembers[memberIndex]] != null)
				{
					seen[backboneMembers[memberIndex]] = true;
					ids.push(backboneMembers[memberIndex]);
				}
			}
		}

		return ids;
	};

	KnxAreaLayoutEngine.prototype.planBackboneConnections = function(areaCells)
	{
		var backboneCells = this.foundation.index.getCellsByType('backbone');
		var backbone = backboneCells.length > 0 ? backboneCells[0] : null;

		if (backbone == null)
		{
			return;
		}

		var backboneId = this.foundation.index.getCellObjectId(backbone);
		var backboneNode = this.store.data.nodes[backboneId];

		if (backboneNode == null)
		{
			return;
		}

		var backboneX = backboneNode.relativeX + backboneNode.width / 2;
		var minY = Infinity;
		var maxY = -Infinity;

		for (var i = 0; i < areaCells.length; i++)
		{
			var areaId = this.getAreaId(areaCells[i]);
			var area = this.store.data.areas[areaId];
			var coupler = this.module.getCoupler(areaCells[i], 'area');

			if (area == null || coupler == null)
			{
				continue;
			}

			var couplerId = this.foundation.index.getCellObjectId(coupler);
			var couplerNode = this.store.data.nodes[couplerId];
			var junction = this.module.getJunction(backbone,
				'area-' + this.module.getAttribute(areaCells[i], 'topologyId'));

			if (couplerNode != null && junction != null)
			{
				var centerY = area.y + couplerNode.relativeY + couplerNode.height / 2;
				var junctionId = this.foundation.index.getCellObjectId(junction);
				var junctionNode = this.store.data.nodes[junctionId];

				if (junctionNode != null)
				{
					junctionNode.relativeX = backboneX - junctionNode.width / 2;
					junctionNode.relativeY = centerY - junctionNode.height / 2;
				}

				minY = Math.min(minY, centerY);
				maxY = Math.max(maxY, centerY);
			}
		}

		if (minY != Infinity)
		{
			backboneNode.relativeY = Math.min(40, minY - 80);
			backboneNode.height = Math.max(500, maxY - backboneNode.relativeY + 80);
			backboneNode.width = 4;
		}
	};

	KnxAreaLayoutEngine.prototype.layoutProjectAreas = function()
	{
		var engine = this;
		var areaCells = this.getAreaCells();
		var areaIds = areaCells.map(this.getAreaId.bind(this));
		var objectIds = this.getProjectObjectIds(areaIds);
		var before = this.store.capture(objectIds, areaIds);

		for (var i = 0; i < areaIds.length; i++)
		{
			this.updateLineBounds(areaIds[i]);
			this.updateAreaBounds(areaIds[i]);
		}

		var orderedLayouts = areaIds.map(function(areaId)
		{
			return engine.store.data.areas[areaId];
		});
		var placements = resolveVerticalAreaPlacement(orderedLayouts,
			DEFAULTS.projectLeft, DEFAULTS.projectTop, DEFAULTS.areaGap);

		for (var placementIndex = 0; placementIndex < placements.length; placementIndex++)
		{
			var area = this.store.data.areas[placements[placementIndex].areaId];
			area.x = placements[placementIndex].x;
			area.y = placements[placementIndex].y;
		}

		this.planBackboneConnections(areaCells);
		var after = this.store.capture(objectIds, areaIds);
		this.store.applySnapshot(before);
		var selected = this.graph.getSelectionCells().slice();
		this.foundation.runWithSource('areaLayout', function()
		{
			var model = engine.graph.getModel();
			model.beginUpdate();

			try
			{
				model.execute(new KnxLayoutChange(engine.foundation, before, after,
					areaCells.length > 0 ? areaCells[0] : null));
				engine.foundation.applyLayoutToCanvas(objectIds, 'areaLayout', true);

				for (var areaIndex = 0; areaIndex < areaIds.length; areaIndex++)
				{
					engine.applyAreaContainerToCanvas(areaIds[areaIndex], true);
				}
			}
			finally
			{
				model.endUpdate();
			}
		});

		this.graph.setSelectionCells(selected);
		this.graph.view.validate();
		this.graph.sizeDidChange();

		return placements;
	};

	KnxAreaLayoutEngine.prototype.placeNewAreaWithoutOverlap = function(areaId)
	{
		areaId = this.getAreaId(areaId);
		var areas = this.getAreaCells();
		var target = this.store.data.areas[areaId];

		if (target == null || areas.length <= 1)
		{
			return;
		}

		var previousBottom = DEFAULTS.projectTop;

		for (var i = 0; i < areas.length; i++)
		{
			var id = this.getAreaId(areas[i]);

			if (id == areaId)
			{
				break;
			}

			var area = this.store.data.areas[id];

			if (area != null)
			{
				previousBottom = Math.max(previousBottom, area.y + area.height + DEFAULTS.areaGap);
			}
		}

		var dx = DEFAULTS.projectLeft - target.x;
		var dy = previousBottom - target.y;
		this.foundation.moveAreaAsGroup(areaId, dx, dy);
	};

	KnxAreaLayoutEngine.prototype.getProjectBounds = function()
	{
		var items = [];
		var areas = this.getAreaCells();

		for (var i = 0; i < areas.length; i++)
		{
			var layout = this.store.data.areas[this.getAreaId(areas[i])];

			if (layout != null)
			{
				items.push(layout);
			}
		}

		var backbones = this.foundation.index.getCellsByType('backbone');

		if (backbones.length > 0 && backbones[0].geometry != null)
		{
			items.push(backbones[0].geometry);
		}

		return unionBounds(items);
	};

	KnxAreaLayoutEngine.prototype.fitBounds = function(bounds)
	{
		if (bounds != null && bounds.width > 0 && bounds.height > 0)
		{
			this.graph.fitWindow(new mxRectangle(bounds.x, bounds.y,
				bounds.width, bounds.height), DEFAULTS.projectPadding);
		}
	};

	KnxAreaLayoutEngine.prototype.fitProject = function()
	{
		this.fitBounds(this.getProjectBounds());
	};

	KnxAreaLayoutEngine.prototype.fitArea = function(areaId)
	{
		areaId = this.getAreaId(areaId);
		this.fitBounds(this.store.data.areas[areaId]);
	};

	KnxAreaLayoutEngine.prototype.fitSelection = function(cells)
	{
		var items = [];

		for (var i = 0; cells != null && i < cells.length; i++)
		{
			if (cells[i] != null && !cells[i].edge && cells[i].geometry != null)
			{
				items.push(cells[i].geometry);
			}
		}

		this.fitBounds(unionBounds(items));
	};

	root.KnxAreaLayoutEngine = KnxAreaLayoutEngine;

	if (typeof module != 'undefined' && module.exports)
	{
		module.exports = {
			DEFAULTS: DEFAULTS,
			unionBounds: unionBounds,
			resolveVerticalAreaPlacement: resolveVerticalAreaPlacement,
			resolveFollowingAreaOverlap: resolveFollowingAreaOverlap,
			calculateDeviceSlot: calculateDeviceSlot,
			calculateDeviceGrid: calculateDeviceGrid,
			measureLineTile: measureLineTile,
			packLineTiles: packLineTiles,
			calculateLineFeederX: calculateLineFeederX,
			getAreaMinimumSize: getAreaMinimumSize
		};
	}
})(typeof window != 'undefined' ? window : globalThis);
