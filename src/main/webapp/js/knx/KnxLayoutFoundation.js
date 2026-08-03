/**
 * KNX Layout Foundation (schema version 2).
 *
 * Owns stable canvas-object mappings, an incremental topology index and the
 * layout metadata used by future hierarchical layout phases. Draw.io remains
 * the renderer; legacy KNX attributes remain readable for compatibility.
 */
(function(root)
{
	if (root.KnxLayoutFoundation != null)
	{
		return;
	}

	var SCHEMA_VERSION = 2;
	var AREA_DEFAULTS = {
		paddingTop: 18,
		paddingRight: 28,
		paddingBottom: 28,
		paddingLeft: 28,
		headerHeight: 48,
		minWidth: 680,
		minHeight: 360
	};

	function clone(value)
	{
		return value == null ? value : JSON.parse(JSON.stringify(value));
	}

	function createUuid()
	{
		if (root.crypto != null && typeof root.crypto.randomUUID == 'function')
		{
			return root.crypto.randomUUID();
		}

		return 'knx-' + Date.now().toString(36) + '-' +
			Math.random().toString(36).substring(2, 10) + '-' +
			Math.random().toString(36).substring(2, 10);
	}

	function getAttribute(cell, name, defaultValue)
	{
		var value = cell != null ? cell.value : null;

		return value != null && typeof value.getAttribute == 'function' &&
			value.getAttribute(name) != null ? value.getAttribute(name) :
			(defaultValue != null ? defaultValue : '');
	}

	function setAttributeDirect(cell, name, value)
	{
		if (cell != null && cell.value != null &&
			typeof cell.value.setAttribute == 'function')
		{
			cell.value.setAttribute(name, value);
		}
	}

	function geometryToObject(geometry)
	{
		return geometry == null ? null : {
			x: Number(geometry.x) || 0,
			y: Number(geometry.y) || 0,
			width: Number(geometry.width) || 0,
			height: Number(geometry.height) || 0
		};
	}

	function KnxLayoutStore(data)
	{
		this.data = this.createEmpty();

		if (data != null)
		{
			this.load(data);
		}
	}

	KnxLayoutStore.prototype.createEmpty = function()
	{
		return {
			schemaVersion: SCHEMA_VERSION,
			projectId: createUuid(),
			areas: {},
			nodes: {},
			lines: {},
			migrationWarnings: []
		};
	};

	KnxLayoutStore.prototype.isSupported = function(data)
	{
		return data != null && data.schemaVersion == SCHEMA_VERSION &&
			typeof data.projectId == 'string' && data.projectId.length > 0;
	};

	KnxLayoutStore.prototype.load = function(data)
	{
		if (!this.isSupported(data))
		{
			throw new Error('Unsupported KNX layout schema');
		}

		this.data = clone(data);
		this.data.areas = this.data.areas || {};
		this.data.nodes = this.data.nodes || {};
		this.data.lines = this.data.lines || {};
		this.data.migrationWarnings = this.data.migrationWarnings || [];
	};

	KnxLayoutStore.prototype.serialize = function()
	{
		return clone(this.data);
	};

	KnxLayoutStore.prototype.capture = function(objectIds, areaIds, lineIds)
	{
		var result = {nodes: {}, areas: {}, lines: {}};

		for (var i = 0; objectIds != null && i < objectIds.length; i++)
		{
			var objectId = objectIds[i];
			result.nodes[objectId] = this.data.nodes[objectId] != null ?
				clone(this.data.nodes[objectId]) : null;
		}

		for (var j = 0; areaIds != null && j < areaIds.length; j++)
		{
			var areaId = areaIds[j];
			result.areas[areaId] = this.data.areas[areaId] != null ?
				clone(this.data.areas[areaId]) : null;
		}

		for (var k = 0; lineIds != null && k < lineIds.length; k++)
		{
			var lineId = lineIds[k];
			result.lines[lineId] = this.data.lines[lineId] != null ?
				clone(this.data.lines[lineId]) : null;
		}

		return result;
	};

	KnxLayoutStore.prototype.applySnapshot = function(snapshot)
	{
		for (var objectId in snapshot.nodes)
		{
			if (snapshot.nodes[objectId] == null)
			{
				delete this.data.nodes[objectId];
			}
			else
			{
				this.data.nodes[objectId] = clone(snapshot.nodes[objectId]);
			}
		}

		for (var areaId in snapshot.areas)
		{
			if (snapshot.areas[areaId] == null)
			{
				delete this.data.areas[areaId];
			}
			else
			{
				this.data.areas[areaId] = clone(snapshot.areas[areaId]);
			}
		}

		for (var lineId in (snapshot.lines || {}))
		{
			if (snapshot.lines[lineId] == null)
			{
				delete this.data.lines[lineId];
			}
			else
			{
				this.data.lines[lineId] = clone(snapshot.lines[lineId]);
			}
		}
	};

	function KnxTopologyIndex(graph)
	{
		this.graph = graph;
		this.reset();
	}

	KnxTopologyIndex.prototype.reset = function()
	{
		this.cellByObjectId = {};
		this.cellByLegacyId = {};
		this.metaByObjectId = {};
		this.objectIdByCell = typeof Map != 'undefined' ? new Map() : null;
		this.idsByType = {};
		this.childrenByParentId = {};
		this.warnings = [];
	};

	KnxTopologyIndex.prototype.getCellObjectId = function(cell)
	{
		return this.objectIdByCell != null && this.objectIdByCell.has(cell) ?
			this.objectIdByCell.get(cell) : getAttribute(cell, 'knxObjectId',
				getAttribute(cell, 'topologyId'));
	};

	KnxTopologyIndex.prototype.resolveObjectId = function(id)
	{
		if (id == null || id == '')
		{
			return '';
		}

		if (this.cellByObjectId[id] != null)
		{
			return id;
		}

		var legacyCell = this.cellByLegacyId[id];

		return legacyCell != null ? this.getCellObjectId(legacyCell) : id;
	};

	KnxTopologyIndex.prototype.unregisterCell = function(cell)
	{
		var objectId = this.getCellObjectId(cell);
		var meta = this.metaByObjectId[objectId];

		if (meta == null || meta.cell != cell)
		{
			return;
		}

		delete this.cellByObjectId[objectId];
		delete this.metaByObjectId[objectId];

		if (meta.legacyId != '' && this.cellByLegacyId[meta.legacyId] == cell)
		{
			delete this.cellByLegacyId[meta.legacyId];
		}

		var typeIds = this.idsByType[meta.type] || [];
		var typeIndex = typeIds.indexOf(objectId);

		if (typeIndex >= 0)
		{
			typeIds.splice(typeIndex, 1);
		}

		var childIds = this.childrenByParentId[meta.parentId] || [];
		var childIndex = childIds.indexOf(objectId);

		if (childIndex >= 0)
		{
			childIds.splice(childIndex, 1);
		}

		if (this.objectIdByCell != null)
		{
			this.objectIdByCell.delete(cell);
		}
	};

	KnxTopologyIndex.prototype.registerCellMapping = function(cell, migration)
	{
		var type = getAttribute(cell, 'knxObjectType', getAttribute(cell, 'knxType'));

		if (type == '')
		{
			return null;
		}

		this.unregisterCell(cell);
		var legacyId = getAttribute(cell, 'topologyId');
		var objectId = getAttribute(cell, 'knxObjectId', legacyId);

		if (objectId == '')
		{
			objectId = createUuid();
		}

		if (this.cellByObjectId[objectId] != null && this.cellByObjectId[objectId] != cell)
		{
			var duplicateId = objectId;
			objectId = createUuid();
			this.warnings.push({
				code: 'DUPLICATE_OBJECT_ID',
				objectId: objectId,
				message: 'Duplicate KNX object ID ' + duplicateId + ' was replaced.'
			});
		}

		setAttributeDirect(cell, 'knxObjectId', objectId);
		setAttributeDirect(cell, 'knxObjectType', type);

		if (legacyId == '')
		{
			legacyId = objectId;
			setAttributeDirect(cell, 'topologyId', legacyId);
		}

		var rawParentId = getAttribute(cell, 'parentKnxObjectId',
			getAttribute(cell, 'parentTopologyId'));
		var parentId = this.resolveObjectId(rawParentId);

		if (parentId != '')
		{
			setAttributeDirect(cell, 'parentKnxObjectId', parentId);
		}

		var meta = {
			id: objectId,
			legacyId: legacyId,
			type: type,
			parentId: parentId,
			cell: cell
		};
		this.cellByObjectId[objectId] = cell;
		this.cellByLegacyId[legacyId] = cell;
		this.metaByObjectId[objectId] = meta;

		if (this.objectIdByCell != null)
		{
			this.objectIdByCell.set(cell, objectId);
		}

		this.idsByType[type] = this.idsByType[type] || [];

		if (this.idsByType[type].indexOf(objectId) < 0)
		{
			this.idsByType[type].push(objectId);
		}

		if (parentId != '')
		{
			this.childrenByParentId[parentId] = this.childrenByParentId[parentId] || [];

			if (this.childrenByParentId[parentId].indexOf(objectId) < 0)
			{
				this.childrenByParentId[parentId].push(objectId);
			}
		}

		return objectId;
	};

	KnxTopologyIndex.prototype.buildTopologyIndex = function()
	{
		this.reset();
		var cells = this.graph != null && this.graph.getModel != null ?
			this.graph.getModel().cells : {};
		var pending = [];

		for (var cellId in cells)
		{
			if (getAttribute(cells[cellId], 'knxType') != '' ||
				getAttribute(cells[cellId], 'knxObjectType') != '')
			{
				pending.push(cells[cellId]);
			}
		}

		// First pass registers identities and legacy aliases. The second pass
		// resolves parent IDs after every possible parent is known.
		for (var i = 0; i < pending.length; i++)
		{
			this.registerCellMapping(pending[i], true);
		}

		for (var j = 0; j < pending.length; j++)
		{
			this.registerCellMapping(pending[j], true);
		}

		return this;
	};

	KnxTopologyIndex.prototype.getCell = function(id)
	{
		return this.cellByObjectId[this.resolveObjectId(id)] ||
			this.cellByLegacyId[id] || null;
	};

	KnxTopologyIndex.prototype.getCellsByType = function(type)
	{
		var ids = this.idsByType[type] || [];
		var result = [];

		for (var i = 0; i < ids.length; i++)
		{
			if (this.cellByObjectId[ids[i]] != null)
			{
				result.push(this.cellByObjectId[ids[i]]);
			}
		}

		return result;
	};

	KnxTopologyIndex.prototype.getChildrenCells = function(parentId, type)
	{
		parentId = this.resolveObjectId(parentId);
		var ids = this.childrenByParentId[parentId] || [];
		var result = [];

		for (var i = 0; i < ids.length; i++)
		{
			var meta = this.metaByObjectId[ids[i]];

			if (meta != null && (type == null || meta.type == type))
			{
				result.push(meta.cell);
			}
		}

		return result;
	};

	KnxTopologyIndex.prototype.getAncestorPath = function(objectId)
	{
		var result = [];
		var seen = {};
		objectId = this.resolveObjectId(objectId);

		while (objectId != '' && !seen[objectId])
		{
			seen[objectId] = true;
			var meta = this.metaByObjectId[objectId];

			if (meta == null)
			{
				break;
			}

			result.unshift(meta);
			objectId = meta.parentId;
		}

		return result;
	};

	KnxTopologyIndex.prototype.findAreaId = function(objectId)
	{
		var path = this.getAncestorPath(objectId);

		for (var i = 0; i < path.length; i++)
		{
			if (path[i].type == 'area')
			{
				return path[i].id;
			}
		}

		return '';
	};

	KnxTopologyIndex.prototype.getAreaMemberIds = function(areaId)
	{
		var result = [];

		for (var objectId in this.metaByObjectId)
		{
			if (objectId != areaId && this.findAreaId(objectId) == areaId)
			{
				result.push(objectId);
			}
		}

		return result;
	};

	function KnxLayoutChange(foundation, before, after, cell, nextSelectionIds,
		previousSelectionIds)
	{
		this.foundation = foundation;
		this.next = clone(after);
		this.cell = cell || null;
		this.isKnxLayoutChange = true;
		this.before = clone(before);
		var currentSelectionIds = foundation.graph.getSelectionCells().map(function(selected)
		{
			return foundation.index.getCellObjectId(selected);
		}).filter(function(objectId)
		{
			return objectId != '';
		});
		this.nextSelectionIds = clone(nextSelectionIds != null ? nextSelectionIds :
			currentSelectionIds);
		this.alternateSelectionIds = clone(previousSelectionIds != null ?
			previousSelectionIds : currentSelectionIds);
	}

	KnxLayoutChange.prototype.execute = function()
	{
		var objectIds = Object.keys(this.next.nodes || {});
		var areaIds = Object.keys(this.next.areas || {});
		var lineIds = Object.keys(this.next.lines || {});
		var current = this.foundation.store.capture(objectIds, areaIds, lineIds);
		this.foundation.store.applySnapshot(this.next);
		this.next = current;
		var foundation = this.foundation;
		var targetSelectionIds = this.nextSelectionIds || [];
		this.appliedSelectionIds = clone(targetSelectionIds);
		this.nextSelectionIds = this.alternateSelectionIds || [];
		this.alternateSelectionIds = targetSelectionIds;

		var restoreSelection = function()
		{
			var selected = targetSelectionIds.map(function(objectId)
			{
				return foundation.index.getCell(objectId);
			}).filter(function(cell)
			{
				return cell != null && foundation.graph.getModel().contains(cell);
			});
			foundation.graph.setSelectionCells(selected);
		};
		restoreSelection();

		// handleModelChange restores appliedSelectionIds again after every child
		// change in this atomic edit has been registered in the topology index.
	};

	function KnxLayoutFoundation(editorUi)
	{
		this.editorUi = editorUi;
		this.editor = editorUi.editor;
		this.graph = this.editor.graph;
		this.store = new KnxLayoutStore();
		this.index = new KnxTopologyIndex(this.graph);
		this.contextStack = [];
		this.lastHandledEdit = null;
		this.lastHandledEvent = null;
		this.eventCount = 0;
		this.graph.knxLayoutFoundation = this;
		this.editor.knxLayoutFoundation = this;
		this.initialize(this.editor.knxPendingLayoutData);
		delete this.editor.knxPendingLayoutData;
		this.installListeners();
	}

	KnxLayoutFoundation.SCHEMA_VERSION = SCHEMA_VERSION;

	KnxLayoutFoundation.prototype.getUpdateSource = function()
	{
		return this.contextStack.length > 0 ?
			this.contextStack[this.contextStack.length - 1] : 'unknown';
	};

	KnxLayoutFoundation.prototype.runWithSource = function(source, fn)
	{
		this.contextStack.push(source);

		try
		{
			return fn();
		}
		finally
		{
			this.contextStack.pop();
		}
	};

	KnxLayoutFoundation.prototype.initialize = function(serialized)
	{
		this.index.buildTopologyIndex();

		if (serialized != null && this.store.isSupported(serialized))
		{
			this.store.load(serialized);
			this.ensureMissingLayouts('auto');
		}
		else
		{
			this.migrateLegacyLayout(serialized != null ? 'INVALID_LAYOUT_METADATA' : null);
		}
	};

	KnxLayoutFoundation.prototype.loadFromSerialized = function(serialized)
	{
		this.index.buildTopologyIndex();

		if (serialized != null && this.store.isSupported(serialized))
		{
			this.store.load(serialized);
			this.ensureMissingLayouts('auto');
		}
		else
		{
			this.store = new KnxLayoutStore();
			this.migrateLegacyLayout(serialized != null ? 'INVALID_LAYOUT_METADATA' : null);
		}
	};

	KnxLayoutFoundation.prototype.calculateBounds = function(objectIds)
	{
		var minX = Infinity;
		var minY = Infinity;
		var maxX = -Infinity;
		var maxY = -Infinity;

		for (var i = 0; i < objectIds.length; i++)
		{
			var cell = this.index.getCell(objectIds[i]);
			var geometry = cell != null ? cell.geometry : null;

			if (geometry != null && !cell.edge)
			{
				minX = Math.min(minX, Number(geometry.x) || 0);
				minY = Math.min(minY, Number(geometry.y) || 0);
				maxX = Math.max(maxX, (Number(geometry.x) || 0) + (Number(geometry.width) || 0));
				maxY = Math.max(maxY, (Number(geometry.y) || 0) + (Number(geometry.height) || 0));
			}
		}

		return minX == Infinity ? {x: 0, y: 0, width: 0, height: 0} : {
			x: minX,
			y: minY,
			width: Math.max(0, maxX - minX),
			height: Math.max(0, maxY - minY)
		};
	};

	KnxLayoutFoundation.prototype.createAreaLayoutFromBounds = function(areaId, bounds)
	{
		return {
			areaId: areaId,
			x: bounds.x - AREA_DEFAULTS.paddingLeft,
			y: bounds.y - AREA_DEFAULTS.headerHeight - AREA_DEFAULTS.paddingTop,
			width: Math.max(AREA_DEFAULTS.minWidth,
				bounds.width + AREA_DEFAULTS.paddingLeft + AREA_DEFAULTS.paddingRight),
			height: Math.max(AREA_DEFAULTS.minHeight,
				bounds.height + AREA_DEFAULTS.headerHeight + AREA_DEFAULTS.paddingTop +
				AREA_DEFAULTS.paddingBottom),
			paddingTop: AREA_DEFAULTS.paddingTop,
			paddingRight: AREA_DEFAULTS.paddingRight,
			paddingBottom: AREA_DEFAULTS.paddingBottom,
			paddingLeft: AREA_DEFAULTS.paddingLeft,
			headerHeight: AREA_DEFAULTS.headerHeight,
			collapsed: false,
			layoutMode: 'manual'
		};
	};

	KnxLayoutFoundation.prototype.ensureAreaLayoutDefaults = function(area)
	{
		if (area == null)
		{
			return area;
		}

		area.paddingTop = area.paddingTop != null ? area.paddingTop : AREA_DEFAULTS.paddingTop;
		area.paddingRight = area.paddingRight != null ? area.paddingRight : AREA_DEFAULTS.paddingRight;
		area.paddingBottom = area.paddingBottom != null ? area.paddingBottom : AREA_DEFAULTS.paddingBottom;
		area.paddingLeft = area.paddingLeft != null ? area.paddingLeft : AREA_DEFAULTS.paddingLeft;
		area.headerHeight = area.headerHeight != null ? area.headerHeight : AREA_DEFAULTS.headerHeight;
		area.layoutMode = area.layoutMode || 'manual';

		return area;
	};

	KnxLayoutFoundation.prototype.migrateLegacyLayout = function(reason)
	{
		var foundation = this;
		this.runWithSource('migration', function()
		{
			if (reason != null)
			{
				foundation.store.data.migrationWarnings.push({
					code: reason,
					message: 'Layout metadata could not be used. Existing geometry was preserved.'
				});
			}

			for (var warningIndex = 0; warningIndex < foundation.index.warnings.length; warningIndex++)
			{
				foundation.store.data.migrationWarnings.push(
					clone(foundation.index.warnings[warningIndex]));
			}

			var areas = foundation.index.getCellsByType('area');

			for (var i = 0; i < areas.length; i++)
			{
				var areaId = foundation.index.getCellObjectId(areas[i]);
				var memberIds = foundation.index.getAreaMemberIds(areaId);
				var boundedIds = memberIds.filter(function(objectId)
				{
					var member = foundation.index.metaByObjectId[objectId];
					return member != null && member.type != 'junction';
				});
				var bounds = foundation.calculateBounds(boundedIds);
				foundation.store.data.areas[areaId] =
					foundation.createAreaLayoutFromBounds(areaId, bounds);
			}

			for (var objectId in foundation.index.metaByObjectId)
			{
				var meta = foundation.index.metaByObjectId[objectId];

				if (meta.type == 'area' || meta.cell.geometry == null || meta.cell.edge)
				{
					continue;
				}

				var areaId = foundation.index.findAreaId(objectId);
				var areaLayout = foundation.store.data.areas[areaId];
				var geometry = geometryToObject(meta.cell.geometry);

				if (areaId == '' && meta.type != 'backbone' && meta.type != 'junction')
				{
					foundation.store.data.migrationWarnings.push({
						code: 'MISSING_TOPOLOGY_PARENT',
						objectId: objectId,
						message: 'No Area ancestor was found. Geometry was kept at Project level.'
					});
				}

				foundation.store.data.nodes[objectId] = {
					objectId: objectId,
					areaId: areaId || null,
					relativeX: geometry.x - (areaLayout != null ? areaLayout.x : 0),
					relativeY: geometry.y - (areaLayout != null ? areaLayout.y : 0),
					width: geometry.width,
					height: geometry.height,
					layoutMode: 'manual',
					locked: true
				};

				if (meta.type == 'line')
				{
					foundation.ensureLineLayout(objectId);
				}
			}
		});
	};

	KnxLayoutFoundation.prototype.ensureLineLayout = function(lineId)
	{
		if (this.store.data.lines[lineId] == null)
		{
			this.store.data.lines[lineId] = {
				lineId: lineId,
				layoutDirection: 'vertical',
				deviceGapX: 35,
				deviceGapY: 33
			};
		}
	};

	KnxLayoutFoundation.prototype.ensureMissingLayouts = function(defaultMode)
	{
		for (var objectId in this.index.metaByObjectId)
		{
			var meta = this.index.metaByObjectId[objectId];

			if (meta.type == 'area')
			{
				if (this.store.data.areas[objectId] == null)
				{
					var memberIds = this.index.getAreaMemberIds(objectId);
					this.store.data.areas[objectId] = this.createAreaLayoutFromBounds(
						objectId, this.calculateBounds(memberIds));
				}

				this.ensureAreaLayoutDefaults(this.store.data.areas[objectId]);
			}
			else if (meta.cell.geometry != null && !meta.cell.edge &&
				this.store.data.nodes[objectId] == null)
			{
				this.syncNodeFromGeometry(meta.cell, defaultMode == 'manual', defaultMode);
			}

			if (meta.type == 'line')
			{
				this.ensureLineLayout(objectId);
			}
		}
	};

	/**
	 * Makes the incremental index/layout store aware of cells changed inside an
	 * outer topology transaction before mxGraph publishes its CHANGE event.
	 * Only cells in the current edit are inspected; the complete model is not
	 * scanned for each Add/Delete operation.
	 */
	KnxLayoutFoundation.prototype.synchronizeCurrentTransaction = function(defaultMode)
	{
		var model = this.graph.getModel();
		var edit = model.currentEdit;
		var changes = edit != null ? (edit.changes || []) : [];
		var touched = [];
		var geometryCells = [];
		var seen = [];

		for (var i = 0; i < changes.length; i++)
		{
			var cell = changes[i].child || changes[i].cell || null;

			if (cell != null && seen.indexOf(cell) < 0)
			{
				seen.push(cell);
				touched.push(cell);
			}

			if (cell != null && typeof mxGeometryChange != 'undefined' &&
				changes[i] instanceof mxGeometryChange && geometryCells.indexOf(cell) < 0)
			{
				geometryCells.push(cell);
			}
		}

		// Two passes resolve new child parent IDs even when the parent cell was
		// appended later in the same mxGraph edit.
		for (var pass = 0; pass < 2; pass++)
		{
			for (var touchedIndex = 0; touchedIndex < touched.length; touchedIndex++)
			{
				var touchedCell = touched[touchedIndex];

				if (model.contains(touchedCell) &&
					(getAttribute(touchedCell, 'knxType') != '' ||
					getAttribute(touchedCell, 'knxObjectType') != ''))
				{
					this.index.registerCellMapping(touchedCell, false);
				}
			}
		}

		for (var removedIndex = 0; removedIndex < touched.length; removedIndex++)
		{
			if (!model.contains(touched[removedIndex]))
			{
				this.index.unregisterCell(touched[removedIndex]);
			}
		}

		this.ensureMissingLayouts(defaultMode || 'auto');

		// Existing bus cells can be resized by layoutAddedLine/layoutAddedDevice.
		// Reflect those geometry changes before calculating the new Area bounds.
		for (var geometryIndex = 0; geometryIndex < geometryCells.length; geometryIndex++)
		{
			var geometryCell = geometryCells[geometryIndex];

			if (model.contains(geometryCell) && !geometryCell.edge)
			{
				this.syncNodeFromGeometry(geometryCell, false, defaultMode || 'auto');
			}
		}

		// Deleting a topology object must also delete its layout projection. The
		// enclosing KnxLayoutChange captures these removals for Undo/Redo.
		for (var nodeId in this.store.data.nodes)
		{
			if (this.index.metaByObjectId[nodeId] == null)
			{
				delete this.store.data.nodes[nodeId];
			}
		}

		for (var areaId in this.store.data.areas)
		{
			var areaMeta = this.index.metaByObjectId[areaId];

			if (areaMeta == null || areaMeta.type != 'area')
			{
				delete this.store.data.areas[areaId];
			}
		}

		for (var lineId in this.store.data.lines)
		{
			var lineMeta = this.index.metaByObjectId[lineId];

			if (lineMeta == null || lineMeta.type != 'line')
			{
				delete this.store.data.lines[lineId];
			}
		}

		return touched;
	};

	KnxLayoutFoundation.prototype.refreshNewAreaBounds = function(areaId)
	{
		var area = this.store.data.areas[areaId];

		if (area == null)
		{
			return;
		}

		var memberIds = this.index.getAreaMemberIds(areaId);
		var bounds = this.calculateBounds(memberIds);

		if (bounds.width == 0 && bounds.height == 0)
		{
			return;
		}

		if (area.width == 0 && area.height == 0)
		{
			area.x = bounds.x;
			area.y = bounds.y;
		}

		area.width = Math.max(area.width, bounds.x + bounds.width - area.x);
		area.height = Math.max(area.height, bounds.y + bounds.height - area.y);

		for (var i = 0; i < memberIds.length; i++)
		{
			var cell = this.index.getCell(memberIds[i]);

			if (cell != null && cell.geometry != null && !cell.edge)
			{
				this.syncNodeFromGeometry(cell, false, 'auto');
			}
		}
	};

	KnxLayoutFoundation.prototype.syncNodeFromGeometry = function(cell, markManual, defaultMode)
	{
		if (cell == null || cell.geometry == null || cell.edge)
		{
			return null;
		}

		var objectId = this.index.getCellObjectId(cell);
		var meta = this.index.metaByObjectId[objectId];

		if (meta != null && meta.type == 'area')
		{
			return null;
		}

		var areaId = this.index.findAreaId(objectId);
		var area = this.store.data.areas[areaId];
		var old = this.store.data.nodes[objectId];
		var geometry = geometryToObject(cell.geometry);
		var mode = markManual ? 'manual' :
			(old != null ? old.layoutMode : (defaultMode || 'auto'));
		this.store.data.nodes[objectId] = {
			objectId: objectId,
			areaId: areaId || null,
			relativeX: geometry.x - (area != null ? area.x : 0),
			relativeY: geometry.y - (area != null ? area.y : 0),
			width: geometry.width,
			height: geometry.height,
			layoutMode: mode,
			locked: markManual ? true : (old != null ? !!old.locked : false)
		};

		return this.store.data.nodes[objectId];
	};

	KnxLayoutFoundation.prototype.snapshotFromCanvas = function(objectIds, markManual)
	{
		var result = {nodes: {}, areas: {}};

		for (var i = 0; i < objectIds.length; i++)
		{
			var objectId = objectIds[i];
			var cell = this.index.getCell(objectId);
			var old = this.store.data.nodes[objectId];

			if (cell != null && cell.geometry != null && !cell.edge)
			{
				var areaId = this.index.findAreaId(objectId);
				var area = this.store.data.areas[areaId];
				var geometry = geometryToObject(cell.geometry);
				result.nodes[objectId] = {
					objectId: objectId,
					areaId: areaId || null,
					relativeX: geometry.x - (area != null ? area.x : 0),
					relativeY: geometry.y - (area != null ? area.y : 0),
					width: geometry.width,
					height: geometry.height,
					layoutMode: markManual ? 'manual' :
						(old != null ? old.layoutMode : 'auto'),
					locked: markManual ? true : (old != null ? !!old.locked : false)
				};
			}
		}

		return result;
	};

	KnxLayoutFoundation.prototype.getMoveTargetIds = function(cells)
	{
		var result = [];
		var seen = {};

		for (var i = 0; cells != null && i < cells.length; i++)
		{
			var objectId = this.index.getCellObjectId(cells[i]);

			if (objectId != '' && !seen[objectId])
			{
				seen[objectId] = true;
				result.push(objectId);
			}

			var type = getAttribute(cells[i], 'knxType');

			if (type == 'line' || type == 'backbone')
			{
				var junctions = this.index.getChildrenCells(objectId, 'junction');

				for (var j = 0; j < junctions.length; j++)
				{
					var junctionId = this.index.getCellObjectId(junctions[j]);

					if (!seen[junctionId])
					{
						seen[junctionId] = true;
						result.push(junctionId);
					}
				}
			}
		}

		return result;
	};

	KnxLayoutFoundation.prototype.handleModelChange = function(evt)
	{
		var edit = evt != null && evt.getProperty != null ? evt.getProperty('edit') : null;

		if (edit == null || evt == this.lastHandledEvent)
		{
			return;
		}

		this.lastHandledEvent = evt;
		this.lastHandledEdit = edit;
		this.eventCount++;
		var changes = edit.changes || [];
		var hasLayoutChange = false;
		var appliedSelectionIds = null;
		var geometryCells = [];

		for (var i = 0; i < changes.length; i++)
		{
			var change = changes[i];

			if (change.isKnxLayoutChange)
			{
				hasLayoutChange = true;
				appliedSelectionIds = clone(change.appliedSelectionIds || []);
				continue;
			}

			var cell = change.child || change.cell || null;

			if (cell != null)
			{
				var inModel = this.graph.getModel().contains(cell);

				if (inModel && (getAttribute(cell, 'knxType') != '' ||
					getAttribute(cell, 'knxObjectType') != ''))
				{
					this.index.registerCellMapping(cell, false);
				}
				else if (!inModel)
				{
					this.index.unregisterCell(cell);
				}

				if (typeof mxGeometryChange != 'undefined' && change instanceof mxGeometryChange)
				{
					geometryCells.push(cell);
				}
			}
		}

		this.ensureMissingLayouts('auto');

		if (appliedSelectionIds != null)
		{
			var foundation = this;
			var selectedCells = appliedSelectionIds.map(function(objectId)
			{
				return foundation.index.getCell(objectId);
			}).filter(function(cell)
			{
				return cell != null && foundation.graph.getModel().contains(cell);
			});
			this.graph.setSelectionCells(selectedCells);
		}

		var source = this.getUpdateSource();

		if (source == 'migration' || source == 'load' || source == 'layout' ||
			source == 'areaLayout' || source == 'topologyReconcile')
		{
			return;
		}

		for (var geometryIndex = 0; geometryIndex < geometryCells.length; geometryIndex++)
		{
			this.syncNodeFromGeometry(geometryCells[geometryIndex],
				!hasLayoutChange && source != 'systemPlacement' && source != 'legacyAutoLayout');
		}

		if (source == 'systemPlacement')
		{
			var affectedAreas = {};

			for (var affectedIndex = 0; affectedIndex < geometryCells.length; affectedIndex++)
			{
				var affectedId = this.index.getCellObjectId(geometryCells[affectedIndex]);
				var affectedAreaId = this.index.findAreaId(affectedId);

				if (affectedAreaId != '')
				{
					affectedAreas[affectedAreaId] = true;
				}
			}

			for (var areaId in affectedAreas)
			{
				this.refreshNewAreaBounds(areaId);
			}
		}
	};

	KnxLayoutFoundation.prototype.installListeners = function()
	{
		var foundation = this;
		this.graph.getModel().addListener(mxEvent.CHANGE, function(sender, evt)
		{
			foundation.handleModelChange(evt);
		});
	};

	KnxLayoutFoundation.prototype.applyLayoutToCanvas = function(objectIds, source, recordUndo)
	{
		var foundation = this;
		this.runWithSource(source || 'layout', function()
		{
			var model = foundation.graph.getModel();

			if (recordUndo)
			{
				model.beginUpdate();
			}

			try
			{
				for (var i = 0; i < objectIds.length; i++)
				{
					var objectId = objectIds[i];
					var node = foundation.store.data.nodes[objectId];
					var cell = foundation.index.getCell(objectId);

					if (node != null && cell != null && cell.geometry != null)
					{
						var area = node.areaId != null ? foundation.store.data.areas[node.areaId] : null;
						var geometry = cell.geometry.clone();
						geometry.x = (area != null ? area.x : 0) + node.relativeX;
						geometry.y = (area != null ? area.y : 0) + node.relativeY;
						geometry.width = node.width;
						geometry.height = node.height;
						if (recordUndo)
						{
							model.setGeometry(cell, geometry);
						}
						else
						{
							model.geometryForCellChanged(cell, geometry);
							foundation.graph.view.invalidate(cell);
						}
					}
				}
			}
			finally
			{
				if (recordUndo)
				{
					model.endUpdate();
				}
				else
				{
					foundation.graph.view.validate();
					foundation.graph.sizeDidChange();
				}
			}
		});
	};

	KnxLayoutFoundation.prototype.moveAreaAsGroup = function(areaId, dx, dy)
	{
		areaId = this.index.resolveObjectId(areaId);
		var area = this.store.data.areas[areaId];

		if (area == null || (dx == 0 && dy == 0))
		{
			return false;
		}

		var foundation = this;
		var memberIds = this.index.getAreaMemberIds(areaId).filter(function(objectId)
		{
			return foundation.store.data.nodes[objectId] != null;
		});
		var areaEngine = this.areaLayoutEngine;

		if (areaEngine != null)
		{
			memberIds = areaEngine.getProjectObjectIds([areaId]);
		}

		var before = this.store.capture(memberIds, [areaId]);
		area.x += dx;
		area.y += dy;

		if (areaEngine != null)
		{
			areaEngine.planBackboneConnections(areaEngine.getAreaCells());
		}

		var after = this.store.capture(memberIds, [areaId]);
		this.store.applySnapshot(before);
		var primaryCell = this.index.getCell(areaId);

		this.runWithSource('areaLayout', function()
		{
			foundation.graph.getModel().beginUpdate();

			try
			{
				foundation.graph.getModel().execute(new KnxLayoutChange(
					foundation, before, after, primaryCell));
				foundation.applyLayoutToCanvas(memberIds, 'areaLayout', true);

				if (areaEngine != null)
				{
					areaEngine.applyAreaContainerToCanvas(areaId, true);
				}
			}
			finally
			{
				foundation.graph.getModel().endUpdate();
			}
		});

		return true;
	};

	KnxLayoutFoundation.prototype.serialize = function()
	{
		return this.store.serialize();
	};

	KnxLayoutFoundation.prototype.getMigrationWarnings = function()
	{
		return clone(this.store.data.migrationWarnings);
	};

	root.KnxLayoutStore = KnxLayoutStore;
	root.KnxTopologyIndex = KnxTopologyIndex;
	root.KnxLayoutChange = KnxLayoutChange;
	root.KnxLayoutFoundation = KnxLayoutFoundation;

	if (typeof KnxTopologyModule != 'undefined')
	{
		var wrapLayoutSource = function(name, source)
		{
			var original = KnxTopologyModule.prototype[name];

			if (typeof original == 'function' && !original.knxLayoutSourceWrapped)
			{
				var wrapped = function()
				{
					var foundation = this.graph != null ?
						this.graph.knxLayoutFoundation : null;
					var args = arguments;
					var module = this;

					if (foundation != null && foundation.areaLayoutEngine != null &&
						(name == 'addArea' || name == 'addLine'))
					{
						var reasons = {addArea: 'add-area', addLine: 'add-line'};

						return foundation.areaLayoutEngine.runTopologyMutation(
							reasons[name], function()
							{
								return original.apply(module, args);
							});
					}

					return foundation != null ? foundation.runWithSource(source, function()
					{
						return original.apply(module, args);
					}) : original.apply(this, args);
				};
				wrapped.knxLayoutSourceWrapped = true;
				KnxTopologyModule.prototype[name] = wrapped;
			}
		};

		wrapLayoutSource('addArea', 'systemPlacement');
		wrapLayoutSource('addLine', 'systemPlacement');
		wrapLayoutSource('layoutAddedArea', 'systemPlacement');
		wrapLayoutSource('layoutAddedLine', 'systemPlacement');
		wrapLayoutSource('layoutAddedDevice', 'systemPlacement');
		wrapLayoutSource('autoLayout', 'legacyAutoLayout');
	}

	if (typeof Editor != 'undefined')
	{
		var editorParseDiagramNode = Editor.parseDiagramNode;
		Editor.parseDiagramNode = function(diagramNode)
		{
			// An uncompressed diagram may contain a direct mxGraphModel child.
			// Layout metadata from schema v1 can also contain text, which must
			// never be mistaken for a compressed Base64 diagram payload.
			if (diagramNode != null)
			{
				var directModels = diagramNode.getElementsByTagName('mxGraphModel');

				if (directModels.length > 0)
				{
					var doc = mxUtils.createXmlDocument();
					doc.appendChild(doc.importNode(directModels[0], true));

					return doc.documentElement;
				}
			}

			return editorParseDiagramNode.apply(this, arguments);
		};

		var editorGetGraphXml = Editor.prototype.getGraphXml;
		Editor.prototype.getGraphXml = function()
		{
			var node = editorGetGraphXml.apply(this, arguments);
			var foundation = this.graph != null ? this.graph.knxLayoutFoundation : null;

			if (foundation != null && node != null && node.nodeName == 'mxGraphModel')
			{
				var oldNodes = node.getElementsByTagName('knxLayout');

				while (oldNodes.length > 0)
				{
					oldNodes[0].parentNode.removeChild(oldNodes[0]);
				}

				var layoutNode = node.ownerDocument.createElement('knxLayout');
				layoutNode.setAttribute('schemaVersion', String(SCHEMA_VERSION));
				// Attribute storage keeps diagram.textContent empty for uncompressed
				// draw.io pages, so the core parser does not invoke Base64 decoding.
				layoutNode.setAttribute('data', JSON.stringify(foundation.serialize()));
				node.appendChild(layoutNode);
			}

			return node;
		};

		var editorSetGraphXml = Editor.prototype.setGraphXml;
		Editor.prototype.setGraphXml = function(node)
		{
			var modelNode = node;
			var directModel = null;

			// Uncompressed draw.io files contain mxGraphModel as a child of
			// diagram. Extract it before Editor.parseDiagramNode sees label and
			// metadata text as if it were a compressed Base64 payload.
			if (modelNode != null && modelNode.nodeName == 'mxfile')
			{
				var diagrams = modelNode.getElementsByTagName('diagram');

				if (diagrams.length > 0)
				{
					var pageIndex = Math.max(0, Math.min(diagrams.length - 1,
						Number(urlParams['page']) || 0));
					var directModels = diagrams[pageIndex].getElementsByTagName('mxGraphModel');
					directModel = directModels.length > 0 ? directModels[0] : null;
				}
			}
			else if (modelNode != null && modelNode.nodeName == 'diagram')
			{
				var directModels = modelNode.getElementsByTagName('mxGraphModel');
				directModel = directModels.length > 0 ? directModels[0] : null;
			}

			if (directModel != null)
			{
				modelNode = directModel;
			}

			if (modelNode != null && modelNode.nodeName != 'mxGraphModel' &&
				typeof this.extractGraphModel == 'function')
			{
				modelNode = this.extractGraphModel(modelNode);
			}

			var serialized = null;

			if (modelNode != null && modelNode.nodeName == 'mxGraphModel')
			{
				modelNode = modelNode.cloneNode(true);
				var layoutNodes = modelNode.getElementsByTagName('knxLayout');

				if (layoutNodes.length > 0)
				{
					try
					{
						var layoutData = layoutNodes[0].getAttribute('data');
						serialized = JSON.parse(layoutData != null ? layoutData :
							(layoutNodes[0].textContent || '{}'));
					}
					catch (e)
					{
						serialized = {schemaVersion: -1, migrationError: e.message};
					}

					while (layoutNodes.length > 0)
					{
						layoutNodes[0].parentNode.removeChild(layoutNodes[0]);
					}
				}
			}

			var foundation = this.graph != null ? this.graph.knxLayoutFoundation : null;
			var editor = this;
			var load = function()
			{
				return editorSetGraphXml.call(editor, modelNode != null ? modelNode : node);
			};

			if (foundation != null)
			{
				var result = foundation.runWithSource('load', load);
				foundation.loadFromSerialized(serialized);

				if (foundation.areaLayoutEngine != null)
				{
					foundation.areaLayoutEngine.handleProjectLoaded();
				}

				return result;
			}
			else
			{
				var result = load();
				this.knxPendingLayoutData = serialized;
				return result;
			}
		};
	}

	if (typeof Graph != 'undefined')
	{
		var graphMoveCells = Graph.prototype.moveCells;
		Graph.prototype.moveCells = function(cells, dx, dy, cloneCells)
		{
			var foundation = this.knxLayoutFoundation;

			if (foundation == null || cloneCells || cells == null ||
				(dx == 0 && dy == 0))
			{
				return graphMoveCells.apply(this, arguments);
			}

			var objectIds = foundation.getMoveTargetIds(cells);

			if (objectIds.length == 0)
			{
				return graphMoveCells.apply(this, arguments);
			}

			var before = foundation.store.capture(objectIds, []);
			var primaryCell = cells.length > 0 ? cells[0] : null;
			var args = arguments;
			var result;
			this.getModel().beginUpdate();

			try
			{
				foundation.runWithSource('userMove', function()
				{
					result = graphMoveCells.apply(foundation.graph, args);
				});
				var after = foundation.snapshotFromCanvas(objectIds, true);
				this.getModel().execute(new KnxLayoutChange(
					foundation, before, after, primaryCell));
			}
			finally
			{
				this.getModel().endUpdate();
			}

			return result;
		};
	}

	if (typeof module != 'undefined' && module.exports != null)
	{
		module.exports = {
			KnxLayoutStore: KnxLayoutStore,
			KnxTopologyIndex: KnxTopologyIndex,
			KnxLayoutChange: KnxLayoutChange,
			KnxLayoutFoundation: KnxLayoutFoundation,
			SCHEMA_VERSION: SCHEMA_VERSION,
			createUuid: createUuid
		};
	}
})(typeof window != 'undefined' ? window : globalThis);
