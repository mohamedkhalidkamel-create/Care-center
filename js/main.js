/* =========================================================
   مركز العناية — main.js
   بدون سيرفر وبدون قاعدة بيانات:
     - المنتجات بتتقرأ لحظياً من مستودع GitHub نفسه (اسم الصورة
       بيحتوي على اسم المنتج وسعره).
     - لوحة تحكم بسيطة (تسجيل دخول بـ GitHub Token) بتسمح بإضافة
       وتعديل وحذف المنتجات من المتصفح مباشرة — أي تغيير بيتحفظ
       كـ commit على GitHub فوراً.
     - السلة بتتحفظ في localStorage.
     - إتمام الطلب بيفتح واتساب برسالة جاهزة.
   ========================================================= */

// ---- الإعدادات: عدّليها مرة واحدة بس ----
const WHATSAPP_NUMBER = "201556954308";
const GITHUB_OWNER = "mohamedkhalidkamel-create";
const GITHUB_REPO = "Care-center";
const GITHUB_BRANCH = "main"; // أو "master" لو ده اسم الفرع عندك

const CACHE_MINUTES = 10; // مدة الاحتفاظ بنسخة مؤقتة من المنتجات قبل إعادة السؤال من GitHub

const STORAGE_KEY = "care_cart_v1";
const PRODUCTS_CACHE_KEY = "care_products_cache_v1";
const ADMIN_TOKEN_KEY = "care_admin_token_v1";

// الأسماء العربية لكل مجلد رئيسي وفرعي
const CATEGORY_LABELS = {
  "1_skincare": "العناية بالبشرة",
  "2_makeup": "المكياج",
  "3_haircare": "العناية بالشعر",
  "4_bodycare": "العناية بالجسم",
  "5_fragrances": "العطور",
  "6_tools": "الأدوات والإكسسوارات",
  "7_offers": "العروض والباقات",
};

const SUBCATEGORY_LABELS = {
  a_cleansers: "منظفات وغسول",
  b_moisturizers: "مرطبات وزيوت",
  c_serums: "سيروم ومعالجات",
  d_sunscreen: "واقيات الشمس",
  e_masks: "أقنعة وماسكات",
  f_eye_lip: "العناية بالعين والشفاة",
  a_face: "الوجه",
  b_eyes: "العيون",
  c_lips: "الشفاه",
  d_palettes: "مجموعات وباليتات",
  a_basics: "الأساسيات",
  b_hydration: "العناية والترطيب",
  c_styling: "التصفيف والمعالجة",
  a_wash: "صابون وغسول الجسم",
  b_scrubs: "مقشرات الجسم",
  c_moisturizers: "ترطيب الجسم",
  a_perfumes: "عطور",
  b_mists: "معطرات الجسم والشعر",
  c_essential_oils: "زيوت عطرية",
  a_brushes: "فرش وإسفنجات",
  b_skincare_tools: "أدوات البشرة",
  c_hair_tools: "أدوات الشعر",
  a_bundles: "مجموعات العناية",
  b_discounts: "تخفيضات خاصة",
};

// أي فئة فرعية بتنتمي لأي فئة رئيسية (بيستخدمها فورم الإضافة في لوحة التحكم)
const CATEGORY_SUBCATEGORIES = {
  "1_skincare": ["a_cleansers", "b_moisturizers", "c_serums", "d_sunscreen", "e_masks", "f_eye_lip"],
  "2_makeup": ["a_face", "b_eyes", "c_lips", "d_palettes"],
  "3_haircare": ["a_basics", "b_hydration", "c_styling"],
  "4_bodycare": ["a_wash", "b_scrubs", "c_moisturizers"],
  "5_fragrances": ["a_perfumes", "b_mists", "c_essential_oils"],
  "6_tools": ["a_brushes", "b_skincare_tools", "c_hair_tools"],
  "7_offers": ["a_bundles", "b_discounts"],
};

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

let PRODUCTS = [];
let CART = loadCart();
let activeCategory = "all";
let searchQuery = "";
let sortMode = "default";

let adminToken = localStorage.getItem(ADMIN_TOKEN_KEY) || null;
let editingProductId = null; // مسار المنتج اللي بيتعدل حالياً، أو null لو وضع "إضافة"

