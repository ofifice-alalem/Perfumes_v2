<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Category;
use App\Models\Size;
use App\Models\PriceTier;
use App\Models\TierPrice;
use App\Models\Customer;
use App\Models\PaymentMethod;

class InitialDataSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Categories
        $categories = [
            ['name' => 'عطور زيتية',        'unit' => 'ml',  'is_operational' => false],
            ['name' => 'عطور أصلية',        'unit' => 'ml',  'is_operational' => false],
            ['name' => 'بخور',               'unit' => 'pcs', 'is_operational' => false],
            ['name' => 'وشق',                'unit' => 'g',   'is_operational' => false],
            ['name' => 'مبخرة',              'unit' => 'pcs', 'is_operational' => false],
            ['name' => 'مستلزمات تشغيلية',  'unit' => 'pcs', 'is_operational' => true],
        ];
        foreach ($categories as $cat) {
            Category::firstOrCreate(['name' => $cat['name']], $cat);
        }

        // 2. Sizes (ml فقط — للعطور الزيتية والأصلية)
        $sizes = [
            ['label' => '1ml',   'value' => 1,   'unit' => 'ml'],
            ['label' => '3ml',   'value' => 3,   'unit' => 'ml'],
            ['label' => '5ml',   'value' => 5,   'unit' => 'ml'],
            ['label' => '10ml',  'value' => 10,  'unit' => 'ml'],
        ];
        foreach ($sizes as $size) {
            Size::firstOrCreate(['label' => $size['label']], $size);
        }

        // 3. Price Tiers
        $tiers = [
            ['name' => 'A', 'description' => 'اقتصادي'],
            ['name' => 'B', 'description' => 'متوسط'],
            ['name' => 'C', 'description' => 'فاخر'],
        ];
        foreach ($tiers as $tier) {
            PriceTier::firstOrCreate(['name' => $tier['name']], $tier);
        }

        // 4. Tier Prices
        $tierA = PriceTier::where('name', 'A')->first();
        $tierB = PriceTier::where('name', 'B')->first();
        $tierC = PriceTier::where('name', 'C')->first();

        $mlSizes = Size::where('unit', 'ml')->get()->keyBy('label');

        $tierPrices = [
            [$tierA->id, $mlSizes['1ml']->id,  5,  4],
            [$tierA->id, $mlSizes['3ml']->id,  12, 10],
            [$tierA->id, $mlSizes['5ml']->id,  18, 15],
            [$tierA->id, $mlSizes['10ml']->id, 32, 28],
            [$tierB->id, $mlSizes['1ml']->id,  7,  6],
            [$tierB->id, $mlSizes['3ml']->id,  18, 15],
            [$tierB->id, $mlSizes['5ml']->id,  28, 24],
            [$tierB->id, $mlSizes['10ml']->id, 50, 44],
            [$tierC->id, $mlSizes['1ml']->id,  10, 8],
            [$tierC->id, $mlSizes['3ml']->id,  25, 22],
            [$tierC->id, $mlSizes['5ml']->id,  40, 35],
            [$tierC->id, $mlSizes['10ml']->id, 75, 65],
        ];

        foreach ($tierPrices as [$tierId, $sizeId, $regular, $vip]) {
            TierPrice::firstOrCreate(
                ['tier_id' => $tierId, 'size_id' => $sizeId],
                ['price_regular' => $regular, 'price_vip' => $vip]
            );
        }

        // 5. زبون نقدي (أول سجل إلزامي)
        Customer::firstOrCreate(
            ['id' => 1],
            ['name' => 'زبون نقدي', 'is_active' => true]
        );

        // 6. Payment Methods
        $methods = ['نقدي', 'بطاقة', 'تحويل بنكي'];
        foreach ($methods as $method) {
            PaymentMethod::firstOrCreate(['name' => $method], ['is_active' => true]);
        }
    }
}
