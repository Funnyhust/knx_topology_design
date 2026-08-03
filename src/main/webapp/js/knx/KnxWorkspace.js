/**
 * KNX-specific application shell around the existing draw.io editor.
 *
 * This module deliberately owns presentation and command entry points only.
 * The graph, KNX data, persistence and existing editor actions remain owned by
 * Draw.io and KnxTopologyModule during the prototype phase.
 */
(function()
{
	if (window.KnxWorkspace != null)
	{
		return;
	}

	function KnxWorkspace(editorUi)
	{
		this.editorUi = editorUi;
		this.graph = editorUi.editor.graph;
		this.module = KnxTopologyModule.get(editorUi);
		this.layoutFoundation = new KnxLayoutFoundation(editorUi);
		this.areaLayout = new KnxAreaLayoutEngine(this.layoutFoundation, this.module);
		this.installStylesheet();
		this.install();
	}

	KnxWorkspace.prototype.installStylesheet = function()
	{
		if (document.getElementById('knx-workspace-styles') == null)
		{
			var link = document.createElement('link');
			link.id = 'knx-workspace-styles';
			link.rel = 'stylesheet';
			link.href = 'js/knx/KnxWorkspace.css?v=20260803-27';
			document.head.appendChild(link);
		}
	};

	KnxWorkspace.prototype.createButton = function(label, icon, action, className, title)
	{
		var button = document.createElement('button');
		button.type = 'button';
		button.className = 'knxWorkspaceAction' + (className ? ' ' + className : '');
		button.title = title || label;
		button.innerHTML = '<span class="knxWorkspaceActionIcon" aria-hidden="true">' +
			icon + '</span><span>' + label + '</span>';
		mxEvent.addListener(button, 'click', mxUtils.bind(this, function(evt)
		{
			action();
			this.updateStatus();
			mxEvent.consume(evt);
		}));

		return button;
	};

	KnxWorkspace.prototype.createEquipmentAddControl = function()
	{
		var control = document.createElement('div');
		control.className = 'knxEquipmentAddControl';
		var select = document.createElement('select');
		select.className = 'knxEquipmentTypeSelect';
		select.setAttribute('aria-label', 'Device type');
		select.title = 'Choose the KNX equipment type';
		var types = KnxObjectSchema.getEquipmentTypes();

		for (var i = 0; i < types.length; i++)
		{
			var option = document.createElement('option');
			option.value = types[i].value;
			option.innerText = types[i].label;
			select.appendChild(option);
		}

		var button = this.createButton('Add Device', '&#9635;', mxUtils.bind(this, function()
		{
			this.module.addDevice(select.value);
		}), 'knxEquipmentAddButton', 'Place the selected device type');
		control.appendChild(select);
		control.appendChild(button);
		return control;
	};

	KnxWorkspace.prototype.updateWiringModeAction = function()
	{
		if (this.wiringModeButton == null || this.graph.container == null)
		{
			return;
		}

		var active = this.graph.container.getAttribute('data-wire-mode') == 'armed';
		this.wiringModeButton.classList.toggle('knxWorkspaceActionActive', active);
		this.wiringModeButton.setAttribute('aria-pressed', active ? 'true' : 'false');
		this.wiringModeButton.title = active ?
			'Wiring Mode active — click the canvas to start; Esc exits' :
			'Enter Wiring Mode and click anywhere to start (W)';
	};

	KnxWorkspace.prototype.installWiringModeObserver = function()
	{
		if (this.graph.container == null || typeof MutationObserver == 'undefined')
		{
			return;
		}

		if (this.wiringModeObserver != null)
		{
			this.wiringModeObserver.disconnect();
		}

		this.wiringModeObserver = new MutationObserver(mxUtils.bind(this, function()
		{
			this.updateWiringModeAction();
		}));
		this.wiringModeObserver.observe(this.graph.container,
			{attributes: true, attributeFilter: ['data-wire-mode']});
		this.updateWiringModeAction();
	};

	KnxWorkspace.prototype.getSelectedArea = function()
	{
		var cell = this.graph.getSelectionCell();

		if (this.module.isArea(cell))
		{
			return cell;
		}

		if (this.module.isBus(cell))
		{
			return this.module.findByTopologyId(this.module.getAttribute(cell, 'parentTopologyId'));
		}

		if (this.module.isDevice(cell) || this.module.isCoupler(cell))
		{
			var parent = this.module.findByTopologyId(
				this.module.getAttribute(cell, 'parentTopologyId'));

			return this.module.isArea(parent) ? parent : this.module.findByTopologyId(
				this.module.getAttribute(parent, 'parentTopologyId'));
		}

		return null;
	};

	KnxWorkspace.prototype.getSelectedLine = function()
	{
		var cell = this.graph.getSelectionCell();

		if (this.module.isBus(cell))
		{
			return cell;
		}

		if (this.module.isDevice(cell) || this.module.isCoupler(cell))
		{
			var parent = this.module.findByTopologyId(
				this.module.getAttribute(cell, 'parentTopologyId'));

			return this.module.isBus(parent) ? parent : null;
		}

		return null;
	};

	KnxWorkspace.prototype.runEditorAction = function(name)
	{
		var action = this.editorUi.actions.get(name);

		if (action != null && action.isEnabled())
		{
			action.funct();
		}
	};

	KnxWorkspace.prototype.restoreKnxHistorySelection = function()
	{
		var edit = this.layoutFoundation.lastHandledEdit;
		var changes = edit != null ? (edit.changes || []) : [];
		var selectionIds = null;

		for (var i = 0; i < changes.length; i++)
		{
			if (changes[i].isKnxLayoutChange)
			{
				selectionIds = changes[i].appliedSelectionIds || [];
			}
		}

		if (selectionIds != null)
		{
			var foundation = this.layoutFoundation;
			var cells = selectionIds.map(function(objectId)
			{
				return foundation.index.getCell(objectId);
			}).filter(function(cell)
			{
				return cell != null && foundation.graph.getModel().contains(cell);
			});
			this.graph.setSelectionCells(cells);
		}
	};

	KnxWorkspace.prototype.installStableHistoryViewport = function()
	{
		var workspace = this;

		['undo', 'redo'].forEach(function(name)
		{
			var original = workspace.editorUi[name];

			workspace.editorUi[name] = function()
			{
				var scrollLeft = workspace.graph.container.scrollLeft;
				var scrollTop = workspace.graph.container.scrollTop;
				var result = original.apply(this, arguments);
				workspace.restoreKnxHistorySelection();
				workspace.graph.container.scrollLeft = scrollLeft;
				workspace.graph.container.scrollTop = scrollTop;
				return result;
			};
		});
	};

	KnxWorkspace.prototype.createHeader = function()
	{
		var header = document.createElement('header');
		header.className = 'knxWorkspaceHeader';
		header.setAttribute('aria-label', 'KNX topology toolbar');

		var brand = document.createElement('div');
		brand.className = 'knxWorkspaceBrand';
		brand.innerHTML = '<span class="knxWorkspaceLogo"><i>K</i>NX</span>' +
			'<span class="knxWorkspaceBrandDivider"></span>' +
			'<span class="knxWorkspaceTitle">KNX Topology</span>';
		header.appendChild(brand);

		var actions = document.createElement('nav');
		actions.className = 'knxWorkspaceActions';
		actions.appendChild(this.createEquipmentAddControl());
		this.wiringModeButton = this.createButton('Wiring Mode', '&#8594;', mxUtils.bind(this, function()
		{
			this.module.startConnectBus();
		}), 'knxWiringModeAction', 'Enter Wiring Mode and click anywhere to start (W)');
		this.wiringModeButton.setAttribute('aria-pressed', 'false');
		actions.appendChild(this.wiringModeButton);

		actions.appendChild(this.createButton('Validate', '&#10003;', mxUtils.bind(this, function()
		{
			this.module.runConnectionValidation();
		}), '', 'Validate topology'));
		actions.appendChild(this.createButton('Save', '&#8681;', mxUtils.bind(this, function()
		{
			this.runEditorAction('save');
		}), 'knxWorkspaceSecondary', 'Save project (Ctrl+S)'));
		actions.appendChild(this.createButton('Undo', '&#8630;', mxUtils.bind(this, function()
		{
			this.runEditorAction('undo');
		}), 'knxWorkspaceSecondary', 'Undo (Ctrl+Z)'));
		actions.appendChild(this.createButton('Redo', '&#8631;', mxUtils.bind(this, function()
		{
			this.runEditorAction('redo');
		}), 'knxWorkspaceSecondary', 'Redo'));
		header.appendChild(actions);

		var views = document.createElement('nav');
		views.className = 'knxWorkspaceViews';
		views.appendChild(this.createButton('Topology', '&#9635;', function()
		{
		}, 'knxWorkspaceViewActive', 'Topology view'));
		var wiring = this.createButton('Wiring', '&#8644;', function()
		{
		}, 'knxWorkspaceDisabled', 'Wiring view');
		wiring.disabled = true;
		views.appendChild(wiring);
		var functions = this.createButton('Function', '&#9638;', function()
		{
		}, 'knxWorkspaceDisabled', 'Function view');
		functions.disabled = true;
		views.appendChild(functions);
		header.appendChild(views);

		this.editorUi.container.appendChild(header);
		this.header = header;
	};

	KnxWorkspace.prototype.configureSidebar = function()
	{
		var palettes = this.editorUi.sidebar.palettes;

		for (var id in palettes)
		{
			if (id != 'knxTopology' && palettes[id] != null)
			{
				palettes[id][0].style.display = 'none';
				palettes[id][1].style.display = 'none';
			}
		}

		if (palettes.knxTopology != null)
		{
			palettes.knxTopology[0].innerText = 'Project';
			palettes.knxTopology[0].className += ' knxWorkspaceSidebarTitle';
			palettes.knxTopology[1].className += ' knxWorkspaceTopologyContent';
		}

		var search = document.createElement('div');
		search.className = 'knxWorkspaceSearch';
		search.innerHTML = '<span aria-hidden="true">&#9906;</span>';
		var input = document.createElement('input');
		input.type = 'search';
		input.placeholder = 'Search topology...';
		input.setAttribute('aria-label', 'Search topology');
		search.appendChild(input);
		this.editorUi.sidebarContainer.appendChild(search);
		mxEvent.addListener(input, 'input', mxUtils.bind(this, function()
		{
			var query = input.value.toLowerCase();
			var rows = this.module.sidebarContent != null ?
				this.module.sidebarContent.querySelectorAll('.knxTreeRow') : [];

			for (var i = 0; i < rows.length; i++)
			{
				rows[i].style.display = query == '' ||
					rows[i].textContent.toLowerCase().indexOf(query) >= 0 ? '' : 'none';
			}
		}));
	};

	KnxWorkspace.prototype.createCanvasTools = function()
	{
		var tools = document.createElement('div');
		tools.className = 'knxCanvasTools';
		tools.appendChild(this.createButton('', '&#8722;', mxUtils.bind(this, function()
		{
			this.graph.zoomOut();
		}), 'knxCanvasTool', 'Zoom out'));
		tools.appendChild(this.createButton('', '&#43;', mxUtils.bind(this, function()
		{
			this.graph.zoomIn();
		}), 'knxCanvasTool', 'Zoom in'));
		tools.appendChild(this.createButton('Project', '&#9635;', mxUtils.bind(this, function()
		{
			this.areaLayout.fitProject();
		}), 'knxCanvasTool knxCanvasFitTool', 'Fit Project'));
		tools.appendChild(this.createButton('Area', '&#9634;', mxUtils.bind(this, function()
		{
			var area = this.getSelectedArea();

			if (area != null)
			{
				this.areaLayout.fitArea(this.module.getObjectId(area));
			}
		}), 'knxCanvasTool knxCanvasFitTool', 'Fit selected Area'));
		tools.appendChild(this.createButton('Selection', '&#8862;', mxUtils.bind(this, function()
		{
			this.areaLayout.fitSelection(this.graph.getSelectionCells());
		}), 'knxCanvasTool knxCanvasFitTool', 'Fit Selection'));
		tools.appendChild(this.createButton('100%', '1:1', mxUtils.bind(this, function()
		{
			this.graph.zoomTo(1);
		}), 'knxCanvasTool knxCanvasFitTool', 'Actual Size'));
		this.editorUi.container.appendChild(tools);
		this.canvasTools = tools;
	};

	KnxWorkspace.prototype.createStatusBar = function()
	{
		var status = document.createElement('footer');
		status.className = 'knxWorkspaceStatus';
		this.editorUi.container.appendChild(status);
		this.status = status;
		this.updateStatus();
	};

	KnxWorkspace.prototype.updateStatus = function()
	{
		if (this.status == null)
		{
			return;
		}

		var selected = this.graph.getSelectionCell();
		var selectedText = selected != null && this.module.isTopologyCell(selected) ?
			this.module.getAttribute(selected, 'name', 'Topology object') :
			(selected != null ? this.graph.convertValueToString(selected) : 'Nothing selected');
		var equipment = this.module.getEquipmentCells();
		var areas = {};
		var lines = {};

		for (var i = 0; i < equipment.length; i++)
		{
			var address = KnxObjectSchema.parseEquipmentAddress(
				this.module.getAttribute(equipment[i], 'individualAddress'),
				this.module.getEquipmentType(equipment[i]));

			if (address != null)
			{
				areas[address.areaAddress] = true;

				if (this.module.getEquipmentType(equipment[i]) != 'bc')
				{
					lines[address.lineAddress] = true;
				}
			}
		}

		this.status.innerHTML = '<span class="knxStatusReady">&#9679; Ready</span>' +
			'<span>Areas: ' + Object.keys(areas).length + '</span>' +
			'<span>Lines: ' + Object.keys(lines).length + '</span>' +
			'<span>Equipment: ' + equipment.length + '</span>' +
			'<span class="knxStatusSpacer"></span>' +
			'<span>' + mxUtils.htmlEntities(selectedText) + '</span>' +
			'<span>' + Math.round(this.graph.view.scale * 100) + '%</span>';
	};

	KnxWorkspace.prototype.install = function()
	{
		this.editorUi.knxWorkspaceMode = true;
		this.editorUi.container.knxWorkspace = this;
		this.editorUi.container.className += ' knxWorkspace';
		this.createHeader();
		this.configureSidebar();
		this.createCanvasTools();
		this.createStatusBar();
		this.installStableHistoryViewport();

		this.graph.getSelectionModel().addListener(mxEvent.CHANGE,
			mxUtils.bind(this, function()
			{
				this.updateStatus();
			}));
		this.graph.getModel().addListener(mxEvent.CHANGE,
			mxUtils.bind(this, this.updateStatus));
		this.graph.view.addListener(mxEvent.SCALE,
			mxUtils.bind(this, this.updateStatus));

		window.setTimeout(mxUtils.bind(this, function()
		{
			this.installWiringModeObserver();
			this.editorUi.toggleFormatPanel(true);
			this.editorUi.refresh(true);
			this.areaLayout.installInfiniteCanvas();
			this.editorUi.format.immediateRefresh();
			this.graph.sizeDidChange();
		}), 0);
	};

	window.KnxWorkspace = KnxWorkspace;

	var editorUiCreateUi = EditorUi.prototype.createUi;
	EditorUi.prototype.createUi = function()
	{
		editorUiCreateUi.apply(this, arguments);

		if (!this.editor.chromeless && this.sidebar != null && this.format != null)
		{
			this.knxWorkspace = new KnxWorkspace(this);
		}
	};
})();
