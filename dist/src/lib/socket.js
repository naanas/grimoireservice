let io = null;
export function setSocketIO(server) {
    io = server;
}
export function emitTransactionUpdate(transactionId, status) {
    if (!io)
        return;
    io.to(transactionId).emit('transaction_update', { status, transactionId });
}
//# sourceMappingURL=socket.js.map