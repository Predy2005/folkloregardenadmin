<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\AssistantActionLog;
use App\Entity\AssistantConversation;
use App\Service\Assistant\AssistantOrchestrator;
use App\Service\Assistant\ToolRegistry;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/assistant')]
class AssistantController extends AbstractController
{
    #[Route('/chat', methods: ['POST'])]
    public function chat(Request $request, AssistantOrchestrator $orchestrator): JsonResponse
    {
        // LLM dotaz + tool-loop může trvat přes 30s (default PHP max_execution_time).
        // Musí to být uvnitř akce, PHP ini_set jinak proběhne až po FatalError.
        @set_time_limit(300);
        $data = json_decode($request->getContent(), true) ?? [];
        $messages = $data['messages'] ?? [];
        if (!is_array($messages) || empty($messages)) {
            return $this->json(['error' => 'messages musí být neprázdné pole'], 400);
        }

        $history = [];
        foreach ($messages as $m) {
            if (!is_array($m)) continue;
            $role = (string)($m['role'] ?? '');
            $content = (string)($m['content'] ?? '');
            if (!in_array($role, ['user', 'assistant'], true) || $content === '') continue;
            $history[] = ['role' => $role, 'content' => $content];
        }
        if (empty($history)) {
            return $this->json(['error' => 'žádná validní zpráva'], 400);
        }

        // Cap history to last 12 turns to keep prompts fast.
        if (count($history) > 12) {
            $history = array_slice($history, -12);
        }

        $context = [];
        if (isset($data['context']['currentRoute']) && is_string($data['context']['currentRoute'])) {
            $context['currentRoute'] = $data['context']['currentRoute'];
        }

        try {
            $result = $orchestrator->chat($history, $context);
            return $this->json($result);
        } catch (\Throwable $e) {
            return $this->json([
                'error' => 'AI backend selhal',
                'detail' => $e->getMessage(),
            ], 502);
        }
    }

