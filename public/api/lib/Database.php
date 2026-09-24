<?php

declare(strict_types=1);

final class Database
{
    private static ?PDO $connection = null;

    public static function connection(): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        $configPath = dirname($_SERVER['DOCUMENT_ROOT'])
            . '/etm-private/config/database.php';

        if (!is_file($configPath)) {
            throw new RuntimeException(
                'Database configuration not found.'
            );
        }

        $config = require $configPath;

        $dsn = sprintf(
            'pgsql:host=%s;port=%s;dbname=%s;sslmode=%s',
            $config['host'],
            $config['port'],
            $config['dbname'],
            $config['sslmode'] ?? 'prefer'
        );

        self::$connection = new PDO(
            $dsn,
            $config['user'],
            $config['password'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );

        return self::$connection;
    }

    private function __construct()
    {
    }
}