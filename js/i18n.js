const I18N = {
  _locale: 'zh-CN',
  _messages: {},

  async init() {
    const saved = localStorage.getItem('gpt_image2_locale');
    const browserLang = navigator.language || 'zh-CN';
    const defaultLocale = browserLang.startsWith('zh') ? 'zh-CN' : 'en-US';
    this._locale = saved || defaultLocale;
    await this.load(this._locale);
    this.apply();
  },

  async load(locale) {
    try {
      const res = await fetch(`js/locales/${locale}.json?t=${Date.now()}`);
      if (!res.ok) throw new Error(`locale not found: ${locale}`);
      this._messages = await res.json();
    } catch (e) {
      console.warn('i18n load failed:', e);
      this._messages = {};
    }
  },

  t(key) {
    return this._messages[key] || key;
  },

  apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = this.t(key);
      if (val && val !== key) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const val = this.t(key);
      if (val && val !== key) el.setAttribute('placeholder', val);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const val = this.t(key);
      if (val && val !== key) el.setAttribute('title', val);
    });
    document.documentElement.lang = this._locale;
  },

  async switchLocale(locale) {
    this._locale = locale;
    localStorage.setItem('gpt_image2_locale', locale);
    await this.load(locale);
    this.apply();
    const selector = document.getElementById('lang-select');
    if (selector) selector.value = locale;
  },

  getLocale() {
    return this._locale;
  }
};
