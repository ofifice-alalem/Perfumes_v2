<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Category;
use App\Models\PriceTier;
use App\Models\Product;
use App\Models\ProductPrice;
use App\Models\OriginalPerfumeDetail;

class StockSeeder extends Seeder
{
    public function run(): void
    {
        $catZitiId   = Category::where('name', 'عطور زيتية')->first()?->id;
        $catAsliId   = Category::where('name', 'عطور أصلية')->first()?->id;
        $catBkhorId  = Category::where('name', 'بخور')->first()?->id;
        $catWashqId  = Category::where('name', 'وشق')->first()?->id;
        $catMbkharaId = Category::where('name', 'مبخرة')->first()?->id;

        $tierA = PriceTier::where('name', 'A')->first()?->id;
        $tierB = PriceTier::where('name', 'B')->first()?->id;
        $tierC = PriceTier::where('name', 'C')->first()?->id;

        // عطور زيتية
        $zitiya = [
            ['name' => 'Lacoste White',    'tier' => $tierA, 'stock' => 500],
            ['name' => 'Azzaro Chrome',    'tier' => $tierA, 'stock' => 300],
            ['name' => 'Armani Code',      'tier' => $tierB, 'stock' => 400],
            ['name' => 'Bleu de Chanel',   'tier' => $tierB, 'stock' => 350],
            ['name' => 'Dior Sauvage Oil', 'tier' => $tierC, 'stock' => 200],
            ['name' => 'Tom Ford Oud',     'tier' => $tierC, 'stock' => 150],
        ];

        foreach ($zitiya as $p) {
            Product::firstOrCreate(
                ['name' => $p['name']],
                ['category_id' => $catZitiId, 'price_tier_id' => $p['tier'], 'selling_type' => 'tier_based', 'stock' => $p['stock'], 'min_stock' => 50]
            );
        }

        // عطور أصلية
        $aslia = [
            ['name' => 'Dior Sauvage',    'bottle' => 200, 'per_r' => 3.5,  'per_v' => 3.0,  'full_r' => 500, 'full_v' => 450, 'stock' => 600],
            ['name' => 'Chanel No.5',     'bottle' => 100, 'per_r' => 5.0,  'per_v' => 4.5,  'full_r' => 450, 'full_v' => 400, 'stock' => 300],
            ['name' => 'Bleu de Chanel',  'bottle' => 150, 'per_r' => 4.0,  'per_v' => 3.5,  'full_r' => 550, 'full_v' => 500, 'stock' => 450],
        ];

        foreach ($aslia as $p) {
            $product = Product::firstOrCreate(
                ['name' => $p['name']],
                ['category_id' => $catAsliId, 'price_tier_id' => null, 'selling_type' => 'unit_priced', 'stock' => $p['stock'], 'min_stock' => 50]
            );
            ProductPrice::firstOrCreate(['product_id' => $product->id], [
                'price_per_unit_regular' => $p['per_r'],
                'price_per_unit_vip'     => $p['per_v'],
                'full_bottle_regular'    => $p['full_r'],
                'full_bottle_vip'        => $p['full_v'],
            ]);
            OriginalPerfumeDetail::firstOrCreate(['product_id' => $product->id], ['bottle_volume' => $p['bottle']]);
        }

        // بخور
        $bkhor = [
            ['name' => 'بخور عود',    'per_r' => 5.0, 'per_v' => 4.0, 'stock' => 200],
            ['name' => 'بخور مسك',    'per_r' => 4.0, 'per_v' => 3.5, 'stock' => 150],
        ];

        foreach ($bkhor as $p) {
            $product = Product::firstOrCreate(
                ['name' => $p['name']],
                ['category_id' => $catBkhorId, 'price_tier_id' => null, 'selling_type' => 'unit_priced', 'stock' => $p['stock'], 'min_stock' => 20]
            );
            ProductPrice::firstOrCreate(['product_id' => $product->id], [
                'price_per_unit_regular' => $p['per_r'],
                'price_per_unit_vip'     => $p['per_v'],
                'full_bottle_regular'    => null,
                'full_bottle_vip'        => null,
            ]);
        }

        // وشق
        $washq = [
            ['name' => 'وشق مسك',    'per_r' => 2.0, 'per_v' => 1.5, 'stock' => 500],
            ['name' => 'وشق عنبر',   'per_r' => 3.0, 'per_v' => 2.5, 'stock' => 300],
        ];

        foreach ($washq as $p) {
            $product = Product::firstOrCreate(
                ['name' => $p['name']],
                ['category_id' => $catWashqId, 'price_tier_id' => null, 'selling_type' => 'unit_priced', 'stock' => $p['stock'], 'min_stock' => 50]
            );
            ProductPrice::firstOrCreate(['product_id' => $product->id], [
                'price_per_unit_regular' => $p['per_r'],
                'price_per_unit_vip'     => $p['per_v'],
                'full_bottle_regular'    => null,
                'full_bottle_vip'        => null,
            ]);
        }

        // مبخرة
        $product = Product::firstOrCreate(
            ['name' => 'مبخرة فضية'],
            ['category_id' => $catMbkharaId, 'price_tier_id' => null, 'selling_type' => 'unit_priced', 'stock' => 50, 'min_stock' => 5]
        );
        ProductPrice::firstOrCreate(['product_id' => $product->id], [
            'price_per_unit_regular' => 25.0,
            'price_per_unit_vip'     => 22.0,
            'full_bottle_regular'    => null,
            'full_bottle_vip'        => null,
        ]);
    }
}
