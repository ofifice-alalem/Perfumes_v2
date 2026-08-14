# Perfumes_v2 Installation & High-Performance Setup Guide

This guide details the prerequisites, installation steps, and high-performance C++ exporter compilation setup for **Perfumes_v2**.

---

## 📋 System Prerequisites

1. **PHP**: `^8.2` with extensions (`pdo_mysql`, `mbstring`, `bcmath`, `curl`, `xml`, `zip`).
2. **Node.js**: `^18.0` or `^20.0` and `npm`.
3. **Database**: MySQL `8.0+` or MariaDB `10.5+`.
4. **Web Server**: Apache (`mod_rewrite` enabled) or Nginx with PHP-FPM.
5. **C++ Compiler (Optional for re-building Exporter)**:
   - **Windows**: MinGW-w64 GCC (`g++`).
   - **Linux**: GCC (`g++`) with `build-essential`.

---

## ⚡ High-Performance C++ Exporter Setup (`/bin`)

To achieve ultra-fast Excel report exports (reducing export times from >60 seconds down to 7-11 seconds), **Perfumes_v2** utilizes a native, statically-compiled C++ exporter engine powered by `libxlsxwriter`.

### Location Requirement
The compiled binary **MUST** reside inside the `/bin` directory at the project root:
- **Windows**: `bin/export_xlsx.exe`
- **Linux**: `bin/export_xlsx`

### Automatic Fallback
If the `/bin` binary is missing, the application automatically falls back to standard PHP streaming (`OpenSpout`) without throwing errors.

---

## 🛠️ Compiling the C++ Exporter

### 1. Windows Compilation (MinGW GCC)
Run the automated PowerShell build script:
```powershell
powershell -ExecutionPolicy Bypass -File scratch/build_cpp_exporter.ps1
```
*Or compile manually with static GCC linking:*
```bash
g++ -O3 -static -static-libgcc -static-libstdc++ -DHAVE_LIBXLSXWRITER -I bin/libxlsxwriter/include -I bin/zlib bin/export_xlsx.cpp bin/libxlsxwriter/obj/*.o -o bin/export_xlsx.exe
```

### 2. Linux Compilation (Ubuntu/Debian)
Install build tools and compile:
```bash
sudo apt update && sudo apt install -y build-essential zlib1g-dev
g++ -O3 -DHAVE_LIBXLSXWRITER -I bin/libxlsxwriter/include -I bin/zlib bin/export_xlsx.cpp bin/libxlsxwriter/obj/*.o -o bin/export_xlsx
chmod +x bin/export_xlsx
```

---

## ⚙️ Standard Installation Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/ofifice-alalem/Perfumes_v2.git
   cd Perfumes_v2
   ```

2. **Install PHP & Node Dependencies**:
   ```bash
   composer install --optimize-autoloader --no-dev
   npm install
   npm run build
   ```

3. **Configure Environment (`.env`)**:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

4. **Database & Storage Setup**:
   ```bash
   php artisan migrate --force
   php artisan storage:link
   ```

5. **Optimize Production Caches**:
   ```bash
   php artisan optimize
   ```
