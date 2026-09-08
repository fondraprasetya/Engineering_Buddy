<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TelegramService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TelegramController extends Controller
{
    public function __construct(
        private readonly TelegramService $telegram,
    ) {}

    public function link(Request $request): JsonResponse
    {
        $code = $this->telegram->generateLinkCode($request->user());

        return response()->json([
            'code' => $code,
            'expires_in' => 600,
            'message' => "Send /start {$code} to the Engineering Buddy bot in Telegram.",
        ]);
    }

    public function webhook(Request $request): JsonResponse
    {
        try {
            $this->telegram->handleWebhook($request->all());
        } catch (\Throwable $e) {
            Log::error('Telegram webhook error', [
                'message' => $e->getMessage(),
            ]);
        }

        return response()->json(['ok' => true]);
    }

    public function status(Request $request): JsonResponse
    {
        $link = $request->user()->telegramLink()->whereNotNull('linked_at')->first();

        return response()->json([
            'linked' => $link !== null,
            'chat_id' => $link?->chat_id,
            'linked_at' => $link?->linked_at,
        ]);
    }

    public function unlink(Request $request): JsonResponse
    {
        $link = $request->user()->telegramLink()->whereNotNull('linked_at')->first();
        if ($link) {
            $link->update(['chat_id' => null, 'linked_at' => null, 'link_code' => null, 'link_code_expires_at' => null]);
        }

        return response()->json(['message' => 'Telegram account unlinked.']);
    }
}
