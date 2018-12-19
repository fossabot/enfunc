import { Injectable, Logger } from '@nestjs/common';
import { Invocation } from './models/invocation.model';
import { join } from 'path';
import { App } from './models/App.model';
import { readdirSync } from 'fs';

@Injectable()
export class FunctionsService {

	private funcs: object = {};

	async onModuleInit() {
		const appsDir = join(process.cwd(), process.env.APPS_DIR);
		Logger.log(`Discovered functions dir: ${appsDir}`, 'Functions');
		const appNames = readdirSync(appsDir);
		for (const appName of appNames) {
			const revisionNames = readdirSync(join(appsDir, appName));
			for (const revisionName of revisionNames) {
				const appIndex = require(join(appsDir, appName, revisionName, 'src', 'index.js'));
				for (const [key, func] of Object.entries(appIndex)) {
					if (this.funcs[appName] == null) this.funcs[appName] = {};
					if (this.funcs[appName][revisionName] == null) this.funcs[appName][revisionName] = {};
					// @ts-ignore
					this.funcs[appName][revisionName][key] = func.callback;
					Logger.log(`Discovered func: ${key} bound to app: ${appName}`, `Functions`);
				}
			}
		}
	}

	invoke(invocation: Invocation) {
		return this.funcs[invocation.app]['1'][invocation.func](invocation.request, invocation.response);
	}

}
