import FlexSearch from 'flexsearch';
import { Product } from '../types';

export interface SearchResultItem {
  id: string;
  score?: number;
}

export interface SearchSuggestions {
  products: Product[];
  tags: string[];
  categories: string[];
  retailers: string[];
  totalMatches: number;
  searchTimeMs: number;
}

class ProductSearchIndex {
  private documentIndex: any = null;
  private productsMap: Map<string, Product> = new Map();
  private isIndexed: boolean = false;
  private lastIndexedCount: number = 0;
  private lastIndexTime: number = 0;

  constructor() {
    this.initIndex();
  }

  private initIndex() {
    try {
      // FlexSearch Document index with multiple fields, weights, and fast tokenizers
      // @ts-ignore
      this.documentIndex = new (FlexSearch.Document || (FlexSearch as any).default?.Document || FlexSearch)({
        document: {
          id: 'id',
          index: [
            {
              field: 'name',
              tokenize: 'forward',
              optimize: true,
              resolution: 9,
            },
            {
              field: 'tags',
              tokenize: 'forward',
              optimize: true,
              resolution: 8,
            },
            {
              field: 'category',
              tokenize: 'forward',
              optimize: true,
              resolution: 7,
            },
            {
              field: 'subcategory',
              tokenize: 'forward',
              optimize: true,
              resolution: 6,
            },
            {
              field: 'retailer',
              tokenize: 'forward',
              optimize: true,
              resolution: 5,
            },
            {
              field: 'shortDescription',
              tokenize: 'forward',
              optimize: true,
              resolution: 4,
            },
            {
              field: 'detailedNotes',
              tokenize: 'forward',
              optimize: true,
              resolution: 3,
            },
          ],
        },
        charset: 'latin:extra',
        cache: 100,
      });
    } catch (e) {
      console.warn('FlexSearch Document initialization fallback:', e);
      // Fallback to simple Index if Document has different construct in environment
      try {
        // @ts-ignore
        this.documentIndex = new (FlexSearch.Index || (FlexSearch as any).default?.Index || FlexSearch)({
          tokenize: 'forward',
          cache: true,
        });
      } catch (err2) {
        console.error('FlexSearch init error:', err2);
      }
    }
  }

