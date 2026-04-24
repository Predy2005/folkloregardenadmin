<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\StaffMember;
use App\Entity\TransportDriver;
use App\Entity\User;
use App\Entity\UserRole;
use App\Repository\RefreshTokenRepository;
use App\Repository\RoleRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Orchestruje životní cyklus mobilního účtu pro personál a řidiče:
 * vytvoření User, nastavení/resetování hesla a PIN, přiřazení mobilní role,
 * propojení se StaffMember/TransportDriver a revokace.
 *
 * Jeden User je vždy svázaný nejvýše s JEDNÍM staff_member NEBO transport_driver
 * — exkluzivita je zajištěna při provisioning (metoda provisionFor*
 * vytváří nového Usera, nezná sdílení). Při revoke je User smazán.
 */
class MobileAccountProvisioningService
{
    public const ROLE_WAITER = 'STAFF_WAITER';
    public const ROLE_COOK = 'STAFF_COOK';
    public const ROLE_DRIVER = 'STAFF_DRIVER';

    public const STAFF_ROLES = [self::ROLE_WAITER, self::ROLE_COOK];
    public const DRIVER_ROLES = [self::ROLE_DRIVER];
    public const ALL_MOBILE_ROLES = [self::ROLE_WAITER, self::ROLE_COOK, self::ROLE_DRIVER];

    /**
     * Mapa StaffMember.position (pracovní pozice) → mobilní role.
     * Kuchařské pozice vidí v mobilce menu+porce, šofér vidí transporty,
     * všichni ostatní vidí sál: stoly, rozsazení, hosty.
     */
    public const POSITION_TO_ROLE = [
        // Kuchyně
        'HEAD_CHEF'     => self::ROLE_COOK,
        'CHEF'          => self::ROLE_COOK,
        'SOUS_CHEF'     => self::ROLE_COOK,
        'PREP_COOK'     => self::ROLE_COOK,
        // Řidič
        'DRIVER'        => self::ROLE_DRIVER,
        // Sál / služba / správa / performeři — všichni vidí stejné věci: seznam eventů + stoly
        'MANAGER'       => self::ROLE_WAITER,
        'COORDINATOR'   => self::ROLE_WAITER,
        'HEAD_WAITER'   => self::ROLE_WAITER,
        'WAITER'        => self::ROLE_WAITER,
        'BARTENDER'     => self::ROLE_WAITER,
        'HOSTESS'       => self::ROLE_WAITER,
        'MUSICIAN'      => self::ROLE_WAITER,
        'DANCER'        => self::ROLE_WAITER,
        'SOUND_TECH'    => self::ROLE_WAITER,
        'PHOTOGRAPHER'  => self::ROLE_WAITER,
        'SECURITY'      => self::ROLE_WAITER,
        'CLEANER'       => self::ROLE_WAITER,
    ];

