import type { Server } from 'socket.io';

let io: Server | null = null;

export function setSocketIO(server: Server) {
    io = server;
}

export function emitTransactionUpdate(transactionId: string, status: string) {
    if (!io) return;
    io.to(transactionId).emit('transaction_update', { status, transactionId });
}
