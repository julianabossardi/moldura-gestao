#!/usr/bin/env python3
"""ícones 8-bit em public/icones/<nome>.png (12x12, escala 3). sem dependências."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import importlib.util
spec = importlib.util.spec_from_file_location("bon", os.path.join(os.path.dirname(__file__), "gerar-bonequinhos.py"))
bon = importlib.util.module_from_spec(spec); spec.loader.exec_module(bon)

ICONES = {
    "foguinho": [
        "......d.....", ".....dd.....", ".....ddd..d.", "....ddodddd.", "...ddooodd..", "...dooyood..",
        "..ddooyyood.", "..dooyyyyod.", "..dooyyyyod.", "..ddooyyodd.", "...ddoooodd.", "....dddddd..",
    ],
    "microfone": [
        "....kkkk....", "...k....k...", "...k....k...", "...k....k...", "...k....k...", "...kk..kk...",
        ".k..kkkk..k.", ".k........k.", ".kk......kk.", "..kkkkkkkk..", ".....kk.....", "....kkkk....",
    ],
    "parar": [
        "............", "............", "..kkkkkkkk..", "..kkkkkkkk..", "..kkkkkkkk..", "..kkkkkkkk..",
        "..kkkkkkkk..", "..kkkkkkkk..", "..kkkkkkkk..", "..kkkkkkkk..", "............", "............",
    ],
    "check": [
        "............", "..........kk", ".........kk.", "........kk..", "k......kk...", "kk....kk....",
        ".kk..kk.....", "..kkkk......", "...kk.......", "............", "............", "............",
    ],
    "menu": [
        "............", "............", "..kkkkkkkk..", "..kkkkkkkk..", "............", "..kkkkkkkk..",
        "..kkkkkkkk..", "............", "..kkkkkkkk..", "..kkkkkkkk..", "............", "............",
    ],
    "seta-dir": [
        "............", "...kk.......", "....kk......", ".....kk.....", "......kk....", ".......kk...",
        ".......kk...", "......kk....", ".....kk.....", "....kk......", "...kk.......", "............",
    ],
    "estrela": [
        ".....yy.....", ".....yy.....", "....yyyy....", "yyyyyyyyyyyy", ".yyyyyyyyyy.", "..yyyyyyyy..",
        "...yyyyyy...", "...yyyyyy...", "..yyy..yyy..", "..yy....yy..", ".yy......yy.", "............",
    ],
    "atrasada": [
        "....dddd....", "..dd....dd..", ".d........d.", ".d...d....d.", "d....d.....d", "d....d.....d",
        "d....ddd...d", "d..........d", ".d........d.", ".d........d.", "..dd....dd..", "....dddd....",
    ],
    "mais": [
        "............", ".....kk.....", ".....kk.....", ".....kk.....", ".....kk.....", ".kkkkkkkkkk.",
        ".kkkkkkkkkk.", ".....kk.....", ".....kk.....", ".....kk.....", ".....kk.....", "............",
    ],
}
CORES = {"d": "#e32450", "o": "#ff8a1f", "y": "#ffd23f"}

raiz = os.path.join(os.path.dirname(__file__), "..", "public", "icones")
bon.ESCALA = 3
for nome, linhas_ in ICONES.items():
    for sufixo, tinta in (("", "#1a1a1f"), ("-branco", "#ffffff")):
        if nome in ("foguinho", "estrela", "atrasada") and sufixo:
            continue
        cores = {**CORES, "k": tinta}
        grade = [[bon.rgba(cores[c]) if c != "." else (0, 0, 0, 0) for c in l] for l in linhas_]
        bon.png(grade, os.path.join(raiz, f"{nome}{sufixo}.png"))
print("ok")
