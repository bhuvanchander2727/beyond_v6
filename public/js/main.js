// Main application logic for Beyond store

function initBackgroundLayers() {
  if (!document.getElementById('sharpen') && document.body) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';
    svg.innerHTML = '<defs><filter id="sharpen" x="0%" y="0%" width="100%" height="100%"><feConvolveMatrix order="3" kernelMatrix="0 -0.5 0 -0.5 3 -0.5 0 -0.5 0" divisor="1" edgeMode="duplicate"/></filter></defs>';
    document.body.insertBefore(svg, document.body.firstChild);
  }
  if (!document.querySelector('.bg-relief') && document.body) {
    const relief = document.createElement('div');
    relief.className = 'bg-relief';
    relief.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(relief, document.body.firstChild);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initBackgroundLayers();

  // Sync bag count
  if (window.BeyondCart) {
    BeyondCart.updateBagCountUI();
  }

  // Bind footer newsletter
  initNewsletterForm();

  // Route-specific initializers
  const path = window.location.pathname;

  if (path === '/' || path.endsWith('index.html')) {
    initHomePage();
  } else if (path.startsWith('/shop') || path.endsWith('shop.html')) {
    initShopPage();
  } else if (path.startsWith('/product') || path.endsWith('product.html')) {
    initProductPage();
  } else if (path.startsWith('/bag') || path.endsWith('bag.html')) {
    initBagPage();
  } else if (path.startsWith('/checkout') || path.endsWith('checkout.html')) {
    initCheckoutPage();
  } else if (path.startsWith('/confirmation') || path.endsWith('confirmation.html')) {
    initConfirmationPage();
  } else if (path.startsWith('/admin') || path.endsWith('admin.html')) {
    initAdminPage();
  }
});

// Helper to create product tile DOM matching design
function createProductTile(product) {
  const tile = document.createElement('a');
  tile.className = 'tile';
  tile.href = `/product/${product.slug}`;

  const art = document.createElement('div');
  if (product.image_url && product.image_url.trim() !== '') {
    art.className = 'art';
    const img = document.createElement('img');
    img.src = product.image_url;
    img.alt = product.name;
    img.loading = 'lazy';
    art.appendChild(img);
  } else {
    art.className = 'art dots';
    const span = document.createElement('span');
    span.innerHTML = product.tile_label || product.name;
    art.appendChild(span);
  }

  const meta = document.createElement('div');
  meta.className = 'meta';

  const nameSpan = document.createElement('span');
  nameSpan.textContent = product.name;

  const priceSpan = document.createElement('span');
  priceSpan.textContent = BeyondCart.formatINR(product.price);

  meta.appendChild(nameSpan);
  meta.appendChild(priceSpan);

  tile.appendChild(art);
  tile.appendChild(meta);

  return tile;
}

// Newsletter subscription in footer
function initNewsletterForm() {
  const form = document.getElementById('footer-newsletter-form');
  if (!form) return;

  const input = form.querySelector('input[type="email"]');
  const msg = document.getElementById('newsletter-msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (input.value || '').trim();
    if (!email) return;

    if (msg) {
      msg.textContent = 'Subscribing...';
      msg.style.color = 'var(--ink2)';
    }

    try {
      const res = await BeyondAPI.subscribeNewsletter(email);
      if (res.success) {
        input.value = '';
        if (msg) {
          msg.textContent = res.message;
          msg.style.color = 'var(--ink)';
        }
      } else {
        if (msg) {
          msg.textContent = res.error || 'Failed to subscribe.';
          msg.style.color = '#c92a2a';
        }
      }
    } catch (err) {
      if (msg) {
        msg.textContent = 'Network error. Please try again.';
        msg.style.color = '#c92a2a';
      }
    }
  });
}

// Home Page: load new arrivals
async function initHomePage() {
  const grid = document.getElementById('arrivals-grid');
  if (!grid) return;

  try {
    const res = await BeyondAPI.getProducts({ featured: 1, limit: 4 });
    let products = res.products || [];

    // Fallback if no featured products
    if (products.length === 0) {
      const allRes = await BeyondAPI.getProducts({ limit: 4 });
      products = allRes.products || [];
    }

    grid.innerHTML = '';
    products.forEach(p => {
      grid.appendChild(createProductTile(p));
    });
  } catch (err) {
    console.error('Error loading new arrivals:', err);
  }
}

