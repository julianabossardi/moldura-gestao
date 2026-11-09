#!/usr/bin/env python3
"""gera os sprites 32 bits em public/bonequinhos/<pessoa>/<estado>.png (sem dependências).

grade 32x32, um pixel de arte = um pixel do arquivo; na tela o css amplia em múltiplos inteiros
(image-rendering: pixelated), então 64, 96, 128 e 160 saem nítidos.
estilo chibi: cabeça grande, contorno escuro, olhos com brilho, bochechas, sombra na franja e no queixo.
as cinco primeiras linhas ficam livres para o que acontece no estado (borboleta, respingos, zzz).

também gera <pessoa>/busto.png (24x24: cabeça e ombros) para os avatares pequenos.
"""
import math, os, struct, zlib

ESCALA = 1
L = A = 32
TOPO = 6  # cabelo nunca sobe acima desta linha (acima fica o símbolo)


def vazio():
    return [["."] * L for _ in range(A)]


def px(g, r, c, letra, so_vazio=False):
    if 0 <= r < A and 0 <= c < L and (not so_vazio or g[r][c] == "."):
        g[r][c] = letra


def ret(g, r0, r1, c0, c1, letra):
    for r in range(r0, r1 + 1):
        for c in range(c0, c1 + 1):
            px(g, r, c, letra)


def pts(g, lista, letra):
    for r, c in lista:
        px(g, r, c, letra)


def elipse(g, cx, cy, rx, ry, letra, topo=0):
    for r in range(max(topo, 0), A):
        for c in range(L):
            if ((c + 0.5 - cx) / rx) ** 2 + ((r + 0.5 - cy) / ry) ** 2 <= 1:
                g[r][c] = letra


def cabelo_el(g, cx, cy, rx, ry):
    elipse(g, cx, cy, rx, ry, "H", topo=TOPO)


# ---------------------------------------------------------------- partes comuns
def rosto_base(g):
    elipse(g, 16, 17, 9, 7.2, "S")
    # sombra no lado direito e embaixo do queixo
    for r in range(A):
        cs = [c for c in range(L) if g[r][c] == "S"]
        if cs:
            g[r][cs[-1]] = "s"
            if len(cs) > 6 and r > 14:
                g[r][cs[-2]] = "s"
    for c in range(L):
        rs = [r for r in range(A) if g[r][c] == "S"]
        if rs and 11 <= c <= 21:
            g[rs[-1]][c] = "s"


def corpo(g):
    # braços atrás do vestido
    ret(g, 25, 26, 9, 10, "T"); ret(g, 27, 27, 8, 9, "S")
    ret(g, 25, 26, 21, 22, "T"); ret(g, 27, 27, 22, 23, "S")
    pts(g, [(28, 8), (28, 23)], "s")
    # pescoço
    ret(g, 24, 24, 14, 17, "s")
    # vestido: trapézio com sombra à direita e barra clara
    for r, (c0, c1) in zip(range(25, 29), [(12, 19), (11, 20), (10, 21), (9, 22)]):
        ret(g, r, r, c0, c1, "T")
        px(g, r, c1, "t"); px(g, r, c1 - 1, "t")
    ret(g, 28, 28, 9, 22, "R")  # barra
    px(g, 28, 22, "t")
    pts(g, [(25, 14), (25, 17)], "W")  # gola
    # pernas e sapatinhos
    ret(g, 29, 29, 13, 14, "S"); ret(g, 29, 29, 17, 18, "S")
    ret(g, 30, 30, 12, 14, "P"); ret(g, 30, 30, 17, 19, "P")
    pts(g, [(30, 12), (30, 17)], "p")


