<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/lib/Database.php';
require_once __DIR__ . '/lib/Mailer.php';


function response(int $status, array $data): never
{
    http_response_code($status);

    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );

    exit;
}


function escapeHtml(string $value): string
{
    return htmlspecialchars(
        $value,
        ENT_QUOTES | ENT_SUBSTITUTE,
        'UTF-8'
    );
}


function logMailError(
    int $contactId,
    string $email,
    Throwable $exception
): void {
    $logPath = dirname($_SERVER['DOCUMENT_ROOT'])
        . '/etm-private/logs/mail.log';

    $maskedEmail = preg_replace(
        '/(^.).*(@.*$)/',
        '$1***$2',
        $email
    );

    $message = sprintf(
        "[%s] CONTACTO #%d | Email: %s | Error: %s\n",
        date('Y-m-d H:i:s'),
        $contactId,
        $maskedEmail ?: '***',
        $exception->getMessage()
    );

    @file_put_contents(
        $logPath,
        $message,
        FILE_APPEND | LOCK_EX
    );
}


/*
|--------------------------------------------------------------------------
| MÉTODO
|--------------------------------------------------------------------------
*/

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    response(405, [
        'success' => false,
        'message' => 'Método no permitido.',
    ]);
}


/*
|--------------------------------------------------------------------------
| DATOS
|--------------------------------------------------------------------------
*/

$name = trim((string) ($_POST['name'] ?? ''));
$email = trim((string) ($_POST['email'] ?? ''));
$phone = trim((string) ($_POST['phone'] ?? ''));
$subject = trim((string) ($_POST['subject'] ?? ''));
$message = trim((string) ($_POST['message'] ?? ''));
$location = trim((string) ($_POST['location'] ?? ''));


/*
|--------------------------------------------------------------------------
| VALIDACIONES
|--------------------------------------------------------------------------
*/

if ($name === '') {
    response(422, [
        'success' => false,
        'message' => 'Ingresa tu nombre.',
    ]);
}


if (
    $email === '' ||
    !filter_var($email, FILTER_VALIDATE_EMAIL)
) {
    response(422, [
        'success' => false,
        'message' => 'Ingresa un correo electrónico válido.',
    ]);
}


if (!preg_match('/^[0-9]{9}$/', $phone)) {
    response(422, [
        'success' => false,
        'message' => 'Ingresa un número de celular válido de 9 dígitos.',
    ]);
}


$allowedSubjects = [
    'Quiero Comprar Celular',
    'Quiero Cambiar a Claro',
    'Quiero Catalogo de Equipos',
];


if (!in_array($subject, $allowedSubjects, true)) {
    response(422, [
        'success' => false,
        'message' => 'Selecciona un asunto válido.',
    ]);
}


if ($message === '') {
    response(422, [
        'success' => false,
        'message' => 'Ingresa tu mensaje.',
    ]);
}


if (mb_strlen($message, 'UTF-8') > 600) {
    response(422, [
        'success' => false,
        'message' => 'El mensaje no puede superar los 600 caracteres.',
    ]);
}


$allowedLocations = [
    '',
    'PDV Chosica',
    'PDV Cieneguilla',
    'PDV Lurin',
];


if (!in_array($location, $allowedLocations, true)) {
    response(422, [
        'success' => false,
        'message' => 'Selecciona una sucursal válida.',
    ]);
}


/*
|--------------------------------------------------------------------------
| GUARDAR EN POSTGRESQL
|--------------------------------------------------------------------------
*/

try {

    $pdo = Database::connection();

    $sql = '
        INSERT INTO public.webetm_contacto
        (
            nombre_completo,
            email,
            celular,
            asunto,
            mensaje,
            sucursal
        )
        VALUES
        (
            :nombre,
            :email,
            :celular,
            :asunto,
            :mensaje,
            :sucursal
        )
        RETURNING id_contacto
    ';


    $stmt = $pdo->prepare($sql);


    $stmt->execute([
        ':nombre' => $name,
        ':email' => $email,
        ':celular' => $phone,
        ':asunto' => $subject,
        ':mensaje' => $message,
        ':sucursal' =>
            $location !== ''
                ? $location
                : null,
    ]);


    $id = (int) $stmt->fetchColumn();


} catch (Throwable $e) {

    /*
     * No mostramos errores internos de PostgreSQL
     * al navegador.
     */

    response(500, [
        'success' => false,
        'message' =>
            'No pudimos registrar tu mensaje. Inténtalo nuevamente.',
    ]);
}


