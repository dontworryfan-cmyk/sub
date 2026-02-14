# Компилятор подписок 3X-UI (GUI)

Минимальный веб-интерфейс для работы с идеей проекта [nginx-3x-ui-subscription-proxy](https://github.com/apa4h/nginx-3x-ui-subscription-proxy/blob/main/README_RU.md):

- Простая авторизация (локально в браузере): `admin / admin123`
- Однотонное тёмно-серое оформление
- Генерация ссылки подписки и фрагмента NGINX для 3X-UI
- Объединение нескольких подписок в одну:
  - поддерживается ввод URL источников,
  - поддерживается вставка raw/base64 контента,
  - на выходе получается общий raw и base64 результат без дублей.

## Локальный запуск

```bash
python3 -m http.server 8080
```

Откройте: <http://localhost:8080>

## Установка на VPS (Ubuntu 22.04/24.04)

Ниже — простой production-вариант для статического фронтенда через NGINX.

### 1) Подготовка сервера

```bash
sudo apt update
sudo apt install -y nginx git
sudo systemctl enable --now nginx
```

Если используете firewall UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2) Размещение проекта

```bash
sudo mkdir -p /var/www/sub-gui
sudo chown "$USER":"$USER" /var/www/sub-gui
git clone https://github.com/<your-org>/<your-repo>.git /var/www/sub-gui
```

Если репозиторий уже есть локально, можно скопировать файлы (`index.html`, `styles.css`, `app.js`) в `/var/www/sub-gui`.

### 3) Конфигурация NGINX

Создайте конфиг сайта:

```bash
sudo nano /etc/nginx/sites-available/sub-gui.conf
```

Вставьте:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;

    root /var/www/sub-gui;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Активируйте сайт и перезапустите NGINX:

```bash
sudo ln -s /etc/nginx/sites-available/sub-gui.conf /etc/nginx/sites-enabled/sub-gui.conf
sudo nginx -t
sudo systemctl reload nginx
```

После этого интерфейс доступен по `http://your-domain.com`.

### 4) HTTPS (рекомендуется)

Установите Certbot и выпустите сертификат:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 5) Обновление после изменений

```bash
cd /var/www/sub-gui
git pull
sudo nginx -t && sudo systemctl reload nginx
```

## Важно по безопасности

Текущая авторизация (`admin / admin123`) демонстрационная и выполняется на frontend.
Для реального использования на VPS обязательно:

- перенести авторизацию на backend,
- хранить токены/секреты только на сервере,
- ограничить CORS и доступ к API,
- сменить дефолтные учётные данные.
