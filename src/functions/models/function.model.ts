import * as express from 'express';

export interface Func {
	name: string;
	callback: (req: express.Request, res: express.Response) => object;
}