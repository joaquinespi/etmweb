<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/lib/Database.php';


function response(int $status, array $data): never
{
    http_response_code($status);

    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

    exit;
}


function postString(string $key): string
{
    return trim((string) ($_POST[$key] ?? ''));
}


function nullableString(string $key): ?string
{
    $value = postString($key);

    return $value === '' ? null : $value;
}


function validDate(?string $date): bool
{
    if ($date === null || $date === '') {
        return true;
    }

    $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date);

    return $parsed !== false
        && $parsed->format('Y-m-d') === $date;
}

function escapeHtml(string $value): string
{
    return htmlspecialchars(
        $value,
        ENT_QUOTES | ENT_SUBSTITUTE,
        'UTF-8'
    );
}


function displayValue(?string $value): string
{
    if ($value === null || trim($value) === '') {
        return 'No especificado';
    }

    return $value;
}


function documentTypeLabel(?string $type): string
{
    switch ($type) {
        case '1':
            return 'DNI';

        case '2':
            return 'Carné de Extranjería';

        case '3':
            return 'Pasaporte';

        case '4':
            return 'RUC';

        default:
            return 'No especificado';
    }
}


function claimTypeLabel(string $type): string
{
    return $type === '1'
        ? 'Reclamación'
        : 'Queja';
}


function consumptionTypeLabel(string $type): string
{
    return $type === '1'
        ? 'Producto'
        : 'Servicio';
}


function logClaimMailError(
    int $claimId,
    string $recipient,
    string $mailType,
    Throwable $exception
): void {
    $logPath = dirname($_SERVER['DOCUMENT_ROOT'])
        . '/etm-private/logs/mail.log';

    $maskedEmail = preg_replace(
        '/(^.).*(@.*$)/',
        '$1***$2',
        $recipient
    );

    $message = sprintf(
        "[%s] LIBRO #%d | Tipo: %s | Email: %s | Error: %s\n",
        date('Y-m-d H:i:s'),
        $claimId,
        $mailType,
        $maskedEmail ?: '***',
        $exception->getMessage()
    );

    @file_put_contents(
        $logPath,
        $message,
        FILE_APPEND | LOCK_EX
    );
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    response(405, [
        'success' => false,
        'message' => 'Método no permitido.',
    ]);
}


/*
|--------------------------------------------------------------------------
| Datos del consumidor
|--------------------------------------------------------------------------
*/

$firstName      = postString('firstName');
$lastName       = postString('lastName');
$secondLastName = nullableString('secondLastName');

$documentType   = postString('documentType');
$documentNumber = postString('documentNumber');

$phone = postString('phone');
$email = postString('email');

$address   = postString('address');
$reference = nullableString('reference');

$department = postString('department');
$province   = postString('province');
$district   = postString('district');

$minor = postString('minor');


/*
|--------------------------------------------------------------------------
| Padre / Madre / Tutor
|--------------------------------------------------------------------------
*/

$guardianName           = nullableString('guardianName');
$guardianEmail          = nullableString('guardianEmail');
$guardianDocumentType   = nullableString('guardianDocumentType');
$guardianDocumentNumber = nullableString('guardianDocumentNumber');


/*
|--------------------------------------------------------------------------
| Reclamo
|--------------------------------------------------------------------------
*/

$claimType       = postString('claimType');
$consumptionType = postString('consumptionType');

$orderNumber   = nullableString('orderNumber');
$provider      = nullableString('provider');
$claimedAmount = nullableString('claimedAmount');

$claimDate       = postString('claimDate');
$purchaseDate    = nullableString('purchaseDate');
$consumptionDate = nullableString('consumptionDate');
$expirationDate  = nullableString('expirationDate');

$productDescription = postString('productDescription');
$claimDetail        = postString('claimDetail');
$customerRequest    = postString('customerRequest');

$truthDeclaration = isset($_POST['truthDeclaration']);
$privacyConsent   = isset($_POST['privacyConsent']);


/*
|--------------------------------------------------------------------------
| Validaciones
|--------------------------------------------------------------------------
*/

if ($firstName === '' || $lastName === '') {
    response(422, [
        'success' => false,
        'message' => 'Ingresa tu nombre y apellido.',
    ]);
}


if (!in_array($documentType, ['1', '2', '3', '4'], true)) {
    response(422, [
        'success' => false,
        'message' => 'Selecciona un tipo de documento válido.',
    ]);
}


