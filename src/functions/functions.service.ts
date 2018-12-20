import { Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import { readdirSync, mkdirSync, createReadStream } from 'fs';
import { Model } from 'mongoose';
import { FunctionInterface } from './schemas/function.schema';
import { Invocation } from './models/invocation.model';
import { InjectModel } from '@nestjs/mongoose';
import * as Redis from 'ioredis';
import { RevisionInterface } from './schemas/revision.schema';
import { existsSync, createWriteStream } from 'fs';
import { get } from 'http';
import { tmpdir } from 'os';
import { Extract } from 'unzipper';
import * as fetch from 'download-file';

@Injectable()
export class FunctionsService {

	constructor(@InjectModel('Function') private readonly functionModel: Model<FunctionInterface>,
		@InjectModel('Revision') private readonly revisionModel: Model<RevisionInterface>) { }

	private funcs: object = {};
	private redis: Redis.Redis;
	private publisher: Redis.Redis;
	private appsDir: string;

	async onModuleInit() {
		this.appsDir = join(process.cwd(), process.env.APPS_DIR);
		Logger.log(`Discovered functions dir: ${this.appsDir}`, 'Functions');
		await this.connectToRedis();
		await this.discoverFunctions();
	}

	private async connectToRedis() {
		this.redis = new Redis(process.env.REDIS_URI);
		this.publisher = new Redis(process.env.REDIS_URI);
		this.redis.on('message', () => this.download());
		this.redis.subscribe('deployments', (err, count) => { });
	}

	private async discoverFunctions() {
		const appNames = readdirSync(this.appsDir);
		const ids = [];
		for (const appName of appNames) {
			const revisionNames = readdirSync(join(this.appsDir, appName));
			for (const revisionName of revisionNames) {
				const appIndex = require(join(this.appsDir, appName, revisionName, 'src', 'index.js'));
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

	private unzip(revision: RevisionInterface) {
		return new Promise(resolve => {
			mkdirSync(join(this.appsDir, revision.appName, revision.revision));
			fetch(revision.url, {
				directory: tmpdir(),
				filename: `enfunc-rev-${revision.appName}-${revision.revision}.zip`,
			}, (err) => {
				createReadStream(join(tmpdir(), `enfunc-rev-${revision.appName}-${revision.revision}.zip`)).pipe(Extract({
					path: join(this.appsDir, revision.appName, revision.revision),
				})).promise().then(() => resolve());
			});
		});
	}

	private async download() {
		Logger.log(`Starting deployment process`, 'Delivery');
		for (const doc of (await this.revisionModel.find({}).exec())) {
			const revision: RevisionInterface = doc;
			if (!existsSync(join(this.appsDir, revision.appName))) mkdirSync(join(this.appsDir, revision.appName));
			if (!existsSync(join(this.appsDir, revision.appName, revision.revision))) await this.unzip(revision);
		}
		await this.discoverFunctions();
	}

	invoke(invocation: Invocation) {
		return this.funcs[invocation.app]['1'][invocation.func](invocation.request, invocation.response);
	}

	async upload(revision: RevisionInterface) {
		if ((await this.revisionModel.countDocuments({
			appName: revision.appName,
			revision: revision.revision,
		})) > 0) return { status: false, message: 'Deployment duplication detected' };
		const rev = new this.revisionModel(revision);
		await rev.save();
		this.publisher.publish('deployments', '');
		return rev;
	}

	async deploy() {
		await this.discoverFunctions();
	}
}
