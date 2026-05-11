<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use ZipArchive;

class BackupController extends Controller
{
    private string $backupDir;

    public function __construct()
    {
        $this->backupDir = storage_path('app/backups/database');
    }

    public function index(): Response
    {
        if (!is_dir($this->backupDir)) {
            mkdir($this->backupDir, 0755, true);
        }

        $files = glob($this->backupDir . '/*.zip') ?: [];

        $backups = collect($files)->map(function (string $path) {
            $filename = basename($path);
            $note     = null;

            $zip = new ZipArchive();
            if ($zip->open($path) === true) {
                $idx = $zip->locateName('note.txt');
                if ($idx !== false) {
                    $note = $zip->getFromIndex($idx);
                }
                $zip->close();
            }

            preg_match('/backup_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})_database\.zip/', $filename, $m);
            $date = isset($m[1]) ? str_replace('_', ' ', str_replace('-', ':', str_replace('_', '-', $m[1]))) : null;
            if ($date) {
                // إعادة تنسيق: backup_2026-05-09_14-30-00 → 2026-05-09 14:30:00
                preg_match('/(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})/', $m[1], $d);
                $date = isset($d[1]) ? "{$d[1]} {$d[2]}:{$d[3]}:{$d[4]}" : null;
            }

            return [
                'filename' => $filename,
                'size'     => $this->formatBytes(filesize($path)),
                'date'     => $date,
                'note'     => $note,
            ];
        })->sortByDesc('date')->values();

        return Inertia::render('Backups/Index', [
            'backups' => $backups,
        ]);
    }

    public function create(Request $request)
    {
        set_time_limit(300);
        ini_set('memory_limit', '512M');

        if (!is_dir($this->backupDir)) {
            mkdir($this->backupDir, 0755, true);
        }

        $timestamp  = now()->format('Y-m-d_H-i-s');
        $filename   = "backup_{$timestamp}_database.zip";
        $zipPath    = $this->backupDir . '/' . $filename;
        $sqlTmpPath = storage_path("app/backups/tmp_{$timestamp}.sql");

        $pdo    = DB::connection()->getPdo();
        $dbName = DB::connection()->getDatabaseName();

        $sql  = "-- Backup: {$filename}\n";
        $sql .= "-- Generated: " . now()->toDateTimeString() . "\n\n";
        $sql .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

        $tables = $pdo->query('SHOW TABLES')->fetchAll(\PDO::FETCH_COLUMN);

        foreach ($tables as $table) {
            // CREATE TABLE
            $createRow = $pdo->query("SHOW CREATE TABLE `{$table}`")->fetch(\PDO::FETCH_ASSOC);
            $createSql = array_values($createRow)[1];
            $sql .= "DROP TABLE IF EXISTS `{$table}`;\n";
            $sql .= $createSql . ";\n\n";

            // INSERT DATA بالدفعات
            $count = (int) $pdo->query("SELECT COUNT(*) FROM `{$table}`")->fetchColumn();
            if ($count > 0) {
                $offset = 0;
                $chunk  = 500;
                while ($offset < $count) {
                    $rows = $pdo->query("SELECT * FROM `{$table}` LIMIT {$chunk} OFFSET {$offset}")->fetchAll(\PDO::FETCH_ASSOC);
                    if (empty($rows)) break;

                    $cols   = '`' . implode('`, `', array_keys($rows[0])) . '`';
                    $values = [];
                    foreach ($rows as $row) {
                        $vals = array_map(function ($v) use ($pdo) {
                            return $v === null ? 'NULL' : $pdo->quote((string) $v);
                        }, array_values($row));
                        $values[] = '(' . implode(', ', $vals) . ')';
                    }
                    $sql .= "INSERT INTO `{$table}` ({$cols}) VALUES\n" . implode(",\n", $values) . ";\n";
                    $offset += $chunk;
                }
                $sql .= "\n";
            }
        }

        $sql .= "SET FOREIGN_KEY_CHECKS=1;\n";

        file_put_contents($sqlTmpPath, $sql);

        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE);
        $zip->addFile($sqlTmpPath, 'database.sql');

        $note = trim($request->input('note', ''));
        if ($note !== '') {
            $zip->addFromString('note.txt', $note);
        }

        $zip->close();
        unlink($sqlTmpPath);

