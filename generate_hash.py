import bcrypt

# Hashlenecek admin şifresi
password = "adminuser"

# Güvenlik için rastgele bir salt oluştur
salt = bcrypt.gensalt()

# Şifreyi hashle
hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)

# Oluşturulan hash'i ekrana yazdır
print("Admin şifreniz için bcrypt hash:")
print(hashed_password.decode('utf-8'))