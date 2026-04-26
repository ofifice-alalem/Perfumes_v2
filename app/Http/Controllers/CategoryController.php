<?php

namespace App\Http\Controllers;

use App\Repositories\Contracts\CategoryRepositoryInterface;
use Illuminate\Http\Request;
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

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name',
            'unit' => 'required|in:ml,pcs,g',
        ]);

        $this->categories->create($data);

        return back()->with('success', 'تم إضافة التصنيف بنجاح');
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name,' . $id,
            'unit' => 'required|in:ml,pcs,g',
        ]);

        $this->categories->update($id, $data);

        return back()->with('success', 'تم تحديث التصنيف بنجاح');
    }

    public function destroy(int $id)
    {
        if ($this->categories->hasProducts($id)) {
            return back()->with('error', 'لا يمكن حذف تصنيف مرتبط بمنتجات');
        }

        $this->categories->delete($id);

        return back()->with('success', 'تم حذف التصنيف بنجاح');
    }
}
