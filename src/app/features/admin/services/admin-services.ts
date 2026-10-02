import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideArchive,
  LucideArchiveRestore,
  LucideClipboardList,
  LucideFolderTree,
  LucideImage,
  LucideInfo,
  LucideListChecks,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideShieldCheck,
  LucideSparkles,
  LucideTag,
  LucideTrash2,
  LucideUploadCloud,
  LucideX,
} from '@lucide/angular';

import { AdminService } from '../../../core/admin.model';
import { ApiService } from '../../../core/api.service';
import { presetsForServiceCategory, specEntries, toHighlights } from '../../../core/catalog-specs.util';
import { formatPrice } from '../../../core/format.util';
import { validateImageFile } from '../../../core/image-upload.util';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { SafeImage } from '../../../shared/safe-image/safe-image';
import { Select, SelectOption } from '../../../shared/select/select';

const PAGE_SIZE = 10;
const NEW_CATEGORY = '__new__';

// Service details are edited as ordered rows but stored as a label -> value object and two
// string arrays. Rows carry a client-only id so @for keeps inputs focused while rows above
// them are added or removed (tracking by index would not).
interface SpecRow {
  id: string;
  label: string;
  value: string;
}

interface LineRow {
  id: string;
  value: string;
}

type LineKey = 'highlights' | 'requirements';

interface ServiceForm {
  name: string;
  category: string;
  description: string;
  status: 'active' | 'inactive';
  basePrice: string;
  discount: string;
  durationHours: string;
  specs: SpecRow[];
  highlights: LineRow[];
  requirements: LineRow[];
  warranty: string;
  image: string;
}

let rowSeq = 0;
const specRow = (label = '', value = ''): SpecRow => ({ id: `s${++rowSeq}`, label, value });
const lineRow = (value = ''): LineRow => ({ id: `l${++rowSeq}`, value });

// A factory rather than a shared constant — the form holds arrays, and reusing one object
// across resets would let two edits share the same rows.
const createEmptyForm = (): ServiceForm => ({
  name: '',
  category: '',
  description: '',
  status: 'active',
  basePrice: '',
  discount: '',
  durationHours: '2',
  specs: [specRow()],
  highlights: [lineRow()],
  requirements: [lineRow()],
  warranty: '',
  image: '',
});

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Mobile analog of frontend/src/pages/admin/Services.jsx, admin-only like
 * AdminProducts (no general_staff approval-request branches — every write
 * applies immediately). The desktop table becomes a card list, and the
 * PromptDialog behind "+ Add new category..." becomes an inline text field
 * under the category picker. Categories are plain strings on the service row,
 * so a new one exists as soon as a service is saved under it.
 */
@Component({
  selector: 'app-admin-services',
  imports: [
    FormsModule,
    ConfirmDialog,
    SafeImage,
    Select,
    LucideSearch,
    LucidePlus,
    LucidePencil,
    LucideArchive,
    LucideArchiveRestore,
    LucideTrash2,
    LucideX,
    LucideUploadCloud,
    LucideInfo,
    LucideFolderTree,
    LucideTag,
    LucideListChecks,
    LucideSparkles,
    LucideClipboardList,
    LucideShieldCheck,
    LucideImage,
  ],
  templateUrl: './admin-services.html',
  styleUrl: './admin-services.css',
})
export class AdminServices {
  private api = inject(ApiService);

  protected readonly formatPrice = formatPrice;

  protected readonly services = signal<AdminService[]>([]);
  protected readonly categories = signal<string[]>([]);
  protected readonly tab = signal<'active' | 'archived'>('active');
  protected readonly search = signal('');
  protected readonly categoryFilter = signal('');
  protected readonly visibleCount = signal(PAGE_SIZE);

  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly form = signal<ServiceForm>(createEmptyForm());
  protected readonly addingCategory = signal(false);
  protected readonly newCategory = signal('');
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly pageError = signal('');

  protected readonly confirmArchiveId = signal<string | null>(null);
  protected readonly confirmDeleteId = signal<string | null>(null);

