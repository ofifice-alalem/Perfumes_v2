<?php

namespace App\Repositories\Contracts;

interface SettingRepositoryInterface
{
    public function get(string $key, ?string $default = null): ?string;
    public function set(string $key, ?string $value): void;
    public function getAll(): array;
    public function updateReceiptLogo($file): string;
}
