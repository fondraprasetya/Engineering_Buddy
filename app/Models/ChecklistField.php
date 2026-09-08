<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ChecklistField extends Model
{
    protected $fillable = ['template_id', 'page', 'label', 'field_type', 'required', 'sort_order', 'x', 'y', 'width', 'photo'];

    protected function casts(): array
    {
        return [
            'required' => 'boolean',
            'page' => 'integer',
            'x' => 'integer',
            'y' => 'integer',
            'width' => 'integer',
        ];
    }

    public static function storePhoto(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (! str_starts_with($value, 'data:image/')) {
            return $value;
        }

        if (! preg_match('/^data:image\/(png|jpeg|webp|gif);base64,(.+)$/s', $value, $matches)) {
            return null;
        }

        $decoded = base64_decode($matches[2], true);
        if ($decoded === false) {
            return null;
        }

        $extension = $matches[1] === 'jpeg' ? 'jpg' : $matches[1];
        $name = Str::uuid()->toString().'.'.$extension;
        $path = "checklist-photos/{$name}";

        return Storage::disk('public')->put($path, $decoded) ? $path : null;
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(ChecklistTemplate::class, 'template_id');
    }

    public function responses(): HasMany
    {
        return $this->hasMany(ChecklistResponse::class, 'field_id');
    }
}
