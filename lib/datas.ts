export const diasAtras = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export const hojeISO = () => new Date().toISOString().slice(0, 10);

// dias inteiros de hoje até a data (negativo se já passou)
export const diasAte = (data: string) => Math.ceil((new Date(data + "T23:59:59").getTime() - Date.now()) / 86_400_000);
