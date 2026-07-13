/** Remove internal cost fields from product payloads sent to public clients. */
export function sanitizeProductForPublic(product) {
    if (!product || typeof product !== 'object')
        return product;
    const { price_provider: _removed, ...publicProduct } = product;
    return publicProduct;
}
/** Strip provider cost from nested product on transaction responses. */
export function sanitizeTransactionForPublic(trx) {
    if (!trx || typeof trx !== 'object')
        return trx;
    if (!trx.product || typeof trx.product !== 'object')
        return trx;
    return {
        ...trx,
        product: sanitizeProductForPublic(trx.product),
    };
}
export function sanitizeProductsForPublic(products) {
    return products.map((p) => sanitizeProductForPublic(p));
}
export function sanitizeTransactionsForPublic(transactions) {
    return transactions.map((t) => sanitizeTransactionForPublic(t));
}
//# sourceMappingURL=sanitize.js.map