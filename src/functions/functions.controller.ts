// tslint:disable-next-line:max-line-length
import { Controller, All, Param, Req, Res, Body, FileInterceptor, Post, UseInterceptors, UploadedFile, Get, Put, Patch, Delete, UnauthorizedException, UseGuards } from '@nestjs/common';
import * as express from 'express';
import { FunctionsService } from './functions.service';
import { RevisionInterface } from './schemas/revision.schema';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { createReadStream } from 'streamifier';
import { generate } from 'shortid';
import { ServiceKeysGuard } from './service-keys.guard';

@Controller('functions')
export class FunctionsController {

	// tslint:disable-next-line:max-line-length
	constructor(private readonly functionsService: FunctionsService, @InjectConnection() private readonly connection: Connection) { }

	private bucket: GridFSBucket;

	async onModuleInit() {
		this.bucket = new GridFSBucket(this.connection.db);
	}

	@All('/invoke/:app/:function')
	invoke(@Param('app') app: string,
		@Param('function') func: string,
		@Req() req: express.Request,
		@Res() res: express.Response,
		@Body() body: object) {
		return this.functionsService.invoke({
			app, func, body,
			requestId: null,
			request: req,
			response: res,
		});
	}

	@Post('/sync')
	@UseGuards(ServiceKeysGuard)
	async synchronize(@Body() revision: RevisionInterface) {
		return await this.functionsService.synchronize(revision);
	}

	@Post('/upload')
	@UseInterceptors(FileInterceptor('file'))
	@UseGuards(ServiceKeysGuard)
	async upload(@UploadedFile() file) {
		const id = generate();
		await this.store(file, id);
		return {
			status: true,
			data: {
				id,
			},
		};
	}

	@Get('/files/:id')
	@UseGuards(ServiceKeysGuard)
	get(@Param('id') id, @Res() res) {
		this.bucket.openDownloadStreamByName(id).pipe(res);
	}

	store(file, id) {
		// tslint:disable-next-line:max-line-length
		return new Promise(resolve => createReadStream(file.buffer).pipe(this.bucket.openUploadStream(id)).on('finish', () => resolve()));
	}

	@Post('/deploy')
	@UseGuards(ServiceKeysGuard)
	async deploy() {
		await this.functionsService.deploy();
		return {
			status: true,
			message: 'Deployment has been started',
		};
	}

	@Get()
	@UseGuards(ServiceKeysGuard)
	async readFunctions() {
		return await this.functionsService.readFunctions();
	}

	@Put(':id')
	@Patch(':id')
	@UseGuards(ServiceKeysGuard)
	async updateFunction(@Param('id') id: string, @Body() document: object) {
		return await this.functionsService.updateFunction(id, document);
	}

	@Delete('/apps/:name')
	@UseGuards(ServiceKeysGuard)
	async deleteApp(@Param('name') name: string) {
		return await this.functionsService.enqueueAppDeletion(name);
	}

	@Get('/ready/:app/:function/:revision')
	@UseGuards(ServiceKeysGuard)
	async isReady(@Param('app') app: string,
		@Param('function') func: string, @Param('revision') revision: string) {
		return await this.functionsService.checkGlobalReadiness(app, func, revision);
	}
}