if ($documentNumber === '') {
    response(422, [
        'success' => false,
        'message' => 'Ingresa tu número de documento.',
    ]);
}


if (!preg_match('/^[0-9]{9}$/', $phone)) {
    response(422, [
        'success' => false,
        'message' => 'Ingresa un celular válido de 9 dígitos.',
    ]);
}


if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    response(422, [
        'success' => false,
        'message' => 'Ingresa un correo electrónico válido.',
    ]);
}


if (
    $address === '' ||
    $department === '' ||
    $province === '' ||
    $district === ''
) {
    response(422, [
        'success' => false,
        'message' => 'Completa los datos de ubicación.',
    ]);
}


if (!in_array($minor, ['yes', 'no'], true)) {
    response(422, [
        'success' => false,
        'message' => 'Indica si eres menor de edad.',
    ]);
}


/*
|--------------------------------------------------------------------------
| Validación del tutor
|--------------------------------------------------------------------------
*/

$isMinor = $minor === 'yes';

if ($isMinor) {

    if (
        $guardianName === null ||
        $guardianEmail === null ||
        $guardianDocumentType === null ||
        $guardianDocumentNumber === null
    ) {
        response(422, [
            'success' => false,
            'message' => 'Completa los datos del padre, madre o tutor.',
        ]);
    }

    if (!filter_var($guardianEmail, FILTER_VALIDATE_EMAIL)) {
        response(422, [
            'success' => false,
            'message' => 'El correo electrónico del tutor no es válido.',
        ]);
    }

    if (!in_array(
        $guardianDocumentType,
        ['1', '2', '3', '4'],
        true
    )) {
        response(422, [
            'success' => false,
            'message' => 'Selecciona un tipo de documento válido para el tutor.',
        ]);
    }

} else {

    /*
     * Aunque alguien manipule manualmente el formulario,
     * si indicó que NO es menor no guardamos datos de tutor.
     */

    $guardianName = null;
    $guardianEmail = null;
    $guardianDocumentType = null;
    $guardianDocumentNumber = null;
}


/*
|--------------------------------------------------------------------------
| Validación del reclamo
|--------------------------------------------------------------------------
*/

if (!in_array($claimType, ['1', '2'], true)) {
    response(422, [
        'success' => false,
        'message' => 'Selecciona Reclamación o Queja.',
    ]);
}


if (!in_array($consumptionType, ['1', '2'], true)) {
    response(422, [
        'success' => false,
        'message' => 'Selecciona Producto o Servicio.',
    ]);
}


if (!validDate($claimDate)) {
    response(422, [
        'success' => false,
        'message' => 'La fecha del reclamo no es válida.',
    ]);
}


foreach (
    [
        'Fecha de compra' => $purchaseDate,
        'Fecha de consumo' => $consumptionDate,
        'Fecha de caducidad' => $expirationDate,
    ] as $label => $date
) {
    if (!validDate($date)) {
        response(422, [
            'success' => false,
            'message' => $label . ' no es válida.',
        ]);
    }
}


/*
|--------------------------------------------------------------------------
| Máximo 600 caracteres
|--------------------------------------------------------------------------
*/

$textFields = [
    'Descripción del producto o servicio' => $productDescription,
    'Detalle de la reclamación o queja' => $claimDetail,
    'Pedido del cliente' => $customerRequest,
];

foreach ($textFields as $label => $value) {

    if ($value === '') {
        response(422, [
            'success' => false,
            'message' => $label . ' es obligatorio.',
        ]);
    }

    if (mb_strlen($value, 'UTF-8') > 600) {
        response(422, [
            'success' => false,
            'message' => $label . ' no puede superar los 600 caracteres.',
        ]);
    }
}


/*
|--------------------------------------------------------------------------
| Monto
|--------------------------------------------------------------------------
*/

if (
    $claimedAmount !== null &&
    (
        !is_numeric($claimedAmount) ||
        (float) $claimedAmount < 0
    )
) {
    response(422, [
        'success' => false,
        'message' => 'El monto reclamado no es válido.',
    ]);
}


/*
|--------------------------------------------------------------------------
| Declaraciones
|--------------------------------------------------------------------------
*/

