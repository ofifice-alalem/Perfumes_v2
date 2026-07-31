export interface PolicyStep {
    number: number;
    title: string;
    description: string;
    iconName?: string;
}

export interface PolicyCard {
    title: string;
    subtitle?: string;
    badge?: string;
    description?: string;
    list?: string[];
    variant?: 'blue' | 'purple' | 'amber' | 'emerald' | 'rose' | 'indigo' | 'slate';
    iconName?: string;
}

export interface PolicyFeatureBox {
    title: string;
    badgeText?: string;
    description: string;
    iconName?: string;
    variant?: 'emerald' | 'blue' | 'indigo' | 'purple' | 'amber' | 'rose';
    subCards?: PolicyCard[];
}

export interface PolicyStatItem {
    label: string;
    description: string;
    badge?: string;
}

export interface PolicySubsectionData {
    id: string;
    subNumber: string;
    title: string;
    badgeText?: string;
    badgeVariant?: 'amber' | 'indigo' | 'slate' | 'blue' | 'purple' | 'emerald' | 'rose' | 'red';
    description?: string;
    iconName?: string;
    callout?: {
        type: 'info' | 'warning' | 'success' | 'alert';
        title?: string;
        text: string;
    };
    steps?: PolicyStep[];
    cardsGrid?: PolicyCard[];
    featureBoxes?: PolicyFeatureBox[];
    statsGrid?: PolicyStatItem[];
}

export interface PolicySectionData {
    id: string;
    title: string;
    iconName: string;
    badge?: string;
    badgeVariant?: string;
    subtitle: string;
    introCallout?: {
        type: 'info' | 'warning' | 'success' | 'alert';
        title?: string;
        text: string;
    };
    subsections: PolicySubsectionData[];
}

