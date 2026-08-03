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

	var schema = {
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
