import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class ServiceKeysGuard implements CanActivate {
	canActivate(
		context: ExecutionContext,
	): boolean | Promise<boolean> | Observable<boolean> {
		if (context.switchToHttp().getRequest().get('X-enfunc-service-key') !== (process.env.SERVICE_KEY || '1234')) throw new UnauthorizedException();
		return true;
	}
}