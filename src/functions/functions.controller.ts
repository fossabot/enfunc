import { Controller, All, Param, Req, Res, Body } from '@nestjs/common';
import * as express from 'express';
import { FunctionsService } from './functions.service';

@Controller('functions')
export class FunctionsController {

	constructor(private readonly functionsService: FunctionsService) { }

	@All('/invoke/:app/:function')
	invoke(@Param('app') app: string, @Param('function') func: string, @Req() req: express.Request, @Res() res: express.Response, @Body() body: object) {
		return this.functionsService.invoke({
			app, func, body,
			requestId: '1234',
			request: req,
			response: res,
		});
	}

}
