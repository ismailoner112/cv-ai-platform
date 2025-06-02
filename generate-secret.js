const crypto = require('crypto');

// 64 byte (512 bit) uzunluğunda rastgele bir string oluştur
const secret = crypto.randomBytes(64).toString('hex');

console.log('\nJWT Secret oluşturuldu:');
console.log('------------------------');
console.log(secret);
console.log('\nBu secret\'ı .env dosyanızdaki JWT_SECRET değişkenine yapıştırın.');
console.log('Örnek:');
console.log('JWT_SECRET=' + secret); 