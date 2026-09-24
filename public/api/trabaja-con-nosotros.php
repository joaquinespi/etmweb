<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/lib/Database.php';
require_once __DIR__ . '/lib/Mailer.php';


/*
|--------------------------------------------------------------------------
| Respuesta JSON
|--------------------------------------------------------------------------
*/

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


/*
|--------------------------------------------------------------------------
| Utilidades
|--------------------------------------------------------------------------
*/

function postString(string $key): string
{
    return trim((string) ($_POST[$key] ?? ''));
}


function escapeHtml(string $value): string
{
    return htmlspecialchars(
        $value,
        ENT_QUOTES | ENT_SUBSTITUTE,
        'UTF-8'
    );
}


function logRecruitmentMailError(
    int $applicationId,
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

    $errorMessage = $exception->getMessage();

    $previous = $exception->getPrevious();

    if ($previous !== null) {
        $errorMessage .=
            ' | Causa: ' . $previous->getMessage();
    }

    $message = sprintf(
        "[%s] POSTULANTE #%d | Email: %s | Error: %s\n",
        date('Y-m-d H:i:s'),
        $applicationId,
        $maskedEmail ?: '***',
        $errorMessage
    );

    @file_put_contents(
        $logPath,
        $message,
        FILE_APPEND | LOCK_EX
    );
}


/*
|--------------------------------------------------------------------------
| Método HTTP
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
| Datos
|--------------------------------------------------------------------------
*/

$fullName = postString('fullName');
$phone = postString('phone');
$email = postString('email');
$location = postString('location');

$privacyConsent = isset($_POST['privacy']);


/*
|--------------------------------------------------------------------------
| Validaciones
|--------------------------------------------------------------------------
*/

if ($fullName === '') {
    response(422, [
        'success' => false,
        'message' =>
            'Ingresa tus nombres y apellidos.',
    ]);
}


if (!preg_match('/^[0-9]{9}$/', $phone)) {
    response(422, [
        'success' => false,
        'message' =>
            'Ingresa un número de celular válido de 9 dígitos.',
    ]);
}


if (
    $email === '' ||
    !filter_var($email, FILTER_VALIDATE_EMAIL)
) {
    response(422, [
        'success' => false,
        'message' =>
            'Ingresa un correo electrónico válido.',
    ]);
}


$allowedLocations = [
    'PDV Chosica',
    'PDV Cieneguilla',
    'PDV Lurin',
];

if (!in_array($location, $allowedLocations, true)) {
    response(422, [
        'success' => false,
        'message' =>
            'Selecciona una sucursal válida.',
    ]);
}


if (!$privacyConsent) {
    response(422, [
        'success' => false,
        'message' =>
            'Debes autorizar el tratamiento de tus datos personales.',
    ]);
}


/*
|--------------------------------------------------------------------------
| Validación del CV
|--------------------------------------------------------------------------
*/

if (
    !isset($_FILES['cv']) ||
    !is_array($_FILES['cv'])
) {
    response(422, [
        'success' => false,
        'message' =>
            'Adjunta tu currículum vitae.',
    ]);
}

$cv = $_FILES['cv'];

if (
    !isset(
        $cv['error'],
        $cv['size'],
        $cv['tmp_name']
    )
) {
    response(422, [
        'success' => false,
        'message' =>
            'No pudimos procesar el archivo adjunto.',
    ]);
}


if ((int) $cv['error'] !== UPLOAD_ERR_OK) {

    if (
        (int) $cv['error'] === UPLOAD_ERR_INI_SIZE ||
        (int) $cv['error'] === UPLOAD_ERR_FORM_SIZE
    ) {
        response(422, [
            'success' => false,
            'message' =>
                'El CV supera el tamaño permitido.',
        ]);
    }

    response(422, [
        'success' => false,
        'message' =>
            'Ocurrió un problema al cargar el CV.',
    ]);
}


/*
|--------------------------------------------------------------------------
| Máximo 2 MB
|--------------------------------------------------------------------------
*/

$maxFileSize = 2 * 1024 * 1024;

if (
    (int) $cv['size'] <= 0 ||
    (int) $cv['size'] > $maxFileSize
) {
    response(422, [
        'success' => false,
        'message' =>
            'El CV debe tener un tamaño máximo de 2 MB.',
    ]);
}


$tmpFile = (string) $cv['tmp_name'];

if (
    $tmpFile === '' ||
    !is_uploaded_file($tmpFile)
) {
    response(422, [
        'success' => false,
        'message' =>
            'El archivo recibido no es válido.',
    ]);
}


/*
|--------------------------------------------------------------------------
| Validar MIME real
|--------------------------------------------------------------------------
*/

$finfo = new finfo(FILEINFO_MIME_TYPE);

$mimeType = $finfo->file($tmpFile);

$allowedMimeTypes = [
    'application/pdf' => 'pdf',

    'application/msword' => 'doc',

    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        => 'docx',
];

if (
    $mimeType === false ||
    !isset($allowedMimeTypes[$mimeType])
) {
    response(422, [
        'success' => false,
        'message' =>
            'Formato no permitido. Adjunta un archivo PDF o Word.',
    ]);
}

$extension = $allowedMimeTypes[$mimeType];


/*
|--------------------------------------------------------------------------
| Directorio privado
|--------------------------------------------------------------------------
*/

$privateRoot =
    dirname($_SERVER['DOCUMENT_ROOT'])
    . '/etm-private';

$uploadDirectory =
    $privateRoot . '/uploads/cv';

if (
    !is_dir($uploadDirectory) &&
    !mkdir(
        $uploadDirectory,
        0750,
        true
    ) &&
    !is_dir($uploadDirectory)
) {
    response(500, [
        'success' => false,
        'message' =>
            'No pudimos preparar el almacenamiento del CV.',
    ]);
}


