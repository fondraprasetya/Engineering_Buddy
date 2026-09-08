<?php

namespace App\Console\Commands;

use App\Models\ActualExpense;
use App\Models\Project;
use Illuminate\Console\Command;

class SyncBudgetActualToExpenses extends Command
{
    protected $signature = 'budget:sync-expenses';

    protected $description = 'Sync all budget actual amounts to ActualExpenses';

    public function handle(): int
    {
        $projects = Project::whereNotNull('budget_items')->get();

        $created = 0;
        foreach ($projects as $project) {
            ActualExpense::where('project_id', $project->id)
                ->where('document_ref', 'Auto from budget')
                ->delete();

            $items = collect($project->budget_items);
            foreach ($items as $item) {
                $actual = (float) ($item['actual_amount'] ?? 0);
                if ($actual <= 0) {
                    continue;
                }

                ActualExpense::create([
                    'expense_date' => now()->toDateString(),
                    'post_account' => null,
                    'amount' => $actual,
                    'description' => ($item['description'] ?: 'Budget item').' (auto)',
                    'document_ref' => 'Auto from budget',
                    'status' => 'actual',
                    'project_id' => $project->id,
                    'created_by' => $project->created_by,
                ]);
                $created++;
            }
        }

        $this->info("Synced {$created} budget items to ActualExpenses.");

        return static::SUCCESS;
    }
}
