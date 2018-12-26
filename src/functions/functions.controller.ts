// tslint:disable-next-line:max-line-length
import { Controller, All, Param, Req, Res, Body, FileInterceptor, Post, UseInterceptors, UploadedFile, Get, Put, Patch, Delete } from '@nestjs/common';
import * as express from 'express';
import { FunctionsService } from './functions.service';
import { RevisionInterface } from './schemas/revision.schema';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { createReadStream } from 'streamifier';
import { generate } from 'shortid';

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
	async synchronize(@Body() revision: RevisionInterface) {
		return await this.functionsService.synchronize(revision);
	}

	@Post('/upload')
	@UseInterceptors(FileInterceptor('file'))
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
	get(@Param('id') id, @Res() res) {
		this.bucket.openDownloadStreamByName(id).pipe(res);
	}

	store(file, id) {
		// tslint:disable-next-line:max-line-length
		return new Promise(resolve => createReadStream(file.buffer).pipe(this.bucket.openUploadStream(id)).on('finish', () => resolve()));
	}

	@Post('/deploy')
	async deploy() {
		await this.functionsService.deploy();
		return {
			status: true,
			message: 'Deployment has been started',
		};
	}

	@Get()
	async readFunctions() {
		return await this.functionsService.readFunctions();
	}

	@Put(':id')
	@Patch(':id')
	async updateFunction(@Param('id') id: string, @Body() document: object) {
		return await this.functionsService.updateFunction(id, document);
	}

	@Delete('/apps/:name')
	async deleteApp(@Param('name') name: string) {
		return await this.functionsService.enqueueAppDeletion(name);
	}
}
