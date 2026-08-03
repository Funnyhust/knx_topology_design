/**
 * Shared KNX constants used by domain, layout and presentation modules.
 */
(function()
{
	var root = typeof window != 'undefined' ? window : globalThis;

	if (root.KnxConstants != null)
	{
		if (typeof module != 'undefined' && module.exports)
		{
			module.exports = root.KnxConstants;
		}

		return;
	}

	var constants = {
		BUS_WIDTH: 4,
		EQUIPMENT_CARD_WIDTH: 180,
		EQUIPMENT_CARD_HEIGHT: 100
	};
	root.KnxConstants = constants;

	if (typeof module != 'undefined' && module.exports)
	{
		module.exports = constants;
	}
})();
