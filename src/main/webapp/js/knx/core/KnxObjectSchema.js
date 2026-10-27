/**
 * Canonical KNX object fields shared by creation, Properties and card views.
 */
(function()
{
	var root = typeof window != 'undefined' ? window : globalThis;

	if (root.KnxObjectSchema != null)
	{
		if (typeof module != 'undefined' && module.exports)
		{
			module.exports = root.KnxObjectSchema;
		}

		return;
	}

	var equipmentFields = [
		{name: 'name', label: 'Name'},
		{name: 'individualAddress', label: 'Individual Address (IA)'},
		{name: 'manufacturer', label: 'Manufacturer'},
		{name: 'orderNumber', label: 'Order Number'},
		{name: 'applicationName', label: 'Application Name'},
		{name: 'room', label: 'Room'}
	];

	var cardDetails = [
		{name: 'manufacturer', label: 'Manufacturer'},
		{name: 'orderNumber', label: 'Order No.'},
		{name: 'applicationName', label: 'Application'},
		{name: 'room', label: 'Room'}
	];

	var equipmentTypes = [
		{value: 'device', label: 'Device', shortName: 'KNX',
			defaultName: 'KNX Device', stripColor: '#667085'},
		{value: 'lc', label: 'Line Coupler (LC)', shortName: 'LC',
			defaultName: 'Line Coupler', stripColor: '#ffd84d'},
		{value: 'bc', label: 'Backbone Coupler (BC)', shortName: 'BC',
			defaultName: 'Backbone Coupler', stripColor: '#5db6df'},
		{value: 'lineRepeater', label: 'Line Repeater', shortName: 'LR',
			defaultName: 'Line Repeater', stripColor: '#a78bfa'},
		{value: 'powerSupply', label: 'KNX Power Supply', shortName: 'PS',
			defaultName: 'KNX Power Supply', stripColor: '#d92d20'}
	];

	var propertyFields = {
		device: equipmentFields,
		coupler: equipmentFields,
		backbone: [
			{name: 'name', label: 'Name'},
			{name: 'address', label: 'Backbone Address'}
		],
		area: [
			{name: 'name', label: 'Name'},
			{name: 'address', label: 'Area Address'},
			{name: 'medium', label: 'Medium'}
		],
		line: [
			{name: 'name', label: 'Name'},
			{name: 'address', label: 'Line Address'},
			{name: 'medium', label: 'Medium'}
		]
	};

	var loadTypes = [
		{value: 'light', label: 'Light', drawing: '<circle cx="40" cy="31" r="21" fill="#fff4bd"/><path d="M28 49v11h24V49M29 65h22M34 71h12M32 29l8 10 8-10M40 39v20"/>'},
		{value: 'downlight', label: 'Downlight', drawing: '<ellipse cx="40" cy="25" rx="28" ry="12" fill="#e2e8f0"/><ellipse cx="40" cy="25" rx="17" ry="6" fill="#fff4bd"/><path d="M27 43l-8 21M40 45v23M53 43l8 21"/>'},
		{value: 'curtain', label: 'Curtain', drawing: '<path d="M9 13h62M14 17v51l26-9 26 9V17" fill="#e0e7ff"/><path d="M40 17v42M22 19v43M30 19v40M50 19v40M58 19v43"/>'},
		{value: 'socket', label: 'Socket', drawing: '<rect x="11" y="11" width="58" height="58" rx="10" fill="#f1f5f9"/><circle cx="40" cy="40" r="20"/><path d="M31 35v8M49 35v8M36 55h8"/>'}
	];
	var wireTypes = [
		{value: 'knx', label: 'KNX bus', color: '#00b96b'},
		{value: 'power', label: 'Power', color: '#dc2626'},
		{value: 'control', label: 'Control', color: '#2563eb'},
		{value: 'custom', label: 'Custom', color: '#475569'}
	];

	var schema = {
		getLoadTypes: function()
		{
			return loadTypes.slice();
		},

		getLoadType: function(value)
		{
			for (var i = 0; i < loadTypes.length; i++)
			{
				if (loadTypes[i].value == value) return loadTypes[i];
			}
			return loadTypes[0];
		},

		getLoadImage: function(value)
		{
			var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">' +
				'<g fill="none" stroke="#334155" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
				this.getLoadType(value).drawing + '</g></svg>';
			return 'data:image/svg+xml,' + encodeURIComponent(svg);
		},

		getWireTypes: function()
		{
			return wireTypes.slice();
		},

		normalizeWireSettings: function(settings)
		{
			settings = settings || {};
			var type = wireTypes[0];
			for (var i = 0; i < wireTypes.length; i++)
			{
				if (wireTypes[i].value == settings.type) type = wireTypes[i];
			}
			var width = parseFloat(settings.width);
			return {type: type.value,
				color: type.value == 'knx' || !/^#[0-9a-f]{6}$/i.test(settings.color || '') ?
					type.color : settings.color,
				width: isFinite(width) ? Math.max(0.5, Math.min(12, width)) : 4};
		},
		getEquipmentTypes: function()
		{
			return equipmentTypes.slice();
		},

		getEquipmentType: function(value)
		{
			for (var i = 0; i < equipmentTypes.length; i++)
			{
				if (equipmentTypes[i].value == value)
				{
					return equipmentTypes[i];
				}
			}

			return equipmentTypes[0];
		},

		parseIndividualAddress: function(value)
		{
			var match = /^\s*(\d{1,2})\.(\d{1,2})\.(\d{1,3})\s*$/.exec(value || '');

			if (match == null)
			{
				return null;
			}

			var area = parseInt(match[1], 10);
			var line = parseInt(match[2], 10);
			var device = parseInt(match[3], 10);

			if (area < 0 || area > 15 || line < 0 || line > 15 ||
				device < 0 || device > 255)
			{
				return null;
			}

			return {
				area: area,
				line: line,
				device: device,
				areaAddress: String(area),
				lineAddress: area + '.' + line,
				individualAddress: area + '.' + line + '.' + device
			};
		},

		parsePowerSupplyAddress: function(value)
		{
			var match = /^\s*(\d{1,2})\.(\d{1,2})\.\s*$/.exec(value || '');

			if (match == null)
			{
				return null;
			}

			var area = parseInt(match[1], 10);
			var line = parseInt(match[2], 10);

			if (area < 0 || area > 15 || line < 0 || line > 15)
			{
				return null;
			}

			return {
				area: area,
				line: line,
				device: null,
				areaAddress: String(area),
				lineAddress: area + '.' + line,
				individualAddress: area + '.' + line + '.'
			};
		},

		parseEquipmentAddress: function(value, equipmentType)
		{
			return equipmentType == 'powerSupply' ?
				this.parsePowerSupplyAddress(value) : this.parseIndividualAddress(value);
		},

		getPropertyFields: function(type)
		{
			return propertyFields[type] || [];
		},

		getCardDetailFields: function()
		{
			return cardDetails;
		},

		createEquipmentDefaults: function(type)
		{
			return {
				manufacturer: 'Manufacturer',
				applicationName: type == 'powerSupply' ?
					'KNX Power Supply Application' :
					(type == 'coupler' || type == 'lc' || type == 'bc' ||
						type == 'lineRepeater' ?
						'KNX Coupler Application' : 'KNX Application'),
				room: ''
			};
		}
	};
	root.KnxObjectSchema = schema;

	if (typeof module != 'undefined' && module.exports)
	{
		module.exports = schema;
	}
})();