  protected readonly activeCount = computed(() => this.services().filter((s) => !s.archived).length);
  protected readonly archivedCount = computed(() => this.services().filter((s) => s.archived).length);

  protected readonly byTabAndSearch = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.services()
      .filter((s) => (this.tab() === 'archived' ? s.archived : !s.archived))
      .filter((s) => !q || s.name.toLowerCase().includes(q));
  });

  protected readonly categoryFilterOptions = computed<SelectOption[]>(() => {
    const list = this.byTabAndSearch();
    return [
      { value: '', label: `All Categories (${list.length})` },
      ...this.categories().map((cat) => ({ value: cat, label: `${cat} (${list.filter((s) => s.category === cat).length})` })),
    ];
  });

  protected readonly filtered = computed(() => {
    const cat = this.categoryFilter();
    const list = this.byTabAndSearch();
    return cat ? list.filter((s) => s.category === cat) : list;
  });

  protected readonly visible = computed(() => this.filtered().slice(0, this.visibleCount()));

  protected readonly categoryOptions = computed<SelectOption[]>(() => [
    ...this.categories().map((cat) => ({ value: cat, label: cat })),
    { value: NEW_CATEGORY, label: '+ Add new category...' },
  ]);

  protected readonly statusOptions: SelectOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  protected readonly specSuggestions = computed(() => {
    const f = this.form();
    const used = new Set(f.specs.map((s) => s.label.trim().toLowerCase()).filter(Boolean));
    return presetsForServiceCategory(f.category).filter((label) => !used.has(label.toLowerCase()));
  });

  private load(): void {
    this.api.get<AdminService[]>('/admin/services').then((s) => this.services.set(s)).catch(() => {});
    this.api.get<string[]>('/services/categories').then((c) => this.categories.set(c)).catch(() => {});
  }

  constructor() {
    this.load();
  }

  detailCount(s: AdminService): number {
    return specEntries(s.specifications).length;
  }

  setTab(t: 'active' | 'archived'): void {
    this.tab.set(t);
    this.visibleCount.set(PAGE_SIZE);
  }

  setSearch(v: string): void {
    this.search.set(v);
    this.visibleCount.set(PAGE_SIZE);
  }

  setCategoryFilter(v: string): void {
    this.categoryFilter.set(v);
    this.visibleCount.set(PAGE_SIZE);
  }

  loadMore(): void {
    this.visibleCount.update((v) => v + PAGE_SIZE);
  }

  private openForm(form: ServiceForm, editingId: string | null): void {
    this.form.set(form);
    this.editingId.set(editingId);
    this.addingCategory.set(false);
    this.newCategory.set('');
    this.error.set('');
    this.pageError.set('');
    this.showForm.set(true);
  }

  startAdd(): void {
    this.openForm(createEmptyForm(), null);
  }

  startEdit(s: AdminService): void {
    const specs = specEntries(s.specifications).map((row) => specRow(row.label, row.value));
    const highlights = toHighlights(s.highlights).map((v) => lineRow(v));
    const requirements = toHighlights(s.requirements).map((v) => lineRow(v));
    this.openForm(
      {
        name: s.name,
        category: s.category,
        description: s.description || '',
        status: s.status === 'inactive' ? 'inactive' : 'active',
        basePrice: String(s.base_price),
        discount: String(s.discount || 0),
        durationHours: String(s.duration_hours),
        specs: specs.length ? specs : [specRow()],
        highlights: highlights.length ? highlights : [lineRow()],
        requirements: requirements.length ? requirements : [lineRow()],
        warranty: s.warranty || '',
        image: s.image || '',
      },
      s.id,
    );
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.form.set(createEmptyForm());
    this.error.set('');
  }

  patchForm(patch: Partial<ServiceForm>): void {
    this.form.update((f) => ({ ...f, ...patch }));
  }

  onCategoryChange(value: string): void {
    if (value === NEW_CATEGORY) {
      this.newCategory.set('');
      this.addingCategory.set(true);
      return;
    }
    this.addingCategory.set(false);
    this.patchForm({ category: value });
  }

  confirmNewCategory(): void {
    const label = this.newCategory().trim();
    if (!label) return;
    this.categories.update((prev) => (prev.includes(label) ? prev : [...prev, label].sort()));
    this.patchForm({ category: label });
    this.addingCategory.set(false);
  }

  updateSpec(id: string, patch: Partial<SpecRow>): void {
    this.form.update((f) => ({ ...f, specs: f.specs.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  }

  addSpec(label = ''): void {
    this.form.update((f) => ({ ...f, specs: [...f.specs, specRow(label)] }));
  }

  removeSpec(id: string): void {
    this.form.update((f) => {
      const specs = f.specs.filter((s) => s.id !== id);
      return { ...f, specs: specs.length ? specs : [specRow()] };
    });
  }

  updateLine(key: LineKey, id: string, value: string): void {
    this.form.update((f) => ({ ...f, [key]: f[key].map((r) => (r.id === id ? { ...r, value } : r)) }));
  }

  addLine(key: LineKey): void {
    this.form.update((f) => ({ ...f, [key]: [...f[key], lineRow()] }));
  }

  removeLine(key: LineKey, id: string): void {
    this.form.update((f) => {
      const rows = f[key].filter((r) => r.id !== id);
      return { ...f, [key]: rows.length ? rows : [lineRow()] };
    });
  }

  onFileInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const err = validateImageFile(file);
    if (err) {
      this.error.set(err);
      return;
    }
    this.error.set('');
    const reader = new FileReader();
    reader.onload = () => this.patchForm({ image: String(reader.result) });
    reader.readAsDataURL(file);
  }

  async submitForm(): Promise<void> {
    this.error.set('');
    const f = this.form();
    if (!f.category) {
      this.error.set('Select a category.');
      return;
    }

    // A value typed without a label would silently vanish on save, and two rows sharing a
    // label would collapse into one — catch both here rather than letting the object build
    // quietly drop them.
    const seen = new Set<string>();
    for (const row of f.specs) {
      const label = row.label.trim();
      const value = row.value.trim();
      if (!label && value) {
        this.error.set('Every service detail needs a label — one row has a value but no label.');
        return;
      }
      if (!label) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) {
        this.error.set(`"${label}" is listed twice in the service details. Use a different label for each row.`);
        return;
      }
      seen.add(key);
    }

    const specifications: Record<string, string> = {};
    for (const row of f.specs) {
      const label = row.label.trim();
      const value = row.value.trim();
      if (label && value) specifications[label] = value;
    }

    const payload = {
      name: f.name,
      category: f.category,
      description: f.description,
      basePrice: Number(f.basePrice),
      discount: Number(f.discount) || 0,
      durationHours: Number(f.durationHours),
      image: f.image,
      status: f.status,
      warranty: f.warranty,
      specifications,
      highlights: f.highlights.map((r) => r.value.trim()).filter(Boolean),
      requirements: f.requirements.map((r) => r.value.trim()).filter(Boolean),
    };

    const editingId = this.editingId();
    this.saving.set(true);
    try {
      if (editingId) await this.api.put(`/admin/services/${editingId}`, payload);
      else await this.api.post('/admin/services', { ...payload, slug: slugify(f.name) });
      this.cancelForm();
      this.load();
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.saving.set(false);
    }
  }

  private async run(fn: () => Promise<unknown>): Promise<void> {
    this.pageError.set('');
    try {
      await fn();
      this.load();
    } catch (err) {
      this.pageError.set((err as Error).message);
    }
  }

  restore(id: string): void {
    this.run(() => this.api.put(`/admin/services/${id}/restore`));
  }

  confirmArchive(): void {
    const id = this.confirmArchiveId();
    this.confirmArchiveId.set(null);
    if (id) this.run(() => this.api.put(`/admin/services/${id}/archive`));
  }

  confirmDelete(): void {
    const id = this.confirmDeleteId();
    this.confirmDeleteId.set(null);
    if (id) this.run(() => this.api.delete(`/admin/services/${id}`));
  }
}
