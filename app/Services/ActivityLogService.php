<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class ActivityLogService
{
    /**
     * Log a creation action.
     */
    public function logCreate(Model $model, string $description)
    {
        $this->log('create', $model, $description);
    }

    /**
     * Log an update action.
     */
    public function logUpdate(Model $model, string $description, ?array $changes = null)
    {
        // If changes aren't provided, try to calculate them
        if ($changes === null && $model->wasChanged()) {
            $changes = [
                'before' => array_intersect_key($model->getOriginal(), $model->getDirty()),
                'after' => $model->getDirty(),
            ];
        }

        $this->log('update', $model, $description, $changes);
    }

    /**
     * Log a delete action.
     */
    public function logDelete(Model $model, string $description)
    {
        $data = $model->toArray();
        $this->log('delete', $model, $description, ['attributes' => $data]);
    }

    /**
     * Main logging method.
     */
    protected function log(string $action, Model $model, string $description, ?array $changes = null)
    {
        if (!Auth::check()) {
            return;
        }

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => $action,
            'model_type' => get_class($model),
            'model_id' => $model->getKey(),
            'description' => $description,
            'changes' => $changes,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Get recent activity.
     */
    public function getRecentActivity(int $limit = 10)
    {
        return ActivityLog::with('user')
            ->latest()
            ->take($limit)
            ->get();
    }
}
