import { Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NewAddressForm } from '../../core/address.model';
import { ApiService } from '../../core/api.service';
import { AutocompleteInput } from '../autocomplete-input/autocomplete-input';

export const emptyAddressForm: NewAddressForm = { label: '', houseNumber: '', street: '', village: '', city: '', province: '', postalCode: '' };

interface GeoProvince {
  id: number;
  name: string;
}
interface GeoCity extends GeoProvince {
  province: string;
  provinceId: number;
  postalCode?: string;
}
interface GeoBarangay extends GeoProvince {
  city: string;
  cityId: number;
  province: string;
  provinceId: number;
  postalCode?: string;
}
interface GeoStreet {
  street: string;
  village?: string;
  city?: string;
  province?: string;
  postalCode?: string;
}

const qs = (params: Record<string, string | undefined>) =>
  new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '') as [string, string][]).toString();

/**
 * Ported from frontend/src/components/AddressFormFields.jsx — the one copy of the address form,
 * shared by checkout (AddressPicker) and Account → Address (AddressesTab).
 *
 * Province, city and barangay suggest from the PSGC, the official register, served by our own API
 * (GET /geo/*). Streets come from a geocoder and are only as complete as OpenStreetMap is there.
 * Both are advisory: every field still accepts free text.
 */
@Component({
  selector: 'app-address-form-fields',
  imports: [FormsModule, AutocompleteInput],
  templateUrl: './address-form-fields.html',
  styleUrl: './address-form-fields.css',
  // Spaces its own rows: a parent's space-y-* only reaches this host element, not its children.
  host: { class: 'block space-y-4' },
})
export class AddressFormFields {
  private api = inject(ApiService);

  readonly form = input.required<NewAddressForm>();
  readonly formChange = output<NewAddressForm>();

  set(patch: Partial<NewAddressForm>): void {
    this.formChange.emit({ ...this.form(), ...patch });
  }

  /** Picking a barangay or a city settles which province it is in, so the parent fields follow.
   *  The postal code is only written over when it is blank or was itself filled in this way — a
   *  code typed by hand is more likely to be right about a specific barangay than our table is. */
  private fillFrom(patch: Partial<NewAddressForm>): void {
    const form = this.form();
    const next = { ...form, ...patch };
    if (patch.postalCode && form.postalCode && !form.postalCodeAuto) next.postalCode = form.postalCode;
    next.postalCodeAuto = patch.postalCode ? next.postalCode === patch.postalCode : form.postalCodeAuto;
    this.formChange.emit(next);
  }

  // Errors deliberately propagate: AutocompleteInput tells a failed lookup apart from one that
  // legitimately found nothing, and says something different about each.
  private search<T>(path: string, params: Record<string, string | undefined>): Promise<T[]> {
    return this.api.get<T[]>(`/geo/${path}?${qs(params)}`);
  }

  // Arrow properties, so each keeps `this` when the child component calls it.
  protected readonly searchStreets = (q: string) =>
    this.search<GeoStreet>('streets', { q, city: this.form().city, province: this.form().province });
  protected readonly searchBarangays = (q: string) =>
    this.search<GeoBarangay>('barangays', { q, city: this.form().city, province: this.form().province });
  protected readonly searchCities = (q: string) => this.search<GeoCity>('cities', { q, province: this.form().province });
  protected readonly searchProvinces = (q: string) => this.search<GeoProvince>('provinces', { q });

  protected readonly streetLabel = (s: GeoStreet) => s.street;
  protected readonly streetDescription = (s: GeoStreet) => [s.village, s.city, s.province].filter(Boolean).join(', ');
  protected readonly barangayDescription = (b: GeoBarangay) => `${b.city}, ${b.province}`;
  protected readonly cityDescription = (c: GeoCity) => c.province;

  /** A geocoded street names its barangay, city and province the way OpenStreetMap does
   *  ("Antipolo", not the register's "City of Antipolo"), so it only fills fields still empty. */
  onStreetPicked(s: GeoStreet): void {
    const form = this.form();
    this.fillFrom({
      street: s.street,
      ...(form.village ? {} : { village: s.village || '' }),
      ...(form.city ? {} : { city: s.city || '' }),
      ...(form.province ? {} : { province: s.province || '' }),
      ...(s.postalCode ? { postalCode: s.postalCode } : {}),
    });
  }

  onBarangayPicked(b: GeoBarangay): void {
    this.fillFrom({ village: b.name, city: b.city, province: b.province, postalCode: b.postalCode });
  }

  onCityPicked(c: GeoCity): void {
    this.fillFrom({ city: c.name, province: c.province, postalCode: c.postalCode });
  }

  onProvincePicked(p: GeoProvince): void {
    this.set({ province: p.name });
  }

  /** Typing here marks the code as the customer's own, so a later pick leaves it alone. */
  onPostalCodeInput(value: string): void {
    this.set({ postalCode: value, postalCodeAuto: false });
  }
}
