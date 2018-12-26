import { Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import { readdirSync, mkdirSync, createReadStream } from 'fs';
import { Model } from 'mongoose';
import { FunctionInterface } from './schemas/function.schema';
import { Invocation } from './models/invocation.model';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import * as Redis from 'ioredis';
import { RevisionInterface } from './schemas/revision.schema';
import { existsSync, createWriteStream } from 'fs';
import { get } from 'http';
import { tmpdir } from 'os';
import { Extract } from 'unzipper';
import * as fetch from 'download-file';
import { exec } from 'child_process';
import { GridFSBucket } from 'mongodb';
import * as rimraf from 'rimraf';
import * as Queue from 'bull';

@Injectable()
export class FunctionsService {

	// @ts-ignore
	constructor(@InjectModel('Function') private readonly functionModel: Model<FunctionInterface>, @InjectModel('Revision') private readonly revisionModel: Model<RevisionInterface>, @InjectConnection() private readonly connection: Connection) { }

	private funcs: object = {};
	private redis: Redis.Redis;
	private publisher: Redis.Redis;
	private appsDir: string;

	async onModuleInit() {
		this.appsDir = join(process.cwd(), process.env.APPS_DIR);
		Logger.log(`Discovered functions dir: ${this.appsDir}`, 'Functions');
		await this.connectToRedis();
		await this.download();
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
				try {
					const appIndex = require(join(this.appsDir, appName, revisionName, 'src', 'index.js'));
					for (const [key, func] of Object.entries(appIndex)) {
						if (this.funcs[appName] == null) this.funcs[appName] = {};
						if (this.funcs[appName][revisionName] == null) this.funcs[appName][revisionName] = {};
						// @ts-ignore
						this.funcs[appName][revisionName][key] = func;
						Logger.log(`Discovered func: ${key} on revision: ${revisionName}`, `Functions] [${appName}`);
						// @ts-ignore
						if (func.type === 'app') {
							// @ts-ignore
							Logger.log(`Discovered app on revision: ${revisionName}`, `Functions] [${appName}`);
						}
						if (func.type === 'job') {
							const queue = new Queue(`R-${revisionName}-${func.event}`, process.env.REDIS_URI);
							queue.process(func.callback);
							// @ts-ignore
							Logger.log(`Discovered job on revision: ${revisionName}`, `Functions] [${appName}`);
						}
						if ((await this.functionModel.countDocuments({
							appName, name: key,
						})) === 0) {
							const f = new this.functionModel({
								name: key,
								revision: revisionName,
								appName,
							});
							// @ts-ignore
							await f.save();
							// @ts-ignore
							ids.push(f._id.toString());
						} else {
							const f = await this.functionModel.findOne({
								appName, name: key,
							});
							// @ts-ignore
							ids.push(f._id.toString());
						}
					}
				} catch (err) {
					Logger.error(err, `Functions] [${appName}`);
				}
			}
		}
		// @ts-ignore
		for (const f of (await (this.functionModel.find({}).exec()))) if (!ids.includes(f._id.toString())) await f.remove();
	}

	private unzip(revision: RevisionInterface) {
		return new Promise(resolve => {
			mkdirSync(join(this.appsDir, revision.appName, revision.revision));
			const finish = () => {
				createReadStream(join(tmpdir(), `enfunc-rev-${revision.appName}-${revision.revision}.zip`)).pipe(Extract({
					path: join(this.appsDir, revision.appName, revision.revision),
				})).promise().then(() => resolve());
			};
			if (revision.url.startsWith('database://')) {
				(new GridFSBucket(this.connection.db))
					.openDownloadStreamByName(revision.url.replace('database://', ''))
					.pipe(createWriteStream(join(tmpdir(), `enfunc-rev-${revision.appName}-${revision.revision}.zip`))
						.on('finish', () => finish()));
			} else {
				fetch(revision.url, {
					directory: tmpdir(),
					filename: `enfunc-rev-${revision.appName}-${revision.revision}.zip`,
				}, (err) => finish());
			}
		});
	}

	private install(revision: RevisionInterface) {
		return new Promise(resolve => {
			exec('yarn', {
				cwd: join(this.appsDir, revision.appName, revision.revision),
			}, (err, stdout, stderr) => {
				for (const line of stdout.split('\n'))
					Logger.log(line, `Functions] [${revision.appName}] [${revision.revision}`);
				resolve();
			});
		});
	}

	private async download() {
		Logger.log(`Starting deployment process`, 'Delivery');
		for (const doc of (await this.revisionModel.find({}).exec())) {
			const revision: RevisionInterface = doc;
			if (!existsSync(join(this.appsDir, revision.appName))) mkdirSync(join(this.appsDir, revision.appName));
			if (!existsSync(join(this.appsDir, revision.appName, revision.revision))) await this.unzip(revision);
			if (!existsSync(join(this.appsDir, revision.appName, revision.revision, 'node_modules'))) await this.install(revision);
		}
		await this.discoverFunctions();
	}

	async invoke(invocation: Invocation) {
		const func = await this.functionModel.findOne({
			appName: invocation.app,
			name: invocation.func,
		}).exec();
		// @ts-ignore
		invocation.request.env = (await this.revisionModel.findOne({
			appName: invocation.app,
			revision: func.revision,
		}).exec()).env;
		// @ts-ignore
		invocation.request.enqueue = async (name, payload) => {
			const queue = new Queue(`R-${func.revision}-${name}`, process.env.REDIS_URI);
			queue.add(payload);
		}
		if (this.funcs[invocation.app][func.revision][invocation.func].type == null || this.funcs[invocation.app][func.revision][invocation.func].type === 'callback') {
			return await this.funcs[invocation.app][func.revision][invocation.func].callback(invocation.request, invocation.response);
		} else if (this.funcs[invocation.app][func.revision][invocation.func].type === 'app') {
			return await this.funcs[invocation.app][func.revision][invocation.func].callback.handle(invocation.request, invocation.response);
		}
	}

	async synchronize(revision: RevisionInterface) {
		if ((await this.revisionModel.countDocuments({
			appName: revision.appName,
			revision: revision.revision,
		})) > 0) return { status: false, message: 'Deployment duplication detected' };
		const rev = new this.revisionModel(revision);
		// @ts-ignore
		await rev.save();
		this.publisher.publish('deployments', '');
		return rev;
	}

	async deploy() {
		await this.discoverFunctions();
	}

	async readFunctions() {
		return await this.functionModel.find({}).exec();
	}

	async updateFunction(id: string, document: object) {
		await this.functionModel.updateOne({
			_id: id,
		}, document);
		return document;
	}

	async deleteApp(name: string) {
		await this.removeDirectory(join(this.appsDir, name));
		await this.discoverFunctions();
		return {};
	}

	removeDirectory(path: string) {
		return new Promise(resolve => rimraf(path, () => resolve()));
	}
}
