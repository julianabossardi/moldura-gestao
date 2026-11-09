import { Avatar } from "./Avatar";

// o bilhete como a pessoa vê: um papelzinho com quem deixou e o recado. o mesmo visual vale para o pop-up e para a prévia
export function CartaoBilhete({ de, texto, quando }: { de: string; texto: string; quando?: string }) {
  return (
    <article className="bilhete" aria-label={`bilhete de ${de}`}>
      <div className="bilhete-topo">
        <Avatar nome={de} tam={48} />
        <div>
          <span className="m-meta">bilhete de</span>
          <strong className="bilhete-de">{de.toLowerCase()}</strong>
        </div>
        {quando && <span className="m-mono bilhete-quando">{quando}</span>}
      </div>
      <p className="bilhete-texto">{texto || "o que você escrever aparece aqui."}</p>
    </article>
  );
}
