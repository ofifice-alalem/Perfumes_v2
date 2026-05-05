<?php

namespace App\Http\Controllers;

use App\Http\Requests\UserRequest;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function __construct(private UserRepositoryInterface $users) {}

    public function index(): Response
    {
        return Inertia::render('Users/Index', [
            'users' => $this->users->allOrdered(),
        ]);
    }

    public function store(UserRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['role'] = $data['role'] ?? 'admin';

        $this->users->create($data);

        return back()->with('success', 'تم إضافة المستخدم بنجاح');
    }

    public function update(UserRequest $request, int $id): RedirectResponse
    {
        $data = $request->validated();

        if (empty($data['password'])) {
            unset($data['password']);
        }

        $this->users->update($data, $id);

        return back()->with('success', 'تم تحديث المستخدم بنجاح');
    }

    public function destroy(int $id): RedirectResponse
    {
        $this->users->delete($id);

        return back()->with('success', 'تم حذف المستخدم بنجاح');
    }
}
