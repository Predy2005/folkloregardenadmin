<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\StaffMember;
use App\Entity\TransportDriver;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;

/**
 * Edit profilu z mobilní aplikace — `PATCH /api/mobile/me`
 * + upload/delete profilové fotky `POST/DELETE /api/mobile/me/photo`.
 *
 * Logika je sjednocená přes `User → StaffMember | TransportDriver`. User
 * smí měnit firstName, lastName, phone, email své navázané entity. Email
 * nemění username (= login identifier) — pokud se email změní, pro login
 * pořád platí původní username. Pro změnu loginu je nutný admin reset.
 *
 * Foto storage: `api/public/uploads/{kind}_photos/<filename>`.
 *   - `kind` = staff | driver
 *   - filename = `{kind}_{id}_{timestamp}.{ext}` (ext z mime type)
 *   - public URL = `/uploads/{kind}_photos/<filename>` (build je v MobileAuthService)
 */
class MobileProfileService
{
    private const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
    private const MAX_BYTES = 5_242_880; // 5 MB

    public function __construct(
        private readonly EntityManagerInterface $em,
        /** Absolutní cesta k `api/public/` — upload root je `<this>/uploads/`. */
        private readonly string $publicDir,
    ) {
    }

    /**
     * Aktualizuje pole na navázaném StaffMember nebo TransportDriver.
     * Akceptuje subset polí — neexistující v body se nezmění.
     *
     * @param array<string, mixed> $data
     */
    public function updateProfile(User $user, array $data): void
    {
        $entity = $user->getStaffMember() ?? $user->getTransportDriver();
        if ($entity === null) {
            throw new \DomainException(
                'Účet nemá navázaný profil personálu/řidiče. Kontaktuj administrátora.'
            );
        }

        if (array_key_exists('firstName', $data)) {
            $first = trim((string) $data['firstName']);
            if ($first === '') {
                throw new \InvalidArgumentException('Jméno nesmí být prázdné.');
            }
            $entity->setFirstName($first);
        }

        if (array_key_exists('lastName', $data)) {
            $last = trim((string) $data['lastName']);
            if ($last === '') {
                throw new \InvalidArgumentException('Příjmení nesmí být prázdné.');
            }
            $entity->setLastName($last);
        }

        if (array_key_exists('phone', $data)) {
            $phone = $data['phone'] === null ? null : trim((string) $data['phone']);
            $entity->setPhone($phone === '' ? null : $phone);
        }

        if (array_key_exists('email', $data)) {
            $email = $data['email'] === null ? null : trim((string) $data['email']);
            if ($email !== null && $email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw new \InvalidArgumentException('Neplatný formát e-mailu.');
            }
            $entity->setEmail($email === '' ? null : $email);
        }

        $this->em->flush();
    }

    /**
     * Uloží uploaded fotku do public/uploads/{kind}_photos/ a updatuje
     * `photo_path` v entitě. Stará fotka (pokud existovala) se smaže.
     */
    public function uploadPhoto(User $user, UploadedFile $file): void
    {
        $entity = $user->getStaffMember() ?? $user->getTransportDriver();
        if ($entity === null) {
            throw new \DomainException(
                'Účet nemá navázaný profil personálu/řidiče. Kontaktuj administrátora.'
            );
        }

        $size = $file->getSize();
        if ($size === false || $size <= 0) {
            throw new \InvalidArgumentException('Soubor se nepodařilo přečíst.');
        }
        if ($size > self::MAX_BYTES) {
            throw new \InvalidArgumentException('Fotka může mít maximálně 5 MB.');
        }

        $mime = $file->getMimeType();
        if (!in_array($mime, self::ALLOWED_MIMES, true)) {
            throw new \InvalidArgumentException(
                'Povolené formáty: ' . implode(', ', self::ALLOWED_MIMES)
            );
        }

        $kind = $entity instanceof StaffMember ? 'staff' : 'driver';
        $ext = match ($mime) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
        };
        $filename = sprintf('%s_%d_%d.%s', $kind, $entity->getId(), time(), $ext);
        $targetDir = $this->resolveTargetDir($kind);
        if (!is_dir($targetDir) && !mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
            throw new \DomainException('Nepodařilo se vytvořit složku pro fotky.');
        }

        // Smazat starou fotku (pokud byla).
        $oldPath = $entity->getPhotoPath();
        if ($oldPath !== null && $oldPath !== '') {
            $oldAbs = $targetDir . DIRECTORY_SEPARATOR . $oldPath;
            if (is_file($oldAbs)) {
                @unlink($oldAbs);
            }
        }

        $file->move($targetDir, $filename);
        $entity->setPhotoPath($filename);

        $this->em->flush();
    }

    public function deletePhoto(User $user): void
    {
        $entity = $user->getStaffMember() ?? $user->getTransportDriver();
        if ($entity === null) return;

        $oldPath = $entity->getPhotoPath();
        if ($oldPath !== null && $oldPath !== '') {
            $kind = $entity instanceof StaffMember ? 'staff' : 'driver';
            $oldAbs = $this->resolveTargetDir($kind) . DIRECTORY_SEPARATOR . $oldPath;
            if (is_file($oldAbs)) {
                @unlink($oldAbs);
            }
        }

        $entity->setPhotoPath(null);
        $this->em->flush();
    }

    private function resolveTargetDir(string $kind): string
    {
        return rtrim($this->publicDir, DIRECTORY_SEPARATOR)
            . DIRECTORY_SEPARATOR
            . 'uploads'
            . DIRECTORY_SEPARATOR
            . $kind . '_photos';
    }
}
