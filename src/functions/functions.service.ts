import { Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import { readdirSync } from 'fs';
import { Model } from 'mongoose';
import { FunctionInterface } from './schemas/function.schema';
import { Invocation } from './models/invocation.model';
import { InjectModel, MongooseModule, InjectConnection } from '@nestjs/mongoose';
import * as Redis from 'ioredis';
import * as mongooseGridfs from 'mongoose-gridfs';
import { Connection } from 'mongoose';

@Injectable()
export class FunctionsService {

	constructor(@InjectModel('Function') private readonly functionModel: Model<FunctionInterface>,
		@InjectConnection() private readonly connection: Connection) { }

	private funcs: object = {};
	private redis: Redis.Redis;
	private gridfs: any;

	async onModuleInit() {
		await this.connectToRedis();
		await this.initGridfs();
		await this.discoverFunctions();
	}

	private async initGridfs() {
		this.gridfs = mongooseGridfs({
			collection: 'revisions',
			model: 'Revision',
			mongooseConnection: this.connection,
		});
	}

	private async connectToRedis() {
		this.redis = new Redis(process.env.REDIS_URI);
	}

	private async discoverFunctions() {
		const appsDir = join(process.cwd(), process.env.APPS_DIR);
		Logger.log(`Discovered functions dir: ${appsDir}`, 'Functions');
		const appNames = readdirSync(appsDir);
		const ids = [];
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
					if ((await this.functionModel.countDocuments({
						appName, name: key,
					})) === 0) {
						const f = new this.functionModel({
							name: key,
							revision: revisionName,
							appName,
						});
						await f.save();
						ids.push(f._id.toString());
					} else {
						const f = await this.functionModel.findOne({
							appName, name: key,
						});
						ids.push(f._id.toString());
					}
				}
			}
		}
		for (const f of (await (this.functionModel.find({}).exec()))) if (!ids.includes(f._id.toString())) await f.remove();
	}

	invoke(invocation: Invocation) {
		return this.funcs[invocation.app]['1'][invocation.func](invocation.request, invocation.response);
	}

}
