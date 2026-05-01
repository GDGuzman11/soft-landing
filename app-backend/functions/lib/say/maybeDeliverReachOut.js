"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeDeliverReachOut = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
const deliverReachOutForUser_1 = require("./deliverReachOutForUser");
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
exports.maybeDeliverReachOut = (0, https_1.onCall)({ region: 'us-central1', invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to use Say.');
    }
    const uid = request.auth.uid;
    const raw = request.data;
    const offsetHours = typeof raw?.userTimezoneOffset === 'number' ? raw.userTimezoneOffset : 0;
    return (0, deliverReachOutForUser_1.deliverReachOutForUser)(uid, offsetHours, (0, firestore_1.getFirestore)());
});
//# sourceMappingURL=maybeDeliverReachOut.js.map