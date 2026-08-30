import { PrismaClient, UserRole, OrderStatus, BatchStatus, DriverStatus, SlotStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting QuickCommerce database seed...');

  // 1. Clean existing database tables
  await prisma.auditLog.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.idempotencyKey.deleteMany();
  await prisma.deliveryOTP.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.deliveryBatchOrder.deleteMany();
  await prisma.batchDriverAssignment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.deliveryBatch.deleteMany();
  await prisma.deliverySlot.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.storeProduct.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.storeStaff.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.store.deleteMany();

  // 2. Create 5 Stores
  const stores = await Promise.all([
    prisma.store.create({
      data: {
        code: 'BLR-IND-01',
        name: 'QuickBlink Indiranagar',
        description: 'Flagship Bangalore dark store & rapid delivery hub',
        address: '100ft Road, 12th Main, HAL 2nd Stage, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
        phone: '+91 80 4123 4567',
        email: 'indiranagar@quickcommerce.dev',
        isActive: true,
        openingTime: '06:00',
        closingTime: '23:30',
        timezone: 'Asia/Kolkata',
      },
    }),
    prisma.store.create({
      data: {
        code: 'BLR-KOR-02',
        name: 'QuickBlink Koramangala',
        description: 'South Bangalore quick commerce fulfilment centre',
        address: '80 Feet Road, 4th Block, Koramangala',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560034',
        phone: '+91 80 4987 6543',
        email: 'koramangala@quickcommerce.dev',
        isActive: true,
        openingTime: '06:00',
        closingTime: '23:30',
        timezone: 'Asia/Kolkata',
      },
    }),
    prisma.store.create({
      data: {
        code: 'MUM-BAN-03',
        name: 'QuickBlink Bandra West',
        description: 'Mumbai western suburbs fast delivery dark store',
        address: 'Hill Road, Near Bandra Station, Bandra West',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400050',
        phone: '+91 22 2640 1234',
        email: 'bandra@quickcommerce.dev',
        isActive: true,
        openingTime: '07:00',
        closingTime: '23:00',
        timezone: 'Asia/Kolkata',
      },
    }),
    prisma.store.create({
      data: {
        code: 'DEL-CP-04',
        name: 'QuickBlink Connaught Place',
        description: 'Central Delhi premier delivery hub',
        address: 'Block M, Middle Circle, Connaught Place',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
        phone: '+91 11 2341 5678',
        email: 'delhicp@quickcommerce.dev',
        isActive: true,
        openingTime: '06:30',
        closingTime: '23:00',
        timezone: 'Asia/Kolkata',
      },
    }),
    prisma.store.create({
      data: {
        code: 'MUM-AND-05',
        name: 'QuickBlink Andheri East',
        description: 'Mumbai MIDC hub for business & residential orders',
        address: 'Chakala, Andheri-Kurla Road, Andheri East',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400093',
        phone: '+91 22 2830 5566',
        email: 'andheri@quickcommerce.dev',
        isActive: true,
        openingTime: '06:30',
        closingTime: '23:30',
        timezone: 'Asia/Kolkata',
      },
    }),
  ]);

  const defaultStore = stores[0]; // Indiranagar

  // 3. Create Core Demo Users
  const superAdmin = await prisma.user.create({
    data: {
      auth0Id: 'auth0|god-admin',
      email: 'godadmin@quickcommerce.dev',
      name: 'Rohan Deshmukh (God Admin)',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  const storeAdmin = await prisma.user.create({
    data: {
      auth0Id: 'auth0|store-admin',
      email: 'storeadmin@quickcommerce.dev',
      name: 'Priya Patel (Store Manager)',
      role: UserRole.STORE_ADMIN,
      phone: '+91 9876543210',
      isActive: true,
    },
  });

  await prisma.storeStaff.create({
    data: {
      userId: storeAdmin.id,
      storeId: defaultStore.id,
      role: UserRole.STORE_ADMIN,
      isActive: true,
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      auth0Id: 'auth0|store-staff',
      email: 'staff@quickcommerce.dev',
      name: 'Vikram Singh (Order Dispatcher)',
      role: UserRole.STORE_STAFF,
      phone: '+91 9811223344',
      isActive: true,
    },
  });

  await prisma.storeStaff.create({
    data: {
      userId: staffUser.id,
      storeId: defaultStore.id,
      role: UserRole.STORE_STAFF,
      isActive: true,
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      auth0Id: 'auth0|customer-demo',
      email: 'customer@quickcommerce.dev',
      name: 'Aarav Sharma',
      role: UserRole.CUSTOMER,
      phone: '+91 9988776655',
      isActive: true,
    },
  });

  const customerProfile = await prisma.customerProfile.create({
    data: { userId: customerUser.id },
  });

  // Create default customer addresses
  const address1 = await prisma.address.create({
    data: {
      customerId: customerUser.id,
      type: 'HOME',
      recipientName: 'Aarav Sharma',
      phone: '+91 9988776655',
      street: '#402, Green Glen Towers, 12th Main Road',
      apartment: 'Flat 402, B-Block',
      landmark: 'Near BDA Complex',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      isDefault: true,
    },
  });

  const address2 = await prisma.address.create({
    data: {
      customerId: customerUser.id,
      type: 'WORK',
      recipientName: 'Aarav Sharma (Office)',
      phone: '+91 9988776655',
      street: 'Tower 4, Embassy GolfLinks Tech Park, Domlur',
      landmark: 'Near Dell Building',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560071',
      isDefault: false,
    },
  });

  await prisma.customerProfile.update({
    where: { id: customerProfile.id },
    data: { defaultAddressId: address1.id },
  });

  // 4. Create 10+ Drivers across stores
  const driverData = [
    { name: 'Rahul Verma (Primary)', email: 'driver@quickcommerce.dev', phone: '+91 9845012345', vehicle: 'Ather 450X EV', num: 'KA 03 EX 4421', store: stores[0] },
    { name: 'Suresh Kumar', email: 'suresh.driver@quickcommerce.dev', phone: '+91 9845023456', vehicle: 'TVS iQube', num: 'KA 01 ER 8890', store: stores[0] },
    { name: 'Amit Patil', email: 'amit.driver@quickcommerce.dev', phone: '+91 9845034567', vehicle: 'Honda Activa 6G', num: 'KA 03 HN 2311', store: stores[0] },
    { name: 'Deepak Sharma', email: 'deepak.driver@quickcommerce.dev', phone: '+91 9845045678', vehicle: 'Bajaj Chetak EV', num: 'KA 05 MN 9012', store: stores[1] },
    { name: 'Manoj Sawant', email: 'manoj.driver@quickcommerce.dev', phone: '+91 9820012345', vehicle: 'Hero Electric', num: 'MH 02 DQ 7711', store: stores[2] },
    { name: 'Pradeep Yadav', email: 'pradeep.driver@quickcommerce.dev', phone: '+91 9810012345', vehicle: 'Ola S1 Pro', num: 'DL 01 AB 9988', store: stores[3] },
    { name: 'Ganesh Kadam', email: 'ganesh.driver@quickcommerce.dev', phone: '+91 9820054321', vehicle: 'TVS Jupiter', num: 'MH 03 BT 6543', store: stores[4] },
  ];

  const drivers = [];
  for (const d of driverData) {
    const user = await prisma.user.create({
      data: {
        auth0Id: `auth0|driver-${d.email.split('@')[0]}`,
        email: d.email,
        name: d.name,
        phone: d.phone,
        role: UserRole.DRIVER,
        isActive: true,
      },
    });

    const driver = await prisma.driver.create({
      data: {
        userId: user.id,
        storeId: d.store.id,
        vehicleType: d.vehicle,
        vehicleNumber: d.num,
        licenseNumber: `DL-${crypto.randomInt(10000, 99999)}`,
        status: DriverStatus.AVAILABLE,
        isAvailable: true,
      },
    });
    drivers.push(driver);
  }

  const primaryDriver = drivers[0];

  // 5. Create 8 Categories
  const categoryDefs = [
    { name: 'Dairy, Bread & Eggs', slug: 'dairy-bread-eggs', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300' },
    { name: 'Fresh Fruits', slug: 'fruits', image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=300' },
    { name: 'Fresh Vegetables', slug: 'vegetables', image: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=300' },
    { name: 'Cold Drinks & Juices', slug: 'beverages', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300' },
    { name: 'Snacks & Munchies', slug: 'snacks', image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300' },
    { name: 'Instant & Frozen Food', slug: 'instant-food', image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=300' },
    { name: 'Atta, Rice & Dals', slug: 'staples', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300' },
    { name: 'Personal Care & Cleaning', slug: 'personal-care', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300' },
  ];

  const categories: Record<string, any> = {};
  for (let i = 0; i < categoryDefs.length; i++) {
    const c = categoryDefs[i];
    const cat = await prisma.category.create({
      data: {
        name: c.name,
        slug: c.slug,
        imageUrl: c.image,
        displayOrder: i + 1,
        isActive: true,
      },
    });
    categories[c.slug] = cat;
  }

  // 6. Create 50+ Products
  const productsData = [
    // Dairy & Bread
    { cat: 'dairy-bread-eggs', name: 'Amul Taaza Homogenised Toned Milk', brand: 'Amul', unit: '1 L', mrp: 56, price: 54, img: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400' },
    { cat: 'dairy-bread-eggs', name: 'Nandini Pure Salted Butter', brand: 'Nandini', unit: '500 g', mrp: 275, price: 260, img: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400' },
    { cat: 'dairy-bread-eggs', name: 'Britannia 100% Whole Wheat Bread', brand: 'Britannia', unit: '400 g', mrp: 50, price: 48, img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400' },
    { cat: 'dairy-bread-eggs', name: 'Farm Fresh White Eggs (Pack of 12)', brand: 'Eggoz', unit: '12 pcs', mrp: 120, price: 105, img: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400' },
    { cat: 'dairy-bread-eggs', name: 'Epigamia Greek Yogurt Natural', brand: 'Epigamia', unit: '90 g', mrp: 45, price: 40, img: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400' },
    { cat: 'dairy-bread-eggs', name: 'Amul Malai Fresh Paneer', brand: 'Amul', unit: '200 g', mrp: 92, price: 88, img: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400' },
    { cat: 'dairy-bread-eggs', name: 'Mother Dairy Classic Curd / Dahi', brand: 'Mother Dairy', unit: '400 g', mrp: 35, price: 34, img: 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=400' },

    // Fruits
    { cat: 'fruits', name: 'Fresh Ratnagiri Alphonso Mangoes', brand: 'FarmDirect', unit: '1 kg (approx 4 pcs)', mrp: 450, price: 399, img: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400' },
    { cat: 'fruits', name: 'Kashmiri Royal Delicious Apple', brand: 'FarmFresh', unit: '4 pcs (approx 600g)', mrp: 180, price: 159, img: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400' },
    { cat: 'fruits', name: 'Robusta Golden Bananas', brand: 'FarmFresh', unit: '1 kg (approx 6 pcs)', mrp: 60, price: 49, img: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400' },
    { cat: 'fruits', name: 'Sweet Seedless Green Grapes', brand: 'Fresho', unit: '500 g', mrp: 90, price: 79, img: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400' },
    { cat: 'fruits', name: 'Nagpur Sweet Oranges (Mosambi)', brand: 'Fresho', unit: '1 kg', mrp: 110, price: 89, img: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=400' },
    { cat: 'fruits', name: 'Fresh Mahabaleshwar Strawberries', brand: 'Fresho', unit: '200 g box', mrp: 130, price: 115, img: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400' },

    // Vegetables
    { cat: 'vegetables', name: 'Fresh Hybrid Red Tomatoes', brand: 'FarmFresh', unit: '1 kg', mrp: 40, price: 32, img: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400' },
    { cat: 'vegetables', name: 'Nashik Red Onions', brand: 'FarmFresh', unit: '1 kg', mrp: 45, price: 38, img: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400' },
    { cat: 'vegetables', name: 'Fresh Jyoti Potatoes', brand: 'FarmFresh', unit: '1 kg', mrp: 35, price: 29, img: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400' },
    { cat: 'vegetables', name: 'Fresh Green Shimla Capsicum', brand: 'FarmFresh', unit: '500 g', mrp: 50, price: 39, img: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400' },
    { cat: 'vegetables', name: 'Hydroponic Tender Baby Spinach (Palak)', brand: 'UrbanGreens', unit: '250 g', mrp: 40, price: 28, img: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400' },
    { cat: 'vegetables', name: 'Fresh Country Coriander (Dhaniya)', brand: 'FarmFresh', unit: '100 g bunch', mrp: 20, price: 12, img: 'https://images.unsplash.com/photo-1525607551316-4a8e16d1f9ba?w=400' },
    { cat: 'vegetables', name: 'Fresh Button Mushrooms', brand: 'NatureFresh', unit: '200 g pack', mrp: 65, price: 55, img: 'https://images.unsplash.com/photo-1504544750208-dc0358e63f7f?w=400' },

    // Beverages
    { cat: 'beverages', name: 'Thums Up Charged Carbonated Can', brand: 'Coca-Cola', unit: '300 ml', mrp: 40, price: 38, img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400' },
    { cat: 'beverages', name: 'Paper Boat Aamras Mango Drink', brand: 'Paper Boat', unit: '250 ml', mrp: 35, price: 32, img: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=400' },
    { cat: 'beverages', name: 'Red Bull Energy Drink', brand: 'Red Bull', unit: '250 ml', mrp: 125, price: 119, img: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400' },
    { cat: 'beverages', name: 'Nescafe Hazelnut Cold Coffee Can', brand: 'Nescafe', unit: '180 ml', mrp: 60, price: 55, img: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400' },
    { cat: 'beverages', name: 'Raw Pressery Tender Coconut Water', brand: 'Raw Pressery', unit: '200 ml', mrp: 60, price: 52, img: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400' },

    // Snacks
    { cat: 'snacks', name: 'Lays India\'s Magic Masala Potato Chips', brand: 'Lay\'s', unit: '73 g', mrp: 30, price: 28, img: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400' },
    { cat: 'snacks', name: 'Kurkure Masala Munch Crisps', brand: 'Kurkure', unit: '85 g', mrp: 20, price: 19, img: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281e5b?w=400' },
    { cat: 'snacks', name: 'Pringles Sour Cream & Onion', brand: 'Pringles', unit: '107 g', mrp: 115, price: 109, img: 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?w=400' },
    { cat: 'snacks', name: 'Haldiram\'s Nagpur Bhujia Sev', brand: 'Haldiram\'s', unit: '400 g', mrp: 110, price: 99, img: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400' },
    { cat: 'snacks', name: 'Cadbury Dairy Milk Silk Chocolate', brand: 'Cadbury', unit: '150 g', mrp: 175, price: 165, img: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400' },
    { cat: 'snacks', name: 'Oreo Vanilla Creme Biscuits Family Pack', brand: 'Oreo', unit: '300 g', mrp: 85, price: 79, img: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400' },

    // Instant Food
    { cat: 'instant-food', name: 'Maggi 2-Minute Masala Noodles (Pack of 4)', brand: 'Nestle', unit: '280 g', mrp: 56, price: 52, img: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400' },
    { cat: 'instant-food', name: 'Kellogg\'s Crunchy Fruit & Nut Muesli', brand: 'Kellogg\'s', unit: '500 g', mrp: 350, price: 310, img: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400' },
    { cat: 'instant-food', name: 'Knorr Sweet Corn Veg Instant Soup', brand: 'Knorr', unit: '43 g', mrp: 40, price: 36, img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400' },
    { cat: 'instant-food', name: 'Saffola Rolled White Oats Classic', brand: 'Saffola', unit: '1 kg', mrp: 199, price: 175, img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400' },

    // Staples
    { cat: 'staples', name: 'Aashirvaad Select 100% Sharbati Whole Wheat Atta', brand: 'Aashirvaad', unit: '5 kg', mrp: 320, price: 295, img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400' },
    { cat: 'staples', name: 'India Gate Feast Rozzana Basmati Rice', brand: 'India Gate', unit: '5 kg', mrp: 480, price: 425, img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400' },
    { cat: 'staples', name: 'Fortune Sunlite Refined Sunflower Oil', brand: 'Fortune', unit: '1 L pouch', mrp: 165, price: 145, img: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400' },
    { cat: 'staples', name: 'Tata Salt Vacuum Evaporated Iodised Salt', brand: 'Tata', unit: '1 kg', mrp: 28, price: 26, img: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=400' },
    { cat: 'staples', name: 'Tata Sampann Unpolished Toor Dal', brand: 'Tata Sampann', unit: '1 kg', mrp: 195, price: 179, img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400' },

    // Personal Care & Home
    { cat: 'personal-care', name: 'Dettol Original Germ Protection Liquid Handwash', brand: 'Dettol', unit: '900 ml Refill', mrp: 189, price: 165, img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400' },
    { cat: 'personal-care', name: 'Colgate Total Advanced Health Toothpaste', brand: 'Colgate', unit: '240 g', mrp: 160, price: 142, img: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400' },
    { cat: 'personal-care', name: 'Ariel Matic Front Load Liquid Detergent', brand: 'Ariel', unit: '1 L', mrp: 260, price: 229, img: 'https://images.unsplash.com/photo-1585670149967-b4f4da88cc9f?w=400' },
    { cat: 'personal-care', name: 'Vim Dishwash Gel Lemon Flavour', brand: 'Vim', unit: '750 ml', mrp: 145, price: 129, img: 'https://images.unsplash.com/photo-1585670149967-b4f4da88cc9f?w=400' },
  ];

  const createdProducts = [];
  for (const p of productsData) {
    const slug = `${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}-${crypto.randomInt(100, 999)}`;
    const product = await prisma.product.create({
      data: {
        categoryId: categories[p.cat].id,
        name: p.name,
        slug,
        brand: p.brand,
        unit: p.unit,
        mrp: p.mrp,
        basePrice: p.price,
        imageUrl: p.img,
        isActive: true,
      },
    });
    createdProducts.push(product);
  }

  // 7. Seed Inventory & StoreProducts for all stores
  for (const store of stores) {
    for (const product of createdProducts) {
      await prisma.storeProduct.create({
        data: {
          storeId: store.id,
          productId: product.id,
          price: product.basePrice,
          isAvailable: true,
        },
      });

      // Stock quantity between 15 and 60 units
      const initialStock = crypto.randomInt(15, 60);
      await prisma.inventory.create({
        data: {
          storeId: store.id,
          productId: product.id,
          quantity: initialStock,
          reservedQuantity: 0,
          lowStockThreshold: 5,
        },
      });
    }
  }

  // 8. Create Delivery Slots for Today and Tomorrow across all stores
  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const slotWindows = [
    { start: '09:00', end: '12:00' },
    { start: '12:00', end: '15:00' },
    { start: '15:00', end: '18:00' },
    { start: '18:00', end: '21:00' },
  ];

  const createdSlots = [];
  for (const store of stores) {
    for (const date of [todayStr, tomorrowStr]) {
      for (const w of slotWindows) {
        const slot = await prisma.deliverySlot.create({
          data: {
            storeId: store.id,
            date,
            startTime: w.start,
            endTime: w.end,
            capacity: 30,
            bookedCount: 0,
            status: SlotStatus.OPEN,
            isActive: true,
          },
        });
        createdSlots.push(slot);
      }
    }
  }

  // 9. Seed the Demonstration Batch Scenario
  // Scenario: 4 orders in Indiranagar store for 03:00 - 06:00 slot, grouped into Batch BATCH-001 assigned to Rahul Verma
  const targetSlot = createdSlots.find((s) => s.storeId === defaultStore.id && s.date === todayStr && s.startTime === '15:00')!;

  const batch = await prisma.deliveryBatch.create({
    data: {
      batchNumber: 'BATCH-001',
      storeId: defaultStore.id,
      deliverySlotId: targetSlot.id,
      driverId: primaryDriver.id,
      status: BatchStatus.OUT_FOR_DELIVERY,
      totalOrders: 4,
      completedOrders: 2,
      assignedAt: new Date(Date.now() - 3600000),
      dispatchedAt: new Date(Date.now() - 1800000),
    },
  });

  await prisma.batchDriverAssignment.create({
    data: {
      batchId: batch.id,
      driverId: primaryDriver.id,
      status: 'ACTIVE',
    },
  });

  await prisma.driver.update({
    where: { id: primaryDriver.id },
    data: { status: DriverStatus.BUSY, isAvailable: false },
  });

  // Create 4 orders in the batch (2 delivered, 2 pending out for delivery)
  const sampleAddresses = [
    { name: 'Kavita Iyer', phone: '+91 9845099881', street: '#102, Shanti Niketan, 100ft Road', apt: 'Flat 102' },
    { name: 'Vikram Joshi', phone: '+91 9845099882', street: '#55, 6th Cross, CMH Road', apt: 'Villa 5' },
    { name: 'Meera Nambiar', phone: '+91 9845099883', street: '#304, Prestige Palms, 12th Main', apt: '3rd Floor' },
    { name: 'Rohan Gupta', phone: '+91 9845099884', street: '#12, Old Airport Road, Kodihalli', apt: 'Suite 12' },
  ];

  for (let idx = 0; idx < sampleAddresses.length; idx++) {
    const cust = sampleAddresses[idx];
    const isDelivered = idx < 2; // First 2 delivered

    const user = await prisma.user.create({
      data: {
        auth0Id: `auth0|cust-batch-${idx + 1}`,
        email: `batch.customer${idx + 1}@quickcommerce.dev`,
        name: cust.name,
        phone: cust.phone,
        role: UserRole.CUSTOMER,
      },
    });

    const orderNum = `QC-${todayStr.replace(/-/g, '')}-100${idx + 1}`;
    const rawOtp = '123456';
    const otpHash = crypto.createHmac('sha256', 'dev-otp-salt-quickcommerce-2026').update(rawOtp).digest('hex');

    const order = await prisma.order.create({
      data: {
        orderNumber: orderNum,
        customerId: user.id,
        storeId: defaultStore.id,
        deliveryDate: todayStr,
        deliverySlotId: targetSlot.id,
        deliveryBatchId: batch.id,
        status: isDelivered ? OrderStatus.DELIVERED : OrderStatus.OUT_FOR_DELIVERY,
        subtotal: 450.0,
        discount: 0.0,
        tax: 22.5,
        deliveryFee: 0.0,
        total: 472.5,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: isDelivered ? PaymentStatus.PAID : PaymentStatus.PENDING,
        addressSnapshot: {
          recipientName: cust.name,
          phone: cust.phone,
          street: cust.street,
          apartment: cust.apt,
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560038',
        },
        pricingSnapshot: {
          subtotal: 450,
          discount: 0,
          tax: 22.5,
          deliveryFee: 0,
          total: 472.5,
        },
        items: {
          create: [
            {
              productId: createdProducts[0].id,
              productNameSnapshot: createdProducts[0].name,
              skuSnapshot: createdProducts[0].slug,
              unitSnapshot: createdProducts[0].unit,
              unitPrice: 54.0,
              quantity: 2,
              discount: 0,
              tax: 0,
              total: 108.0,
            },
            {
              productId: createdProducts[7].id,
              productNameSnapshot: createdProducts[7].name,
              skuSnapshot: createdProducts[7].slug,
              unitSnapshot: createdProducts[7].unit,
              unitPrice: 399.0,
              quantity: 1,
              discount: 0,
              tax: 0,
              total: 399.0,
            },
          ],
        },
        timeline: {
          create: [
            { fromStatus: null, toStatus: OrderStatus.PLACED, reason: 'Order placed by customer', actorId: user.id, actorRole: UserRole.CUSTOMER },
            { fromStatus: OrderStatus.PLACED, toStatus: OrderStatus.ACCEPTED, reason: 'Store accepted', actorId: storeAdmin.id, actorRole: UserRole.STORE_ADMIN },
            { fromStatus: OrderStatus.ACCEPTED, toStatus: OrderStatus.PREPARING, reason: 'Packing items', actorId: staffUser.id, actorRole: UserRole.STORE_STAFF },
            { fromStatus: OrderStatus.PREPARING, toStatus: OrderStatus.READY_FOR_DISPATCH, reason: 'Packed and ready', actorId: staffUser.id, actorRole: UserRole.STORE_STAFF },
            { fromStatus: OrderStatus.READY_FOR_DISPATCH, toStatus: OrderStatus.ASSIGNED_TO_BATCH, reason: 'Batched with BATCH-001', actorId: storeAdmin.id, actorRole: UserRole.STORE_ADMIN },
            { fromStatus: OrderStatus.ASSIGNED_TO_BATCH, toStatus: OrderStatus.OUT_FOR_DELIVERY, reason: 'Dispatched for delivery', actorId: primaryDriver.userId, actorRole: UserRole.DRIVER },
            ...(isDelivered
              ? [{ fromStatus: OrderStatus.OUT_FOR_DELIVERY, toStatus: OrderStatus.DELIVERED, reason: 'Customer verified OTP', actorId: primaryDriver.userId, actorRole: UserRole.DRIVER }]
              : []),
          ],
        },
        deliveryOtp: {
          create: {
            otpHash,
            expiresAt: new Date(Date.now() + 3600000),
            attemptCount: isDelivered ? 1 : 0,
            verifiedAt: isDelivered ? new Date() : null,
            usedAt: isDelivered ? new Date() : null,
          },
        },
      },
    });

    await prisma.deliveryBatchOrder.create({
      data: {
        batchId: batch.id,
        orderId: order.id,
        sequence: idx + 1,
      },
    });
  }

  // Update targetSlot bookedCount
  await prisma.deliverySlot.update({
    where: { id: targetSlot.id },
    data: { bookedCount: 4 },
  });

  console.log('✅ QuickCommerce database seed completed successfully!');
  console.log('📊 Seed Summary:');
  console.log(`- 5 Stores seeded`);
  console.log(`- 8 Categories seeded`);
  console.log(`- ${createdProducts.length} Products seeded`);
  console.log(`- ${createdSlots.length} Delivery Slots seeded`);
  console.log(`- Demo Accounts:`);
  console.log(`  - Customer: customer@quickcommerce.dev`);
  console.log(`  - Driver: driver@quickcommerce.dev`);
  console.log(`  - Store Admin: storeadmin@quickcommerce.dev`);
  console.log(`  - Store Staff: staff@quickcommerce.dev`);
  console.log(`  - Super Admin: godadmin@quickcommerce.dev`);
  console.log(`- Live Batch Scenario: BATCH-001 with 4 orders (2 delivered, 2 out for delivery, demo OTP: 123456)`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