def olhos(g, tipo="aberto"):
    for c0 in (11, 18):
        if tipo == "aberto":
            ret(g, 16, 16, c0, c0 + 2, "E")
            ret(g, 17, 18, c0, c0 + 2, "I")
            ret(g, 19, 19, c0, c0 + 2, "i")
            px(g, 17, c0, "W"); px(g, 18, c0 + 1, "W")  # brilhos
        elif tipo == "feliz":
            pts(g, [(17, c0), (16, c0 + 1), (17, c0 + 2)], "E")
        elif tipo == "dormindo":
            ret(g, 18, 18, c0, c0 + 2, "E")
            pts(g, [(17, c0), (17, c0 + 2)], "E")
    if tipo == "aberto":
        pts(g, [(16, 10), (16, 21)], "E")  # cílio no canto
    # sobrancelhas
    ret(g, 14, 14, 11, 13, "H"); ret(g, 14, 14, 18, 20, "H")
    # bochechas
    ret(g, 20, 20, 9, 10, "B"); ret(g, 20, 20, 21, 22, "B")
    if tipo == "feliz":
        ret(g, 21, 21, 9, 10, "B"); ret(g, 21, 21, 21, 22, "B")


def boca(g, sorriso=False):
    if sorriso:
        pts(g, [(21, 14), (22, 15), (22, 16), (21, 17)], "M")
    else:
        pts(g, [(22, 15), (22, 16)], "M")


def franja(g, linhas):
    """linhas: lista de (linha, c0, c1) pintadas de cabelo sobre o rosto."""
    for r, c0, c1 in linhas:
        ret(g, r, r, c0, c1, "H")


def brilhos(g, passo=5, fase=1):
    """acende uma faixa clara no alto de cada mecha e escurece a base."""
    for c in range(L):
        rs = [r for r in range(A) if g[r][c] == "H"]
        if not rs:
            continue
        if (c + fase) % passo in (0, 1) and rs[0] + 1 < A and g[rs[0] + 1][c] == "H":
            g[rs[0] + 1][c] = "J"
            if (c + fase) % passo == 0 and rs[0] + 2 < A and g[rs[0] + 2][c] == "H":
                g[rs[0] + 2][c] = "J"
    for c in range(L):
        rs = [r for r in range(A) if g[r][c] == "H"]
        if rs and (c % 3 == 0) and g[rs[-1]][c] == "H" and len(rs) > 3:
            g[rs[-1]][c] = "h"


# ---------------------------------------------------------------- cada uma
def lari(g):
    # cabelo cacheado escuro com dois coques, laços e franja de cortina
    cabelo_el(g, 16, 15.2, 10.2, 9.3)
    elipse(g, 7.5, 8.2, 3.7, 3.7, "H", topo=3); elipse(g, 24.5, 8.2, 3.7, 3.7, "H", topo=3)
    ret(g, 15, 22, 6, 8, "H"); ret(g, 15, 22, 23, 25, "H")
    pts(g, [(23, 7), (23, 24), (22, 6), (22, 25)], "H")
    rosto_base(g)
    franja(g, [(10, 7, 24), (11, 7, 24), (12, 7, 24), (13, 7, 10), (13, 21, 24), (13, 13, 14), (13, 17, 18), (14, 7, 8), (14, 23, 24)])
    brilhos(g, 4, 1)
    corpo(g)
    olhos(g); boca(g)
    pts(g, [(15, 10), (15, 21)], "E")  # delineado gatinho
    pts(g, [(10, 6), (11, 5), (11, 7), (12, 6)], "D"); px(g, 11, 6, "W")  # laços nos coques
    pts(g, [(10, 25), (11, 24), (11, 26), (12, 25)], "D"); px(g, 11, 25, "W")
    pts(g, [(24, 15), (24, 16)], "G"); px(g, 25, 15, "G"); px(g, 25, 16, "W")  # colar brilhante


def vivi(g):
    # cabelo cacheado volumoso, bem cheio, com reflexos mel e florzinha
    for cx, cy, r in [(9, 11, 4.6), (23, 11, 4.6), (12.5, 9.3, 5), (19.5, 9.3, 5), (16, 8.5, 5.2),
                      (6.5, 17, 4.2), (25.5, 17, 4.2), (7.5, 22, 3.6), (24.5, 22, 3.6), (5.5, 12.5, 3.4), (26.5, 12.5, 3.4)]:
        cabelo_el(g, cx, cy, r, r)
    cabelo_el(g, 16, 15, 10, 9)
    rosto_base(g)
    franja(g, [(10, 7, 24), (11, 7, 24), (12, 8, 23), (13, 7, 9), (13, 22, 24), (13, 14, 17), (14, 7, 8), (14, 23, 24)])
    brilhos(g, 5, 2)
    corpo(g)
    olhos(g); boca(g, sorriso=True)
    for (r, c) in [(8, 10), (9, 20), (12, 6), (13, 26), (18, 5), (19, 27), (22, 7), (7, 14), (10, 23)]:
        px(g, r, c, "A")
    # florzinha no cabelo
    pts(g, [(7, 22), (8, 21), (8, 23), (9, 22)], "Y"); px(g, 8, 22, "W")
    pts(g, [(7, 21), (7, 23), (9, 21), (9, 23)], "D")
    px(g, 26, 9, "K")  # tatuagem no braço