    #[Route('/confirm/{actionId}', methods: ['POST'])]
    public function confirm(
        string $actionId,
        EntityManagerInterface $em,
        ToolRegistry $registry,
        Security $security,
    ): JsonResponse {
        @set_time_limit(300);
        $log = $em->getRepository(AssistantActionLog::class)->findOneBy(['actionId' => $actionId]);
        if (!$log) {
            return $this->json(['error' => 'Akce nenalezena'], 404);
        }
        if ($log->getStatus() !== 'pending') {
            return $this->json(['error' => 'Akce už byla zpracována', 'status' => $log->getStatus()], 409);
        }

        $user = $security->getUser();
        $userId = (method_exists($user, 'getId')) ? (int)$user->getId() : null;
        if ($log->getUserId() !== null && $userId !== null && $log->getUserId() !== $userId) {
            return $this->json(['error' => 'Akci může potvrdit jen ten, kdo ji založil'], 403);
        }

        $tool = $registry->get($log->getToolName());
        if (!$tool) {
            $log->setStatus('failed');
            $em->flush();
            return $this->json(['error' => 'Tool už není registrovaný'], 500);
        }

        $permission = $tool->getRequiredPermission();
        if ($permission && !$security->isGranted($permission)) {
            return $this->json(['error' => "Nemáš oprávnění ($permission)."], 403);
        }

        try {
            $result = $tool->execute($log->getParams());
            $log->setStatus('executed');
            $log->setResult($result);
            $log->markExecuted();
            $em->flush();
            return $this->json(['status' => 'executed', 'result' => $result]);
        } catch (\Throwable $e) {
            $log->setStatus('failed');
            $log->setResult(['error' => $e->getMessage()]);
            $em->flush();
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route('/reject/{actionId}', methods: ['POST'])]
    public function reject(string $actionId, EntityManagerInterface $em): JsonResponse
    {
        $log = $em->getRepository(AssistantActionLog::class)->findOneBy(['actionId' => $actionId]);
        if (!$log) return $this->json(['error' => 'Nenalezeno'], 404);
        if ($log->getStatus() !== 'pending') {
            return $this->json(['error' => 'Už zpracováno'], 409);
        }
        $log->setStatus('rejected');
        $em->flush();
        return $this->json(['status' => 'rejected']);
    }

    #[Route('/conversations', methods: ['GET'])]
    public function listConversations(EntityManagerInterface $em, Security $security): JsonResponse
    {
        $user = $security->getUser();
        $userId = method_exists($user, 'getId') ? (int)$user->getId() : null;
        if ($userId === null) return $this->json([]);

        $repo = $em->getRepository(AssistantConversation::class);
        $rows = $repo->createQueryBuilder('c')
            ->andWhere('c.userId = :u')->setParameter('u', $userId)
            ->orderBy('c.updatedAt', 'DESC')
            ->setMaxResults(30)
            ->getQuery()->getResult();

        return $this->json(array_map(fn(AssistantConversation $c) => [
            'id' => $c->getId(),
            'title' => $c->getTitle(),
            'updatedAt' => $c->getUpdatedAt()->format(\DateTimeInterface::ATOM),
            'messageCount' => count($c->getMessages()),
        ], $rows));
    }

    #[Route('/conversations/{id}', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function getConversation(int $id, EntityManagerInterface $em, Security $security): JsonResponse
    {
        $c = $em->getRepository(AssistantConversation::class)->find($id);
        if (!$c) return $this->json(['error' => 'Nenalezeno'], 404);
        $user = $security->getUser();
        $userId = method_exists($user, 'getId') ? (int)$user->getId() : null;
        if ($c->getUserId() !== null && $c->getUserId() !== $userId) {
            return $this->json(['error' => 'Přístup odepřen'], 403);
        }
        return $this->json([
            'id' => $c->getId(),
            'title' => $c->getTitle(),
            'messages' => $c->getMessages(),
            'updatedAt' => $c->getUpdatedAt()->format(\DateTimeInterface::ATOM),
        ]);
    }

    #[Route('/conversations', methods: ['POST'])]
    public function saveConversation(Request $request, EntityManagerInterface $em, Security $security): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $messages = is_array($data['messages'] ?? null) ? $data['messages'] : [];
        if (empty($messages)) return $this->json(['error' => 'prázdná konverzace'], 400);

        $user = $security->getUser();
        $userId = method_exists($user, 'getId') ? (int)$user->getId() : null;

        $id = isset($data['id']) ? (int)$data['id'] : 0;
        $c = $id > 0 ? $em->getRepository(AssistantConversation::class)->find($id) : null;
        if ($c && $c->getUserId() !== null && $c->getUserId() !== $userId) {
            return $this->json(['error' => 'Přístup odepřen'], 403);
        }
        if (!$c) {
            $c = new AssistantConversation();
            $c->setUserId($userId);
        }

        $firstUser = null;
        foreach ($messages as $m) {
            if (($m['role'] ?? '') === 'user') { $firstUser = (string)($m['content'] ?? ''); break; }
        }
        $title = (string)($data['title'] ?? '');
        if ($title === '' && $firstUser !== null) {
            $title = mb_substr($firstUser, 0, 80);
        }
        if ($title === '') $title = 'Konverzace '.date('d.m. H:i');

        $c->setTitle($title);
        $c->setMessages($messages);
        $em->persist($c);
        $em->flush();

        return $this->json(['id' => $c->getId(), 'title' => $c->getTitle()]);
    }

    #[Route('/conversations/{id}', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function deleteConversation(int $id, EntityManagerInterface $em, Security $security): JsonResponse
    {
        $c = $em->getRepository(AssistantConversation::class)->find($id);
        if (!$c) return $this->json(['status' => 'gone']);
        $user = $security->getUser();
        $userId = method_exists($user, 'getId') ? (int)$user->getId() : null;
        if ($c->getUserId() !== null && $c->getUserId() !== $userId) {
            return $this->json(['error' => 'Přístup odepřen'], 403);
        }
        $em->remove($c);
        $em->flush();
        return $this->json(['status' => 'deleted']);
    }
}
