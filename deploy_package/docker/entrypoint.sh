#!/bin/sh
set -e

echo "==> [Perfumes_v2] جاري بدء تهيئة حاوية التطبيق..."

mkdir -p /var/www/html/storage/framework/cache/data \
         /var/www/html/storage/framework/sessions \
         /var/www/html/storage/framework/views \
         /var/www/html/storage/logs \
         /var/www/html/bootstrap/cache

chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null || true
chmod -R 777 /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null || true

if [ ! -L /var/www/html/public/storage ]; then
    echo "==> جاري إنشاء رابط التخزين (storage:link)..."
    php artisan storage:link || true
fi

echo "==> جاري انتظار اتصال قاعدة البيانات (${DB_HOST:-db}:${DB_PORT:-3306})..."
until nc -z -v -w30 "${DB_HOST:-db}" "${DB_PORT:-3306}"; do
    echo "قاعدة البيانات غير متاحة بعد، انتظر ثوانٍ..."
    sleep 2
done
echo "==> تم الاتصال بقاعدة البيانات بنجاح!"

echo "==> تشغيل ترحيل الجداول (php artisan migrate)..."
php artisan migrate --force

echo "==> التحقق من البيانات الأساسية للنظام (Core System Seeder)..."
php artisan db:seed --class=CoreSystemSeeder --force || true

echo "==> تطبيق كاش الإعدادات والمسارات والواجهات..."
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

echo "==> [Perfumes_v2] المنظومة جاهزة وتعمل بنجاح!"

exec "$@"
