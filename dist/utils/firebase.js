"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initFirebase = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const initFirebase = () => {
    const serviceAccount = require('../../src/data/firebase-key.json');
    firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.cert(serviceAccount),
    });
};
exports.initFirebase = initFirebase;