// Shop Page: filtering and sorting
async function initShopPage() {
  const grid = document.getElementById('shop-grid');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const sortSelect = document.getElementById('shop-sort');

  if (!grid) return;

  let currentCategory = 'All';
  let currentSort = 'featured';

  async function loadShopProducts() {
    grid.innerHTML = '<div style="grid-column: 1/-1; padding: 40px 0; color: var(--ink2);">Loading collection...</div>';
    try {
      const res = await BeyondAPI.getProducts({
        category: currentCategory,
        sort: currentSort
      });

      const products = res.products || [];
      grid.innerHTML = '';

      if (products.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; padding: 60px 0; text-align: center; color: var(--ink2);">No garments found in this category.</div>';
        return;
      }

      products.forEach(p => {
        grid.appendChild(createProductTile(p));
      });
    } catch (err) {
      grid.innerHTML = '<div style="grid-column: 1/-1; padding: 60px 0; text-align: center; color: #c92a2a;">Failed to load products. Please refresh.</div>';
    }
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category || 'All';
      loadShopProducts();
    });
  });

  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      currentSort = sortSelect.value;
      loadShopProducts();
    });
  }

  // Initial load
  loadShopProducts();
}

// Product Detail Page
async function initProductPage() {
  const container = document.getElementById('product-view');
  if (!container) return;

  // Extract slug from path (/product/field-overshirt) or query param (?slug=...)
  let slug = window.location.pathname.split('/').filter(Boolean).pop();
  if (slug === 'product' || slug === 'product.html') {
    const urlParams = new URLSearchParams(window.location.search);
    slug = urlParams.get('slug');
  }

  if (!slug) {
    container.innerHTML = '<div class="empty-state"><h3>Product not specified</h3><a class="btn" href="/shop">Browse Shop</a></div>';
    return;
  }

  try {
    const res = await BeyondAPI.getProduct(slug);
    if (!res.success || !res.product) {
      container.innerHTML = '<div class="empty-state"><h3>Product not found</h3><p>The garment you are looking for is no longer available.</p><a class="btn" href="/shop">Back to Shop</a></div>';
      return;
    }

    const p = res.product;
    document.title = `${p.name} — Beyond`;

    // Render Product Detail UI
    container.innerHTML = `
      <div class="product-detail-layout">
        <div class="product-art-large ${p.image_url ? '' : 'dots'}">
          ${p.image_url ? `<img src="${p.image_url}" alt="${p.name}">` : `<span>${p.tile_label}</span>`}
        </div>
        <div class="product-info-panel">
          <div class="product-category-tag">${p.category}</div>
          <h1 class="product-title">${p.name}</h1>
          <div class="product-price">${BeyondCart.formatINR(p.price)}</div>
          <div class="product-desc">${p.description}</div>

          <div class="selector-label">
            <span>Size</span>
            <span id="selected-size-label" style="color:var(--ink2)">Select a size</span>
          </div>
          <div class="sizes-grid" id="sizes-selector">
            ${['XS', 'S', 'M', 'L', 'XL'].map(size => {
              const stock = p[`stock_${size.toLowerCase()}`] || 0;
              const isOut = stock <= 0;
              return `<button type="button" class="size-pill" data-size="${size}" ${isOut ? 'disabled title="Out of stock"' : ''}>${size}</button>`;
            }).join('')}
          </div>

          <div class="selector-label">
            <span>Quantity</span>
          </div>
          <div class="qty-row">
            <div class="qty-stepper">
              <button type="button" class="qty-btn" id="qty-minus" aria-label="Decrease quantity">−</button>
              <span class="qty-val" id="qty-value">1</span>
              <button type="button" class="qty-btn" id="qty-plus" aria-label="Increase quantity">+</button>
            </div>
          </div>

          <button type="button" class="btn add-bag-btn" id="btn-add-bag">Add to bag</button>

          <div class="product-accordion">
            <div class="accordion-item">
              <div class="accordion-head" id="head-fabric">
                <span>Fabric & Care</span>
                <span>+</span>
              </div>
              <div class="accordion-body" id="body-fabric">
                ${p.fabric_care}
              </div>
            </div>
            <div class="accordion-item">
              <div class="accordion-head" id="head-shipping">
                <span>Free Shipping & Returns</span>
                <span>+</span>
              </div>
              <div class="accordion-body" id="body-shipping" style="display:none;">
                We offer complimentary standard shipping across India on all orders. Each item is eligible for free 30-day returns or exchanges provided it is in original unworn condition with tags attached.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Interactive logic
    let selectedSize = null;
    let currentQty = 1;

    const sizeBtns = container.querySelectorAll('.size-pill');
    const sizeLabel = document.getElementById('selected-size-label');
    const addBtn = document.getElementById('btn-add-bag');
    const qtyVal = document.getElementById('qty-value');
    const qtyMinus = document.getElementById('qty-minus');
    const qtyPlus = document.getElementById('qty-plus');

    // Auto-select first in-stock size if available
    const firstAvailable = Array.from(sizeBtns).find(b => !b.disabled);
    if (firstAvailable) {
      firstAvailable.classList.add('selected');
      selectedSize = firstAvailable.dataset.size;
      sizeLabel.textContent = selectedSize;
    }

    sizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        sizeBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedSize = btn.dataset.size;
        sizeLabel.textContent = selectedSize;
      });
    });

    qtyMinus.addEventListener('click', () => {
      if (currentQty > 1) {
        currentQty--;
        qtyVal.textContent = currentQty;
      }
    });

    qtyPlus.addEventListener('click', () => {
      if (!selectedSize) {
        BeyondCart.showToast('Please select a size first.');
        return;
      }
      const maxStock = p[`stock_${selectedSize.toLowerCase()}`] || 99;
      if (currentQty < maxStock) {
        currentQty++;
        qtyVal.textContent = currentQty;
      } else {
        BeyondCart.showToast(`Only ${maxStock} items available in size ${selectedSize}.`);
      }
    });

    addBtn.addEventListener('click', () => {
      if (!selectedSize) {
        BeyondCart.showToast('Please choose a size before adding to bag.');
        return;
      }

      BeyondCart.addToBag({
        productId: p.id,
        slug: p.slug,
        name: p.name,
        size: selectedSize,
        price: p.price,
        quantity: currentQty,
        tile_label: p.tile_label,
        image_url: p.image_url
      });
    });

    // Accordion toggles
    const headFabric = document.getElementById('head-fabric');
    const bodyFabric = document.getElementById('body-fabric');
    const headShipping = document.getElementById('head-shipping');
    const bodyShipping = document.getElementById('body-shipping');

    headFabric.addEventListener('click', () => {
      const isHidden = bodyFabric.style.display === 'none';
      bodyFabric.style.display = isHidden ? 'block' : 'none';
      headFabric.querySelector('span:last-child').textContent = isHidden ? '−' : '+';
    });

    headShipping.addEventListener('click', () => {
      const isHidden = bodyShipping.style.display === 'none';
      bodyShipping.style.display = isHidden ? 'block' : 'none';
      headShipping.querySelector('span:last-child').textContent = isHidden ? '−' : '+';
    });

  } catch (err) {
    console.error('Error rendering product:', err);
    container.innerHTML = '<div class="empty-state"><h3>Unable to load garment</h3><p>An error occurred while fetching product data.</p><a class="btn" href="/shop">Back to Shop</a></div>';
  }
}

// Bag Page: render cart items and summary
function initBagPage() {
  const container = document.getElementById('bag-view');
  if (!container) return;

  function renderBag() {
    const bag = BeyondCart.getBag();

    if (bag.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Your bag is empty</h3>
          <p>Discover our autumn drop of heavy cottons and washed linens.</p>
          <a class="btn" href="/shop">Shop New Arrivals</a>
        </div>
      `;
      return;
    }

    const subtotal = BeyondCart.getBagSubtotal();

    container.innerHTML = `
      <div class="bag-layout">
        <div class="bag-items">
          ${bag.map(item => `
            <div class="bag-item-row" data-id="${item.productId}" data-size="${item.size}">
              <div class="bag-item-thumb ${item.image_url ? '' : 'dots'}">
                ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}">` : `<span>${item.tile_label}</span>`}
              </div>
              <div class="bag-item-details">
                <h4><a href="/product/${item.slug}">${item.name}</a></h4>
                <div class="bag-item-meta">Size: ${item.size} • ${BeyondCart.formatINR(item.price)} each</div>
                <div class="qty-stepper">
                  <button type="button" class="qty-btn bag-qty-minus" data-id="${item.productId}" data-size="${item.size}" aria-label="Decrease quantity">−</button>
                  <span class="qty-val">${item.quantity}</span>
                  <button type="button" class="qty-btn bag-qty-plus" data-id="${item.productId}" data-size="${item.size}" aria-label="Increase quantity">+</button>
                </div>
                <div>
                  <button type="button" class="remove-btn bag-item-remove" data-id="${item.productId}" data-size="${item.size}">Remove</button>
                </div>
              </div>
              <div class="bag-item-price">
                ${BeyondCart.formatINR(item.price * item.quantity)}
              </div>
            </div>
          `).join('')}
        </div>

        <div class="bag-summary-card">
          <h3 style="margin:0 0 20px 0; font-size:1.4rem; font-weight:500;">Order Summary</h3>
          <div class="summary-row">
            <span>Subtotal</span>
            <span>${BeyondCart.formatINR(subtotal)}</span>
          </div>
          <div class="summary-row">
            <span>Shipping</span>
            <span>Free (Domestic)</span>
          </div>
          <div class="summary-row summary-total">
            <span>Total</span>
            <span>${BeyondCart.formatINR(subtotal)}</span>
          </div>
          <a href="/checkout" class="btn checkout-btn">Proceed to Checkout</a>
          <p style="margin:16px 0 0 0; font-size:0.85rem; color:var(--ink2); text-align:center;">
            Complimentary 30-day returns on all orders.
          </p>
        </div>
      </div>
    `;

    // Bind item event listeners
    container.querySelectorAll('.bag-qty-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const size = btn.dataset.size;
        const item = bag.find(i => String(i.productId) === String(id) && i.size === size);
        if (item) {
          BeyondCart.updateQuantity(id, size, item.quantity - 1);
          renderBag();
        }
      });
    });

    container.querySelectorAll('.bag-qty-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const size = btn.dataset.size;
        const item = bag.find(i => String(i.productId) === String(id) && i.size === size);
        if (item) {
          BeyondCart.updateQuantity(id, size, item.quantity + 1);
          renderBag();
        }
      });
    });

    container.querySelectorAll('.bag-item-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const size = btn.dataset.size;
        BeyondCart.removeFromBag(id, size);
        renderBag();
      });
    });
  }

  renderBag();
}

