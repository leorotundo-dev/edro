const fs = require('fs');
const path = require('path');

const pages = [
  'apps/web/app/admin/rag/page.tsx',
  'apps/web/app/admin/harvest/page.tsx',
  'apps/web/app/admin/scrapers/page.tsx',
  'apps/web/app/admin/costs/page.tsx',
  'apps/web/app/admin/recco-engine/page.tsx'
];

const replacements = {
  // Backgrounds
  'bg-zinc-950': 'bg-slate-50',
  'bg-zinc-900/40': 'bg-white',
  'bg-zinc-900/60': 'bg-white',
  'bg-zinc-900': 'bg-slate-50',
  'bg-zinc-800': 'bg-slate-50',
  'bg-zinc-700': 'bg-slate-100',
  
  // Text colors
  'text-zinc-50': 'text-slate-900',
  'text-zinc-100': 'text-slate-800',
  'text-zinc-200': 'text-slate-700',
  'text-zinc-300': 'text-slate-600',
  'text-zinc-400': 'text-slate-600',
  'text-zinc-500': 'text-slate-500',
  
  // Borders
  'border-zinc-800': 'border-slate-200',
  'border-zinc-700': 'border-slate-300',
  'border-zinc-900': 'border-slate-200',
  'border-zinc-600': 'border-slate-300',
  
  // Hovers
  'hover:bg-zinc-800/50': 'hover:bg-blue-50',
  'hover:bg-zinc-800': 'hover:bg-slate-100',
  'hover:bg-zinc-700': 'hover:bg-slate-200',
  'hover:bg-zinc-900': 'hover:bg-blue-50',
  'hover:text-zinc-50': 'hover:text-slate-900',
  
  // Dividers
  'divide-zinc-800': 'divide-slate-200',
  'divide-zinc-700': 'divide-slate-300',
  
  // Rounded
  'rounded-lg': 'rounded-xl',
  
  // Headers - font sizes
  'text-2xl font-semibold text-slate-900': 'text-3xl font-bold text-slate-900',
  'text-sm text-slate-600 mt-1': 'text-slate-600 mt-2',
  
  // Padding
  'px-4 py-3': 'px-6 py-4',
  'px-4 py-2': 'px-6 py-3',
  
  // Focus rings
  'focus:ring-purple-500': 'focus:ring-blue-500',
  'focus:ring-indigo-500': 'focus:ring-blue-500',
};

console.log('🎨 Aplicando tema azul claro em todas as páginas restantes...\n');

let totalUpdated = 0;

pages.forEach((pagePath, index) => {
  const fullPath = path.join(__dirname, pagePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`[${index + 1}/${pages.length}] ⚠️  Arquivo não encontrado: ${pagePath}`);
    return;
  }
  
  console.log(`[${index + 1}/${pages.length}] 🔄 Processando: ${pagePath}`);
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let changeCount = 0;
  
  // Aplicar todas as substituições
  for (const [oldValue, newValue] of Object.entries(replacements)) {
    const regex = new RegExp(oldValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = (content.match(regex) || []).length;
    if (matches > 0) {
      content = content.replace(regex, newValue);
      changeCount += matches;
    }
  }
  
  // Adicionar shadow-sm nos borders
  content = content.replace(
    /border border-slate-200(?! shadow)/g,
    'border border-slate-200 shadow-sm'
  );
  
  // Atualizar classes de inputs
  content = content.replace(
    /className="([^"]*w-full[^"]*)pl-10 pr-4 py-2([^"]*)bg-slate-50([^"]*)"/g,
    'className="$1pl-10 pr-4 py-3$2bg-slate-50$3"'
  );
  
  // Salvar arquivo
  fs.writeFileSync(fullPath, content);
  
  console.log(`   ✅ ${changeCount} mudanças aplicadas`);
  totalUpdated++;
});

console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
console.log(`║              ✅ ATUALIZAÇÃO COMPLETA!                        ║`);
console.log(`╚══════════════════════════════════════════════════════════════╝`);
console.log(`\n🎨 ${totalUpdated} páginas atualizadas com sucesso!`);
console.log(`\n📋 Páginas processadas:`);
pages.forEach(p => console.log(`   • ${p}`));
console.log(`\n🔄 O Next.js vai recompilar automaticamente...`);
console.log(`⏰ Aguarde 10-20 segundos e recarregue o navegador!\n`);
