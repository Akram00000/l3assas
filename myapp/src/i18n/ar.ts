export const ar = {
  // App branding
  appName: 'العساس',
  appSubtitle: 'نظام مراقبة ذكي للمزارع',
  
  // Navigation
  home: 'الرئيسية',
  sensors: 'المستشعرات',
  camera: 'الكاميرا',
  map: 'الخريطة',
  notifications: 'الإشعارات',
  settings: 'الإعدادات',
  
  // Alert levels
  safe: 'آمن',
  warning: 'تحذير',
  fire: 'حريق',
  intrusion: 'تسلل',
  clear: 'منطقة سليمة',
  
  // Status
  serverOnline: 'الخادم متصل',
  serverOffline: 'الخادم غير متصل',
  sensorsOk: 'المستشعرات تعمل',
  visionOk: 'الرؤية تعمل',
  cameraActive: 'الكاميرا نشطة',
  cameraInactive: 'الكاميرا غير نشطة',
  
  // Actions
  start: 'بدء',
  stop: 'إيقاف',
  save: 'حفظ',
  test: 'اختبار',
  retry: 'إعادة المحاولة',
  submit: 'إرسال',
  
  // Sensor inputs
  mq2: 'مستشعر الغاز MQ2',
  mq6: 'مستشعر الغاز MQ6',
  temperature: 'درجة الحرارة',
  humidity: 'الرطوبة',
  wind: 'سرعة الرياح',
  rain: 'الأمطار',
  month: 'الشهر',
  
  // Presets
  presets: 'الإعدادات المسبقة',
  normal: 'عادي',
  gasLeak: 'تسرب غاز',
  hotDay: 'يوم حار',
  firePreset: 'حريق',
  extreme: 'متطرف',
  
  // Camera
  showFire: 'عرض الحريق',
  showIntruder: 'عرض المتسللين',
  fireConfidence: 'ثقة الحريق',
  intruderConfidence: 'ثقة المتسلل',
  detectionSettings: 'إعدادات الكشف',
  
  // Detection types
  fireDetection: 'حريق',
  smokeDetection: 'دخان',
  personDetection: 'شخص',
  animalDetection: 'حيوان',
  detections: 'الكشوفات',
  
  // Results
  results: 'النتائج',
  alert: 'التنبيه',
  smokeProb: 'احتمال الدخان',
  fireRisk: 'خطر الحريق',
  gasClass: 'تصنيف الغاز',
  gas: 'الغاز',
  confidence: 'الثقة',
  miniGraphs: 'رسوم بيانية مصغرة',
  lastTenReadings: 'اخر 10 قراءات',
  
  // Spread speed
  spreadSpeed: 'سرعة الانتشار',
  spreadLevel: 'مستوى الانتشار',
  faible: 'ضعيف',
  modere: 'معتدل',
  rapide: 'سريع',
  extremeLevel: 'متطرف',
  factors: 'العوامل',
  
  // Settings
  language: 'اللغة',
  soundAlerts: 'تنبيهات صوتية',
  darkMode: 'الوضع الداكن',
  demoMode: 'وضع العرض',
  demoModeHelp: 'محاكاة حريق وكاميرا واشعارات بعد 10 ثوان',
  demoModeArmed: 'وضع العرض مفعل - حريق تجريبي بعد 10 ثوان',
  demoModeCountdown: 'بدء المحاكاة خلال',
  apiUrl: 'عنوان API',
  appInfo: 'معلومات التطبيق',
  version: 'الإصدار',
  speed: 'السرعة',
  classProbabilities: 'احتمالات الفئات',
  gatesApplied: 'العوامل المطبقة',
  secondsShort: 'ث',
  secondsWord: 'ثانية',
  success: 'نجاح',
  error: 'خطأ',
  configSaved: 'تم حفظ الإعدادات',
  configSaveFailed: 'فشل حفظ الإعدادات',
  testSendFailed: 'فشل إرسال إشعار الاختبار',
  done: 'تم',
  apiUrlNote: 'أعد تشغيل التطبيق بعد تغيير عنوان API',
  appNameLabel: 'اسم التطبيق',
  buildLabel: 'البنية',
  devSessionLabel: 'جلسة التطوير',
  noGas: 'بدون غاز',
  mixture: 'خليط',
  perfume: 'عطر',
  
  // Notifications
  ntfyTopic: 'موضوع Ntfy',
  ntfyServer: 'خادم Ntfy',
  cooldown: 'فترة التهدئة',
  sendTest: 'إرسال اختبار',
  currentConfig: 'الإعدادات الحالية',
  
  // Messages
  offline: 'غير متصل بالإنترنت',
  connectionError: 'خطأ في الاتصال',
  retryPrompt: 'اضغط لإعادة المحاولة',
  cameraError: 'خطأ في الكاميرا',
  predictionError: 'خطأ في التنبؤ',
  loading: 'جاري التحميل...',
  noData: 'لا توجد بيانات',
  demoStreamActive: 'بث كاميرا تجريبي (وضع العرض)',
  
  // Quick actions
  quickActions: 'إجراءات سريعة',
  checkSensors: 'فحص المستشعرات',
  viewCamera: 'عرض الكاميرا',
  
  // Status summary
  systemStatus: 'حالة النظام',
  sensorAlert: 'تنبيه المستشعر',
  visionAlert: 'تنبيه الرؤية',
  globalAlert: 'التنبيه العام',
  potentialFireAlert: 'تنبيه، احتمال حريق',
  evacuateNow: 'اخلاء فوري',
  okThanks: 'حسنا، شكرا',
  falseWarningAction: 'هذا إنذار كاذب',
  fireDetected: '🔥 تم اكتشاف حريق',
  warningDetected: '⚠️ تنبيه، احتمال حريق',
  intrusionDetected: '🚨 تم كشف تسلل',
  incidentLocation: '📍 المنطقة أ - الحظيرة 2',
  spreadLabel: '📈 الانتشار',
  confidenceLabel: '🎯 الثقة',
  sonicAlarmAlwaysOn: 'الإنذارات الصوتية مفعلة مع التنبيهات البصرية',
  mapOverview: 'مخطط المزرعة',
  mapDescription: 'خريطة مبسطة مع المستشعرات والكاميرات',
  mapSensors: 'المستشعرات',
  mapCameras: 'الكاميرات',
  mapHotZone: 'منطقة الإنذار',
  notifyCoverage: 'الإشعارات: التسلل + الحريق مفعلة',
  whyThisAlert: 'لماذا هذا التنبيه؟',
  reasonHighMq2: '- تم رصد ارتفاع في غاز MQ2',
  reasonTempRising: '- اتجاه درجة الحرارة في ارتفاع',
  reasonSmokeCamera: '- تم كشف الدخان بواسطة الكاميرا',
  reasonIntrusionCamera: '- تم كشف وجود متسلل عبر الكاميرا',
  lastUpdateTime: 'اخر تحديث',
};
