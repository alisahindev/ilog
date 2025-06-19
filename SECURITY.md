# Güvenlik Politikası

## Desteklenen Versiyonlar

Aşağıdaki versiyonlar güvenlik güncellemeleri alır:

| Versiyon | Desteklenen          |
| -------- | -------------------- |
| 1.x.x    | :white_check_mark:   |
| < 1.0    | :x:                  |

## Güvenlik Açığı Bildirimi

Eğer bir güvenlik açığı keşfederseniz, lütfen aşağıdaki adımları izleyin:

### 1. İLK ÖNCE ÖZEL OLARAK BİLDİRİN

**Güvenlik açıklarını GitHub Issues üzerinden bildirmeyin.**

Bunun yerine, güvenlik açığını gizli olarak bildirmek için:
- GitHub'ın güvenlik açığı bildirimi özelliğini kullanın
- Doğrudan maintainer'a e-posta gönderin: ali.sahin@trendyol.com

### 2. Aşağıdaki Bilgileri Dahil Edin

- Güvenlik açığının detaylı açıklaması
- Açığın nasıl kullanılabileceğine dair adım adım talimatlar
- Etkilenen version(lar)
- Varsa, açığı gösteren kod örneği
- Açığın potansiyel etkisi

### 3. Beklenen Cevap Süresi

- **24 saat içinde**: İlk onay
- **72 saat içinde**: Detaylı değerlendirme
- **1 hafta içinde**: Çözüm planı
- **30 gün içinde**: Güvenlik yaması

## Güvenlik En İyi Uygulamaları

### Geliştirici Rehberi

1. **Hassas Veri Maskelenimi**
   ```typescript
   // ✅ Doğru
   logger.info('User login', { userId: user.id });
   
   // ❌ Yanlış
   logger.info('User login', { password: user.password });
   ```

2. **Input Validation**
   ```typescript
   // ✅ Doğru
   if (typeof message !== 'string') {
     throw new Error('Message must be a string');
   }
   
   // ❌ Yanlış
   logger.info(userInput); // Doğrudan kullanıcı girişi
   ```

3. **Stack Trace Kontrolü**
   ```typescript
   // ✅ Doğru - Sadece development'da stack trace
   errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined
   
   // ❌ Yanlış - Her zaman stack trace
   errorStack: error.stack
   ```

### Kullanıcı Rehberi

1. **Hassas Alanları Tanımlayın**
   ```typescript
   const logger = new Logger({
     sensitiveFields: [
       'password', 'token', 'secret', 'apiKey', 
       'creditCard', 'ssn', 'email', 'phone'
     ]
   });
   ```

2. **Production Yapılandırması**
   ```typescript
   const logger = new Logger({
     level: LogLevel.WARN, // Sadece önemli loglar
     enableConsole: false, // Console logları kapatın
     enableFile: true,
     filePath: './logs/app.log'
   });
   ```

3. **Log Dosyası Güvenliği**
   ```bash
   # Log dosyalarını güvenli kılın
   chmod 600 logs/*.log
   chown app:app logs/*.log
   ```

## Güvenlik Kontrolü Araçları

### 1. Dependency Audit
```bash
npm run security:audit
npm run security:fix
```

### 2. Code Linting
```bash
npm run lint:check
```

### 3. Security Tests
```bash
npm test tests/security.test.ts
```

### 4. Coverage Check
```bash
npm run test:coverage
```

## Bilinen Güvenlik Açıkları

### Geçmiş Açıklar

Bu bölüm güvenlik açıkları çözüldükçe güncellenecektir.

### Azaltma Stratejileri

1. **Log Injection Saldırıları**
   - Tüm kullanıcı girişleri sanitize edilir
   - Control karakterler filtrelenir
   - Maksimum uzunluk sınırı uygulanır

2. **Hassas Veri Sızıntısı**
   - Otomatik hassas veri maskelenimi
   - Stack trace'ler sadece development'da
   - Yapılandırılabilir hassas alan listesi

3. **Prototype Pollution**
   - Object.create(null) kullanımı
   - Güvenli object merging
   - Input validation

## Güvenlik Güncellemeleri

Güvenlik güncellemelerini takip etmek için:

1. Bu repo'yu "watch" edin
2. [GitHub Releases](https://github.com/yourusername/ilog/releases) sayfasını takip edin
3. Güvenlik açıkları [GitHub Advisory](https://github.com/yourusername/ilog/security/advisories) üzerinden duyurulur

## İletişim

Güvenlik sorularınız için:
- E-posta: ali.sahin@trendyol.com
- GitHub: [@yourusername](https://github.com/yourusername)

**Lütfen güvenlik açıklarını public olarak bildirmeyin.** 