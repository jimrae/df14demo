openssl genrsa -out ssl-key.pem 1024

openssl req -new -key ssl-key.pem -out certrequest.csr

openssl x509 -req -in certrequest.csr -signkey ssl-key.pem -out ssl-cert.pem -days 365

cp ssl-cert.pem ssl-cert.cer
