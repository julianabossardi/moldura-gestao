#!/usr/bin/env python3
"""gera os sprites 8-bit em public/bonequinhos/<pessoa>/<estado>.png (sem dependências).

estilo chibi: cabeça grande, olhos com brilho, bochechas rosadas, corpo pequeno de vestido.
grade 24x24; as quatro primeiras linhas ficam livres para o símbolo do estado.
"""
import os, struct, zlib

ESCALA = 4
L = A = 24


def vazio():
    return [["."] * L for _ in range(A)]


def px(g, r, c, letra):
    if 0 <= r < A and 0 <= c < L:
        g[r][c] = letra


def ret(g, r0, r1, c0, c1, letra):
    for r in range(r0, r1 + 1):
        for c in range(c0, c1 + 1):
            px(g, r, c, letra)


def pts(g, lista, letra):
    for r, c in lista:
        px(g, r, c, letra)


# ---------------------------------------------------------------- partes comuns
def corpo(g):
    ret(g, 16, 16, 8, 15, "T")
    ret(g, 16, 16, 10, 13, "S")  # pescoço
    ret(g, 17, 19, 7, 16, "T")
    ret(g, 20, 20, 6, 17, "T")  # saia levemente aberta
    ret(g, 17, 18, 6, 6, "S")
    ret(g, 17, 18, 17, 17, "S")  # braços
    ret(g, 21, 22, 9, 10, "S")
    ret(g, 21, 22, 13, 14, "S")  # pernas
    ret(g, 23, 23, 8, 10, "P")
    ret(g, 23, 23, 13, 15, "P")  # sapatinhos


def cabeca(g):
    ret(g, 6, 6, 7, 16, "S")
    ret(g, 7, 7, 6, 17, "S")
    ret(g, 8, 13, 5, 18, "S")
    ret(g, 14, 14, 6, 17, "S")
    ret(g, 15, 15, 8, 15, "S")


def rosto(g, sorriso=False):
    for c0 in (8, 14):
        ret(g, 10, 12, c0, c0 + 1, "E")  # olhões
        px(g, 10, c0, "W")  # brilho
    pts(g, [(10, 7), (10, 16)], "E")  # cílios no canto
    pts(g, [(13, 6), (13, 7), (13, 16), (13, 17)], "B")  # bochechas
    if sorriso:
        pts(g, [(13, 10), (13, 13), (14, 10), (14, 13)], "M")
        pts(g, [(14, 11), (14, 12)], "W")
    else:
        pts(g, [(14, 11), (14, 12)], "M")


def sobrancelhas(g):
    pts(g, [(9, 8), (9, 9), (9, 14), (9, 15)], "H")


# ---------------------------------------------------------------- cada uma
def lari(g):
    # cabelo cacheado escuro com dois coques e franja
    ret(g, 3, 3, 5, 6, "H"); ret(g, 4, 5, 4, 7, "H")
    ret(g, 3, 3, 17, 18, "H"); ret(g, 4, 5, 16, 19, "H")
    ret(g, 5, 12, 4, 19, "H")
    ret(g, 13, 14, 4, 5, "H"); ret(g, 13, 14, 18, 19, "H")
    corpo(g); cabeca(g); rosto(g); sobrancelhas(g)
    ret(g, 7, 7, 6, 17, "H"); ret(g, 8, 8, 6, 9, "H"); ret(g, 8, 8, 14, 17, "H")
    pts(g, [(9, 7), (9, 16)], "E")  # delineado gatinho
    pts(g, [(6, 8), (6, 13), (7, 10), (8, 15), (9, 4), (11, 19), (4, 6), (4, 17)], "J")
    pts(g, [(4, 5), (4, 18)], "D")  # laços nos coques
    pts(g, [(16, 10), (16, 12)], "G"); pts(g, [(16, 11), (16, 13)], "W")  # colar brilhante


def vivi(g):
    # cabelo cacheado volumoso até o ombro, com reflexos
    ret(g, 4, 12, 4, 19, "H")
    ret(g, 5, 7, 3, 3, "H"); ret(g, 5, 7, 20, 20, "H")
    ret(g, 8, 17, 3, 5, "H"); ret(g, 8, 17, 18, 20, "H")
    ret(g, 4, 6, 5, 18, "H")
    corpo(g); cabeca(g); rosto(g, sorriso=True); sobrancelhas(g)
    ret(g, 7, 7, 6, 17, "H"); ret(g, 8, 8, 5, 8, "H"); ret(g, 8, 8, 15, 18, "H")
    pts(g, [(5, 7), (5, 14), (7, 9), (9, 4), (12, 19), (15, 4), (14, 19), (6, 11), (11, 3)], "A")
    pts(g, [(5, 16), (6, 15), (6, 17), (7, 16)], "Y"); px(g, 6, 16, "W")  # florzinha no cabelo
    px(g, 18, 6, "K")  # tatuagem no braço


def juliana(g):
    # cabelo longo escuro e ondulado, franja de lado
    ret(g, 4, 13, 4, 19, "H")
    ret(g, 8, 20, 3, 5, "H"); ret(g, 8, 20, 18, 20, "H")
    pts(g, [(14, 2), (15, 2), (18, 2), (19, 2), (14, 21), (15, 21), (18, 21), (19, 21)], "H")
    ret(g, 4, 6, 6, 17, "H")
    corpo(g); cabeca(g); rosto(g); sobrancelhas(g)
    ret(g, 7, 7, 6, 17, "H"); ret(g, 8, 8, 6, 8, "H"); ret(g, 8, 8, 16, 17, "H"); px(g, 8, 11, "H")
    pts(g, [(5, 8), (6, 14), (10, 4), (14, 19), (17, 4), (19, 19), (7, 12)], "J")
    px(g, 9, 15, "G")  # piercing na sobrancelha
    pts(g, [(13, 4), (13, 19)], "G")  # brincos


