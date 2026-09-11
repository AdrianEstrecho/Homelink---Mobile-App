import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideArchive,
  LucideArchiveRestore,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideTrash2,
  LucideUploadCloud,
  LucideX,
} from '@lucide/angular';

import { AdminCategory, AdminProduct } from '../../../core/admin.model';
import { ApiService } from '../../../core/api.service';
import { formatPrice } from '../../../core/format.util';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { SafeImage } from '../../../shared/safe-image/safe-image';
import { Select, SelectOption } from '../../../shared/select/select';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_MB = 5;
const PAGE_SIZE = 10;

interface ProductForm {
  name: string;
  brand: string;
  description: string;
  mainCategoryId: string;
  subcategoryId: string;
  status: 'active' | 'inactive';
  stock: string;
  addStock: string;
  price: string;
  discount: string;
  image: string;
  featured: boolean;
}

const emptyForm: ProductForm = {
  name: '',
  brand: '',
  description: '',
  mainCategoryId: '',
  subcategoryId: '',
  status: 'active',
  stock: '',
  addStock: '',
  price: '',
  discount: '',
  image: '',
  featured: false,
};

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
 * The desktop table becomes a card list; the inline "+ Add new subcategory"
 * prompt from Select.jsx isn't ported (see PromptDialog note in the plan) —
 * use the web admin for category management, this picks from existing ones.
 */
@Component({
  selector: 'app-admin-products',
  imports: [FormsModule, ConfirmDialog, SafeImage, Select, LucideSearch, LucidePlus, LucidePencil, LucideArchive, LucideArchiveRestore, LucideTrash2, LucideX, LucideUploadCloud],
  templateUrl: './admin-products.html',
  styleUrl: './admin-products.css',
})
export class AdminProducts {
  private api = inject(ApiService);

  protected readonly formatPrice = formatPrice;

  protected readonly products = signal<AdminProduct[]>([]);
  protected readonly categories = signal<AdminCategory[]>([]);
  protected readonly tab = signal<'active' | 'archived'>('active');
  protected readonly search = signal('');
  protected readonly categoryFilter = signal('');
  protected readonly visibleCount = signal(PAGE_SIZE);

  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly form = signal<ProductForm>(emptyForm);
  protected readonly error = signal('');
  protected readonly notice = signal('');
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
    ];
  });

  protected readonly statusOptions: SelectOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  private load(): void {
    this.api.get<AdminProduct[]>('/admin/products').then((p) => this.products.set(p)).catch(() => {});
    this.api.get<AdminCategory[]>('/admin/categories').then((c) => this.categories.set(c)).catch(() => {});
  }

  constructor() {
    this.load();
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

  startAdd(): void {
    this.form.set({ ...emptyForm });
    this.editingId.set(null);
    this.error.set('');
    this.notice.set('');
    this.showForm.set(true);
  }

  startEdit(p: AdminProduct): void {
    this.form.set({
      name: p.name,
      brand: p.brand ?? '',
      description: p.description ?? '',
      mainCategoryId: p.main_category_id ?? '',
      subcategoryId: p.category_parent_id ? p.category_id : '',
      status: p.status === 'inactive' ? 'inactive' : 'active',
      stock: String(p.stock),
      addStock: '',
      price: String(p.price),
      discount: String(p.discount || 0),
      image: p.image || '',
      featured: !!p.featured,
    });
    this.editingId.set(p.id);
    this.error.set('');
    this.notice.set('');
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.form.set({ ...emptyForm });
    this.error.set('');
  }

  patchForm(patch: Partial<ProductForm>): void {
    this.form.update((f) => ({ ...f, ...patch }));
  }

  onMainCategoryChange(mainCategoryId: string): void {
    this.patchForm({ mainCategoryId, subcategoryId: '' });
  }

  handleFile(file: File | null | undefined): void {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      this.error.set('Please upload a JPG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      this.error.set(`Image must be smaller than ${MAX_IMAGE_MB}MB.`);
      return;
    }
    this.error.set('');
    const reader = new FileReader();
    reader.onload = () => this.patchForm({ image: String(reader.result) });
    reader.readAsDataURL(file);
  }

  onFileInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.handleFile(input.files?.[0]);
    input.value = '';
  }

  submitForm(): void {
    this.error.set('');
    if (!this.form().mainCategoryId) {
      this.error.set('Select a main category.');
      return;
    }
    this.confirmSaveOpen.set(true);
  }

  async doSubmit(): Promise<void> {
    this.confirmSaveOpen.set(false);
    const f = this.form();
    const editingId = this.editingId();
    const categoryId = f.subcategoryId || f.mainCategoryId;
    const addQty = Number(f.addStock) || 0;
    const payload: Record<string, unknown> = {
      name: f.name,
      categoryId,
      description: f.description,
      price: Number(f.price),
      image: f.image,
      brand: f.brand,
      discount: Number(f.discount) || 0,
      status: f.status,
      featured: f.featured,
      specifications: {},
    };
    if (editingId) payload['addStock'] = addQty;
    else payload['stock'] = Number(f.stock);

    try {
      if (editingId) {
        await this.api.put(`/admin/products/${editingId}`, payload);
      } else {
        await this.api.post('/admin/products', { ...payload, slug: slugify(f.name) });
      }
      this.cancelForm();
      this.notice.set('');
      this.load();
    } catch (err) {
      this.error.set((err as Error).message);
    }
  }

  async archive(id: string): Promise<void> {
    await this.api.put(`/admin/products/${id}/archive`);
    this.load();
  }

  async restore(id: string): Promise<void> {
    await this.api.put(`/admin/products/${id}/restore`);
    this.load();
  }

  async remove(id: string): Promise<void> {
    try {
      await this.api.delete(`/admin/products/${id}`);
      this.notice.set('');
      this.load();
    } catch (err) {
      this.pageError.set((err as Error).message);
    }
  }

  confirmArchive(): void {
    const id = this.confirmArchiveId();
    if (id) this.archive(id);
    this.confirmArchiveId.set(null);
  }

  confirmDelete(): void {
    const id = this.confirmDeleteId();
    this.notice.set('');
    this.pageError.set('');
    if (id) this.remove(id);
    this.confirmDeleteId.set(null);
  }
}
