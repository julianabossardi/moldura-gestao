#!/usr/bin/env python3
"""gera os sprites 8-bit em public/bonequinhos/<pessoa>/<estado>.png (sem dependências)."""
import os, struct, zlib

ESCALA = 6
BASE = [
    "................",
    "................",
    "................",
    ".....HHHHHH.....",
    "....HHHHHHHH....",
    "....HSSSSSSH....",
    "....HSESSESH....",
    "....SSSSSSSS....",
    ".....SSMMSS.....",
    "......SSSS......",
    "....TTTTTTTT....",
    "...TTTTTTTTTT...",
    "...STTTTTTTTS...",
    "....TTTTTTTT....",
    "....PPP..PPP....",
    "....PPP..PPP....",
]
def linhas(*ps):
    return [(r, c) for r, cs in ps for c in cs]


# cada pessoa: paleta + pixels extras (linha, coluna) -> letra, aplicados antes do estado
PESSOAS = {
    # lari: cabelo preto cacheado com dois coques no alto, franja, colar brilhante, roupa preta
    "larissa": {
        "paleta": {"H": "#1c1620", "T": "#1a1a1f", "S": "#eebf9f", "G": "#d9d9e3"},
        "extras": {
            **{p: "H" for p in linhas((2, (3, 4, 11, 12)), (3, (3, 4, 11, 12)), (5, (3, 12)), (6, (3, 12)), (7, (3, 12)))},
            **{(5, c): "H" for c in range(5, 11)},
            **{(9, c): "G" for c in (6, 7, 8, 9)},
            (8, 7): "M", (8, 8): "M",
        },
    },
    # vivi: cabelo cacheado volumoso, castanho com reflexos, sorrisão, regata verde-oliva, tatuagem no braço
    "viviane": {
        "paleta": {"H": "#5a3320", "A": "#a8602f", "T": "#8d8a68", "S": "#c98d62", "K": "#3a3a3a"},
        "extras": {
            **{p: "H" for p in linhas((3, (4, 11)), (4, (3, 12)), (5, (2, 3, 12, 13)), (6, (2, 3, 12, 13)), (7, (2, 3, 12, 13)),
                                       (8, (3, 12)), (9, (3, 12)), (10, (3, 12)))},
            **{(r, c): "A" for r, c in ((4, 6), (5, 3), (7, 13), (6, 2), (9, 3), (4, 10))},
            **{(8, c): "M" for c in (6, 7, 8, 9)},
            (12, 3): "K",
        },
    },
    # juliana: cabelo longo escuro e ondulado, piercing na sobrancelha, roupa preta
    "juliana": {
        "paleta": {"H": "#2a1d1a", "T": "#1a1a1f", "S": "#e9b992", "G": "#d9d9e3"},
        "extras": {
            **{p: "H" for p in linhas((4, (3, 12)), (5, (3, 12)), (6, (3, 12)), (7, (3, 12)), (8, (3, 12)), (9, (3, 12)),
                                       (10, (3, 12)), (11, (3, 12)))},
            (5, 9): "G",
        },
    },
    "padrao": {"paleta": {"H": "#908e93", "T": "#c9c7cc"}, "extras": {}},
}
COMUM = {"S": "#f2c9a5", "E": "#1a1a1f", "M": "#b5483a", "P": "#444444"}


def grade():
    return [list(l) for l in BASE]


def pinta(g, pontos, c):
    for r, col in pontos:
        g[r][col] = c


# símbolos de estado: (linha, coluna) -> letra de cor
SIMBOLOS = {
    "leve": {  # nuvem
        "w": [(1, 6), (1, 7), (1, 8), (2, 5), (2, 6), (2, 7), (2, 8), (2, 9)],
        "g": [(0, 6), (0, 7), (0, 8), (1, 5), (1, 9), (3, 5), (3, 6), (3, 7), (3, 8), (3, 9)],
    },
    "criativa": {  # estrela
        "y": [(0, 7), (1, 6), (1, 7), (1, 8), (2, 7), (1, 5), (1, 9)],
    },
    "focada": {  # alvo
        "b": [(0, 6), (0, 7), (0, 8), (1, 5), (1, 9), (2, 5), (2, 9), (3, 6), (3, 7), (3, 8)],
        "r": [(1, 7), (2, 7)],
    },
}
CORES = {"w": "#ffffff", "g": "#c9c7cc", "y": "#ffd23f", "k": "#1a1a1f", "r": "#e32450",
         "b": "#4a6fa5", "o": "#ff8a1f", "f": "#ffd23f", "d": "#e32450", "p": "#ff7aa2", "z": "#908e93"}


