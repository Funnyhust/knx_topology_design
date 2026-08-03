/**
 * Altium-style free Canvas wiring for draw.io and the KNX workspace.
 *
 * W arms Wiring Mode without selecting or mutating a cell. The first click can
 * start on equipment or in free space. Further clicks add orthogonal vertices;
 * clicking equipment completes the current wire. Esc/right-click completes the
 * current wire and keeps the mode armed, then exits when no wire is active.
 */
(function()
{
	if (window.DrawioWireModeLoaded)
	{
		return;
	}

	window.DrawioWireModeLoaded = true;
	var editorUiCreateKeyHandler = EditorUi.prototype.createKeyHandler;

	EditorUi.prototype.createKeyHandler = function(editor)
	{
		var keyHandler = editorUiCreateKeyHandler.apply(this, arguments);
		var graph = this.editor.graph;
		var ui = this;
		var connectionHandler = graph.connectionHandler;
		var getWireWidth = function()
		{
			return window.KnxConstants != null ? KnxConstants.BUS_WIDTH : 4;
		};
		var clonePoint = function(point)
		{
			return new mxPoint(point.x, point.y);
		};
		var samePoint = function(first, second)
		{
			return first != null && second != null &&
				Math.abs(first.x - second.x) < 0.001 &&
				Math.abs(first.y - second.y) < 0.001;
		};
		var toViewPoint = function(point)
		{
			return new mxPoint((point.x + graph.view.translate.x) * graph.view.scale,
				(point.y + graph.view.translate.y) * graph.view.scale);
		};
		var toModelPoint = function(point)
		{
			return new mxPoint(point.x / graph.view.scale - graph.view.translate.x,
				point.y / graph.view.scale - graph.view.translate.y);
		};
		var createWireConstraint = function(state, viewPoint)
		{
			if (state == null || viewPoint == null || state.width <= 0 || state.height <= 0)
			{
				return null;
			}

			var x = Math.max(0, Math.min(1, (viewPoint.x - state.x) / state.width));
			var y = Math.max(0, Math.min(1, (viewPoint.y - state.y) / state.height));
			var distances = [x, 1 - x, y, 1 - y];
			var nearest = 0;

			for (var i = 1; i < distances.length; i++)
			{
				nearest = distances[i] < distances[nearest] ? i : nearest;
			}

			if (nearest == 0)
			{
				x = 0;
			}
			else if (nearest == 1)
			{
				x = 1;
			}
			else if (nearest == 2)
			{
				y = 0;
			}
			else
			{
				y = 1;
			}

			return new mxConnectionConstraint(new mxPoint(x, y), false);
		};
		var getEquipmentCell = function(cell)
		{
			var module = graph.knxTopologyModule;

			while (cell != null && module != null && !module.isDevice(cell))
			{
				cell = graph.model.getParent(cell);
			}

			return module != null && module.isDevice(cell) ? cell : null;
		};
		var getEquipmentAtPoint = function(viewPoint, cell)
		{
			cell = getEquipmentCell(cell);
			var module = graph.knxTopologyModule;

			if (cell == null && module != null &&
				typeof module.getEquipmentCells == 'function')
			{
				var equipment = module.getEquipmentCells();

				for (var i = equipment.length - 1; i >= 0; i--)
				{
					var state = graph.view.getState(equipment[i], true);

					if (state != null && viewPoint.x >= state.x &&
						viewPoint.x <= state.x + state.width &&
						viewPoint.y >= state.y &&
						viewPoint.y <= state.y + state.height)
					{
						cell = equipment[i];
						break;
					}
				}
			}

			return cell;
		};
		var resolveWireEvent = function(evt, eventCell)
		{
			var modelPoint = graph.getPointForEvent(evt, false);
			var viewPoint = toViewPoint(modelPoint);
			var cell = getEquipmentAtPoint(viewPoint, eventCell);
			var constraint = null;

			if (cell != null)
			{
				var state = graph.view.getState(cell, true);
				constraint = createWireConstraint(state, viewPoint);
				var fixedPoint = constraint != null ?
					graph.getConnectionPoint(state, constraint) : null;

				if (fixedPoint != null)
				{
					modelPoint = toModelPoint(fixedPoint);
				}
			}

			return {
				point: modelPoint,
				cell: cell,
				constraint: constraint,
					horizontalFirst: ui.wireModeHorizontalFirst
			};
		};
		var resolveWirePoint = function(me)
		{
			return resolveWireEvent(me.getEvent(), me.getCell());
		};
		var isWireFinishEvent = function(evt)
		{
			return mxEvent.isPopupTrigger(evt) || evt.button == 2 || evt.which == 3;
		};
		var appendOrthogonalPoint = function(points, next, horizontalFirst)
		{
			var previous = points.length > 0 ? points[points.length - 1] : null;

			if (previous == null)
			{
				points.push(clonePoint(next));
				return;
			}

			if (samePoint(previous, next))
			{
				return;
			}

			if (previous.x != next.x && previous.y != next.y)
			{
				points.push(horizontalFirst ?
					new mxPoint(next.x, previous.y) :
					new mxPoint(previous.x, next.y));
			}

			if (!samePoint(points[points.length - 1], next))
			{
				points.push(clonePoint(next));
			}
		};
		var buildWirePath = function(cursor)
		{
			var points = [];
			var anchors = ui.wireModeAnchors || [];

			for (var i = 0; i < anchors.length; i++)
			{
				appendOrthogonalPoint(points, anchors[i].point,
					i == 0 ? true : anchors[i].horizontalFirst);
			}

			if (cursor != null && anchors.length > 0)
			{
				appendOrthogonalPoint(points, cursor.point, cursor.horizontalFirst);
			}

			return points;
		};
		var destroyWirePreview = function()
		{
			if (ui.wireModePreviewShape != null)
			{
				ui.wireModePreviewShape.destroy();
				ui.wireModePreviewShape = null;
			}
		};
		var redrawWirePreview = function(cursor)
		{
			if (!ui.wireModeActive || ui.wireModeAnchors == null ||
				ui.wireModeAnchors.length == 0)
			{
				destroyWirePreview();
				return;
			}

			var modelPoints = buildWirePath(cursor);
			var viewPoints = [];

			for (var i = 0; i < modelPoints.length; i++)
			{
				viewPoints.push(toViewPoint(modelPoints[i]));
			}

			if (ui.wireModePreviewShape == null)
			{
				ui.wireModePreviewShape = new mxPolyline(viewPoints,
					'#00b96b', getWireWidth());
				ui.wireModePreviewShape.dialect = graph.dialect;
				ui.wireModePreviewShape.pointerEvents = false;
				ui.wireModePreviewShape.init(graph.view.getOverlayPane());
			}
			else
			{
				ui.wireModePreviewShape.points = viewPoints;
			}

			ui.wireModePreviewShape.redraw();
		};
		var createWireStyle = function()
		{
			var style = graph.createCurrentEdgeStyle();
			style = mxUtils.setStyle(style, mxConstants.STYLE_EDGE, 'none');
			style = mxUtils.setStyle(style, mxConstants.STYLE_NOEDGESTYLE, '1');
			style = mxUtils.setStyle(style, mxConstants.STYLE_ORTHOGONAL, '1');
			style = mxUtils.setStyle(style, mxConstants.STYLE_ROUNDED, '0');
			style = mxUtils.setStyle(style, mxConstants.STYLE_STARTARROW,
				mxConstants.NONE);
			style = mxUtils.setStyle(style, mxConstants.STYLE_ENDARROW,
				mxConstants.NONE);
			style = mxUtils.setStyle(style, 'startFill', '0');
			style = mxUtils.setStyle(style, 'endFill', '0');
			style = mxUtils.setStyle(style, mxConstants.STYLE_STROKECOLOR,
				'#00b96b');
			style = mxUtils.setStyle(style, mxConstants.STYLE_STROKEWIDTH,
				getWireWidth());
			style = mxUtils.setStyle(style, 'wireMode', '1');
			return mxUtils.setStyle(style, 'knxConnectionKind', 'manual-wiring');
		};
		var resetCurrentWire = function()
		{
			destroyWirePreview();
			ui.wireModeAnchors = [];
			ui.wireModeCursor = null;
			ui.wireModeHorizontalFirst = true;
		};
		var commitCurrentWire = function()
		{
			var anchors = ui.wireModeAnchors || [];
			var points = buildWirePath(null);

			if (anchors.length < 2 || points.length < 2 ||
				samePoint(points[0], points[points.length - 1]))
			{
				resetCurrentWire();
				return false;
			}

			var source = anchors[0];
			var target = anchors[anchors.length - 1];
			var model = graph.getModel();
			var edge = null;
			model.beginUpdate();

			try
			{
				edge = graph.insertEdge(graph.getDefaultParent(), null, '',
					source.cell, target.cell, createWireStyle());
				var geometry = model.getGeometry(edge).clone();
				geometry.points = [];

				for (var i = 1; i < points.length - 1; i++)
				{
					geometry.points.push(clonePoint(points[i]));
				}

				if (source.cell == null)
				{
					geometry.setTerminalPoint(clonePoint(points[0]), true);
				}

				if (target.cell == null)
				{
					geometry.setTerminalPoint(clonePoint(points[points.length - 1]), false);
				}

				model.setGeometry(edge, geometry);

				if (source.cell != null && source.constraint != null)
				{
					graph.setConnectionConstraint(edge, source.cell, true,
						source.constraint);
				}

				if (target.cell != null && target.constraint != null)
				{
					graph.setConnectionConstraint(edge, target.cell, false,
						target.constraint);
				}
			}
			finally
			{
				model.endUpdate();
			}

			resetCurrentWire();
			ui.editor.setStatus('Wire placed. Click anywhere to start another; Esc exits.');
			return edge != null;
		};
		var addWireAnchor = function(point)
		{
			var anchors = ui.wireModeAnchors;

			if (anchors.length == 0 || !samePoint(
				anchors[anchors.length - 1].point, point.point))
			{
				anchors.push(point);
			}

			if (anchors.length > 1 && point.cell != null)
			{
				commitCurrentWire();
			}
			else
			{
				redrawWirePreview(ui.wireModeCursor);
				ui.editor.setStatus('Wiring Mode: click adds a corner; click equipment ' +
					'to finish; right-click/Esc completes; Backspace removes a corner.');
			}
		};
		var finishCurrentWire = function()
		{
			var anchors = ui.wireModeAnchors || [];
			var cursor = ui.wireModeCursor;

			// The live endpoint is part of the route even when the user finishes
			// with right-click/Esc instead of placing one more left-click anchor.
			if (anchors.length > 0 && cursor != null && !samePoint(
				anchors[anchors.length - 1].point, cursor.point))
			{
				anchors.push(cursor);
			}

			if (anchors.length > 1)
			{
				return commitCurrentWire();
			}

			resetCurrentWire();
			return false;
		};

		this.cancelWireMode = function()
		{
			if (!ui.wireModeActive)
			{
				return false;
			}

			resetCurrentWire();
			ui.wireModeActive = false;

			if (connectionHandler != null &&
				ui.wireModePreviousConnectionHandlerEnabled != null)
			{
				connectionHandler.setEnabled(
					ui.wireModePreviousConnectionHandlerEnabled);
			}

			if (graph.container != null)
			{
				graph.container.style.cursor = '';
				graph.container.removeAttribute('data-wire-mode');
			}

			ui.editor.setStatus('');
			return true;
		};

		this.enterWireMode = function()
		{
			if (!graph.isEnabled() || graph.isEditing())
			{
				return false;
			}

			if (ui.wireModeActive)
			{
				return true;
			}

			graph.knxWireModeInputGuard = true;
			graph.knxWireModeInputGuardToken =
				(graph.knxWireModeInputGuardToken || 0) + 1;
			var guardToken = graph.knxWireModeInputGuardToken;
			window.setTimeout(function()
			{
				if (graph.knxWireModeInputGuardToken == guardToken)
				{
					graph.knxWireModeInputGuard = false;
				}
			}, 0);

			if (connectionHandler != null)
			{
				ui.wireModePreviousConnectionHandlerEnabled =
					connectionHandler.isEnabled();
				connectionHandler.setEnabled(false);
			}

			ui.wireModeActive = true;
			resetCurrentWire();

			if (graph.container != null)
			{
				graph.container.style.cursor = 'crosshair';
				graph.container.setAttribute('data-wire-mode', 'armed');
			}

			ui.editor.setStatus('Wiring Mode: click anywhere to start a wire; Esc exits.');
			return true;
		};

		// Compatibility entry point used by existing toolbar and topology menus.
		this.startWireModeFromCell = function()
		{
			return ui.enterWireMode();
		};

		if (this.wireModeMouseListener == null)
		{
			this.wireModeMouseListener =
			{
				mouseDown: function(sender, me)
				{
					if (!ui.wireModeActive)
					{
						return;
					}

					if (isWireFinishEvent(me.getEvent()))
					{
						if (ui.wireModeAnchors.length > 0)
						{
							ui.wireModeCursor = resolveWirePoint(me);
							finishCurrentWire();
						}
						else
						{
							ui.cancelWireMode();
						}
					}
					else
					{
						addWireAnchor(resolveWirePoint(me));
					}

					me.consume();
				},
				mouseMove: function(sender, me)
				{
					if (ui.wireModeActive)
					{
						ui.wireModeCursor = resolveWirePoint(me);
						redrawWirePreview(ui.wireModeCursor);
						me.consume();
					}
				},
				mouseUp: function(sender, me)
				{
					if (ui.wireModeActive)
					{
						me.consume();
					}
				}
			};
			graph.addMouseListener(this.wireModeMouseListener);

			// Wiring owns pointer gestures before selection, movement and popup handlers.
			var listenerIndex = graph.mouseListeners != null ?
				graph.mouseListeners.indexOf(this.wireModeMouseListener) : -1;

			if (listenerIndex > 0)
			{
				graph.mouseListeners.splice(listenerIndex, 1);
				graph.mouseListeners.unshift(this.wireModeMouseListener);
			}
		}

		if (this.wireModePointerHandlers == null && graph.container != null)
		{
			var consumePointerEvent = function(evt)
			{
				evt.preventDefault();
				evt.stopPropagation();

				if (evt.stopImmediatePropagation != null)
				{
					evt.stopImmediatePropagation();
				}
			};
			var pointerDown = function(evt)
			{
				if (!ui.wireModeActive)
				{
					return;
				}

				ui.wireModeCursor = resolveWireEvent(evt, null);

				if (isWireFinishEvent(evt))
				{
					if (ui.wireModeAnchors.length > 0)
					{
						finishCurrentWire();
					}
					else
					{
						ui.cancelWireMode();
					}
				}
				else
				{
					addWireAnchor(ui.wireModeCursor);
				}

				consumePointerEvent(evt);
			};
			var pointerMove = function(evt)
			{
				if (ui.wireModeActive)
				{
					ui.wireModeCursor = resolveWireEvent(evt, null);
					redrawWirePreview(ui.wireModeCursor);
					consumePointerEvent(evt);
				}
			};
			var pointerUp = function(evt)
			{
				if (ui.wireModeActive)
				{
					consumePointerEvent(evt);
				}
			};

			this.wireModePointerHandlers = {
				down: pointerDown,
				move: pointerMove,
				up: pointerUp
			};
			graph.container.addEventListener('mousedown', pointerDown, true);
			graph.container.addEventListener('mousemove', pointerMove, true);
			graph.container.addEventListener('mouseup', pointerUp, true);
		}

		if (this.wireModeContextMenuHandler == null && graph.container != null)
		{
			this.wireModeContextMenuHandler = function(evt)
			{
				if (ui.wireModeActive && graph.container.contains(
					mxEvent.getSource(evt)))
				{
					evt.preventDefault();
					evt.stopPropagation();

					if (evt.stopImmediatePropagation != null)
					{
						evt.stopImmediatePropagation();
					}
				}
			};
			graph.container.addEventListener('contextmenu',
				this.wireModeContextMenuHandler, true);
		}

		if (this.wireModeWindowKeydownHandler == null)
		{
			this.wireModeWindowKeydownHandler = function(evt)
			{
				if (graph.container == null ||
					!document.body.contains(graph.container) ||
					graph.container.clientWidth == 0 ||
					graph.container.clientHeight == 0)
				{
					return;
				}

				var source = mxEvent.getSource(evt);
				var nodeName = source != null && source.nodeName != null ?
					source.nodeName.toUpperCase() : '';
				var className = source != null && source.className != null ?
					String(source.className) : '';
				var textInput = className.indexOf('mxTypingShim') < 0 &&
					(nodeName == 'INPUT' || nodeName == 'TEXTAREA' ||
					nodeName == 'SELECT' || (source != null && source.isContentEditable));
				var key = evt.key != null ? evt.key.toLowerCase() : '';
				var isWireShortcut = evt.keyCode == 87 || key == 'w';

				if (!textInput && !evt.repeat && isWireShortcut &&
					!mxEvent.isAltDown(evt) && !mxEvent.isShiftDown(evt) &&
					!mxEvent.isControlDown(evt) && !mxEvent.isMetaDown(evt))
				{
					evt.preventDefault();
					evt.stopPropagation();

					if (evt.stopImmediatePropagation != null)
					{
						evt.stopImmediatePropagation();
					}

					ui.enterWireMode();
					mxEvent.consume(evt);
				}
				else if (ui.wireModeActive && !textInput)
				{
					var handled = true;

					if (evt.keyCode == 27)
					{
						if (ui.wireModeAnchors.length > 0)
						{
							finishCurrentWire();
						}
						else
						{
							ui.cancelWireMode();
						}
					}
					else if (evt.keyCode == 8 || evt.keyCode == 46)
					{
						if (ui.wireModeAnchors.length > 0)
						{
							ui.wireModeAnchors.pop();
							redrawWirePreview(ui.wireModeCursor);
						}
					}
					else if (evt.keyCode == 32)
					{
						ui.wireModeHorizontalFirst = !ui.wireModeHorizontalFirst;
						redrawWirePreview(ui.wireModeCursor);
					}
					else
					{
						handled = false;
					}

					if (handled)
					{
						evt.preventDefault();
						evt.stopPropagation();

						if (evt.stopImmediatePropagation != null)
						{
							evt.stopImmediatePropagation();
						}

						mxEvent.consume(evt);
					}
				}
			};
			window.addEventListener('keydown',
				this.wireModeWindowKeydownHandler, true);
		}

		return keyHandler;
	};
})();