// ---------- عناصر الصفحة ----------
const productGrid = document.getElementById("productGrid");
const emptyState = document.getElementById("emptyState");
const categoryNav = document.getElementById("categoryNav");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const resultsMeta = document.getElementById("resultsMeta");

const cartDrawer = document.getElementById("cartDrawer");
const overlay = document.getElementById("overlay");
const openCartBtn = document.getElementById("openCartBtn");
const closeCartBtn = document.getElementById("closeCartBtn");
const cartItemsEl = document.getElementById("cartItems");
const cartCountEl = document.getElementById("cartCount");
const cartTotalEl = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");

const checkoutModal = document.getElementById("checkoutModal");
const checkoutForm = document.getElementById("checkoutForm");
const cancelCheckout = document.getElementById("cancelCheckout");

const toastEl = document.getElementById("toast");
const floatWhatsapp = document.getElementById("floatWhatsapp");
const heroWhatsapp = document.getElementById("heroWhatsapp");

// عناصر لوحة التحكم
const adminFloatBtn = document.getElementById("adminFloatBtn");
const adminLoginModal = document.getElementById("adminLoginModal");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminTokenInput = document.getElementById("adminTokenInput");
const adminLoginError = document.getElementById("adminLoginError");
const cancelAdminLogin = document.getElementById("cancelAdminLogin");

const adminDrawer = document.getElementById("adminDrawer");
const closeAdminBtn = document.getElementById("closeAdminBtn");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");
const adminForm = document.getElementById("adminForm");
const admCategory = document.getElementById("admCategory");
const admSubcategory = document.getElementById("admSubcategory");
const admName = document.getElementById("admName");
const admPrice = document.getElementById("admPrice");
const admImage = document.getElementById("admImage");
const admPreview = document.getElementById("admPreview");
const admSubmitBtn = document.getElementById("admSubmitBtn");
const admCancelEdit = document.getElementById("admCancelEdit");
const admStatus = document.getElementById("admStatus");
const admProductList = document.getElementById("admProductList");
const admFormTitle = document.getElementById("admFormTitle");

// ---------- تشغيل الموقع ----------
init();

async function init() {
  wireGeneralWhatsappLinks();
  wireEvents();
  wireAdminEvents();
  renderCart();
  populateAdminCategorySelect();

  PRODUCTS = await loadProducts();

  buildCategoryNav();
  renderProducts();
  refreshAdminUI();
}

