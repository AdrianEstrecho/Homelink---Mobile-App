import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  LucideArchive,
  LucideArchiveRestore,
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

import { AdminCategory, AdminProduct } from '../../../core/admin.model';
import { ApiService } from '../../../core/api.service';
import { presetsForCategory, specEntries, toHighlights } from '../../../core/catalog-specs.util';
import { currencySymbol, formatPrice } from '../../../core/format.util';
import { validateImageFile } from '../../../core/image-upload.util';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { SafeImage } from '../../../shared/safe-image/safe-image';
import { Select, SelectOption } from '../../../shared/select/select';

const PAGE_SIZE = 10;
const NEW_SUBCATEGORY = '__new__';

// Specifications and highlights are edited as ordered rows, but stored as a label -> value
// object and a string array respectively. Rows carry a client-only id so @for keeps inputs
// focused while rows above them are added or removed (tracking by index would not).
interface SpecRow {
  id: string;
  label: string;
  value: string;
}

interface HighlightRow {
  id: string;
  value: string;
}

interface ProductForm {
  name: string;
  brand: string;
  model: string;
  description: string;
  mainCategoryId: string;
  subcategoryId: string;
  status: 'active' | 'inactive';
  stock: string;
  addStock: string;
  price: string;
  discount: string;
  specs: SpecRow[];
  highlights: HighlightRow[];
  warranty: string;
  image: string;
  featured: boolean;
}

let rowSeq = 0;
const specRow = (label = '', value = ''): SpecRow => ({ id: `s${++rowSeq}`, label, value });
const highlightRow = (value = ''): HighlightRow => ({ id: `h${++rowSeq}`, value });

// A factory rather than a shared constant — the form holds arrays, and reusing one object
// across resets would let two edits share the same rows.
const createEmptyForm = (): ProductForm => ({
  name: '',
  brand: '',
  model: '',
  description: '',
  mainCategoryId: '',
  subcategoryId: '',
  status: 'active',
  stock: '',
  addStock: '',
  price: '',
  discount: '',
  specs: [specRow()],
  highlights: [highlightRow()],
  warranty: '',
  image: '',
  featured: false,
});

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Mobile analog of frontend/src/pages/admin/Products.jsx, admin-only (no
 * inventory_clerk/general_staff approval-request branches — every write here
 * applies immediately, matching the mobile app's admin-only scope decision).
 * The desktop table becomes a card list; the form carries every field the web
 * form does (model, specifications, highlights, warranty), and the PromptDialog
 * behind "+ Add new subcategory..." becomes an inline field under the picker.
 */
@Component({
  selector: 'app-admin-products',
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
    LucideShieldCheck,
    LucideImage,
  ],
  templateUrl: './admin-products.html',
  styleUrl: './admin-products.css',
})
export class AdminProducts {
  private api = inject(ApiService);

  protected readonly formatPrice = formatPrice;
  protected readonly currencySymbol = currencySymbol;