// Checkout Page
function initCheckoutPage() {
  const form = document.getElementById('checkout-form');
  const summaryBox = document.getElementById('checkout-summary-items');
  const totalAmountEl = document.getElementById('checkout-total-amount');

  if (!form) return;

  const bag = BeyondCart.getBag();
  if (bag.length === 0) {
    window.location.href = '/bag';
    return;
  }

  // Render bag summary
  if (summaryBox) {
    summaryBox.innerHTML = bag.map(item => `
      <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.95rem;">
        <div>
          <div style="font-weight:500;">${item.name}</div>
          <div style="color:var(--ink2); font-size:0.85rem;">Size ${item.size} × ${item.quantity}</div>
        </div>
        <div>${BeyondCart.formatINR(item.price * item.quantity)}</div>
      </div>
    `).join('');
  }

  if (totalAmountEl) {
    totalAmountEl.textContent = BeyondCart.formatINR(BeyondCart.getBagSubtotal());
  }

  // Payment method card selection
  const paymentCards = document.querySelectorAll('.payment-option-card');
  paymentCards.forEach(card => {
    card.addEventListener('click', () => {
      paymentCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  // Client-side validation & submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let hasErrors = false;
    const clearError = (id) => {
      const el = document.getElementById(`error-${id}`);
      if (el) el.textContent = '';
    };
    const setError = (id, text) => {
      const el = document.getElementById(`error-${id}`);
      if (el) el.textContent = text;
      hasErrors = true;
    };

    ['name', 'email', 'phone', 'address', 'city', 'state', 'pincode'].forEach(clearError);

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const phone = form.phone.value.trim().replace(/\D/g, '');
    const address = form.address.value.trim();
    const city = form.city.value.trim();
    const state = form.state.value.trim();
    const pincode = form.pincode.value.trim().replace(/\D/g, '');
    const paymentMethod = form.paymentMethod.value || 'cod';

    if (!name || name.length < 2) setError('name', 'Please enter your full name');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) setError('email', 'Please enter a valid email address');
    if (!phone || phone.length < 10) setError('phone', 'Please enter a valid 10-digit mobile number');
    if (!address || address.length < 5) setError('address', 'Please enter your complete street address');
    if (!city) setError('city', 'Please enter your city');
    if (!state) setError('state', 'Please enter your state');
    if (!pincode || pincode.length !== 6) setError('pincode', 'Please enter a 6-digit PIN code');

    if (hasErrors) return;

    const submitBtn = document.getElementById('place-order-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing Order...';

    // If Razorpay simulated placeholder is selected
    if (paymentMethod === 'razorpay_placeholder') {
      submitBtn.textContent = 'Opening Secure Gateway...';
      // Simulate Razorpay payment modal with delay
      await new Promise(r => setTimeout(r, 800));
    }

    try {
      const orderPayload = {
        name,
        email,
        phone,
        address,
        city,
        state,
        pincode,
        paymentMethod,
        items: bag.map(i => ({
          productId: i.productId,
          size: i.size,
          quantity: i.quantity
        }))
      };

      const res = await BeyondAPI.createOrder(orderPayload);

      if (res.success && res.order) {
        BeyondCart.clearBag();
        window.location.href = `/confirmation?order=${encodeURIComponent(res.order.order_number)}`;
      } else {
        alert(res.error || 'Failed to place order. Please check stock and try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Place Order';
      }
    } catch (err) {
      console.error('Error placing order:', err);
      alert('A network error occurred. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Place Order';
    }
  });
}

// Confirmation Page
async function initConfirmationPage() {
  const container = document.getElementById('confirmation-view');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const orderNumber = urlParams.get('order');

  if (!orderNumber) {
    container.innerHTML = '<div class="empty-state"><h3>Order Not Found</h3><a class="btn" href="/shop">Continue Shopping</a></div>';
    return;
  }

  container.innerHTML = '<div style="padding: 60px 0; text-align: center; color: var(--ink2);">Retrieving order details...</div>';

  try {
    const res = await BeyondAPI.getOrder(orderNumber);
    if (!res.success || !res.order) {
      container.innerHTML = '<div class="empty-state"><h3>Order Not Found</h3><p>We could not locate the details for this order number.</p><a class="btn" href="/shop">Back to Shop</a></div>';
      return;
    }

    const order = res.order;

    container.innerHTML = `
      <div class="confirmation-card">
        <div class="order-badge">Order Confirmed</div>
        <h2>Thank you, ${order.customer_name}.</h2>
        <p style="font-size:1.05rem; color:var(--ink2); margin-bottom:24px;">
          Your order <b>#${order.order_number}</b> has been received and is being prepared in our workshop. A confirmation has been sent to <b>${order.email}</b>.
        </p>

        <div style="border-top:1px solid var(--line); border-bottom:1px solid var(--line); padding:20px 0; margin-bottom:24px;">
          <h4 style="margin:0 0 14px 0; font-size:1.1rem; font-weight:500;">Garments in this shipment</h4>
          ${order.items.map(item => `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:0.95rem;">
              <span>${item.name} (Size: ${item.size}) × ${item.quantity}</span>
              <span>${BeyondCart.formatINR(item.itemTotal || (item.price * item.quantity))}</span>
            </div>
          `).join('')}
          <div style="display:flex; justify-content:space-between; font-weight:600; margin-top:14px; font-size:1.1rem; padding-top:10px; border-top:1px dashed var(--line);">
            <span>Total Paid</span>
            <span>${BeyondCart.formatINR(order.total_amount)}</span>
          </div>
        </div>

        <div style="margin-bottom:28px; font-size:0.95rem; color:var(--ink2); line-height:1.6;">
          <b>Shipping Address:</b><br>
          ${order.customer_name}<br>
          ${order.address}<br>
          ${order.city}, ${order.state} — ${order.pincode}<br>
          Phone: ${order.phone}
        </div>

        <div style="display:flex; gap:16px; flex-wrap:wrap;">
          <a href="/shop" class="btn">Continue Shopping</a>
          <a href="/" class="btn btn-secondary">Return Home</a>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Error fetching order:', err);
    container.innerHTML = '<div class="empty-state"><h3>Error loading order</h3><a class="btn" href="/shop">Back to Shop</a></div>';
  }
}

// Admin Portal Logic
function initAdminPage() {
  const loginSection = document.getElementById('admin-login-section');
  const dashboardSection = document.getElementById('admin-dashboard-section');
  const loginForm = document.getElementById('admin-login-form');
  const loginError = document.getElementById('admin-login-error');
  const logoutBtn = document.getElementById('admin-logout-btn');

  if (!loginSection || !dashboardSection) return;

  async function checkAuth() {
    const token = BeyondAPI.getAdminToken();
    if (!token) {
      showLogin();
      return;
    }

    try {
      const res = await BeyondAPI.adminVerify();
      if (res.success) {
        showDashboard();
      } else {
        BeyondAPI.clearAdminToken();
        showLogin();
      }
    } catch (e) {
      BeyondAPI.clearAdminToken();
      showLogin();
    }
  }

  function showLogin() {
    loginSection.style.display = 'block';
    dashboardSection.style.display = 'none';
  }

  function showDashboard() {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    loadAdminProducts();
    loadAdminOrders();
    loadAdminSubscribers();
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError.textContent = '';
      const password = loginForm.password.value;

      try {
        const res = await BeyondAPI.adminLogin(password);
        if (res.success && res.token) {
          BeyondAPI.setAdminToken(res.token);
          loginForm.password.value = '';
          showDashboard();
        } else {
          loginError.textContent = res.error || 'Invalid admin password';
        }
      } catch (err) {
        loginError.textContent = 'Server connection error';
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      BeyondAPI.clearAdminToken();
      showLogin();
    });
  }

  // Admin Tab Navigation
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  const tabPanes = document.querySelectorAll('.admin-tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.style.display = 'none');
      btn.classList.add('active');
      const targetPane = document.getElementById(btn.dataset.target);
      if (targetPane) targetPane.style.display = 'block';
    });
  });

  // Modal setup for Add/Edit product
  const modal = document.getElementById('product-modal');
  const productForm = document.getElementById('product-form');
  const openAddBtn = document.getElementById('btn-open-add-product');
  const cancelModalBtn = document.getElementById('btn-cancel-modal');

  if (openAddBtn) {
    openAddBtn.addEventListener('click', () => {
      document.getElementById('modal-title').textContent = 'Add New Garment';
      productForm.reset();
      document.getElementById('product-id').value = '';
      if (productForm.show_in_hero) productForm.show_in_hero.checked = false;
      if (productForm.hero_scale) productForm.hero_scale.value = '1.0';
      modal.classList.add('show');
    });
  }

  if (cancelModalBtn) {
    cancelModalBtn.addEventListener('click', () => {
      modal.classList.remove('show');
    });
  }

  // Handle product form submission
  if (productForm) {
    productForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('product-id').value;

      let imageUrl = productForm.image_url.value.trim();
      const fileInput = document.getElementById('product-image-file');

      // Upload file if selected
      if (fileInput && fileInput.files && fileInput.files[0]) {
        try {
          const uploadRes = await BeyondAPI.adminUploadImage(fileInput.files[0]);
          if (uploadRes.success && uploadRes.url) {
            imageUrl = uploadRes.url;
          }
        } catch (uploadErr) {
          alert('Failed to upload image. Using URL or dotted fallback.');
        }
      }

      // Upload hero cutout if selected
      let heroImage = productForm.hero_image ? productForm.hero_image.value.trim() : '';
      const heroFileInput = document.getElementById('product-hero-image-file');
      if (heroFileInput && heroFileInput.files && heroFileInput.files[0]) {
        try {
          const uploadRes = await BeyondAPI.adminUploadImage(heroFileInput.files[0]);
          if (uploadRes.success && uploadRes.url) {
            heroImage = uploadRes.url;
          }
        } catch (uploadErr) {
          alert('Failed to upload hero image cutout.');
        }
      }

      const productData = {
        name: productForm.name.value.trim(),
        slug: productForm.slug.value.trim(),
        category: productForm.category.value,
        price: parseInt(productForm.price.value, 10),
        tile_label: productForm.tile_label.value.trim(),
        description: productForm.description.value.trim(),
        fabric_care: productForm.fabric_care.value.trim(),
        image_url: imageUrl,
        stock_xs: parseInt(productForm.stock_xs.value, 10) || 0,
        stock_s: parseInt(productForm.stock_s.value, 10) || 0,
        stock_m: parseInt(productForm.stock_m.value, 10) || 0,
        stock_l: parseInt(productForm.stock_l.value, 10) || 0,
        stock_xl: parseInt(productForm.stock_xl.value, 10) || 0,
        featured: productForm.featured.checked ? 1 : 0,
        show_in_hero: productForm.show_in_hero ? (productForm.show_in_hero.checked ? 1 : 0) : 0,
        hero_image: heroImage,
        hero_image_mobile: productForm.hero_image_mobile ? productForm.hero_image_mobile.value.trim() : '',
        hero_scale: productForm.hero_scale ? (parseFloat(productForm.hero_scale.value) || 1.0) : 1.0,
        hero_alt: productForm.hero_alt ? productForm.hero_alt.value.trim() : ''
      };

      try {
        let res;
        if (id) {
          res = await BeyondAPI.adminUpdateProduct(id, productData);
        } else {
          res = await BeyondAPI.adminCreateProduct(productData);
        }

        if (res.success) {
          modal.classList.remove('show');
          loadAdminProducts();
        } else {
          alert(res.error || 'Failed to save product');
        }
      } catch (err) {
        alert('Server error saving product');
      }
    });
  }

  checkAuth();
}

// Load products for Admin table
async function loadAdminProducts() {
  const tableBody = document.getElementById('admin-products-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = '<tr><td colspan="8">Loading garments...</td></tr>';

  try {
    const res = await BeyondAPI.getProducts();
    const products = res.products || [];
    tableBody.innerHTML = '';

    if (products.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="8">No products found.</td></tr>';
      return;
    }

    products.forEach(p => {
      const tr = document.createElement('tr');
      const totalStock = (p.stock_xs || 0) + (p.stock_s || 0) + (p.stock_m || 0) + (p.stock_l || 0) + (p.stock_xl || 0);
      tr.innerHTML = `
        <td><b>${p.name}</b></td>
        <td>${p.category}</td>
        <td>${BeyondCart.formatINR(p.price)}</td>
        <td>XS:${p.stock_xs} S:${p.stock_s} M:${p.stock_m} L:${p.stock_l} XL:${p.stock_xl} (Total: ${totalStock})</td>
        <td>${p.image_url ? 'Photo' : 'Dotted Tile (' + p.tile_label + ')'}</td>
        <td>${p.featured ? 'Yes' : 'No'}</td>
        <td>${p.show_in_hero ? 'Yes (' + (p.hero_scale || 1.0) + 'x)' : 'No'}</td>
        <td>
          <button type="button" class="btn btn-secondary btn-small btn-edit-p" data-id="${p.id}">Edit</button>
          <button type="button" class="btn btn-secondary btn-small btn-del-p" data-id="${p.id}" style="color:#c92a2a; border-color:var(--line);">Delete</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // Edit listeners
    tableBody.querySelectorAll('.btn-edit-p').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const p = (await BeyondAPI.getProducts()).products.find(x => String(x.id) === String(id));
        if (!p) return;

        document.getElementById('modal-title').textContent = `Edit ${p.name}`;
        document.getElementById('product-id').value = p.id;
        const form = document.getElementById('product-form');
        form.name.value = p.name;
        form.slug.value = p.slug;
        form.category.value = p.category;
        form.price.value = p.price;
        form.tile_label.value = p.tile_label;
        form.image_url.value = p.image_url || '';
        form.description.value = p.description;
        form.fabric_care.value = p.fabric_care;
        form.stock_xs.value = p.stock_xs;
        form.stock_s.value = p.stock_s;
        form.stock_m.value = p.stock_m;
        form.stock_l.value = p.stock_l;
        form.stock_xl.value = p.stock_xl;
        form.featured.checked = Boolean(p.featured);
        if (form.show_in_hero) form.show_in_hero.checked = Boolean(p.show_in_hero);
        if (form.hero_image) form.hero_image.value = p.hero_image || '';
        if (form.hero_image_mobile) form.hero_image_mobile.value = p.hero_image_mobile || '';
        if (form.hero_scale) form.hero_scale.value = p.hero_scale || 1.0;
        if (form.hero_alt) form.hero_alt.value = p.hero_alt || '';

        document.getElementById('product-modal').classList.add('show');
      });
    });

    // Delete listeners
    tableBody.querySelectorAll('.btn-del-p').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        const id = btn.dataset.id;
        const res = await BeyondAPI.adminDeleteProduct(id);
        if (res.success) {
          loadAdminProducts();
        } else {
          alert(res.error || 'Failed to delete product');
        }
      });
    });
  } catch (err) {
    tableBody.innerHTML = '<tr><td colspan="7" style="color:#c92a2a">Failed to load products.</td></tr>';
  }
}

