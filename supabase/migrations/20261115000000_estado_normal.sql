-- novo estado de trabalho: "normal", o dia sem nada de especial (usa o boneco neutro)
alter type estado_trabalho add value if not exists 'normal';