def padrao(g):
    ret(g, 4, 12, 4, 19, "H")
    corpo(g); cabeca(g); rosto(g); sobrancelhas(g)
    ret(g, 7, 7, 6, 17, "H")


PESSOAS = {
    "larissa": (lari, {"H": "#1c1620", "J": "#3d3347", "T": "#1a1a1f", "S": "#f0c4a4", "G": "#d9d9e3"}),
    "viviane": (vivi, {"H": "#5a3320", "A": "#b0663a", "T": "#8d8a68", "S": "#c98d62", "K": "#3a3a3a"}),
    "juliana": (juliana, {"H": "#2a1d1a", "J": "#4a3731", "T": "#1a1a1f", "S": "#eebd96", "G": "#d9d9e3"}),
    "padrao": (padrao, {"H": "#908e93", "T": "#c9c7cc"}),
}

COMUM = {
    "S": "#f2c9a5", "E": "#1a1a1f", "M": "#c4505c", "P": "#444444", "W": "#ffffff", "B": "#f4a3ab",
    "G": "#d9d9e3", "D": "#e32450", "Y": "#ffd23f", "K": "#3a3a3a",
    "b": "#4a6fa5", "r": "#e32450", "g": "#c9c7cc", "w": "#ffffff", "y": "#ffd23f",
    "o": "#ff8a1f", "d": "#e32450", "f": "#ffd23f", "p": "#ff7aa2", "z": "#908e93",
}

# símbolos de estado: 8 colunas x 4 linhas, colocados em (linha 0, coluna 8)
SIMBOLOS = {
    "leve": ["..gggg..", ".gwwwwg.", "gwwwwwwg", ".gggggg."],
    "criativa": ["...yy...", ".yyyyyy.", "..yyyy..", ".yy..yy."],
    "focada": ["..bbbb..", ".b.rr.b.", ".b.rr.b.", "..bbbb.."],
}


def simbolo(g, estado, col=8):
    for r, linha in enumerate(SIMBOLOS[estado]):
        for c, letra in enumerate(linha):
            if letra != ".":
                px(g, r, col + c, letra)


def sprite(pessoa, estado):
    g = vazio()
    desenha, _ = PESSOAS[pessoa]
    desenha(g)
    if estado in SIMBOLOS:
        simbolo(g, estado)
        if estado == "focada":
            ret(g, 6, 6, 5, 18, "b")  # faixa na testa
        if estado == "criativa":
            pts(g, [(11, 9), (11, 15)], "W")
    elif estado == "pegando-fogo":
        for r in range(13, 24):
            for c in (0, 1, 2, 21, 22, 23):
                g[r][c] = "o" if (r + c) % 2 else "f"
        pts(g, [(15, 1), (18, 22), (21, 2), (14, 21), (20, 0), (22, 23)], "d")
        pts(g, [(2, 7), (3, 7), (2, 16), (3, 16), (1, 11), (2, 12)], "o")
        pts(g, [(1, 7), (1, 16)], "d")
    elif estado == "feliz":
        ret(g, 9, 12, 7, 10, "S"); ret(g, 9, 12, 13, 16, "S")  # limpa os olhos
        pts(g, [(11, 8), (10, 9), (11, 10), (11, 14), (10, 15), (11, 16)], "E")  # arquinhos
        for (r, c) in ((1, 2), (1, 4), (2, 3), (1, 19), (1, 21), (2, 20)):
            px(g, r, c, "p")
        for (r, c) in ((0, 2), (0, 4), (0, 19), (0, 21)):
            px(g, r, c, "p")
        pts(g, [(13, 5), (13, 6), (13, 17), (13, 18)], "B")
    elif estado == "dormindo":
        ret(g, 10, 12, 8, 9, "S"); ret(g, 10, 12, 14, 15, "S")
        pts(g, [(11, 8), (11, 9), (11, 14), (11, 15)], "E")  # olhos fechados
        pts(g, [(12, 7), (12, 16)], "E")
        pts(g, [(1, 18), (1, 19), (2, 19), (3, 18), (3, 19)], "z")
        pts(g, [(0, 21), (0, 22), (1, 22)], "z")
    return g


# ---------------------------------------------------------------- png
def png(grade_px, caminho):
    h, w = len(grade_px), len(grade_px[0])
    linhas = b""
    for y in range(h):
        linha = b"\x00" + b"".join(bytes(grade_px[y][x]) * ESCALA for x in range(w))
        linhas += linha * ESCALA
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
    cores = {**COMUM, **paleta}
    return [[rgba(cores[c]) if c != "." else (0, 0, 0, 0) for c in linha] for linha in g]


if __name__ == "__main__":
    raiz = os.path.join(os.path.dirname(__file__), "..", "public", "bonequinhos")
    estados = ["neutro", "leve", "criativa", "focada", "pegando-fogo", "feliz", "dormindo"]
    for pessoa, (_, paleta) in PESSOAS.items():
        for e in estados:
            png(renderiza(sprite(pessoa, e), paleta), os.path.join(raiz, pessoa, f"{e}.png"))
    # símbolos soltos (estados combinados lado a lado e chips do seletor)
    for e in SIMBOLOS:
        g = vazio()
        simbolo(g, e)
        png(renderiza([l[8:16] for l in g[:4]], {}), os.path.join(raiz, "_simbolos", f"{e}.png"))
    print("ok")
