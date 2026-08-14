<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;

class OperationalRoutesTest extends TestCase
{
    private function getAuthenticatedUser(): User
    {
        $user = User::first();
        if (!$user) {
            $user = User::factory()->create();
        }
        return $user;
    }

    public function test_guest_is_redirected_to_login_on_protected_routes(): void
    {
        $response = $this->get('/products');
        $response->assertStatus(302);
        $response->assertRedirect('/login');
    }

    public function test_authenticated_admin_can_access_operational_pages(): void
    {
        $user = $this->getAuthenticatedUser();

        $routes = [
            '/products',
            '/categories',
            '/customers',
            '/suppliers',
            '/payment-methods',
            '/reports',
            '/reports/customer-aging',
            '/reports/supplier-aging',
            '/reports/product-movement',
        ];

        foreach ($routes as $route) {
            $response = $this->actingAs($user)->get($route);
            $response->assertStatus(200);
        }
    }
}