  protected readonly products = signal<AdminProduct[]>([]);
  protected readonly categories = signal<AdminCategory[]>([]);
  protected readonly tab = signal<'active' | 'archived'>('active');
  // The dashboard's stock warning links here as ?search=<product name>, opening on that product.
  protected readonly search = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('search') ?? '');
  protected readonly categoryFilter = signal('');
  protected readonly visibleCount = signal(PAGE_SIZE);

  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly form = signal<ProductForm>(createEmptyForm());
  protected readonly addingSubcategory = signal(false);
  protected readonly newSubcategory = signal('');
  protected readonly creatingSubcategory = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly pageError = signal('');

  protected readonly confirmArchiveId = signal<string | null>(null);
  protected readonly confirmDeleteId = signal<string | null>(null);
  protected readonly confirmSaveOpen = signal(false);

  protected readonly mainCategories = computed(() => this.categories().filter((c) => !c.parent_id));
  protected readonly activeCount = computed(() => this.products().filter((p) => !p.archived).length);
  protected readonly archivedCount = computed(() => this.products().filter((p) => p.archived).length);

  protected readonly byTabAndSearch = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.products()
      .filter((p) => (this.tab() === 'archived' ? p.archived : !p.archived))
      .filter((p) => !q || p.name.toLowerCase().includes(q));
  });

  protected readonly categoryOptions = computed<SelectOption[]>(() => {
    const list = this.byTabAndSearch();
    const opts: SelectOption[] = [{ value: '', label: `All Categories (${list.length})` }];
    for (const mc of this.mainCategories()) {
      const count = list.filter((p) => p.main_category_id === mc.id).length;
      opts.push({ value: mc.id, label: `${mc.name} (${count})` });
    }
    return opts;
  });

  protected readonly filtered = computed(() => {
    const cat = this.categoryFilter();
    const list = this.byTabAndSearch();
    return cat ? list.filter((p) => p.main_category_id === cat) : list;
  });

  protected readonly visible = computed(() => this.filtered().slice(0, this.visibleCount()));

  protected readonly mainCategoryOptions = computed<SelectOption[]>(() =>
    this.mainCategories().map((c) => ({ value: c.id, label: c.name })),
  );

  protected readonly subcategoryOptions = computed<SelectOption[]>(() => {
    const mainId = this.form().mainCategoryId;
    const subs = this.categories().filter((c) => c.parent_id === mainId);
    return [
      { value: '', label: mainId ? 'None' : 'Select main category first' },
      ...subs.map((c) => ({ value: c.id, label: c.name })),
      ...(mainId ? [{ value: NEW_SUBCATEGORY, label: '+ Add new subcategory...' }] : []),
    ];
  });

  protected readonly statusOptions: SelectOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  protected readonly activeMainCategory = computed(() => this.mainCategories().find((c) => c.id === this.form().mainCategoryId));

  protected readonly specSuggestions = computed(() => {
    const used = new Set(this.form().specs.map((s) => s.label.trim().toLowerCase()).filter(Boolean));
    return presetsForCategory(this.activeMainCategory()?.name).filter((label) => !used.has(label.toLowerCase()));
  });

  private load(): void {
    this.api.get<AdminProduct[]>('/admin/products').then((p) => this.products.set(p)).catch(() => {});
    this.loadCategories();
  }

  private loadCategories(): Promise<void> {
    return this.api
      .get<AdminCategory[]>('/admin/categories')
      .then((c) => this.categories.set(c))
      .catch(() => {});
  }

  constructor() {
    this.load();
  }

  specCount(p: AdminProduct): number {
    return specEntries(p.specifications).length;
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

  private openForm(form: ProductForm, editingId: string | null): void {
    this.form.set(form);
    this.editingId.set(editingId);
    this.addingSubcategory.set(false);
    this.newSubcategory.set('');
    this.error.set('');
    this.pageError.set('');
    this.showForm.set(true);
  }

  startAdd(): void {
    this.openForm(createEmptyForm(), null);
  }

  startEdit(p: AdminProduct): void {
    // specEntries humanizes legacy camelCase keys ("energyRating" -> "Energy Rating"), so
    // re-saving an older product also tidies up how its labels are stored.
    const specs = specEntries(p.specifications).map((s) => specRow(s.label, s.value));
    const highlights = toHighlights(p.highlights).map((h) => highlightRow(h));
    this.openForm(
      {
        name: p.name,
        brand: p.brand ?? '',
        model: p.model ?? '',
        description: p.description ?? '',
        mainCategoryId: p.main_category_id ?? '',
        subcategoryId: p.category_parent_id ? p.category_id : '',
        status: p.status === 'inactive' ? 'inactive' : 'active',
        stock: String(p.stock),
        addStock: '',
        price: String(p.price),
        discount: String(p.discount || 0),
        specs: specs.length ? specs : [specRow()],
        highlights: highlights.length ? highlights : [highlightRow()],
        warranty: p.warranty ?? '',
        image: p.image || '',
        featured: !!p.featured,
      },
      p.id,
    );
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.form.set(createEmptyForm());
    this.error.set('');
  }

  patchForm(patch: Partial<ProductForm>): void {
    this.form.update((f) => ({ ...f, ...patch }));
  }

  onMainCategoryChange(mainCategoryId: string): void {
    this.addingSubcategory.set(false);
    this.patchForm({ mainCategoryId, subcategoryId: '' });
  }

  onSubcategoryChange(value: string): void {
    if (value === NEW_SUBCATEGORY) {
      this.newSubcategory.set('');
      this.addingSubcategory.set(true);
      return;
    }
    this.addingSubcategory.set(false);
    this.patchForm({ subcategoryId: value });
  }

  async confirmNewSubcategory(): Promise<void> {
    const label = this.newSubcategory().trim();
    const mainId = this.form().mainCategoryId;
    if (!label || !mainId || this.creatingSubcategory()) return;
    // Same name already exists under this category — reuse it instead of creating a duplicate.
    const existing = this.categories().find((c) => c.parent_id === mainId && c.name.trim().toLowerCase() === label.toLowerCase());
    if (existing) {
      this.patchForm({ subcategoryId: existing.id });
      this.addingSubcategory.set(false);
      return;
    }
    this.creatingSubcategory.set(true);
    this.error.set('');
    try {
      const slug = `${slugify(label)}-${Date.now().toString(36)}`;
      const { id } = await this.api.post<{ id: string }>('/admin/categories', { name: label, slug, parentId: mainId });
      await this.loadCategories();
      this.patchForm({ subcategoryId: id });
      this.addingSubcategory.set(false);
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.creatingSubcategory.set(false);
    }
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

  updateHighlight(id: string, value: string): void {
    this.form.update((f) => ({ ...f, highlights: f.highlights.map((h) => (h.id === id ? { ...h, value } : h)) }));
  }

  addHighlight(): void {
    this.form.update((f) => ({ ...f, highlights: [...f.highlights, highlightRow()] }));
  }

  removeHighlight(id: string): void {
    this.form.update((f) => {
      const highlights = f.highlights.filter((h) => h.id !== id);
      return { ...f, highlights: highlights.length ? highlights : [highlightRow()] };
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

  // Admin writes take effect immediately, so the submit gates on an explicit confirmation.
  submitForm(): void {
    this.error.set('');
    const f = this.form();
    if (!f.mainCategoryId) {
      this.error.set('Select a main category.');
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
        this.error.set('Every specification needs a label — one row has a value but no label.');
        return;
      }
      if (!label) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) {
        this.error.set(`"${label}" is listed twice in the specifications. Use a different label for each row.`);
        return;
      }
      seen.add(key);
    }

    this.confirmSaveOpen.set(true);
  }

  async doSubmit(): Promise<void> {
    this.confirmSaveOpen.set(false);
    const f = this.form();
    const editingId = this.editingId();
    const specifications: Record<string, string> = {};
    for (const row of f.specs) {
      const label = row.label.trim();
      const value = row.value.trim();
      if (label && value) specifications[label] = value;
    }
    const payload: Record<string, unknown> = {
      name: f.name,
      categoryId: f.subcategoryId || f.mainCategoryId,
      description: f.description,
      price: Number(f.price),
      image: f.image,
      brand: f.brand,
      model: f.model,
      warranty: f.warranty,
      discount: Number(f.discount) || 0,
      status: f.status,
      featured: f.featured,
      specifications,
      highlights: f.highlights.map((h) => h.value.trim()).filter(Boolean),
    };
    if (editingId) payload['addStock'] = Number(f.addStock) || 0;
    else payload['stock'] = Number(f.stock);

    this.saving.set(true);
    try {
      if (editingId) await this.api.put(`/admin/products/${editingId}`, payload);
      else await this.api.post('/admin/products', { ...payload, slug: slugify(f.name) });
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
    this.run(() => this.api.put(`/admin/products/${id}/restore`));
  }

  confirmArchive(): void {
    const id = this.confirmArchiveId();
    this.confirmArchiveId.set(null);
    if (id) this.run(() => this.api.put(`/admin/products/${id}/archive`));
  }

  confirmDelete(): void {
    const id = this.confirmDeleteId();
    this.confirmDeleteId.set(null);
    if (id) this.run(() => this.api.delete(`/admin/products/${id}`));
  }
}
