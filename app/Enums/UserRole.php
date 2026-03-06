<?php

namespace App\Enums;

enum UserRole: string
{
    case SUPER_ADMIN = 'SUPER_ADMIN';
    case ADMIN_ARU = 'ADMIN_ARU';
    case PIC = 'PIC';
    case WORKER = 'WORKER';

    public function label(): string
    {
        return match ($this) {
            self::SUPER_ADMIN => 'Super Admin',
            self::ADMIN_ARU => 'ARU',
            self::PIC => 'PIC (Person In Charge)',
            self::WORKER => 'Worker (Karyawan)',
        };
    }

    public function isSuperAdmin(): bool
    {
        return $this === self::SUPER_ADMIN;
    }

    public function isAdminAru(): bool
    {
        return $this === self::ADMIN_ARU;
    }

    public function isAdminOrAbove(): bool
    {
        return $this === self::SUPER_ADMIN || $this === self::ADMIN_ARU;
    }

    public function isPic(): bool
    {
        return $this === self::PIC;
    }

    public function isWorker(): bool
    {
        return $this === self::WORKER;
    }
}
