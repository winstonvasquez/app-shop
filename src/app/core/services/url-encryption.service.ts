import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';

@Injectable({ providedIn: 'root' })
export class UrlEncryptionService {
    private readonly SECRET_KEY = 'shop_secret_k3y!';

    encrypt(id: number): string {
        const encrypted = CryptoJS.AES.encrypt(id.toString(), this.SECRET_KEY).toString();
        // Make it URL-safe
        return encrypted.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    decrypt(encryptedId: string): number | null {
        try {
            // Restore Base64 characters
            const restored = encryptedId.replace(/-/g, '+').replace(/_/g, '/');
            const bytes = CryptoJS.AES.decrypt(restored, this.SECRET_KEY);
            const decrypted = bytes.toString(CryptoJS.enc.Utf8);
            const id = parseInt(decrypted, 10);
            return isNaN(id) ? null : id;
        } catch {
            return null;
        }
    }
}
