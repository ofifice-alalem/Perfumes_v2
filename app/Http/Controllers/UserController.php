<?php

namespace App\Http\Controllers;

use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users,username',
            'email'    => 'nullable|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role'     => 'required|in:super-admin,admin,saler',
        ]);

        $data['password'] = Hash::make($data['password']);
        $this->users->create($data);

        return back()->with('success', 'تم إضافة المستخدم بنجاح');
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users,username,' . $id,
            'email'    => 'nullable|email|unique:users,email,' . $id,
            'password' => 'nullable|string|min:6',
            'role'     => 'required|in:super-admin,admin,saler',
        ]);

        if (empty($data['password'])) {
            unset($data['password']);
        } else {
            $data['password'] = Hash::make($data['password']);
        }

        $this->users->update($id, $data);

        return back()->with('success', 'تم تحديث المستخدم بنجاح');
    }

    public function destroy(int $id)
    {
        if ($this->users->hasInvoices($id)) {
            return back()->with('error', 'لا يمكن حذف مستخدم مرتبط بفواتير');
        }

        $this->users->delete($id);

        return back()->with('success', 'تم حذف المستخدم بنجاح');
    }
}
