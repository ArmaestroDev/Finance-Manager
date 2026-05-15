// The Add-transaction modal is a single shared, responsive Sheet-based
// implementation (bottom sheet on native, centered dialog on web). The mobile
// variant re-exports it so both the mobile screen and any older mobile-path
// imports land on the modern Sheet + Field design — no divergent legacy copy.
export { AddTransactionModal } from "../AddTransactionModal";
