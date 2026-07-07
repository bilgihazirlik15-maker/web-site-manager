# Web Site Yoneticisi

Tek bir arayuz uzerinden birden cok web sitesini kaydetmek, listelemek, favorilemek, silmek ve secilen siteyi sag taraftaki iframe alaninda calistirmak icin hazirlanan bagimsiz panel.

## Kullanim

1. `index.html` dosyasini acin.
2. Sol ustteki `+` dugmesiyle yeni web sitesi ekleyin.
3. Sol listeden bir site secin.
4. Secilen site sag tarafta iframe icinde acilir.
5. Iframe icinde acilmayi reddeden siteler icin `Yeni sekmede ac` dugmesini kullanin.

Kayitli site listesi tarayicinin `localStorage` alaninda saklanir. Ilk surum kurulum veya sunucu gerektirmeden calisir.

## Ozellikler

- Site ekleme ve silme
- Favori belirleme ve favorilere gore filtreleme
- Site adi, adresi veya gruba gore arama
- Site listesini JSON olarak disa aktarma
- Sol panelde bagimsiz scroll
- Secilen siteyi sag tarafta iframe ile gosterme

## Dosyalar

- `index.html`: Ana arayuz
- `site-manager.css`: Gorsel tasarim
- `site-manager.js`: Uygulama davranislari
