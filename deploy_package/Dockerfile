# ─── المرحلة 1: بناء ملفات الواجهة (Vite / React) ───
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# ─── المرحلة 2: بناء حزم Composer (PHP) ───
FROM composer:2 AS composer-builder
WORKDIR /app
COPY composer*.json ./
RUN composer install --no-dev --no-interaction --prefer-dist --no-scripts --ignore-platform-reqs
COPY . .
RUN composer dump-autoload --optimize --no-dev --no-scripts

# ─── المرحلة 3: بناء الصورة النهائية للإنتاج (Production Image) ───
FROM php:8.4-fpm-alpine

# تثبيت الأدوات وحزم النظام المطلوبة
RUN apk add --no-cache \
    nginx \
    netcat-openbsd \
    curl \
    libpng-dev \
    libzip-dev \
    zip \
    unzip \
    icu-dev \
    oniguruma-dev \
    zlib

# تثبيت إضافات PHP الضرورية (تم استخدام PHP 8.3 لضمان توافقية كاملة مع مكتبات الإكسل OpenSpout)
RUN docker-php-ext-install -j$(nproc) \
    pdo_mysql \
    mbstring \
    bcmath \
    zip \
    gd \
    intl \
    opcache

# إعدادات تحسين الأداء OPcache
RUN { \
    echo 'opcache.enable=1'; \
    echo 'opcache.revalidate_freq=0'; \
    echo 'opcache.validate_timestamps=0'; \
    echo 'opcache.max_accelerated_files=10000'; \
    echo 'opcache.memory_consumption=128'; \
    echo 'opcache.max_wasted_percentage=10'; \
    echo 'opcache.interned_strings_buffer=16'; \
    echo 'opcache.fast_shutdown=1'; \
} > /usr/local/etc/php/conf.d/opcache-recommended.ini

# إعدادات PHP المخصصة لرفع الملفات والذاكرة
RUN { \
    echo 'upload_max_filesize = 2048M'; \
    echo 'post_max_size = 2048M'; \
    echo 'memory_limit = 2048M'; \
    echo 'max_execution_time = 600'; \
} > /usr/local/etc/php/conf.d/custom-php.ini

WORKDIR /var/www/html

# نسخ إعدادات Nginx وسكربت نقطة الدخول
COPY deploy_package/docker/nginx.conf /etc/nginx/http.d/default.conf
COPY deploy_package/docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh && chmod +x /usr/local/bin/entrypoint.sh

# نسخ ملفات المشروع وملفات البناء
COPY . .
RUN rm -rf bootstrap/cache/* && mkdir -p bootstrap/cache
COPY --from=frontend-builder /app/public/build ./public/build
COPY --from=composer-builder /app/vendor ./vendor

RUN php artisan package:discover --ansi

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["sh", "-c", "php-fpm -D && nginx -g 'daemon off;'"]
