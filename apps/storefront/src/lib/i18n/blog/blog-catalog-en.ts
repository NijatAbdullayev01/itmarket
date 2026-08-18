import type { BlogPost } from "./blog-types";

export const blogCatalogEn: BlogPost[] = [
  {
    slug: "monitor-secimi-is-oyun",
    title: "Monitors for work and play: size, Hz, and panel type",
    excerpt:
      "24, 27, or 32 inches? Is 60 Hz enough? Start with desk distance and the job, then IPS/VA and resolution.",
    description:
      "Monitor buying guide in Baku: 27-inch, IPS, 144 Hz, USB-C. Work, design, and gaming — IT Market.",
    publishedAt: "2026-08-18",
    updatedAt: "2026-08-18",
    readingMinutes: 12,
    category: "Monitors",
    categoryHref: "/categories/monitor",
    tags: ["monitor", "IPS", "gaming", "office", "Baku"],
    imagePath: "/images/blog/monitor-secimi-is-oyun.jpg",
    cta: { label: "Browse monitors", href: "/categories/monitor" },
    blocks: [
      {
        type: "p",
        text: "The wrong screen makes a good laptop feel cheap; the right one turns a mid-range PC into a comfortable station. The question we hear most: “Should I get 27 inches?” It depends on desk depth, viewing distance, and the work you do. Use this checklist in the [monitors catalog](/categories/monitor).",
      },
      {
        type: "h2",
        text: "Size: when 24, 27, and 32 inches make sense",
      },
      {
        type: "p",
        text: "At 50–60 cm, 24–25-inch Full HD is still fine for office work. At 70 cm with two windows side by side, 27-inch QHD is usually the sweet spot. 32 inches wants 4K or more arm’s length — otherwise you start turning your head.",
      },
      {
        type: "ul",
        items: [
          "Excel, browser, calls: 27-inch IPS at 60–75 Hz is enough.",
          "Photo/UI work: color coverage and even brightness matter more than Hertz.",
          "FPS games: Hertz and response time beat extra inches.",
        ],
      },
      {
        type: "h2",
        text: "Panel: IPS, VA, OLED — pick a scenario",
      },
      {
        type: "p",
        text: "IPS is the office/design default (angles and stable color). VA is cheaper “cinema” contrast but shifts when you move. OLED wins contrast; static Excel all day is a burn-in conversation. Marketing names do not replace the job.",
      },
      {
        type: "h2",
        text: "Hertz and resolution: who needs 144 Hz?",
      },
      {
        type: "p",
        text: "Text and spreadsheets are fine at 60 Hz. 144 Hz helps games — if the GPU can feed it. Full HD looks dense on 24 inches; 27 inches wants QHD for sharp text. 4K needs GPU power and 125–150% scaling.",
      },
      {
        type: "callout",
        text: "A gaming laptop may cap Hertz over HDMI 1.4. Check DisplayPort or USB-C DP Alt Mode. See also [gaming PC vs laptop](/blog/oyun-pc-yoxsa-noutbuk).",
      },
      {
        type: "h2",
        text: "Ports, USB-C, and ergonomics",
      },
      {
        type: "ol",
        items: [
          "HDMI + DisplayPort: laptop and mini PC on one desk.",
          "USB-C 65W+: one cable for video and charge.",
          "Height/tilt: a [monitor stand](/categories/monitor-stendi) can matter as much as the panel.",
          "Flicker-free / low blue light: real difference for all-day work.",
        ],
      },
      {
        type: "p",
        text: "Mini PC + monitor is a popular Baku setup. Read the [mini PC guide](/blog/mini-pc-secimi) together with this one. Shortlist 2–3 screens — not the whole wall.",
      },
      {
        type: "faq",
        items: [
          {
            question: "Do I need 144 Hz for office work?",
            answer:
              "No. 60–75 Hz IPS is enough for text and calls. Keep 144 Hz for games.",
          },
          {
            question: "Is 27-inch Full HD sharp?",
            answer:
              "Many people find it soft. QHD is the better 27-inch density. Keep Full HD on 24 inches.",
          },
          {
            question: "Will a USB-C monitor charge my laptop?",
            answer:
              "Only if the port supports DP Alt Mode and enough wattage. Check the spec sheet.",
          },
        ],
      },
    ],
  },
  {
    slug: "wifi-router-secimi",
    title: "Home and office Wi-Fi: mesh, Wi-Fi 6, and real speed",
    excerpt:
      "A “3000 Mbps” label does not go through concrete. Map floors and device count first, then Wi-Fi 6 and WAN.",
    description:
      "Wi-Fi router guide in Baku: Wi-Fi 6, mesh, gigabit WAN. Home and small office — IT Market.",
    publishedAt: "2026-08-16",
    updatedAt: "2026-08-16",
    readingMinutes: 11,
    category: "Networking",
    categoryHref: "/categories/router",
    tags: ["Wi-Fi", "router", "mesh", "network", "Baku"],
    imagePath: "/images/blog/wifi-router-secimi.jpg",
    cta: { label: "Browse routers", href: "/categories/router" },
    blocks: [
      {
        type: "p",
        text: "If the ISP promises 200 Mbps and a bedroom shows 12, the box and the walls are usually the bottleneck. Baku apartments add concrete and dense neighbor networks. This guide covers [routers](/categories/router) and [access points](/categories/access-point).",
      },
      {
        type: "h2",
        text: "Map the home before the AX3000 sticker",
      },
      {
        type: "p",
        text: "One room and ~10 devices: a solid Wi-Fi 6 router may be enough. Three rooms or two floors: think mesh or a dedicated AP. Find dead zones with a phone speed test, then shop.",
      },
      {
        type: "ul",
        items: [
          "15+ devices at once: Wi-Fi 6 and a stronger CPU.",
          "IPTV/VLAN: confirm firmware support if your ISP requires it.",
          "VPN / home office: cheap CPUs choke under encryption.",
        ],
      },
      {
        type: "h2",
        text: "Wi-Fi 5, 6, 6E — what is worth buying?",
      },
      {
        type: "p",
        text: "In 2026, Wi-Fi 6 is the sensible new-buy floor. 6E adds 6 GHz only if your phones and laptops speak it. AX1800 vs AX3000 is marketing; antennas, CPU, and mesh family matter more.",
      },
      {
        type: "h2",
        text: "Mesh, repeater, or access point?",
      },
      {
        type: "ol",
        items: [
          "Repeater: cheap, often halves throughput — temporary.",
          "Mesh: one SSID, easier roaming across two–three nodes.",
          "Access point: best if you can run cable — see [AP catalog](/categories/access-point).",
        ],
      },
      {
        type: "callout",
        text: "Do not hide the router behind a TV or in a metal cabinet. Mid-room, 1–1.5 m high, open shelf — free upgrade.",
      },
      {
        type: "h2",
        text: "WAN, gigabit, and a small office",
      },
      {
        type: "p",
        text: "If the ISP is 500 Mbps+, you want gigabit (or 2.5G) WAN/LAN. A [switch](/categories/kommutator) is more stable than Wi-Fi for desks and printers. A USB port on a router is not a substitute for a real [NAS](/categories/nas).",
      },
      {
        type: "p",
        text: "Write down walls and device count, then pick Wi-Fi 6 or mesh. Change the default password and enable WPA3 when you can.",
      },
      {
        type: "faq",
        items: [
          {
            question: "Should I keep the ISP modem-router?",
            answer:
              "Often yes, in bridge mode, with your own router in front. Double NAT hurts games and VPN.",
          },
          {
            question: "Do mesh nodes need to be the same brand?",
            answer:
              "Same ecosystem is far less headache for roaming. Mixed brands can work with weak handoff.",
          },
          {
            question: "Is Wi-Fi 7 worth it now?",
            answer:
              "Only if your clients support it and the budget is easy. Placement plus Wi-Fi 6 still wins most homes.",
          },
        ],
      },
    ],
  },
  {
    slug: "printer-secimi-ofis-ev",
    title: "Home and office printers: inkjet, laser, and MFPs",
    excerpt:
      "Cost per page can beat the box price. Estimate monthly pages and color, then choose inkjet or laser.",
    description:
      "Printer buying guide in Baku: inkjet vs laser vs MFP, cartridges, cost per page — IT Market.",
    publishedAt: "2026-08-14",
    updatedAt: "2026-08-14",
    readingMinutes: 11,
    category: "Laser printers",
    categoryHref: "/categories/lazer-printer",
    tags: ["printer", "laser", "inkjet", "MFP", "office"],
    imagePath: "/images/blog/printer-secimi-ofis-ev.jpg",
    cta: { label: "Browse laser printers", href: "/categories/lazer-printer" },
    blocks: [
      {
        type: "p",
        text: "A cheap printer often hides expensive ink. We recommend shopping by monthly pages and cost per page, not the sticker. Shop by type: [inkjet MFP](/categories/inkjet-mfp), [laser printer](/categories/lazer-printer), or [laser MFP](/categories/lazer-mfp) — this article tells you which shelf.",
      },
      {
        type: "h2",
        text: "Inkjet or laser?",
      },
      {
        type: "ul",
        items: [
          "Inkjet: color photos, school projects, low volume. Heads can dry if unused.",
          "Laser: contracts and invoices. Lower cost per page; first page may wait.",
          "Color laser: branded reports — costly up front, sensible at office volume.",
        ],
      },
      {
        type: "h2",
        text: "MFP: who needs scan and copy?",
      },
      {
        type: "p",
        text: "Home office and bookkeeping usually want print+scan+copy. [Inkjet MFP](/categories/inkjet-mfp) for color at home, [laser MFP](/categories/lazer-mfp) for document flow. ADF matters only if you scan stacks, not one passport a year.",
      },
      {
        type: "h2",
        text: "Cost per page and cartridges",
      },
      {
        type: "p",
        text: "Starter toner at 1,000 pages vs 3,000-page packs changes the math. Check [cartridges](/categories/kartric) before you buy the box. Tank inkjets win for families; first price is higher.",
      },
      {
        type: "callout",
        text: "Cheap third-party cartridges can void warranty. Repair costs more than a genuine toner.",
      },
      {
        type: "h2",
        text: "Wi-Fi, duplex, duty cycle",
      },
      {
        type: "ol",
        items: [
          "Wi-Fi / AirPrint for cable-free home printing.",
          "Duplex halves paper in an office.",
          "Ethernet is more stable when several people print.",
          "Duty cycle matters in a queue, not in a bedroom.",
        ],
      },
      {
        type: "p",
        text: "Estimate monthly pages, decide if you need color, then pick inkjet or laser. Add three years of supplies to the box price. A separate [scanner](/categories/skaner) is for archive volume only.",
      },
      {
        type: "faq",
        items: [
          {
            question: "Do I need laser for 50 pages a month?",
            answer:
              "Usually no. Low volume + color = tank inkjet or a simple MFP.",
          },
          {
            question: "Why does a cheap inkjet start streaking?",
            answer:
              "Dried heads. Print a color page weekly or choose a tank system.",
          },
          {
            question: "Color laser or color inkjet for an office?",
            answer:
              "Daily color reports: laser. Occasional brochures: tank inkjet can be cheaper.",
          },
        ],
      },
    ],
  },
  {
    slug: "oyun-pc-yoxsa-noutbuk",
    title: "Gaming PC vs gaming laptop: which is the smarter buy?",
    excerpt:
      "A desktop usually buys more GPU for the same money; a laptop travels. Add cooling, upgrades, and a monitor to the math.",
    description:
      "Gaming PC vs laptop in Baku: performance per manat, cooling, RAM/SSD upgrades — IT Market.",
    publishedAt: "2026-08-12",
    updatedAt: "2026-08-12",
    readingMinutes: 12,
    category: "Laptops",
    categoryHref: "/categories/noutbuk",
    tags: ["gaming", "PC", "laptop", "GPU", "Baku"],
    imagePath: "/images/blog/oyun-pc-yoxsa-noutbuk.jpg",
    cta: { label: "Browse laptops", href: "/categories/noutbuk" },
    blocks: [
      {
        type: "p",
        text: "Same budget, desktop usually wins GPU; laptop wins “pick up and go.” [Laptops](/categories/noutbuk) and [desktops](/categories/masaustu) are separate shelves — this article picks which one.",
      },
      {
        type: "h2",
        text: "When a desktop wins",
      },
      {
        type: "ul",
        items: [
          "More GPU class per AZN.",
          "Cooling and less throttling.",
          "Easier [RAM](/categories/ram) and [SSD](/categories/ssd) upgrades — see [SSD & RAM](/blog/ssd-ram-yukseltme).",
          "A proper [gaming monitor](/categories/gaming-monitor), [keyboard](/categories/gaming-klaviatura), and [mouse](/categories/gaming-sican).",
        ],
      },
      {
        type: "h2",
        text: "When a gaming laptop makes sense",
      },
      {
        type: "p",
        text: "Two locations every week, or no permanent desk. You pay a tax: weaker GPU, fan noise, short battery. 16 GB / 512 GB is the 2026 comfort floor; 32 GB / 1 TB reduces soon-after upgrades.",
      },
      {
        type: "callout",
        text: "Do not buy a gaming laptop as an “office spare.” Heavy, loud, poor battery. For work, use the [laptop guide](/blog/noutbuk-is-tehsil-secimi).",
      },
      {
        type: "h2",
        text: "GPU watts and 1080 vs 1440",
      },
      {
        type: "p",
        text: "Laptop GPUs with the same name are often slower (lower TGP). Match Hertz to the card — 240 Hz plus a weak GPU is wasted. See the [monitor guide](/blog/monitor-secimi-is-oyun).",
      },
      {
        type: "h2",
        text: "Peripherals",
      },
      {
        type: "p",
        text: "Budget extra for a [gaming mouse](/categories/gaming-sican), [keyboard](/categories/gaming-klaviatura), and [headset](/categories/gaming-qulaqliq) on desktop. Laptops include a keyboard; a mouse still helps long sessions.",
      },
      {
        type: "p",
        text: "Stable desk at home: PC + monitor. You travel weekly: gaming laptop. Mini PCs are for office, not AAA — [mini PC guide](/blog/mini-pc-secimi).",
      },
      {
        type: "faq",
        items: [
          {
            question: "Can I upgrade a gaming laptop like a desktop?",
            answer:
              "RAM and SSD sometimes. GPU almost never. Desktops can swap a card in three years.",
          },
          {
            question: "Is 8 GB enough in 2026?",
            answer: "Not for games. 16 GB minimum, 32 GB if Discord and Chrome stay open.",
          },
          {
            question: "How much does heat cut performance?",
            answer:
              "10–20% throttling is common without a stand and clear vents. A duvet is the worst dock.",
          },
        ],
      },
    ],
  },
  {
    slug: "ssd-ram-yukseltme",
    title: "Speed up a PC: SSD and RAM upgrades",
    excerpt:
      "Replacing an HDD with NVMe is often cheaper than a new laptop. Check slots and DDR generation first.",
    description:
      "SSD and RAM upgrade guide in Baku: NVMe, DDR4/DDR5, compatibility — IT Market.",
    publishedAt: "2026-08-10",
    updatedAt: "2026-08-10",
    readingMinutes: 11,
    category: "Components",
    categoryHref: "/categories/ssd",
    tags: ["SSD", "RAM", "NVMe", "upgrade", "PC"],
    imagePath: "/images/blog/ssd-ram-yukseltme.jpg",
    cta: { label: "Browse SSD and RAM", href: "/categories/ssd" },
    blocks: [
      {
        type: "p",
        text: "“My PC is slow” is usually HDD, a full disk, or too little RAM. Check [SSD](/categories/ssd), [M.2 NVMe](/categories/m2-nvme-ssd), and [RAM](/categories/ram) before buying a new machine.",
      },
      {
        type: "h2",
        text: "SSD: SATA or NVMe?",
      },
      {
        type: "p",
        text: "HDD to SATA SSD is already night and day. NVMe wins large files and game loads. One M.2 slot in a laptop: go NVMe. Desktops can mix NVMe for the OS and SATA for archive.",
      },
      {
        type: "ul",
        items: [
          "256 GB fills fast (OS + apps).",
          "512 GB is a comfortable daily floor.",
          "1 TB for games and photo/video.",
        ],
      },
      {
        type: "h2",
        text: "RAM: DDR4 and DDR5 do not mix",
      },
      {
        type: "p",
        text: "The motherboard decides. See [DDR4](/categories/ddr4-ram) vs [DDR5](/categories/ddr5-ram). 8 GB is tight in 2026; 16 GB is the office/study zone; 32 GB for heavy multitasking. Two matched sticks beat one big stick (dual channel).",
      },
      {
        type: "callout",
        text: "Some laptops have soldered RAM — no empty slot. Tell us the model before you buy sticks.",
      },
      {
        type: "h2",
        text: "Clone, backup, migrate",
      },
      {
        type: "ol",
        items: [
          "Copy files to an [external SSD](/categories/xarici-ssd) first.",
          "Disk clone keeps Windows as-is; clean install is tidier but slower.",
          "Keep the old HDD as extra storage — not the only copy.",
        ],
      },
      {
        type: "h2",
        text: "Gaming vs office upgrades",
      },
      {
        type: "p",
        text: "Games: 16→32 GB RAM and 1 TB NVMe often cut stutter more than a tiny GPU bump. Office mini PCs: 16 GB + 512 GB is often enough. Building a gaming rig? Read [PC vs laptop](/blog/oyun-pc-yoxsa-noutbuk).",
      },
      {
        type: "p",
        text: "Confirm the slot (M.2 size, DDR generation) before capacity. Wrong-generation RAM stays in the box.",
      },
      {
        type: "faq",
        items: [
          {
            question: "Will NVMe overheat a thin laptop?",
            answer:
              "Cheap DRAM-less drives can run hot. A decent SSD plus the stock heatsink is usually enough.",
          },
          {
            question: "Does 16→32 GB speed up Office?",
            answer:
              "If you live in 20 Chrome tabs, yes. Word plus three tabs: spend on SSD instead.",
          },
          {
            question: "Can I install it myself?",
            answer:
              "M.2 is one screw if you are careful. If opening the laptop voids warranty, use a service desk.",
          },
        ],
      },
    ],
  },
  {
    slug: "mini-pc-secimi",
    title: "Who should buy a mini PC (instead of a laptop)?",
    excerpt:
      "Tiny box, big monitor. Great for desks, signage, and living-room PCs — not for AAA games or commuting.",
    description:
      "Mini PC buying guide in Baku: office HDMI setups vs laptops — IT Market.",
    publishedAt: "2026-08-08",
    updatedAt: "2026-08-08",
    readingMinutes: 10,
    category: "Mini PC",
    categoryHref: "/categories/mini-pc",
    tags: ["mini PC", "office", "HDMI", "Baku"],
    imagePath: "/images/blog/mini-pc-secimi.jpg",
    cta: { label: "Browse mini PCs", href: "/categories/mini-pc" },
    blocks: [
      {
        type: "p",
        text: "A mini PC disappears behind the display and still runs full Windows. It can beat a laptop on price because you skip the built-in screen and battery — so add a [monitor](/categories/monitor) and a [mouse](/categories/sican) to the budget. That is what the [mini PC](/categories/mini-pc) shelf is for.",
      },
      {
        type: "h2",
        text: "Who it fits — and who it does not",
      },
      {
        type: "ul",
        items: [
          "Fits: bookkeeping, reception, HDMI signage, living-room PC.",
          "Does not: heavy 3D games, daily commuting, battery on the metro.",
          "Hybrid: mini PC + monitor at home, cheap laptop on the road.",
        ],
      },
      {
        type: "h2",
        text: "CPU, RAM, SSD, ports",
      },
      {
        type: "p",
        text: "Office comfort: modern i3/Ryzen 3-class, 16 GB RAM, 512 GB SSD. 8 GB is kiosk territory. Match HDMI/USB-C to the Hertz in the [monitor guide](/blog/monitor-secimi-is-oyun). Dual monitors need two video outputs.",
      },
      {
        type: "callout",
        text: "Some mini PCs let you swap RAM and SSD later — see [upgrades](/blog/ssd-ram-yukseltme). Soldered RAM is a trap if you buy the 8 GB SKU “to save”.",
      },
      {
        type: "h2",
        text: "Noise, dust, VESA",
      },
      {
        type: "p",
        text: "Small box, small fan. Good units are silent at a desk; cheap ones hiss. VESA mounting hides the PC behind the screen. Keep it off carpet.",
      },
      {
        type: "h2",
        text: "Honest comparison with a laptop",
      },
      {
        type: "ol",
        items: [
          "Mini PC + 27-inch monitor = comfortable office, zero mobility.",
          "Ultrabook = battery on the road, smaller screen, higher price.",
          "If you never leave the desk, mini PC often wins. If you write on the go, read the [laptop guide](/blog/noutbuk-is-tehsil-secimi).",
        ],
      },
      {
        type: "p",
        text: "A mini PC is a tiny desktop, not a tiny laptop. Shortlist 16 GB / 512 GB / HDMI models.",
      },
      {
        type: "faq",
        items: [
          {
            question: "Can I game on a mini PC?",
            answer:
              "Light and cloud games, yes. AAA at 1440p wants a discrete GPU desktop or a gaming laptop.",
          },
          {
            question: "Wi-Fi or Ethernet?",
            answer:
              "Calls are fine on 5 GHz Wi-Fi. Accounting queues prefer a cable. Weak coverage? Read the [Wi-Fi guide](/blog/wifi-router-secimi).",
          },
          {
            question: "Is Windows included?",
            answer:
              "Depends on the SKU. “No OS” is cheaper but needs install time and a license.",
          },
        ],
      },
    ],
  },
];
