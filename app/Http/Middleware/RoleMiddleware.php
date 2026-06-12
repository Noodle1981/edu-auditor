<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401);
        }

        $userRole = $user->role;
        $allowed = false;

        foreach ($roles as $role) {
            if ($userRole === $role) {
                $allowed = true;
                break;
            }
            if ($role === 'user' && $userRole === 'administrativos') {
                $allowed = true;
                break;
            }
        }

        if (! $allowed) {
            abort(403, 'Unauthorized access.');
        }

        return $next($request);
    }
}
