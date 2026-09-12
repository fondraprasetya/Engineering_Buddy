<?php

namespace App\Services;

use App\Models\Asset;
use App\Models\CalendarEvent;
use App\Models\DailyLog;
use App\Models\DailyUtility;
use App\Models\Location;
use App\Models\MaintenanceSchedule;
use App\Models\Project;
use App\Models\RosterEntry;
use App\Models\StoreItem;
use App\Models\StoreReceiving;
use App\Models\StoreRequest;
use App\Models\StoreStockAdjustment;
use App\Models\TechnicianAssignment;
use App\Models\TelegramLink;
use App\Models\User;
use App\Models\UtilityRate;
use App\Models\WorkOrder;
use App\Models\WorkOrderPhoto;
use App\Tenancy\TenantContext;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TelegramService
{
    private ?string $token;

    private string $apiUrl;

    private const CONVERSATION_TTL = 1800;

    private const ALLOWED_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

    public function __construct()
    {
        $this->token = config('services.telegram.bot_token');
        $this->apiUrl = "https://api.telegram.org/bot{$this->token}";
    }

    public function isConfigured(): bool
    {
        return ! empty($this->token);
    }

    public function generateLinkCode(User $user): string
    {
        $code = strtoupper(Str::random(6));

        TelegramLink::updateOrCreate(
            ['user_id' => $user->id],
            ['link_code' => $code, 'link_code_expires_at' => now()->addMinutes(10), 'chat_id' => null, 'linked_at' => null]
        );

        return $code;
    }

    public function verifyLinkCode(string $code, int $chatId): ?User
    {
        $link = TelegramLink::where('link_code', $code)
            ->whereNull('chat_id')
            ->where('link_code_expires_at', '>', now())
            ->first();

        if (! $link) {
            return null;
        }

        $existing = TelegramLink::where('chat_id', $chatId)->whereNotNull('linked_at')->first();
        if ($existing) {
            return null;
        }

        $link->update(['chat_id' => $chatId, 'linked_at' => now(), 'link_code' => null, 'link_code_expires_at' => null]);

        return $link->user;
    }

    public function handleWebhook(array $update): ?string
    {
        try {
            if (isset($update['callback_query'])) {
                return $this->handleCallbackQuery($update['callback_query']);
            }

            $message = $update['message'] ?? null;
            if (! $message) {
                return null;
            }

            $chatId = $message['chat']['id'];

            if (isset($message['text'])) {
                $text = trim($message['text']);

                if (str_starts_with($text, '/start')) {
                    return $this->handleStart($chatId, $text);
                }

                if (str_starts_with($text, '/restart')) {
                    return $this->handleRestart($chatId);
                }

                if (str_starts_with($text, '/cmdlist')) {
                    return $this->handleCmdList($chatId);
                }

                $telegramLink = TelegramLink::where('chat_id', $chatId)->whereNotNull('linked_at')->first();
                if (! $telegramLink) {
                    return $this->sendMessage($chatId, 'Please link your account first. Use /start <code> with the code from the app.');
                }

                $user = $telegramLink->user;

                TenantContext::set($user->tenant_id);

                if ($this->hasActiveConversation($chatId)) {
                    return $this->handleConversationText($chatId, $user, $text);
                }

                return match (true) {
                    str_starts_with($text, '/inputds') => $this->handleInputdsStart($chatId, $user),
                    str_starts_with($text, '/inputevent') => $this->handleInputeventStart($chatId, $user),
                    str_starts_with($text, '/inputec') => $this->handleInputecStart($chatId, $user),
                    str_starts_with($text, '/workorder') || str_starts_with($text, '/work order') => $this->handleCreateCommand($chatId, $user, $text),
                    str_starts_with($text, '/unlink') => $this->handleUnlink($chatId, $user),
                    str_starts_with($text, '/cancel') => $this->sendMessage($chatId, 'No active conversation to cancel.'),
                    str_starts_with($text, '/myorders') => $this->handleMyOrders($chatId, $user),
                    str_starts_with($text, '/wo#') => $this->handleWoDetail($chatId, $user, $text),
                    str_starts_with($text, '/approve') => $this->handleApproveText($chatId, $user, $text),
                    str_starts_with($text, '/reject') => $this->handleRejectText($chatId, $user, $text),
                    str_starts_with($text, '/update') => $this->handleUpdate($chatId, $user, $text),
                    str_starts_with($text, '/myschedule') => $this->handleMySchedule($chatId, $user),
                    str_starts_with($text, '/myroster#') || str_starts_with($text, '/my roster#') => $this->handleMyRoster($chatId, $user, $text),
                    str_starts_with($text, '/myroster') || str_starts_with($text, '/my roster') => $this->handleMyRoster($chatId, $user),
                    str_starts_with($text, '/teamroster#') || str_starts_with($text, '/team roster#') => $this->handleTeamRoster($chatId, $text),
                    str_starts_with($text, '/teamroster') || str_starts_with($text, '/team roster') => $this->handleTeamRoster($chatId),
                    str_starts_with($text, '/event#') => $this->handleEventDetail($chatId, $text),
                    str_starts_with($text, '/event') || str_starts_with($text, '/events') => $this->handleEvents($chatId),
                    str_starts_with($text, '/uti') => $this->handleUtility($chatId, $text),
                    str_starts_with($text, '/occ') => $this->handleOccupancy($chatId),
                    str_starts_with($text, '/pending') => $this->handlePending($chatId, $user),
                    str_starts_with($text, '/rcv') => $this->handleStoreRcvStart($chatId, $user),
                    str_starts_with($text, '/req') => $this->handleStoreReqStart($chatId, $user),
                    str_starts_with($text, '/adj') => $this->handleStoreAdjStart($chatId, $user),
                    str_starts_with($text, '/report') => $this->handleReport($chatId, $user, $text),
                    preg_match('#^/(\d+)$#', $text) && StoreItem::find((int) substr($text, 1)) => $this->handleStoreItemShortcut($chatId, (int) substr($text, 1)),
                    default => $this->sendMessage($chatId, '❌ Unrecognized command. Use /cmdlist for all available commands.'),
                };
            }

            if (isset($message['photo'])) {
                $telegramLink = TelegramLink::where('chat_id', $chatId)->whereNotNull('linked_at')->first();
                if (! $telegramLink) {
                    return null;
                }

                TenantContext::set($telegramLink->user->tenant_id);

                if ($this->hasActiveConversation($chatId)) {
                    return $this->handleConversationPhoto($chatId, $telegramLink->user, $message['photo']);
                }
            }

            if (isset($message['document'])) {
                $telegramLink = TelegramLink::where('chat_id', $chatId)->whereNotNull('linked_at')->first();
                if (! $telegramLink) {
                    return null;
                }

                TenantContext::set($telegramLink->user->tenant_id);

                if ($this->hasActiveConversation($chatId)) {
                    return $this->handleConversationDocument($chatId, $telegramLink->user, $message['document']);
                }
            }

            return null;
        } catch (\Throwable $e) {
            $chatId = $update['message']['chat']['id'] ?? ($update['callback_query']['message']['chat']['id'] ?? null);
            if ($chatId) {
                $this->sendMessage($chatId, '⚠️ An error occurred. Please try again or use /restart.');
            }
            Log::error('Telegram handle error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return null;
        } finally {
            TenantContext::clear();
        }
    }

    // ─── Conversation State ───────────────────────────────────────

    private function createConversationKey(int $chatId): string
    {
        return "telegram_wo_create:{$chatId}";
    }

    private function cmdConversationKey(int $chatId): string
    {
        return "telegram_wo_cmd:{$chatId}";
    }

    private function hasActiveConversation(int $chatId): bool
    {
        return Cache::has($this->createConversationKey($chatId))
            || Cache::has($this->cmdConversationKey($chatId))
            || Cache::has($this->inputdsConversationKey($chatId))
            || Cache::has($this->inputecConversationKey($chatId))
            || Cache::has($this->inputeventConversationKey($chatId))
            || Cache::has($this->storeRcvConversationKey($chatId))
            || Cache::has($this->storeReqConversationKey($chatId))
            || Cache::has($this->storeAdjConversationKey($chatId));
    }

    private function getConversation(int $chatId): ?array
    {
        return Cache::get($this->createConversationKey($chatId));
    }

    private function setConversation(int $chatId, array $state): void
    {
        Cache::put($this->createConversationKey($chatId), $state, self::CONVERSATION_TTL);
    }

    private function clearConversation(int $chatId): void
    {
        Cache::forget($this->createConversationKey($chatId));
    }

    private function getCmdConversation(int $chatId): ?array
    {
        return Cache::get($this->cmdConversationKey($chatId));
    }

    private function setCmdConversation(int $chatId, array $state): void
    {
        Cache::put($this->cmdConversationKey($chatId), $state, self::CONVERSATION_TTL);
    }

    private function clearCmdConversation(int $chatId): void
    {
        Cache::forget($this->cmdConversationKey($chatId));
    }

    private function inputdsConversationKey(int $chatId): string
    {
        return "telegram_inputds:{$chatId}";
    }

    private function hasInputdsConversation(int $chatId): bool
    {
        return Cache::has($this->inputdsConversationKey($chatId));
    }

    private function getInputdsConversation(int $chatId): ?array
    {
        return Cache::get($this->inputdsConversationKey($chatId));
    }

    private function setInputdsConversation(int $chatId, array $state): void
    {
        Cache::put($this->inputdsConversationKey($chatId), $state, self::CONVERSATION_TTL);
    }

    private function clearInputdsConversation(int $chatId): void
    {
        Cache::forget($this->inputdsConversationKey($chatId));
    }

    private function inputecConversationKey(int $chatId): string
    {
        return "telegram_inputec:{$chatId}";
    }

    private function getInputecConversation(int $chatId): ?array
    {
        return Cache::get($this->inputecConversationKey($chatId));
    }

    private function setInputecConversation(int $chatId, array $state): void
    {
        Cache::put($this->inputecConversationKey($chatId), $state, self::CONVERSATION_TTL);
    }

    private function clearInputecConversation(int $chatId): void
    {
        Cache::forget($this->inputecConversationKey($chatId));
    }

    // ─── Input Event (inputevent) ───────────────────────────────

    private function inputeventConversationKey(int $chatId): string
    {
        return "telegram_inputevent:{$chatId}";
    }

    private function getInputeventConversation(int $chatId): ?array
    {
        return Cache::get($this->inputeventConversationKey($chatId));
    }

    private function setInputeventConversation(int $chatId, array $state): void
    {
        Cache::put($this->inputeventConversationKey($chatId), $state, self::CONVERSATION_TTL);
    }

    private function clearInputeventConversation(int $chatId): void
    {
        Cache::forget($this->inputeventConversationKey($chatId));
    }

    // ─── Store Receiving (rcv) ────────────────────────────────────

    private function storeRcvConversationKey(int $chatId): string
    {
        return "telegram_store_rcv:{$chatId}";
    }

    private function getStoreRcvConversation(int $chatId): ?array
    {
        return Cache::get($this->storeRcvConversationKey($chatId));
    }

    private function setStoreRcvConversation(int $chatId, array $state): void
    {
        Cache::put($this->storeRcvConversationKey($chatId), $state, self::CONVERSATION_TTL);
    }

    private function clearStoreRcvConversation(int $chatId): void
    {
        Cache::forget($this->storeRcvConversationKey($chatId));
    }

    // ─── Store Request (req) ──────────────────────────────────────

    private function storeReqConversationKey(int $chatId): string
    {
        return "telegram_store_req:{$chatId}";
    }

    private function getStoreReqConversation(int $chatId): ?array
    {
        return Cache::get($this->storeReqConversationKey($chatId));
    }

    private function setStoreReqConversation(int $chatId, array $state): void
    {
        Cache::put($this->storeReqConversationKey($chatId), $state, self::CONVERSATION_TTL);
    }

    private function clearStoreReqConversation(int $chatId): void
    {
        Cache::forget($this->storeReqConversationKey($chatId));
    }

    // ─── Store Adjustment (adj) ───────────────────────────────────

    private function storeAdjConversationKey(int $chatId): string
    {
        return "telegram_store_adj:{$chatId}";
    }

    private function getStoreAdjConversation(int $chatId): ?array
    {
        return Cache::get($this->storeAdjConversationKey($chatId));
    }

    private function setStoreAdjConversation(int $chatId, array $state): void
    {
        Cache::put($this->storeAdjConversationKey($chatId), $state, self::CONVERSATION_TTL);
    }

    private function clearStoreAdjConversation(int $chatId): void
    {
        Cache::forget($this->storeAdjConversationKey($chatId));
    }

    // ─── Conversation Dispatchers ──────────────────────────────────

    private function handleConversationText(int $chatId, User $user, string $text): ?string
    {
        // Check inputds conversation first
        $inputdsState = $this->getInputdsConversation($chatId);
        if ($inputdsState) {
            return $this->handleInputdsText($chatId, $user, $text, $inputdsState);
        }

        // Check inputec conversation
        $inputecState = $this->getInputecConversation($chatId);
        if ($inputecState) {
            return $this->handleInputecText($chatId, $user, $text, $inputecState);
        }

        // Check inputevent conversation
        $inputeventState = $this->getInputeventConversation($chatId);
        if ($inputeventState) {
            return $this->handleInputeventText($chatId, $user, $text, $inputeventState);
        }

        // Check store rcv conversation
        $storeRcvState = $this->getStoreRcvConversation($chatId);
        if ($storeRcvState) {
            return $this->handleStoreRcvText($chatId, $user, $text, $storeRcvState);
        }

        // Check store req conversation
        $storeReqState = $this->getStoreReqConversation($chatId);
        if ($storeReqState) {
            return $this->handleStoreReqText($chatId, $user, $text, $storeReqState);
        }

        // Check store adj conversation
        $storeAdjState = $this->getStoreAdjConversation($chatId);
        if ($storeAdjState) {
            return $this->handleStoreAdjText($chatId, $user, $text, $storeAdjState);
        }

        // Check wo cmd conversation
        $cmdState = $this->getCmdConversation($chatId);
        if ($cmdState) {
            return $this->handleWoCmdConversationText($chatId, $user, $text, $cmdState);
        }

        // Cancel handling
        if (strtolower($text) === 'cancel' || str_starts_with($text, '/cancel')) {
            $this->clearConversation($chatId);

            return $this->sendMessage($chatId, 'Work order creation cancelled.');
        }

        // Check work order create conversation
        $state = $this->getConversation($chatId);
        if (! $state) {
            return $this->sendMessage($chatId, 'Session expired. Start again with /workorder');
        }

        return match ($state['step']) {
            'title' => $this->processTitle($chatId, $state, $text),
            'priority' => null,
            'photo' => $this->processPhotoSkip($chatId, $state),
            default => $this->sendMessage($chatId, 'Something went wrong. Start again with /workorder'),
        };
    }

    private function handleConversationPhoto(int $chatId, User $user, array $photos): ?string
    {
        // Inputds photo first
        $inputdsState = $this->getInputdsConversation($chatId);
        if ($inputdsState && $inputdsState['step'] === 'photo') {
            return $this->processInputdsPhoto($chatId, $inputdsState, $photos);
        }

        // Inputec photo
        $inputecState = $this->getInputecConversation($chatId);
        if ($inputecState && $inputecState['step'] === 'photo') {
            return $this->processInputecPhoto($chatId, $inputecState, $photos);
        }

        // Inputevent photo
        $inputeventState = $this->getInputeventConversation($chatId);
        if ($inputeventState && $inputeventState['step'] === 'photo') {
            return $this->processInputeventPhoto($chatId, $inputeventState, $photos);
        }

        // Wo cmd photo
        $cmdState = $this->getCmdConversation($chatId);
        if ($cmdState && $cmdState['step'] === 'photo' && $cmdState['action'] === 'photo') {
            return $this->handleWoCmdPhotoInput($chatId, $user, $photos, $cmdState);
        }

        // Work order create photo
        $state = $this->getConversation($chatId);
        if (! $state || $state['step'] !== 'photo') {
            return null;
        }

        return $this->processPhotoUpload($chatId, $state, $photos);
    }

    private function handleConversationDocument(int $chatId, User $user, array $document): ?string
    {
        // Inputevent document
        $inputeventState = $this->getInputeventConversation($chatId);
        if ($inputeventState && $inputeventState['step'] === 'photo') {
            return $this->processInputeventDocument($chatId, $inputeventState, $document);
        }

        return null;
    }

    // ─── Step: Start / Title ──────────────────────────────────────

    private function askTitle(int $chatId, User $user): ?string
    {
        $this->setConversation($chatId, [
            'step' => 'title',
            'data' => [],
            'user_id' => $user->id,
        ]);

        return $this->sendMessage($chatId, '📝 Enter the work order title:');
    }

    private function processTitle(int $chatId, array $state, string $text): ?string
    {
        $title = trim($text);

        if (mb_strlen($title) > 255) {
            return $this->sendMessage($chatId, 'Title is too long (max 255 characters). Please enter a shorter title:');
        }

        if (empty($title)) {
            return $this->sendMessage($chatId, 'Title cannot be empty. Please enter a title:');
        }

        $state['data']['title'] = $title;
        $state['step'] = 'priority';
        $this->setConversation($chatId, $state);

        return $this->askPriority($chatId);
    }

    // ─── Step: Priority ───────────────────────────────────────────

    private function askPriority(int $chatId): ?string
    {
        $keyboard = [
            'inline_keyboard' => [
                [
                    ['text' => ' Low', 'callback_data' => 'priority:low'],
                    ['text' => ' Medium', 'callback_data' => 'priority:medium'],
                ],
                [
                    ['text' => ' High', 'callback_data' => 'priority:high'],
                    ['text' => ' Urgent', 'callback_data' => 'priority:urgent'],
                ],
            ],
        ];

        return $this->sendMessage($chatId, 'Select priority:', $keyboard);
    }

    private function processPriority(int $chatId, array $state, string $priority): ?string
    {
        $state['data']['priority'] = $priority;
        $state['step'] = 'asset';
        $this->setConversation($chatId, $state);

        return $this->askAsset($chatId);
    }

    // ─── Step: Asset ──────────────────────────────────────────────

    private function askAsset(int $chatId): ?string
    {
        $assets = Asset::orderBy('name')->get(['id', 'name', 'code']);

        $keyboard = ['inline_keyboard' => []];

        foreach ($assets->chunk(2) as $chunk) {
            $row = [];
            foreach ($chunk as $asset) {
                $label = mb_strlen($asset->name) > 25 ? mb_substr($asset->name, 0, 22).'...' : $asset->name;
                $row[] = ['text' => $label, 'callback_data' => "asset_select:{$asset->id}"];
            }
            $keyboard['inline_keyboard'][] = $row;
        }

        $keyboard['inline_keyboard'][] = [
            ['text' => ' Skip Asset', 'callback_data' => 'asset:skip'],
        ];

        $text = $assets->isEmpty()
            ? 'No assets found. Tap Skip Asset to continue.'
            : 'Select an asset:';

        return $this->sendMessage($chatId, $text, $keyboard);
    }

    private function processAssetSelection(int $chatId, array $state, Asset $asset): ?string
    {
        $state['data']['asset'] = ['id' => $asset->id, 'name' => $asset->name];
        $state['step'] = 'location';
        $this->setConversation($chatId, $state);

        return $this->askLocation($chatId);
    }

    private function processAssetSkip(int $chatId, array $state): ?string
    {
        $state['data']['asset'] = null;
        $state['step'] = 'location';
        $this->setConversation($chatId, $state);

        return $this->askLocation($chatId);
    }

    // ─── Step: Location ───────────────────────────────────────────

    private const LOCATIONS_PER_PAGE = 6;

    private function askLocation(int $chatId, int $page = 0): ?string
    {
        $locations = Location::orderBy('name')->get(['id', 'name', 'code']);
        $totalPages = (int) ceil($locations->count() / self::LOCATIONS_PER_PAGE);
        $page = min(max($page, 0), max($totalPages - 1, 0));

        $chunk = $locations->slice($page * self::LOCATIONS_PER_PAGE, self::LOCATIONS_PER_PAGE);

        $keyboard = ['inline_keyboard' => []];

        foreach ($chunk->chunk(2) as $pair) {
            $row = [];
            foreach ($pair as $loc) {
                $label = mb_strlen($loc->name) > 25 ? mb_substr($loc->name, 0, 22).'...' : $loc->name;
                $row[] = ['text' => $label, 'callback_data' => "loc_select:{$loc->id}"];
            }
            $keyboard['inline_keyboard'][] = $row;
        }

        $navRow = [];
        if ($page > 0) {
            $navRow[] = ['text' => '← Prev', 'callback_data' => 'loc_page:'.($page - 1)];
        }
        if ($totalPages > 1) {
            $navRow[] = ['text' => 'Page '.($page + 1)."/{$totalPages}", 'callback_data' => 'loc:nop'];
        }
        if ($page < $totalPages - 1) {
            $navRow[] = ['text' => 'Next →', 'callback_data' => 'loc_page:'.($page + 1)];
        }
        if (! empty($navRow)) {
            $keyboard['inline_keyboard'][] = $navRow;
        }

        $keyboard['inline_keyboard'][] = [
            ['text' => ' Skip Location', 'callback_data' => 'loc:skip'],
        ];

        $text = $locations->isEmpty()
            ? 'No locations found. Tap Skip Location to continue.'
            : 'Select a location:';

        return $this->sendMessage($chatId, $text, $keyboard);
    }

    private function processLocationSelection(int $chatId, array $state, Location $location): ?string
    {
        $state['data']['location'] = ['id' => $location->id, 'name' => $location->name];
        $state['step'] = 'photo';
        $this->setConversation($chatId, $state);

        return $this->askPhoto($chatId);
    }

    private function processLocationSkip(int $chatId, array $state): ?string
    {
        $state['data']['location'] = null;
        $state['step'] = 'photo';
        $this->setConversation($chatId, $state);

        return $this->askPhoto($chatId);
    }

    // ─── Step: Photo ──────────────────────────────────────────────

    private function askPhoto(int $chatId): ?string
    {
        $keyboard = [
            'inline_keyboard' => [
                [
                    ['text' => ' Skip Photo', 'callback_data' => 'photo:skip'],
                ],
            ],
        ];

        return $this->sendMessage($chatId, 'Send a photo (or tap Skip Photo):', $keyboard);
    }

    private function processPhotoUpload(int $chatId, array $state, array $photos): ?string
    {
        $photo = $this->downloadTelegramPhoto($photos);
        if (! $photo) {
            return $this->sendMessage($chatId, 'Failed to download photo. Try again or tap Skip Photo:');
        }

        $state['data']['photo_path'] = $photo;
        $state['step'] = 'confirm';
        $this->setConversation($chatId, $state);

        return $this->showConfirm($chatId, $state);
    }

    private function processPhotoSkip(int $chatId, array $state): ?string
    {
        $state['data']['photo_path'] = '';
        $state['step'] = 'confirm';
        $this->setConversation($chatId, $state);

        return $this->showConfirm($chatId, $state);
    }

    // ─── Step: Confirm ────────────────────────────────────────────

    private function showConfirm(int $chatId, array $state): ?string
    {
        $d = $state['data'];

        $assetName = is_array($d['asset'] ?? null) ? $d['asset']['name'] : '-';
        $locName = is_array($d['location'] ?? null) ? $d['location']['name'] : '-';

        $summary = "Confirm work order:\n\n"
            ."Title: {$d['title']}\n"
            ."Priority: {$d['priority']}\n"
            ."Asset: {$assetName}\n"
            ."Location: {$locName}\n"
            .'Photo: '.($d['photo_path'] ? 'Attached' : 'None');

        $keyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '✅ Confirm', 'callback_data' => 'wo_confirm:1'],
                    ['text' => ' Cancel', 'callback_data' => 'wo_cancel:1'],
                ],
            ],
        ];

        return $this->sendMessage($chatId, $summary, $keyboard);
    }

    private function processConfirm(int $chatId, array $state): ?string
    {
        $d = $state['data'];

        try {
            $data = [
                'requester_id' => $state['user_id'],
                'title' => $d['title'],
                'priority' => $d['priority'],
                'status' => 'pending_dept_head',
            ];

            if (is_array($d['asset'] ?? null)) {
                $data['asset_id'] = $d['asset']['id'];
            }
            if (is_array($d['location'] ?? null)) {
                $data['location_id'] = $d['location']['id'];
            }

            if (! empty($d['photo_path'])) {
                $data['photo'] = $d['photo_path'];
            }

            WorkOrder::create($data);

            $this->clearConversation($chatId);

            return $this->sendMessage($chatId, "✅ Work order created!\nTitle: {$d['title']}\nPriority: {$d['priority']}\nStatus: Pending Dept Head Approval");
        } catch (\Exception $e) {
            return $this->sendMessage($chatId, "Error creating work order: {$e->getMessage()}\nStart again with /workorder");
        }
    }

    private function processCancel(int $chatId): ?string
    {
        $this->clearConversation($chatId);

        return $this->sendMessage($chatId, 'Work order creation cancelled.');
    }

    // ─── File Download ────────────────────────────────────────────

    private function downloadTelegramFile(string $fileId, string $storeSubdir): ?string
    {
        $response = Http::withoutVerifying()->post("{$this->apiUrl}/getFile", [
            'file_id' => $fileId,
        ]);

        if (! $response->successful()) {
            return null;
        }

        $filePath = $response->json('result.file_path');
        if (! $filePath) {
            return null;
        }

        $downloadUrl = "https://api.telegram.org/file/bot{$this->token}/{$filePath}";

        $fileResponse = Http::withoutVerifying()->get($downloadUrl);
        if (! $fileResponse->successful()) {
            return null;
        }

        $dir = storage_path("app/public/{$storeSubdir}");
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $filename = 'telegram_'.Str::random(20).'_'.basename($filePath);
        $storePath = "{$storeSubdir}/{$filename}";

        file_put_contents(storage_path("app/public/{$storePath}"), $fileResponse->body());

        return $storePath;
    }

    private function downloadTelegramPhoto(array $photos): ?string
    {
        $fileId = $photos[count($photos) - 1]['file_id'] ?? null;
        if (! $fileId) {
            return null;
        }

        return $this->downloadTelegramFile($fileId, 'work-order-photos');
    }

    // ─── Callback Query Handling ───────────────────────────────────

    private function handleCallbackQuery(array $callback): ?string
    {
        try {
            $data = $callback['data'] ?? '';
            $chatId = $callback['message']['chat']['id'];
            $messageId = $callback['message']['message_id'];
            $callbackId = $callback['id'];

            $telegramLink = TelegramLink::where('chat_id', $chatId)->whereNotNull('linked_at')->first();
            if (! $telegramLink) {
                return $this->answerCallbackQuery($callbackId, 'Please link your account first.');
            }

            $user = $telegramLink->user;

            TenantContext::set($user->tenant_id);

            if (str_starts_with($data, 'priority:')) {
                $this->editMessageReplyMarkup($chatId, $messageId);

                return $this->handlePriorityCallback($chatId, $user, $callbackId, $data);
            }

            if (str_starts_with($data, 'asset_select:')) {
                $this->editMessageReplyMarkup($chatId, $messageId);

                return $this->handleAssetSelectCallback($chatId, $callbackId, $data);
            }

            if ($data === 'asset:skip') {
                $this->editMessageReplyMarkup($chatId, $messageId);

                return $this->handleAssetSkipCallback($chatId, $callbackId);
            }

            if (str_starts_with($data, 'loc_select:')) {
                $this->editMessageReplyMarkup($chatId, $messageId);

                return $this->handleLocationSelectCallback($chatId, $callbackId, $data);
            }

            if (str_starts_with($data, 'loc_page:')) {
                $this->editMessageReplyMarkup($chatId, $messageId);

                return $this->handleLocationPageCallback($chatId, $callbackId, $data);
            }

            if ($data === 'loc:skip') {
                $this->editMessageReplyMarkup($chatId, $messageId);

                return $this->handleLocationSkipCallback($chatId, $callbackId);
            }

            if ($data === 'loc:nop') {
                return $this->answerCallbackQuery($callbackId, '');
            }

            if ($data === 'photo:skip') {
                $this->editMessageReplyMarkup($chatId, $messageId);

                return $this->handlePhotoSkipCallback($chatId, $callbackId);
            }

            if ($data === 'wo_confirm:1') {
                $this->editMessageReplyMarkup($chatId, $messageId);

                return $this->handleConfirmCallback($chatId, $callbackId);
            }

            if ($data === 'wo_cancel:1') {
                $this->editMessageReplyMarkup($chatId, $messageId);

                return $this->handleCancelCallback($chatId, $callbackId);
            }

            // Wo cmd callbacks
            if (str_starts_with($data, 'wo_cmd_assign:')) {
                $this->editMessageReplyMarkup($chatId, $messageId);
                $woId = (int) substr($data, 14);
                $wo = WorkOrder::find($woId);
                if (! $wo) {
                    return $this->answerCallbackQuery($callbackId, 'Work order not found.');
                }
                $this->answerCallbackQuery($callbackId, '');

                return $this->startWoAssign($chatId, $user, $wo);
            }

            if (str_starts_with($data, 'wo_cmd_note:')) {
                $this->editMessageReplyMarkup($chatId, $messageId);
                $woId = (int) substr($data, 12);
                $wo = WorkOrder::find($woId);
                if (! $wo) {
                    return $this->answerCallbackQuery($callbackId, 'Work order not found.');
                }
                $this->answerCallbackQuery($callbackId, '');

                return $this->startWoNote($chatId, $user, $wo);
            }

            if (str_starts_with($data, 'wo_cmd_photo:')) {
                $this->editMessageReplyMarkup($chatId, $messageId);
                $woId = (int) substr($data, 13);
                $wo = WorkOrder::find($woId);
                if (! $wo) {
                    return $this->answerCallbackQuery($callbackId, 'Work order not found.');
                }
                $this->answerCallbackQuery($callbackId, '');

                return $this->startWoPhoto($chatId, $user, $wo);
            }

            if (str_starts_with($data, 'wo_cmd_date_today:')) {
                $this->editMessageReplyMarkup($chatId, $messageId);
                $woId = (int) substr($data, 17);
                $state = $this->getCmdConversation($chatId);
                if (! $state) {
                    return $this->answerCallbackQuery($callbackId, 'Session expired.');
                }
                $this->answerCallbackQuery($callbackId, '');

                return $this->processWoAssignDate($chatId, $state, now()->format('Y-m-d'));
            }

            if (str_starts_with($data, 'wo_cmd_shift:')) {
                $this->editMessageReplyMarkup($chatId, $messageId);
                $parts = explode(':', $data);
                $shift = $parts[2] ?? '';
                $state = $this->getCmdConversation($chatId);
                if (! $state) {
                    return $this->answerCallbackQuery($callbackId, 'Session expired.');
                }
                $this->answerCallbackQuery($callbackId, '');

                return $this->processWoAssignShiftCallback($chatId, $messageId, $state, $shift);
            }

            if (str_starts_with($data, 'wo_cmd_tech:')) {
                $this->editMessageReplyMarkup($chatId, $messageId);
                $parts = explode(':', $data);
                $techId = (int) ($parts[2] ?? 0);
                $tech = User::find($techId);
                if (! $tech) {
                    return $this->answerCallbackQuery($callbackId, 'Technician not found.');
                }
                $state = $this->getCmdConversation($chatId);
                if (! $state) {
                    return $this->answerCallbackQuery($callbackId, 'Session expired.');
                }
                $this->answerCallbackQuery($callbackId, '');

                return $this->processWoAssignTechCallback($chatId, $messageId, $state, $tech);
            }

            if (str_starts_with($data, 'wo_cmd_confirm_assign:')) {
                $this->editMessageReplyMarkup($chatId, $messageId);
                $state = $this->getCmdConversation($chatId);
                if (! $state) {
                    return $this->answerCallbackQuery($callbackId, 'Session expired.');
                }
                $this->answerCallbackQuery($callbackId, 'Assigning...');

                return $this->processWoAssignConfirm($chatId, $state);
            }

            if (str_starts_with($data, 'wo_cmd_cancel:')) {
                $this->editMessageReplyMarkup($chatId, $messageId);
                $this->clearCmdConversation($chatId);

                return $this->answerCallbackQuery($callbackId, 'Cancelled');
            }

            // Inputec type selection
            if (str_starts_with($data, 'inputec_type:')) {
                $this->editMessageReplyMarkup($chatId, $messageId);
                $type = substr($data, 13);
                $state = $this->getInputecConversation($chatId);
                if (! $state) {
                    return $this->answerCallbackQuery($callbackId, 'Session expired.');
                }
                $this->answerCallbackQuery($callbackId, '');

                return $this->handleInputecText($chatId, $user, $type, $state);
            }

            // Inputds confirm/cancel
            if ($data === 'inputds:confirm') {
                $this->editMessageReplyMarkup($chatId, $messageId);

                return $this->processInputdsConfirm($chatId, $callbackId);
            }

            if ($data === 'inputds:cancel') {
                $this->editMessageReplyMarkup($chatId, $messageId);
                $this->clearInputdsConversation($chatId);

                return $this->answerCallbackQuery($callbackId, 'Cancelled');
            }

            // Inputec confirm/cancel
            if ($data === 'inputec:confirm') {
                $this->editMessageReplyMarkup($chatId, $messageId);

                return $this->processInputecConfirm($chatId, $callbackId);
            }

            if ($data === 'inputec:cancel') {
                $this->editMessageReplyMarkup($chatId, $messageId);
                $this->clearInputecConversation($chatId);

                return $this->answerCallbackQuery($callbackId, 'Cancelled');
            }

            // Inputevent venue selection
            if (str_starts_with($data, 'inputevent_venue:')) {
                $this->editMessageReplyMarkup($chatId, $messageId);
                $value = substr($data, 17);
                if ($value === 'skip') {
                    $state = $this->getInputeventConversation($chatId);
                    if (! $state) {
                        return $this->answerCallbackQuery($callbackId, 'Session expired.');
                    }
                    $state['data']['venue'] = null;
                    $state['step'] = 'type';
                    $this->setInputeventConversation($chatId, $state);
                    $this->answerCallbackQuery($callbackId, '');

                    return $this->askInputeventType($chatId, $state);
                }
                $room = Location::find((int) $value);
                if (! $room) {
                    return $this->answerCallbackQuery($callbackId, 'Venue not found.');
                }
                $state = $this->getInputeventConversation($chatId);
                if (! $state) {
                    return $this->answerCallbackQuery($callbackId, 'Session expired.');
                }
                $state['data']['venue'] = $room->name;
                $state['step'] = 'type';
                $this->setInputeventConversation($chatId, $state);
                $this->answerCallbackQuery($callbackId, '');

                return $this->askInputeventType($chatId, $state);
            }

            // Inputevent type selection
            if (str_starts_with($data, 'inputevent_type:')) {
                $this->editMessageReplyMarkup($chatId, $messageId);
                $value = substr($data, 16);
                $valid = ['half_day', 'full_day', 'full_board'];
                $state = $this->getInputeventConversation($chatId);
                if (! $state) {
                    return $this->answerCallbackQuery($callbackId, 'Session expired.');
                }
                if ($value === 'skip') {
                    $state['data']['type'] = null;
                } elseif (in_array($value, $valid, true)) {
                    $state['data']['type'] = $value;
                } else {
                    return $this->answerCallbackQuery($callbackId, 'Invalid type.');
                }
                $state['step'] = 'pax';
                $this->setInputeventConversation($chatId, $state);
                $this->answerCallbackQuery($callbackId, '');

                return $this->sendMessage($chatId, '👥 Number of attendees? (number, or /skip):');
            }

            // Inputevent confirm/cancel
            if ($data === 'inputevent:confirm') {
                $this->editMessageReplyMarkup($chatId, $messageId);

                return $this->processInputeventConfirm($chatId, $callbackId);
            }

            if ($data === 'inputevent:cancel') {
                $this->editMessageReplyMarkup($chatId, $messageId);
                $this->clearInputeventConversation($chatId);

                return $this->answerCallbackQuery($callbackId, 'Cancelled');
            }

            // Store rcv item selection
            if (str_starts_with($data, 'store_rcv_item:')) {
                $this->editMessageReplyMarkup($chatId, $messageId);
                $itemId = (int) substr($data, 15);
                $item = StoreItem::find($itemId);
                if (! $item) {
                    return $this->answerCallbackQuery($callbackId, 'Item not found.');
                }
                $state = $this->getStoreRcvConversation($chatId);
                if (! $state) {
                    return $this->answerCallbackQuery($callbackId, 'Session expired.');
                }
                $state['data']['item_id'] = $item->id;
                $state['data']['item_name'] = $item->name;
                $state['step'] = 'qty';
                $this->setStoreRcvConversation($chatId, $state);
                $this->answerCallbackQuery($callbackId, '');

                return $this->sendMessage($chatId, "Item: {$item->name} ({$item->stock} {$item->unit} in stock)\nQty received? (number, min 1):");
            }

            // Store rcv confirm/cancel
            if ($data === 'store_rcv:confirm') {
                $this->editMessageReplyMarkup($chatId, $messageId);

                return $this->processStoreRcvConfirm($chatId, $callbackId);
            }
            if ($data === 'store_rcv:cancel') {
                $this->editMessageReplyMarkup($chatId, $messageId);
                $this->clearStoreRcvConversation($chatId);

                return $this->answerCallbackQuery($callbackId, 'Cancelled');
            }

            // Store req item selection
            if (str_starts_with($data, 'store_req_item:')) {
                $this->editMessageReplyMarkup($chatId, $messageId);
                $itemId = (int) substr($data, 15);
                $item = StoreItem::find($itemId);
                if (! $item) {
                    return $this->answerCallbackQuery($callbackId, 'Item not found.');
                }
                $state = $this->getStoreReqConversation($chatId);
                if (! $state) {
                    return $this->answerCallbackQuery($callbackId, 'Session expired.');
                }
                $state['data']['item_id'] = $item->id;
                $state['data']['item_name'] = $item->name;
                $state['step'] = 'qty';
                $this->setStoreReqConversation($chatId, $state);
                $this->answerCallbackQuery($callbackId, '');

                return $this->sendMessage($chatId, "Item: {$item->name} ({$item->stock} {$item->unit} in stock)\nQty requested? (number, min 1):");
            }

            // Store req work order selection
            if (str_starts_with($data, 'store_req_wo:')) {
                $this->editMessageReplyMarkup($chatId, $messageId);
                $value = substr($data, 13);
                $state = $this->getStoreReqConversation($chatId);
                if (! $state) {
                    return $this->answerCallbackQuery($callbackId, 'Session expired.');
                }
                if ($value === 'skip') {
                    $state['data']['work_order_id'] = null;
                } else {
                    $woId = (int) $value;
                    $wo = WorkOrder::find($woId);
                    if (! $wo) {
                        return $this->answerCallbackQuery($callbackId, 'Work order not found.');
                    }
                    $state['data']['work_order_id'] = $wo->id;
                }
                $state['step'] = 'date';
                $this->setStoreReqConversation($chatId, $state);
                $this->answerCallbackQuery($callbackId, '');

                return $this->sendMessage($chatId, '📅 Request date (YYYY-MM-DD) or /skip for today:');
            }

            // Store req confirm/cancel
            if ($data === 'store_req:confirm') {
                $this->editMessageReplyMarkup($chatId, $messageId);

                return $this->processStoreReqConfirm($chatId, $callbackId);
            }
            if ($data === 'store_req:cancel') {
                $this->editMessageReplyMarkup($chatId, $messageId);
                $this->clearStoreReqConversation($chatId);

                return $this->answerCallbackQuery($callbackId, 'Cancelled');
            }

            // Store adj item selection
            if (str_starts_with($data, 'store_adj_item:')) {
                $this->editMessageReplyMarkup($chatId, $messageId);
                $itemId = (int) substr($data, 15);
                $item = StoreItem::find($itemId);
                if (! $item) {
                    return $this->answerCallbackQuery($callbackId, 'Item not found.');
                }
                $state = $this->getStoreAdjConversation($chatId);
                if (! $state) {
                    return $this->answerCallbackQuery($callbackId, 'Session expired.');
                }
                $state['data']['item_id'] = $item->id;
                $state['data']['item_name'] = $item->name;
                $state['step'] = 'qty';
                $this->setStoreAdjConversation($chatId, $state);
                $this->answerCallbackQuery($callbackId, '');

                return $this->sendMessage($chatId, "Item: {$item->name} ({$item->stock} {$item->unit} in stock)\nQty? (positive=add, negative=remove, cannot be 0):");
            }

            // Store adj confirm/cancel
            if ($data === 'store_adj:confirm') {
                $this->editMessageReplyMarkup($chatId, $messageId);

                return $this->processStoreAdjConfirm($chatId, $callbackId);
            }
            if ($data === 'store_adj:cancel') {
                $this->editMessageReplyMarkup($chatId, $messageId);
                $this->clearStoreAdjConversation($chatId);

                return $this->answerCallbackQuery($callbackId, 'Cancelled');
            }

            // Legacy approve/reject callbacks
            $parts = explode(':', $data);

            if (count($parts) !== 2 || ! is_numeric($parts[1])) {
                return $this->answerCallbackQuery($callbackId, 'Invalid callback data.');
            }

            $action = $parts[0];
            $workOrderId = (int) $parts[1];

            Log::debug('Telegram callback', [
                'action' => $action,
                'work_order_id' => $workOrderId,
                'user_id' => $user->id,
                'user_name' => $user->name,
                'user_role' => $user->getRoleNames()->first(),
            ]);

            $workOrder = WorkOrder::find($workOrderId);
            if ($workOrder) {
                Log::debug('WorkOrder status', ['id' => $workOrder->id, 'status' => $workOrder->status]);
            }
            if (! $workOrder) {
                $this->editMessageReplyMarkup($chatId, $messageId);

                return $this->answerCallbackQuery($callbackId, 'Work order not found.');
            }

            $service = app(WorkOrderService::class);

            try {
                if ($action === 'start_work') {
                    $latestAssignment = $workOrder->technicianAssignments()->latest()->first();
                    if (! $latestAssignment || $latestAssignment->technician_id !== $user->id) {
                        return $this->answerCallbackQuery($callbackId, 'You are not the assigned technician.');
                    }
                    if ($workOrder->status !== 'assigned') {
                        return $this->answerCallbackQuery($callbackId, 'Work order is not in assigned status.');
                    }
                    $service->transition($workOrder, 'in_progress');
                    $latestAssignment->update(['status' => 'in_progress']);
                    $this->editMessageText($chatId, $messageId, $callback['message']['text']."\n\n▶️ Work started by {$user->name}");
                    $this->editMessageReplyMarkup($chatId, $messageId);
                    $this->answerCallbackQuery($callbackId, 'Work started!');
                } elseif ($action === 'approve') {
                    $service->approve($workOrder, $user);
                    $this->editMessageText($chatId, $messageId, $callback['message']['text']."\n\n✅ Approved by {$user->name}");
                    $this->editMessageReplyMarkup($chatId, $messageId);
                    $this->answerCallbackQuery($callbackId, 'Approved!');
                } elseif ($action === 'reject') {
                    $this->editMessageReplyMarkup($chatId, $messageId);
                    $this->sendMessage($chatId, "Please provide your reason for rejecting work order #{$workOrderId}:\n/reject {$workOrderId} <your reason>");
                    $this->answerCallbackQuery($callbackId, 'Please send the rejection reason.');
                } else {
                    $this->answerCallbackQuery($callbackId, 'Unknown action.');
                }
            } catch (ValidationException $e) {
                $firstError = collect($e->errors())->flatten()->first() ?? 'Error';
                if (str_contains($firstError, 'Completion target date')) {
                    $this->editMessageReplyMarkup($chatId, $messageId);
                    $this->sendMessage($chatId, "Please set a completion target date:\n/approve {$workOrderId} YYYY-MM-DD");
                    $this->answerCallbackQuery($callbackId, 'Target date required. Use /approve <id> <date>');
                } else {
                    $this->answerCallbackQuery($callbackId, $firstError);
                }
            } catch (\Exception $e) {
                $this->answerCallbackQuery($callbackId, $e->getMessage());
            }

            return null;
        } catch (\Throwable $e) {
            $chatId = $callback['message']['chat']['id'] ?? 0;
            if ($chatId) {
                $this->sendMessage($chatId, '⚠️ An error occurred. Please try again or use /restart.');
            }
            Log::error('Telegram callback error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return null;
        } finally {
            TenantContext::clear();
        }
    }

    private function handlePriorityCallback(int $chatId, User $user, string $callbackId, string $data): ?string
    {
        $priority = str_replace('priority:', '', $data);

        if (! in_array($priority, self::ALLOWED_PRIORITIES, true)) {
            $this->answerCallbackQuery($callbackId, 'Invalid priority.');

            return null;
        }

        $state = $this->getConversation($chatId);
        if (! $state) {
            $this->answerCallbackQuery($callbackId, 'Session expired. Start again with /workorder');

            return null;
        }

        $this->answerCallbackQuery($callbackId, "Priority set to {$priority}");

        return $this->processPriority($chatId, $state, $priority);
    }

    private function handleAssetSelectCallback(int $chatId, string $callbackId, string $data): ?string
    {
        $assetId = (int) str_replace('asset_select:', '', $data);
        $asset = Asset::find($assetId);

        if (! $asset) {
            $this->answerCallbackQuery($callbackId, 'Asset not found.');

            return null;
        }

        $state = $this->getConversation($chatId);
        if (! $state) {
            $this->answerCallbackQuery($callbackId, 'Session expired.');

            return null;
        }

        $this->answerCallbackQuery($callbackId, "Selected: {$asset->name}");

        return $this->processAssetSelection($chatId, $state, $asset);
    }

    private function handleAssetSkipCallback(int $chatId, string $callbackId): ?string
    {
        $state = $this->getConversation($chatId);
        if (! $state) {
            $this->answerCallbackQuery($callbackId, 'Session expired.');

            return null;
        }

        $this->answerCallbackQuery($callbackId, 'Asset skipped');

        return $this->processAssetSkip($chatId, $state);
    }

    private function handleLocationSelectCallback(int $chatId, string $callbackId, string $data): ?string
    {
        $locId = (int) str_replace('loc_select:', '', $data);
        $location = Location::find($locId);

        if (! $location) {
            $this->answerCallbackQuery($callbackId, 'Location not found.');

            return null;
        }

        $state = $this->getConversation($chatId);
        if (! $state) {
            $this->answerCallbackQuery($callbackId, 'Session expired.');

            return null;
        }

        $this->answerCallbackQuery($callbackId, "Selected: {$location->name}");

        return $this->processLocationSelection($chatId, $state, $location);
    }

    private function handleLocationPageCallback(int $chatId, string $callbackId, string $data): ?string
    {
        $page = (int) str_replace('loc_page:', '', $data);
        $this->answerCallbackQuery($callbackId, '');

        return $this->askLocation($chatId, $page);
    }

    private function handleLocationSkipCallback(int $chatId, string $callbackId): ?string
    {
        $state = $this->getConversation($chatId);
        if (! $state) {
            $this->answerCallbackQuery($callbackId, 'Session expired.');

            return null;
        }

        $this->answerCallbackQuery($callbackId, 'Location skipped');

        return $this->processLocationSkip($chatId, $state);
    }

    private function handlePhotoSkipCallback(int $chatId, string $callbackId): ?string
    {
        $state = $this->getConversation($chatId);
        if (! $state) {
            $this->answerCallbackQuery($callbackId, 'Session expired.');

            return null;
        }

        $this->answerCallbackQuery($callbackId, 'Photo skipped');

        return $this->processPhotoSkip($chatId, $state);
    }

    private function handleConfirmCallback(int $chatId, string $callbackId): ?string
    {
        $state = $this->getConversation($chatId);
        if (! $state) {
            $this->answerCallbackQuery($callbackId, 'Session expired.');

            return null;
        }

        $this->answerCallbackQuery($callbackId, 'Creating work order...');

        return $this->processConfirm($chatId, $state);
    }

    private function handleCancelCallback(int $chatId, string $callbackId): ?string
    {
        $this->answerCallbackQuery($callbackId, 'Cancelled');

        return $this->processCancel($chatId);
    }

    // ─── Text Commands ─────────────────────────────────────────────

    private function handleStart(int $chatId, string $text): ?string
    {
        $parts = explode(' ', $text, 2);
        $code = $parts[1] ?? '';

        if (empty($code)) {
            return $this->sendMessage($chatId, 'Please provide your linking code: /start <code>');
        }

        $user = $this->verifyLinkCode($code, $chatId);
        if (! $user) {
            $existing = TelegramLink::where('chat_id', $chatId)->whereNotNull('linked_at')->with('user')->first();
            if ($existing) {
                return $this->sendMessage($chatId, "This Telegram account is already linked to {$existing->user->name}. Unlink from the app first.");
            }

            return $this->sendMessage($chatId, 'Invalid or expired code. Generate a new one in the app.');
        }

        return $this->sendMessage($chatId, "Account linked successfully! Welcome, {$user->name}.");
    }

    private function handleUnlink(int $chatId, User $user): ?string
    {
        $link = $user->telegramLink()->whereNotNull('linked_at')->first();
        if ($link) {
            $link->update(['chat_id' => null, 'linked_at' => null, 'link_code' => null, 'link_code_expires_at' => null]);

            return $this->sendMessage($chatId, '✅ Telegram account unlinked. You can link a different account anytime.');
        }

        return $this->sendMessage($chatId, 'Your account is not linked to Telegram.');
    }

    private function handleRestart(int $chatId): ?string
    {
        $this->clearConversation($chatId);
        $this->clearCmdConversation($chatId);
        $this->clearInputdsConversation($chatId);
        $this->clearInputecConversation($chatId);
        $this->clearInputeventConversation($chatId);
        $this->clearStoreRcvConversation($chatId);
        $this->clearStoreReqConversation($chatId);
        $this->clearStoreAdjConversation($chatId);

        $text = "🔄 Session restarted.\n\nAvailable commands:\n"
            ."/workorder - Create a work order\n"
            ."/wo#[id] - View work order detail\n"
            ."/pending - Pending tasks\n"
            ."/myorders - My work orders\n"
            ."/event - Upcoming events (7 days)\n"
            ."/event#[id] - Event detail\n"
            ."/occ - Occupancy report\n"
            ."/utiYYMMDD - Utilities report\n"
            ."/inputds - Input daily statistics\n"
            ."/inputec - Input utility consumption\n"
            ."/inputevent - Create event\n"
            ."/rcv - Create store receiving\n"
            ."/req - Create store request\n"
            ."/adj - Create stock adjustment\n"
            ."/myschedule - My schedule\n"
            ."/myroster - My roster (7 days)\n"
            ."/myroster#[yymmdd] - My roster for a date\n"
            ."/teamroster - Team roster (7 days)\n"
            ."/teamroster#[yymmdd] - Team roster for a date\n"
            ."/report [notes] - Daily log\n"
            ."/unlink - Unlink Telegram\n"
            ."/cmdlist - Show all commands\n"
            .'/restart - Restart session';

        return $this->sendMessage($chatId, $text);
    }

    private function handleCmdList(int $chatId): ?string
    {
        $text = "📋 Available commands:\n"
            ."\n🔧 Work Orders\n"
            ."/workorder - Create a work order\n"
            ."/wo#[id] - View work order detail\n"
            ."/myorders - My work orders\n"
            ."/pending - Pending tasks / approvals\n"
            ."/approve [id] - Approve a work order\n"
            ."/reject [id] [reason] - Reject a work order\n"
            ."/update [id] [status] - Update work order status\n"
            ."\n📅 Events & Stats\n"
            ."/event - Upcoming events (7 days)\n"
            ."/event#[id] - Event detail\n"
            ."/inputevent - Create calendar event\n"
            ."/inputds - Input daily statistics\n"
            ."/occ - Occupancy report\n"
            ."\n⚡ Utilities\n"
            ."/utiYYMMDD - Utilities consumption report\n"
            ."/inputec - Input utility consumption\n"
            ."\n👤 Account & Roster\n"
            ."/myschedule - My work schedule\n"
            ."/myroster - My roster (7 days)\n"
            ."/myroster#[yymmdd] - My roster for a date\n"
            ."/teamroster - Team roster (7 days)\n"
            ."/teamroster#[yymmdd] - Team roster for a date\n"
            ."/report [notes] - Daily log report\n"
            ."/unlink - Unlink Telegram account\n"
            ."\n📦 Store\n"
            ."/rcv - Create store receiving\n"
            ."/req - Create store request\n"
            ."/adj - Create stock adjustment\n"
            ."\n🔄 System\n"
            ."/cmdlist - Show this command list\n"
            .'/restart - Restart session';

        return $this->sendMessage($chatId, $text);
    }

    private function handleCreateCommand(int $chatId, User $user, string $text): ?string
    {
        // Handle both /workorder and /work order (two-word command)
        if (str_starts_with($text, '/work order')) {
            // Strip "/work order " (13 chars including space) to get arguments
            $afterCommand = trim(substr($text, 12));
        } else {
            $afterCommand = trim(substr($text, strpos($text, ' ') ?: strlen($text)));
        }

        if (empty($afterCommand)) {
            return $this->askTitle($chatId, $user);
        }

        $args = explode(' ', $afterCommand, 2);
        $firstArg = $args[0];
        $secondArg = $args[1] ?? '';

        if (in_array($firstArg, self::ALLOWED_PRIORITIES, true) && ! empty($secondArg)) {
            $priority = $firstArg;
            $title = $secondArg;
        } else {
            $priority = 'medium';
            $title = $afterCommand;
        }

        if (mb_strlen($title) > 255) {
            return $this->sendMessage($chatId, 'Title is too long (max 255 characters).');
        }

        try {
            WorkOrder::create([
                'requester_id' => $user->id,
                'title' => $title,
                'priority' => $priority,
                'status' => 'pending_dept_head',
            ]);

            return $this->sendMessage($chatId, "✅ Work order created!\nTitle: {$title}\nPriority: {$priority}\nStatus: Pending Dept Head Approval");
        } catch (\Exception $e) {
            return $this->sendMessage($chatId, "Error creating work order: {$e->getMessage()}");
        }
    }

    // ─── Wo Cmd Detail ──────────────────────────────────────────────

    private function handleWoDetail(int $chatId, User $user, string $text): ?string
    {
        $id = trim(substr($text, 4));
        if (! is_numeric($id)) {
            return $this->sendMessage($chatId, 'Usage: /wo#<id> (e.g. /wo#5)');
        }

        $workOrder = WorkOrder::with('requester.department', 'asset', 'location', 'technicianAssignments.technician', 'approvals.approver', 'photos')->find((int) $id);
        if (! $workOrder) {
            return $this->sendMessage($chatId, "Work order #{$id} not found.");
        }

        $detail = $this->formatWoDetail($workOrder);
        $keyboard = $this->buildWoActionKeyboard($user, $workOrder);

        $result = null;

        if ($workOrder->photo) {
            $result = $this->sendPhoto($chatId, $workOrder->photo, $detail, $keyboard);
        } elseif ($workOrder->photos->isNotEmpty()) {
            $result = $this->sendPhoto($chatId, $workOrder->photos->first()->photo_path, $detail, $keyboard);
        } else {
            $result = $this->sendMessage($chatId, $detail, $keyboard);
        }

        if ($workOrder->completion_photo) {
            $this->sendPhoto($chatId, $workOrder->completion_photo, '📸 Completion Photo', $keyboard);
        }

        return $result;
    }

    private function formatWoDetail(WorkOrder $wo): string
    {
        $lines = [
            "📋 Work Order #{$wo->id}",
            "Title: {$wo->title}",
            "Status: {$wo->status}",
            "Requester: {$wo->requester?->name}",
            'Priority: '.ucfirst($wo->priority),
            'Asset: '.($wo->asset ? $wo->asset->name.($wo->asset->code ? " ({$wo->asset->code})" : '') : 'N/A'),
            'Location: '.($wo->location?->name ?? 'N/A'),
            'Created: '.($wo->created_at?->format('d M Y, H:i') ?? 'N/A'),
        ];

        if ($wo->completion_target_date) {
            $lines[] = 'Target: '.Carbon::parse($wo->completion_target_date)->format('d M Y');
        }

        if (in_array($wo->status, ['completed', 'closed'], true)) {
            $lines[] = 'Completed: '.($wo->completed_at?->format('d M Y, H:i') ?? 'N/A');

            if ($wo->approvals->isNotEmpty()) {
                $lines[] = '';
                $lines[] = 'Approval Timeline:';
                foreach ($wo->approvals->sortBy('created_at') as $a) {
                    $lines[] = "  Level {$a->level}: {$a->action} by {$a->approver?->name} - {$a->created_at->format('d M Y, H:i')}";
                }
            }

            if ($wo->technician_notes) {
                $lines[] = '';
                $lines[] = 'Technician Notes:';
                $lines[] = $wo->technician_notes;
            }

            if ($wo->technicianAssignments->isNotEmpty()) {
                $lines[] = '';
                $lines[] = 'Assignments:';
                foreach ($wo->technicianAssignments as $ta) {
                    $lines[] = "  {$ta->technician?->name} - {$ta->scheduled_date} ({$ta->shift}) [{$ta->status}]";
                }
            }
        }

        return implode("\n", $lines);
    }

    private function buildWoActionKeyboard(User $user, WorkOrder $workOrder): ?array
    {
        $role = $user->getRoleNames()->first();
        $woId = $workOrder->id;
        $reviewerRole = app(WorkOrderService::class)->reviewerRole($workOrder, $workOrder->status);

        return match ($workOrder->status) {
            'pending_dept_head', 'pending_check' => $role === $reviewerRole && $user->department_id === $workOrder->requester->department_id
                ? $this->inlineBtn([['text' => '✅ Approve', 'callback_data' => "approve:{$woId}"], ['text' => '❌ Reject', 'callback_data' => "reject:{$woId}"]])
                : null,
            'pending_chief_engineer' => $role === 'chief-engineer'
                ? $this->inlineBtn([['text' => '✅ Approve', 'callback_data' => "approve:{$woId}"], ['text' => '❌ Reject', 'callback_data' => "reject:{$woId}"]])
                : null,
            'approved' => $role === 'chief-engineer'
                ? $this->inlineBtn([['text' => '📋 Assign', 'callback_data' => "wo_cmd_assign:{$woId}"]])
                : null,
            'assigned' => $workOrder->technicianAssignments()->latest()->first()?->technician_id === $user->id
                ? $this->inlineBtn([['text' => '▶️ Start Work', 'callback_data' => "start_work:{$woId}"]])
                : null,
            'in_progress' => $workOrder->technicianAssignments()->latest()->first()?->technician_id === $user->id
                ? $this->inlineBtn([['text' => '📝 Add Note', 'callback_data' => "wo_cmd_note:{$woId}"], ['text' => '📷 Add Photo', 'callback_data' => "wo_cmd_photo:{$woId}"]])
                : null,
            default => null,
        };
    }

    private function inlineBtn(array $row): array
    {
        return ['inline_keyboard' => [$row]];
    }

    private function formatTimeBlocks(?array $timeBlocks): string
    {
        if (! $timeBlocks) {
            return '';
        }

        return collect($timeBlocks)
            ->map(fn ($b) => ($b['in'] ?? '').'-'.($b['out'] ?? ''))
            ->implode(', ');
    }

    private function parseDateFromHash(string $text): ?Carbon
    {
        // Extract yymmdd after # (e.g. /myroster#250722)
        if (! preg_match('/#(\d{6})\b/', $text, $m)) {
            return null;
        }

        $yy = substr($m[1], 0, 2);
        $mm = substr($m[1], 2, 2);
        $dd = substr($m[1], 4, 2);

        return Carbon::createFromFormat('y-m-d', "{$yy}-{$mm}-{$dd}")->startOfDay();
    }

    // ─── Wo Cmd Conversation Dispatch ─────────────────────────────

    private function handleWoCmdConversationText(int $chatId, User $user, string $text, array $state): ?string
    {
        if (strtolower($text) === 'cancel' || str_starts_with($text, '/cancel')) {
            $this->clearCmdConversation($chatId);

            return $this->sendMessage($chatId, 'Action cancelled.');
        }

        $action = $state['action'] ?? '';
        $step = $state['step'] ?? '';

        if ($action === 'assign' && $step === 'date') {
            return $this->processWoAssignDate($chatId, $state, $text);
        }

        if ($action === 'note' && $step === 'text') {
            return $this->processWoNoteText($chatId, $state, $text);
        }

        $this->clearCmdConversation($chatId);

        return $this->sendMessage($chatId, 'Session expired. Use /wo#<id> again.');
    }

    // ─── Assign Flow ─────────────────────────────────────────────

    private function startWoAssign(int $chatId, User $user, WorkOrder $workOrder): ?string
    {
        $this->setCmdConversation($chatId, [
            'step' => 'date',
            'action' => 'assign',
            'data' => ['wo_id' => $workOrder->id],
            'user_id' => $user->id,
        ]);

        $today = now()->format('Y-m-d');
        $keyboard = $this->inlineBtn([
            ['text' => "Today ({$today})", 'callback_data' => "wo_cmd_date_today:{$workOrder->id}"],
            ['text' => ' Cancel', 'callback_data' => "wo_cmd_cancel:{$workOrder->id}"],
        ]);

        return $this->sendMessage($chatId, 'Enter scheduled date (YYYY-MM-DD) or tap Today:', $keyboard);
    }

    private function processWoAssignDate(int $chatId, array $state, string $text): ?string
    {
        $date = trim($text);
        try {
            $date = Carbon::parse($date)->toDateString();
        } catch (\Exception $e) {
            return $this->sendMessage($chatId, 'Invalid date. Use YYYY-MM-DD format.');
        }

        $state['data']['date'] = $date;
        $state['step'] = 'shift';
        $this->setCmdConversation($chatId, $state);

        $keyboard = $this->inlineBtn([
            ['text' => 'Morning (07:00-16:00)', 'callback_data' => "wo_cmd_shift:{$state['data']['wo_id']}:morning"],
            ['text' => 'Afternoon (13:00-22:00)', 'callback_data' => "wo_cmd_shift:{$state['data']['wo_id']}:afternoon"],
            ['text' => 'Night (22:00-07:00)', 'callback_data' => "wo_cmd_shift:{$state['data']['wo_id']}:night"],
        ]);

        return $this->sendMessage($chatId, "Select shift for {$date}:", $keyboard);
    }

    private function processWoAssignShiftCallback(int $chatId, int $messageId, array $state, string $shift): ?string
    {
        $state['data']['shift'] = $shift;
        $state['step'] = 'technician';
        $this->setCmdConversation($chatId, $state);

        $date = $state['data']['date'];
        $rosterOnDutyIds = RosterEntry::where('date', $date)
            ->whereIn('shift', ['morning', 'afternoon', 'night'])
            ->pluck('user_id');
        $onDutyIds = RosterEntry::where('date', $date)
            ->where('shift', $shift)
            ->pluck('user_id');
        $offIds = RosterEntry::where('date', $date)
            ->whereIn('shift', ['off', 'leave', 'extra_off'])
            ->pluck('user_id');
        $assignedIds = TechnicianAssignment::where('scheduled_date', $date)
            ->where('shift', $shift)
            ->pluck('technician_id');
        $techs = User::role('technician')
            ->select('id', 'name')
            ->whereNotIn('id', $offIds)
            ->whereNotIn('id', $assignedIds)
            ->where(function ($q) use ($rosterOnDutyIds, $onDutyIds) {
                $q->whereNotIn('id', $rosterOnDutyIds)
                    ->orWhereIn('id', $onDutyIds);
            })
            ->orderBy('name')
            ->get();

        if ($techs->isEmpty()) {
            $this->clearCmdConversation($chatId);

            return $this->sendMessage($chatId, 'No technicians available for this date and shift.');
        }

        $keyboard = ['inline_keyboard' => []];
        foreach ($techs->chunk(2) as $chunk) {
            $row = [];
            foreach ($chunk as $t) {
                $row[] = ['text' => $t->name, 'callback_data' => "wo_cmd_tech:{$state['data']['wo_id']}:{$t->id}"];
            }
            $keyboard['inline_keyboard'][] = $row;
        }
        $keyboard['inline_keyboard'][] = [
            ['text' => ' Cancel', 'callback_data' => "wo_cmd_cancel:{$state['data']['wo_id']}"],
        ];

        return $this->sendMessage($chatId, "Select technician for {$date} ({$shift}):", $keyboard);
    }

    private function processWoAssignTechCallback(int $chatId, int $messageId, array $state, User $tech): ?string
    {
        $state['data']['technician_id'] = $tech->id;
        $state['data']['technician_name'] = $tech->name;
        $state['step'] = 'confirm';
        $this->setCmdConversation($chatId, $state);

        $d = $state['data'];
        $summary = "Confirm assignment:\n\n"
            ."Work Order: #{$d['wo_id']}\n"
            ."Technician: {$tech->name}\n"
            ."Date: {$d['date']}\n"
            ."Shift: {$d['shift']}";

        $keyboard = $this->inlineBtn([
            ['text' => '✅ Assign', 'callback_data' => "wo_cmd_confirm_assign:{$d['wo_id']}"],
            ['text' => ' Cancel', 'callback_data' => "wo_cmd_cancel:{$d['wo_id']}"],
        ]);

        return $this->sendMessage($chatId, $summary, $keyboard);
    }

    private function processWoAssignConfirm(int $chatId, array $state): ?string
    {
        $d = $state['data'];
        $service = app(WorkOrderService::class);

        try {
            $workOrder = WorkOrder::findOrFail($d['wo_id']);
            $assigner = User::findOrFail($state['user_id']);
            $service->assign($workOrder, $assigner, $d['technician_id'], $d['date'], $d['shift']);
            $this->clearCmdConversation($chatId);

            return $this->sendMessage($chatId, "✅ Work order #{$d['wo_id']} assigned to {$d['technician_name']} on {$d['date']} ({$d['shift']}).");
        } catch (\Exception $e) {
            return $this->sendMessage($chatId, "Error: {$e->getMessage()}");
        }
    }

    // ─── Note Flow ───────────────────────────────────────────────

    private function startWoNote(int $chatId, User $user, WorkOrder $workOrder): ?string
    {
        $this->setCmdConversation($chatId, [
            'step' => 'text',
            'action' => 'note',
            'data' => ['wo_id' => $workOrder->id],
            'user_id' => $user->id,
        ]);

        $keyboard = $this->inlineBtn([
            ['text' => ' Cancel', 'callback_data' => "wo_cmd_cancel:{$workOrder->id}"],
        ]);

        return $this->sendMessage($chatId, 'Enter progress note:', $keyboard);
    }

    private function processWoNoteText(int $chatId, array $state, string $text): ?string
    {
        $woId = $state['data']['wo_id'];

        try {
            $timestamp = now()->format('d M Y H:i');
            $entry = "\n--- [{$timestamp} WIB] ---\n".trim($text);

            $workOrder = WorkOrder::findOrFail($woId);
            $existing = $workOrder->technician_notes;
            $workOrder->update([
                'technician_notes' => $existing ? $existing.$entry : trim($text),
            ]);

            $this->clearCmdConversation($chatId);

            return $this->sendMessage($chatId, "✅ Progress note added to work order #{$woId}.");
        } catch (\Exception $e) {
            return $this->sendMessage($chatId, "Error: {$e->getMessage()}");
        }
    }

    // ─── Photo Flow ───────────────────────────────────────────────

    private function startWoPhoto(int $chatId, User $user, WorkOrder $workOrder): ?string
    {
        $this->setCmdConversation($chatId, [
            'step' => 'photo',
            'action' => 'photo',
            'data' => ['wo_id' => $workOrder->id],
            'user_id' => $user->id,
        ]);

        $keyboard = $this->inlineBtn([
            ['text' => ' Cancel', 'callback_data' => "wo_cmd_cancel:{$workOrder->id}"],
        ]);

        return $this->sendMessage($chatId, 'Send a photo:');
    }

    private function handleWoCmdPhotoInput(int $chatId, User $user, array $photos, array $state): ?string
    {
        $woId = $state['data']['wo_id'];
        $photoPath = $this->downloadTelegramPhoto($photos);

        if (! $photoPath) {
            return $this->sendMessage($chatId, 'Failed to download photo. Try again.');
        }

        try {
            WorkOrderPhoto::create([
                'work_order_id' => $woId,
                'photo_path' => $photoPath,
                'type' => 'progress',
            ]);

            $this->clearCmdConversation($chatId);

            return $this->sendMessage($chatId, "✅ Photo added to work order #{$woId}.");
        } catch (\Exception $e) {
            return $this->sendMessage($chatId, "Error: {$e->getMessage()}");
        }
    }

    private function handleApproveText(int $chatId, User $user, string $text): ?string
    {
        $parts = explode(' ', $text, 3);
        $id = $parts[1] ?? '';
        $dateInput = $parts[2] ?? '';

        if (! is_numeric($id)) {
            return $this->sendMessage($chatId, 'Usage: /approve <id> [date] (e.g. /approve 5 or /approve 5 2026-07-25)');
        }

        $workOrder = WorkOrder::find((int) $id);
        if (! $workOrder) {
            return $this->sendMessage($chatId, "Work order #{$id} not found.");
        }

        try {
            $completionTargetDate = null;
            if (! empty($dateInput)) {
                try {
                    $completionTargetDate = Carbon::parse($dateInput)->toDateString();
                } catch (\Exception $e) {
                    return $this->sendMessage($chatId, 'Invalid date format. Use YYYY-MM-DD (e.g. /approve 5 2026-07-25)');
                }
            }

            app(WorkOrderService::class)->approve($workOrder, $user, null, $completionTargetDate);
            $this->sendMessage($chatId, "✅ Work order #{$id} approved.");
        } catch (\Exception $e) {
            $this->sendMessage($chatId, "Error: {$e->getMessage()}");
        }

        return null;
    }

    private function handleRejectText(int $chatId, User $user, string $text): ?string
    {
        $parts = explode(' ', $text, 3);
        $id = $parts[1] ?? '';
        $reason = $parts[2] ?? '';

        if (! is_numeric($id)) {
            return $this->sendMessage($chatId, 'Usage: /reject <id> <reason> (e.g. /reject 5 Missing documentation)');
        }

        if (empty($reason)) {
            return $this->sendMessage($chatId, 'Please provide a reason: /reject <id> <reason>');
        }

        $workOrder = WorkOrder::find((int) $id);
        if (! $workOrder) {
            return $this->sendMessage($chatId, "Work order #{$id} not found.");
        }

        try {
            app(WorkOrderService::class)->reject($workOrder, $user, $reason);
            $this->sendMessage($chatId, "❌ Work order #{$id} rejected.\nReason: {$reason}");
        } catch (\Exception $e) {
            $this->sendMessage($chatId, "Error: {$e->getMessage()}");
        }

        return null;
    }

    private function handleMyOrders(int $chatId, User $user): ?string
    {
        $workOrders = WorkOrder::where('requester_id', $user->id)
            ->orWhereHas('technicianAssignments', fn ($q) => $q->where('technician_id', $user->id))
            ->latest()
            ->limit(5)
            ->get(['id', 'title', 'status']);

        if ($workOrders->isEmpty()) {
            return $this->sendMessage($chatId, 'No work orders found.');
        }

        $text = $workOrders->map(fn ($wo) => "#{$wo->id}: {$wo->title} [{$wo->status}]")->implode("\n");

        return $this->sendMessage($chatId, "Your recent work orders:\n\n{$text}");
    }

    private function handlePending(int $chatId, User $user): ?string
    {
        $role = $user->getRoleNames()->first();

        $parts = [];

        // ── Pending Work Orders (all roles) ──
        $wosQuery = WorkOrder::whereIn('status', ['pending_dept_head', 'pending_chief_engineer', 'approved', 'assigned', 'in_progress', 'pending_check']);

        if ($role === 'chief-engineer') {
            // CE sees all pending work orders across all departments
        } else {
            $wosQuery->where(function ($q) use ($user, $role) {
                $q->where('requester_id', $user->id);
                $q->orWhereHas('technicianAssignments', fn ($q) => $q->where('technician_id', $user->id));
                if ($role === 'dept-head') {
                    $q->orWhereHas('requester', fn ($q) => $q->where('department_id', $user->department_id));
                }
            });
        }

        $wos = $wosQuery->latest()->limit(15)->get(['id', 'title', 'status', 'priority', 'created_at', 'completion_target_date']);

        if ($wos->isNotEmpty()) {
            $parts[] = '📋 Pending Work Orders:';
            foreach ($wos as $wo) {
                $parts[] = sprintf(
                    '#%d: %s [%s] (%s) %s%s',
                    $wo->id, $wo->title, $wo->status, ucfirst($wo->priority),
                    $wo->created_at->format('d M'),
                    $wo->completion_target_date ? ' — Target: '.Carbon::parse($wo->completion_target_date)->format('d M') : ''
                );
            }
        }

        // ── CE-only sections ──
        if ($role === 'chief-engineer') {
            // Pending approvals
            $pendingApprovals = WorkOrder::where('status', 'pending_chief_engineer')
                ->whereHas('requester', fn ($q) => $q->where('department_id', $user->department_id))
                ->latest()
                ->limit(10)
                ->get(['id', 'title', 'priority', 'created_at']);

            if ($pendingApprovals->isNotEmpty()) {
                $parts[] = '';
                $parts[] = '⏳ Pending Approval:';
                foreach ($pendingApprovals as $wo) {
                    $parts[] = sprintf('#%d: %s (%s) %s', $wo->id, $wo->title, ucfirst($wo->priority), $wo->created_at->format('d M'));
                }
            }

            // Maintenance schedules due
            $schedules = MaintenanceSchedule::with('asset')
                ->active()
                ->where('next_due_date', '<=', now()->addDays(7))
                ->orderBy('next_due_date')
                ->limit(10)
                ->get();

            if ($schedules->isNotEmpty()) {
                $parts[] = '';
                $parts[] = '🔧 Maintenance Due (next 7 days):';
                foreach ($schedules as $s) {
                    $assetName = $s->asset?->name ?? 'N/A';
                    $overdue = $s->next_due_date->isPast() ? ' 🔴' : '';
                    $parts[] = sprintf('  #%d %s — %s%s', $s->id, $assetName, $s->next_due_date->format('d M'), $overdue);
                }
            }

            // Active projects
            $projects = Project::whereIn('status', ['active', 'on_hold'])
                ->latest()
                ->limit(10)
                ->get(['id', 'name', 'status', 'end_date']);

            if ($projects->isNotEmpty()) {
                $parts[] = '';
                $parts[] = '📊 Active Projects:';
                foreach ($projects as $p) {
                    $end = $p->end_date ? ' — End: '.$p->end_date->format('d M') : '';
                    $parts[] = sprintf('  #%d: %s [%s]%s', $p->id, $p->name, $p->status, $end);
                }
            }
        }

        if (empty($parts)) {
            return $this->sendMessage($chatId, 'No pending tasks found.');
        }

        return $this->sendMessage($chatId, implode("\n", $parts));
    }

    private function handleUpdate(int $chatId, User $user, string $text): ?string
    {
        $parts = explode(' ', $text, 3);
        $id = $parts[1] ?? '';
        $newStatus = $parts[2] ?? '';

        if (! is_numeric($id) || empty($newStatus)) {
            return $this->sendMessage($chatId, 'Usage: /update <id> <status> (e.g. /update 5 in_progress)');
        }

        $workOrder = WorkOrder::find((int) $id);
        if (! $workOrder) {
            return $this->sendMessage($chatId, "Work order #{$id} not found.");
        }

        $allowedStatuses = ['in_progress', 'completed'];
        if (! in_array($newStatus, $allowedStatuses, true)) {
            return $this->sendMessage($chatId, 'Invalid status. Allowed: '.implode(', ', $allowedStatuses));
        }

        try {
            app(WorkOrderService::class)->transition($workOrder, $newStatus);
            $this->sendMessage($chatId, "Work order #{$id} updated to {$newStatus}.");
        } catch (\Exception $e) {
            $this->sendMessage($chatId, "Error: {$e->getMessage()}");
        }

        return null;
    }

    private function handleMySchedule(int $chatId, User $user): ?string
    {
        $assignments = $user->technicianAssignments()
            ->with('workOrder:id,title')
            ->where('scheduled_date', '>=', now()->subDay())
            ->orderBy('scheduled_date')
            ->limit(10)
            ->get();

        if ($assignments->isEmpty()) {
            return $this->sendMessage($chatId, 'No upcoming assignments.');
        }

        $text = $assignments->map(fn ($a) => "{$a->scheduled_date} ({$a->shift}): {$a->workOrder->title}")->implode("\n");

        return $this->sendMessage($chatId, "Your schedule:\n\n{$text}");
    }

    private function handleMyRoster(int $chatId, User $user, ?string $text = null): ?string
    {
        $date = $text ? $this->parseDateFromHash($text) : null;

        if ($date) {
            $entry = RosterEntry::where('user_id', $user->id)
                ->where('date', $date)
                ->first();

            if (! $entry) {
                return $this->sendMessage($chatId, "No roster entry for {$date->format('d M Y')}.");
            }

            $days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            $timeStr = $this->formatTimeBlocks($entry->time_blocks);
            $line = sprintf(
                '%s, %s — %s%s',
                $days[(int) $entry->date->format('w')],
                $entry->date->format('d M'),
                ucfirst($entry->shift),
                $timeStr ? " ({$timeStr})" : ''
            );

            return $this->sendMessage($chatId, "Your roster for {$date->format('d M Y')}:\n\n{$line}");
        }

        $from = now()->startOfDay();
        $to = now()->addDays(6)->endOfDay();

        $entries = RosterEntry::where('user_id', $user->id)
            ->whereBetween('date', [$from, $to])
            ->orderBy('date')
            ->get();

        if ($entries->isEmpty()) {
            return $this->sendMessage($chatId, 'No roster entries for the next 7 days.');
        }

        $days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        $lines = $entries->map(function ($e) use ($days) {
            $timeStr = $this->formatTimeBlocks($e->time_blocks);

            return sprintf(
                '%s, %s — %s%s',
                $days[(int) $e->date->format('w')],
                $e->date->format('d M'),
                ucfirst($e->shift),
                $timeStr ? " ({$timeStr})" : ''
            );
        })->implode("\n");

        return $this->sendMessage($chatId, "Your roster (next 7 days):\n\n{$lines}");
    }

    private function handleTeamRoster(int $chatId, ?string $text = null): ?string
    {
        $date = $text ? $this->parseDateFromHash($text) : null;

        if ($date) {
            $entries = RosterEntry::with('user:id,name')
                ->where('date', $date)
                ->orderBy('shift')
                ->get();

            if ($entries->isEmpty()) {
                return $this->sendMessage($chatId, "No roster entries for {$date->format('d M Y')}.");
            }

            $days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            $label = $days[(int) $date->format('w')].', '.$date->format('d M Y');
            $names = $entries->map(function ($e) {
                $timeStr = $this->formatTimeBlocks($e->time_blocks);

                return "  - {$e->user->name} ({$e->shift})".($timeStr ? " {$timeStr}" : '');
            })->implode("\n");

            return $this->sendMessage($chatId, "Team roster for {$label}:\n\n{$names}");
        }

        $from = now()->startOfDay();
        $to = now()->addDays(6)->endOfDay();

        $entries = RosterEntry::with('user:id,name')
            ->whereBetween('date', [$from, $to])
            ->orderBy('date')
            ->orderBy('shift')
            ->get()
            ->groupBy('date');

        if ($entries->isEmpty()) {
            return $this->sendMessage($chatId, 'No roster entries for the next 7 days.');
        }

        $days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        $parts = [];

        foreach ($entries as $date => $group) {
            $label = $days[(int) Carbon::parse($date)->format('w')].', '.Carbon::parse($date)->format('d M');
            $names = $group->map(function ($e) {
                $timeStr = $this->formatTimeBlocks($e->time_blocks);

                return "  - {$e->user->name} ({$e->shift})".($timeStr ? " {$timeStr}" : '');
            })->implode("\n");
            $parts[] = "{$label}\n{$names}";
        }

        return $this->sendMessage($chatId, "Team roster (next 7 days):\n\n".implode("\n\n", $parts));
    }

    private function handleEvents(int $chatId): ?string
    {
        $from = now()->startOfDay();
        $to = now()->addDays(7)->endOfDay();

        $events = CalendarEvent::whereBetween('start_datetime', [$from, $to])
            ->orderBy('start_datetime')
            ->get();

        if ($events->isEmpty()) {
            return $this->sendMessage($chatId, 'No events in the next 7 days.');
        }

        $lines = $events->map(function ($e, $i) {
            $parts = [
                "#{$e->id}: {$e->title}",
                "   {$e->start_datetime->format('d M, H:i')} \u{2014} {$e->end_datetime?->format('d M, H:i')}".($e->all_day ? ' (All day)' : ''),
            ];
            if ($e->venue) {
                $parts[] = "   Venue: {$e->venue}";
            }
            if ($e->type) {
                $parts[] = "   Type: {$e->type}";
            }
            if ($e->pax) {
                $parts[] = "   Pax: {$e->pax}";
            }

            return implode("\n", $parts);
        })->implode("\n\n");

        return $this->sendMessage($chatId, "Upcoming events:\n\n{$lines}");
    }

    private function handleEventDetail(int $chatId, string $text): ?string
    {
        $id = trim(substr($text, 7));
        if (! is_numeric($id)) {
            return $this->sendMessage($chatId, 'Usage: /event#<id> (e.g. /event#5)');
        }

        $e = CalendarEvent::find((int) $id);
        if (! $e) {
            return $this->sendMessage($chatId, "Event #{$id} not found.");
        }

        $parts = [
            "Event #{$e->id}",
            "Title: {$e->title}",
            "{$e->start_datetime->format('d M Y, H:i')} \u{2014} {$e->end_datetime?->format('d M Y, H:i')}".($e->all_day ? ' (All day)' : ''),
        ];
        if ($e->venue) {
            $parts[] = "Venue: {$e->venue}";
        }
        if ($e->type) {
            $parts[] = "Type: {$e->type}";
        }
        if ($e->pax) {
            $parts[] = "Pax: {$e->pax}";
        }
        if ($e->file_url) {
            $parts[] = "File: {$e->file_url}";
        }

        return $this->sendMessage($chatId, implode("\n", $parts));
    }

    // ─── Input Daily Statistics ───────────────────────────────────

    private function handleInputdsStart(int $chatId, User $user): ?string
    {
        // Clear any stale conversations
        $this->clearCmdConversation($chatId);
        $this->clearConversation($chatId);

        $this->setInputdsConversation($chatId, [
            'step' => 'date',
            'data' => ['user_id' => $user->id],
        ]);

        return $this->sendMessage($chatId, '📅 Enter date (YYYY-MM-DD) or /skip for today:');
    }

    private function handleInputdsText(int $chatId, User $user, string $text, array $state): ?string
    {
        if (strtolower($text) === 'cancel' || str_starts_with($text, '/cancel')) {
            $this->clearInputdsConversation($chatId);

            return $this->sendMessage($chatId, 'Input cancelled.');
        }

        return match ($state['step']) {
            'date' => $this->processInputdsDate($chatId, $state, $text),
            'mtd_room_occupied' => $this->processInputdsNumeric($chatId, $state, $text, 'MTD Room Occupied', 'mtd_room_occupied', 'mtd_room_available'),
            'mtd_room_available' => $this->processInputdsNumeric($chatId, $state, $text, 'MTD Room Available', 'mtd_room_available', 'mtd_guest_count'),
            'mtd_guest_count' => $this->processInputdsNumeric($chatId, $state, $text, 'MTD Guest Count', 'mtd_guest_count', 'mtd_restaurant_customer_count'),
            'mtd_restaurant_customer_count' => $this->processInputdsNumeric($chatId, $state, $text, 'MTD Restaurant Customers', 'mtd_restaurant_customer_count', 'mtd_mice_customer'),
            'mtd_mice_customer' => $this->processInputdsNumeric($chatId, $state, $text, 'MTD MICE Customers', 'mtd_mice_customer', 'description'),
            'description' => $this->processInputdsDescription($chatId, $state, $text),
            'photo' => $this->processInputdsPhotoSkip($chatId, $state),
            default => $this->sendMessage($chatId, 'Something went wrong. Start again with /inputds'),
        };
    }

    private function processInputdsDate(int $chatId, array $state, string $text): ?string
    {
        if (strtolower($text) === '/skip') {
            $date = today();
        } else {
            try {
                $date = Carbon::parse(trim($text));
            } catch (\Exception $e) {
                return $this->sendMessage($chatId, 'Invalid date. Use YYYY-MM-DD format.');
            }
        }

        $dateStr = $date->toDateString();

        // Check for existing event
        $existing = CalendarEvent::whereDate('start_datetime', $dateStr)
            ->where('title', 'Daily Statistics')
            ->first();

        $data = $state['data'];
        $data['date'] = $dateStr;
        $data['existing_id'] = $existing?->id;
        $data['mtd_room_occupied'] = $existing?->mtd_room_occupied;
        $data['mtd_room_available'] = $existing?->mtd_room_available;
        $data['mtd_guest_count'] = $existing?->mtd_guest_count;
        $data['mtd_restaurant_customer_count'] = $existing?->mtd_restaurant_customer_count;
        $data['mtd_mice_customer'] = $existing?->mtd_mice_customer;
        $data['description'] = $existing?->description;

        $state['data'] = $data;
        $state['step'] = 'mtd_room_occupied';
        $this->setInputdsConversation($chatId, $state);

        $existingVal = $data['mtd_room_occupied'] !== null ? $data['mtd_room_occupied'] : '0';

        return $this->sendMessage($chatId, "MTD Room Occupied? (number, /skip to keep {$existingVal}):");
    }

    private function processInputdsNumeric(int $chatId, array $state, string $text, string $label, string $field, string $nextStep): ?string
    {
        $data = $state['data'];

        if (strtolower($text) === '/skip') {
            $value = $data[$field] ?? 0;
        } else {
            if (! ctype_digit(trim($text)) && ! is_numeric(trim($text))) {
                return $this->sendMessage($chatId, "Invalid. Enter a number for {$label}:");
            }
            $value = (int) trim($text);
            if ($value < 0) {
                return $this->sendMessage($chatId, "Invalid. Enter a non-negative number for {$label}:");
            }
        }

        $data[$field] = $value;
        $state['data'] = $data;
        $state['step'] = $nextStep;
        $this->setInputdsConversation($chatId, $state);

        if ($nextStep === 'description') {
            return $this->sendMessage($chatId, '📝 Description/notes (text, or /skip to leave blank):');
        }

        $existingVal = $data[$nextStep] !== null ? $data[$nextStep] : '0';
        $labelMap = [
            'mtd_room_available' => 'MTD Room Available',
            'mtd_guest_count' => 'MTD Guest Count',
            'mtd_restaurant_customer_count' => 'MTD Restaurant Customers',
            'mtd_mice_customer' => 'MTD MICE Customers',
        ];

        return $this->sendMessage($chatId, "{$labelMap[$nextStep]}? (number, /skip to keep {$existingVal}):");
    }

    private function processInputdsDescription(int $chatId, array $state, string $text): ?string
    {
        $data = $state['data'];

        if (strtolower($text) !== '/skip') {
            $data['description'] = trim($text);
        }

        $state['data'] = $data;
        $state['step'] = 'photo';
        $this->setInputdsConversation($chatId, $state);

        return $this->sendMessage($chatId, '📷 Upload a photo or /skip to continue:');
    }

    private function processInputdsPhoto(int $chatId, array $state, array $photos): ?string
    {
        $filePath = $this->downloadTelegramPhoto($photos);
        if (! $filePath) {
            return $this->sendMessage($chatId, 'Failed to download photo. Try again or /skip.');
        }

        $data = $state['data'];
        $data['file_path'] = $filePath;
        $state['data'] = $data;
        $state['step'] = 'confirm';
        $this->setInputdsConversation($chatId, $state);

        return $this->showInputdsConfirm($chatId, $state);
    }

    private function processInputdsPhotoSkip(int $chatId, array $state): ?string
    {
        $state['step'] = 'confirm';
        $this->setInputdsConversation($chatId, $state);

        return $this->showInputdsConfirm($chatId, $state);
    }

    private function showInputdsConfirm(int $chatId, array $state): ?string
    {
        $d = $state['data'];
        $lines = [
            "📊 Daily Statistics — {$d['date']}",
            '',
            'MTD Room Occupied:      '.($d['mtd_room_occupied'] ?? 0),
            'MTD Room Available:     '.($d['mtd_room_available'] ?? 0),
            'MTD Guest Count:        '.($d['mtd_guest_count'] ?? 0),
            'MTD Restaurant Cust:    '.($d['mtd_restaurant_customer_count'] ?? 0),
            'MTD MICE Customers:     '.($d['mtd_mice_customer'] ?? 0),
        ];
        if (! empty($d['description'])) {
            $lines[] = "Description:           {$d['description']}";
        }
        $lines[] = 'Photo:                  '.(! empty($d['file_path']) ? '✅ Received' : 'None');
        $lines[] = $d['existing_id'] ? 'Action:                Update existing' : 'Action:                Create new';

        $keyboard = ['inline_keyboard' => [
            [['text' => '✅ Confirm', 'callback_data' => 'inputds:confirm']],
            [['text' => ' Cancel', 'callback_data' => 'inputds:cancel']],
        ]];

        return $this->sendMessage($chatId, implode("\n", $lines), $keyboard);
    }

    private function processInputdsConfirm(int $chatId, string $callbackId): ?string
    {
        $this->answerCallbackQuery($callbackId, 'Saving...');

        $state = $this->getInputdsConversation($chatId);
        if (! $state) {
            return $this->sendMessage($chatId, 'Session expired. Start again with /inputds');
        }

        $this->clearInputdsConversation($chatId);
        $d = $state['data'];

        // Photo already downloaded during upload step
        $filePath = $d['file_path'] ?? null;

        // Compute daily values from previous day MTD
        $prevDate = Carbon::parse($d['date'])->subDay()->toDateString();
        $prev = CalendarEvent::whereDate('start_datetime', $prevDate)
            ->where('title', 'Daily Statistics')
            ->first();

        $dailyFields = [];
        $mtdFields = ['mtd_room_occupied', 'mtd_room_available', 'mtd_guest_count', 'mtd_restaurant_customer_count', 'mtd_mice_customer'];
        $dailyMap = [
            'mtd_room_occupied' => 'room_occupied',
            'mtd_room_available' => 'room_available',
            'mtd_guest_count' => 'guest_count',
            'mtd_restaurant_customer_count' => 'restaurant_customer_count',
            'mtd_mice_customer' => 'meeting_customer_count',
        ];

        foreach ($mtdFields as $mtd) {
            $current = (int) ($d[$mtd] ?? 0);
            $prevMtd = (int) ($prev?->{$mtd} ?? 0);
            $dailyFields[$dailyMap[$mtd]] = $current - $prevMtd;
        }

        $attributes = [
            'user_id' => $d['user_id'],
            'title' => 'Daily Statistics',
            'start_datetime' => $d['date'].' 00:00:00',
            'end_datetime' => $d['date'].' 23:59:00',
            'all_day' => true,
            'color' => '#22C55E',
            'mtd_room_occupied' => $d['mtd_room_occupied'] ?? 0,
            'mtd_room_available' => $d['mtd_room_available'] ?? 0,
            'mtd_guest_count' => $d['mtd_guest_count'] ?? 0,
            'mtd_restaurant_customer_count' => $d['mtd_restaurant_customer_count'] ?? 0,
            'mtd_mice_customer' => $d['mtd_mice_customer'] ?? 0,
            'room_occupied' => $dailyFields['room_occupied'],
            'room_available' => $dailyFields['room_available'],
            'guest_count' => $dailyFields['guest_count'],
            'restaurant_customer_count' => $dailyFields['restaurant_customer_count'],
            'meeting_customer_count' => $dailyFields['meeting_customer_count'],
            'file_path' => $filePath,
        ];

        if (! empty($d['description'])) {
            $attributes['description'] = $d['description'];
        }

        if ($d['existing_id']) {
            CalendarEvent::where('id', $d['existing_id'])->update($attributes);
            $msg = "✅ Daily Statistics for {$d['date']} updated.";
        } else {
            CalendarEvent::create($attributes);
            $msg = "✅ Daily Statistics for {$d['date']} saved.";
        }

        return $this->sendMessage($chatId, $msg);
    }

    // ─── Input Utility Consumption ─────────────────────────────────

    private function handleInputecStart(int $chatId, User $user): ?string
    {
        $this->clearConversation($chatId);
        $this->clearCmdConversation($chatId);
        $this->clearInputdsConversation($chatId);

        $this->setInputecConversation($chatId, [
            'step' => 'date',
            'data' => ['user_id' => $user->id],
        ]);

        return $this->sendMessage($chatId, '📅 Enter date (YYYY-MM-DD) or /skip for today:');
    }

    private function handleInputecText(int $chatId, User $user, string $text, array $state): ?string
    {
        if (strtolower($text) === 'cancel' || str_starts_with($text, '/cancel')) {
            $this->clearInputecConversation($chatId);

            return $this->sendMessage($chatId, 'Input cancelled.');
        }

        return match ($state['step']) {
            'date' => $this->processInputecDate($chatId, $state, $text),
            'type' => $this->processInputecType($chatId, $state, $text),
            'ending_stand' => $this->processInputecEndingStand($chatId, $state, $text),
            'waste_qty' => $this->processInputecWasteQty($chatId, $state, $text),
            'notes' => $this->processInputecNotes($chatId, $state, $text),
            'photo' => $this->processInputecPhotoSkip($chatId, $state),
            default => $this->sendMessage($chatId, 'Something went wrong. Start again with /inputec'),
        };
    }

    private function processInputecDate(int $chatId, array $state, string $text): ?string
    {
        if (strtolower($text) === '/skip') {
            $date = today();
        } else {
            try {
                $date = Carbon::parse(trim($text));
            } catch (\Exception $e) {
                return $this->sendMessage($chatId, 'Invalid date. Use YYYY-MM-DD format.');
            }
        }

        $state['data']['record_date'] = $date->toDateString();
        $state['step'] = 'type';
        $this->setInputecConversation($chatId, $state);

        $keyboard = $this->inlineBtn([
            ['text' => '⚡ Electricity', 'callback_data' => 'inputec_type:electricity'],
            ['text' => '💧 Water', 'callback_data' => 'inputec_type:water'],
            ['text' => '🔥 Gas', 'callback_data' => 'inputec_type:gas'],
            ['text' => '🗑️ Waste', 'callback_data' => 'inputec_type:waste'],
            ['text' => '⛽ Fuel', 'callback_data' => 'inputec_type:fuel'],
        ]);

        return $this->sendMessage($chatId, "Select utility type for {$date->toDateString()}:", $keyboard);
    }

    private function processInputecType(int $chatId, array $state, string $text): ?string
    {
        $type = strtolower(trim($text));
        $valid = ['electricity', 'gas', 'water', 'waste', 'fuel'];
        if (! in_array($type, $valid, true)) {
            return $this->sendMessage($chatId, 'Invalid type. Choose: electricity, gas, water, waste, fuel');
        }

        $units = ['electricity' => 'kWh', 'gas' => 'm³', 'water' => 'm³', 'waste' => 'kg', 'fuel' => 'liter'];
        $state['data']['type'] = $type;
        $state['data']['unit'] = $units[$type];

        // Auto-fill beginning_stand from previous day's ending_stand for non-waste
        if ($type !== 'waste') {
            $prev = DailyUtility::where('type', $type)
                ->where('record_date', '<', $state['data']['record_date'])
                ->orderBy('record_date', 'desc')
                ->first();
            $state['data']['beginning_stand'] = $prev?->ending_stand ?? 0;
            $state['step'] = 'ending_stand';
            $this->setInputecConversation($chatId, $state);

            return $this->sendMessage($chatId, "Beginning stand: {$state['data']['beginning_stand']}\nEnding stand reading? (number):");
        }

        $state['step'] = 'waste_qty';
        $this->setInputecConversation($chatId, $state);

        return $this->sendMessage($chatId, 'Waste quantity (kg)? (number):');
    }

    private function processInputecEndingStand(int $chatId, array $state, string $text): ?string
    {
        if (! is_numeric(trim($text))) {
            return $this->sendMessage($chatId, 'Invalid. Enter a number for ending stand:');
        }
        $value = (float) trim($text);
        if ($value < 0) {
            return $this->sendMessage($chatId, 'Invalid. Enter a non-negative number:');
        }

        $beginning = $state['data']['beginning_stand'];
        $consumption = $value - $beginning;
        if ($consumption < 0) {
            return $this->sendMessage($chatId, 'Ending stand must be greater than or equal to beginning stand.');
        }

        $state['data']['ending_stand'] = $value;
        $state['data']['consumption'] = $consumption;
        $state['data']['cost'] = null; // auto-calc on save
        $state['step'] = 'notes';
        $this->setInputecConversation($chatId, $state);

        return $this->sendMessage($chatId, "Consumption: {$consumption} {$state['data']['unit']}\n📝 Notes? (text, or /skip):");
    }

    private function processInputecWasteQty(int $chatId, array $state, string $text): ?string
    {
        if (! is_numeric(trim($text))) {
            return $this->sendMessage($chatId, 'Invalid. Enter a number for waste quantity:');
        }
        $value = (float) trim($text);
        if ($value < 0) {
            return $this->sendMessage($chatId, 'Invalid. Enter a non-negative number:');
        }

        $state['data']['consumption'] = $value;
        $state['data']['cost'] = null; // auto-calc on save
        $state['step'] = 'notes';
        $this->setInputecConversation($chatId, $state);

        return $this->sendMessage($chatId, "Consumption: {$value} kg\n📝 Notes? (text, or /skip):");
    }

    private function processInputecNotes(int $chatId, array $state, string $text): ?string
    {
        if (strtolower($text) !== '/skip') {
            $state['data']['notes'] = trim($text);
        }

        $state['step'] = 'photo';
        $this->setInputecConversation($chatId, $state);

        return $this->sendMessage($chatId, '📷 Upload a photo or /skip:');
    }

    private function processInputecPhoto(int $chatId, array $state, array $photos): ?string
    {
        $filePath = $this->downloadTelegramPhoto($photos);
        if (! $filePath) {
            return $this->sendMessage($chatId, 'Failed to download photo. Try again or /skip.');
        }

        $state['data']['file_path'] = $filePath;
        $state['step'] = 'confirm';
        $this->setInputecConversation($chatId, $state);

        return $this->showInputecConfirm($chatId, $state);
    }

    private function processInputecPhotoSkip(int $chatId, array $state): ?string
    {
        $state['step'] = 'confirm';
        $this->setInputecConversation($chatId, $state);

        return $this->showInputecConfirm($chatId, $state);
    }

    private function showInputecConfirm(int $chatId, array $state): ?string
    {
        $d = $state['data'];
        $lines = [
            "📊 Utility — {$d['record_date']}",
            '',
            'Type:       '.ucfirst($d['type'] ?? '?'),
            'Unit:       '.($d['unit'] ?? '?'),
        ];
        if ($d['type'] !== 'waste') {
            $lines[] = 'Begin:      '.($d['beginning_stand'] ?? '?');
            $lines[] = 'End:        '.($d['ending_stand'] ?? '?');
        }
        $lines[] = 'Consumption: '.($d['consumption'] ?? '?').' '.($d['unit'] ?? '');
        $lines[] = 'Cost:       '.($d['cost'] !== null ? 'Rp '.number_format($d['cost'], 2) : 'Auto-calc from rate');
        if (! empty($d['notes'])) {
            $lines[] = "Notes:      {$d['notes']}";
        }
        $lines[] = 'Photo:      '.(! empty($d['file_path']) ? '✅ Received' : 'None');

        $keyboard = ['inline_keyboard' => [
            [['text' => '✅ Confirm', 'callback_data' => 'inputec:confirm']],
            [['text' => ' Cancel', 'callback_data' => 'inputec:cancel']],
        ]];

        return $this->sendMessage($chatId, implode("\n", $lines), $keyboard);
    }

    private function processInputecConfirm(int $chatId, string $callbackId): ?string
    {
        $this->answerCallbackQuery($callbackId, 'Saving...');

        $state = $this->getInputecConversation($chatId);
        if (! $state) {
            return $this->sendMessage($chatId, 'Session expired. Start again with /inputec');
        }

        $this->clearInputecConversation($chatId);
        $d = $state['data'];

        // Auto-calculate cost if not provided
        $cost = $d['cost'];
        if ($cost === null) {
            $rate = UtilityRate::activeAt($d['record_date'])
                ->where('type', $d['type'])
                ->value('cost_per_unit');
            if ($rate) {
                $cost = round($d['consumption'] * (float) $rate, 2);
            }
        }

        $attributes = [
            'record_date' => $d['record_date'],
            'type' => $d['type'],
            'consumption' => $d['consumption'],
            'unit' => $d['unit'],
            'cost' => $cost,
            'notes' => $d['notes'] ?? null,
            'photo' => $d['file_path'] ?? null,
            'recorded_by' => $d['user_id'],
        ];

        if ($d['type'] !== 'waste') {
            $attributes['beginning_stand'] = $d['beginning_stand'];
            $attributes['ending_stand'] = $d['ending_stand'];
        }

        DailyUtility::create($attributes);

        return $this->sendMessage($chatId, "✅ Utility record for {$d['record_date']} saved.");
    }

    private function handleOccupancy(int $chatId): ?string
    {
        $allStats = CalendarEvent::whereNotNull('room_occupied')
            ->orderBy('start_datetime')
            ->get()
            ->keyBy(fn ($e) => $e->start_datetime->format('Y-m-d'));

        $lines = [];
        for ($d = 0; $d <= 7; $d++) {
            $date = today()->addDays($d);
            $key = $date->toDateString();
            $event = $allStats->get($key);
            $occupied = (float) ($event?->room_occupied ?? 0);
            $available = (float) ($event?->room_available ?? 0);
            $rate = $available > 0 ? round(($occupied / $available) * 100) : 0;
            $label = $d === 0 ? 'Today' : $date->format('D d M');
            $bar = str_repeat('█', max(1, (int) ($rate / 10)));
            $color = $rate > 70 ? '🟢' : ($rate > 40 ? '🟡' : '🔴');
            $lines[] = "{$label}: {$occupied}/{$available} rooms {$color} {$rate}% {$bar}";
        }

        return $this->sendMessage($chatId, "Occupancy (7 days):\n\n".implode("\n", $lines));
    }

    private function handleUtility(int $chatId, string $text): ?string
    {
        $suffix = trim(substr($text, 4));
        if (strlen($suffix) === 6 && ctype_digit($suffix)) {
            $yy = '20'.substr($suffix, 0, 2);
            $mm = substr($suffix, 2, 2);
            $dd = substr($suffix, 4, 2);
            $date = Carbon::parse("{$yy}-{$mm}-{$dd}");
        } elseif ($suffix === '') {
            $date = today();
        } else {
            return $this->sendMessage($chatId, 'Usage: /uti (today) or /utiYYMMDD (e.g. /uti250719)');
        }

        $target = $date->toDateString();
        $yesterday = $date->copy()->subDay();
        $lySame = $date->copy()->subYear();

        // ── Utility queries ──
        $today = DailyUtility::whereIn('type', ['electricity', 'water', 'gas'])
            ->whereDate('record_date', $yesterday)
            ->groupBy('type')
            ->selectRaw('type, COALESCE(SUM(consumption),0) as consumption, COALESCE(SUM(cost),0) as cost')
            ->get()->keyBy('type');

        $month = DailyUtility::whereIn('type', ['electricity', 'water', 'gas'])
            ->whereBetween('record_date', [$date->copy()->startOfMonth(), $yesterday])
            ->groupBy('type')
            ->selectRaw('type, COALESCE(SUM(consumption),0) as consumption, COALESCE(SUM(cost),0) as cost')
            ->get()->keyBy('type');

        $year = DailyUtility::whereIn('type', ['electricity', 'water', 'gas'])
            ->whereBetween('record_date', [$date->copy()->startOfYear(), $yesterday])
            ->groupBy('type')
            ->selectRaw('type, COALESCE(SUM(consumption),0) as consumption, COALESCE(SUM(cost),0) as cost')
            ->get()->keyBy('type');

        $lyToday = DailyUtility::whereIn('type', ['electricity', 'water', 'gas'])
            ->whereDate('record_date', $yesterday->copy()->subYear())
            ->groupBy('type')
            ->selectRaw('type, COALESCE(SUM(consumption),0) as consumption, COALESCE(SUM(cost),0) as cost')
            ->get()->keyBy('type');

        $lyMonth = DailyUtility::whereIn('type', ['electricity', 'water', 'gas'])
            ->whereBetween('record_date', [$date->copy()->subYear()->startOfMonth(), $date->copy()->subYear()->endOfMonth()])
            ->groupBy('type')
            ->selectRaw('type, COALESCE(SUM(consumption),0) as consumption, COALESCE(SUM(cost),0) as cost')
            ->get()->keyBy('type');

        $lyYear = DailyUtility::whereIn('type', ['electricity', 'water', 'gas'])
            ->whereBetween('record_date', [$date->copy()->subYear()->startOfYear(), $date->copy()->subYear()->endOfDay()])
            ->groupBy('type')
            ->selectRaw('type, COALESCE(SUM(consumption),0) as consumption, COALESCE(SUM(cost),0) as cost')
            ->get()->keyBy('type');

        $utilLines = [];
        foreach (['electricity' => 'kWh', 'water' => 'm³', 'gas' => 'm³'] as $type => $unit) {
            $t = $today[$type] ?? null;
            $m = $month[$type] ?? null;
            $y = $year[$type] ?? null;
            $lt = $lyToday[$type] ?? null;
            $lm = $lyMonth[$type] ?? null;
            $ly = $lyYear[$type] ?? null;

            $icons = ['electricity' => '⚡', 'water' => '💧', 'gas' => '🔥'];
            $utilLines[] = "{$icons[$type]} ".ucfirst($type)." ({$unit})";
            $utilLines[] = $this->fmtPeriodLine('Today', $t?->consumption ?? 0, $t?->cost ?? 0, $lt?->consumption ?? 0, $lt?->cost ?? 0);
            $utilLines[] = $this->fmtPeriodLine('MTD', $m?->consumption ?? 0, $m?->cost ?? 0, $lm?->consumption ?? 0, $lm?->cost ?? 0);
            $utilLines[] = $this->fmtPeriodLine('YTD', $y?->consumption ?? 0, $y?->cost ?? 0, $ly?->consumption ?? 0, $ly?->cost ?? 0);
            $utilLines[] = '';
        }

        // ── Occupancy ──
        $occEvent = CalendarEvent::whereDate('start_datetime', $target)->whereNotNull('room_occupied')->first();
        $occMtd = CalendarEvent::whereMonth('start_datetime', $date->month)->whereYear('start_datetime', $date->year)->whereNotNull('room_occupied')->selectRaw('COALESCE(SUM(room_occupied),0) as occ, COALESCE(SUM(room_available),0) as avail')->first();
        $occYtd = CalendarEvent::whereYear('start_datetime', $date->year)->whereNotNull('room_occupied')->selectRaw('COALESCE(SUM(room_occupied),0) as occ, COALESCE(SUM(room_available),0) as avail')->first();
        $occ = $occEvent?->room_occupied ?? 0;
        $occAvail = $occEvent?->room_available ?? 0;
        $occRate = $occAvail > 0 ? round(($occ / $occAvail) * 100) : 0;
        $occMtdRate = $occMtd->avail > 0 ? round(($occMtd->occ / $occMtd->avail) * 100) : 0;
        $occYtdRate = $occYtd->avail > 0 ? round(($occYtd->occ / $occYtd->avail) * 100) : 0;

        $utilLines[] = '🏨 Occupancy';
        $utilLines[] = "  Today: {$occ}/{$occAvail} rooms ({$occRate}%)";
        $utilLines[] = "  MTD:   {$occMtd->occ}/{$occMtd->avail} ({$occMtdRate}%)";
        $utilLines[] = "  YTD:   {$occYtd->occ}/{$occYtd->avail} ({$occYtdRate}%)";
        $utilLines[] = '';

        // ── Restaurant customers ──
        $restToday = CalendarEvent::whereDate('start_datetime', $target)->whereNotNull('restaurant_customer_count')->sum('restaurant_customer_count');
        $restMtd = CalendarEvent::whereMonth('start_datetime', $date->month)->whereYear('start_datetime', $date->year)->whereNotNull('restaurant_customer_count')->sum('restaurant_customer_count');
        $restYtd = CalendarEvent::whereYear('start_datetime', $date->year)->whereNotNull('restaurant_customer_count')->sum('restaurant_customer_count');

        $utilLines[] = '🍽️ Restaurant Customers';
        $utilLines[] = '  Today: '.number_format($restToday);
        $utilLines[] = '  MTD:   '.number_format($restMtd);
        $utilLines[] = '  YTD:   '.number_format($restYtd);
        $utilLines[] = '';

        // ── Meeting customers ──
        $meetToday = CalendarEvent::whereDate('start_datetime', $target)->whereNotNull('meeting_customer_count')->sum('meeting_customer_count');
        $meetMtd = CalendarEvent::whereMonth('start_datetime', $date->month)->whereYear('start_datetime', $date->year)->whereNotNull('meeting_customer_count')->sum('meeting_customer_count');
        $meetYtd = CalendarEvent::whereYear('start_datetime', $date->year)->whereNotNull('meeting_customer_count')->sum('meeting_customer_count');

        $utilLines[] = '🤝 Meeting Customers';
        $utilLines[] = '  Today: '.number_format($meetToday);
        $utilLines[] = '  MTD:   '.number_format($meetMtd);
        $utilLines[] = '  YTD:   '.number_format($meetYtd);

        return $this->sendMessage($chatId, "📊 Utilities — {$date->format('d M Y')}\n\n".implode("\n", $utilLines));
    }

    private function fmtPeriodLine(string $label, float $cons, float $cost, float $lyCons, float $lyCost): string
    {
        $diff = $lyCons > 0 ? round((($cons - $lyCons) / $lyCons) * 100, 1) : 0;
        $arrow = $diff > 0 ? '↑' : ($diff < 0 ? '↓' : '→');

        return "  {$label}: ".number_format($cons, 1).' (Rp '.number_format($cost, 0).") {$arrow} {$diff}% vs LY";
    }

    private function handleReport(int $chatId, User $user, string $text): ?string
    {
        $parts = explode(' ', $text, 2);
        $activities = $parts[1] ?? '';

        if (empty($activities)) {
            return $this->sendMessage($chatId, 'Usage: /report <activities performed>');
        }

        DailyLog::create([
            'technician_id' => $user->id,
            'log_date' => now()->toDateString(),
            'activities' => $activities,
            'hours_worked' => 0,
        ]);

        return $this->sendMessage($chatId, 'Daily log saved.');
    }

    // ─── Input Event (inputevent) ──────────────────────────────────

    private function handleInputeventStart(int $chatId, User $user): ?string
    {
        $this->clearConversation($chatId);
        $this->clearCmdConversation($chatId);
        $this->clearInputdsConversation($chatId);
        $this->clearInputecConversation($chatId);
        $this->clearInputeventConversation($chatId);

        $this->setInputeventConversation($chatId, [
            'step' => 'date',
            'data' => ['user_id' => $user->id],
        ]);

        return $this->sendMessage($chatId, '📅 Enter event date (YYYY-MM-DD) or /skip for today:');
    }

    private function handleInputeventText(int $chatId, User $user, string $text, array $state): ?string
    {
        if (strtolower($text) === 'cancel' || str_starts_with($text, '/cancel')) {
            $this->clearInputeventConversation($chatId);

            return $this->sendMessage($chatId, 'Event creation cancelled.');
        }

        return match ($state['step']) {
            'date' => $this->processInputeventDate($chatId, $state, $text),
            'title' => $this->processInputeventTitle($chatId, $state, $text),
            'start_time' => $this->processInputeventStartTime($chatId, $state, $text),
            'end_time' => $this->processInputeventEndTime($chatId, $state, $text),
            'pax' => $this->processInputeventPax($chatId, $state, $text),
            'description' => $this->processInputeventDescription($chatId, $state, $text),
            'photo' => $this->processInputeventPhotoSkip($chatId, $state),
            default => $this->sendMessage($chatId, 'Something went wrong. Start again with /inputevent'),
        };
    }

    private function processInputeventDate(int $chatId, array $state, string $text): ?string
    {
        if (strtolower($text) === '/skip') {
            $date = today();
        } else {
            try {
                $date = Carbon::parse(trim($text));
            } catch (\Exception $e) {
                return $this->sendMessage($chatId, 'Invalid date. Use YYYY-MM-DD format.');
            }
        }

        $state['data']['date'] = $date->toDateString();
        $state['step'] = 'title';
        $this->setInputeventConversation($chatId, $state);

        return $this->sendMessage($chatId, '📝 Enter event title (required):');
    }

    private function processInputeventTitle(int $chatId, array $state, string $text): ?string
    {
        $title = trim($text);
        if (empty($title)) {
            return $this->sendMessage($chatId, 'Title cannot be empty. Please enter a title:');
        }
        if (mb_strlen($title) > 255) {
            return $this->sendMessage($chatId, 'Title is too long (max 255 characters). Please enter a shorter title:');
        }

        $state['data']['title'] = $title;
        $state['step'] = 'start_time';
        $this->setInputeventConversation($chatId, $state);

        return $this->sendMessage($chatId, '⏰ Start time (HH:MM, 24h format) or /skip for 08:00:');
    }

    private function processInputeventStartTime(int $chatId, array $state, string $text): ?string
    {
        if (strtolower($text) === '/skip') {
            $time = '08:00';
        } else {
            if (! preg_match('/^([01]\d|2[0-3]):([0-5]\d)$/', trim($text))) {
                return $this->sendMessage($chatId, 'Invalid time. Use HH:MM format (e.g. 09:30):');
            }
            $time = trim($text);
        }

        $state['data']['start_time'] = $time;
        $state['step'] = 'end_time';
        $this->setInputeventConversation($chatId, $state);

        return $this->sendMessage($chatId, '⏰ End time (HH:MM, 24h format) or /skip for 17:00:');
    }

    private function processInputeventEndTime(int $chatId, array $state, string $text): ?string
    {
        if (strtolower($text) === '/skip') {
            $time = '17:00';
        } else {
            if (! preg_match('/^([01]\d|2[0-3]):([0-5]\d)$/', trim($text))) {
                return $this->sendMessage($chatId, 'Invalid time. Use HH:MM format (e.g. 17:00):');
            }
            $time = trim($text);
        }

        $state['data']['end_time'] = $time;
        $state['step'] = 'venue';
        $this->setInputeventConversation($chatId, $state);

        return $this->askInputeventVenue($chatId, $state);
    }

    private function askInputeventVenue(int $chatId, array $state): ?string
    {
        $area = Location::where('code', 'FL-005')->value('id');
        $rooms = $area
            ? Location::where('parent_id', $area)->where('type', 'room')->orderBy('name')->get(['id', 'name'])
            : collect();

        $keyboard = ['inline_keyboard' => []];

        foreach ($rooms->chunk(2) as $chunk) {
            $row = [];
            foreach ($chunk as $room) {
                $label = mb_strlen($room->name) > 25 ? mb_substr($room->name, 0, 22).'...' : $room->name;
                $row[] = ['text' => $label, 'callback_data' => "inputevent_venue:{$room->id}"];
            }
            $keyboard['inline_keyboard'][] = $row;
        }

        $keyboard['inline_keyboard'][] = [
            ['text' => ' Skip Venue', 'callback_data' => 'inputevent_venue:skip'],
        ];

        $text = $rooms->isEmpty()
            ? 'No venues found. Tap Skip Venue to continue.'
            : 'Select a venue:';

        return $this->sendMessage($chatId, $text, $keyboard);
    }

    private function askInputeventType(int $chatId, array $state): ?string
    {
        $keyboard = ['inline_keyboard' => [
            [['text' => ' Half Day', 'callback_data' => 'inputevent_type:half_day']],
            [['text' => ' Full Day', 'callback_data' => 'inputevent_type:full_day']],
            [['text' => ' Full Board', 'callback_data' => 'inputevent_type:full_board']],
            [['text' => ' Skip', 'callback_data' => 'inputevent_type:skip']],
        ]];

        return $this->sendMessage($chatId, 'Select meeting type:', $keyboard);
    }

    private function processInputeventPax(int $chatId, array $state, string $text): ?string
    {
        if (strtolower($text) === '/skip') {
            $state['data']['pax'] = null;
        } else {
            if (! ctype_digit(trim($text)) && ! is_numeric(trim($text))) {
                return $this->sendMessage($chatId, 'Invalid. Enter a number for attendees:');
            }
            $value = (int) trim($text);
            if ($value < 0) {
                return $this->sendMessage($chatId, 'Invalid. Enter a non-negative number:');
            }
            $state['data']['pax'] = $value;
        }

        $state['step'] = 'description';
        $this->setInputeventConversation($chatId, $state);

        return $this->sendMessage($chatId, '📝 Description/notes (text, or /skip to leave blank):');
    }

    private function processInputeventDescription(int $chatId, array $state, string $text): ?string
    {
        if (strtolower($text) !== '/skip') {
            $state['data']['description'] = trim($text);
        }

        $state['step'] = 'photo';
        $this->setInputeventConversation($chatId, $state);

        return $this->sendMessage($chatId, '📎 Upload a photo or PDF file, or /skip to continue:');
    }

    private function processInputeventPhoto(int $chatId, array $state, array $photos): ?string
    {
        $fileId = $photos[count($photos) - 1]['file_id'] ?? null;
        if (! $fileId) {
            return $this->sendMessage($chatId, 'Failed to download file. Try again or /skip.');
        }

        $filePath = $this->downloadTelegramFile($fileId, 'calendar-files');
        if (! $filePath) {
            return $this->sendMessage($chatId, 'Failed to download file. Try again or /skip.');
        }

        $state['data']['file_path'] = $filePath;
        $state['step'] = 'confirm';
        $this->setInputeventConversation($chatId, $state);

        return $this->showInputeventConfirm($chatId, $state);
    }

    private function processInputeventDocument(int $chatId, array $state, array $document): ?string
    {
        $fileId = $document['file_id'] ?? null;
        if (! $fileId) {
            return $this->sendMessage($chatId, 'Failed to download file. Try again or /skip.');
        }

        $filePath = $this->downloadTelegramFile($fileId, 'calendar-files');
        if (! $filePath) {
            return $this->sendMessage($chatId, 'Failed to download file. Try again or /skip.');
        }

        $state['data']['file_path'] = $filePath;
        $state['step'] = 'confirm';
        $this->setInputeventConversation($chatId, $state);

        return $this->showInputeventConfirm($chatId, $state);
    }

    private function processInputeventPhotoSkip(int $chatId, array $state): ?string
    {
        $state['step'] = 'confirm';
        $this->setInputeventConversation($chatId, $state);

        return $this->showInputeventConfirm($chatId, $state);
    }

    private function showInputeventConfirm(int $chatId, array $state): ?string
    {
        $d = $state['data'];
        $lines = [
            "📅 Event — {$d['date']}",
            '',
            "Title:       {$d['title']}",
            "Start:       {$d['start_time']}",
            "End:         {$d['end_time']}",
        ];
        if (! empty($d['venue'])) {
            $lines[] = "Venue:       {$d['venue']}";
        }
        if (! empty($d['type'])) {
            $lines[] = 'Type:        '.str_replace('_', ' ', ucfirst($d['type']));
        }
        if ($d['pax'] !== null) {
            $lines[] = "Pax:         {$d['pax']}";
        }
        if (! empty($d['description'])) {
            $lines[] = "Notes:       {$d['description']}";
        }
        $lines[] = 'File:        '.(! empty($d['file_path']) ? '✅ Received' : 'None');

        $keyboard = ['inline_keyboard' => [
            [['text' => '✅ Confirm', 'callback_data' => 'inputevent:confirm']],
            [['text' => ' Cancel', 'callback_data' => 'inputevent:cancel']],
        ]];

        return $this->sendMessage($chatId, implode("\n", $lines), $keyboard);
    }

    private function processInputeventConfirm(int $chatId, string $callbackId): ?string
    {
        $this->answerCallbackQuery($callbackId, 'Saving...');

        $state = $this->getInputeventConversation($chatId);
        if (! $state) {
            return $this->sendMessage($chatId, 'Session expired. Start again with /inputevent');
        }

        $this->clearInputeventConversation($chatId);
        $d = $state['data'];

        $startDatetime = $d['date'].' '.$d['start_time'].':00';
        $endDatetime = $d['date'].' '.$d['end_time'].':00';

        CalendarEvent::create([
            'user_id' => $d['user_id'],
            'title' => $d['title'],
            'description' => $d['description'] ?? null,
            'start_datetime' => $startDatetime,
            'end_datetime' => $endDatetime,
            'all_day' => false,
            'color' => '#3B82F6',
            'venue' => $d['venue'] ?? null,
            'type' => $d['type'] ?? null,
            'pax' => $d['pax'] ?? null,
            'file_path' => $d['file_path'] ?? null,
        ]);

        return $this->sendMessage($chatId, "✅ Event \"{$d['title']}\" for {$d['date']} created.");
    }

    // ─── Store Item Shortcuts ──────────────────────────────────────

    private function getStoreItemShortcutLines(?bool $inStockOnly = false): array
    {
        $query = StoreItem::orderBy('name');
        if ($inStockOnly) {
            $query->where('stock', '>', 0);
        }
        $items = $query->get(['id', 'name', 'stock', 'unit']);
        if ($items->isEmpty()) {
            return [];
        }

        $lines = [];
        foreach ($items as $item) {
            $lines[] = "/{$item->id} — {$item->name} — available Qty: {$item->stock} {$item->unit}";
        }

        return $lines;
    }

    private function handleStoreItemShortcut(int $chatId, int $itemId): ?string
    {
        $item = StoreItem::find($itemId);
        if (! $item) {
            return $this->sendMessage($chatId, 'Item not found.');
        }

        return $this->sendMessage($chatId, "/{$item->id} — {$item->name}\nStock: {$item->stock} {$item->unit}\n\nUse /rcv, /req, or /adj to create a transaction.");
    }

    // ─── Store Receiving (rcv) ─────────────────────────────────────

    private function handleStoreRcvStart(int $chatId, User $user): ?string
    {
        if (! $user->can('manage projects')) {
            return $this->sendMessage($chatId, '❌ You do not have permission to create store receivings.');
        }

        $this->clearConversation($chatId);
        $this->clearCmdConversation($chatId);
        $this->clearStoreRcvConversation($chatId);

        $this->setStoreRcvConversation($chatId, [
            'step' => 'item',
            'data' => ['user_id' => $user->id],
        ]);

        return $this->askStoreRcvItems($chatId);
    }

    private function handleStoreRcvText(int $chatId, User $user, string $text, array $state): ?string
    {
        if (strtolower($text) === 'cancel' || str_starts_with($text, '/cancel')) {
            $this->clearStoreRcvConversation($chatId);

            return $this->sendMessage($chatId, 'Receiving creation cancelled.');
        }

        return match ($state['step']) {
            'item' => $this->processStoreRcvItemText($chatId, $state, $text),
            'qty' => $this->processStoreRcvQty($chatId, $state, $text),
            'unit_price' => $this->processStoreRcvUnitPrice($chatId, $state, $text),
            'date' => $this->processStoreRcvDate($chatId, $state, $text),
            'reference' => $this->processStoreRcvReference($chatId, $state, $text),
            'notes' => $this->processStoreRcvNotes($chatId, $state, $text),
            default => $this->sendMessage($chatId, 'Something went wrong. Start again with /rcv'),
        };
    }

    private function processStoreRcvItemText(int $chatId, array $state, string $text): ?string
    {
        if (! preg_match('#^/(\d+)$#', trim($text), $m)) {
            return $this->sendMessage($chatId, 'Type an item number like /5.');
        }
        $item = StoreItem::find((int) $m[1]);
        if (! $item) {
            return $this->sendMessage($chatId, 'Item not found. Type a valid number from the list above.');
        }

        $state['data']['item_id'] = $item->id;
        $state['data']['item_name'] = $item->name;
        $state['step'] = 'qty';
        $this->setStoreRcvConversation($chatId, $state);

        return $this->sendMessage($chatId, "Item: {$item->name} ({$item->stock} {$item->unit} in stock)\nQty received? (number, min 1):");
    }

    private function askStoreRcvItems(int $chatId): ?string
    {
        $shortcutLines = $this->getStoreItemShortcutLines();
        if (empty($shortcutLines)) {
            return $this->sendMessage($chatId, 'No items found.');
        }

        return $this->sendMessage($chatId, "Select item — type a shortcut number:\n\n".implode("\n", $shortcutLines));
    }

    private function processStoreRcvQty(int $chatId, array $state, string $text): ?string
    {
        $qty = (int) trim($text);
        if ($qty < 1) {
            return $this->sendMessage($chatId, 'Invalid. Enter a number (min 1):');
        }

        $state['data']['qty_received'] = $qty;
        $state['step'] = 'unit_price';
        $this->setStoreRcvConversation($chatId, $state);

        return $this->sendMessage($chatId, '💰 Unit price? (number, or /skip):');
    }

    private function processStoreRcvUnitPrice(int $chatId, array $state, string $text): ?string
    {
        if (strtolower($text) !== '/skip') {
            $price = (float) trim($text);
            if ($price < 0) {
                return $this->sendMessage($chatId, 'Invalid. Enter a non-negative number:');
            }
            $state['data']['unit_price'] = $price;
        }

        $state['step'] = 'date';
        $this->setStoreRcvConversation($chatId, $state);

        return $this->sendMessage($chatId, '📅 Receipt date (YYYY-MM-DD) or /skip for today:');
    }

    private function processStoreRcvDate(int $chatId, array $state, string $text): ?string
    {
        if (strtolower($text) === '/skip') {
            $state['data']['receipt_date'] = today()->toDateString();
        } else {
            try {
                $state['data']['receipt_date'] = Carbon::parse(trim($text))->toDateString();
            } catch (\Exception $e) {
                return $this->sendMessage($chatId, 'Invalid date. Use YYYY-MM-DD format:');
            }
        }

        $state['step'] = 'reference';
        $this->setStoreRcvConversation($chatId, $state);

        return $this->sendMessage($chatId, '📎 Reference (PO number, delivery note, or /skip):');
    }

    private function processStoreRcvReference(int $chatId, array $state, string $text): ?string
    {
        if (strtolower($text) !== '/skip') {
            $state['data']['reference'] = trim($text);
        }

        $state['step'] = 'notes';
        $this->setStoreRcvConversation($chatId, $state);

        return $this->sendMessage($chatId, '📝 Notes? (text, or /skip):');
    }

    private function processStoreRcvNotes(int $chatId, array $state, string $text): ?string
    {
        if (strtolower($text) !== '/skip') {
            $state['data']['notes'] = trim($text);
        }

        $state['step'] = 'confirm';
        $this->setStoreRcvConversation($chatId, $state);

        return $this->showStoreRcvConfirm($chatId, $state);
    }

    private function showStoreRcvConfirm(int $chatId, array $state): ?string
    {
        $d = $state['data'];
        $lines = [
            '📦 Receiving',
            '',
            "Item:       {$d['item_name']}",
            "Qty:        {$d['qty_received']}",
            'Unit price: '.(isset($d['unit_price']) ? 'Rp '.number_format($d['unit_price'], 2) : 'None'),
            "Date:       {$d['receipt_date']}",
        ];
        if (! empty($d['reference'])) {
            $lines[] = "Reference:  {$d['reference']}";
        }
        if (! empty($d['notes'])) {
            $lines[] = "Notes:      {$d['notes']}";
        }

        $keyboard = ['inline_keyboard' => [
            [['text' => '✅ Confirm', 'callback_data' => 'store_rcv:confirm']],
            [['text' => ' Cancel', 'callback_data' => 'store_rcv:cancel']],
        ]];

        return $this->sendMessage($chatId, implode("\n", $lines), $keyboard);
    }

    private function processStoreRcvConfirm(int $chatId, string $callbackId): ?string
    {
        $this->answerCallbackQuery($callbackId, 'Saving...');

        $state = $this->getStoreRcvConversation($chatId);
        if (! $state) {
            return $this->sendMessage($chatId, 'Session expired. Start again with /rcv');
        }

        $this->clearStoreRcvConversation($chatId);
        $d = $state['data'];

        $receiving = StoreReceiving::create([
            'item_id' => $d['item_id'],
            'qty_received' => $d['qty_received'],
            'unit_price' => $d['unit_price'] ?? null,
            'receipt_date' => $d['receipt_date'] ?? today()->toDateString(),
            'reference' => $d['reference'] ?? null,
            'notes' => $d['notes'] ?? null,
            'created_by' => $d['user_id'],
        ]);

        $receiving->item->increment('stock', $d['qty_received']);

        return $this->sendMessage($chatId, "✅ Receiving of {$d['qty_received']} {$receiving->item->unit}(s) of {$d['item_name']} saved. Stock updated.");
    }

    // ─── Store Request (req) ───────────────────────────────────────

    private function handleStoreReqStart(int $chatId, User $user): ?string
    {
        $this->clearConversation($chatId);
        $this->clearCmdConversation($chatId);
        $this->clearStoreReqConversation($chatId);

        $this->setStoreReqConversation($chatId, [
            'step' => 'item',
            'data' => ['user_id' => $user->id],
        ]);

        return $this->askStoreReqItems($chatId);
    }

    private function handleStoreReqText(int $chatId, User $user, string $text, array $state): ?string
    {
        if (strtolower($text) === 'cancel' || str_starts_with($text, '/cancel')) {
            $this->clearStoreReqConversation($chatId);

            return $this->sendMessage($chatId, 'Request creation cancelled.');
        }

        return match ($state['step']) {
            'item' => $this->processStoreReqItemText($chatId, $state, $text),
            'qty' => $this->processStoreReqQty($chatId, $state, $text),
            'date' => $this->processStoreReqDate($chatId, $state, $text),
            'notes' => $this->processStoreReqNotes($chatId, $state, $text),
            default => $this->sendMessage($chatId, 'Something went wrong. Start again with /req'),
        };
    }

    private function processStoreReqItemText(int $chatId, array $state, string $text): ?string
    {
        if (! preg_match('#^/(\d+)$#', trim($text), $m)) {
            return $this->sendMessage($chatId, 'Type an item number like /5.');
        }
        $item = StoreItem::find((int) $m[1]);
        if (! $item) {
            return $this->sendMessage($chatId, 'Item not found. Type a valid number from the list above.');
        }

        $state['data']['item_id'] = $item->id;
        $state['data']['item_name'] = $item->name;
        $state['step'] = 'qty';
        $this->setStoreReqConversation($chatId, $state);

        return $this->sendMessage($chatId, "Item: {$item->name} ({$item->stock} {$item->unit} in stock)\nQty requested? (number, min 1):");
    }

    private function askStoreReqItems(int $chatId): ?string
    {
        $shortcutLines = $this->getStoreItemShortcutLines(true);
        if (empty($shortcutLines)) {
            return $this->sendMessage($chatId, 'No items in stock.');
        }

        return $this->sendMessage($chatId, "Select item — type a shortcut number (only items with stock > 0):\n\n".implode("\n", $shortcutLines));
    }

    private function processStoreReqQty(int $chatId, array $state, string $text): ?string
    {
        $qty = (int) trim($text);
        if ($qty < 1) {
            return $this->sendMessage($chatId, 'Invalid. Enter a number (min 1):');
        }

        $state['data']['qty_requested'] = $qty;
        $state['step'] = 'wo';
        $this->setStoreReqConversation($chatId, $state);

        return $this->askStoreReqWorkOrders($chatId, $state);
    }

    private function askStoreReqWorkOrders(int $chatId, array $state): ?string
    {
        $userId = $state['data']['user_id'];
        $wos = WorkOrder::where('requester_id', $userId)
            ->whereIn('status', ['pending_dept_head', 'pending_chief_engineer', 'approved', 'assigned', 'in_progress'])
            ->orderBy('created_at', 'desc')
            ->take(10)
            ->get(['id', 'title']);

        $keyboard = ['inline_keyboard' => []];

        foreach ($wos->chunk(1) as $chunk) {
            foreach ($chunk as $wo) {
                $label = mb_strlen($wo->title) > 35 ? mb_substr($wo->title, 0, 32).'...' : $wo->title;
                $keyboard['inline_keyboard'][] = [
                    ['text' => $label, 'callback_data' => "store_req_wo:{$wo->id}"],
                ];
            }
        }

        $keyboard['inline_keyboard'][] = [
            ['text' => ' Skip Work Order', 'callback_data' => 'store_req_wo:skip'],
        ];

        $text = $wos->isEmpty()
            ? 'No work orders found. Tap Skip to continue.'
            : 'Link to a work order? (or Skip):';

        return $this->sendMessage($chatId, $text, $keyboard);
    }

    private function processStoreReqDate(int $chatId, array $state, string $text): ?string
    {
        if (strtolower($text) === '/skip') {
            $state['data']['request_date'] = today()->toDateString();
        } else {
            try {
                $state['data']['request_date'] = Carbon::parse(trim($text))->toDateString();
            } catch (\Exception $e) {
                return $this->sendMessage($chatId, 'Invalid date. Use YYYY-MM-DD format:');
            }
        }

        $state['step'] = 'notes';
        $this->setStoreReqConversation($chatId, $state);

        return $this->sendMessage($chatId, '📝 Notes? (text, or /skip):');
    }

    private function processStoreReqNotes(int $chatId, array $state, string $text): ?string
    {
        if (strtolower($text) !== '/skip') {
            $state['data']['notes'] = trim($text);
        }

        $state['step'] = 'confirm';
        $this->setStoreReqConversation($chatId, $state);

        return $this->showStoreReqConfirm($chatId, $state);
    }

    private function showStoreReqConfirm(int $chatId, array $state): ?string
    {
        $d = $state['data'];
        $lines = [
            '📋 Store Request',
            '',
            "Item:       {$d['item_name']}",
            "Qty:        {$d['qty_requested']}",
            "Date:       {$d['request_date']}",
        ];
        if (! empty($d['work_order_id'])) {
            $wo = WorkOrder::find($d['work_order_id']);
            $lines[] = 'Work Order: '.($wo ? $wo->title : "#{$d['work_order_id']}");
        }
        if (! empty($d['notes'])) {
            $lines[] = "Notes:      {$d['notes']}";
        }

        $keyboard = ['inline_keyboard' => [
            [['text' => '✅ Confirm', 'callback_data' => 'store_req:confirm']],
            [['text' => ' Cancel', 'callback_data' => 'store_req:cancel']],
        ]];

        return $this->sendMessage($chatId, implode("\n", $lines), $keyboard);
    }

    private function processStoreReqConfirm(int $chatId, string $callbackId): ?string
    {
        $this->answerCallbackQuery($callbackId, 'Saving...');

        $state = $this->getStoreReqConversation($chatId);
        if (! $state) {
            return $this->sendMessage($chatId, 'Session expired. Start again with /req');
        }

        $this->clearStoreReqConversation($chatId);
        $d = $state['data'];

        StoreRequest::create([
            'item_id' => $d['item_id'],
            'work_order_id' => $d['work_order_id'] ?? null,
            'requested_by' => $d['user_id'],
            'qty_requested' => $d['qty_requested'],
            'status' => 'pending',
            'request_date' => $d['request_date'] ?? today()->toDateString(),
            'notes' => $d['notes'] ?? null,
        ]);

        return $this->sendMessage($chatId, "✅ Request for {$d['qty_requested']}x {$d['item_name']} submitted (pending).");
    }

    // ─── Store Adjustment (adj) ────────────────────────────────────

    private function handleStoreAdjStart(int $chatId, User $user): ?string
    {
        if (! $user->can('manage projects')) {
            return $this->sendMessage($chatId, '❌ You do not have permission to create stock adjustments.');
        }

        $this->clearConversation($chatId);
        $this->clearCmdConversation($chatId);
        $this->clearStoreAdjConversation($chatId);

        $this->setStoreAdjConversation($chatId, [
            'step' => 'item',
            'data' => ['user_id' => $user->id],
        ]);

        return $this->askStoreAdjItems($chatId);
    }

    private function handleStoreAdjText(int $chatId, User $user, string $text, array $state): ?string
    {
        if (strtolower($text) === 'cancel' || str_starts_with($text, '/cancel')) {
            $this->clearStoreAdjConversation($chatId);

            return $this->sendMessage($chatId, 'Adjustment cancelled.');
        }

        return match ($state['step']) {
            'item' => $this->processStoreAdjItemText($chatId, $state, $text),
            'qty' => $this->processStoreAdjQty($chatId, $state, $text),
            'reason' => $this->processStoreAdjReason($chatId, $state, $text),
            default => $this->sendMessage($chatId, 'Something went wrong. Start again with /adj'),
        };
    }

    private function processStoreAdjItemText(int $chatId, array $state, string $text): ?string
    {
        if (! preg_match('#^/(\d+)$#', trim($text), $m)) {
            return $this->sendMessage($chatId, 'Type an item number like /5.');
        }
        $item = StoreItem::find((int) $m[1]);
        if (! $item) {
            return $this->sendMessage($chatId, 'Item not found. Type a valid number from the list above.');
        }

        $state['data']['item_id'] = $item->id;
        $state['data']['item_name'] = $item->name;
        $state['step'] = 'qty';
        $this->setStoreAdjConversation($chatId, $state);

        return $this->sendMessage($chatId, "Item: {$item->name} ({$item->stock} {$item->unit} in stock)\nQty? (positive=add, negative=remove, cannot be 0):");
    }

    private function askStoreAdjItems(int $chatId): ?string
    {
        $shortcutLines = $this->getStoreItemShortcutLines();
        if (empty($shortcutLines)) {
            return $this->sendMessage($chatId, 'No items found.');
        }

        return $this->sendMessage($chatId, "Select item — type a shortcut number:\n\n".implode("\n", $shortcutLines));
    }

    private function processStoreAdjQty(int $chatId, array $state, string $text): ?string
    {
        $qty = (int) trim($text);
        if ($qty === 0) {
            return $this->sendMessage($chatId, 'Qty cannot be 0. Use positive to add stock, negative to remove:');
        }

        $state['data']['qty'] = $qty;
        $state['step'] = 'reason';
        $this->setStoreAdjConversation($chatId, $state);

        return $this->sendMessage($chatId, '📝 Reason for adjustment? (text, or /skip):');
    }

    private function processStoreAdjReason(int $chatId, array $state, string $text): ?string
    {
        if (strtolower($text) !== '/skip') {
            $state['data']['reason'] = trim($text);
        }

        $state['step'] = 'confirm';
        $this->setStoreAdjConversation($chatId, $state);

        return $this->showStoreAdjConfirm($chatId, $state);
    }

    private function showStoreAdjConfirm(int $chatId, array $state): ?string
    {
        $d = $state['data'];
        $lines = [
            '⚖️ Stock Adjustment',
            '',
            "Item:       {$d['item_name']}",
            'Qty:        '.($d['qty'] > 0 ? "+{$d['qty']}" : $d['qty']),
        ];
        if (! empty($d['reason'])) {
            $lines[] = "Reason:     {$d['reason']}";
        }
        $lines[] = 'Status:     Pending approval';

        $keyboard = ['inline_keyboard' => [
            [['text' => '✅ Confirm', 'callback_data' => 'store_adj:confirm']],
            [['text' => ' Cancel', 'callback_data' => 'store_adj:cancel']],
        ]];

        return $this->sendMessage($chatId, implode("\n", $lines), $keyboard);
    }

    private function processStoreAdjConfirm(int $chatId, string $callbackId): ?string
    {
        $this->answerCallbackQuery($callbackId, 'Saving...');

        $state = $this->getStoreAdjConversation($chatId);
        if (! $state) {
            return $this->sendMessage($chatId, 'Session expired. Start again with /adj');
        }

        $this->clearStoreAdjConversation($chatId);
        $d = $state['data'];

        StoreStockAdjustment::create([
            'item_id' => $d['item_id'],
            'qty' => $d['qty'],
            'reason' => $d['reason'] ?? null,
            'status' => 'pending',
            'requested_by' => $d['user_id'],
        ]);

        return $this->sendMessage($chatId, "✅ Adjustment for {$d['item_name']} submitted (pending chief engineer approval).");
    }

    // ─── Telegram API helpers ──────────────────────────────────────

    public function sendNotification(int $chatId, string $text): ?string
    {
        return $this->sendMessage($chatId, $text);
    }

    public function sendMessage(int $chatId, string $text, ?array $keyboard = null): ?string
    {
        if (! $this->isConfigured()) {
            return $text;
        }

        $payload = [
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'HTML',
        ];

        if ($keyboard) {
            $payload['reply_markup'] = json_encode($keyboard);
        }

        $response = Http::withoutVerifying()->post("{$this->apiUrl}/sendMessage", $payload);

        return $response->successful() ? $response->body() : null;
    }

    public function sendPhoto(int $chatId, string $photoPath, string $caption, ?array $keyboard = null): ?string
    {
        if (! $this->isConfigured()) {
            return $caption;
        }

        $fullPath = storage_path('app/public/'.$photoPath);

        $payload = [
            'chat_id' => $chatId,
            'caption' => $caption,
            'parse_mode' => 'HTML',
        ];

        if ($keyboard) {
            $payload['reply_markup'] = json_encode($keyboard);
        }

        if (file_exists($fullPath)) {
            $http = Http::withoutVerifying()->attach(
                'photo', file_get_contents($fullPath), basename($photoPath)
            );

            $response = $http->post("{$this->apiUrl}/sendPhoto", $payload);
        } else {
            $payload['photo'] = $photoPath;
            $response = Http::withoutVerifying()->post("{$this->apiUrl}/sendPhoto", $payload);
        }

        return $response->successful() ? $response->body() : null;
    }

    public function answerCallbackQuery(string $callbackQueryId, string $text): ?string
    {
        $response = Http::withoutVerifying()->post("{$this->apiUrl}/answerCallbackQuery", [
            'callback_query_id' => $callbackQueryId,
            'text' => $text,
            'show_alert' => false,
        ]);

        return $response->successful() ? $response->body() : null;
    }

    public function editMessageText(int $chatId, int $messageId, string $text): ?string
    {
        $response = Http::withoutVerifying()->post("{$this->apiUrl}/editMessageText", [
            'chat_id' => $chatId,
            'message_id' => $messageId,
            'text' => $text,
            'parse_mode' => 'HTML',
        ]);

        return $response->successful() ? $response->body() : null;
    }

    public function editMessageReplyMarkup(int $chatId, int $messageId): ?string
    {
        $response = Http::withoutVerifying()->post("{$this->apiUrl}/editMessageReplyMarkup", [
            'chat_id' => $chatId,
            'message_id' => $messageId,
        ]);

        return $response->successful() ? $response->body() : null;
    }
}
