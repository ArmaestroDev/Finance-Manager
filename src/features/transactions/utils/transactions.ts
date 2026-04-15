import { type Transaction } from "../../../services/enableBanking";

export const getStableTxId = (tx: Transaction) => {
    return (
        tx.transaction_id ||
        `gen_${tx.booking_date || ""}_${tx.transaction_amount.amount}_${tx.creditor?.name || tx.debtor?.name || ""}`
    );
};

export const getTransactionAmount = (tx: Transaction) => {
    let amount = parseFloat(tx.transaction_amount.amount);

    if (tx.credit_debit_indicator === "DBIT") {
        return amount > 0 ? -amount : amount;
    }
    if (tx.credit_debit_indicator === "CRDT") {
        return amount < 0 ? -amount : amount;
    }

    // Fallback: If no indicator but there is a creditor (and no debtor), it's a payment we made
    if (amount > 0 && tx.creditor?.name && !tx.debtor?.name) {
        return -amount;
    }

    return amount;
};
