<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Entity\UserDevice;
use App\Repository\UserDeviceRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Endpointy pro správu FCM push zařízení z mobilní aplikace.
 *
 * Všechno je pod IS_AUTHENTICATED_FULLY (přes access_control dědí /api/).
 * Uživatel smí vidět a měnit jen svá zařízení — ne cizí.
 */
#[Route('/api/mobile/devices')]
class MobileDeviceController extends AbstractController
{
    public function __construct(
        private readonly UserDeviceRepository $deviceRepo,
        private readonly EntityManagerInterface $em,
    ) {
    }

    #[Route('', methods: ['GET'])]
    #[IsGranted('mobile_self.read')]
    public function list(): JsonResponse
    {
        $user = $this->requireUser();
        $devices = $this->deviceRepo->findByUser($user);
        return $this->json([
            'devices' => array_map(fn(UserDevice $d) => $d->toArray(), $devices),
        ]);
    }

    /**
     * Registrace / upsert zařízení. Mobilka tohle volá po úspěšném loginu
     * a pokaždé, když dostane nový FCM token (Firebase refresh).
     *
     * Pokud už token existuje v DB (přes unique index), přepíše usera —
     * ošetřeno výjimkou; v praxi to znamená, že telefon přešel na jiný účet.
     */
    #[Route('/register', methods: ['POST'])]
    #[IsGranted('mobile_self.read')]
    public function register(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $data = json_decode($request->getContent(), true) ?? [];

        $fcmToken = isset($data['fcmToken']) ? (string)$data['fcmToken'] : '';
        $platform = isset($data['platform']) ? (string)$data['platform'] : '';
        $deviceId = isset($data['deviceId']) ? (string)$data['deviceId'] : null;
        $deviceName = isset($data['deviceName']) ? (string)$data['deviceName'] : null;

        if ($fcmToken === '') {
            return $this->json(['error' => 'Pole "fcmToken" je povinné.'], 400);
        }
        $allowedPlatforms = [UserDevice::PLATFORM_IOS, UserDevice::PLATFORM_ANDROID, UserDevice::PLATFORM_WEB];
        if (!in_array($platform, $allowedPlatforms, true)) {
            return $this->json(['error' => 'Pole "platform" musí být jedno z: ' . implode(', ', $allowedPlatforms)], 400);
        }
        if (strlen($fcmToken) > 500) {
            return $this->json(['error' => 'FCM token je příliš dlouhý (max 500 znaků).'], 400);
        }

        // Upsert podle tokenu (unique index)
        $device = $this->deviceRepo->findByToken($fcmToken);
        if ($device === null) {
            $device = new UserDevice();
            $device->setFcmToken($fcmToken);
            $this->em->persist($device);
        }

        // Re-assign na aktuálního usera (mohl se změnit — odhlášení + přihlášení jiného účtu na stejném tel.)
        $device->setUser($user);
        $device->setPlatform($platform);
        $device->setDeviceId($deviceId);
        $device->setDeviceName($deviceName);
        $device->touch();

        $this->em->flush();

        return $this->json([
            'status' => 'registered',
            'device' => $device->toArray(),
        ], 201);
    }

    #[Route('/{id}', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    #[IsGranted('mobile_self.read')]
    public function delete(int $id): JsonResponse
    {
        $user = $this->requireUser();
        $device = $this->deviceRepo->find($id);
        if (!$device || $device->getUser()?->getId() !== $user->getId()) {
            return $this->json(['error' => 'Zařízení nenalezeno.'], 404);
        }
        $this->em->remove($device);
        $this->em->flush();
        return $this->json(['status' => 'deleted']);
    }

    /**
     * Odhlášení konkrétního tokenu — používá se při sign-out v mobilce
     * (mobilka zná vlastní token, ale neznamená ID záznamu v DB).
     */
    #[Route('/by-token', methods: ['DELETE'])]
    #[IsGranted('mobile_self.read')]
    public function deleteByToken(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $data = json_decode($request->getContent(), true) ?? [];
        $token = isset($data['fcmToken']) ? (string)$data['fcmToken'] : '';
        if ($token === '') {
            return $this->json(['error' => 'Pole "fcmToken" je povinné.'], 400);
        }
        $device = $this->deviceRepo->findByToken($token);
        if (!$device || $device->getUser()?->getId() !== $user->getId()) {
            // Defenzivně — neodhalujeme, zda token existuje pod jiným účtem
            return $this->json(['status' => 'deleted']);
        }
        $this->em->remove($device);
        $this->em->flush();
        return $this->json(['status' => 'deleted']);
    }

    private function requireUser(): User
    {
        $u = $this->getUser();
        if (!$u instanceof User) {
            throw new AccessDeniedException();
        }
        return $u;
    }
}