  /**
   * Rebuild the entire index from a list of products
   */
  public buildIndex(products: Product[]): { count: number; timeMs: number } {
    const startTime = performance.now();
    this.productsMap.clear();
    this.initIndex();

    for (const product of products) {
      this.productsMap.set(product.id, product);
      this.indexProduct(product);
    }

    this.isIndexed = true;
    this.lastIndexedCount = products.length;
    this.lastIndexTime = Date.now();
    const timeMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      count: products.length,
      timeMs,
    };
  }

  /**
   * Index or update a single product
   */
  public addOrUpdate(product: Product) {
    this.productsMap.set(product.id, product);
    if (!this.documentIndex) return;

    try {
      this.documentIndex.remove(product.id);
    } catch {
      // Ignore if not present
    }

    this.indexProduct(product);
    this.lastIndexedCount = this.productsMap.size;
  }

  /**
   * Remove a product from the index
   */
  public remove(productId: string) {
    this.productsMap.delete(productId);
    if (this.documentIndex) {
      try {
        this.documentIndex.remove(productId);
      } catch (e) {
        console.error('Error removing from index:', e);
      }
    }
    this.lastIndexedCount = this.productsMap.size;
  }

  private indexProduct(product: Product) {
    if (!this.documentIndex) return;

    try {
      if (typeof this.documentIndex.add === 'function') {
        // Document index format
        const doc = {
          id: product.id,
          name: product.name || '',
          tags: Array.isArray(product.tags) ? product.tags.join(' ') : (product.tags || ''),
          category: product.category || '',
          subcategory: product.subcategory || '',
          retailer: product.retailer || '',
          shortDescription: product.shortDescription || '',
          detailedNotes: product.detailedNotes || '',
        };
        this.documentIndex.add(doc);
      }
    } catch (e) {
      // If single index fallback
      try {
        const fullText = `${product.name} ${product.category} ${product.subcategory || ''} ${(product.tags || []).join(' ')} ${product.retailer} ${product.shortDescription || ''}`;
        this.documentIndex.add(product.id, fullText);
      } catch (err) {
        console.warn('Failed to index item:', product.id, err);
      }
    }
  }

  /**
   * Search query returning ranked matching product IDs with sub-millisecond execution
   */
  public search(query: string, limit: number = 100): { ids: string[]; searchTimeMs: number } {
    if (!query || !query.trim()) {
      return { ids: Array.from(this.productsMap.keys()), searchTimeMs: 0 };
    }

    const trimmed = query.trim().toLowerCase();
    const startTime = performance.now();
    const matchedIdsSet = new Set<string>();

    if (this.documentIndex) {
      try {
        // Perform search across indexed document fields
        const rawResults = this.documentIndex.search(trimmed, { limit, enrich: false });

        if (Array.isArray(rawResults)) {
          for (const item of rawResults) {
            if (typeof item === 'string' || typeof item === 'number') {
              matchedIdsSet.add(String(item));
            } else if (item && item.result && Array.isArray(item.result)) {
              // FlexSearch Document format returns array of field objects: [{ field: 'name', result: ['id1', 'id2'] }]
              for (const id of item.result) {
                matchedIdsSet.add(String(id));
              }
            }
          }
        }
      } catch (e) {
        console.warn('FlexSearch runtime query error, using fallback:', e);
      }
    }

    // High performance fuzzy/partial substring fallback if FlexSearch returned very few or index was cold
    if (matchedIdsSet.size === 0) {
      const terms = trimmed.split(/\s+/).filter(Boolean);
      for (const [id, product] of this.productsMap.entries()) {
        const name = (product.name || '').toLowerCase();
        const cat = (product.category || '').toLowerCase();
        const sub = (product.subcategory || '').toLowerCase();
        const tags = (product.tags || []).map(t => t.toLowerCase());
        const desc = (product.shortDescription || '').toLowerCase();
        const retailer = (product.retailer || '').toLowerCase();

        const allTermsMatch = terms.every(term => 
          name.includes(term) ||
          cat.includes(term) ||
          sub.includes(term) ||
          tags.some(t => t.includes(term)) ||
          desc.includes(term) ||
          retailer.includes(term)
        );

        if (allTermsMatch) {
          matchedIdsSet.add(id);
          if (matchedIdsSet.size >= limit) break;
        }
      }
    }

    const searchTimeMs = Math.round((performance.now() - startTime) * 100) / 100;
    return {
      ids: Array.from(matchedIdsSet),
      searchTimeMs,
    };
  }

  /**
   * Fast Auto-Suggest & Live Search Previews
   */
  public getSuggestions(query: string, maxItems: number = 5): SearchSuggestions {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return {
        products: [],
        tags: [],
        categories: [],
        retailers: [],
        totalMatches: 0,
        searchTimeMs: 0,
      };
    }

    const { ids, searchTimeMs } = this.search(trimmed, 50);
    const matchingProducts: Product[] = [];
    const foundTags = new Set<string>();
    const foundCats = new Set<string>();
    const foundRetailers = new Set<string>();

    for (const id of ids) {
      const prod = this.productsMap.get(id);
      if (prod) {
        if (matchingProducts.length < maxItems) {
          matchingProducts.push(prod);
        }
        if (prod.category && prod.category.toLowerCase().includes(trimmed)) {
          foundCats.add(prod.category);
        }
        if (prod.retailer && prod.retailer.toLowerCase().includes(trimmed)) {
          foundRetailers.add(prod.retailer);
        }
        for (const t of (prod.tags || [])) {
          if (t.toLowerCase().includes(trimmed)) {
            foundTags.add(t);
          }
        }
      }
    }

    return {
      products: matchingProducts,
      tags: Array.from(foundTags).slice(0, 5),
      categories: Array.from(foundCats).slice(0, 4),
      retailers: Array.from(foundRetailers).slice(0, 4),
      totalMatches: ids.length,
      searchTimeMs,
    };
  }

  /**
   * Get stats about index size and health
   */
  public getStats() {
    return {
      isIndexed: this.isIndexed,
      totalIndexed: this.productsMap.size,
      lastIndexedCount: this.lastIndexedCount,
      lastIndexTime: this.lastIndexTime ? new Date(this.lastIndexTime).toLocaleTimeString() : 'Never',
    };
  }
}

export const searchIndex = new ProductSearchIndex();
