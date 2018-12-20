// tslint:disable-next-line:max-line-length
import { Controller, All, Param, Req, Res, Body, FileInterceptor, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import * as express from 'express';
import { FunctionsService } from './functions.service';
import { RevisionInterface } from './schemas/revision.schema';

@Controller('functions')
export class FunctionsController {

	constructor(private readonly functionsService: FunctionsService) { }

	@All('/invoke/:app/:function')
	invoke(@Param('app') app: string,
		@Param('function') func: string,
		@Req() req: express.Request,
		@Res() res: express.Response,
		@Body() body: object) {
		return this.functionsService.invoke({
			app, func, body,
			requestId: '1234',
			request: req,
			response: res,
		});
	}

	@Post('/upload')
	@UseInterceptors(FileInterceptor('file'))
	async upload(@Body() revision: RevisionInterface) {
		return await this.functionsService.upload(revision);
	}

	@Post('/deploy')
	async deploy() {
		await this.functionsService.deploy();
		return {
			status: true,
			message: 'Deployment has been started',
		};
	}

}
