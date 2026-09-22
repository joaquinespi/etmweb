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


if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    response(405, [
        'success' => false,
        'message' => 'Método no permitido.',
    ]);
}


$name = trim((string) ($_POST['name'] ?? ''));
$email = trim((string) ($_POST['email'] ?? ''));
$phone = trim((string) ($_POST['phone'] ?? ''));
$subject = trim((string) ($_POST['subject'] ?? ''));
$message = trim((string) ($_POST['message'] ?? ''));
$location = trim((string) ($_POST['location'] ?? ''));


/*
|--------------------------------------------------------------------------
| Validaciones
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
| PostgreSQL
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
        ':nombre'   => $name,
        ':email'    => $email,
        ':celular'  => $phone,
        ':asunto'   => $subject,
        ':mensaje'  => $message,
        ':sucursal' => $location !== '' ? $location : null,
    ]);

    $id = $stmt->fetchColumn();

    response(201, [
        'success' => true,
        'message' => 'Tu mensaje fue recibido correctamente.',
        'id' => (int) $id,
    ]);

} catch (Throwable $e) {

    /*
     * No devolver $e->getMessage() al navegador.
     * Podría revelar información de PostgreSQL.
     */

    response(500, [
        'success' => false,
        'message' => 'No pudimos registrar tu mensaje. Inténtalo nuevamente.',
    ]);
}