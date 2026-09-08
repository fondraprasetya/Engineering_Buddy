<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class TelegramSetWebhook extends Command
{
    protected $signature = 'telegram:set-webhook
                            {url? : Webhook URL (defaults to app.url + /api/v1/telegram/webhook)}
                            {--info : Show current webhook status instead of setting}';

    protected $description = 'Set or inspect the Telegram bot webhook';

    public function handle(): int
    {
        $token = config('services.telegram.bot_token');

        if (empty($token)) {
            $this->error('TELEGRAM_BOT_TOKEN is not set in .env');

            return Command::FAILURE;
        }

        if ($this->option('info')) {
            return $this->showWebhookInfo($token);
        }

        $url = $this->argument('url') ?? config('app.url').'/api/v1/telegram/webhook';

        $this->components->task("Setting webhook to {$url}", function () use ($token, $url) {
            $response = Http::withoutVerifying()->post("https://api.telegram.org/bot{$token}/setWebhook", [
                'url' => $url,
            ]);

            if (! $response->successful()) {
                $this->error('Telegram API error: '.$response->body());

                return false;
            }

            $data = $response->json();

            if (! ($data['ok'] ?? false)) {
                $this->error('Telegram rejected: '.($data['description'] ?? 'unknown'));

                return false;
            }

            return true;
        });

        return Command::SUCCESS;
    }

    private function showWebhookInfo(string $token): int
    {
        $response = Http::withoutVerifying()->post("https://api.telegram.org/bot{$token}/getWebhookInfo");

        if (! $response->successful()) {
            $this->error('Failed to fetch webhook info');

            return Command::FAILURE;
        }

        $data = $response->json()['result'] ?? [];

        $this->components->twoColumnDetail('URL', $data['url'] ?? 'not set');
        $this->components->twoColumnDetail('Pending updates', (string) ($data['pending_update_count'] ?? 0));
        $this->components->twoColumnDetail('Last error', $data['last_error_message'] ?? 'none');
        $this->components->twoColumnDetail('Max connections', (string) ($data['max_connections'] ?? '?'));

        return Command::SUCCESS;
    }
}
