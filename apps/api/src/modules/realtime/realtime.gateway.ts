import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true, namespace: '/realtime' })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(RealtimeGateway.name);

  handleConnection(socket: Socket) {
    this.logger.log(`socket connected ${socket.id}`);
  }

  @SubscribeMessage('join:sub-account')
  joinSubAccount(@ConnectedSocket() socket: Socket, @MessageBody() subTag: string) {
    socket.join(`sub:${subTag}`);
    return { joined: subTag };
  }

  emitIncomingCall(subTag: string, payload: unknown) {
    this.server.to(`sub:${subTag}`).emit('call:incoming', payload);
  }

  emitCallEnded(subTag: string, payload: unknown) {
    this.server.to(`sub:${subTag}`).emit('call:ended', payload);
  }

  emitSmsReceived(subTag: string, payload: unknown) {
    this.server.to(`sub:${subTag}`).emit('sms:received', payload);
  }

  emitLeadCreated(subTag: string, payload: unknown) {
    this.server.to(`sub:${subTag}`).emit('lead:created', payload);
  }
}