if (!$truthDeclaration || !$privacyConsent) {
    response(422, [
        'success' => false,
        'message' => 'Debes aceptar las declaraciones obligatorias.',
    ]);
}


/*
|--------------------------------------------------------------------------
| PostgreSQL
|--------------------------------------------------------------------------
*/

try {

    $pdo = Database::connection();

    $sql = '
        INSERT INTO public.webetm_libro_reclamaciones
        (
            nombre,
            apellido_paterno,
            apellido_materno,
            tipo_doc,
            nro_documento,
            fono,
            email,
            direccion,
            referencia,
            departamento,
            provincia,
            distrito,

            flag_menor,
            nombre_tutor,
            email_tutor,
            tipo_doc_tutor,
            numero_documento_tutor,

            tipo_reclamacion,
            tipo_consumo,
            nro_pedido,
            fch_reclamo,

            descripcion,
            proveedor,

            fch_compra,
            fch_consumo,
            fch_vencimiento,

            detalle,
            pedido_cliente,
            monto_reclamado,

            acepta_contenido,
            acepta_politica,

            respuesta,
            estado,
            url_adjunto
        )
        VALUES
        (
            :nombre,
            :apellido_paterno,
            :apellido_materno,
            :tipo_doc,
            :nro_documento,
            :fono,
            :email,
            :direccion,
            :referencia,
            :departamento,
            :provincia,
            :distrito,

            :flag_menor,
            :nombre_tutor,
            :email_tutor,
            :tipo_doc_tutor,
            :numero_documento_tutor,

            :tipo_reclamacion,
            :tipo_consumo,
            :nro_pedido,
            :fch_reclamo,

            :descripcion,
            :proveedor,

            :fch_compra,
            :fch_consumo,
            :fch_vencimiento,

            :detalle,
            :pedido_cliente,
            :monto_reclamado,

            :acepta_contenido,
            :acepta_politica,

            NULL,
            :estado,
            NULL
        )
        RETURNING id_libro
    ';

    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ':nombre' => $firstName,
        ':apellido_paterno' => $lastName,
        ':apellido_materno' => $secondLastName,

        ':tipo_doc' => (int) $documentType,
        ':nro_documento' => $documentNumber,

        ':fono' => $phone,
        ':email' => $email,

        ':direccion' => $address,
        ':referencia' => $reference,

        ':departamento' => $department,
        ':provincia' => $province,
        ':distrito' => $district,

        ':flag_menor' => $isMinor ? 1 : 0,

        ':nombre_tutor' => $guardianName,
        ':email_tutor' => $guardianEmail,

        ':tipo_doc_tutor' =>
            $guardianDocumentType !== null
                ? (int) $guardianDocumentType
                : null,

        ':numero_documento_tutor' =>
            $guardianDocumentNumber,

        ':tipo_reclamacion' => (int) $claimType,
        ':tipo_consumo' => (int) $consumptionType,

        ':nro_pedido' => $orderNumber,
        ':fch_reclamo' => $claimDate,

        ':descripcion' => $productDescription,
        ':proveedor' => $provider,

        ':fch_compra' => $purchaseDate,
        ':fch_consumo' => $consumptionDate,
        ':fch_vencimiento' => $expirationDate,

        ':detalle' => $claimDetail,
        ':pedido_cliente' => $customerRequest,

        ':monto_reclamado' => $claimedAmount,

        ':acepta_contenido' => 1,
        ':acepta_politica' => 1,

        ':estado' => 1,
    ]);

    $id = (int) $stmt->fetchColumn();

} catch (Throwable $e) {

    response(500, [
        'success' => false,
        'message' =>
            'No pudimos registrar tu solicitud. Inténtalo nuevamente.',
    ]);
}


/*
|--------------------------------------------------------------------------
| Preparar información para los correos
|--------------------------------------------------------------------------
*/

$fullName = trim(
    $firstName . ' ' .
    $lastName . ' ' .
    ($secondLastName ?? '')
);

$claimLabel = claimTypeLabel($claimType);
$consumptionLabel = consumptionTypeLabel($consumptionType);
$documentLabel = documentTypeLabel($documentType);

$location = implode(
    ' / ',
    [
        $department,
        $province,
        $district,
    ]
);


/*
|--------------------------------------------------------------------------
| Valores HTML seguros
|--------------------------------------------------------------------------
*/

