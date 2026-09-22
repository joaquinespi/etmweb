<?php

declare(strict_types=1);

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

final class Mailer
{
    /** @var array<string, mixed> */
    private $config = [];

    public function __construct(string $account)
    {
        /*
         * Todo lo privado permanece fuera del Document Root.
         *
         * /home/telcomsw/
         * ├── etmweb/
         * └── etm-private/
         *     ├── config/mail.php
         *     └── vendor/autoload.php
         */

        $privateRoot = dirname($_SERVER['DOCUMENT_ROOT'])
            . '/etm-private';

        $autoloadPath = $privateRoot . '/vendor/autoload.php';
        $configPath   = $privateRoot . '/config/mail.php';

        if (!is_file($autoloadPath)) {
            throw new RuntimeException(
                'Composer autoload no encontrado.'
            );
        }

        require_once $autoloadPath;

        if (!is_file($configPath)) {
            throw new RuntimeException(
                'Configuración de correo no encontrada.'
            );
        }

        $config = require $configPath;

        if (
            !is_array($config) ||
            !isset($config[$account]) ||
            !is_array($config[$account])
        ) {
            throw new RuntimeException(
                'Cuenta de correo no configurada.'
            );
        }

        $this->config = $config[$account];

        $required = [
            'host',
            'port',
            'username',
            'password',
            'from_email',
            'from_name',
        ];

        foreach ($required as $key) {
            if (
                !isset($this->config[$key]) ||
                $this->config[$key] === ''
            ) {
                throw new RuntimeException(
                    "Configuración SMTP incompleta: {$key}."
                );
            }
        }
    }


    /**
     * Envía un correo HTML mediante SMTP autenticado.
     */
    public function send(
        string $toEmail,
        string $toName,
        string $subject,
        string $html,
        string $text = ''
    ): void {
        if (!filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException(
                'Dirección de correo destinataria no válida.'
            );
        }

        $mail = new PHPMailer(true);

        try {
            /*
             * SMTP
             */
            $mail->isSMTP();

            $mail->Host = (string) $this->config['host'];

            $mail->SMTPAuth = true;

            $mail->Username =
                (string) $this->config['username'];

            $mail->Password =
                (string) $this->config['password'];

            /*
             * Puerto 465 = TLS implícito / SMTPS.
             */
            $mail->SMTPSecure =
                PHPMailer::ENCRYPTION_SMTPS;

            $mail->Port =
                (int) $this->config['port'];

            /*
             * Codificación
             */
            $mail->CharSet = 'UTF-8';
            $mail->Encoding = 'base64';

            /*
             * Remitente
             */
            $mail->setFrom(
                (string) $this->config['from_email'],
                (string) $this->config['from_name']
            );

            /*
             * Destinatario
             */
            $mail->addAddress(
                $toEmail,
                $toName
            );

            /*
             * Contenido
             */
            $mail->isHTML(true);

            $mail->Subject = $subject;
            $mail->Body = $html;

            $mail->AltBody =
                $text !== ''
                    ? $text
                    : $this->htmlToText($html);

            /*
             * No habilitar SMTPDebug en producción.
             */
            $mail->SMTPDebug = 0;

            $mail->send();

        } catch (Exception $e) {
            /*
             * No exponemos credenciales ni información SMTP
             * al navegador.
             */
            throw new RuntimeException(
                'No se pudo enviar el correo electrónico.',
                0,
                $e
            );
        }
    }


    /**
     * Conversión básica de HTML a texto plano para AltBody.
     */
    private function htmlToText(string $html): string
    {
        $html = preg_replace(
            '/<br\s*\/?>/i',
            "\n",
            $html
        ) ?? $html;

        $html = preg_replace(
            '/<\/p>/i',
            "\n\n",
            $html
        ) ?? $html;

        return trim(
            html_entity_decode(
                strip_tags($html),
                ENT_QUOTES | ENT_HTML5,
                'UTF-8'
            )
        );
    }


    private function __clone()
    {
    }
}