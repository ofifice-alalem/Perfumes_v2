const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');
const { fixArabic } = require('./src/invoice/arabic-helper');

const canvas = createCanvas(180, 180);
const ctx = canvas.getContext('2d');

// Draw clean luxury store logo badge
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, 180, 180);

// Outer circle border
ctx.strokeStyle = '#000000';
ctx.lineWidth = 4;
ctx.beginPath();
ctx.arc(90, 90, 82, 0, Math.PI * 2);
ctx.stroke();

// Inner circle border
ctx.lineWidth = 1.5;
ctx.beginPath();
ctx.arc(90, 90, 75, 0, Math.PI * 2);
ctx.stroke();

// Crown / Ornament top icon
ctx.fillStyle = '#000000';
ctx.beginPath();
ctx.moveTo(90, 30);
ctx.lineTo(105, 50);
ctx.lineTo(125, 40);
ctx.lineTo(115, 65);
ctx.lineTo(65, 65);
ctx.lineTo(55, 40);
ctx.lineTo(75, 50);
ctx.closePath();
ctx.fill();

// Store initials / icon in center
ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText(fixArabic('طيب'), 90, 95);

// Subtitle under logo
ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
ctx.fillText(fixArabic('التاجوري'), 90, 132);

// Stars under logo
ctx.font = '12px Arial';
ctx.fillText('★  ★  ★', 90, 154);

if (!fs.existsSync('./assets')) {
    fs.mkdirSync('./assets', { recursive: true });
}

fs.writeFileSync('./assets/logo.png', canvas.toBuffer('image/png'));
console.log("Created assets/logo.png logo badge successfully!");
