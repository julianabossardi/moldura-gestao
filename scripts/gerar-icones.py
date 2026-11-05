#!/usr/bin/env python3
"""ícones 32 bits em public/icones/<nome>.png (16x16, um pixel de arte por pixel do arquivo). sem dependências.

na tela o css amplia em múltiplos inteiros (16, 32, 48), com image-rendering: pixelated.
"""
import os, sys, importlib.util

spec = importlib.util.spec_from_file_location("bon", os.path.join(os.path.dirname(__file__), "gerar-bonequinhos.py"))
bon = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bon)
bon.ESCALA = 1

N = 16


def vazio():
    return [["."] * N for _ in range(N)]


def de_texto(linhas):
    assert len(linhas) == N, f"{len(linhas)} linhas"
    for l in linhas:
        assert len(l) == N, f"linha com {len(l)}: {l!r}"
    return [list(l) for l in linhas]


def barra(g, r0, r1, c0, c1, letra, cantos=True):
    for r in range(r0, r1 + 1):
        for c in range(c0, c1 + 1):
            if cantos and r in (r0, r1) and c in (c0, c1) and r1 - r0 > 1 and c1 - c0 > 1:
                continue
            g[r][c] = letra


def circulo(g, cx, cy, r_ext, r_int, letra, cheio=None):
    for r in range(N):
        for c in range(N):
            d = ((c + 0.5 - cx) ** 2 + (r + 0.5 - cy) ** 2) ** 0.5
            if d <= r_int and cheio:
                g[r][c] = cheio
            if r_int < d <= r_ext:
                g[r][c] = letra


# ícones de uma tinta só (ganham versão -branco): k = tinta, h = brilho da tinta, s = sombra
def mais():
    # cruz de traço duplo com sombra vermelha de lado: o "+" da moldura em 32 bits
    g = vazio()
    for dr, dc, letra in ((1, 1, "d"), (0, 0, "k")):
        barra(g, 2 + dr, 12 + dr, 6 + dc, 8 + dc, letra, cantos=False)
        barra(g, 6 + dr, 8 + dr, 2 + dc, 12 + dc, letra, cantos=False)
    g[4][7] = "h"; g[7][4] = "h"
    return g


def microfone():
    return de_texto([
        "................",
        ".....kkkkkk.....",
        "....kkhkkkkk....",
        "....kkhkkkkk....",
        "....kkhkkkkk....",
        "....kkkkkkkk....",
        "....kkkkkkkk....",
        ".k..kkkkkkkk..k.",
        ".k...kkkkkk...k.",
        ".kk..........kk.",
        "..kkk......kkk..",
        "....kkkkkkkk....",
        ".......kk.......",
        ".......kk.......",
        "......kkkk......",
        "................",
    ])


def parar():
    g = vazio()
    barra(g, 3, 12, 3, 12, "k")
    for r in range(4, 11):
        g[r][4] = "h"
    return g


def check():
    return de_texto([
        "................",
        "................",
        "..............kk",
        ".............kkk",
        "............kkk.",
        "...........kkk..",
        "kk........kkk...",
        "kkk......kkk....",
        ".kkk....kkk.....",
        "..kkk..kkk......",
        "...kkkkkk.......",
        "....kkkk........",
        ".....kk.........",
        "................",
        "................",
        "................",
    ])


def menu():
    g = vazio()
    for r0 in (3, 7, 11):
        barra(g, r0, r0 + 1, 2, 13, "k", cantos=False)
        g[r0][2] = "."
        g[r0 + 1][13] = "."
    return g


def seta_dir():
    return de_texto([
        "................",
        "................",
        "....kkk.........",
        ".....kkk........",
        "......kkk.......",
        ".......kkk......",
        "........kkk.....",
        "........kkk.....",
        ".......kkk......",
        "......kkk.......",
        ".....kkk........",
        "....kkk.........",
        "................",
        "................",
        "................",
        "................",
    ])


MONO = {"mais": mais, "microfone": microfone, "parar": parar, "check": check, "menu": menu, "seta-dir": seta_dir}


# ícones coloridos: contorno k, vermelho d/e, laranja o, amarelo y/u, claro l
def foguinho():
    return de_texto([
        "................",
        ".......kk.......",
        "......kddk......",
        "......kdddk..kk.",
        ".....kdddddkkdk.",
        ".....kdddodddddk",
        "....kdddoooddddk",
        "....kddoooyoddk.",
        "...kddooyyyyoddk",
        "...kddoyyyyyoddk"[:16].ljust(16, "."),
        "...kddoyyyyyodk.",
        "....kddoyyyoddk.",
        "....kdddooodddk.",
        ".....kddddddddk.",
        "......kkddddkk..",
        "........kkkk....",
    ])


def estrela():
    return de_texto([
        "................",
        ".......kk.......",
        "......kyyk......",
        "......kwyk......",
        ".kkkkkkyyyykkkk.",
        ".kyyyyyyyyyyyyk.",
        "..kyyyyyyyyyyk..",
        "...kyyyyyyyyk...",
        "...kyyyyyyyyk...",
        "..kyyyykkyyyyk..",
        "..kyyk....kyyk..",
        ".kyyk......kyyk.",
        ".kkk........kkk.",
        "................",
        "................",
        "................",
    ])


def atrasada():
    g = vazio()
    circulo(g, 8, 8.5, 7, 5.2, "d", cheio="l")
    barra(g, 4, 8, 8, 8, "e", cantos=False)  # ponteiro grande
    barra(g, 8, 8, 8, 11, "e", cantos=False)  # ponteiro pequeno
    g[8][7] = "e"; g[9][8] = "e"
    for r, c in ((1, 7), (1, 8)):
        g[r][c] = "e"
    return g


def importante():
    return de_texto([
        "................",
        "..kkkkkkkkkkkk..",
        "..kkdddddddddk..",
        "..kkwddddddddk..",
        "..kkdddddddddk..",
        "..kkdddddddeek..",
        "..kkdddddddeek..",
        "..kkeeeeeeeeek..",
        "..kkkkkkkkkkkk..",
        "..kk............",
        "..kk............",
        "..kk............",
        "..kk............",
        "..kk............",
        ".kkkk...........",
        "................",
    ])


COLORIDOS = {"foguinho": foguinho, "estrela": estrela, "atrasada": atrasada, "importante": importante}
CORES = {"d": "#e32450", "e": "#a8142f", "o": "#ff8a1f", "y": "#ffd23f", "u": "#c9971c", "l": "#fde3e9", "w": "#ffffff"}

raiz = os.path.join(os.path.dirname(__file__), "..", "public", "icones")
for nome, desenho in COLORIDOS.items():
    grade = desenho()
    cores = {**CORES, "k": "#241920"}
    bon.png([[bon.rgba(cores[c]) if c != "." else (0, 0, 0, 0) for c in l] for l in grade], os.path.join(raiz, f"{nome}.png"))
for nome, desenho in MONO.items():
    for sufixo, tinta, brilho in (("", "#1a1a1f", "#6b6870"), ("-branco", "#ffffff", "#b9b6bd")):
        cores = {**CORES, "k": tinta, "h": brilho, "d": "#e32450"}
        grade = desenho()
        bon.png([[bon.rgba(cores[c]) if c != "." else (0, 0, 0, 0) for c in l] for l in grade], os.path.join(raiz, f"{nome}{sufixo}.png"))
print("ok")
