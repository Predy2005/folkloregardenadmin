<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\RefreshToken;
use App\Entity\User;
use App\Repository\RefreshTokenRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\PasswordHasher\Hasher\PasswordHasherFactoryInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Orchestruje mobilní autentizaci:
 *  - login heslem (identifier + password)
 *  - login PINem (identifier + PIN + deviceId)
 *  - refresh tokenů
 *  - logout / revokace
 *
 * Access token je JWT s kratším TTL (2 h) a custom claimy (`mobile`,
 * `staffMemberId`, `transportDriverId`, `deviceId`). Refresh token je
 * náhodný 64-bytový řetězec uložený v DB; při refresh se rotuje.
 */
class MobileAuthService
{
    public const ACCESS_TOKEN_TTL_SECONDS = 7200;           // 2 hodiny
    public const REFRESH_TOKEN_TTL_SECONDS = 14 * 86400;    // 14 dní

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly UserRepository $userRepo,
        private readonly RefreshTokenRepository $refreshRepo,
        private readonly UserPasswordHasherInterface $hasher,
        private readonly PasswordHasherFactoryInterface $hasherFactory,
        private readonly JWTTokenManagerInterface $jwtManager,
        #[Autowire('%kernel.secret%')]
        private readonly string $appSecret,
    ) {
    }

    /**
     * Verifikuje PIN proti hashi v `User::mobilePin`. NELZE použít
     * `UserPasswordHasher::isPasswordValid()`, protože ten ověřuje plaintext
     * proti `User::getPassword()` (běžné heslo) — ne proti mobilnímu PINu.
     * Místo toho saháme přímo na hasher factory + raw `verify()`.
     */
    private function verifyMobilePin(User $user, string $pin): bool
    {
        $hash = $user->getMobilePin();
        if ($hash === null || $hash === '') {
            return false;
        }
        return $this->hasherFactory->getPasswordHasher($user)->verify($hash, $pin);
    }

    /**
     * Login e-mailem/usernamem + heslem.
     *
     * @return array{user: User, accessToken: string, refreshToken: RefreshToken, accessTokenPlain: string, refreshTokenPlain: string}
     */
    public function loginWithPassword(string $identifier, string $password, ?string $deviceId = null): array
    {
        $user = $this->findUserByIdentifier($identifier);
        if ($user === null) {
            throw new AuthException('Neplatné přihlašovací údaje.');
        }
        if (!$this->hasher->isPasswordValid($user, $password)) {
            throw new AuthException('Neplatné přihlašovací údaje.');
        }
        return $this->issueTokens($user, $deviceId);
    }

    /**
     * Login PINem + deviceId. Pokud má uživatel `pinDeviceId` navázaný,
     * MUSÍ odpovídat. Pokud nemá, při úspěšném loginu se naváže (trust-on-first-use).
     *
     * @return array{user: User, accessToken: string, refreshToken: RefreshToken, accessTokenPlain: string, refreshTokenPlain: string}
     */
    public function loginWithPin(string $identifier, string $pin, string $deviceId): array
    {
        if ($deviceId === '') {
            throw new AuthException('Chybí deviceId pro PIN login.');
        }
        $user = $this->findUserByIdentifier($identifier);
        if ($user === null || !$user->isPinEnabled() || $user->getMobilePin() === null) {
            throw new AuthException('Neplatné přihlašovací údaje.');
        }

        if (!$this->verifyMobilePin($user, $pin)) {
            throw new AuthException('Neplatné přihlašovací údaje.');
        }

        // Device binding: pokud už je nastaveno, musí sedět.
        $boundDevice = $user->getPinDeviceId();
        if ($boundDevice !== null && $boundDevice !== '' && $boundDevice !== $deviceId) {
            throw new AuthException('Tento PIN je vázaný na jiné zařízení. Požádej administrátora o reset.');
        }
        if ($boundDevice === null || $boundDevice === '') {
            $user->setPinDeviceId($deviceId);
        }

        return $this->issueTokens($user, $deviceId);
    }

    /**
     * Login pouze PINem + deviceId (bez identifieru). Najde uživatele podle
     * deterministického HMAC hashe PINu (`mobile_pin_lookup_hash` má unique
     * index, takže globální unikátnost zaručuje, že match je jednoznačný).
     * Pak ověří bcrypt hash + device binding (trust-on-first-use).
     *
     * @return array{user: User, accessToken: string, refreshToken: RefreshToken, accessTokenPlain: string, refreshTokenPlain: string}
     */
    public function loginWithPinOnly(string $pin, string $deviceId): array
    {
        if ($deviceId === '') {
            throw new AuthException('Chybí deviceId pro PIN login.');
        }
        if (!preg_match('/^\d{4,6}$/', $pin)) {
            throw new AuthException('Neplatné přihlašovací údaje.');
        }

        $lookupHash = MobileAccountProvisioningService::computePinLookupHash($pin, $this->appSecret);
        $user = $this->userRepo->findOneBy(['mobilePinLookupHash' => $lookupHash]);
        if ($user === null || !$user->isPinEnabled() || $user->getMobilePin() === null) {
            throw new AuthException('Neplatné přihlašovací údaje.');
        }

        // Defense-in-depth: bcrypt verifikace navíc nad lookup hashem.
        if (!$this->verifyMobilePin($user, $pin)) {
            throw new AuthException('Neplatné přihlašovací údaje.');
        }

        // Device binding: pokud už je nastaveno, musí sedět.
        $boundDevice = $user->getPinDeviceId();
        if ($boundDevice !== null && $boundDevice !== '' && $boundDevice !== $deviceId) {
            throw new AuthException('Tento PIN je vázaný na jiné zařízení. Požádej administrátora o reset.');
        }
        if ($boundDevice === null || $boundDevice === '') {
            $user->setPinDeviceId($deviceId);
        }

        return $this->issueTokens($user, $deviceId);
    }

    /**
     * Otočí refresh token: validuje, zneplatní starý, vydá nový pár.
     *
     * @return array{user: User, accessToken: string, refreshToken: RefreshToken, accessTokenPlain: string, refreshTokenPlain: string}
     */
    public function refresh(string $refreshTokenPlain, ?string $deviceId = null): array
    {
        $rt = $this->refreshRepo->findByToken($refreshTokenPlain);
        if ($rt === null || !$rt->isValid()) {
            throw new AuthException('Refresh token je neplatný nebo vypršel.');
        }
        if ($deviceId !== null && $rt->getDeviceId() !== null && $rt->getDeviceId() !== $deviceId) {
            // Pokus o refresh z jiného zařízení — revokujeme celý řetězec.
            $this->refreshRepo->revokeAllForUser($rt->getUser());
            $this->em->flush();
            throw new AuthException('Refresh token je vázaný na jiné zařízení.');
        }

        $user = $rt->getUser();
        if (!$user) {
            throw new AuthException('Refresh token je neplatný.');
        }

        // Rotate: zneplatni starý, vydej nový.
        $rt->setRevokedAt(new \DateTime());
        $rt->setLastUsedAt(new \DateTime());

        return $this->issueTokens($user, $rt->getDeviceId() ?? $deviceId);
    }

    /**
     * Odhlášení: zneplatní předaný refresh token (access JWT doběhne sám
     * svému exp — nelze ho revokovat bez blacklistu, vzhledem k 2 h TTL
     * není nutné).
     */
    public function logout(string $refreshTokenPlain): void
    {
        $rt = $this->refreshRepo->findByToken($refreshTokenPlain);
        if ($rt !== null && !$rt->isRevoked()) {
            $rt->setRevokedAt(new \DateTime());
            $this->em->flush();
        }
    }

    /**
     * Sestaví payload pro /me endpoint.
     */
    public function describeUser(User $user): array
    {
        $staff = $user->getStaffMember();
        $driver = $user->getTransportDriver();

        return [
            'id' => $user->getId(),
            'username' => $user->getUsername(),
            'email' => $user->getEmail(),
            'roles' => $user->getAssignedRoleNames(),
            'permissions' => $user->getEffectivePermissions(),
            'isSuperAdmin' => $user->isSuperAdmin(),
            'pinEnabled' => $user->isPinEnabled(),

            // Staff member fields (null pokud user není svázaný s personálem).
            // Mobilka je používá pro profile screen + edit form.
            'staffMemberId' => $staff?->getId(),
            'staffMemberName' => $staff
                ? trim($staff->getFirstName() . ' ' . $staff->getLastName())
                : null,
            'staffMemberFirstName' => $staff?->getFirstName(),
            'staffMemberLastName' => $staff?->getLastName(),
            'staffMemberPosition' => $staff?->getPosition(),
            'staffMemberPhone' => $staff?->getPhone(),
            'staffMemberEmail' => $staff?->getEmail(),
            'staffMemberPhotoUrl' => self::buildPhotoUrl('staff', $staff?->getPhotoPath()),

            // Transport driver fields
            'transportDriverId' => $driver?->getId(),
            'transportDriverName' => $driver?->getFullName(),
            'transportDriverFirstName' => $driver?->getFirstName(),
            'transportDriverLastName' => $driver?->getLastName(),
            'transportDriverPhone' => $driver?->getPhone(),
            'transportDriverEmail' => $driver?->getEmail(),
            'transportDriverPhotoUrl' => self::buildPhotoUrl('driver', $driver?->getPhotoPath()),
        ];
    }

    /**
     * Relativní URL k profilové fotce — mobilka si ji prefixne base URL.
     * Vrací null pokud photoPath neexistuje.
     */
    private static function buildPhotoUrl(string $kind, ?string $photoPath): ?string
    {
        if ($photoPath === null || $photoPath === '') return null;
        return $kind === 'staff'
            ? '/uploads/staff_photos/' . $photoPath
            : '/uploads/driver_photos/' . $photoPath;
    }

    // ─── Interní ─────────────────────────────────────────────────────────

    private function findUserByIdentifier(string $identifier): ?User
    {
        $identifier = trim($identifier);
        if ($identifier === '') {
            return null;
        }
        // Nejprve username, pak email — pokryje oba scénáře
        // (username je při provisioningu rovné e-mailu, ale pro jistotu oboje).
        return $this->userRepo->findOneBy(['username' => $identifier])
            ?? $this->userRepo->findOneBy(['email' => $identifier]);
    }

    /**
     * @return array{user: User, accessToken: string, refreshToken: RefreshToken, accessTokenPlain: string, refreshTokenPlain: string}
     */
    private function issueTokens(User $user, ?string $deviceId): array
    {
        $now = time();
        $payload = [
            'iat' => $now,
            'exp' => $now + self::ACCESS_TOKEN_TTL_SECONDS,
            'mobile' => true,
            'staffMemberId' => $user->getStaffMember()?->getId(),
            'transportDriverId' => $user->getTransportDriver()?->getId(),
            'deviceId' => $deviceId,
        ];
        $accessToken = $this->jwtManager->createFromPayload($user, $payload);

        $refreshPlain = $this->generateRefreshToken();
        $refresh = new RefreshToken();
        $refresh->setUser($user);
        $refresh->setToken($refreshPlain);
        $refresh->setDeviceId($deviceId);
        $refresh->setExpiresAt((new \DateTime())->modify('+' . self::REFRESH_TOKEN_TTL_SECONDS . ' seconds'));
        $this->em->persist($refresh);

        $user->setLastLoginAt(new \DateTime());

        $this->em->flush();

        return [
            'user' => $user,
            'accessToken' => $accessToken, // same as plain for JWT
            'accessTokenPlain' => $accessToken,
            'refreshToken' => $refresh,
            'refreshTokenPlain' => $refreshPlain,
        ];
    }

    private function generateRefreshToken(): string
    {
        // 64 bajtů → 128 hex znaků. Kolize prakticky vyloučená, unikátní index v DB to pojistí.
        return bin2hex(random_bytes(64));
    }
}
