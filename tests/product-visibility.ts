/**
 * Automated Verification Test Suite for Product Lifecycle & Public Visibility
 * 
 * Run with: npx tsx tests/product-visibility.ts
 */

import http from 'http';

const BASE_URL = 'http://127.0.0.1:3000';

function request(path: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const data = raw ? JSON.parse(raw) : null;
            resolve({ status: res.statusCode || 200, data });
          } catch {
            resolve({ status: res.statusCode || 200, data: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 Starting Automated Product Lifecycle Visibility Tests');
  console.log('======================================================\n');

  // 1. Admin Login
  console.log('Step 1: Authenticating as Admin...');
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@pinfind.com', password: 'PinFind@#5431234' },
  });
  assert(loginRes.status === 200 && Boolean(loginRes.data?.token), 'Admin can login and receives auth token');
  const adminToken = loginRes.data?.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // 2. Create products with distinct lifecycle statuses
  console.log('\nStep 2: Admin creating products across different lifecycle statuses...');
  
  // Create DRAFT product
  const draftRes = await request('/api/admin/products', {
    method: 'POST',
    headers: adminHeaders,
    body: {
      name: 'Test Test Draft Product ' + Date.now(),
      imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46',
      affiliateLink: 'https://example.com/draft-item',
      category: 'Desk Setup',
      status: 'DRAFT',
      price: 1299,
    },
  });
  assert(draftRes.status === 201 && draftRes.data?.product?.status === 'DRAFT', 'Created DRAFT product successfully');
  const draftProd = draftRes.data?.product;

  // Create UNPUBLISHED product
  const unpubRes = await request('/api/admin/products', {
    method: 'POST',
    headers: adminHeaders,
    body: {
      name: 'Test Unpublished Product ' + Date.now(),
      imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46',
      affiliateLink: 'https://example.com/unpub-item',
      category: 'Home Decor',
      status: 'UNPUBLISHED',
      price: 2499,
    },
  });
  assert(unpubRes.status === 201 && unpubRes.data?.product?.status === 'UNPUBLISHED', 'Created UNPUBLISHED product successfully');
  const unpubProd = unpubRes.data?.product;

  // Create ARCHIVED product
  const archRes = await request('/api/admin/products', {
    method: 'POST',
    headers: adminHeaders,
    body: {
      name: 'Test Archived Product ' + Date.now(),
      imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46',
      affiliateLink: 'https://example.com/arch-item',
      category: 'Wellness & Skincare',
      status: 'ARCHIVED',
      price: 899,
    },
  });
  assert(archRes.status === 201 && archRes.data?.product?.status === 'ARCHIVED', 'Created ARCHIVED product successfully');
  const archProd = archRes.data?.product;

  // Create PUBLISHED product
  const pubRes = await request('/api/admin/products', {
    method: 'POST',
    headers: adminHeaders,
    body: {
      name: 'Test Live Published Product ' + Date.now(),
      imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46',
      affiliateLink: 'https://example.com/live-item',
      category: 'Coffee & Kitchen',
      status: 'PUBLISHED',
      price: 3499,
      tags: ['special-test-tag'],
    },
  });
  assert(pubRes.status === 201 && pubRes.data?.product?.status === 'PUBLISHED', 'Created PUBLISHED product successfully');
  const pubProd = pubRes.data?.product;

  // 3. Test Public /api/products Endpoint Visibility Rules
  console.log('\nStep 3: Verifying Public /api/products Endpoint...');
  const publicFeedRes = await request('/api/products');
  assert(publicFeedRes.status === 200 && Array.isArray(publicFeedRes.data?.products), 'Public /api/products returns 200 array');
  const publicProducts: any[] = publicFeedRes.data?.products || [];

  const foundDraft = publicProducts.some((p) => p.id === draftProd.id);
  const foundUnpub = publicProducts.some((p) => p.id === unpubProd.id);
  const foundArch = publicProducts.some((p) => p.id === archProd.id);
  const foundPub = publicProducts.some((p) => p.id === pubProd.id);

  assert(!foundDraft, 'DRAFT product is NOT visible in public feed');
  assert(!foundUnpub, 'UNPUBLISHED product is NOT visible in public feed');
  assert(!foundArch, 'ARCHIVED product is NOT visible in public feed');
  assert(foundPub, 'PUBLISHED product IS visible in public feed');

  const allStrictlyPublished = publicProducts.every((p) => (p.status || '').toUpperCase() === 'PUBLISHED');
  assert(allStrictlyPublished, 'Every single product returned in public feed has status PUBLISHED');

  // 4. Test Single Product Endpoint /api/products/:id
  console.log('\nStep 4: Verifying Single Product Access Rules...');
  const singleDraft = await request(`/api/products/${draftProd.id}`);
  assert(singleDraft.status === 404, 'Direct access to DRAFT product returns 404 Not Found');

  const singleUnpub = await request(`/api/products/${unpubProd.id}`);
  assert(singleUnpub.status === 404, 'Direct access to UNPUBLISHED product returns 404 Not Found');

  const singleArch = await request(`/api/products/${archProd.id}`);
  assert(singleArch.status === 404, 'Direct access to ARCHIVED product returns 404 Not Found');

  const singlePub = await request(`/api/products/${pubProd.id}`);
  assert(singlePub.status === 200 && singlePub.data?.product?.id === pubProd.id, 'Direct access to PUBLISHED product returns 200 with product');

  // 5. Test Status Transition: Publish DRAFT -> Appears on Public Feed
  console.log('\nStep 5: Testing Status Transitions (Publishing DRAFT)...');
  const publishDraftRes = await request(`/api/admin/products/${draftProd.id}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: { status: 'PUBLISHED' },
  });
  assert(publishDraftRes.status === 200 && publishDraftRes.data?.product?.status === 'PUBLISHED', 'Admin published the DRAFT product');

  const publicFeedAfterPublish = await request('/api/products');
  const foundNewlyPublished = (publicFeedAfterPublish.data?.products || []).some((p: any) => p.id === draftProd.id);
  assert(foundNewlyPublished, 'Newly published product immediately appears on public feed');

  // 6. Test Status Transition: Unpublish Live Product -> Disappears from Public Feed
  console.log('\nStep 6: Testing Status Transitions (Unpublishing Live Product)...');
  const unpublishLiveRes = await request(`/api/admin/products/${pubProd.id}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: { status: 'UNPUBLISHED' },
  });
  assert(unpublishLiveRes.status === 200 && unpublishLiveRes.data?.product?.status === 'UNPUBLISHED', 'Admin unpublished the LIVE product');

  const publicFeedAfterUnpublish = await request('/api/products');
  const foundUnpublishedNow = (publicFeedAfterUnpublish.data?.products || []).some((p: any) => p.id === pubProd.id);
  assert(!foundUnpublishedNow, 'Unpublished product immediately disappears from public feed');

  // 7. Test Admin Product Management API
  console.log('\nStep 7: Verifying Admin Products API access (All statuses returned for admin)...');
  const adminProductsRes = await request('/api/admin/products', { headers: adminHeaders });
  assert(adminProductsRes.status === 200 && Array.isArray(adminProductsRes.data?.products), 'Admin can view full catalog');
  const adminProductsList: any[] = adminProductsRes.data?.products || [];
  const adminSeesDraft = adminProductsList.some((p) => p.status === 'DRAFT' || p.id === draftProd.id);
  const adminSeesUnpub = adminProductsList.some((p) => p.status === 'UNPUBLISHED' || p.id === pubProd.id);
  const adminSeesArch = adminProductsList.some((p) => p.status === 'ARCHIVED' || p.id === archProd.id);
  assert(adminSeesDraft && adminSeesUnpub && adminSeesArch, 'Admin can see DRAFT, UNPUBLISHED, and ARCHIVED items in Admin Dashboard');

  // 8. Test Filtering & Tag matching
  console.log('\nStep 8: Verifying Case-Insensitive Filter & Query Matching...');
  const catFilterRes = await request('/api/products?category=desk+setup');
  assert(catFilterRes.status === 200, 'Category filter responds with 200');
  const catMatches = (catFilterRes.data?.products || []).every((p: any) => p.category.toLowerCase() === 'desk setup');
  assert(catMatches, 'Case-insensitive category filter only returns products matching category');

  // Summary
  console.log('\n======================================================');
  console.log(`🏁 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
