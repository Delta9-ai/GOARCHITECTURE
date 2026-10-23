// Logo de GO Architecture : trois disques (deux en haut, un en bas à gauche).
// Redessiné en vectoriel d'après le logo fourni, dans son noir d'origine.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 398 398" fill="#1C1C1C" role="img" aria-label="GO Architecture">
      <circle cx="96" cy="96" r="96" />
      <circle cx="302" cy="96" r="96" />
      <circle cx="96" cy="302" r="96" />
    </svg>
  );
}
