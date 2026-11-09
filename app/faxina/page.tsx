import { redirect } from "next/navigation";

// a faxina virou o backlog; o endereço antigo continua levando para lá
export default function Faxina() {
  redirect("/backlog");
}
