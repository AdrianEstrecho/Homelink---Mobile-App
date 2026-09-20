/**
 * Editorial content for the four "Discover HomeLink" pages. It lives in one
 * file (rather than inline in each template) because the same figures appear
 * on more than one page — the stat strip on the hub and on Company History,
 * the service categories on the hub and on About Our Services — and because
 * this is the copy most likely to need updating without touching layout.
 *
 * The service categories and the order/booking stages below mirror what the
 * backend actually ships (backend/db/seed.js, tracking-modal.ts). The
 * founding narrative and milestone years are marketing copy — review them
 * before this goes in front of anyone who will take them as fact.
 */

export interface AboutStat {
  value: string;
  label: string;
}

export const ABOUT_STATS: AboutStat[] = [
  { value: '10,000+', label: 'Homeowners served' },
  { value: '500+', label: 'Products listed' },
  { value: '50+', label: 'Verified technicians' },
  { value: '4.8/5', label: 'Average rating' },
];

export type AboutIcon =
  | 'shield'
  | 'sparkles'
  | 'handshake'
  | 'target'
  | 'wrench'
  | 'truck'
  | 'clock'
  | 'star'
  | 'gem'
  | 'compass';

export interface AboutValue {
  icon: AboutIcon;
  title: string;
  desc: string;
}

export const ABOUT_VALUES: AboutValue[] = [
  {
    icon: 'shield',
    title: 'Trust, verified',
    desc: 'Every technician on HomeLink is background-checked and trained before they ever step into your home.',
  },
  {
    icon: 'sparkles',
    title: 'Quality first',
    desc: 'We curate products from brands we trust, and hold every installation to the same high standard.',
  },
  {
    icon: 'handshake',
    title: 'Customer-obsessed',
    desc: 'From browsing to booking to follow-up, every step is designed around what makes your life easier.',
  },
  {
    icon: 'target',
    title: 'One platform',
    desc: 'Products and professional installation in one place, so you never coordinate between vendors again.',
  },
];

/* --- Company history -------------------------------------------------- */

export interface Milestone {
  year: string;
  title: string;
  desc: string;
  /** Rendered as the accent on the timeline node. */
  accent: 'orange' | 'teal' | 'navy';
}

export const MILESTONES: Milestone[] = [
  {
    year: '2021',
    title: 'The gap we kept hitting',
    desc: 'Buying an air conditioner was easy. Finding someone reliable to install it — on time, without surprises — was the hard part. HomeLink began as a list of the vendors we wished existed.',
    accent: 'navy',
  },
  {
    year: '2022',
    title: 'HomeLink opens its doors',
    desc: 'We launched with a small catalogue of air conditioning, electrical and plumbing essentials, and a handful of installers we had personally worked with.',
    accent: 'navy',
  },
  {
    year: '2023',
    title: 'The verified technician network',
    desc: 'Background checks, skills assessment and a published rating became a requirement, not a nice-to-have. Fifty technicians cleared the bar in the first year.',
    accent: 'teal',
  },
  {
    year: '2024',
    title: 'Buy it and book it together',
    desc: 'Products and professional service met in one checkout. Order a unit and schedule the installer who will fit it in the same session, on the date you choose.',
    accent: 'teal',
  },
  {
    year: '2025',
    title: 'Tracked from tap to done',
    desc: 'Live order tracking, technician assignment updates and secure online payment through card, GCash, QR Ph and bank transfer — so nothing after checkout is a mystery.',
    accent: 'orange',
  },
  {
    year: '2026',
    title: 'HomeLink in your pocket',
    desc: 'The full marketplace arrives on Android: browse, book, pay and track a job from the phone already in your hand.',
    accent: 'orange',
  },
];

/* --- Services --------------------------------------------------------- */

export interface ServicePillar {
  /** Matches the `category` column on the services table (backend/db/seed.js). */
  category: string;
  tagline: string;
  examples: string[];
  accent: 'orange' | 'teal' | 'navy' | 'blue';
}

export const SERVICE_PILLARS: ServicePillar[] = [
  {
    category: 'Air Conditioning',
    tagline: 'Installed, cleaned and repaired by AC specialists.',
    examples: ['Split & window installation', 'Deep coil and filter cleaning', 'Diagnosis and refrigerant refill'],
    accent: 'teal',
  },
  {
    category: 'Solar Energy',
    tagline: 'From first panel to grid connection, and the upkeep after.',
    examples: ['Full system installation', 'Grid connection', 'Panel cleaning & inverter checks'],
    accent: 'orange',
  },
  {
    category: 'Security',
    tagline: 'Cameras that are mounted properly and actually record.',
    examples: ['Camera mounting & cabling', 'NVR / DVR setup', 'Troubleshooting and repair'],
    accent: 'navy',
  },
  {
    category: 'Electrical',
    tagline: 'Licensed work on the parts of your home you should not guess at.',
    examples: ['Wiring, outlets & switches', 'Breaker panel installation', 'Fault finding and outages'],
    accent: 'blue',
  },
  {
    category: 'Plumbing',
    tagline: 'Fixtures fitted right, leaks found fast.',
    examples: ['Pipe fitting & water lines', 'Fixture installation', 'Leak repair and clog removal'],
    accent: 'teal',
  },
  {
    category: 'General',
    tagline: 'The routine care that keeps small problems small.',
    examples: ['Scheduled preventive maintenance', 'Home inspection & minor repairs', 'Structural and cosmetic repair'],
    accent: 'navy',
  },
];

