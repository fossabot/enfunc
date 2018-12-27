module.exports = {
	functions: {
		onRequest: (callback) => {
			return {
				callback: callback
			};
		},
		onApp: (app) => {
			return {
				callback: app,
				type: 'app'
			}
		},
		work: (event, app) => {
			return {
				event,
				callback: app,
				type: 'job'
			}
		}
	}
};