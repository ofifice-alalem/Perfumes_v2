<?php

namespace App\Http\Controllers;

use App\Http\Requests\CategoryRequest;
use App\Repositories\Contracts\CategoryRepositoryInterface;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    public function __construct(private CategoryRepositoryInterface $categories) {}

    public function index(): Response
    {
        return Inertia::render('Categories/Index', [
            'categories' => $this->categories->allOrdered(),
        ]);
    }

    public function store(CategoryRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['is_operational'] = $request->boolean('is_operational');

        $this->categories->create($data);

        return back()->with('success', 'تم إضافة التصنيف بنجاح');
    }

    public function update(CategoryRequest $request, int $id): RedirectResponse
    {
        $data = $request->validated();
        $data['is_operational'] = $request->boolean('is_operational');

        $this->categories->update($data, $id);

        return back()->with('success', 'تم تحديث التصنيف بنجاح');
    }

    public function destroy(int $id): RedirectResponse
    {
        if ($this->categories->hasProducts($id)) {
            return back()->with('error', 'لا يمكن حذف تصنيف مرتبط بمنتجات');
        }

        $this->categories->delete($id);

        return back()->with('success', 'تم حذف التصنيف بنجاح');
    }
}