export interface ServiceStep {
  title: string;
  desc: string;
}

export const SERVICE_STEPS: ServiceStep[] = [
  { title: 'Pick a service', desc: 'Browse by category and see the base price before you commit to anything.' },
  { title: 'Choose your slot', desc: 'Pick a date and a time from the slots our technicians actually have open.' },
  { title: 'Confirm and pay', desc: 'Pay securely by card, GCash, QR Ph or bank transfer — or settle on completion.' },
  { title: 'Track to completion', desc: 'Follow the job from requested, to technician assigned, to in progress, to done.' },
];

/** Booking stages, mirroring BOOKING_STEPS/BOOKING_LABELS in tracking-modal.ts. */
export const BOOKING_STAGES: string[] = ['Requested', 'Technician assigned', 'In progress', 'Completed'];

export interface ServicePromise {
  icon: AboutIcon;
  title: string;
  desc: string;
}

export const SERVICE_PROMISES: ServicePromise[] = [
  { icon: 'shield', title: 'Verified technicians', desc: 'Background-checked, skills-assessed, and rated by the homeowners they have worked for.' },
  { icon: 'clock', title: 'Slots you choose', desc: 'Real availability, not a callback promise — you pick the date and time that works.' },
  { icon: 'star', title: 'Rated after every job', desc: 'Leave a review once the work is done. Those ratings decide who keeps getting booked.' },
  { icon: 'gem', title: 'Transparent pricing', desc: 'The base price is on the listing. Any variation is discussed before work begins.' },
];

/* --- The app ---------------------------------------------------------- */

export interface AppFeature {
  icon: 'grid' | 'wrench' | 'cart' | 'package' | 'heart' | 'bell' | 'lock' | 'map';
  title: string;
  desc: string;
}

export const APP_FEATURES: AppFeature[] = [
  { icon: 'grid', title: 'The full catalogue', desc: 'Every product, category and specification from the HomeLink storefront, laid out for a phone.' },
  { icon: 'wrench', title: 'Book a technician', desc: 'Choose a service, pick a real open slot, and confirm — in about a minute.' },
  { icon: 'cart', title: 'Cart and secure checkout', desc: 'Promo codes, saved addresses, and payment by card, GCash, QR Ph or bank transfer.' },
  { icon: 'package', title: 'Live tracking', desc: 'Watch an order move from placed to delivered, and a booking from requested to completed, on a map.' },
  { icon: 'heart', title: 'Wishlist and reviews', desc: 'Save what you are considering, and rate the work once a job is finished.' },
  { icon: 'bell', title: 'Notifications you control', desc: 'Order updates, booking updates and promotions are three separate switches.' },
  { icon: 'lock', title: 'Protected account', desc: 'Two-factor sign-in codes by email, password rules that are actually enforced, and session expiry.' },
  { icon: 'map', title: 'Find us', desc: 'Our service location on a map, plus support contacts, without leaving the app.' },
];

export interface TechItem {
  label: string;
  value: string;
}

export const APP_TECH: TechItem[] = [
  { label: 'App framework', value: 'Angular 22 (standalone components, signals)' },
  { label: 'Native shell', value: 'Capacitor 8 — Android' },
  { label: 'Styling', value: 'Tailwind CSS' },
  { label: 'Backend API', value: 'Node.js + Express' },
  { label: 'Database', value: 'PostgreSQL (Supabase)' },
  { label: 'Payments', value: 'PayMongo checkout sessions' },
];

/* --- The team --------------------------------------------------------- */

export interface Developer {
  name: string;
  role: string;
  /** Short first-person-free blurb; keep to roughly one sentence. */
  focus: string;
  /** Contribution areas, shown as chips. */
  tags: string[];
  initials: string;
  accent: 'orange' | 'teal' | 'navy' | 'blue';
}

export const DEVELOPERS: Developer[] = [
  {
    name: 'Adrian Estrecho',
    role: 'Lead Developer',
    focus: 'Built the Express API, the React storefront and admin portal, and this Angular/Capacitor mobile app.',
    tags: ['Backend & API', 'Web frontend', 'Mobile app', 'Database'],
    initials: 'AE',
    accent: 'orange',
  },
  {
    name: 'Aldred Arlan Rapacon',
    role: 'Developer',
    focus: 'Contributed to the project repository, documentation and release setup.',
    tags: ['Documentation', 'Repository setup'],
    initials: 'AR',
    accent: 'teal',
  },
];

export const TEAM_NOTE =
  'HomeLink was built as an academic capstone project — a full marketplace, staff portal and mobile app, designed and shipped end to end by the team behind it.';