    /**
     * Derivuje mobilní roli ze pracovní pozice. Vrací null pokud je pozice
     * prázdná nebo neznámá — volající pak vrátí 400 s výzvou „nastav pozici".
     */
    public static function deriveMobileRoleFromPosition(?string $position): ?string
    {
        if ($position === null || trim($position) === '') {
            return null;
        }
        return self::POSITION_TO_ROLE[strtoupper(trim($position))] ?? null;
    }

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $hasher,
        private readonly UserRepository $userRepo,
        private readonly RoleRepository $roleRepo,
        private readonly RefreshTokenRepository $refreshRepo,
    ) {
    }

    /**
     * Založí mobilní účet pro staff_member.
     *
     * Mobilní role (STAFF_WAITER / STAFF_COOK / STAFF_DRIVER) se odvozuje
     * AUTOMATICKY z `staff.position` přes POSITION_TO_ROLE mapu — admin ji
     * už nevolí ručně. Pokud je pozice prázdná nebo neznámá, vyhodí se 400.
     *
     * @return array{user: User, plainPassword: ?string, role: string}
     *         plainPassword je vrácen jen při generování — admin ho musí
     *         okamžitě předat personálu, uložen už nikde není.
     */
    public function provisionForStaffMember(
        StaffMember $staff,
        bool $generatePassword = true,
        ?string $pin = null,
        ?string $pinDeviceId = null,
    ): array {
        if ($staff->getUser() !== null) {
            throw new \DomainException('Staff member už má přiřazený mobilní účet.');
        }

        if (!$staff->getEmail()) {
            throw new \DomainException('Staff member musí mít vyplněný e-mail pro mobilní přihlášení.');
        }

        $derivedRole = self::deriveMobileRoleFromPosition($staff->getPosition());
        if ($derivedRole === null) {
            throw new \DomainException(sprintf(
                'Mobilní roli nelze odvodit: pozice "%s" není namapovaná. Nejdřív vyplň validní pozici na profilu personálu (např. WAITER, CHEF, DRIVER).',
                $staff->getPosition() ?? '(nenastavena)'
            ));
        }

        $this->ensureEmailFree($staff->getEmail());

        [$user, $plainPassword] = $this->createUser($staff->getEmail(), $generatePassword);
        if ($pin !== null && $pin !== '') {
            $this->applyPin($user, $pin, $pinDeviceId);
        }

        $staff->setUser($user);
        $this->assignRole($user, $derivedRole);

        $this->em->flush();

        return ['user' => $user, 'plainPassword' => $plainPassword, 'role' => $derivedRole];
    }

    /**
     * Založí mobilní účet pro řidiče. Role je vždy STAFF_DRIVER.
     *
     * @return array{user: User, plainPassword: ?string, role: string}
     */
    public function provisionForTransportDriver(
        TransportDriver $driver,
        bool $generatePassword = true,
        ?string $pin = null,
        ?string $pinDeviceId = null,
    ): array {
        if ($driver->getUser() !== null) {
            throw new \DomainException('Řidič už má přiřazený mobilní účet.');
        }

        if (!$driver->getEmail()) {
            throw new \DomainException('Řidič musí mít vyplněný e-mail pro mobilní přihlášení.');
        }

        $this->ensureEmailFree($driver->getEmail());

        [$user, $plainPassword] = $this->createUser($driver->getEmail(), $generatePassword);
        if ($pin !== null && $pin !== '') {
            $this->applyPin($user, $pin, $pinDeviceId);
        }

        $driver->setUser($user);
        $this->assignRole($user, self::ROLE_DRIVER);

        $this->em->flush();

        return ['user' => $user, 'plainPassword' => $plainPassword, 'role' => self::ROLE_DRIVER];
    }

    /**
     * Vygeneruje nové heslo, nahradí hash v DB, zneplatní všechny aktivní
     * refresh tokeny (mobilka bude muset znovu přihlásit) a vrátí plaintext.
     */
    public function resetPassword(User $user): string
    {
        $plain = $this->generatePassword();
        $user->setPassword($this->hasher->hashPassword($user, $plain));
        $this->refreshRepo->revokeAllForUser($user);
        $this->em->flush();
        return $plain;
    }

    /**
     * Nastaví nebo změní PIN pro mobilní login. `deviceId` je volitelný —
     * pokud je uveden, PIN login bude povolen jen z tohoto zařízení.
     */
    public function setPin(User $user, string $pin, ?string $deviceId = null): void
    {
        $this->applyPin($user, $pin, $deviceId);
        $this->em->flush();
    }

    public function disablePin(User $user): void
    {
        $user->setMobilePin(null);
        $user->setPinDeviceId(null);
        $user->setPinEnabled(false);
        $this->refreshRepo->revokeAllForUser($user);
        $this->em->flush();
    }

    /**
     * Zruší mobilní účet — odpojí staff/driver, smaže všechny mobilní role
     * a nakonec User samotný. Nerušit účty s NE-mobilními rolemi tímto
     * způsobem (jedná se o sanity guard).
     */
    public function revoke(User $user): void
    {
        foreach ($user->getAssignedRoleNames() as $name) {
            if (!in_array($name, self::ALL_MOBILE_ROLES, true)) {
                throw new \DomainException(
                    sprintf('Uživatel má ne-mobilní roli "%s"; revokace přes mobile-account by smazala plnohodnotný admin účet.', $name)
                );
            }
        }

        if ($staff = $user->getStaffMember()) {
            $staff->setUser(null);
        }
        if ($driver = $user->getTransportDriver()) {
            $driver->setUser(null);
        }

        $this->em->remove($user);
        $this->em->flush();
    }

    /**
     * Vrátí stav mobilního účtu — pro UI kartu.
     *
     * @param ?User $user User svázaný se staff/driverem (nebo null pokud nemá)
     * @param ?string $expectedRole Role, kterou *má* aktuálně odpovídat podle
     *     pozice. Když neodpovídá reálně přiřazené (po změně pozice), UI
     *     může nabídnout „sync" akci.
     */
    public function describe(?User $user, ?string $expectedRole = null): array
    {
        if ($user === null) {
            return [
                'hasAccount' => false,
                'expectedRole' => $expectedRole,
            ];
        }
        $mobileRoles = array_values(array_filter(
            $user->getAssignedRoleNames(),
            fn(string $r) => in_array($r, self::ALL_MOBILE_ROLES, true)
        ));
        $roleMismatch = $expectedRole !== null
            && !in_array($expectedRole, $mobileRoles, true);
        return [
            'hasAccount' => true,
            'userId' => $user->getId(),
            'email' => $user->getEmail(),
            'pinEnabled' => $user->isPinEnabled(),
            'mobileRoles' => $mobileRoles,
            'expectedRole' => $expectedRole,
            'roleMismatch' => $roleMismatch,
        ];
    }

    /**
     * Aktualizuje mobilní role usera podle nové pozice staff membera.
     * Použít po změně `staff.position`, když už existuje mobilní účet.
     */
    public function syncRoleWithPosition(StaffMember $staff): string
    {
        $user = $staff->getUser();
        if ($user === null) {
            throw new \DomainException('Staff member nemá mobilní účet, není co synchronizovat.');
        }
        $derivedRole = self::deriveMobileRoleFromPosition($staff->getPosition());
        if ($derivedRole === null) {
            throw new \DomainException(sprintf(
                'Pozice "%s" není namapovaná na mobilní roli.',
                $staff->getPosition() ?? '(nenastavena)'
            ));
        }
        // Odstraň existující mobilní role
        foreach ($user->getUserRoles() as $ur) {
            $role = $ur->getRole();
            if ($role && in_array($role->getName(), self::ALL_MOBILE_ROLES, true)) {
                $this->em->remove($ur);
            }
        }
        $this->em->flush();
        // Přiřaď novou
        $this->assignRole($user, $derivedRole);
        $this->em->flush();
        return $derivedRole;
    }

    // ─── Interní ─────────────────────────────────────────────────────────

    /**
     * @return array{0: User, 1: ?string} User a plaintext heslo (pokud bylo generováno).
     */
    private function createUser(string $email, bool $generatePassword): array
    {
        $user = new User();
        $user->setUsername($email);
        $user->setEmail($email);
        $user->setRoles(['ROLE_USER']);

        $plainPassword = null;
        if ($generatePassword) {
            $plainPassword = $this->generatePassword();
            $user->setPassword($this->hasher->hashPassword($user, $plainPassword));
        } else {
            // Nelze se přihlásit heslem — jen PIN. Uložíme náhodný hash,
            // aby heslový flow nedovolil přihlášení prázdným/neznámým heslem.
            $user->setPassword($this->hasher->hashPassword($user, bin2hex(random_bytes(32))));
        }

        $this->em->persist($user);
        return [$user, $plainPassword];
    }

    private function applyPin(User $user, string $pin, ?string $deviceId): void
    {
        if (!preg_match('/^\d{4,6}$/', $pin)) {
            throw new \InvalidArgumentException('PIN musí být 4 až 6 číslic.');
        }
        $user->setMobilePin($this->hasher->hashPassword($user, $pin));
        $user->setPinDeviceId($deviceId);
        $user->setPinEnabled(true);
    }

    private function assignRole(User $user, string $roleName): void
    {
        $role = $this->roleRepo->findByName($roleName);
        if (!$role) {
            throw new \RuntimeException(
                sprintf('Role "%s" nenalezena v DB. Spusť SQL seed (sql/mobile_auth_migration.sql) nebo `app:seed-permissions --force`.', $roleName)
            );
        }
        $ur = new UserRole();
        $ur->setUser($user);
        $ur->setRole($role);
        $this->em->persist($ur);
    }

    private function ensureEmailFree(string $email): void
    {
        if ($this->userRepo->findOneBy(['email' => $email])) {
            throw new \DomainException(
                sprintf('Uživatel s e-mailem "%s" už existuje. Nejdřív ho smaž z /users.', $email)
            );
        }
    }

    private function generatePassword(): string
    {
        // 12 znaků [a-z0-9] — jednorázové, administrátor ho ručně předá personálu.
        return substr(bin2hex(random_bytes(8)), 0, 12);
    }
}
