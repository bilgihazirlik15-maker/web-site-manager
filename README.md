# Web Site Yöneticisi

Tek bir arayüz üzerinden birden çok web sitesini kaydetmek, listelemek, favorilemek, silmek ve seçilen siteyi sağ taraftaki iframe alanında çalıştırmak için hazırlanan bağımsız panel.

## Kullanım

1. `index.html` dosyasını açın.
2. Sol üstteki `+` düğmesiyle yeni web sitesi ekleyin.
3. Sol listeden bir site seçin.
4. Seçilen site sağ tarafta iframe içinde açılır.
5. Iframe içinde açılmayı reddeden siteler için `Yeni sekmede aç` düğmesini kullanın.

Kayıtlı site listesi tarayıcının `localStorage` alanında saklanır. İlk sürüm kurulum veya sunucu gerektirmeden çalışır.

## Özellikler

- Site ekleme ve silme
- Favori belirleme ve favorilere göre filtreleme
- Site adı, adresi veya gruba göre arama
- JSON dosyasından site listesini içe aktarma
- Site listesini JSON olarak dışa aktarma
- Sol panelde bağımsız scroll
- Seçilen siteyi sağ tarafta iframe ile gösterme

## Dosyalar

- `index.html`: Ana arayuz
- `site-manager.css`: Görsel tasarım
- `site-manager.js`: Uygulama davranışları