export const policySectionsData: PolicySectionData[] = [
    {
        id: 'products-entry',
        title: '1. طريقة استخدام النظام وإدخال المنتجات',
        iconName: 'Package',
        badge: 'الخطوة الأولى',
        subtitle: 'الخطوة الأساسية لبناء قاعدة البيانات والمخزون المحاسبي',
        introCallout: {
            type: 'warning',
            title: 'تسلسل إدخال البيانات المعتمد:',
            text: 'لضمان الربط السليم وحساب التكاليف والأحجام بدون أخطاء، يرجى الالتزام بالخطوات المحددة أدناه حسب نوع المنتج قبل البدء بإدخال الفواتير.'
        },
        subsections: [
            {
                id: 'oil-perfumes',
                subNumber: '1.1',
                title: 'العطور الزيتية (Oil Perfumes)',
                badgeText: 'نظام التيرات والأحجام',
                badgeVariant: 'amber',
                iconName: 'Droplets',
                description: 'تعتمد العطور الزيتية على نظام وراثة الخصائص والأسعار لتقليل تكرار البيانات وإنجاز الإدخال بسرعة عالية. قبل إنشاء أي عطر زيتي، يلزم أولاً إعداد الركائز الثلاث التالية بالتسلسل:',
                steps: [
                    {
                        number: 1,
                        title: 'التصنيفات (Categories)',
                        description: 'إنشاء التصنيف المناسب للعطر (مثل: عطور فرنسية، عطور شرقية، عطور خاصة).',
                        iconName: 'Layers'
                    },
                    {
                        number: 2,
                        title: 'الأحجام (Sizes)',
                        description: 'تعريف أحجام التعبئة المتاحة (مثل: 1مل، 3مل، 6مل، 12مل) وتحديد سعة الملي بدقة.',
                        iconName: 'Ruler'
                    },
                    {
                        number: 3,
                        title: 'التيرات والأسعار (Price Tiers)',
                        description: 'إنشاء فئة السعر (مثل: الفئة A) وتحديد أسعار كل حجم (سعر العادي / سعر VIP).',
                        iconName: 'Tags'
                    }
                ],
                callout: {
                    type: 'success',
                    title: 'النتيجة ووراثة الخصائص:',
                    text: 'عند إنشاء المنتج الزيتي واختيار فئة السعر (Tier) الخاصة به، يرث المنتج تلقائياً جميع الأحجام والأسعار المعرفة في تلك الفئة. وأي تعديل مستقبلي في أسعار التير ينعكس فوراً على جميع المنتجات الزيتية المرتبطة به بدون الحاجة لتعديل كل منتج يدوياً.'
                }
            },
            {
                id: 'original-perfumes',
                subNumber: '1.2',
                title: 'العطور الأصلية (Original Perfumes)',
                badgeText: 'خياران للتسعير والبيع',
                badgeVariant: 'indigo',
                iconName: 'Sparkles',
                description: 'تتميز العطور الأصلية بإمكانية بيعها إما كـ زجاجة كاملة مغلقة أو كـ تقسيم تعبئة (Decant) من نفس الزجاجة. يوفر النظام خيارين مرنين لتحديد نمط التسعير:',
                cardsGrid: [
                    {
                        title: '1. نمط التقسيم (Decant / Tier)',
                        subtitle: 'تعبئة بالأحجام',
                        description: 'يُستخدم عند بيع العطر الأصلي كتقسيم مجزأ (تعبئة مل). يتم ربط العطر الأصلي بـ Price Tier وتحديد أسعار الأحجام الصغيرة المتاحة منه.',
                        variant: 'indigo',
                        iconName: 'Droplets'
                    },
                    {
                        title: '2. نمط العبوة الكاملة (Full Bottle)',
                        subtitle: 'زجاجة مغلقة',
                        description: 'يُستخدم عند بيع العبوة الأصلية الكاملة. يتم تحديد سعر البيع الكامل وسعة الزجاجة بالملي، لخصم الحجم بدقة من المخزون التراكمي.',
                        variant: 'emerald',
                        iconName: 'Box'
                    }
                ],
                callout: {
                    type: 'info',
                    title: 'دقة احتساب المخزون:',
                    text: 'سواء تم البيع كـ "عبوة كاملة" أو كـ "تقسيم"، يخصم النظام الكمية بالملي مترات تلقائياً من مخزون الزجاجات الأصلية دون أي تضارب.'
                }
            },
            {
                id: 'standard-products',
                subNumber: '1.3',
                title: 'المنتجات العادية (Standard Products)',
                badgeText: 'بيانات مباشرة بالقطعة',
                badgeVariant: 'slate',
                iconName: 'Box',
                description: 'تُستخدم للمنتجات العامة التي لا تحتوي على أحجام أو تقسيم (مثل: الزجاجات الفارغة، العلب، الإكسسوارات، المعطرات الجاهزة).',
                callout: {
                    type: 'success',
                    title: 'سهولة ومباشرة في الإدخال:',
                    text: 'يتطلب إدخال المنتجات العادية فقط: اسم المنتج، سعر التكلفة، سعر البيع المباشر، والكمية المتوفرة بالقطعة (Unit Based) دون أي إعدادات مسبقة للأحجام أو التيرات.'
                }
            }
        ]
    },
    {
        id: 'payment-methods-credit',
        title: '2. سياسة المبيعات والمشتريات وأنواع السداد',
        iconName: 'CreditCard',
        badge: 'الخطوة الثانية',
        subtitle: 'الضوابط المالية للتعاملات النقدية والآجلة وتعدد وسائل الدفع',
        subsections: [
            {
                id: 'credit-sales-purchases',
                subNumber: '2.1',
                title: 'البيع والشراء بالآجل (الذمم والأرصدة)',
                badgeText: 'مرونة في السداد والذمم',
                badgeVariant: 'blue',
                iconName: 'Clock',
                description: 'يدعم النظام إدارة التعاملات بالآجل (الدين) سواء في فواتير المبيعات للعملاء أو المشتريات من الموردين لتوثيق الأرصدة وحفظ الحقوق المالية:',
                cardsGrid: [
                    {
                        title: 'أولاً: المبيعات بالآجل (للعملاء)',
                        variant: 'blue',
                        iconName: 'Users',
                        list: [
                            'يمكن إخراج الفاتورة دون اشتراط دفع كامل المبلغ وقت البيع.',
                            'يتم تدوين المتبقي تلقائياً كـ "دين على العميل" ويضاف إلى حسابه الشخصي.',
                            'تتم متابعة الديون في تقارير الذمم وتُسدد لاحقاً عبر شاشة "دفعات العملاء" أو "تسويات العملاء".'
                        ]
                    },
                    {
                        title: 'ثانياً: المشتريات بالآجل (من الموردين)',
                        variant: 'purple',
                        iconName: 'Truck',
                        list: [
                            'يمكن إدخال بضائع ومشتريات جديدة دون الدفع الكامل للمورد فوراً.',
                            'يُسجل المتبقي كـ "مستحقات واجبة السداد للمورد" وتضاف لرصيده.',
                            'تتم متابعتها في كشوفات الموردين وتقارير الذمم وتُسدد عبر "مدفوعات الموردين".'
                        ]
                    }
                ]
            },
            {
                id: 'cash-immediate-payment',
                subNumber: '2.2',
                title: 'التعامل النقدي والالتزام بالدفع اللحظي',
                badgeText: 'شرط حازم للدفع الفوري',
                badgeVariant: 'rose',
                iconName: 'Wallet',
                callout: {
                    type: 'alert',
                    title: 'ملاحظة وإلزام قانوني وحسابي مهم جداً:',
                    text: 'عند تحديد نوع الفاتورة كـ "نقدي"، يلزم السداد الفوري واللحظي الكامل لصافي قيمة الفاتورة أثناء إنشاء الفاتورة واعتتمادها.'
                },
                cardsGrid: [
                    {
                        title: 'منع الآجل في النقدية',
                        description: 'لا يُسمح إطلاقاً بتسجيل أي جزء متبقي كـ "دين" أو "ذمة" في الفواتير ذات المسمى النقدي.',
                        variant: 'rose',
                        iconName: 'CheckCircle2'
                    },
                    {
                        title: 'انضباط رصيد الصندوق',
                        description: 'يضمن هذا الشرط مطابقة رصيد الصندوق النقدي في المنظومة مع المبالغ الفعلية المتوفرة في درج النقدية في نفس اللحظة.',
                        variant: 'rose',
                        iconName: 'CheckCircle2'
                    }
                ]
            },
            {
                id: 'multi-payment-methods',
                subNumber: '2.3',
                title: 'وسائل الدفع والسداد المركب للفاتورة الواحدة',
                badgeText: 'مرونة السداد بالتقسيم',
                badgeVariant: 'emerald',
                iconName: 'Split',
                description: 'توفر المنظومة بيئة دفع مرنة ومتطورة تعطي الخيار لإدارة طرق سداد متعددة وتقسيم الفاتورة الواحدة على أكثر من وسيلة دفع في نفس المعاملة:',
                cardsGrid: [
                    {
                        title: '1. إنشاء وتهيئة وسائل دفع متعددة',
                        description: 'يتيح النظام من شاشة "وسائل الدفع" إضافة وتهيئة عدد غير محدود من الوسائل النقدية والإلكترونية (مثلاً: نقداً، سداد، تداول، بطاقة تداول، تحويل مصرفي، إلخ) مع إمكانية تفعيل أو تجميد أي وسيلة دفع حسب حاجة العمل.',
                        variant: 'emerald',
                        iconName: 'PlusCircle'
                    }
                ],
                featureBoxes: [
                    {
                        title: 'مثال تطبيقي: السداد المركب للفاتورة الواحدة (بقيمة 500 د.ل)',
                        badgeText: 'سداد مقسم',
                        variant: 'emerald',
                        iconName: 'Receipt',
                        description: 'يمكن سداد الفاتورة الواحدة باستخدام أكثر من وسيلة دفع على أجزاء متفرقة بشرط أن يكون مجموع الأجزاء مساوياً لإجمالي قيمة الفاتورة.',
                        subCards: [
                            { title: 'الدفعة 1 (نقداً)', subtitle: '200.00 د.ل', description: '💵 كاش الصندوق', variant: 'emerald' },
                            { title: 'الدفعة 2 (إلكتروني)', subtitle: '150.00 د.ل', description: '📱 تطبيق سداد', variant: 'indigo' },
                            { title: 'الدفعة 3 (مصرفي)', subtitle: '150.00 د.ل', description: '💳 بطاقة تداول', variant: 'purple' },
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 'returns-settlements',
        title: '3. سياسة المرتجعات والتسويات المالية',
        iconName: 'RotateCcw',
        badge: 'الخطوة الثالثة',
        subtitle: 'قواعد إرجاع الأصناف، المعالجة المحاسبية للأرصدة المعلقة، والتسويات المستقلة',
        subsections: [
            {
                id: 'returns-and-settlements-rule',
                subNumber: '3.1',
                title: 'قواعد إرجاع المبيعات والمشتريات',
                badgeText: 'مرونة الإرجاع والتسوية',
                badgeVariant: 'purple',
                iconName: 'RefreshCw',
                description: 'عند تنفيذ أي عملية إرجاع (سواء مرتجع مبيعات من زبون أو مرتجع مشتريات إلى مورد)، يتيح النظام خيار التسوية المالية الفورية (تسوية المبلغ عبر أي وسيلة دفع معتمدة)، أو إبقاء المبلغ معلقاً كـ رصيد دائن/مستحق.'
            },
            {
                id: 'unsettled-returns-impact',
                subNumber: '3.2',
                title: 'أثر المرتجع بدون تسوية (الأرصدة المستحقة)',
                badgeText: 'قاعدة حسابية جوهرية',
                badgeVariant: 'amber',
                iconName: 'Scale',
                description: 'في حال تم تنفيذ عملية الإرجاع دون إنشاء تسوية مالية فورية (أي دون تسوية وتدفق المبلغ مالياً وقت المرتجع)، يترتب على ذلك الأثر المحاسبي التلقائي التالي:',
                cardsGrid: [
                    {
                        title: '1. مرتجع مبيعات بدون تسوية',
                        badge: 'مرتجع من زبون',
                        subtitle: 'الحالة المحاسبية: "الزبون يريد منك مبالغ" (رصيد مستحق للزبون)',
                        description: 'يتحول قيمة المرتجع تلقائياً كـ رصيد دائن لصالح الزبون. يمكن للزبون استخدام هذا الرصيد لخصم قيمة مشترياته القادمة، أو استرداده عبر وسيلة السداد المناسبة لاحقاً عبر شاشة التسويات.',
                        variant: 'blue',
                        iconName: 'UserCheck'
                    },
                    {
                        title: '2. مرتجع مشتريات بدون تسوية',
                        badge: 'مرتجع إلى مورد',
                        subtitle: 'الحالة المحاسبية: "أنت تريد مبالغ من المورد" (رصيد مستحق للمحل)',
                        description: 'يخصم قيمة المرتجع من ديون ومستحقات المورد، أو يُسجل كـ رصيد مستحق للمحل لدى المورد يُسوى في شحنات مشتريات قادمة أو يُسترد عبر وسيلة السداد المحددة وقت إجراء التسوية.',
                        variant: 'amber',
                        iconName: 'Building'
                    }
                ]
            },
            {
                id: 'independent-settlements',
                subNumber: '3.3',
                title: 'إنشاء التسويات المالية المنفصلة',
                badgeText: 'إغلاق وتصفية الأرصدة',
                badgeVariant: 'purple',
                iconName: 'ArrowLeftRight',
                cardsGrid: [
                    {
                        title: 'تصفية الأرصدة المعلقة عبر شاشة التسويات:',
                        description: 'يتيح النظام في أي وقت إنشاء "تسويات منفصلة" من شاشات تسويات العملاء أو تسويات الموردين. تُستخدم هذه الشاشات لتسجيل مبالغ التسوية وتصفية الأرصدة المعلقة (عبر وسيلة السداد المختارة وقت التنفيذ) الناتجة عن المرتجعات السابقة دون الحاجة لتعديل الفواتير الأصلية، مما يضمن دقة القيود والشفافية التامة أمام العميل والمورد.',
                        variant: 'purple',
                        iconName: 'CheckCircle2'
                    }
                ]
            }
        ]
    },
    {
        id: 'inventory-waste-loss',
        title: '4. سياسة التالف والخسائر المخزنية',
        iconName: 'Trash2',
        badge: 'الخطوة الرابعة',
        subtitle: 'توثيق الهالك والكسر واستثنائه من المخزون والأرباح المحاسبية',
        subsections: [
            {
                id: 'waste-concept-recording',
                subNumber: '4.1',
                title: 'مفهوم التالف وإثبات الخسائر',
                badgeText: 'سجلات التالف (Waste Logs)',
                badgeVariant: 'red',
                iconName: 'AlertOctagon',
                description: 'تسمح المنظومة بإثبات وتوثيق أي أصناف أو كميات عطرية تعرضت للتلف أو الكسر أو انتهاء الصلاحية أو تم استهلاكها كـ عينات تجريبية (Testers) دون بيعها:',
                steps: [
                    {
                        number: 1,
                        title: 'التوثيق والملاحظات',
                        description: 'تسجيل سبب التلف بالتفصيل (مثل: كسر عبوة، انسكاب زيت، عينة عرض) وحفظ اسم الموظف المنفذ.'
                    },
                    {
                        number: 2,
                        title: 'تحديد الحجم والكمية',
                        description: 'خصم الكمية إما بالقطعة (Unit) للمنتجات العادية، أو بالملي متر (Ml) للعطور الزيتية والأصلية.'
                    },
                    {
                        number: 3,
                        title: 'تتبع السجل التاريخي',
                        description: 'الاحتفاظ بسجل كامل للتالف مع إمكانية طباعته أو تصديره للمراجعة والتدقيق المحاسبي.'
                    }
                ]
            },
            {
                id: 'stock-cost-impact',
                subNumber: '4.2',
                title: 'الأثر المخزني للتالف',
                badgeText: 'تعديل رصيد المخزون',
                badgeVariant: 'red',
                iconName: 'TrendingDown',
                cardsGrid: [
                    {
                        title: 'الخصم المباشر من المخزون',
                        description: 'تُخصم الكمية التالفة فوراً ولحظياً من رصيد المنتج الفعلي بالمنظومة، مما يضمن مطابقة الجرد الفعلي للمحل مع رصيد الشاشة 100%.',
                        variant: 'rose',
                        iconName: 'Box'
                    }
                ]
            }
        ]
    },
    {
        id: 'reports-profit-analysis',
        title: '5. التقارير وتحليل الأرباح',
        iconName: 'BarChart3',
        badge: 'الخطوة الخامسة',
        subtitle: 'آلية عمل تقارير الأرباح وتحليل الأداء المالي اليومي والتاريخي وتتبع الحركة',
        introCallout: {
            type: 'info',
            title: 'خيارات التصدير القياسية لجميع التقارير:',
            text: 'تعتمد جميع تقارير المنظومة ميزة التصدير المباشر والموحد إلى ملفات PDF أو Excel بضغطة زر واحدة، مع إدراج جميع البيانات الإحصائية والفلاتر المحددة دون الحاجة لأي إعدادات إضافية.'
        },
        subsections: [
            {
                id: 'comprehensive-profit-analysis',
                subNumber: '5.1',
                title: 'تحليل الأرباح الشامل (/reports/profit-analysis)',
                badgeText: 'تبويبان للتحليل اليومي والتفصيلي',
                badgeVariant: 'indigo',
                iconName: 'BarChart3',
                description: 'تحتوي شاشة "تحليل الأرباح الشامل" على تبويبين متكاملين يوفران رؤية مالية مزدوجة (تجميعية وهيكلية للزمن، وتفصيلية للمنتجات):',
                cardsGrid: [
                    {
                        title: 'التاب الأول: "تحليل يومي" (Daily Analysis)',
                        subtitle: 'تجميع شهري ويومي متدرج',
                        description: 'يقدم نظرة تجميعية لأداء المبيعات مقسمة حسب الأشهر مع إمكانية التوسع لرؤية أيام كل شهر بالتفصيل.',
                        list: [
                            'الفلاتر: اختيار النطاق الزمني (من/إلى) والفلترة حسب منتج أو عدة منتجات.',
                            'المؤشرات: المبيعات، المرتجعات، صافي المبيعات، وصافي الأرباح.'
                        ],
                        variant: 'indigo',
                        iconName: 'Calendar'
                    },
                    {
                        title: 'التاب الثاني: "تقرير الأرباح (بالتاريخ)" (Stock Profit)',
                        subtitle: 'تحليل تفصيلي للمنتجات والربحية',
                        description: 'يقدم تحليلاً تفصيلياً لكل منتج لمعرفة حركة الكميات المباعة وأرباح الأصناف خلال الفترة المحددة.',
                        list: [
                            'الفلاتر: النطاق الزمني، التصنيف، والبحث ببيانات المنتج.',
                            'المؤشرات: الرصيد، المباع، المتوسطات، وصافي الربح.'
                        ],
                        variant: 'emerald',
                        iconName: 'TrendingDown'
                    }
                ],
                featureBoxes: [
                    {
                        title: 'خاصية "عرض مختصر للربح" وأنماط عرض تقرير أرباح المنتجات',
                        badgeText: 'مفتـاح تفاعلي',
                        iconName: 'EyeOff',
                        variant: 'emerald',
                        description: 'يتيح هذا المفتاح التنقل بين نمطين للعرض بحسب مستوى التفاصيل المطلوب:',
                        subCards: [
                            {
                                title: '1. العرض التفصيلي الشامل (الفلتر معطل OFF)',
                                badge: '12 عموداً تفصيلياً',
                                description: 'يعرض التقرير الشامل بكافة المؤشرات: (المنتج، إجمالي المشتراه، إجمالي المخزون، إجمالي المبيعات، إجمالي التالف، مرتجع مورد، متوسط ارجاع المورد، مرتجع زبائن، متوسط ارجاع الزبائن، متوسط شراء، متوسط بيع، والربح).',
                                variant: 'emerald'
                            },
                            {
                                title: '2. العرض المختصر المركّز (الفلتر مفعل ON)',
                                badge: 'تصفية + ربح مقتضب',
                                description: 'يخفي تلقائياً الأصناف التي لم تحقق أي مبيعات خلال الفترة، ويختصر الجدول على: (اسم المنتج، المخزون، المباع، متوسط الشراء، متوسط البيع، وصافي الربح).',
                                variant: 'emerald'
                            }
                        ]
                    }
                ]
            },
            {
                id: 'product-movement-report',
                subNumber: '5.2',
                title: 'حركات المنتجات والمخزون (/reports/product-movement)',
                badgeText: 'تتبع تاريخي وتدقيق 100%',
                badgeVariant: 'blue',
                iconName: 'Package',
                description: 'يُخصص هذا التقرير لتتبع كافة حركات الدخول والخروج الخاصة بمنتج معين بالتفصيل والترتيب الزمني والتراكمي لبيان تطور رصيد المخزون:',
                featureBoxes: [
                    {
                        title: 'آلية الاستعلام ودعم سكانر الباركود (Barcode Scanner)',
                        badgeText: 'مسح تلقائي وسريع',
                        iconName: 'Package',
                        variant: 'blue',
                        description: 'يلزم اختيار منتج واحد محدد لعرض حركته. يدعم التقرير الاستعلام السريع عبر مسح باركود المنتج (QR / Barcode) بقارئ الباركود؛ حيث يتعرف النظام آلياً على الصنف ويجلب السجل الكامل فوراً.'
                    }
                ],
                statsGrid: [
                    { label: '1. رصيد أول الفترة', description: 'الكمية المتوفرة في المخزون قبل بداية النطاق الزمني المحدد.' },
                    { label: '2. عدد الحركات', description: 'إجمالي عدد العمليات التي طرأت على الصنف خلال الفترة.' },
                    { label: '3. رصيد آخر الفترة والتغير', description: 'الرصيد المتبقي النهائي مع مؤشر تلقائي لنسبة التغير (زيادة / نقصان).' }
                ],
                cardsGrid: [
                    { title: '1. مشتريات (Purchase)', badge: 'زيادة (+)', description: 'إضافة كميات جديدة للمخزون ناتجة عن شراء من مورد.', variant: 'emerald' },
                    { title: '2. مبيعات (Sale)', badge: 'نقصان (-)', description: 'خصم كميات من المخزون بناءً على فواتير البيع للعملاء.', variant: 'rose' },
                    { title: '3. مرتجع عميل (Return In)', badge: 'زيادة (+)', description: 'إعادة إدخال بضائع مرجعة من الزبائن للمخزون.', variant: 'blue' },
                    { title: '4. مرتجع مورد (Return Out)', badge: 'نقصان (-)', description: 'خصم بضائع تم ردها وإعادتها للمورد.', variant: 'amber' },
                    { title: '5. تالف (Waste)', badge: 'نقصان (-)', description: 'خصم الكميات الهالكة أو المكسورة أو عينات العرض.', variant: 'slate' },
                    { title: '6. رصيد افتتاحي (Opening)', badge: 'نقطة بداية', description: 'الرصيد المنقول أو المبدئي عند بداية التتبع المحاسبي.', variant: 'purple' }
                ],
                callout: {
                    type: 'info',
                    title: 'أعمدة جدول السجل التراكمي:',
                    text: 'يعرض التقرير الجدول بالتفصيل التراكمي شاملاً: (تاريخ الحركة، نوع الحركة باللون المخصص، الكمية المضافة أو المخصومة مع سهم الاتجاه، سعر الوحدة، رقم مرجع الفاتورة/السند، ورصيد المخزون التراكمي المتبقي فور العملية).'
                }
            }
        ]
    }
];