function wireGeneralWhatsappLinks() {
  const link = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    "مرحباً، أريد الاستفسار عن منتجاتكم 😊"
  )}`;
  floatWhatsapp.href = link;
  heroWhatsapp.href = link;
}

// ========================================================
// اكتشاف المنتجات من GitHub
// ========================================================
function parseFilename(filename) {
  const dot = filename.lastIndexOf(".");
  const ext = filename.slice(dot + 1).toLowerCase();
  const base = filename.slice(0, dot);
  const match = base.match(/^(.*)_(\d+(?:\.\d+)?)EGP$/i);
  if (!match) return null;
  return {
    name: match[1].replace(/_/g, " ").trim(),
    price: parseFloat(match[2]),
    ext,
  };
}

async function loadProducts() {
  const cached = readProductsCache();
  if (cached) return cached;

  try {
    const products = await fetchProductsFromGithub();
    if (products.length) {
      writeProductsCache(products);
      return products;
    }
  } catch (err) {
    console.warn("تعذّر الاتصال بـ GitHub، سيتم استخدام النسخة المحلية:", err);
  }

  try {
    const res = await fetch("products.json");
    if (res.ok) return await res.json();
  } catch {
    /* تجاهل */
  }

  return [];
}

async function fetchProductsFromGithub() {
  if (isGithubNotConfigured()) {
    console.warn("لسه GITHUB_OWNER/GITHUB_REPO متظبطش في js/main.js — هيتم استخدام النسخة المحلية.");
    return [];
  }

  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH}?recursive=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const data = await res.json();

  const products = [];
  for (const item of data.tree || []) {
    if (item.type !== "blob") continue;

    const parts = item.path.split("/");
    if (parts.length !== 3) continue;

    const [mainFolder, subFolder, filename] = parts;
    if (!CATEGORY_LABELS[mainFolder]) continue;

    const parsed = parseFilename(filename);
    if (!parsed || !IMAGE_EXTENSIONS.includes(parsed.ext)) continue;

    products.push({
      id: item.path,
      sha: item.sha,
      name: parsed.name,
      price: parsed.price,
      ext: parsed.ext,
      image: item.path,
      category: mainFolder,
      categoryLabel: CATEGORY_LABELS[mainFolder] || mainFolder,
      subcategory: subFolder,
      subcategoryLabel: SUBCATEGORY_LABELS[subFolder] || subFolder,
    });
  }
  return products;
}

function isGithubNotConfigured() {
  return GITHUB_OWNER.startsWith("YOUR_") || GITHUB_REPO.startsWith("YOUR_");
}

function readProductsCache() {
  try {
    const raw = localStorage.getItem(PRODUCTS_CACHE_KEY);
    if (!raw) return null;
    const { timestamp, products, repoKey } = JSON.parse(raw);
    const currentKey = `${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}`;
    if (repoKey !== currentKey) return null;
    const ageMinutes = (Date.now() - timestamp) / 60000;
    if (ageMinutes > CACHE_MINUTES) return null;
    return products;
  } catch {
    return null;
  }
}

function writeProductsCache(products) {
  try {
    localStorage.setItem(
      PRODUCTS_CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        repoKey: `${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}`,
        products,
      })
    );
  } catch {
    /* تجاهل */
  }
}

function clearProductsCache() {
  localStorage.removeItem(PRODUCTS_CACHE_KEY);
}

async function refreshProductsFromGithub() {
  clearProductsCache();
  const fresh = await fetchProductsFromGithub();
  writeProductsCache(fresh);
  PRODUCTS = fresh;
  renderProducts();
  renderAdminProductList();
}

// ========================================================
// الفلترة والترتيب وعرض المنتجات
// ========================================================
function getVisibleProducts() {
  let list = PRODUCTS.slice();

  if (activeCategory !== "all") {
    list = list.filter((p) => p.category === activeCategory);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(q));
  }

  switch (sortMode) {
    case "price-asc":
      list.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      list.sort((a, b) => b.price - a.price);
      break;
    case "name-asc":
      list.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }

  return list;
}

function buildCategoryNav() {
  // بتاخد كل الفئات الثابتة على طول عشان الأزرار متختفيش لو قسم فاضي مؤقتاً
  for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
    if (categoryNav.querySelector(`[data-category="${key}"]`)) continue;
    const btn = document.createElement("button");
    btn.className = "cat-pill";
    btn.dataset.category = key;
    btn.textContent = label;
    categoryNav.appendChild(btn);
  }

  categoryNav.addEventListener("click", (e) => {
    const btn = e.target.closest(".cat-pill");
    if (!btn) return;
    activeCategory = btn.dataset.category;
    [...categoryNav.children].forEach((c) => c.classList.toggle("active", c === btn));
    renderProducts();
  });
}

function renderProducts() {
  const list = getVisibleProducts();
  productGrid.innerHTML = "";

  emptyState.hidden = list.length !== 0;
  resultsMeta.textContent = `${list.length} منتج`;

  const frag = document.createDocumentFragment();
  for (const p of list) {
    frag.appendChild(productCard(p));
  }
  productGrid.appendChild(frag);
}

function productCard(p) {
  const card = document.createElement("article");
  card.className = "product-card";
  card.innerHTML = `
    <div class="product-media">
      <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" />
      ${
        isAdmin()
          ? `<div class="admin-card-controls">
               <button type="button" class="admin-mini-btn" data-action="edit" aria-label="تعديل">✎</button>
               <button type="button" class="admin-mini-btn admin-mini-btn-danger" data-action="delete" aria-label="حذف">✕</button>
             </div>`
          : ""
      }
    </div>
    <div class="product-body">
      <span class="product-sub">${escapeHtml(p.subcategoryLabel)}</span>
      <h3 class="product-name">${escapeHtml(p.name)}</h3>
      <div class="product-footer">
        <span class="product-price">${formatPrice(p.price)}</span>
        <button class="add-btn" aria-label="أضيفي إلى السلة">+</button>
      </div>
    </div>
  `;
  card.querySelector(".add-btn").addEventListener("click", () => {
    addToCart(p);
    showToast(`تمت إضافة "${p.name}" إلى السلة`);
  });

  if (isAdmin()) {
    card.querySelector('[data-action="edit"]').addEventListener("click", () => startEditProduct(p.id));
    card.querySelector('[data-action="delete"]').addEventListener("click", () => confirmDeleteProduct(p.id));
  }

  return card;
}

// ========================================================
// السلة
// ========================================================
function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(CART));
}

function addToCart(product) {
  const existing = CART.find((i) => i.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    CART.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      categoryLabel: product.categoryLabel,
      subcategoryLabel: product.subcategoryLabel,
      qty: 1,
    });
  }
  saveCart();
  renderCart();
}

function changeQty(id, delta) {
  const item = CART.find((i) => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    CART = CART.filter((i) => i.id !== id);
  }
  saveCart();
  renderCart();
}

function removeFromCart(id) {
  CART = CART.filter((i) => i.id !== id);
  saveCart();
  renderCart();
}

function cartTotal() {
  return CART.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function renderCart() {
  cartItemsEl.innerHTML = "";

  if (CART.length === 0) {
    cartItemsEl.innerHTML = `<p style="color:var(--ink-soft); text-align:center; padding-top:30px;">سلتك فارغة حالياً</p>`;
  } else {
    const frag = document.createDocumentFragment();
    for (const item of CART) {
      frag.appendChild(cartItemRow(item));
    }
    cartItemsEl.appendChild(frag);
  }

  const totalQty = CART.reduce((sum, i) => sum + i.qty, 0);
  cartCountEl.textContent = totalQty;
  cartTotalEl.textContent = formatPrice(cartTotal());
  checkoutBtn.disabled = CART.length === 0;
}

function cartItemRow(item) {
  const row = document.createElement("div");
  row.className = "cart-item";
  row.innerHTML = `
    <img src="${item.image}" alt="${escapeHtml(item.name)}" />
    <div class="cart-item-info">
      <span class="cart-item-name">${escapeHtml(item.name)}</span>
      <span class="cart-item-meta">${escapeHtml(item.categoryLabel)} · ${formatPrice(item.price)}</span>
      <div class="qty-control">
        <button data-action="dec" aria-label="إنقاص الكمية">−</button>
        <span>${item.qty}</span>
        <button data-action="inc" aria-label="زيادة الكمية">+</button>
      </div>
      <button class="remove-link" data-action="remove">إزالة</button>
    </div>
  `;
  row.querySelector('[data-action="inc"]').addEventListener("click", () => changeQty(item.id, 1));
  row.querySelector('[data-action="dec"]').addEventListener("click", () => changeQty(item.id, -1));
  row.querySelector('[data-action="remove"]').addEventListener("click", () => removeFromCart(item.id));
  return row;
}

// ========================================================
// إتمام الطلب عبر واتساب
// ========================================================
function buildWhatsappMessage(customer) {
  const lines = [];
  lines.push("طلب جديد من المتجر 🛍️");
  lines.push("");
  lines.push("المنتجات:");
  lines.push("");

  for (const item of CART) {
    lines.push(item.name);
    lines.push(`القسم: ${item.categoryLabel} (${item.subcategoryLabel})`);
    lines.push(`الكمية: ${item.qty}`);
    lines.push(`السعر: ${formatPrice(item.price * item.qty)}`);
    lines.push("");
  }

  lines.push(`الإجمالي الكلي: ${formatPrice(cartTotal())}`);
  lines.push("");
  lines.push("بيانات التوصيل:");
  lines.push(`الاسم: ${customer.name}`);
  lines.push(`الهاتف: ${customer.phone}`);
  lines.push(`العنوان: ${customer.address}`);

  return lines.join("\n");
}

function sendOrderToWhatsapp(customer) {
  const message = buildWhatsappMessage(customer);
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

// ========================================================
// لوحة تحكم المسؤول — تسجيل الدخول
// ========================================================
function isAdmin() {
  return !!adminToken;
}

function githubAuthHeaders() {
  return {
    Authorization: `Bearer ${adminToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function verifyAdminToken(token) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("مفتاح الدخول غير صحيح.");
    if (res.status === 404) throw new Error("تعذّر الوصول للمستودع — تأكدي من اسم المستخدم والمستودع في js/main.js.");
    throw new Error(`تعذّر التحقق من المفتاح (خطأ ${res.status}).`);
  }
  const data = await res.json();
  if (!data.permissions || !data.permissions.push) {
    throw new Error("هذا المفتاح للقراءة فقط. لازم صلاحية Contents: Read and write.");
  }
  return true;
}

