// Shopping bag management for Beyond store
const CART_STORAGE_KEY = 'beyond_bag';

function getBag() {
  try {
    const data = localStorage.getItem(CART_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading bag from localStorage:', e);
    return [];
  }
}

function saveBag(bag) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(bag));
    updateBagCountUI();
  } catch (e) {
    console.error('Error saving bag to localStorage:', e);
  }
}

function formatINR(amount) {
  const num = Math.round(Number(amount) || 0);
  return '₹' + num.toLocaleString('en-IN');
}

function getBagCount() {
  const bag = getBag();
  return bag.reduce((total, item) => total + (parseInt(item.quantity, 10) || 0), 0);
}

function getBagSubtotal() {
  const bag = getBag();
  return bag.reduce((total, item) => total + ((Number(item.price) || 0) * (parseInt(item.quantity, 10) || 0)), 0);
}

function addToBag(item) {
  const bag = getBag();
  const existingIndex = bag.findIndex(
    i => String(i.productId) === String(item.productId) && i.size === item.size
  );

  const addQty = parseInt(item.quantity, 10) || 1;

  if (existingIndex > -1) {
    bag[existingIndex].quantity = (parseInt(bag[existingIndex].quantity, 10) || 0) + addQty;
  } else {
    bag.push({
      productId: item.productId,
      slug: item.slug,
      name: item.name,
      size: item.size,
      price: Number(item.price),
      quantity: addQty,
      tile_label: item.tile_label || item.name,
      image_url: item.image_url || ''
    });
  }

  saveBag(bag);
  showToast(`${item.name} (${item.size}) added to bag. <a href="/bag">View Bag</a>`);
}

function updateQuantity(productId, size, quantity) {
  const bag = getBag();
  const index = bag.findIndex(
    i => String(i.productId) === String(productId) && i.size === size
  );

  if (index > -1) {
    const newQty = parseInt(quantity, 10);
    if (newQty <= 0) {
      bag.splice(index, 1);
    } else {
      bag[index].quantity = newQty;
    }
    saveBag(bag);
  }
}

function removeFromBag(productId, size) {
  let bag = getBag();
  bag = bag.filter(
    i => !(String(i.productId) === String(productId) && i.size === size)
  );
  saveBag(bag);
}

function clearBag() {
  saveBag([]);
}

function updateBagCountUI() {
  const count = getBagCount();
  const bagLinks = document.querySelectorAll('.bag-nav-link, nav a[href="/bag"], nav a[href="bag.html"], nav a[data-bag-link]');
  bagLinks.forEach(link => {
    link.textContent = `Bag (${count})`;
    link.setAttribute('aria-label', `Shopping bag with ${count} items`);
  });
}

// Toast notification helper
function showToast(htmlMessage) {
  let toast = document.getElementById('beyond-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'beyond-toast';
    toast.className = 'toast-banner';
    document.body.appendChild(toast);
  }

  toast.innerHTML = htmlMessage;
  toast.classList.add('show');

  if (window._toastTimeout) {
    clearTimeout(window._toastTimeout);
  }

  window._toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// Listen to changes from other tabs
window.addEventListener('storage', (e) => {
  if (e.key === CART_STORAGE_KEY) {
    updateBagCountUI();
  }
});

// Update UI immediately and when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateBagCountUI);
} else {
  updateBagCountUI();
}

window.BeyondCart = {
  getBag,
  saveBag,
  addToBag,
  updateQuantity,
  removeFromBag,
  clearBag,
  getBagCount,
  getBagSubtotal,
  formatINR,
  updateBagCountUI,
  showToast
};