        return response()->download($zipPath, $filename, [
            'Content-Type' => 'application/zip',
        ])->deleteFileAfterSend(false);
    }

    public function restore(string $filename): RedirectResponse
    {
        set_time_limit(0);
        ini_set('memory_limit', '1G');

        $zipPath = $this->backupDir . '/' . basename($filename);

        if (!file_exists($zipPath)) {
            return back()->with('error', 'الملف غير موجود');
        }

        $tmpDir = storage_path('app/restore_temp_' . time());
        mkdir($tmpDir, 0755, true);

        $zip = new ZipArchive();
        if ($zip->open($zipPath) !== true) {
            rmdir($tmpDir);
            return back()->with('error', 'تعذّر فتح ملف النسخة الاحتياطية');
        }
        $zip->extractTo($tmpDir);
        $zip->close();

        $sqlFile = $tmpDir . '/database.sql';
        if (file_exists($sqlFile)) {
            try {
                $this->restoreLargeSQL($sqlFile);
            } catch (\Throwable $e) {
                $this->deleteDir($tmpDir);
                return back()->with('error', 'فشل استعادة قاعدة البيانات: ' . $e->getMessage());
            }
        }

        $this->deleteDir($tmpDir);

        return back()->with('success', 'تمت استعادة النسخة الاحتياطية بنجاح');
    }

    public function download(string $filename)
    {
        $zipPath = $this->backupDir . '/' . basename($filename);

        if (!file_exists($zipPath)) {
            abort(404);
        }

        return response()->download($zipPath, $filename, [
            'Content-Type' => 'application/zip',
        ]);
    }

    public function delete(string $filename): RedirectResponse
    {
        $zipPath = $this->backupDir . '/' . basename($filename);

        if (file_exists($zipPath)) {
            unlink($zipPath);
        }

        return back()->with('success', 'تم حذف النسخة الاحتياطية');
    }

    public function upload(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:zip', 'max:524288'], // 512MB
        ]);

        if (!is_dir($this->backupDir)) {
            mkdir($this->backupDir, 0755, true);
        }

        $file     = $request->file('file');
        $original = $file->getClientOriginalName();

        // إذا لم يكن الاسم بالصيغة المعتادة، نعيد تسميته
        if (!preg_match('/^backup_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_database\.zip$/', $original)) {
            $original = 'backup_' . now()->format('Y-m-d_H-i-s') . '_database.zip';
        }

        $file->move($this->backupDir, $original);

        return back()->with('success', 'تم رفع النسخة الاحتياطية بنجاح');
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1073741824) return round($bytes / 1073741824, 2) . ' GB';
        if ($bytes >= 1048576)    return round($bytes / 1048576, 2)    . ' MB';
        if ($bytes >= 1024)       return round($bytes / 1024, 2)       . ' KB';
        return $bytes . ' B';
    }

    private function restoreLargeSQL(string $sqlFile): void
    {
        $pdo = DB::connection()->getPdo();
        $pdo->exec('SET FOREIGN_KEY_CHECKS=0');

        $content    = file_get_contents($sqlFile);
        $statements = [];
        $current    = '';
        $inString   = false;
        $strChar    = '';
        $len        = strlen($content);

        for ($i = 0; $i < $len; $i++) {
            $char = $content[$i];

            if ($inString) {
                $current .= $char;
                if ($char === '\\') {
                    $current .= $content[++$i];
                } elseif ($char === $strChar) {
                    $inString = false;
                }
            } elseif ($char === "'" || $char === '"') {
                $inString = true;
                $strChar  = $char;
                $current .= $char;
            } elseif ($char === ';') {
                $stmt = trim($current);
                if ($stmt !== '') {
                    $statements[] = $stmt;
                }
                $current = '';
            } else {
                $current .= $char;
            }
        }

        foreach ($statements as $stmt) {
            if (str_starts_with(strtoupper(ltrim($stmt)), '--')) continue;
            if (trim($stmt) === '') continue;
            $pdo->exec($stmt);
        }

        $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
    }

    private function deleteDir(string $dir): void
    {
        if (!is_dir($dir)) return;
        $items = array_diff(scandir($dir), ['.', '..']);
        foreach ($items as $item) {
            $path = $dir . '/' . $item;
            is_dir($path) ? $this->deleteDir($path) : unlink($path);
        }
        rmdir($dir);
    }
}