/*
|--------------------------------------------------------------------------
| PREPARAR CORREO
|--------------------------------------------------------------------------
*/

$safeName = escapeHtml($name);
$safeEmail = escapeHtml($email);
$safePhone = escapeHtml($phone);
$safeSubject = escapeHtml($subject);
$safeMessage = nl2br(escapeHtml($message));

$safeLocation = escapeHtml(
    $location !== ''
        ? $location
        : 'No especificada'
);


$emailSubject =
    'Hemos recibido tu mensaje - ExpansionTec';


$htmlBody = <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >
    <title>{$emailSubject}</title>
</head>

<body
    style="
        margin:0;
        padding:0;
        background:#f4f4f4;
        font-family:Arial, Helvetica, sans-serif;
        color:#222222;
    "
>

<table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
    style="background:#f4f4f4;padding:30px 15px;"
>
<tr>
<td align="center">

<table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
    style="
        max-width:650px;
        background:#ffffff;
        border-radius:8px;
        overflow:hidden;
    "
>

<tr>
<td
    style="
        padding:32px;
        font-size:15px;
        line-height:1.6;
    "
>

    <h1
        style="
            margin:0 0 20px;
            font-size:24px;
            color:#111111;
        "
    >
        Hemos recibido tu mensaje
    </h1>

    <p>
        Hola <strong>{$safeName}</strong>,
    </p>

    <p>
        <strong>Estamos revisando su MENSAJE.</strong>
        Nuestro equipo ha recibido correctamente
        la información enviada a través de nuestro
        formulario de contacto.
    </p>

    <p>
        A continuación encontrarás un resumen
        de la información registrada:
    </p>

    <table
        role="presentation"
        width="100%"
        cellspacing="0"
        cellpadding="10"
        border="0"
        style="
            margin:25px 0;
            border-collapse:collapse;
            background:#f8f8f8;
        "
    >

        <tr>
            <td><strong>N.º de registro</strong></td>
            <td>#{$id}</td>
        </tr>

        <tr>
            <td><strong>Nombre</strong></td>
            <td>{$safeName}</td>
        </tr>

        <tr>
            <td><strong>Correo</strong></td>
            <td>{$safeEmail}</td>
        </tr>

        <tr>
            <td><strong>Celular</strong></td>
            <td>{$safePhone}</td>
        </tr>

        <tr>
            <td><strong>Asunto</strong></td>
            <td>{$safeSubject}</td>
        </tr>

        <tr>
            <td><strong>Sucursal</strong></td>
            <td>{$safeLocation}</td>
        </tr>

        <tr>
            <td
                colspan="2"
                style="padding-top:20px;"
            >
                <strong>Mensaje</strong>
                <br><br>
                {$safeMessage}
            </td>
        </tr>

    </table>

    <p>
        Gracias por comunicarte con ExpansionTec.
    </p>

    <p style="margin-bottom:0;">
        Atentamente,<br>
        <strong>Equipo ExpansionTec</strong>
    </p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
HTML;


/*
|--------------------------------------------------------------------------
| VERSIÓN TEXTO PLANO
|--------------------------------------------------------------------------
*/

$textBody = <<<TEXT
Hola {$name},

Estamos revisando su MENSAJE.

Hemos recibido correctamente la información enviada
a través de nuestro formulario de contacto.

N.º de registro: #{$id}
Nombre: {$name}
Correo: {$email}
Celular: {$phone}
Asunto: {$subject}
Sucursal: {$location}

Mensaje:
{$message}

Gracias por comunicarte con ExpansionTec.

Atentamente,
Equipo ExpansionTec
TEXT;


/*
|--------------------------------------------------------------------------
| ENVIAR CORREO
|--------------------------------------------------------------------------
*/

$emailSent = true;


try {

    $mailer = new Mailer('contacto');

    $mailer->send(
        $email,
        $name,
        $emailSubject,
        $htmlBody,
        $textBody
    );


} catch (Throwable $e) {

    /*
     * MUY IMPORTANTE:
     *
     * El registro YA fue guardado en PostgreSQL.
     *
     * Por eso no devolvemos HTTP 500.
     * Si devolviéramos error, el usuario podría
     * volver a enviar el formulario y generar
     * registros duplicados.
     */

    $emailSent = false;

    logMailError(
        $id,
        $email,
        $e
    );
}


/*
|--------------------------------------------------------------------------
| RESPUESTA
|--------------------------------------------------------------------------
*/

response(201, [
    'success' => true,
    'message' =>
        'Tu mensaje fue recibido correctamente.',
    'id' => $id,
    'email_sent' => $emailSent,
]);