$safeFullName = escapeHtml($fullName);
$safeEmail = escapeHtml($email);
$safePhone = escapeHtml($phone);

$safeDocumentType = escapeHtml($documentLabel);
$safeDocumentNumber = escapeHtml($documentNumber);

$safeAddress = escapeHtml($address);
$safeReference = escapeHtml(displayValue($reference));
$safeLocation = escapeHtml($location);

$safeClaimLabel = escapeHtml($claimLabel);
$safeConsumptionLabel = escapeHtml($consumptionLabel);

$safeOrderNumber = escapeHtml(displayValue($orderNumber));
$safeProvider = escapeHtml(displayValue($provider));

$safeClaimDate = escapeHtml($claimDate);
$safePurchaseDate = escapeHtml(displayValue($purchaseDate));
$safeConsumptionDate = escapeHtml(displayValue($consumptionDate));
$safeExpirationDate = escapeHtml(displayValue($expirationDate));

$safeDescription = nl2br(
    escapeHtml($productDescription)
);

$safeClaimDetail = nl2br(
    escapeHtml($claimDetail)
);

$safeCustomerRequest = nl2br(
    escapeHtml($customerRequest)
);

$safeClaimedAmount = escapeHtml(
    $claimedAmount !== null
        ? 'S/ ' . number_format(
            (float) $claimedAmount,
            2,
            '.',
            ','
        )
        : 'No especificado'
);


/*
|--------------------------------------------------------------------------
| Tutor
|--------------------------------------------------------------------------
*/

$guardianHtml = '';

if ($isMinor) {

    $safeGuardianName = escapeHtml(
        displayValue($guardianName)
    );

    $safeGuardianEmail = escapeHtml(
        displayValue($guardianEmail)
    );

    $safeGuardianDocumentType = escapeHtml(
        documentTypeLabel($guardianDocumentType)
    );

    $safeGuardianDocumentNumber = escapeHtml(
        displayValue($guardianDocumentNumber)
    );

    $guardianHtml = <<<HTML

        <h3>Datos del padre, madre o tutor</h3>

        <p>
            <strong>Nombre:</strong>
            {$safeGuardianName}
        </p>

        <p>
            <strong>Correo:</strong>
            {$safeGuardianEmail}
        </p>

        <p>
            <strong>Documento:</strong>
            {$safeGuardianDocumentType}
            {$safeGuardianDocumentNumber}
        </p>

HTML;
}


/*
|--------------------------------------------------------------------------
| Bloque común con información de la solicitud
|--------------------------------------------------------------------------
*/

$claimInformationHtml = <<<HTML

<h3>Datos del consumidor</h3>

<p>
    <strong>Nombre:</strong>
    {$safeFullName}
</p>

<p>
    <strong>Documento:</strong>
    {$safeDocumentType} {$safeDocumentNumber}
</p>

<p>
    <strong>Correo:</strong>
    {$safeEmail}
</p>

<p>
    <strong>Celular:</strong>
    {$safePhone}
</p>

<p>
    <strong>Dirección:</strong>
    {$safeAddress}
</p>

<p>
    <strong>Referencia:</strong>
    {$safeReference}
</p>

<p>
    <strong>Ubicación:</strong>
    {$safeLocation}
</p>

{$guardianHtml}

<hr>

<h3>Información de la solicitud</h3>

<p>
    <strong>Tipo:</strong>
    {$safeClaimLabel}
</p>

<p>
    <strong>Consumo:</strong>
    {$safeConsumptionLabel}
</p>

<p>
    <strong>N.º de pedido:</strong>
    {$safeOrderNumber}
</p>

<p>
    <strong>Proveedor:</strong>
    {$safeProvider}
</p>

<p>
    <strong>Fecha del reclamo:</strong>
    {$safeClaimDate}
</p>

<p>
    <strong>Fecha de compra:</strong>
    {$safePurchaseDate}
</p>

<p>
    <strong>Fecha de consumo:</strong>
    {$safeConsumptionDate}
</p>

<p>
    <strong>Fecha de vencimiento:</strong>
    {$safeExpirationDate}
</p>

<p>
    <strong>Monto reclamado:</strong>
    {$safeClaimedAmount}
</p>

<h3>Descripción del producto o servicio</h3>

<p>
    {$safeDescription}
</p>

<h3>Detalle de la reclamación o queja</h3>