// Load orders for Admin table
async function loadAdminOrders() {
  const tableBody = document.getElementById('admin-orders-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = '<tr><td colspan="6">Loading orders...</td></tr>';

  try {
    const res = await BeyondAPI.adminGetOrders();
    const orders = res.orders || [];
    tableBody.innerHTML = '';

    if (orders.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6">No orders have been placed yet.</td></tr>';
      return;
    }

    orders.forEach(o => {
      const tr = document.createElement('tr');
      const itemsText = o.items.map(i => `${i.name} (${i.size} × ${i.quantity})`).join(', ');
      tr.innerHTML = `
        <td><b>#${o.order_number}</b><br><small style="color:var(--ink2)">${new Date(o.created_at).toLocaleDateString()}</small></td>
        <td>${o.customer_name}<br><small style="color:var(--ink2)">${o.email} • ${o.phone}</small></td>
        <td>${itemsText}</td>
        <td><b>${BeyondCart.formatINR(o.total_amount)}</b><br><small style="color:var(--ink2)">${o.payment_method.toUpperCase()}</small></td>
        <td>
          <select class="admin-status-select" data-id="${o.id}">
            <option value="Confirmed" ${o.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="Dispatched" ${o.status === 'Dispatched' ? 'selected' : ''}>Dispatched</option>
            <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
            <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td>
          <button type="button" class="btn btn-secondary btn-small btn-view-order" data-order='${JSON.stringify(o).replace(/'/g, "&apos;")}'>View</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    tableBody.querySelectorAll('.admin-status-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        const id = sel.dataset.id;
        const status = sel.value;
        const res = await BeyondAPI.adminUpdateOrderStatus(id, status);
        if (!res.success) {
          alert('Failed to update status');
          loadAdminOrders();
        }
      });
    });

    tableBody.querySelectorAll('.btn-view-order').forEach(btn => {
      btn.addEventListener('click', () => {
        const order = JSON.parse(btn.dataset.order);
        alert(
          `Order #${order.order_number}\n\nCustomer: ${order.customer_name}\nEmail: ${order.email}\nPhone: ${order.phone}\nAddress: ${order.address}, ${order.city}, ${order.state} - ${order.pincode}\nPayment: ${order.payment_method} (${order.payment_status})\nTotal: ${BeyondCart.formatINR(order.total_amount)}\n\nItems:\n${order.items.map(i => `- ${i.name} [Size: ${i.size}] × ${i.quantity} = ${BeyondCart.formatINR(i.price * i.quantity)}`).join('\n')}`
        );
      });
    });
  } catch (err) {
    tableBody.innerHTML = '<tr><td colspan="6" style="color:#c92a2a">Failed to load orders.</td></tr>';
  }
}

// Load subscribers for Admin table
async function loadAdminSubscribers() {
  const tableBody = document.getElementById('admin-subscribers-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = '<tr><td colspan="2">Loading subscribers...</td></tr>';

  try {
    const res = await BeyondAPI.adminGetSubscribers();
    const subs = res.subscribers || [];
    tableBody.innerHTML = '';

    if (subs.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="2">No newsletter subscribers yet.</td></tr>';
      return;
    }

    subs.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><b>${s.email}</b></td>
        <td>${new Date(s.created_at).toLocaleDateString()}</td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (err) {
    tableBody.innerHTML = '<tr><td colspan="2" style="color:#c92a2a">Failed to load subscribers.</td></tr>';
  }
}
