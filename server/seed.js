const db = require('./db');

const initialProducts = [
  {
    name: 'Field overshirt',
    slug: 'field-overshirt',
    category: 'Overshirts',
    price: 4900,
    description: 'Cut from 340 gsm brushed cotton twill with twin chest pockets and horn buttons. Designed to be worn over tees in early autumn or layered under heavy coats as temperatures drop.',
    fabric_care: '100% heavy cotton twill (340 gsm). Garment-dyed and pre-shrunk. Machine wash cold at 30°C inside out. Line dry in shade. Warm iron if needed.',
    tile_label: 'Over&shy;shirt',
    image_url: '',
    stock_xs: 4,
    stock_s: 7,
    stock_m: 12,
    stock_l: 8,
    stock_xl: 3,
    featured: 1
  },
  {
    name: 'Heavy tee',
    slug: 'heavy-tee',
    category: 'Tees',
    price: 1800,
    description: 'Our signature 280 gsm combed cotton jersey with a structured drop shoulder and high ribbed collar that keeps its shape wash after wash.',
    fabric_care: '100% combed organic cotton (280 gsm). Ribbed 1x1 neckband. Gentle cold machine wash. Do not tumble dry. Dry flat.',
    tile_label: 'Tee',
    image_url: '',
    stock_xs: 6,
    stock_s: 15,
    stock_m: 20,
    stock_l: 14,
    stock_xl: 5,
    featured: 1
  },
  {
    name: 'Wide trouser',
    slug: 'wide-trouser',
    category: 'Pants',
    price: 4200,
    description: 'Relaxed double-pleated trouser tailored in high-density washed linen blend. Features deep side pockets, internal drawstring, and a clean wide-leg break.',
    fabric_care: '55% European flax linen, 45% organic cotton. Enzyme washed for soft hand-feel. Dry clean or hand wash cold. Medium iron.',
    tile_label: 'Pants',
    image_url: '',
    stock_xs: 0, // Intentionally 0 to showcase out-of-stock disabled state
    stock_s: 5,
    stock_m: 10,
    stock_l: 9,
    stock_xl: 4,
    featured: 1
  },
  {
    name: 'Ribbed knit',
    slug: 'ribbed-knit',
    category: 'Knits',
    price: 5400,
    description: 'Chunkier 5-gauge half-cardigan stitch spun from unbleached merino wool blend. Substantial warmth with clean raglan sleeve construction.',
    fabric_care: '80% Merino Wool, 20% recycled polyamide for recovery. Hand wash cold with wool detergent. Reshape whilst damp and dry flat away from direct heat.',
    tile_label: 'Knit',
    image_url: '',
    stock_xs: 3,
    stock_s: 6,
    stock_m: 8,
    stock_l: 5,
    stock_xl: 0, // Intentionally 0 to showcase out-of-stock disabled state
    featured: 1
  },
  {
    name: 'Work jacket',
    slug: 'work-jacket',
    category: 'Overshirts',
    price: 5800,
    description: 'Unlined chore jacket in 380 gsm broken twill canvas with reinforced bar-tacking, three patch pockets, and concealed brass shank buttons.',
    fabric_care: '100% heavy canvas cotton. Machine wash cold with similar colors. Hang dry.',
    tile_label: 'Jacket',
    image_url: '',
    stock_xs: 2,
    stock_s: 5,
    stock_m: 8,
    stock_l: 6,
    stock_xl: 3,
    featured: 0
  },
  {
    name: 'Boxy pocket tee',
    slug: 'boxy-pocket-tee',
    category: 'Tees',
    price: 2100,
    description: 'Square-cut silhouette with reinforced single chest pocket and blind-stitched hem. Spun from 290 gsm dry-feel cotton jersey.',
    fabric_care: '100% dry cotton jersey. Machine wash cold. Cool tumble dry or line dry.',
    tile_label: 'Pocket',
    image_url: '',
    stock_xs: 4,
    stock_s: 8,
    stock_m: 12,
    stock_l: 7,
    stock_xl: 2,
    featured: 0
  },
  {
    name: 'Pleated chino',
    slug: 'pleated-chino',
    category: 'Pants',
    price: 3900,
    description: 'Everyday tailored chino with forward single pleat in mid-weight mercerized cotton drill. Tapered hem with turn-up option.',
    fabric_care: '100% combed cotton drill (290 gsm). Machine wash at 30°C. Warm iron.',
    tile_label: 'Chino',
    image_url: '',
    stock_xs: 3,
    stock_s: 6,
    stock_m: 10,
    stock_l: 8,
    stock_xl: 4,
    featured: 0
  },
  {
    name: 'Waffle crewneck',
    slug: 'waffle-crewneck',
    category: 'Knits',
    price: 4600,
    description: 'Deep thermal honeycomb waffle knit in heavyweight textured cotton. Keeps warmth trapped while remaining breathable throughout the day.',
    fabric_care: '100% textured waffle cotton. Gentle machine wash cold. Dry flat in shade.',
    tile_label: 'Crew',
    image_url: '',
    stock_xs: 5,
    stock_s: 9,
    stock_m: 11,
    stock_l: 8,
    stock_xl: 3,
    featured: 0
  },
  {
    name: 'Black moto jacket',
    slug: 'black-moto-jacket',
    category: 'Overshirts',
    price: 8400,
    description: 'Cut from heavyweight waxed cotton twill with asymmetrical brass zip, reinforced shoulders, and quilted lining. A structured modern classic.',
    fabric_care: '100% waxed cotton twill (420 gsm). Wipe clean with damp sponge. Do not machine wash or dry clean.',
    tile_label: 'Moto',
    image_url: '/img/hero/black-moto-jacket.webp',
    stock_xs: 4,
    stock_s: 6,
    stock_m: 8,
    stock_l: 5,
    stock_xl: 3,
    featured: 1,
    show_in_hero: 1,
    hero_image: '/img/hero/black-moto-jacket.webp',
    hero_image_mobile: '/img/hero/black-moto-jacket-mobile.webp',
    hero_alt: 'Black moto jacket front view cutout',
    hero_scale: 1.0
  },
  {
    name: 'Black boxy hoodie',
    slug: 'black-boxy-hoodie',
    category: 'Knits',
    price: 4800,
    description: 'Heavyweight 480 gsm French terry cotton with structured double-layered hood, dropped shoulders, and clean blind hem finish.',
    fabric_care: '100% organic cotton French terry (480 gsm). Cold machine wash gentle. Reshape and dry flat.',
    tile_label: 'Hoodie',
    image_url: '/img/hero/black-hoodie.webp',
    stock_xs: 5,
    stock_s: 8,
    stock_m: 12,
    stock_l: 10,
    stock_xl: 4,
    featured: 1,
    show_in_hero: 1,
    hero_image: '/img/hero/black-hoodie.webp',
    hero_image_mobile: '/img/hero/black-hoodie-mobile.webp',
    hero_alt: 'Black boxy hoodie front view cutout',
    hero_scale: 1.0
  },
  {
    name: 'Heather grey hoodie',
    slug: 'heather-grey-hoodie',
    category: 'Knits',
    price: 4800,
    description: 'Custom loopback French terry milled from two-tone combed yarns. Structured drape with deep crossover hood and ribbed cuffs.',
    fabric_care: '100% combed cotton loopback (460 gsm). Machine wash cold inside out. Dry in shade.',
    tile_label: 'Grey',
    image_url: '/img/hero/grey-hoodie.webp',
    stock_xs: 4,
    stock_s: 7,
    stock_m: 14,
    stock_l: 9,
    stock_xl: 3,
    featured: 1,
    show_in_hero: 1,
    hero_image: '/img/hero/grey-hoodie.webp',
    hero_image_mobile: '/img/hero/grey-hoodie-mobile.webp',
    hero_alt: 'Heather grey hoodie front view cutout',
    hero_scale: 1.0
  },
  {
    name: 'Heavy fleece hoodie',
    slug: 'heavy-fleece-hoodie',
    category: 'Knits',
    price: 5200,
    description: 'Substantial 500 gsm brushed fleece hoodie in deep washed charcoal. Generous boxy fit with ribbed side stretch gussets.',
    fabric_care: '100% heavy cotton fleece (500 gsm). Pre-shrunk. Wash cold with like colors.',
    tile_label: 'Fleece',
    image_url: '/img/hero/heavy-fleece-hoodie.webp',
    stock_xs: 3,
    stock_s: 6,
    stock_m: 10,
    stock_l: 7,
    stock_xl: 2,
    featured: 1,
    show_in_hero: 1,
    hero_image: '/img/hero/heavy-fleece-hoodie.webp',
    hero_image_mobile: '/img/hero/heavy-fleece-hoodie-mobile.webp',
    hero_alt: 'Heavy fleece hoodie front view cutout',
    hero_scale: 1.0
  }
];

