import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';

const PAYMONGO_API = 'https://api.paymongo.com/v1';

interface PaymongoDataResponse<T> {
  data: { id: string; type: string; attributes: T };
}

export interface CreatePaymentMethodParams {
  type: 'card' | 'gcash';
  details?: { card_number: string; exp_month: number; exp_year: number; cvc: string };
  billing?: { name?: string; email?: string; phone?: string };
}

export interface AttachPaymentIntentParams {
  paymentIntentId: string;
  paymentMethodId: string;
  clientKey: string;
  returnUrl: string;
}

export interface PaymongoAttachResult {
  status: string;
  nextAction: { redirect?: { url: string } } | null;
  lastPaymentError: { detail?: string } | null;
}

/**
 * Ported from frontend/src/api/paymongo.js — talks directly to PayMongo from
 * the app using the *public* key. Card/GCash details go straight here and
 * never touch our own backend. Uses HttpClient (not plain fetch) so it stays
 * consistent with the rest of the app, but note authTokenInterceptor is
 * scoped to `environment.apiUrl` only, so it correctly never attaches our
 * own JWT to these PayMongo requests.
 */
@Injectable({ providedIn: 'root' })
export class PaymongoService {
  private http = inject(HttpClient);

  private async request<T>(path: string, body: unknown): Promise<{ id: string; attributes: T }> {
    try {
      const res = await firstValueFrom(
        this.http.post<PaymongoDataResponse<T>>(
          `${PAYMONGO_API}${path}`,
          { data: { attributes: body } },
          { headers: { Authorization: 'Basic ' + btoa(`${environment.paymongoPublicKey}:`) } }
        )
      );
      return res.data;
    } catch (e) {
      const err = e as HttpErrorResponse;
      const data = err.error as { errors?: { detail?: string }[] } | null;
      throw new Error(data?.errors?.[0]?.detail || 'Payment request failed');
    }
  }

  async createPaymentMethod(params: CreatePaymentMethodParams): Promise<string> {
    const pm = await this.request<unknown>('/payment_methods', params);
    return pm.id;
  }

  async attachPaymentIntent(params: AttachPaymentIntentParams): Promise<PaymongoAttachResult> {
    const intent = await this.request<{
      status: string;
      next_action?: { redirect?: { url: string } };
      last_payment_error?: { detail?: string };
    }>(`/payment_intents/${params.paymentIntentId}/attach`, {
      payment_method: params.paymentMethodId,
      client_key: params.clientKey,
      return_url: params.returnUrl,
    });
    return {
      status: intent.attributes.status,
      nextAction: intent.attributes.next_action || null,
      lastPaymentError: intent.attributes.last_payment_error || null,
    };
  }
}