def juliana(g):
    # cabelo longo escuro e ondulado, franja de lado, piercing e brincos
    cabelo_el(g, 16, 15.2, 10.2, 9.4)
    for r in range(15, 29):
        onda = 1 if (r // 3) % 2 else 0
        ret(g, r, r, 5 + onda, 8, "H"); ret(g, r, r, 23, 26 - onda, "H")
    rosto_base(g)
    franja(g, [(10, 7, 24), (11, 7, 24), (12, 7, 23), (13, 7, 15), (14, 7, 11), (15, 7, 8), (13, 22, 24), (14, 23, 24)])
    brilhos(g, 5, 0)
    corpo(g)
    olhos(g); boca(g)
    pts(g, [(15, 10), (15, 21)], "E")
    px(g, 14, 20, "G")  # piercing na sobrancelha
    pts(g, [(21, 6), (22, 6), (21, 25), (22, 25)], "G")  # brincos
    px(g, 22, 6, "W"); px(g, 22, 25, "W")


def padrao(g):
    cabelo_el(g, 16, 15.2, 9.8, 8.9)
    ret(g, 15, 21, 6, 8, "H"); ret(g, 15, 21, 23, 25, "H")
    rosto_base(g)
    franja(g, [(10, 7, 24), (11, 7, 24), (12, 7, 24), (13, 7, 9), (13, 22, 24)])
    brilhos(g, 5, 1)
    corpo(g)
    olhos(g); boca(g)


PESSOAS = {
    "larissa": (lari, {"H": "#2b2230", "J": "#4d4060", "h": "#1a1420", "T": "#2a2a33", "t": "#1c1c22", "R": "#e32450", "S": "#f1c6a6", "s": "#d9a583", "G": "#d9d9e3", "I": "#3a2530", "i": "#7a4a5e"}),
    "viviane": (vivi, {"H": "#6b3a22", "J": "#9b5d36", "h": "#472414", "A": "#c98350", "T": "#9a9870", "t": "#76754f", "R": "#e8c34a", "S": "#c98d62", "s": "#a96e47", "K": "#3a3a3a", "I": "#3d2616", "i": "#7a5230"}),
    "juliana": (juliana, {"H": "#33241f", "J": "#5c4339", "h": "#201511", "T": "#2a2a33", "t": "#1c1c22", "R": "#e32450", "S": "#efbf99", "s": "#d39d76", "G": "#d9d9e3", "I": "#3a2a24", "i": "#76503f"}),
    "padrao": (padrao, {"H": "#908e93", "J": "#b3b1b6", "h": "#6f6d72", "T": "#c9c7cc", "t": "#a5a3a8", "R": "#908e93", "S": "#f2c9a5", "s": "#d6a982", "I": "#4a4a50", "i": "#7a7a80"}),
}

COMUM = {
    "O": "#241920", "S": "#f2c9a5", "s": "#d6a982", "E": "#241920", "M": "#c4505c", "P": "#4a4a52", "p": "#7a7a84",
    "W": "#ffffff", "B": "#f4a3ab", "G": "#d9d9e3", "D": "#e32450", "Y": "#ffd23f", "K": "#3a3a3a",
    "b": "#4a6fa5", "r": "#e32450", "g": "#b8c4d8", "w": "#ffffff", "y": "#ffd23f", "u": "#c9971c",
    "o": "#ff8a1f", "d": "#e32450", "e": "#a8142f", "f": "#ffd23f", "q": "#ff7aa2", "z": "#7f8fb0", "B2": "#2f4f85",
    "n": "#2f4f85", "k": "#241920", "x": "#c98d4a", "v": "#8a5a2b",
}

# ícones de estado, 16x16: uma ação + um objeto. usados nos chips e ao lado dos bonecos
ICONES_ESTADO = {
    "leve": [  # olhando para cima: borboleta passando
        "................",
        "...k........k...",
        "....k......k....",
        ".kkk.k....k.kkk.",
        "kqqqkkk..kkkqqqk",
        "kqwqqqkkkkqqqwqk",
        "kqqqqqqkkqqqqqqk",
        ".kqqqqqkkqqqqqk.",
        "..kkkqqkkqqkkk..",
        "....kqqkkqqk....",
        "...kqqqkkqqqk...",
        "...kqqk..kqqk...",
        "....kk....kk....",
        "................",
        "................",
        "................",
    ],
    "normal": [  # tomando um café, sem nada de especial
        "................",
        ".....k....k.....",
        "......k....k....",
        ".....k....k.....",
        "................",
        "..kkkkkkkkkk....",
        "..kwwwwwwwwkkk..",
        "..kwvvvvvvwk.k..",
        "..kwvvvvvvwk.k..",
        "..kwvvvvvvwkk...",
        "..kwwwwwwwwk....",
        "...kwwwwwwk.....",
        "....kkkkkk......",
        "................",
        "................",
        "................",
    ],
    "criativa": [  # pintando numa tela com o pincel
        "................",
        "................",
        ".kkkkkkkkkk.....",
        ".kwwwwwwwwk...kk",
        ".kwddwwyywk..kdk",
        ".kwdddwyyyk.kdk.",
        ".kwwdwwwwwkuk...",
        ".kwwwwbbwwuk....",
        ".kwyywbbbuwk....",
        ".kwyywwwuwwk....",
        ".kwwwwwukwwk....",
        ".kkkkkkkkkkk....",
        "..k........k....",
        ".k..........k...",
        "................",
        "................",
    ],
    "focada": [  # escrevendo numa mesa
        "................",
        "................",
        "............kk..",
        "...........kdk..",
        "....kkkkkkkdk...",
        "....kwwwwwdkk...",
        "....kgggwdwk....",
        "....kwwwdkwk....",
        "....kgggkkgk....",
        "....kkkkkkkk....",
        "xxxxxxxxxxxxxxxx",
        "vvvvvvvvvvvvvvvv",
        ".vv..........vv.",
        ".vv..........vv.",
        ".vv..........vv.",
        "................",
    ],
}

FOGO = [  # 5x11, desenhado dos dois lados
    "...e.",
    "..ede",
    "..edd",
    ".edod",
    ".edoo",
    "edoyo",
    "edoyo",
    "edyyo",
    "edyyo",
    ".edoe",
    "..ee.",
]


def cena_criativa(g):
    """cavalete com tela à direita; o pincel sai da mão dela até a tela."""
    ret(g, 21, 27, 25, 31, "w")  # tela
    ret(g, 22, 22, 26, 28, "d"); ret(g, 23, 23, 27, 29, "d"); ret(g, 24, 24, 26, 27, "y")
    ret(g, 25, 26, 29, 30, "b"); px(g, 22, 30, "y")
    pts(g, [(28, 26), (29, 25), (28, 30), (29, 31)], "u")  # pés do cavalete
    pts(g, [(26, 24), (25, 25)], "u"); pts(g, [(27, 23)], "S")  # cabo do pincel e mão
    px(g, 24, 26, "d")


def cena_focada(g):
    """mesa na frente, caderno aberto e caneta na mão."""
    ret(g, 27, 27, 4, 27, "x")  # tampo
    ret(g, 28, 29, 5, 26, "v")
    ret(g, 30, 30, 6, 8, "v"); ret(g, 30, 30, 23, 25, "v")
    ret(g, 25, 26, 10, 17, "w"); ret(g, 26, 26, 11, 14, "g")  # caderno
    pts(g, [(26, 18), (25, 19), (24, 20)], "d"); ret(g, 25, 25, 20, 21, "S")  # caneta e mão


def olhar_para_cima(g):
    for c0 in (11, 18):
        ret(g, 16, 19, c0, c0 + 2, "I")
        ret(g, 19, 19, c0, c0 + 2, "W")  # o branco do olho aparece embaixo
        px(g, 17, c0, "W")
    ret(g, 16, 16, 11, 13, "E"); ret(g, 16, 16, 18, 20, "E")
    pts(g, [(21, 15), (21, 16), (22, 15), (22, 16)], "M")  # boquinha aberta


BORBOLETA = [
    "..k..k..",
    ".kqkkqk.",
    "kqqkkqqk",
    "kqqkkqqk",
    ".kk..kk.",
]


def contorno(g):
    pontos = []
    for r in range(A):
        for c in range(L):
            if g[r][c] != ".":
                continue
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                rr, cc = r + dr, c + dc
                if 0 <= rr < A and 0 <= cc < L and g[rr][cc] not in (".", "O"):
                    pontos.append((r, c))
                    break
    for r, c in pontos:
        g[r][c] = "O"


def sprite(pessoa, estado):
    g = vazio()
    desenha, _ = PESSOAS[pessoa]
    desenha(g)

    if estado == "feliz":
        ret(g, 16, 19, 10, 13, "S"); ret(g, 16, 19, 18, 21, "S")  # limpa os olhos
        px(g, 16, 10, "S"); px(g, 16, 21, "S")
        olhos(g, "feliz"); boca(g, sorriso=True)
    elif estado == "dormindo":
        ret(g, 16, 19, 10, 13, "S"); ret(g, 16, 19, 18, 21, "S")
        px(g, 16, 10, "S"); px(g, 16, 21, "S")
        olhos(g, "dormindo")
    elif estado == "focada":
        ret(g, 9, 9, 7, 24, "n")  # faixa na testa
        ret(g, 10, 10, 7, 24, "b")
        cena_focada(g)
    elif estado == "criativa":
        cena_criativa(g)
    elif estado == "leve":
        olhar_para_cima(g)

    contorno(g)

    if estado == "leve":
        for r, linha in enumerate(BORBOLETA):
            for c, letra in enumerate(linha):
                if letra != ".":
                    px(g, r, 22 + c, letra)
        pts(g, [(4, 20), (3, 19), (4, 17)], "z")  # rastro
    elif estado == "criativa":
        pts(g, [(2, 4), (3, 3), (3, 5), (4, 4)], "d")  # respingos de tinta
        pts(g, [(1, 27), (2, 26)], "y")
    elif estado == "pegando-fogo":
        for r, linha in enumerate(FOGO):
            for c, letra in enumerate(linha):
                if letra != ".":
                    px(g, 19 + r, c, letra); px(g, 19 + r, 31 - c, letra)
        pts(g, [(15, 2), (13, 29), (17, 1), (11, 3), (14, 28)], "o")
        pts(g, [(12, 1), (16, 30)], "d")
    elif estado == "feliz":
        for (r, c) in ((1, 3), (1, 5), (2, 2), (2, 3), (2, 4), (2, 5), (2, 6), (3, 3), (3, 4), (3, 5), (4, 4)):
            px(g, r, c, "q")
        for (r, c) in ((1, 26), (1, 28), (2, 25), (2, 26), (2, 27), (2, 28), (2, 29), (3, 26), (3, 27), (3, 28), (4, 27)):
            px(g, r, c, "q")
        pts(g, [(2, 3), (2, 26)], "W")
    elif estado == "dormindo":
        for (r, c) in ((1, 25), (1, 26), (1, 27), (1, 28), (2, 27), (3, 26), (4, 25), (4, 26), (4, 27), (4, 28)):
            px(g, r, c, "z")
        for (r, c) in ((0, 29), (0, 30), (0, 31), (1, 30), (2, 29), (2, 30), (2, 31)):
            px(g, r, c, "z")
    return g


def busto(g):
    return [linha[4:28] for linha in g[5:29]]


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
        png(renderiza(busto(sprite(pessoa, "neutro")), paleta), os.path.join(raiz, pessoa, "busto.png"))
    # ícones de estado soltos (chips do seletor e estados combinados): 16x16
    for e, linhas in ICONES_ESTADO.items():
        g = [[c for c in l] for l in linhas]
        png(renderiza(g, {}), os.path.join(raiz, "_simbolos", f"{e}.png"))
    print("ok")
