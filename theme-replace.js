const fs = require('fs');
let code = fs.readFileSync('src/components/CommunityDayClient.js', 'utf8');

// Hero and background Section Fixes
code = code.replace(/bg-\[\#020408\]/g, 'bg-background');
code = code.replace(/bg-brand-dark/g, 'bg-background');
code = code.replace(/bg-\[\#06090e\]/g, 'bg-background');
code = code.replace(/text-brand-dark/g, 'text-background');

// Remove Meteor Shower
const meteorRegex = /\{\/\* Spectacular Meteor Shower \*\/\}[\s\S]*?\}\)\)\}/g;
code = code.replace(meteorRegex, '');

// Don't highlight 'Day'
// It is specifically:
// <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[1.1] mb-6 tracking-tight drop-shadow-2xl">
//     AWS Community <span className="text-brand-cyan drop-shadow-[0_0_20px_rgba(0,194,255,0.7)]">Day</span>
//     <br />{event.year} Nadiad
// </h1>
const headingRegex = /AWS Community <span className="text-brand-cyan drop-shadow-\[0_0_20px_rgba\(0,194,255,0\.7\)\]">Day<\/span>/g;
code = code.replace(headingRegex, 'AWS Community Day');

// Generic white -> foreground mappings for Light/Dark mode compatibility
code = code.replace(/text-white/g, 'text-foreground');
code = code.replace(/border-white\/([0-9]+)/g, 'border-foreground/$1');
code = code.replace(/border-white/g, 'border-foreground');
code = code.replace(/bg-white\/([0-9]+)/g, 'bg-foreground/$1');
code = code.replace(/rgba\(255,255,255,/g, 'rgba(var(--foreground),');
code = code.replace(/shadow-\[0_0_10px_rgba\(255,255,255,0\.8\)\]/g, 'shadow-[0_0_10px_rgba(var(--foreground),0.8)]');

fs.writeFileSync('src/components/CommunityDayClient.js', code);
console.log('Done replacement!');