if (!is_writable($uploadDirectory)) {
    response(500, [
        'success' => false,
        'message' =>
            'El almacenamiento de CV no está disponible.',
    ]);
}


/*
|--------------------------------------------------------------------------
| Nombre seguro
|--------------------------------------------------------------------------
*/

try {

    $randomName =
        bin2hex(random_bytes(16));

} catch (Throwable $e) {

    response(500, [
        'success' => false,
        'message' =>
            'No pudimos procesar tu postulación.',
    ]);
}

$fileName =
    $randomName . '.' . $extension;

$destination =
    $uploadDirectory . '/' . $fileName;


/*
|--------------------------------------------------------------------------
| Guardar CV
|--------------------------------------------------------------------------
*/

if (
    !move_uploaded_file(
        $tmpFile,
        $destination
    )
) {
    response(500, [
        'success' => false,
        'message' =>
            'No pudimos guardar tu currículum vitae.',
    ]);
}

/*
 * El archivo queda fuera del Document Root.
 *
 * Guardamos una referencia privada en PostgreSQL,
 * no una URL pública.
 */
$cvReference =
    'uploads/cv/' . $fileName;


/*
|--------------------------------------------------------------------------
| PostgreSQL
|--------------------------------------------------------------------------
*/

try {

    $pdo = Database::connection();

    $sql = '
        INSERT INTO public.webetm_postulante
        (
            nombre_completo,
            celular,
            email,
            sucursal,
            cv_postulante,
            flg_autorizo
        )
        VALUES
        (
            :nombre_completo,
            :celular,
            :email,
            :sucursal,
            :cv_postulante,
            :flg_autorizo
        )
        RETURNING id_postulante
    ';

    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ':nombre_completo' => $fullName,
        ':celular' => $phone,
        ':email' => $email,
        ':sucursal' => $location,
        ':cv_postulante' => $cvReference,
        ':flg_autorizo' => 1,
    ]);

    $id = (int) $stmt->fetchColumn();

} catch (Throwable $e) {

    /*
     * PostgreSQL falló.
     * Eliminamos el CV para evitar archivos huérfanos.
     */
    if (is_file($destination)) {
        @unlink($destination);
    }

    response(500, [
        'success' => false,
        'message' =>
            'No pudimos registrar tu postulación. Inténtalo nuevamente.',
    ]);
}


/*
|--------------------------------------------------------------------------
| Preparar correo
|--------------------------------------------------------------------------
*/

$safeName = escapeHtml($fullName);
$safeEmail = escapeHtml($email);
$safePhone = escapeHtml($phone);
$safeLocation = escapeHtml($location);

$emailSubject =
    'Hemos recibido tu postulación - ExpansionTec';


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
    style="
        background:#f4f4f4;
        padding:30px 15px;
    "
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
        "
    >
        Postulación recibida
    </h1>

    <p>
        Hola <strong>{$safeName}</strong>,
    </p>

    <p>
        <strong>
            Estamos revisando su POSTULACION.
        </strong>
    </p>

    <p>
        Hemos recibido correctamente tus datos
        y tu currículum vitae.
    </p>

    <p>
        Tu número de postulación es:
    </p>

    <p
        style="
            font-size:22px;
            font-weight:bold;
        "
    >
        #{$id}
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
            <td>
                <strong>Nombre</strong>
            </td>

            <td>
                {$safeName}
            </td>
        </tr>

        <tr>
            <td>
                <strong>Correo</strong>
            </td>

            <td>
                {$safeEmail}
            </td>
        </tr>

        <tr>
            <td>
                <strong>Celular</strong>
            </td>

            <td>
                {$safePhone}
            </td>
        </tr>

        <tr>
            <td>
                <strong>Sucursal</strong>
            </td>

            <td>
                {$safeLocation}
            </td>
        </tr>

        <tr>
            <td>
                <strong>CV</strong>
            </td>

            <td>
                Recibido correctamente
            </td>
        </tr>

    </table>

    <p>
        Nuestro equipo evaluará la información
        proporcionada para las oportunidades
        disponibles.
    </p>

    <p style="margin-bottom:0;">
        Atentamente,<br>

        <strong>
            ExpansionTec - Reclutamiento
        </strong>
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
| Texto plano
|--------------------------------------------------------------------------
*/

$textBody = <<<TEXT
Hola {$fullName},

Estamos revisando su POSTULACION.

Hemos recibido correctamente tus datos
y tu currículum vitae.

Número de postulación: #{$id}

Nombre: {$fullName}
Correo: {$email}
Celular: {$phone}
Sucursal: {$location}
CV: Recibido correctamente

Nuestro equipo evaluará la información proporcionada
para las oportunidades disponibles.

Atentamente,
ExpansionTec - Reclutamiento
TEXT;


/*
|--------------------------------------------------------------------------
| Enviar correo
|--------------------------------------------------------------------------
*/

$emailSent = true;

try {

    $mailer =
        new Mailer('reclutamiento');

    $mailer->send(
        $email,
        $fullName,
        $emailSubject,
        $htmlBody,
        $textBody
    );

} catch (Throwable $e) {

    $emailSent = false;

    logRecruitmentMailError(
        $id,
        $email,
        $e
    );
}


/*
|--------------------------------------------------------------------------
| Respuesta final
|--------------------------------------------------------------------------
*/

response(201, [
    'success' => true,

    'message' =>
        'Tu postulación fue enviada correctamente.',

    'id' => $id,

    /*
     * Temporal mientras hacemos pruebas.
     */
    'email_enviado' => $emailSent,
]);