function openAdminLogin() {
  adminLoginError.textContent = "";
  adminTokenInput.value = "";
  adminLoginModal.classList.add("open");
  overlay.classList.add("open");
}

function closeAdminLogin() {
  adminLoginModal.classList.remove("open");
  if (!cartDrawer.classList.contains("open") && !adminDrawer.classList.contains("open")) {
    overlay.classList.remove("open");
  }
}

function logoutAdmin() {
  adminToken = null;
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  closeAdminDrawer();
  refreshAdminUI();
  renderProducts();
  showToast("تم تسجيل الخروج من لوحة التحكم");
}

function refreshAdminUI() {
  adminFloatBtn.classList.toggle("is-admin", isAdmin());
  adminFloatBtn.title = isAdmin() ? "لوحة تحكم المنتجات" : "دخول المسؤول";
  if (isAdmin()) renderAdminProductList();
}

// ========================================================
// لوحة تحكم المسؤول — إضافة / تعديل / حذف
// ========================================================
function populateAdminCategorySelect() {
  admCategory.innerHTML = "";
  for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = label;
    admCategory.appendChild(opt);
  }
  populateAdminSubcategorySelect(admCategory.value);
}

function populateAdminSubcategorySelect(categoryKey) {
  admSubcategory.innerHTML = "";
  const subs = CATEGORY_SUBCATEGORIES[categoryKey] || [];
  for (const subKey of subs) {
    const opt = document.createElement("option");
    opt.value = subKey;
    opt.textContent = SUBCATEGORY_LABELS[subKey] || subKey;
    admSubcategory.appendChild(opt);
  }
}