<p>
    {$safeClaimDetail}
</p>

<h3>Pedido del cliente</h3>

<p>
    {$safeCustomerRequest}
</p>

HTML;


/*
|--------------------------------------------------------------------------
| Correo para el cliente
|--------------------------------------------------------------------------
*/

$clientSubject =
    "Hemos recibido tu {$claimLabel} - ExpansionTec";

$clientHtml = <<<HTML
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>{$clientSubject}</title>
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

    <h1 style="margin-top:0;">
        Solicitud recibida
    </h1>

    <p>
        Hola <strong>{$safeFullName}</strong>,
    </p>

    <p>
        <strong>
            Estamos revisando su SOLICITUD.
        </strong>
    </p>

    <p>
        Hemos registrado correctamente su
        {$safeClaimLabel} en nuestro
        Libro de Reclamaciones.
    </p>

    <p>
        Su número de registro es:
    </p>

    <p
        style="
            font-size:22px;
            font-weight:bold;
        "
    >
        #{$id}
    </p>

    {$claimInformationHtml}

    <hr>

    <p>
        Este correo confirma la recepción de su solicitud.
    </p>

    <p>
        Atentamente,<br>
        <strong>
            ExpansionTec - Libro de Reclamaciones
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
| Texto plano cliente
|--------------------------------------------------------------------------
*/

$clientText = <<<TEXT
Hola {$fullName},

Estamos revisando su SOLICITUD.

Hemos registrado correctamente su {$claimLabel}
en nuestro Libro de Reclamaciones.

Número de registro: #{$id}

Tipo: {$claimLabel}
Consumo: {$consumptionLabel}
Documento: {$documentLabel} {$documentNumber}
Correo: {$email}
Celular: {$phone}
Dirección: {$address}
Ubicación: {$location}

Descripción:
{$productDescription}

Detalle:
{$claimDetail}

Pedido del cliente:
{$customerRequest}

Atentamente,
ExpansionTec - Libro de Reclamaciones
TEXT;


/*
|--------------------------------------------------------------------------
| Correo administrativo
|--------------------------------------------------------------------------
*/

$adminEmail = 'reclamos@expansiontecmye.pe';

$adminSubject =
    "Nueva {$claimLabel} #{$id} - Libro de Reclamaciones";

$adminHtml = <<<HTML
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <title>{$adminSubject}</title>
</head>

<body
    style="
        font-family:Arial, Helvetica, sans-serif;
        color:#222222;
        line-height:1.6;
    "
>

    <h1>
        Nueva solicitud del Libro de Reclamaciones
    </h1>

    <p>
        Se ha registrado una nueva
        <strong>{$safeClaimLabel}</strong>.
    </p>

    <p>
        <strong>N.º de registro:</strong>
        #{$id}
    </p>

    {$claimInformationHtml}

</body>
</html>
HTML;


/*
|--------------------------------------------------------------------------
| Enviar correo al cliente
|--------------------------------------------------------------------------
*/

$clientEmailSent = true;

try {

    $mailer = new Mailer('reclamos');

    $mailer->send(
        $email,
        $fullName,
        $clientSubject,
        $clientHtml,
        $clientText
    );

} catch (Throwable $e) {

    $clientEmailSent = false;

    logClaimMailError(
        $id,
        $email,
        'cliente',
        $e
    );
}


/*
|--------------------------------------------------------------------------
| Enviar correo al administrador
|--------------------------------------------------------------------------
*/

$adminEmailSent = true;

try {

    $mailer = new Mailer('reclamos');

    $mailer->send(
        $adminEmail,
        'Libro de Reclamaciones - ExpansionTec',
        $adminSubject,
        $adminHtml
    );

} catch (Throwable $e) {

    $adminEmailSent = false;

    logClaimMailError(
        $id,
        $adminEmail,
        'administrador',
        $e
    );
}


/*
|--------------------------------------------------------------------------
| Respuesta
|--------------------------------------------------------------------------
*/

response(201, [
    'success' => true,

    'message' =>
        'Tu solicitud fue registrada correctamente.',

    'id' => $id,

    /*
     * Temporales para nuestras pruebas.
     * Después de verificar producción podemos retirarlos.
     */
    'email_cliente_enviado' =>
        $clientEmailSent,

    'email_admin_enviado' =>
        $adminEmailSent,
]);