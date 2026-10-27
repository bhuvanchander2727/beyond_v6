// API client for Beyond e-commerce platform

const API = {
  // Public product APIs
  async getProducts(params = {}) {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'All') query.set('category', params.category);
    if (params.sort) query.set('sort', params.sort);
    if (params.featured) query.set('featured', params.featured);
    if (params.limit) query.set('limit', params.limit);

    const res = await fetch(`/api/products?${query.toString()}`);
    return res.json();
  },

  async getProduct(slug) {
    const res = await fetch(`/api/products/${encodeURIComponent(slug)}`);
    return res.json();
  },

  async getHeroProducts() {
    const res = await fetch('/api/products/hero');
    return res.json();
  },

  // Public order APIs
  async createOrder(orderData) {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    return res.json();
  },

  async getOrder(orderNumber) {
    const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}`);
    return res.json();
  },

  // Newsletter subscription
  async subscribeNewsletter(email) {
    const res = await fetch('/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return res.json();
  },

  // Admin authentication and token management
  getAdminToken() {
    return sessionStorage.getItem('beyond_admin_token') || '';
  },

  setAdminToken(token) {
    sessionStorage.setItem('beyond_admin_token', token);
  },

  clearAdminToken() {
    sessionStorage.removeItem('beyond_admin_token');
  },

  adminHeaders() {
    const token = this.getAdminToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  },

  async adminLogin(password) {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    return res.json();
  },

  async adminVerify() {
    const res = await fetch('/api/admin/verify', {
      headers: this.adminHeaders()
    });
    return res.json();
  },

  async adminGetOrders() {
    const res = await fetch('/api/admin/orders', {
      headers: this.adminHeaders()
    });
    return res.json();
  },

  async adminUpdateOrderStatus(id, status) {
    const res = await fetch(`/api/admin/orders/${id}/status`, {
      method: 'PATCH',
      headers: this.adminHeaders(),
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  async adminCreateProduct(productData) {
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: this.adminHeaders(),
      body: JSON.stringify(productData)
    });
    return res.json();
  },

  async adminUpdateProduct(id, productData) {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'PUT',
      headers: this.adminHeaders(),
      body: JSON.stringify(productData)
    });
    return res.json();
  },

  async adminDeleteProduct(id) {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: this.adminHeaders()
    });
    return res.json();
  },

  async adminGetSubscribers() {
    const res = await fetch('/api/admin/subscribers', {
      headers: this.adminHeaders()
    });
    return res.json();
  },

  async adminUploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    const token = this.getAdminToken();
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    return res.json();
  }
};

window.BeyondAPI = API;