function openAdminDrawer() {
  adminDrawer.classList.add("open");
  overlay.classList.add("open");
  renderAdminProductList();
}

function closeAdminDrawer() {
  adminDrawer.classList.remove("open");
  if (!cartDrawer.classList.contains("open")) {
    overlay.classList.remove("open");
  }
}

function resetAdminForm() {
  editingProductId = null;
  adminForm.reset();
  populateAdminSubcategorySelect(admCategory.value);
  admPreview.hidden = true;
  admPreview.removeAttribute("src");
  admImage.required = true;
  admFormTitle.textContent = "إضافة منتج جديد";
  admSubmitBtn.textContent = "نشر المنتج";
  admCancelEdit.hidden = true;
  admStatus.textContent = "";
  admStatus.className = "admin-status";
}

function startEditProduct(productId) {
  const p = PRODUCTS.find((x) => x.id === productId);
  if (!p) return;

  editingProductId = productId;
  admCategory.value = p.category;
  populateAdminSubcategorySelect(p.category);
  admSubcategory.value = p.subcategory;
  admName.value = p.name;
  admPrice.value = p.price;
  admImage.required = false; // مش لازم ترفع صورة جديدة لو مش هتغيريها
  admPreview.src = p.image;
  admPreview.hidden = false;

  admFormTitle.textContent = `تعديل: ${p.name}`;
  admSubmitBtn.textContent = "حفظ التعديلات";
  admCancelEdit.hidden = false;
  admStatus.textContent = "";
  admStatus.className = "admin-status";

  openAdminDrawer();
  adminForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function confirmDeleteProduct(productId) {
  const p = PRODUCTS.find((x) => x.id === productId);
  if (!p) return;
  const sure = confirm(`متأكدة إنك عايزة تحذفي "${p.name}"؟ الإجراء ده مش قابل للتراجع.`);
  if (!sure) return;
  deleteProduct(p);
}

async function deleteProduct(p) {
  setAdminBusy(true, "جاري حذف المنتج...");
  try {
    await githubDeleteFile(p.id, p.sha, `حذف منتج: ${p.name}`);
    await refreshProductsFromGithub();
    showToast(`تم حذف "${p.name}"`);
    setAdminStatus("تم الحذف بنجاح ✅", "success");
  } catch (err) {
    console.error(err);
    setAdminStatus(`حصل خطأ أثناء الحذف: ${err.message}`, "error");
  } finally {
    setAdminBusy(false);
  }
}

function sanitizeNamePart(str) {
  return str
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_");
}

function buildProductPath(category, subcategory, name, price, ext) {
  const filename = `${sanitizeNamePart(name)}_${Math.round(Number(price))}EGP.${ext}`;
  return `${category}/${subcategory}/${filename}`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("تعذّرت قراءة ملف الصورة."));
    reader.readAsDataURL(file);
  });
}

