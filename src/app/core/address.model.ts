export interface Address {
  id: string;
  label: string;
  house_number?: string;
  street?: string;
  village?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  is_default: boolean;
  fullAddress: string;
}

export const PROFILE_ADDRESS_ID = '__profile__';

export interface NewAddressForm {
  label: string;
  houseNumber: string;
  street: string;
  village: string;
  city: string;
  province: string;
  postalCode: string;
  /** The postal code was filled in from a picked city/barangay rather than typed — so a later
   *  pick may overwrite it. Ignored by the backend. */
  postalCodeAuto?: boolean;
}
