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

    $id = $stmt->fetchColumn();

    response(201, [
        'success' => true,
        'message' => 'Tu solicitud fue registrada correctamente.',
        'id' => (int) $id,
    ]);

} catch (Throwable $e) {

    response(500, [
        'success' => false,
        'message' => 'No pudimos registrar tu solicitud. Inténtalo nuevamente.',
    ]);
}