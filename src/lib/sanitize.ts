type RecordLike = Record<string, unknown>;

export type PublicTransactionOptions = {
    isOwner?: boolean;
};

const PENDING_STATUS = 'PENDING';

const maskGuestContact = (
    trx: { userId?: string | null; guestContact?: string | null },
    isOwner: boolean,
) => {
    if (isOwner) return trx.guestContact;
    return trx.userId
        ? trx.guestContact || '********'
        : '********' + (trx.guestContact?.slice(-3) || '');
};

const maskTargetId = (targetId: string | null | undefined, isOwner: boolean) => {
    if (isOwner || !targetId) return targetId;
    return targetId.length > 4 ? targetId.slice(0, 3) + '****' : '****';
};

/** Strip internal pricing config from category payloads. */
export function sanitizeCategoryForPublic(category: RecordLike | null | undefined) {
    if (!category || typeof category !== 'object') return category;
    const { profitMargin: _profitMargin, createdAt: _createdAt, updatedAt: _updatedAt, ...publicCategory } =
        category;
    return publicCategory;
}

/** Public product shape for storefront APIs. */
export function sanitizeProductForPublic(product: RecordLike | null | undefined) {
    if (!product || typeof product !== 'object') return product;

    const {
        price_provider: _priceProvider,
        sku_code: _skuCode,
        categoryId: _categoryId,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        category,
        ...rest
    } = product;

    return {
        ...rest,
        ...(category && typeof category === 'object'
            ? { category: sanitizeCategoryForPublic(category as RecordLike) }
            : {}),
    };
}

export function sanitizeProductsForPublic(products: RecordLike[]) {
    return products.map((p) => sanitizeProductForPublic(p));
}

/** Slim transaction payload for public clients (GET /check, history, check-status). */
export function sanitizeTransactionForPublic(
    trx: RecordLike | null | undefined,
    options: PublicTransactionOptions = {},
) {
    if (!trx || typeof trx !== 'object') return trx;

    const isOwner = options.isOwner ?? false;
    const status = String(trx.status || '');
    const isPending = status === PENDING_STATUS;

    const {
        userId: _userId,
        productId: _productId,
        providerTrxId: _providerTrxId,
        providerStatus: _providerStatus,
        paymentTrxId: _paymentTrxId,
        paymentGateway: _paymentGateway,
        paymentMethod: _paymentMethod,
        voucherCode: _voucherCode,
        product,
        guestContact: _guestContact,
        targetId,
        paymentUrl,
        paymentNo,
        paymentDeeplink,
        sn,
        ...rest
    } = trx;

    const paymentLabel = trx.paymentChannel ?? trx.paymentMethod;

    const publicTrx: RecordLike = {
        ...rest,
        status,
        guestContact: maskGuestContact(trx as { userId?: string | null; guestContact?: string | null }, isOwner),
        targetId: maskTargetId(String(targetId || ''), isOwner),
        paymentChannel: paymentLabel,
        paymentMethod: paymentLabel,
    };

    if (product && typeof product === 'object') {
        const p = product as RecordLike;
        publicTrx.product = {
            name: p.name,
            price_sell: p.price_sell,
        };
    }

    if (isPending) {
        if (paymentNo) {
            publicTrx.paymentNo = paymentNo;
        } else if (paymentUrl) {
            publicTrx.paymentUrl = paymentUrl;
        }
        if (paymentDeeplink && !paymentNo) {
            publicTrx.paymentDeeplink = paymentDeeplink;
        }
    }

    if (sn) {
        publicTrx.sn = sn;
    }

    return publicTrx;
}

export function sanitizeTransactionsForPublic(
    transactions: RecordLike[],
    options: PublicTransactionOptions = {},
) {
    return transactions.map((t) => sanitizeTransactionForPublic(t, options));
}

export function toPublicTransactionResponse(
    trx: RecordLike,
    options: PublicTransactionOptions & { overrides?: RecordLike } = {},
) {
    const { overrides, ...sanitizeOptions } = options;
    return sanitizeTransactionForPublic({ ...trx, ...overrides }, sanitizeOptions);
}

/** Checkout create response — no gateway/vendor internals. */
export function toPublicCheckoutResponse(payload: {
    id?: string;
    invoice: string;
    status?: string;
    paymentUrl?: string | null;
    paymentDeeplink?: string | null;
    paymentNo?: string | null;
    paymentName?: string | null;
    expired?: number | null;
    productName?: string;
    amount: number;
    basePrice?: number;
    adminFee?: number;
    discountAmount?: number;
}) {
    const hasQris = Boolean(payload.paymentNo);
    const data: RecordLike = {
        ...(payload.id ? { id: payload.id } : {}),
        invoice: payload.invoice,
        ...(payload.status ? { status: payload.status } : {}),
        paymentName: payload.paymentName ?? null,
        expired: payload.expired ?? null,
        ...(payload.productName ? { productName: payload.productName } : {}),
        amount: payload.amount,
        ...(payload.basePrice != null ? { basePrice: payload.basePrice } : {}),
        ...(payload.adminFee != null ? { adminFee: payload.adminFee } : {}),
        ...(payload.discountAmount != null ? { discountAmount: payload.discountAmount } : {}),
    };

    if (hasQris) {
        data.paymentNo = payload.paymentNo;
    } else {
        if (payload.paymentUrl) data.paymentUrl = payload.paymentUrl;
        if (payload.paymentDeeplink) data.paymentDeeplink = payload.paymentDeeplink;
    }

    return data;
}
