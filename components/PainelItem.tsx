"use client";
import { useRouter } from "next/navigation";
import { Gaveta } from "./Gaveta";
import { FormItem, type ItemEditavel } from "./FormItem";

export type { ItemEditavel };

type Props = {
  item: ItemEditavel;
  autorId: string;
  projetos: { id: string; nome: string }[];
  pessoas: { id: string; nome: string }[];
  onFechar: () => void;
};

// criar ou editar um item à mão, na gaveta lateral
export function PainelItem({ item, autorId, projetos, pessoas, onFechar }: Props) {
  const router = useRouter();
  return (
    <Gaveta titulo={item.id ? "editar" : "novo item"} onFechar={onFechar}>
      <FormItem
        item={item}
        autorId={autorId}
        projetos={projetos}
        pessoas={pessoas}
        onSalvo={() => { router.refresh(); onFechar(); }}
      />
    </Gaveta>
  );
}