def aplica_simbolo(g, estado, deslocar_col=0):
    for cor, pts in SIMBOLOS[estado].items():
        pinta(g, [(r, c + deslocar_col) for r, c in pts], cor)


def estado_sprite(estado, extras=None):
    g = grade()
    for (r, c), letra in (extras or {}).items():
        g[r][c] = letra
    if estado in SIMBOLOS:
        aplica_simbolo(g, estado)
        if estado == "focada":
            pinta(g, [(4, c) for c in range(4, 12)], "k")
        if estado == "leve":
            pinta(g, [(8, 7), (8, 8)], "M")
    elif estado == "pegando-fogo":
        chamas = [(r, c) for r in range(8, 16) for c in (1, 2, 13, 14)] + [(2, 4), (2, 11), (1, 5), (1, 10)]
        for i, (r, c) in enumerate(chamas):
            g[r][c] = "o" if (r + c) % 2 else "f"
        pinta(g, [(10, 1), (12, 14), (14, 2), (9, 13)], "d")
    elif estado == "feliz":
        pinta(g, [(8, c) for c in (6, 9)], "M")
        pinta(g, [(1, 3), (1, 5), (2, 4), (1, 10), (1, 12), (2, 11)], "p")
        pinta(g, [(0, 3), (0, 5), (0, 10), (0, 12)], "p")
    elif estado == "dormindo":
        pinta(g, [(6, 6), (6, 9)], "S")
        pinta(g, [(7, 6), (7, 9)], "E")
        pinta(g, [(2, 11), (2, 12), (3, 12), (4, 11), (4, 12)], "z")
        pinta(g, [(0, 13), (0, 14), (1, 14)], "z")
    return g


def png(grade_px, caminho):
    h, w = len(grade_px), len(grade_px[0])
    linhas = b""
    for y in range(h):
        for _ in range(ESCALA):
            linha = b"\x00"
            for x in range(w):
                px = grade_px[y][x]
                linha += bytes(px) * ESCALA
            linhas += linha
    W, H = w * ESCALA, h * ESCALA

    def chunk(t, d):
        c = struct.pack(">I", len(d)) + t + d
        return c + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)

    dados = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 6, 0, 0, 0))
    dados += chunk(b"IDAT", zlib.compress(linhas)) + chunk(b"IEND", b"")
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    open(caminho, "wb").write(dados)


def rgba(hexa):
    return tuple(int(hexa[i:i + 2], 16) for i in (1, 3, 5)) + (255,)


def renderiza(g, paleta):
    cores = {**COMUM, **paleta, **{k: v for k, v in CORES.items()}}
    return [[rgba(cores[c]) if c != "." else (0, 0, 0, 0) for c in linha] for linha in g]


if __name__ == "__main__":
    raiz = os.path.join(os.path.dirname(__file__), "..", "public", "bonequinhos")
    estados = ["leve", "criativa", "focada", "pegando-fogo", "feliz", "dormindo"]
    for pessoa, cfg in PESSOAS.items():
        paleta = cfg["paleta"]
        for e in estados:
            png(renderiza(estado_sprite(e, cfg["extras"]), cfg["paleta"]), os.path.join(raiz, pessoa, f"{e}.png"))
    # símbolos soltos, para estados combinados lado a lado
    for e in SIMBOLOS:
        g = [list("." * 16) for _ in range(16)]
        aplica_simbolo(g, e)
        png(renderiza([l[4:11] for l in g[:4]], {}), os.path.join(raiz, "_simbolos", f"{e}.png"))
    print("ok")
