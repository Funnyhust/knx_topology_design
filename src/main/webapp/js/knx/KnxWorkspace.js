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
		this.installApplicationBranding();
	}

	KnxWorkspace.prototype.installApplicationBranding = function()
	{
		this.editorUi.editor.appName = 'Lumi KNX Topology';
		this.editorUi.updateDocumentTitle();
	};

	KnxWorkspace.prototype.installStylesheet = function()
	{
		if (document.getElementById('knx-workspace-styles') == null)
		{
			var link = document.createElement('link');
			link.id = 'knx-workspace-styles';
			link.rel = 'stylesheet';
			link.href = 'js/knx/KnxWorkspace.css?v=20260804-38';
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

	KnxWorkspace.prototype.createEquipmentQuickActions = function()
	{
		var control = document.createElement('div');
		control.className = 'knxEquipmentQuickActions';
		control.setAttribute('role', 'group');
		control.setAttribute('aria-label', 'Quick add system equipment');
		var types = [
			{value: 'powerSupply', label: 'Power', icon: '&#9889;'},
			{value: 'lc', label: 'LC', icon: 'LC'},
			{value: 'bc', label: 'BC', icon: 'BC'}
		];

		for (var i = 0; i < types.length; i++)
		{
			(function(type, workspace)
			{
				var equipmentType = KnxObjectSchema.getEquipmentType(type.value);
				var button = workspace.createButton(type.label, type.icon, function()
				{
					workspace.module.addDevice(type.value);
				}, 'knxEquipmentQuickAction knxEquipmentQuickAction-' + type.value,
					'Place ' + equipmentType.label);
				button.setAttribute('data-knx-device-type', type.value);
				control.appendChild(button);
			})(types[i], this);
		}

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

	KnxWorkspace.prototype.confirmDiscardChanges = function(action)
	{
		var file = this.editorUi.getCurrentFile();

		if (file != null && file.isModified())
		{
			this.editorUi.confirm(mxResources.get('allChangesLost'), null, action,
				mxResources.get('cancel'), mxResources.get('discardChanges'));
		}
		else
		{
			action();
		}
	};

	KnxWorkspace.prototype.loadLocalProject = function(data, filename, status)
	{
		var ui = this.editorUi;

		if (!ui.isCompatibleString(data))
		{
			ui.handleError(new Error('This is not a valid LUKA topology project.'));
			return;
		}

		this.confirmDiscardChanges(function()
		{
			ui.fileLoaded(new LocalFile(ui, data, filename, true, null, null, true),
				false, function()
				{
					ui.editor.setStatus(status);
				});
		});
	};

	KnxWorkspace.prototype.newLocalProject = function()
	{
		var ui = this.editorUi;

		this.confirmDiscardChanges(function()
		{
			ui.fileLoaded(new LocalFile(ui, ui.emptyDiagramXml,
				'Untitled Diagram.lukatp', true, null, null, true), false, function()
				{
					ui.editor.setStatus('New local project created');
				});
		});
	};

	KnxWorkspace.prototype.chooseLocalProject = function(input, importDrawing)
	{
		input.value = '';
		input.setAttribute('data-knx-file-mode', importDrawing ? 'import' : 'open');
		input.click();
	};

	KnxWorkspace.prototype.handleLocalProjectSelection = function(input)
	{
		var file = input.files != null ? input.files[0] : null;

		if (file == null)
		{
			return;
		}

		var ui = this.editorUi;
		var importDrawing = input.getAttribute('data-knx-file-mode') == 'import';
		var reader = new FileReader();
		reader.onload = mxUtils.bind(this, function(evt)
		{
			var data = evt.target.result;

			if (!ui.isCompatibleString(data))
			{
				ui.handleError(new Error('This is not a valid LUKA topology drawing.'));
				return;
			}

			if (!importDrawing)
			{
				this.loadLocalProject(data, file.name, 'Opened local project ' + file.name);
				return;
			}

			var metadata = this.getProjectMetadata();
			var point = this.graph.getFreeInsertPoint(true);
			ui.importFiles([file], point.x, point.y, ui.maxImageSize, null,
				mxUtils.bind(this, function(cells)
				{
					this.setProjectMetadata(metadata);
					this.graph.setSelectionCells(cells || []);
					ui.editor.setStatus('Imported drawing from ' + file.name +
						'; project information was preserved');
					this.updateStatus();
				}));
		});
		reader.onerror = mxUtils.bind(ui, function()
		{
			ui.handleError(new Error('Unable to read ' + file.name));
		});
		reader.readAsText(file);
	};

	KnxWorkspace.prototype.createFileMenuControl = function()
	{
		var workspace = this;
		var control = document.createElement('div');
		control.className = 'knxFileMenuControl';
		var button = this.createButton('File', '&#128193;', function()
		{
			var open = control.classList.toggle('knxFileMenuOpen');
			button.setAttribute('aria-expanded', open ? 'true' : 'false');
		}, 'knxFileMenuButton', 'Project file actions');
		button.setAttribute('aria-haspopup', 'menu');
		button.setAttribute('aria-expanded', 'false');
		control.appendChild(button);

		var input = document.createElement('input');
		input.type = 'file';
		input.accept = '.lukatp,.drawio,.xml,application/xml,text/xml';
		input.className = 'knxFilePicker';
		mxEvent.addListener(input, 'change', function()
		{
			workspace.handleLocalProjectSelection(input);
		});
		control.appendChild(input);

		var menu = document.createElement('div');
		menu.className = 'knxFileMenu';
		menu.setAttribute('role', 'menu');
		var items = [
			{label: 'New Project', icon: '&#9633;', action: function()
			{
				workspace.newLocalProject();
			}},
			{label: 'Open Project...', icon: '&#128194;', action: function()
			{
				workspace.chooseLocalProject(input, false);
			}},
			{label: 'Import Drawing...', icon: '&#8681;', action: function()
			{
				workspace.chooseLocalProject(input, true);
			}},
			{separator: true},
			{label: 'Save Project (.lukatp)', icon: '&#128190;', action: function()
			{
				workspace.saveProjectToDevice('lukatp');
			}},
			{label: 'Export PNG · No grid', icon: 'PNG', action: function()
			{
				workspace.saveProjectToDevice('png');
			}},
			{label: 'Export PNG · Grid', icon: 'PNG', action: function()
			{
				workspace.saveProjectToDevice('png-grid');
			}},
			{label: 'Export PDF · No grid', icon: 'PDF', action: function()
			{
				workspace.saveProjectToDevice('pdf');
			}},
			{label: 'Export PDF · Grid', icon: 'PDF', action: function()
			{
				workspace.saveProjectToDevice('pdf-grid');
			}}
		];

		for (var i = 0; i < items.length; i++)
		{
			if (items[i].separator)
			{
				var separator = document.createElement('div');
				separator.className = 'knxFileMenuSeparator';
				separator.setAttribute('role', 'separator');
				menu.appendChild(separator);
				continue;
			}

			(function(item)
			{
				var menuItem = document.createElement('button');
				menuItem.type = 'button';
				menuItem.className = 'knxFileMenuItem';
				menuItem.setAttribute('role', 'menuitem');
				menuItem.innerHTML = '<span class="knxFileMenuItemIcon" aria-hidden="true">' +
					item.icon + '</span><span>' + item.label + '</span>';
				mxEvent.addListener(menuItem, 'click', function(evt)
				{
					control.classList.remove('knxFileMenuOpen');
					button.setAttribute('aria-expanded', 'false');
					item.action();
					mxEvent.consume(evt);
				});
				menu.appendChild(menuItem);
			})(items[i]);
		}

		control.appendChild(menu);
		mxEvent.addListener(document, 'mousedown', function(evt)
		{
			if (!control.contains(mxEvent.getSource(evt)))
			{
				control.classList.remove('knxFileMenuOpen');
				button.setAttribute('aria-expanded', 'false');
			}
		});
		mxEvent.addListener(document, 'keydown', function(evt)
		{
			if (evt.key == 'Escape' && control.classList.contains('knxFileMenuOpen'))
			{
				control.classList.remove('knxFileMenuOpen');
				button.setAttribute('aria-expanded', 'false');
				button.focus();
			}
		});
		return control;
	};

	KnxWorkspace.prototype.getLocalExportFilename = function(extension)
	{
		var filename = this.editorUi.getBaseFilename(true) || 'KNX-Topology';
		filename = filename.replace(/\.(lukatp|drawio|xml|png|pdf)$/i, '');
		return filename + '.' + extension;
	};

	KnxWorkspace.prototype.saveProjectToDevice = function(format)
	{
		format = format || 'lukatp';
		var includeGrid = /-grid$/.test(format);
		format = format.replace(/-grid$/, '');

		if (format == 'png')
		{
			this.exportProjectPngToDevice(includeGrid);
			return;
		}

		if (format == 'pdf')
		{
			this.exportProjectPdfToDevice(includeGrid);
			return;
		}

		var filename = this.getLocalExportFilename('lukatp');
		var data = Graph.xmlDeclaration + '\n' + this.editorUi.getFileData(true);
		this.editorUi.doSaveLocalFile(data, filename, 'application/xml');
		var file = this.editorUi.getCurrentFile();

		if (file != null)
		{
			file.setData(data);
			file.setModified(false);
		}

		this.editorUi.editor.setStatus('Saved locally as ' + filename);
	};

	KnxWorkspace.prototype.exportProjectPngToDevice = function(includeGrid)
	{
		var ui = this.editorUi;

		if (ui.spinner.spin(document.body, 'Exporting PNG'))
		{
			this.exportTechnicalDrawing(mxUtils.bind(this, function(canvas)
			{
				ui.spinner.stop();

				try
				{
					var filename = this.getLocalExportFilename('png');
					var data = ui.createImageDataUri(canvas, null, 'png', 96);
					ui.doSaveLocalFile(data.substring(data.lastIndexOf(',') + 1),
						filename, 'image/png', true);
					ui.editor.setStatus('Exported locally as ' + filename +
						(includeGrid ? ' with grid' : ' without grid'));
				}
				catch (e)
				{
					ui.handleError(e);
				}
			}), mxUtils.bind(ui, function(e)
			{
				ui.spinner.stop();
				ui.handleError(e);
			}), includeGrid);
		}
	};

	KnxWorkspace.prototype.exportProjectPdfToDevice = function(includeGrid)
	{
		var ui = this.editorUi;
		var filename = this.getLocalExportFilename('pdf');
		var printWindow = window.open('', 'knx-technical-pdf');

		if (printWindow == null)
		{
			ui.handleError(new Error('Allow pop-ups to export the technical PDF.'));
			return;
		}

		printWindow.document.open();
		printWindow.document.write('<!doctype html><title>Preparing ' + filename +
			'</title><body style="font:14px Arial;padding:24px">Preparing technical PDF...</body>');
		printWindow.document.close();

		if (ui.spinner.spin(document.body, 'Exporting PDF'))
		{
			this.exportTechnicalDrawing(mxUtils.bind(this, function(canvas)
			{
				ui.spinner.stop();
				var maxPageMillimeters = 420;
				var widthMm = canvas.width * 25.4 / 96;
				var heightMm = canvas.height * 25.4 / 96;
				var pageScale = Math.min(1, maxPageMillimeters / Math.max(widthMm, heightMm));
				widthMm = Math.max(50, Math.round(widthMm * pageScale * 10) / 10);
				heightMm = Math.max(50, Math.round(heightMm * pageScale * 10) / 10);
				var imageData = ui.createImageDataUri(canvas, null, 'png', 192);
				var safeTitle = filename.replace(/[&<>"']/g, '');
				printWindow.document.open();
				printWindow.document.write('<!doctype html><html><head><meta charset="utf-8">' +
					'<title>' + safeTitle + '</title><style>@page{size:' + widthMm + 'mm ' +
					heightMm + 'mm;margin:0}html,body{width:100%;height:100%;margin:0;background:#fff}' +
					'img{display:block;width:100%;height:100%;object-fit:contain}</style></head><body>' +
					'<img id="drawing" alt="KNX technical drawing" src="' + imageData + '">' +
					'<script>document.getElementById("drawing").onload=function(){setTimeout(function(){' +
					'window.focus();window.print();},50)};<\/script></body></html>');
				printWindow.document.close();
				ui.editor.setStatus('Technical PDF ready as ' + filename +
					(includeGrid ? ' with grid' : ' without grid'));
			}), mxUtils.bind(ui, function(e)
			{
				ui.spinner.stop();
				printWindow.close();
				ui.handleError(e);
			}), includeGrid);
		}
		else
		{
			printWindow.close();
		}
	};

	KnxWorkspace.prototype.getProjectMetadata = function()
	{
		var node = this.editorUi.fileNode;
		var today = new Date();
		var date = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) +
			'-' + ('0' + today.getDate()).slice(-2);
		var defaults = {
			projectName: this.editorUi.getBaseFilename(true) || 'KNX Topology',
			drawingTitle: 'KNX Topology',
			designer: '',
			designDate: date,
			projectCode: '',
			revision: '01',
			notes: ''
		};
		var attributes = {
			projectName: 'knxProjectName',
			drawingTitle: 'knxDrawingTitle',
			designer: 'knxDesigner',
			designDate: 'knxDesignDate',
			projectCode: 'knxProjectCode',
			revision: 'knxRevision',
			notes: 'knxProjectNotes'
		};

		for (var key in attributes)
		{
			if (node != null && node.hasAttribute(attributes[key]))
			{
				defaults[key] = node.getAttribute(attributes[key]);
			}
		}

		return defaults;
	};

	KnxWorkspace.prototype.setProjectMetadata = function(metadata)
	{
		var node = this.editorUi.fileNode;

		if (node == null)
		{
			return false;
		}

		var attributes = {
			projectName: 'knxProjectName',
			drawingTitle: 'knxDrawingTitle',
			designer: 'knxDesigner',
			designDate: 'knxDesignDate',
			projectCode: 'knxProjectCode',
			revision: 'knxRevision',
			notes: 'knxProjectNotes'
		};

		for (var key in attributes)
		{
			node.setAttribute(attributes[key], metadata[key] || '');
		}

		var file = this.editorUi.getCurrentFile();

		if (file != null)
		{
			file.setModified(true);
		}

		this.editorUi.editor.setStatus('Design information updated');
		return true;
	};

	KnxWorkspace.prototype.showProjectInfoDialog = function()
	{
		var metadata = this.getProjectMetadata();
		var fields = [
			{key: 'projectName', label: 'Project name'},
			{key: 'drawingTitle', label: 'Drawing title'},
			{key: 'designer', label: 'Designed by'},
			{key: 'designDate', label: 'Design date', type: 'date'},
			{key: 'projectCode', label: 'Project code'},
			{key: 'revision', label: 'Revision'}
		];
		var dialog = document.createElement('div');
		dialog.className = 'knxProjectInfoDialog';
		var heading = document.createElement('h2');
		heading.innerText = 'Design Information';
		dialog.appendChild(heading);
		var form = document.createElement('div');
		form.className = 'knxProjectInfoForm';
		var inputs = {};

		for (var i = 0; i < fields.length; i++)
		{
			var field = document.createElement('label');
			field.className = 'knxProjectInfoField';
			var label = document.createElement('span');
			label.innerText = fields[i].label;
			var input = document.createElement('input');
			input.type = fields[i].type || 'text';
			input.value = metadata[fields[i].key];
			inputs[fields[i].key] = input;
			field.appendChild(label);
			field.appendChild(input);
			form.appendChild(field);
		}

		var countField = document.createElement('label');
		countField.className = 'knxProjectInfoField';
		var countLabel = document.createElement('span');
		countLabel.innerText = 'Equipment count';
		var countInput = document.createElement('input');
		countInput.type = 'text';
		countInput.readOnly = true;
		countInput.value = String(this.module.getEquipmentCells().length);
		countField.appendChild(countLabel);
		countField.appendChild(countInput);
		form.appendChild(countField);

		var notesField = document.createElement('label');
		notesField.className = 'knxProjectInfoField knxProjectInfoNotes';
		var notesLabel = document.createElement('span');
		notesLabel.innerText = 'Notes';
		var notes = document.createElement('textarea');
		notes.rows = 3;
		notes.value = metadata.notes;
		notesField.appendChild(notesLabel);
		notesField.appendChild(notes);
		form.appendChild(notesField);
		dialog.appendChild(form);

		var buttons = document.createElement('div');
		buttons.className = 'knxProjectInfoButtons';
		var cancel = mxUtils.button(mxResources.get('cancel') || 'Cancel', mxUtils.bind(this, function()
		{
			this.editorUi.hideDialog();
		}));
		var save = mxUtils.button('Save', mxUtils.bind(this, function()
		{
			for (var key in inputs)
			{
				metadata[key] = inputs[key].value.trim();
			}

			metadata.notes = notes.value.trim();

			if (this.setProjectMetadata(metadata))
			{
				this.editorUi.hideDialog();
			}
		}));
		cancel.className = 'geBtn';
		save.className = 'geBtn gePrimaryBtn';
		buttons.appendChild(cancel);
		buttons.appendChild(save);
		dialog.appendChild(buttons);
		this.editorUi.showDialog(dialog, 560, 520, true, false);
	};

	KnxWorkspace.prototype.ellipsizeTitleBlockText = function(context, value, maxWidth)
	{
		value = value || '-';
		var truncated = false;

		while (value.length > 1 && context.measureText(value).width > maxWidth)
		{
			value = value.substring(0, value.length - 1);
			truncated = true;
		}

		while (truncated && value.length > 1 && context.measureText(value + '...').width > maxWidth)
		{
			value = value.substring(0, value.length - 1);
		}

		return value + (truncated ? '...' : '');
	};

	KnxWorkspace.prototype.loadTechnicalDrawingLogos = function(callback, errorCallback)
	{
		if (this.technicalDrawingLogos != null)
		{
			callback(this.technicalDrawingLogos);
			return;
		}

		var workspace = this;
		var logos = {};
		var sources = {
			lumi: 'images/knx/logo-lumi.png',
			knxMember: 'images/knx/logo-knx-member.jpg'
		};
		var remaining = 2;
		var failed = false;

		function loaded()
		{
			remaining--;

			if (!failed && remaining == 0)
			{
				workspace.technicalDrawingLogos = logos;
				callback(logos);
			}
		}

		for (var key in sources)
		{
			(function(name, source)
			{
				var image = new Image();
				image.onload = loaded;
				image.onerror = function()
				{
					if (!failed)
					{
						failed = true;
						errorCallback(new Error('Unable to load technical drawing logo: ' + source));
					}
				};
				image.src = source;
				logos[name] = image;
			})(key, sources[key]);
		}
	};

	KnxWorkspace.prototype.drawContainedImage = function(context, image, x, y, width, height)
	{
		if (image == null || image.width == 0 || image.height == 0)
		{
			return;
		}

		var scale = Math.min(width / image.width, height / image.height);
		var drawWidth = image.width * scale;
		var drawHeight = image.height * scale;
		context.drawImage(image, x + (width - drawWidth) / 2,
			y + (height - drawHeight) / 2, drawWidth, drawHeight);
	};

	KnxWorkspace.prototype.drawTechnicalGrid = function(context, x, y, width, height)
	{
		var spacing = Math.max(16, Math.round(this.graph.gridSize * 2));
		context.save();
		context.beginPath();
		context.rect(x, y, width, height);
		context.clip();

		for (var gx = 0; gx <= width; gx += spacing)
		{
			context.beginPath();
			context.strokeStyle = gx % (spacing * 5) == 0 ? '#cbd5e1' : '#e8edf3';
			context.lineWidth = gx % (spacing * 5) == 0 ? 1.2 : 0.7;
			context.moveTo(x + gx + 0.5, y);
			context.lineTo(x + gx + 0.5, y + height);
			context.stroke();
		}

		for (var gy = 0; gy <= height; gy += spacing)
		{
			context.beginPath();
			context.strokeStyle = gy % (spacing * 5) == 0 ? '#cbd5e1' : '#e8edf3';
			context.lineWidth = gy % (spacing * 5) == 0 ? 1.2 : 0.7;
			context.moveTo(x, y + gy + 0.5);
			context.lineTo(x + width, y + gy + 0.5);
			context.stroke();
		}

		context.restore();
	};

	KnxWorkspace.prototype.createTechnicalDrawingCanvas = function(sourceCanvas, logos, includeGrid)
	{
		var scale = Math.max(1, sourceCanvas.width / 1600);
		var padding = Math.round(32 * scale);
		var titleWidth = Math.round(760 * scale);
		var titleHeight = Math.round(210 * scale);
		var width = Math.max(sourceCanvas.width + padding * 2, titleWidth + padding * 2);
		var height = sourceCanvas.height + titleHeight + padding * 3;
		var canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		var context = canvas.getContext('2d');
		context.fillStyle = '#ffffff';
		context.fillRect(0, 0, width, height);

		if (includeGrid)
		{
			this.drawTechnicalGrid(context, padding, padding,
				sourceCanvas.width, sourceCanvas.height);
		}

		context.drawImage(sourceCanvas, padding, padding);
		context.strokeStyle = '#111827';
		context.lineWidth = Math.max(2, Math.round(2 * scale));
		context.strokeRect(padding / 2, padding / 2, width - padding, height - padding);

		var x = width - padding - titleWidth;
		var y = height - padding - titleHeight;
		var rowHeight = titleHeight / 5;
		context.fillStyle = '#ffffff';
		context.fillRect(x, y, titleWidth, titleHeight);
		context.strokeRect(x, y, titleWidth, titleHeight);

		var logoWidth = Math.round(220 * scale);
		var logoSplit = x + logoWidth;

		for (var row = 1; row < 3; row++)
		{
			context.beginPath();
			context.moveTo(logoSplit, y + row * rowHeight);
			context.lineTo(x + titleWidth, y + row * rowHeight);
			context.stroke();
		}

		for (var fullRow = 3; fullRow < 5; fullRow++)
		{
			context.beginPath();
			context.moveTo(x, y + fullRow * rowHeight);
			context.lineTo(x + titleWidth, y + fullRow * rowHeight);
			context.stroke();
		}

		context.beginPath();
		context.moveTo(logoSplit, y);
		context.lineTo(logoSplit, y + rowHeight * 3);
		context.stroke();

		var split = x + titleWidth * 0.62;

		for (var line = 3; line < 5; line++)
		{
			context.beginPath();
			context.moveTo(split, y + line * rowHeight);
			context.lineTo(split, y + (line + 1) * rowHeight);
			context.stroke();
		}

		var metadata = this.getProjectMetadata();
		var equipmentCount = this.module.getEquipmentCells().length;
		var fontSize = Math.max(12, Math.round(14 * scale));
		var smallSize = Math.max(10, Math.round(11 * scale));
		var inset = Math.round(10 * scale);
		var workspace = this;

		function writeCell(label, value, left, top, cellWidth, large)
		{
			context.fillStyle = '#475569';
			context.font = smallSize + 'px Arial, sans-serif';
			context.fillText(label.toUpperCase(), left + inset, top + smallSize + inset / 2);
			context.fillStyle = '#0f172a';
			context.font = (large ? 'bold ' : '') + fontSize + 'px Arial, sans-serif';
			var text = workspace.ellipsizeTitleBlockText(context, value, cellWidth - inset * 2);
			context.fillText(text, left + inset, top + rowHeight - inset);
		}

		var logoInset = Math.round(12 * scale);
		var logoGap = Math.round(8 * scale);
		var logoAreaWidth = logoWidth - logoInset * 2;
		var lumiWidth = Math.round(72 * scale);
		this.drawContainedImage(context, logos != null ? logos.lumi : null,
			x + logoInset, y + logoInset, lumiWidth, rowHeight * 3 - logoInset * 2);
		this.drawContainedImage(context, logos != null ? logos.knxMember : null,
			x + logoInset + lumiWidth + logoGap, y + logoInset,
			logoAreaWidth - lumiWidth - logoGap, rowHeight * 3 - logoInset * 2);

		writeCell('Project', metadata.projectName, logoSplit, y,
			x + titleWidth - logoSplit, true);
		writeCell('Drawing', metadata.drawingTitle, logoSplit, y + rowHeight,
			x + titleWidth - logoSplit, false);
		writeCell('Notes', metadata.notes, logoSplit, y + rowHeight * 2,
			x + titleWidth - logoSplit, false);
		writeCell('Designed by', metadata.designer, x, y + rowHeight * 3, split - x, false);
		writeCell('Date', metadata.designDate, split, y + rowHeight * 3, x + titleWidth - split, false);
		writeCell('Project code', metadata.projectCode, x, y + rowHeight * 4, split - x, false);
		writeCell('Rev / Equipment', (metadata.revision || '-') + ' / ' + equipmentCount,
			split, y + rowHeight * 4, x + titleWidth - split, false);
		return canvas;
	};

	KnxWorkspace.prototype.exportTechnicalDrawing = function(callback, errorCallback, includeGrid)
	{
		var ui = this.editorUi;
		this.loadTechnicalDrawingLogos(mxUtils.bind(this, function(logos)
		{
			ui.editor.exportToCanvas(mxUtils.bind(this, function(canvas)
			{
				try
				{
					callback(this.createTechnicalDrawingCanvas(canvas, logos, includeGrid));
				}
				catch (e)
				{
					errorCallback(e);
				}
			}), null, null, includeGrid ? null : '#ffffff', errorCallback, null, true, 2, false, false,
				null, null, 0, false, false);
		}), errorCallback);
	};

	KnxWorkspace.prototype.createProjectDownloadControl = function()
	{
		var control = document.createElement('div');
		control.className = 'knxProjectDownloadControl';
		var select = document.createElement('select');
		select.className = 'knxProjectDownloadFormat';
		select.setAttribute('aria-label', 'Download format');
		select.title = 'Choose project or export format';
		var formats = [
			{value: 'lukatp', label: '.lukatp'},
			{value: 'png', label: 'PNG · No grid'},
			{value: 'png-grid', label: 'PNG · Grid'},
			{value: 'pdf', label: 'PDF · No grid'},
			{value: 'pdf-grid', label: 'PDF · Grid'}
		];

		for (var i = 0; i < formats.length; i++)
		{
			var option = document.createElement('option');
			option.value = formats[i].value;
			option.innerText = formats[i].label;
			select.appendChild(option);
		}

		var button = this.createButton('Download', '&#8681;', mxUtils.bind(this, function()
		{
			this.saveProjectToDevice(select.value);
		}), 'knxWorkspaceSecondary knxSaveLocalAction',
			'Download in the selected format');
		control.appendChild(select);
		control.appendChild(button);
		return control;
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
		brand.innerHTML = '<span class="knxWorkspaceBrandMarks">' +
			'<img class="knxWorkspaceLumiLogo" src="images/knx/logo-lumi.png" alt="Lumi">' +
			'<img class="knxWorkspaceKnxMemberLogo" src="images/knx/logo-knx-member.jpg" ' +
			'alt="KNX Member"></span>' +
			'<span class="knxWorkspaceBrandDivider"></span>' +
			'<span class="knxWorkspaceTitle">KNX Topology</span>';
		header.appendChild(brand);

		var actions = document.createElement('nav');
		actions.className = 'knxWorkspaceActions';
		actions.appendChild(this.createFileMenuControl());
		actions.appendChild(this.createEquipmentAddControl());
		actions.appendChild(this.createEquipmentQuickActions());
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
		actions.appendChild(this.createButton('Project Info', '&#9432;', mxUtils.bind(this, function()
		{
			this.showProjectInfoDialog();
		}), 'knxWorkspaceSecondary knxProjectInfoAction', 'Edit design information'));
		actions.appendChild(this.createProjectDownloadControl());
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

	KnxWorkspace.prototype.setMobilePanel = function(panel)
	{
		var container = this.editorUi.container;
		var projectOpen = panel == 'project';
		var propertiesOpen = panel == 'properties';
		container.classList.toggle('knxMobileProjectOpen', projectOpen);
		container.classList.toggle('knxMobilePropertiesOpen', propertiesOpen);

		if (this.mobileProjectButton != null)
		{
			this.mobileProjectButton.setAttribute('aria-expanded', projectOpen ? 'true' : 'false');
			this.mobileProjectButton.classList.toggle('knxMobileNavActive', projectOpen);
		}

		if (this.mobilePropertiesButton != null)
		{
			this.mobilePropertiesButton.setAttribute('aria-expanded', propertiesOpen ? 'true' : 'false');
			this.mobilePropertiesButton.classList.toggle('knxMobileNavActive', propertiesOpen);
		}
	};

	KnxWorkspace.prototype.toggleMobilePanel = function(panel)
	{
		var className = panel == 'project' ?
			'knxMobileProjectOpen' : 'knxMobilePropertiesOpen';
		this.setMobilePanel(this.editorUi.container.classList.contains(className) ? null : panel);
	};

	KnxWorkspace.prototype.createMobileControls = function()
	{
		var workspace = this;
		var backdrop = document.createElement('button');
		backdrop.type = 'button';
		backdrop.className = 'knxMobileBackdrop';
		backdrop.setAttribute('aria-label', 'Close panel');
		mxEvent.addListener(backdrop, 'click', function()
		{
			workspace.setMobilePanel(null);
		});
		this.editorUi.container.appendChild(backdrop);

		var nav = document.createElement('nav');
		nav.className = 'knxMobileNav';
		nav.setAttribute('aria-label', 'Mobile workspace panels');

		function addButton(label, icon, action)
		{
			var button = document.createElement('button');
			button.type = 'button';
			button.className = 'knxMobileNavButton';
			button.innerHTML = '<span aria-hidden="true">' + icon + '</span><span>' + label + '</span>';
			mxEvent.addListener(button, 'click', action);
			nav.appendChild(button);
			return button;
		}

		this.mobileProjectButton = addButton('Project', '&#9776;', function()
		{
			workspace.toggleMobilePanel('project');
		});
		this.mobileProjectButton.setAttribute('aria-controls', 'knx-mobile-project-panel');
		this.mobileProjectButton.setAttribute('aria-expanded', 'false');
		addButton('Canvas', '&#9635;', function()
		{
			workspace.setMobilePanel(null);
			workspace.graph.container.focus();
		});
		this.mobilePropertiesButton = addButton('Properties', '&#9881;', function()
		{
			workspace.toggleMobilePanel('properties');
		});
		this.mobilePropertiesButton.setAttribute('aria-controls', 'knx-mobile-properties-panel');
		this.mobilePropertiesButton.setAttribute('aria-expanded', 'false');
		this.editorUi.container.appendChild(nav);
		this.mobileNav = nav;

		var projectPanel = this.editorUi.sidebarContainer;
		var propertiesPanel = this.editorUi.formatContainer;

		if (projectPanel != null)
		{
			projectPanel.id = 'knx-mobile-project-panel';
			mxEvent.addListener(projectPanel, 'click', function(evt)
			{
				var source = mxEvent.getSource(evt);

				if (source != null && source.closest != null && source.closest('.knxTreeRow') != null)
				{
					workspace.setMobilePanel(null);
				}
			});
		}

		if (propertiesPanel != null)
		{
			propertiesPanel.id = 'knx-mobile-properties-panel';
		}
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
		this.createMobileControls();
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
