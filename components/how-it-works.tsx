// "Cómo funciona": los 4 pasos para usar Changuito. Se usa en la bienvenida, en el inicio y en Ajustes.
import { Icon } from './ui';

export const STEPS = [
  { icon: 'search', title: 'Buscá lo que comprás', text: 'Escribí un producto o entrá por categoría. Tocá + para sumarlo a tu lista.' },
  { icon: 'format_list_bulleted', title: 'Armá tu lista', text: 'Elegí cantidades: unidades o kilos. Podés tener varias listas y compartirlas por WhatsApp.' },
  { icon: 'compare_arrows', title: 'Compará los supers', text: 'En tu lista tocá "Comparar supers": te decimos dónde te sale más barata y cuánto ahorrás.' },
  { icon: 'shopping_cart_checkout', title: 'Comprá con el modo compra', text: 'En el super, la lista se ordena por sector y vas tachando. Funciona sin internet.' },
];

export function HowItWorks({ compact }: { compact?: boolean }) {
  return (
    <ol className={compact ? 'space-y-3' : 'space-y-4'}>
      {STEPS.map((s, i) => (
        <li key={s.title} className="flex gap-3">
          <span className="relative flex h-11 w-11 flex-none items-center justify-center rounded-full bg-primary-tint text-primary">
            <Icon name={s.icon} />
            <span className="num absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-on-primary">{i + 1}</span>
          </span>
          <span>
            <span className="block font-semibold leading-6">{s.title}</span>
            <span className="block text-[15px] leading-5 text-ink2">{s.text}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
