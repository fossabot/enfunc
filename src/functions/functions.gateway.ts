import { SubscribeMessage, WebSocketGateway, WsResponse } from '@nestjs/websockets';
import { Observable, of } from 'rxjs';

@WebSocketGateway()
export class FunctionsGateway {
  @SubscribeMessage('message')
  onEvent(client: any, payload: any): Observable<WsResponse<any>> {
    return of({});
  }
}
