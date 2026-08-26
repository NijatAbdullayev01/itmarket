/**
 * Curated EN/RU translations for long, hand-written landing descriptions of
 * the "Noutbuklar" (laptops), "Şəbəkə avadanlıqları" (networking equipment)
 * and "Təhlükəsizlik avadanlıqları" (security equipment) categories and their
 * subcategories. The generic AZ→EN/RU prose pipeline garbles these longer
 * descriptions, so they get exact human translations keyed by category slug.
 * The storefront passes the category slug to `localizeCatalogIntro`, which
 * prefers these overrides before falling back to the template/phrase pipeline
 * for every other category and brand.
 */
export type CatalogIntroTranslation = {
  en: string;
  ru: string;
};

export const CATALOG_INTRO_TRANSLATIONS: Record<string, CatalogIntroTranslation> = {
  "sebeke-avadanliqlari": {
    en: "Find products in the Networking equipment category at IT Market. Compare brands and models and choose the configuration that suits your needs. Original equipment, official warranty, professional support, and convenient delivery / in-store pickup options are provided.",
    ru: "Найдите товары в категории «Сетевое оборудование» в IT Market. Сравните бренды и модели и выберите конфигурацию под ваши задачи. Предлагаются оригинальная техника, официальная гарантия, профессиональная поддержка и удобная доставка / самовывоз из магазина.",
  },
  kommutator: {
    en: "Switch models, among the most important elements of the networking equipment category, ensure fast and secure data exchange between devices on a network. The IT Market platform offers a range of switches that suit different needs, with various port counts and throughput capacities. Using the filtering and sorting features available in our catalog, you can easily find the model that best meets your requirements. Every product comes with an official warranty and stands out for its original technical quality. Compare the different models offered to build a more efficient and reliable network infrastructure and make the right choice with confidence.",
    ru: "Коммутаторы — одни из важнейших элементов категории сетевого оборудования — обеспечивают быстрый и безопасный обмен данными между устройствами в сети. На платформе IT Market представлены коммутаторы под различные задачи, отличающиеся количеством портов и пропускной способностью. С помощью фильтров и сортировки в нашем каталоге вы легко подберёте модель, максимально соответствующую вашим требованиям. Каждый товар поставляется с официальной гарантией и отличается оригинальным техническим качеством. Сравните предлагаемые модели, чтобы сделать вашу сетевую инфраструктуру более эффективной и надёжной, и примите правильное решение без труда.",
  },
  "voip-ip-telefonlar": {
    en: "VoIP and IP phone options in the networking equipment category — compare by brand, model, and key features at IT Market. Shop with original equipment, official warranty, professional support, and convenient delivery / in-store pickup. Quickly find the right product in the catalog using filters and sorting.",
    ru: "Варианты VoIP и IP-телефонов в категории сетевого оборудования — сравнивайте по бренду, модели и ключевым характеристикам в IT Market. Покупайте с оригинальной техникой, официальной гарантией, профессиональной поддержкой и удобной доставкой / самовывозом из магазина. Быстро найдите нужный товар в каталоге с помощью фильтров и сортировки.",
  },
  "wi-fi-kontroller": {
    en: "Wi-Fi controller options in the networking equipment category — compare by brand, model, and key features at IT Market. Shop with original equipment, official warranty, professional support, and convenient delivery / in-store pickup. Quickly find the right product in the catalog using filters and sorting.",
    ru: "Варианты Wi-Fi контроллеров в категории сетевого оборудования — сравнивайте по бренду, модели и ключевым характеристикам в IT Market. Покупайте с оригинальной техникой, официальной гарантией, профессиональной поддержкой и удобной доставкой / самовывозом из магазина. Быстро найдите нужный товар в каталоге с помощью фильтров и сортировки.",
  },
  "wi-fi-guclendirici": {
    en: "Wi-Fi range extender options in the networking equipment category — compare by brand, model, and key features at IT Market. Shop with original equipment, official warranty, professional support, and convenient delivery / in-store pickup. Quickly find the right product in the catalog using filters and sorting.",
    ru: "Варианты Wi-Fi усилителей в категории сетевого оборудования — сравнивайте по бренду, модели и ключевым характеристикам в IT Market. Покупайте с оригинальной техникой, официальной гарантией, профессиональной поддержкой и удобной доставкой / самовывозом из магазина. Быстро найдите нужный товар в каталоге с помощью фильтров и сортировки.",
  },
  router: {
    en: "Router options in the networking equipment category — compare by brand, model, and key features at IT Market. Shop with original equipment, official warranty, professional support, and convenient delivery / in-store pickup. Quickly find the right product in the catalog using filters and sorting.",
    ru: "Варианты роутеров в категории сетевого оборудования — сравнивайте по бренду, модели и ключевым характеристикам в IT Market. Покупайте с оригинальной техникой, официальной гарантией, профессиональной поддержкой и удобной доставкой / самовывозом из магазина. Быстро найдите нужный товар в каталоге с помощью фильтров и сортировки.",
  },
  "access-point": {
    en: "Access point devices are one of the key solutions for extending wireless internet coverage and improving signal quality in home and office networks. Meeting modern requirements, these devices provide a stable connection and high data transfer speeds. To strengthen your network infrastructure, you can consider access point models with a variety of technical specifications.",
    ru: "Точки доступа — одно из основных решений для расширения зоны беспроводного интернета и повышения качества сигнала в домашних и офисных сетях. Эти устройства отвечают современным требованиям, обеспечивают стабильное подключение и высокую скорость передачи данных. Чтобы укрепить вашу сетевую инфраструктуру, вы можете рассмотреть модели точек доступа с различными техническими характеристиками.",
  },
  "sebeke-adapteri": {
    en: "Network adapter devices play an important role in connecting computers and other digital equipment to the internet. Occupying a special place among networking equipment, these products provide a stable and reliable connection. For fast data exchange at home or in the office, you can choose from adapter models with different interfaces. Evaluate the technical specifications that suit your needs and pick the best option to simplify your work.",
    ru: "Сетевые адаптеры играют важную роль в подключении компьютеров и другой цифровой техники к интернету. Эти устройства занимают особое место среди сетевого оборудования и обеспечивают стабильное и надёжное соединение. Для быстрого обмена данными дома или в офисе вы можете воспользоваться моделями адаптеров с различными интерфейсами. Оцените подходящие вам технические характеристики и выберите оптимальный вариант, который упростит вашу работу.",
  },
  "ip-telefon": {
    en: "IP phone systems, which hold an important place among networking equipment, provide effective communication in modern office and business environments. They simplify workflows with high-quality voice transmission, network integration, and management capabilities. By choosing the right IP phone solution for your workplace, you can optimize your internal and external communication costs.",
    ru: "IP-телефония, занимающая важное место среди сетевого оборудования, обеспечивает эффективную связь в современных офисах и бизнес-среде. Широкополосная передача голоса, сетевая интеграция и удобное управление упрощают рабочие процессы. Выбрав подходящее IP-телефонное решение для своего рабочего места, вы сможете оптимизировать расходы на внутреннюю и внешнюю связь.",
  },
  "ip-video-telefon": {
    en: "IP video phone devices provide high-quality voice and video communication for modern offices and business centers. Occupying a special place among networking equipment, these devices enable uninterrupted communication over a stable internet connection. Models with a large screen and a functional control panel help organize workflows more efficiently. Choose the IP video phone solutions that suit your needs and upgrade your corporate communication system.",
    ru: "IP-видеотелефоны обеспечивают высококачественную голосовую и видеосвязь для современных офисов и бизнес-центров. Эти устройства, занимающие особое место среди сетевого оборудования, позволяют поддерживать бесперебойное общение через стабильное интернет-соединение. Модели с большим экраном и функциональной панелью управления помогают организовать рабочие процессы эффективнее. Выберите подходящие решения IP-видеотелефонов и обновите вашу корпоративную систему связи.",
  },
  "ip-dect-telefon": {
    en: "IP DECT phones are modern networking devices designed to provide reliable, uninterrupted wireless communication in an office environment. Thanks to their wide coverage and high voice quality, they allow you to manage your workflows more efficiently. Adapting to the network infrastructure and meeting a variety of requirements, these devices are an ideal solution for corporate voice communications. Choose the IP DECT phone options that fit your needs to improve mobile communication at your workplace.",
    ru: "IP DECT-телефоны — это современное сетевое оборудование, предназначенное для надёжной и бесперебойной беспроводной связи в офисе. Благодаря широкой зоне покрытия и высокому качеству голоса они позволяют более эффективно управлять рабочими процессами. Эти устройства соответствуют различным требованиям сетевой инфраструктуры и являются идеальным решением для корпоративной голосовой связи. Выберите подходящие варианты IP DECT-телефонов, чтобы улучшить мобильную связь на вашем рабочем месте.",
  },
  "ip-wi-fi-telefon": {
    en: "IP Wi-Fi phone models, an important part of the networking equipment category, provide stable, high-quality communication options for modern offices. Connecting over a wireless network, these devices increase mobility during work and preserve high voice accuracy. They are an ideal choice for companies looking to optimize their IT infrastructure and save on communication costs. With feature-rich IP Wi-Fi phones, always keep communication at your workplace under control.",
    ru: "IP Wi-Fi-телефоны, важная часть категории сетевого оборудования, обеспечивают стабильную и качественную связь для современных офисов. Подключаясь через беспроводную сеть, эти устройства повышают мобильность в работе и сохраняют высокое качество передачи голоса. Это идеальный выбор для компаний, которые хотят оптимизировать ИТ-инфраструктуру и сэкономить на расходах на связь. Благодаря широкой функциональности IP Wi-Fi-телефонов связь на рабочем месте всегда остаётся под контролем.",
  },
  "ip-konfrans-telefonu": {
    en: "An IP conference phone is essential networking equipment that provides effective voice communication and flawless connectivity in a business environment. It simplifies group discussions with high voice quality both within the office and in remote meetings. Integrated with modern communication systems, these devices speed up workflows and optimize collaboration within a team.",
    ru: "IP-конференц-телефон — это важное сетевое оборудование, обеспечивающее эффективную голосовую связь и безупречное соединение в бизнес-среде. Он упрощает групповые переговоры с высоким качеством голоса как в офисе, так и на удалённых совещаниях. Интегрируясь с современными коммуникационными системами, эти устройства ускоряют рабочие процессы и оптимизируют сотрудничество внутри команды.",
  },
  "ip-pbx": {
    en: "IP PBX systems serve as the center of corporate communications in modern offices, managing voice communications over digital networks. Part of the networking equipment category, these systems improve the quality of internal and external calls and help optimize communication costs. Thanks to their scalable architecture, they adapt to the needs of companies of any size. Distinguished by ease of management and stable operation, IP PBX devices work in full integration with the network infrastructure.",
    ru: "IP-АТС в современных офисах выступают центром корпоративной связи, обеспечивая управление голосовой связью через цифровые сети. Относясь к категории сетевого оборудования, эти системы повышают качество внутренних и внешних звонков, а также помогают оптимизировать расходы на связь. Благодаря масштабируемой архитектуре они адаптируются под потребности компаний любого размера. Отличаясь удобством управления и стабильной работой, IP-АТС полностью интегрируются с сетевой инфраструктурой.",
  },
  "ip-telefon-aksesuarlari": {
    en: "IP phone accessories, an important part of the networking equipment category, are designed to increase the functionality of office communication systems. A wide range of accessories makes installing and using communication equipment more convenient and efficient. Choose the right components to build uninterrupted communication and a stable network at your workplace, and upgrade your system.",
    ru: "Аксессуары для IP-телефонов, важная часть категории сетевого оборудования, предназначены для расширения функциональности офисных систем связи. Широкий ассортимент аксессуаров делает установку и повседневное использование оборудования связи более удобным и эффективным. Подберите подходящие компоненты, чтобы обеспечить бесперебойную связь и стабильную сеть на вашем рабочем месте, и модернизируйте свою систему.",
  },
  "sebeke-aksesuarlari": {
    en: "Network accessories, part of the networking equipment category, help you organize your work more efficiently. Offering a range of solutions that meet the requirements of your infrastructure, these tools stand out for their durability and functionality. Here you can find everything you need to optimize your workflows and keep your systems running reliably.",
    ru: "Сетевые аксессуары, входящие в категорию сетевого оборудования, помогают организовать работу более эффективно. Эти средства, предлагающие различные решения под требования вашей инфраструктуры, отличаются надёжностью и функциональностью. Здесь вы найдёте всё необходимое для оптимизации рабочих процессов и стабильной работы ваших систем.",
  },
  "sfp-modullar": {
    en: "SFP modules, part of the networking equipment category, are the key transceiver devices that ensure data transmission in optical networks. Available for various speed and distance requirements, these optical modules keep the network infrastructure running stably and reliably. Review the SFP module options that match your network needs and expand your data transfer capabilities.",
    ru: "SFP-модули, входящие в категорию сетевого оборудования, являются основными трансиверами, обеспечивающими передачу данных в оптических сетях. Предлагаемые под различные требования по скорости и дальности, эти оптические модули обеспечивают стабильную и надёжную работу сетевой инфраструктуры. Рассмотрите варианты SFP-модулей под ваши сетевые задачи и расширьте возможности передачи данных.",
  },
  nas: {
    en: "NAS devices are modern storage systems designed for secure data storage, backup creation, and fast file access in home and business networks. In this important subsection of the networking equipment category, network storage devices with various capacities and parameters are available. Choose the NAS solution that suits your needs to manage your digital archive and keep your data safe with ease.",
    ru: "NAS-устройства — это современные системы хранения, предназначенные для безопасного хранения данных, создания резервных копий и быстрого доступа к файлам в домашних и бизнес-сетях. В этом важном подразделе категории сетевого оборудования представлены сетевые накопители различной ёмкости и параметров. Выберите подходящее NAS-решение, чтобы управлять цифровым архивом и надёжно защищать свои данные.",
  },
  "nas-aksesuarlari": {
    en: "NAS accessories, essential for expanding the capabilities of NAS systems and optimizing your data storage environment, are available here. Part of the networking equipment category, these components ensure stable operation and uninterrupted connectivity of your systems. Choose high-quality accessories that suit your needs and strengthen your infrastructure.",
    ru: "Представлены аксессуары для NAS, необходимые для расширения возможностей систем хранения и оптимизации среды хранения данных. Эти компоненты, входящие в категорию сетевого оборудования, обеспечивают стабильную работу и бесперебойное подключение ваших систем. Подберите качественные аксессуары под ваши потребности и укрепите свою инфраструктуру.",
  },
  "enterprise-kommutator": {
    en: "Enterprise switch models are among the professional networking devices that meet the demands of large-scale corporate networks. This core component of the networking equipment category delivers high speed, security, and reliability in data transmission. These devices offer an optimal solution for creating uninterrupted connectivity and managed connections in a work environment.",
    ru: "Модели корпоративных (enterprise) коммутаторов относятся к профессиональному сетевому оборудованию, отвечающему требованиям крупных корпоративных сетей. Этот ключевой компонент категории сетевого оборудования обеспечивает высокую скорость, безопасность и надёжность передачи данных. Эти устройства — оптимальное решение для создания бесперебойной связи и управляемых подключений в рабочей среде.",
  },
  "smart-cloud-kommutator": {
    en: "Smart and Cloud switches are important networking devices that manage modern corporate networks and optimize traffic. Part of the networking equipment category, these devices increase infrastructure efficiency through remote management and cloud integration. Consider the switch solutions that suit your needs to upgrade your infrastructure.",
    ru: "Smart и Cloud коммутаторы — это важное сетевое оборудование, которое обеспечивает управление современными корпоративными сетями и оптимизацию трафика. Относящиеся к категории сетевого оборудования, эти устройства повышают эффективность инфраструктуры за счёт удалённого управления и облачной интеграции. Рассмотрите подходящие вам решения коммутаторов, чтобы модернизировать свою инфраструктуру.",
  },
  "idare-olunmayan-kommutator": {
    en: "Unmanaged switch models are one of the most convenient and affordable solutions for building home and small office networks. Requiring no additional configuration, these networking devices work on a plug-and-play basis. Available from the networking equipment category, these devices speed up data exchange and create a stable connection between connected devices. An ideal choice for setting up a reliable local network at home or in the office.",
    ru: "Модели неуправляемых коммутаторов — одно из самых удобных и доступных решений для построения домашних сетей и сетей небольших офисов. Не требуя дополнительной настройки, это сетевое оборудование работает по принципу «подключи и работай». Эти устройства из категории сетевого оборудования ускоряют обмен данными и обеспечивают стабильное соединение между подключёнными устройствами. Идеальный выбор для создания надёжной локальной сети дома или в офисе.",
  },
  "wireless-management-kommutator": {
    en: "Wireless management switch models are important solutions among modern networking equipment that simplify the management of wireless networks. Thanks to centralized management capabilities, these devices help regulate the operation of connected points and optimize traffic. They deliver effective performance in environments that require high-bandwidth, reliable connections. Consider the right options to simplify managing your network infrastructure and make the most of your equipment.",
    ru: "Коммутаторы управления беспроводной сетью (wireless management) — это важные решения среди современного сетевого оборудования, упрощающие управление беспроводными сетями. Благодаря возможностям централизованного управления эти устройства помогают регулировать работу подключённых точек и оптимизировать трафик. Они обеспечивают эффективную производительность в средах, требующих широкополосного и стабильного подключения. Рассмотрите подходящие варианты, чтобы упростить управление сетевой инфраструктурой и максимально раскрыть потенциал оборудования.",
  },
  "outdoor-access-point": {
    en: "Outdoor access point models are an ideal solution for providing reliable, high-speed wireless internet connections in outdoor conditions. Part of the networking equipment category, these devices stand out with weather-resistant housings. They create wide coverage in parks, campus sites, warehouse areas, and other open spaces. Optimize your network with stable signal transmission and easy management.",
    ru: "Модели уличных точек доступа (outdoor access point) — идеальное решение для обеспечения надёжного высокоскоростного беспроводного интернета на открытом воздухе. Входя в категорию сетевого оборудования, эти устройства отличаются корпусами, устойчивыми к погодным условиям. Они обеспечивают широкую зону покрытия в парках, кампусах, на складских территориях и других открытых пространствах. Оптимизируйте свою сеть благодаря стабильной передаче сигнала и простому управлению.",
  },
  "wall-plate-access-point": {
    en: "Wall-plate access point models are functional networking devices specifically designed for installation in recessed wall sockets in hotels, offices, and residential complexes. With their aesthetic appearance and neat mounting, they fit perfectly into any interior. Providing strong wireless coverage and a stable connection, these devices are the optimal choice for those seeking high performance in the networking equipment category. Wall-mounted access points that meet modern standards simplify network management.",
    ru: "Настенные точки доступа (wall-plate access point) — это функциональное сетевое оборудование, специально предназначенное для установки в утопленные настенные розеточные коробки в отелях, офисах и жилых комплексах. Благодаря эстетичному внешнему виду и аккуратному монтажу они идеально вписываются в интерьер. Обеспечивая сильную зону беспроводного покрытия и стабильное подключение, эти устройства — оптимальный выбор для тех, кто ищет высокую производительность в категории сетевого оборудования. Настенные точки доступа, отвечающие современным стандартам, упрощают управление сетью.",
  },
  firewall: {
    en: "Firewall options in the networking equipment category — compare by brand, model, and key features at IT Market. Shop with original equipment, official warranty, professional support, and convenient delivery / in-store pickup. Quickly find the right product in the catalog using filters and sorting.",
    ru: "Варианты межсетевых экранов в категории сетевого оборудования — сравнивайте по бренду, модели и ключевым характеристикам в IT Market. Покупайте с оригинальной техникой, официальной гарантией, профессиональной поддержкой и удобной доставкой / самовывозом из магазина. Быстро найдите нужный товар в каталоге с помощью фильтров и сортировки.",
  },
  "ekran-paylasimi": {
    en: "Screen sharing options in the networking equipment category — compare by brand, model, and key features at IT Market. Shop with original equipment, official warranty, professional support, and convenient delivery / in-store pickup. Quickly find the right product in the catalog using filters and sorting.",
    ru: "Варианты устройств для демонстрации экрана в категории сетевого оборудования — сравнивайте по бренду, модели и ключевым характеристикам в IT Market. Покупайте с оригинальной техникой, официальной гарантией, профессиональной поддержкой и удобной доставкой / самовывозом из магазина. Быстро найдите нужный товар в каталоге с помощью фильтров и сортировки.",
  },
  "divar-skafi": {
    en: "Wall cabinet options in the networking equipment category — compare by brand, model, and key features at IT Market. Shop with original equipment, official warranty, professional support, and convenient delivery / in-store pickup. Quickly find the right product in the catalog using filters and sorting.",
    ru: "Варианты настенных шкафов в категории сетевого оборудования — сравнивайте по бренду, модели и ключевым характеристикам в IT Market. Покупайте с оригинальной техникой, официальной гарантией, профессиональной поддержкой и удобной доставкой / самовывозом из магазина. Быстро найдите нужный товар в каталоге с помощью фильтров и сортировки.",
  },
  "tehlukesizlik-avadanliqlari": {
    en: "Find products in the Security equipment category at IT Market. Compare brands and models and choose the configuration that suits your needs. Original equipment, official warranty, professional support, and convenient delivery / in-store pickup options are provided.",
    ru: "Найдите товары в категории «Оборудование безопасности» в IT Market. Сравните бренды и модели и выберите конфигурацию под ваши задачи. Предлагаются оригинальная техника, официальная гарантия, профессиональная поддержка и удобная доставка / самовывоз из магазина.",
  },
  "analoq-kamera": {
    en: "Analog camera options in the Security equipment category — compare by brand, model, and key features at IT Market. Shop with original equipment, official warranty, professional support, and convenient delivery / in-store pickup. Quickly find the right product in the catalog using filters and sorting.",
    ru: "Варианты аналоговых камер в категории «Оборудование безопасности» — сравнивайте по бренду, модели и ключевым характеристикам в IT Market. Покупайте с оригинальной техникой, официальной гарантией, профессиональной поддержкой и удобной доставкой / самовывозом из магазина. Быстро найдите нужный товар в каталоге с помощью фильтров и сортировки.",
  },
  "ip-kamera": {
    en: "IP camera options in the Security equipment category — compare by brand, model, and key features at IT Market. Shop with original equipment, official warranty, professional support, and convenient delivery / in-store pickup. Quickly find the right product in the catalog using filters and sorting.",
    ru: "Варианты IP-камер в категории «Оборудование безопасности» — сравнивайте по бренду, модели и ключевым характеристикам в IT Market. Покупайте с оригинальной техникой, официальной гарантией, профессиональной поддержкой и удобной доставкой / самовывозом из магазина. Быстро найдите нужный товар в каталоге с помощью фильтров и сортировки.",
  },
  dvr: {
    en: "DVR devices, which play an important role in building security systems, ensure that the video surveillance process runs continuously and reliably. In the Security equipment category on the IT Market platform, you can easily find DVR models with different channel counts and technical specifications. Thanks to the functional filters and sorting options in our catalog, you can quickly select and compare original equipment that meets your requirements. Our products with an official warranty guarantee long-lasting and effective operation of your security system. Identify the most optimal DVR model for your needs and ensure your security at a professional level.",
    ru: "Видеорегистраторы (DVR), играющие важную роль в построении систем безопасности, обеспечивают непрерывное и надёжное проведение видеонаблюдения. В категории «Оборудование безопасности» на платформе IT Market вы легко найдёте модели видеорегистраторов с различным количеством каналов и техническими характеристиками. Благодаря функциональным фильтрам и сортировке в нашем каталоге вы сможете быстро выбрать и сравнить оригинальную технику, соответствующую вашим требованиям. Наши товары с официальной гарантией обеспечивают долговечную и эффективную работу вашей системы безопасности. Выберите оптимальную модель видеорегистратора под ваши потребности и обеспечьте безопасность на профессиональном уровне.",
  },
  nvr: {
    en: "NVR (Network Video Recorder) network video recorders, which play an important role in the security equipment field, form the basis of video surveillance systems. The IT Market platform offers a wide range of NVR models that meet various needs and technical requirements. Here you can easily compare devices from different brands and comfortably choose the most suitable configuration for your project or home. All presented products are original equipment and come with an official warranty. Our professional support service is ready to help you with your choice, and convenient delivery / in-store pickup options make your shopping easier. Ensure your security with reliable NVR systems.",
    ru: "Сетевые видеорегистраторы (NVR, Network Video Recorder), играющие важную роль в области оборудования безопасности, составляют основу систем видеонаблюдения. На платформе IT Market представлен широкий ассортимент моделей NVR, отвечающих различным потребностям и техническим требованиям. Здесь вы легко сможете сравнить устройства разных брендов и выбрать наиболее подходящую конфигурацию для вашего проекта или дома. Все представленные товары — оригинальная техника, поставляемая с официальной гарантией. Наша служба профессиональной поддержки готова помочь вам с выбором, а удобная доставка и самовывоз из магазина сделают покупки проще. Обеспечьте свою безопасность с надёжными системами NVR.",
  },
  "wi-fi-kameralar": {
    en: "Surveillance cameras are among the most important security equipment for ensuring the safety of your facilities and home. A wide range of Wi-Fi cameras makes it possible to keep various locations under continuous and convenient surveillance. Protect your area reliably with modern surveillance systems tailored to your needs.",
    ru: "Камеры видеонаблюдения — одно из самых важных средств обеспечения безопасности ваших объектов и дома. Широкий ассортимент Wi-Fi камер позволяет вести непрерывное и удобное наблюдение за различными помещениями. Надёжно защитите свою территорию с помощью современных систем видеонаблюдения, соответствующих вашим потребностям.",
  },
  noutbuklar: {
    en: "Ideal laptops for work, study, and gaming — now all in one place! In our extensive laptop catalog, you can easily compare original models to suit any budget and any need. With an official warranty, fast delivery, and in-store pickup options, you can make your choice with confidence.",
    ru: "Идеальные ноутбуки для работы, учёбы и игр — теперь в одном месте! В нашем широком каталоге ноутбуков вы легко сможете сравнить оригинальные модели на любой бюджет и под любые требования. Официальная гарантия, быстрая доставка и возможность самовывоза из магазина позволяют сделать выбор с уверенностью.",
  },
  noutbuk: {
    en: "The Laptops category offers laptop models with a variety of technical specifications to suit different needs. Here you can discover the most suitable devices for work, study, and everyday use. Make the right choice according to your needs and budget, and handle your tasks more comfortably. Choose the laptop that suits you from a wide range of models.",
    ru: "В категории «Ноутбуки» представлены модели ноутбуков с различными техническими характеристиками, соответствующие разным требованиям. Здесь вы сможете найти наиболее подходящие устройства для работы, учёбы и повседневного использования. Сделайте правильный выбор под свои потребности и бюджет, чтобы выполнять задачи с большим комфортом. Из широкого ассортимента моделей выберите ноутбук, который подходит именно вам.",
  },
  "2-in-1-noutbuk": {
    en: "2-in-1 laptop models in the Laptops category are flexible devices that can be used as both a tablet and a computer. Thanks to touchscreen support and a rotating hinge mechanism, it becomes easier to complete daily tasks and prepare presentations. This wide range of devices is a functional alternative for those who work on the move.",
    ru: "Ноутбуки 2-в-1 в категории «Ноутбуки» — это гибкие устройства, которые можно использовать и как планшет, и как компьютер. Благодаря поддержке сенсорного экрана и поворотному шарнирному механизму выполнять повседневные задачи и готовить презентации становится проще. Широкий ассортимент таких устройств — функциональная альтернатива для тех, кто работает в дороге.",
  },
  "mobil-workstation": {
    en: "Mobile workstation laptops are specially designed for professionals working with engineering, 3D visualization, graphic design, and complex computations. Offering high computing power and reliable performance to handle the most demanding workloads, this category delivers workstation-class power even in a mobile format. Distinguished by extensive technical capabilities and a durable chassis, mobile workstations help you optimize your workflow.",
    ru: "Мобильные рабочие станции (mobile workstation) специально созданы для профессионалов, работающих в инженерии, 3D-визуализации, графическом дизайне и сфере сложных вычислений. Обеспечивая высокую вычислительную мощность и надёжную производительность для самых требовательных нагрузок, эта категория даёт мощность рабочей станции даже в мобильном формате. Отличаясь широкими техническими возможностями и прочным корпусом, мобильные рабочие станции помогают оптимизировать ваш рабочий процесс.",
  },
  "noutbuk-cantasi": {
    en: "A laptop bag is an essential accessory for reliably protecting your device in everyday use and while traveling. Here you can find bag models in various sizes, designs, and compartments that fit the Laptops category. Ergonomic straps and durable materials provide comfort and safety when carrying. Choose the right model for your needs and keep your device well protected.",
    ru: "Сумка для ноутбука — это важный аксессуар для надёжной защиты устройства в повседневном использовании и в поездках. Здесь вы найдёте модели сумок разных размеров, дизайнов и отделений, подходящие для категории «Ноутбуки». Эргономичные ремни и прочные материалы обеспечивают комфорт и безопасность при переноске. Выберите подходящую модель под ваши потребности и надёжно защитите своё устройство.",
  },
  "enerji-adapteri": {
    en: "Quality power adapter models designed for laptops provide uninterrupted and safe power supply to your device. Power adapter options with different technical specifications and wattage ratings are an ideal match for everyday use. Choosing the right power adapter helps preserve your laptop's battery life and maintain stable performance. Among the wide range of laptop accessories, you can easily find the product you need.",
    ru: "Качественные модели блоков питания, предназначенные для ноутбуков, обеспечивают бесперебойное и безопасное питание вашего устройства. Варианты адаптеров питания с различными техническими характеристиками и мощностью идеально подходят для повседневного использования. Правильный выбор блока питания помогает сохранить ресурс аккумулятора ноутбука и поддерживать стабильную работу. В широком ассортименте аксессуаров для ноутбуков вы легко найдёте нужный товар.",
  },
  "noutbuk-aksesuarlari": {
    en: "The Laptop accessories category brings together the additional equipment you need to make everyday use and your workflow more comfortable and productive. Various protective cases, stands, cooling systems, and other essential accessories designed for laptops help extend the life of your device. Thanks to our wide range, you can easily find the accessories you need. Improve your workspace with quality products.",
    ru: "Категория «Аксессуары для ноутбуков» объединяет дополнительное оборудование, необходимое для более комфортного и продуктивного повседневного использования и рабочего процесса. Различные защитные чехлы, подставки, системы охлаждения и другие необходимые аксессуары для ноутбуков помогают продлить срок службы вашего устройства. Благодаря широкому ассортименту вы легко найдёте нужные аксессуары. Улучшите своё рабочее место качественными товарами.",
  },
};
