import { chaveSprite, estadoDoBonequinho, type ResumoPessoa } from "@/lib/estados-bonequinho";

export function Bonequinho({ pessoa, tamanho = 96 }: { pessoa: ResumoPessoa; tamanho?: number }) {
  const estado = estadoDoBonequinho(pessoa);
  return (
    <div className="boneco" style={{ width: tamanho }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/bonequinhos/${chaveSprite(pessoa.nome)}/${estado.sprite}.png`} alt={`${pessoa.nome}, ${estado.rotulo}`} width={tamanho} height={tamanho} />
      {estado.simbolos.length > 1 && (
        <div className="simbolos">
          {estado.simbolos.map((s) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={s} src={`/bonequinhos/_simbolos/${s}.png`} alt={s} height={14} />
          ))}
        </div>
      )}
    </div>
  );
}

export const rotuloEstado = (p: ResumoPessoa) => estadoDoBonequinho(p).rotulo;
