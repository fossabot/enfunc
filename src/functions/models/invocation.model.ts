import * as express from 'express';

export interface Invocation {
	app: string;
	func: string;
	requestId: string;
	request: express.Request;
	response: express.Response;
	body: object;
}