async function fetchImageAsBase64(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error("تعذّر تحميل الصورة الحالية للمنتج.");
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("تعذّرت قراءة الصورة الحالية."));
    reader.readAsDataURL(blob);
  });
}

async function githubPutFile(path, base64Content, message, sha) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`;
  const body = { message, content: base64Content, branch: GITHUB_BRANCH };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: "PUT",
    headers: { ...githubAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `فشل رفع الملف (خطأ ${res.status})`);
  }
  return res.json();
}

async function githubDeleteFile(path, sha, message) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { ...githubAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha, branch: GITHUB_BRANCH }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `فشل حذف الملف (خطأ ${res.status})`);
  }
  return res.json();
}

function setAdminBusy(busy, statusText) {
  admSubmitBtn.disabled = busy;
  admCancelEdit.disabled = busy;
  if (statusText) setAdminStatus(statusText, "pending");
}

function setAdminStatus(text, kind) {
  admStatus.textContent = text;
  admStatus.className = `admin-status admin-status-${kind || "pending"}`;
}

async function handleAdminSubmit(e) {
  e.preventDefault();

  const category = admCategory.value;
  const subcategory = admSubcategory.value;
  const name = admName.value.trim();
  const price = admPrice.value;
  const file = admImage.files[0];

  if (!name || !price || (!file && !editingProductId)) {
    setAdminStatus("من فضلك املأي كل الحقول واختاري صورة.", "error");
    return;
  }

  setAdminBusy(true, "جاري الحفظ على GitHub...");

  try {
    if (editingProductId) {
      const oldProduct = PRODUCTS.find((p) => p.id === editingProductId);
      if (!oldProduct) throw new Error("تعذّر إيجاد المنتج الأصلي.");

      const ext = file ? file.name.split(".").pop().toLowerCase() : oldProduct.ext;
      const newPath = buildProductPath(category, subcategory, name, price, ext);
      const contentBase64 = file ? await fileToBase64(file) : await fetchImageAsBase64(oldProduct.image);

      if (newPath === oldProduct.id) {
        // نفس المسار: تحديث في مكانه
        await githubPutFile(newPath, contentBase64, `تحديث منتج: ${name}`, oldProduct.sha);
      } else {
        // الاسم/السعر/القسم اتغيّر: إنشاء ملف جديد وحذف القديم
        await githubPutFile(newPath, contentBase64, `تحديث منتج: ${name}`);
        await githubDeleteFile(oldProduct.id, oldProduct.sha, `حذف نسخة قديمة بعد التعديل: ${oldProduct.name}`);
      }

      showToast(`تم تحديث "${name}"`);
    } else {
      const ext = file.name.split(".").pop().toLowerCase();
      if (!IMAGE_EXTENSIONS.includes(ext)) {
        throw new Error("امتداد الصورة غير مدعوم. استخدمي jpg أو jpeg أو png أو webp.");
      }
      const newPath = buildProductPath(category, subcategory, name, price, ext);

      if (PRODUCTS.some((p) => p.id === newPath)) {
        throw new Error("يوجد بالفعل منتج بنفس الاسم والسعر في نفس القسم.");
      }

      const contentBase64 = await fileToBase64(file);
      await githubPutFile(newPath, contentBase64, `إضافة منتج: ${name}`);
      showToast(`تمت إضافة "${name}"`);
    }

    setAdminStatus("تم الحفظ بنجاح ✅ (قد يستغرق ظهور التحديث ثوانٍ قليلة)", "success");
    await refreshProductsFromGithub();
    resetAdminForm();
  } catch (err) {
    console.error(err);
    setAdminStatus(`حصل خطأ: ${err.message}`, "error");
  } finally {
    setAdminBusy(false);
  }
}

function renderAdminProductList() {
  admProductList.innerHTML = "";

  if (PRODUCTS.length === 0) {
    admProductList.innerHTML = `<p style="color:var(--ink-soft); font-size:0.85rem;">لا توجد منتجات بعد.</p>`;
    return;
  }

  const frag = document.createDocumentFragment();
  for (const p of PRODUCTS) {
    const row = document.createElement("div");
    row.className = "admin-product-row";
    row.innerHTML = `
      <img src="${p.image}" alt="${escapeHtml(p.name)}" />
      <div class="admin-product-info">
        <span class="admin-product-name">${escapeHtml(p.name)}</span>
        <span class="admin-product-meta">${escapeHtml(p.categoryLabel)} · ${formatPrice(p.price)}</span>
      </div>
      <div class="admin-product-actions">
        <button type="button" data-action="edit" aria-label="تعديل">✎</button>
        <button type="button" data-action="delete" aria-label="حذف">✕</button>
      </div>
    `;
    row.querySelector('[data-action="edit"]').addEventListener("click", () => startEditProduct(p.id));
    row.querySelector('[data-action="delete"]').addEventListener("click", () => confirmDeleteProduct(p.id));
    frag.appendChild(row);
  }
  admProductList.appendChild(frag);
}

// ========================================================
// ربط الأحداث
// ========================================================
function wireEvents() {
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderProducts();
  });

  sortSelect.addEventListener("change", (e) => {
    sortMode = e.target.value;
    renderProducts();
  });

  openCartBtn.addEventListener("click", openCart);
  closeCartBtn.addEventListener("click", closeCart);
  overlay.addEventListener("click", () => {
    closeCart();
    closeCheckoutModal();
    closeAdminLogin();
    closeAdminDrawer();
  });

  checkoutBtn.addEventListener("click", () => {
    if (CART.length === 0) return;
    openCheckoutModal();
  });

  cancelCheckout.addEventListener("click", closeCheckoutModal);

  checkoutForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const customer = {
      name: document.getElementById("custName").value.trim(),
      phone: document.getElementById("custPhone").value.trim(),
      address: document.getElementById("custAddress").value.trim(),
    };
    if (!customer.name || !customer.phone || !customer.address) return;

    sendOrderToWhatsapp(customer);
    closeCheckoutModal();
    closeCart();
    checkoutForm.reset();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeCart();
      closeCheckoutModal();
      closeAdminLogin();
      closeAdminDrawer();
    }
  });
}

function wireAdminEvents() {
  adminFloatBtn.addEventListener("click", () => {
    if (isAdmin()) {
      openAdminDrawer();
    } else {
      openAdminLogin();
    }
  });

  cancelAdminLogin.addEventListener("click", closeAdminLogin);

  adminLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = adminTokenInput.value.trim();
    if (!token) return;

    adminLoginError.textContent = "";
    const submitBtn = adminLoginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "جاري التحقق...";

    try {
      await verifyAdminToken(token);
      adminToken = token;
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
      closeAdminLogin();
      refreshAdminUI();
      renderProducts();
      openAdminDrawer();
      showToast("تم تسجيل الدخول كمسؤول");
    } catch (err) {
      adminLoginError.textContent = err.message;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "دخول";
    }
  });

  closeAdminBtn.addEventListener("click", closeAdminDrawer);
  adminLogoutBtn.addEventListener("click", logoutAdmin);

  admCategory.addEventListener("change", () => populateAdminSubcategorySelect(admCategory.value));

  admImage.addEventListener("change", () => {
    const file = admImage.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      admPreview.src = reader.result;
      admPreview.hidden = false;
    };
    reader.readAsDataURL(file);
  });

  adminForm.addEventListener("submit", handleAdminSubmit);
  admCancelEdit.addEventListener("click", resetAdminForm);
}

function openCart() {
  cartDrawer.classList.add("open");
  overlay.classList.add("open");
}

function closeCart() {
  cartDrawer.classList.remove("open");
  if (!checkoutModal.classList.contains("open") && !adminDrawer.classList.contains("open")) {
    overlay.classList.remove("open");
  }
}

function openCheckoutModal() {
  checkoutModal.classList.add("open");
  overlay.classList.add("open");
}

function closeCheckoutModal() {
  checkoutModal.classList.remove("open");
  if (!cartDrawer.classList.contains("open") && !adminDrawer.classList.contains("open")) {
    overlay.classList.remove("open");
  }
}

// ---------- أدوات مساعدة ----------
function formatPrice(n) {
  return `${Math.round(n)} EGP`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

let toastTimer;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2400);
}