function seed() {
  console.log('Seeding database with Beyond clothing collection...');

  const insertProduct = db.prepare(`
    INSERT INTO products (
      name, slug, category, price, description, fabric_care, tile_label,
      image_url, stock_xs, stock_s, stock_m, stock_l, stock_xl, featured,
      show_in_hero, hero_image, hero_image_mobile, hero_alt, hero_scale
    ) VALUES (
      @name, @slug, @category, @price, @description, @fabric_care, @tile_label,
      @image_url, @stock_xs, @stock_s, @stock_m, @stock_l, @stock_xl, @featured,
      @show_in_hero, @hero_image, @hero_image_mobile, @hero_alt, @hero_scale
    )
  `);

  const deleteExisting = db.prepare('DELETE FROM products');
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM products');

  const seedTransaction = db.transaction((products) => {
    deleteExisting.run();
    for (const p of products) {
      insertProduct.run({
        ...p,
        show_in_hero: p.show_in_hero || 0,
        hero_image: p.hero_image || '',
        hero_image_mobile: p.hero_image_mobile || '',
        hero_alt: p.hero_alt || p.name,
        hero_scale: p.hero_scale || 1.0
      });
    }
  });

  seedTransaction(initialProducts);

  const total = countStmt.get().count;
  console.log(`Successfully seeded ${total} products into store.db.`);
}

if (require.main === module) {
  seed();
}

module.exports = seed;
